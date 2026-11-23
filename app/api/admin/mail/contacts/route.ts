import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AdminContext {
  id: string;
  email: string;
}

// Helper to synchronize registered Supabase Auth users, phone numbers, and subscription tiers into mail_contacts
async function performContactsSync(supabase: SupabaseClient, admin: AdminContext) {
  const users: Array<{
    id: string;
    email?: string;
    phone?: string;
    created_at?: string;
    user_metadata?: Record<string, any>;
  }> = [];
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Auth sync error: ${error.message}`);
    const pageUsers = data?.users || [];
    users.push(...pageUsers);
    if (pageUsers.length < perPage) break;
  }
  if (users.length === 0) {
    return { totalEvaluated: 0, upsertedCount: 0 };
  }

  // 1. Fetch notification preferences for consent and suppression
  const { data: prefs, error: prefsError } = await supabase
    .from("notification_preferences")
    .select("email, marketing_announcements, unsubscribed_all");
  if (prefsError) throw new Error(`Preference sync error: ${prefsError.message}`);

  const { data: consentEvents, error: consentError } = await supabase
    .from("mail_consent_events")
    .select("email, action, created_at")
    .order("created_at", { ascending: false });
  if (consentError) throw new Error(`Consent evidence sync error: ${consentError.message}`);

  const consentMap = new Map<string, boolean>();
  (consentEvents || []).forEach((event) => {
    const key = String(event.email || "").toLowerCase();
    if (key && !consentMap.has(key)) consentMap.set(key, event.action === "opt_in");
  });

  const { data: existingContacts, error: existingError } = await supabase
    .from("mail_contacts")
    .select("email, is_suppressed, suppression_reason");
  if (existingError) throw new Error(`Existing contact lookup error: ${existingError.message}`);
  const existingMap = new Map((existingContacts || []).map((contact) => [
    String(contact.email).toLowerCase(),
    { isSuppressed: Boolean(contact.is_suppressed), reason: contact.suppression_reason || null },
  ]));

  const prefMap = new Map<string, { marketing: boolean; unsubscribed: boolean }>();
  (prefs || []).forEach((p) => {
    if (p.email) {
      prefMap.set(p.email.toLowerCase(), {
        marketing: p.marketing_announcements !== false && !p.unsubscribed_all,
        unsubscribed: !!p.unsubscribed_all,
      });
    }
  });

  // 2. Fetch active subscriptions
  const { data: subs } = await supabase
    .from("user_subscriptions")
    .select("user_id, status, plan:plan_id(slug, name)");

  const subMap = new Map<string, string>();
  (subs || []).forEach((s) => {
    if (s.user_id && (s.status === "active" || s.status === "trialing")) {
      const planSlug = (s.plan as { slug?: string })?.slug || "pro";
      subMap.set(s.user_id, planSlug);
    }
  });

  // 3. Map candidates
  const records = users
    .filter((u) => u.email && u.email.includes("@"))
    .map((u) => {
      const email = u.email!.toLowerCase();
      const pref = prefMap.get(email);
      const meta = u.user_metadata || {};

      const fullName =
        meta.full_name ||
        meta.name ||
        [meta.first_name, meta.last_name].filter(Boolean).join(" ") ||
        email.split("@")[0] ||
        "Learner";

      const firstName = meta.first_name || fullName.split(" ")[0] || "Learner";
      const lastName = meta.last_name || (fullName.split(" ").slice(1).join(" ") || null);

      // Extract phone number from auth user or metadata
      const rawPhone =
        u.phone ||
        meta.phone ||
        meta.phone_number ||
        meta.telephone ||
        meta.mobile ||
        meta.whatsapp ||
        null;

      const phone = rawPhone ? String(rawPhone).trim() : null;
      const tier = subMap.get(u.id) || "free";

      return {
        user_id: u.id,
        email,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone,
        marketing_consent: pref
          ? pref.marketing && !pref.unsubscribed
          : consentMap.get(email) === true,
        // Preference opt-outs do not globally suppress critical transactional mail.
        // Preserve only delivery/admin suppressions already recorded on the contact.
        is_suppressed: existingMap.get(email)?.isSuppressed || false,
        suppression_reason: existingMap.get(email)?.reason || null,
        subscription_tier: tier,
        created_at: u.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

  // 4. Batch upsert in chunks of 100
  let upsertedCount = 0;
  for (let i = 0; i < records.length; i += 100) {
    const chunk = records.slice(i, i + 100);
    const { error: upsertErr } = await supabase.from("mail_contacts").upsert(chunk, {
      onConflict: "email",
    });
    if (!upsertErr) {
      upsertedCount += chunk.length;
    }
  }

  // 5. Audit log
  try {
    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "contacts.sync",
      resource_type: "mail_contacts",
      details: { totalEvaluated: users.length, upsertedCount },
    });
  } catch {
    // Non-blocking audit log
  }

  return { totalEvaluated: users.length, upsertedCount };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.view", admin.role);
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json({ error: "Insufficient privileges" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const exportMode = searchParams.get("export");
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const filter = searchParams.get("filter") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get("limit") || "30", 10)));
    const offset = (page - 1) * limit;

    const supabase = getSupabaseServerClient();

    // Contact synchronisation is an explicit admin action, never a side effect of viewing this directory.

    // Compute directory summary counts in parallel
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 86400 * 1000).toISOString();

    const [totalRes, phoneRes, consentedRes, paidRes, newThisWeekRes] = await Promise.all([
      supabase.from("mail_contacts").select("id", { count: "exact", head: true }),
      supabase.from("mail_contacts").select("id", { count: "exact", head: true }).not("phone", "is", null).neq("phone", ""),
      supabase.from("mail_contacts").select("id", { count: "exact", head: true }).eq("marketing_consent", true).eq("is_suppressed", false),
      supabase.from("mail_contacts").select("id", { count: "exact", head: true }).neq("subscription_tier", "free"),
      supabase.from("mail_contacts").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    ]);

    const summary = {
      total: totalRes.count || 0,
      withPhone: phoneRes.count || 0,
      consented: consentedRes.count || 0,
      paid: paidRes.count || 0,
      newThisWeek: newThisWeekRes.count || 0,
    };

    // 3. Handle CSV Export
    if (exportMode === "csv") {
      let exportQuery = supabase.from("mail_contacts").select("*").order("created_at", { ascending: false });
      if (filter === "phone") {
        exportQuery = exportQuery.not("phone", "is", null).neq("phone", "");
      } else if (filter === "consented") {
        exportQuery = exportQuery.eq("marketing_consent", true).eq("is_suppressed", false);
      } else if (filter === "suppressed") {
        exportQuery = exportQuery.eq("is_suppressed", true);
      } else if (filter === "paid") {
        exportQuery = exportQuery.neq("subscription_tier", "free");
      }

      const { data: exportData } = await exportQuery.limit(5000);
      const rows = exportData || [];

      const escapeCsv = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
      const csvHeader = ["ID", "Full Name", "Email Address", "Phone Number", "Subscription Plan", "Marketing Consent", "Suppressed", "Joined Date"].join(",");
      const csvRows = rows.map((r) =>
        [
          escapeCsv(r.id),
          escapeCsv(r.full_name || ""),
          escapeCsv(r.email),
          escapeCsv(r.phone || ""),
          escapeCsv(r.subscription_tier || "free"),
          escapeCsv(r.marketing_consent ? "Yes" : "No"),
          escapeCsv(r.is_suppressed ? "Yes" : "No"),
          escapeCsv(r.created_at || ""),
        ].join(",")
      );

      const csvContent = [csvHeader, ...csvRows].join("\n");
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="brainlab-candidates-directory-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // 4. Filtered Query
    let query = supabase.from("mail_contacts").select("*", { count: "exact" });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (filter === "phone") {
      query = query.not("phone", "is", null).neq("phone", "");
    } else if (filter === "consented") {
      query = query.eq("marketing_consent", true).eq("is_suppressed", false);
    } else if (filter === "suppressed") {
      query = query.eq("is_suppressed", true);
    } else if (filter === "paid") {
      query = query.neq("subscription_tier", "free");
    } else if (filter === "new_7d") {
      query = query.gte("created_at", sevenDaysAgo);
    } else if (filter === "new_30d") {
      const thirtyDaysAgo = new Date(now - 30 * 86400 * 1000).toISOString();
      query = query.gte("created_at", thirtyDaysAgo);
    }

    const { data: contacts, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      contacts: contacts || [],
      summary,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load contacts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Sync contacts from auth.users and notification_preferences
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.contacts.manage", admin.role);
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    const result = await performContactsSync(supabase, admin);

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${result.upsertedCount} candidate accounts and phone numbers.`,
      syncedCount: result.upsertedCount,
      totalEvaluated: result.totalEvaluated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Update contact consent or suppression
export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.contacts.manage", admin.role);
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: "Contact ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.marketing_consent === "boolean") {
      updatePayload.marketing_consent = body.marketing_consent;
    }

    if (typeof body.is_suppressed === "boolean") {
      updatePayload.is_suppressed = body.is_suppressed;
      updatePayload.suppression_reason = body.is_suppressed
        ? body.suppression_reason || `Suppressed by administrator ${admin.email}`
        : null;
    }

    if (body.subscription_tier) {
      updatePayload.subscription_tier = body.subscription_tier;
    }

    if (body.phone !== undefined) {
      updatePayload.phone = body.phone ? String(body.phone).trim() : null;
    }

    if (body.full_name) {
      updatePayload.full_name = String(body.full_name).trim();
    }

    const { data: updated, error } = await supabase
      .from("mail_contacts")
      .update(updatePayload)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      await supabase.from("mail_audit_logs").insert({
        admin_id: admin.id,
        admin_name: admin.email,
        action: "contact.update",
        resource_type: "mail_contacts",
        resource_id: body.id,
        details: updatePayload,
      });
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json({ success: true, contact: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
