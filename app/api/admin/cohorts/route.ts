import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { resolveStudentEntitlements, FEATURE_KEYS } from "@/app/lib/centralEntitlementsResolver";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cohorts
 * Returns programmes, tiers, features, recent voucher summaries, and audit logs.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const adminRole = await resolveAdminRole(user.id, undefined, user.email);
    if (!adminRole) {
      return NextResponse.json({ error: "Administrator privileges required" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();

    const [progRes, tierRes, featRes, codeRes, auditRes] = await Promise.all([
      supabase
        .from("access_programmes")
        .select(`
          id, slug, name, description, tier_id, starts_at, ends_at, is_active, created_at,
          access_tiers(id, tier_key, name, rank)
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("access_tiers")
        .select("id, tier_key, name, description, rank, is_active")
        .order("rank", { ascending: true }),
      supabase
        .from("feature_catalog")
        .select("feature_key, name, description, feature_type, supported_levels, default_quota, quota_period, status")
        .order("feature_key", { ascending: true }),
      supabase
        .from("access_hashed_codes")
        .select(`
          id, code_prefix, validity_days, is_redeemed, redeemed_at, created_at, expires_at,
          access_tiers(name, tier_key),
          access_programmes(name, slug)
        `)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("access_audit_logs")
        .select("id, actor_id, action, target_type, target_id, details, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // Query active members count per programme
    const { data: memberCounts } = await supabase
      .from("programme_memberships")
      .select("programme_id")
      .eq("is_active", true)
      .is("suspended_at", null);

    const countMap: Record<string, number> = {};
    for (const m of memberCounts || []) {
      countMap[m.programme_id] = (countMap[m.programme_id] || 0) + 1;
    }

    const programmesWithCounts = (progRes.data || []).map((p: any) => ({
      ...p,
      member_count: countMap[p.id] || 0,
    }));

    return NextResponse.json({
      ok: true,
      programmes: programmesWithCounts,
      tiers: tierRes.data || [],
      features: featRes.data || [],
      codes: codeRes.data || [],
      auditLogs: auditRes.data || [],
    });
  } catch (err: any) {
    console.error("[api/admin/cohorts] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch cohort management data" }, { status: 500 });
  }
}

/**
 * POST /api/admin/cohorts
 * Dispatches administrative actions:
 * - create_programme
 * - add_member
 * - suspend_member
 * - unsuspend_member
 * - create_grant
 * - revoke_grant
 * - generate_code
 * - resolve_student
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const adminRole = await resolveAdminRole(user.id, undefined, user.email);
    if (!adminRole) {
      return NextResponse.json({ error: "Administrator privileges required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim();
    const supabase = getSupabaseServerClient();

    // 1. ACTION: RESOLVE STUDENT ENTITLEMENTS
    if (action === "resolve_student") {
      const emailOrId = String(body.query || "").trim();
      if (!emailOrId) {
        return NextResponse.json({ error: "Please provide a user ID or email address" }, { status: 400 });
      }

      let targetUserId = emailOrId;
      let targetEmail = emailOrId;

      if (emailOrId.includes("@")) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .ilike("email", emailOrId)
          .maybeSingle();

        if (!profile) {
          return NextResponse.json({ error: "No student account found with this email" }, { status: 404 });
        }
        targetUserId = profile.id;
        targetEmail = profile.email || emailOrId;
      }

      const resolved = await resolveStudentEntitlements(targetUserId);

      // Fetch active individual grants
      const { data: activeGrants } = await supabase
        .from("student_access_grants")
        .select("id, feature_key, feature_level, quota_allowance, expires_at, is_suspended, notes, granted_at")
        .eq("user_id", targetUserId)
        .is("revoked_at", null);

      // Fetch active programme memberships
      const { data: memberships } = await supabase
        .from("programme_memberships")
        .select(`
          id, programme_id, joined_at, expires_at, is_active, suspended_at,
          access_programmes(name, slug)
        `)
        .eq("user_id", targetUserId);

      return NextResponse.json({
        ok: true,
        user_id: targetUserId,
        email: targetEmail,
        resolved,
        grants: activeGrants || [],
        memberships: memberships || [],
      });
    }

    // 2. ACTION: CREATE PROGRAMME
    if (action === "create_programme") {
      const name = String(body.name || "").trim();
      const slug = String(body.slug || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      const description = String(body.description || "").trim();
      const tierId = body.tier_id ? String(body.tier_id).trim() : null;
      const startsAt = body.starts_at ? new Date(body.starts_at).toISOString() : new Date().toISOString();
      const endsAt = body.ends_at ? new Date(body.ends_at).toISOString() : null;

      if (!name || !slug) {
        return NextResponse.json({ error: "Programme name and slug are required" }, { status: 400 });
      }

      const { data: prog, error: progErr } = await supabase
        .from("access_programmes")
        .insert({
          name,
          slug,
          description,
          tier_id: tierId,
          starts_at: startsAt,
          ends_at: endsAt,
          is_active: true,
        })
        .select()
        .single();

      if (progErr) {
        return NextResponse.json({ error: progErr.message }, { status: 400 });
      }

      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        action: "programme_created",
        target_type: "access_programmes",
        target_id: prog.id,
        details: { name, slug, tier_id: tierId },
      });

      return NextResponse.json({ ok: true, programme: prog });
    }

    // 3. ACTION: ADD MEMBER TO PROGRAMME
    if (action === "add_member") {
      const programmeId = String(body.programme_id || "").trim();
      const studentId = String(body.user_id || "").trim();
      const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : null;

      if (!programmeId || !studentId) {
        return NextResponse.json({ error: "programme_id and user_id are required" }, { status: 400 });
      }

      const { data: membership, error: memErr } = await supabase
        .from("programme_memberships")
        .upsert(
          {
            programme_id: programmeId,
            user_id: studentId,
            expires_at: expiresAt,
            is_active: true,
            suspended_at: null,
          },
          { onConflict: "programme_id,user_id" }
        )
        .select()
        .single();

      if (memErr) {
        return NextResponse.json({ error: memErr.message }, { status: 400 });
      }

      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        action: "programme_member_added",
        target_type: "programme_memberships",
        target_id: membership.id,
        details: { programme_id: programmeId, student_id: studentId, expires_at: expiresAt },
      });

      return NextResponse.json({ ok: true, membership });
    }

    // 4. ACTION: SUSPEND OR UNSUSPEND MEMBER
    if (action === "toggle_member_suspension") {
      const membershipId = String(body.membership_id || "").trim();
      const suspend = Boolean(body.suspend);

      if (!membershipId) {
        return NextResponse.json({ error: "membership_id is required" }, { status: 400 });
      }

      const { data: updated, error: updErr } = await supabase
        .from("programme_memberships")
        .update({
          suspended_at: suspend ? new Date().toISOString() : null,
        })
        .eq("id", membershipId)
        .select()
        .single();

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 400 });
      }

      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        action: suspend ? "programme_member_suspended" : "programme_member_unsuspended",
        target_type: "programme_memberships",
        target_id: membershipId,
        details: { suspended: suspend },
      });

      return NextResponse.json({ ok: true, membership: updated });
    }

    // 5. ACTION: CREATE INDIVIDUAL STUDENT GRANT
    if (action === "create_grant") {
      const studentId = String(body.user_id || "").trim();
      const featureKey = String(body.feature_key || "").trim();
      const featureLevel = body.feature_level ? String(body.feature_level).trim() : null;
      const quotaAllowance = body.quota_allowance ? Number(body.quota_allowance) : null;
      const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : null;
      const notes = body.notes ? String(body.notes).trim() : null;

      if (!studentId || !featureKey) {
        return NextResponse.json({ error: "user_id and feature_key are required" }, { status: 400 });
      }

      const { data: grant, error: grantErr } = await supabase
        .from("student_access_grants")
        .insert({
          user_id: studentId,
          feature_key: featureKey,
          feature_level: featureLevel,
          quota_allowance: quotaAllowance,
          expires_at: expiresAt,
          notes,
          granted_by: user.id,
          is_enabled: true,
        })
        .select()
        .single();

      if (grantErr) {
        return NextResponse.json({ error: grantErr.message }, { status: 400 });
      }

      // Record in history & audit logs
      await Promise.all([
        supabase.from("access_grant_history").insert({
          grant_id: grant.id,
          user_id: studentId,
          action: "granted",
          performed_by: user.id,
          reason: notes,
          details: { feature_key: featureKey, feature_level: featureLevel, quota_allowance: quotaAllowance },
        }),
        supabase.from("access_audit_logs").insert({
          actor_id: user.id,
          action: "student_grant_created",
          target_type: "student_access_grants",
          target_id: grant.id,
          details: { student_id: studentId, feature_key: featureKey, quota: quotaAllowance },
        }),
      ]);

      return NextResponse.json({ ok: true, grant });
    }

    // 6. ACTION: REVOKE INDIVIDUAL GRANT
    if (action === "revoke_grant") {
      const grantId = String(body.grant_id || "").trim();
      const reason = body.reason ? String(body.reason).trim() : "Administrative revocation";

      if (!grantId) {
        return NextResponse.json({ error: "grant_id is required" }, { status: 400 });
      }

      const { data: revoked, error: revErr } = await supabase
        .from("student_access_grants")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq("id", grantId)
        .select()
        .single();

      if (revErr) {
        return NextResponse.json({ error: revErr.message }, { status: 400 });
      }

      await Promise.all([
        supabase.from("access_grant_history").insert({
          grant_id: grantId,
          user_id: revoked.user_id,
          action: "revoked",
          performed_by: user.id,
          reason,
          details: { revoked_at: revoked.revoked_at },
        }),
        supabase.from("access_audit_logs").insert({
          actor_id: user.id,
          action: "student_grant_revoked",
          target_type: "student_access_grants",
          target_id: grantId,
          details: { student_id: revoked.user_id, reason },
        }),
      ]);

      return NextResponse.json({ ok: true, grant: revoked });
    }

    // 7. ACTION: GENERATE HASHED ACCESS CODE (Shown Once Only)
    if (action === "generate_code") {
      const tierId = body.tier_id ? String(body.tier_id).trim() : null;
      const programmeId = body.programme_id ? String(body.programme_id).trim() : null;
      const validityDays = Math.max(1, Math.min(365, Number(body.validity_days) || 30));
      const prefixTag = String(body.prefix_tag || "BLT").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

      // Cryptographic secure random bytes for code
      const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
      const plainCode = `${prefixTag}-${randomHex.slice(0, 4)}-${randomHex.slice(4)}`;
      const codeHash = crypto.createHash("sha256").update(plainCode).digest("hex");
      const codePrefix = `${prefixTag}-***-${randomHex.slice(4)}`;

      const { data: codeRow, error: codeErr } = await supabase
        .from("access_hashed_codes")
        .insert({
          code_hash: codeHash,
          code_prefix: codePrefix,
          grants_tier_id: tierId,
          grants_programme_id: programmeId,
          validity_days: validityDays,
          created_by: user.id,
        })
        .select()
        .single();

      if (codeErr) {
        return NextResponse.json({ error: codeErr.message }, { status: 400 });
      }

      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        action: "access_code_generated",
        target_type: "access_hashed_codes",
        target_id: codeRow.id,
        details: { code_prefix: codePrefix, tier_id: tierId, validity_days: validityDays },
      });

      // Return plaintext code ONCE only
      return NextResponse.json({
        ok: true,
        code: plainCode,
        prefix: codePrefix,
        validity_days: validityDays,
        message: "Access voucher generated. Please copy and record it now; it cannot be retrieved again.",
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("[api/admin/cohorts] POST error:", err);
    return NextResponse.json({ error: "Failed to process administrative operation" }, { status: 500 });
  }
}
