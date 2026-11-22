import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.view");
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json({ error: "Insufficient privileges" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const filter = searchParams.get("filter") || "all"; // 'all', 'consented', 'suppressed', 'paid'
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "30", 10)));
    const offset = (page - 1) * limit;

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from("mail_contacts")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    if (filter === "consented") {
      query = query.eq("marketing_consent", true).eq("is_suppressed", false);
    } else if (filter === "suppressed") {
      query = query.eq("is_suppressed", true);
    } else if (filter === "paid") {
      query = query.neq("subscription_tier", "free");
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
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.contacts.manage");
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch users from Supabase Auth admin API (up to 1000 per sync batch)
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authErr) {
      return NextResponse.json({ error: `Auth sync error: ${authErr.message}` }, { status: 500 });
    }

    const users = authData?.users || [];
    if (users.length === 0) {
      return NextResponse.json({ success: true, message: "No registered users to sync", syncedCount: 0 });
    }

    // 2. Fetch existing notification preferences for marketing consent
    const userEmails = users.map((u) => u.email?.toLowerCase()).filter(Boolean) as string[];
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email, marketing_announcements, unsubscribed_all");

    const prefMap = new Map<string, { marketing: boolean; unsubscribed: boolean }>();
    (prefs || []).forEach((p) => {
      prefMap.set(p.email.toLowerCase(), {
        marketing: p.marketing_announcements !== false && !p.unsubscribed_all,
        unsubscribed: !!p.unsubscribed_all,
      });
    });

    // 3. Fetch user subscriptions if any
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

    // 4. Upsert into mail_contacts
    let upsertedCount = 0;
    const records = users
      .filter((u) => u.email && u.email.includes("@"))
      .map((u) => {
        const email = u.email!.toLowerCase();
        const pref = prefMap.get(email);
        const fullName =
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          [u.user_metadata?.first_name, u.user_metadata?.last_name].filter(Boolean).join(" ") ||
          email.split("@")[0];
        const firstName = u.user_metadata?.first_name || fullName.split(" ")[0] || "Learner";
        const tier = subMap.get(u.id) || "free";

        return {
          user_id: u.id,
          email,
          first_name: firstName,
          full_name: fullName,
          phone: u.phone || u.user_metadata?.phone || null,
          marketing_consent: pref ? pref.marketing : true,
          is_suppressed: pref ? pref.unsubscribed : false,
          suppression_reason: pref?.unsubscribed ? "User opted out of all notifications" : null,
          subscription_tier: tier,
          updated_at: new Date().toISOString(),
        };
      });

    // Batch upsert in chunks of 100
    for (let i = 0; i < records.length; i += 100) {
      const chunk = records.slice(i, i + 100);
      const { error: upsertErr } = await supabase.from("mail_contacts").upsert(chunk, {
        onConflict: "email",
      });
      if (!upsertErr) {
        upsertedCount += chunk.length;
      }
    }

    // Log to mail_audit_logs
    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "contacts.sync",
      resource_type: "mail_contacts",
      details: { totalEvaluated: users.length, upsertedCount },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${upsertedCount} contact records from registered accounts.`,
      syncedCount: upsertedCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Update contact consent or suppression
export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.contacts.manage");
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

    const { data: updated, error } = await supabase
      .from("mail_contacts")
      .update(updatePayload)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "contact.update",
      resource_type: "mail_contacts",
      resource_id: body.id,
      details: updatePayload,
    });

    return NextResponse.json({ success: true, contact: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
