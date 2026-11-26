import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/access
 * Consolidated operator endpoint for the 10 Access & Cohort Management Centre views.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const adminRole = await resolveAdminRole(user.id, undefined, user.email || undefined);
    if (!adminRole) {
      return NextResponse.json({ ok: false, error: "Administrator privileges required" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const tab = url.searchParams.get("tab") || "overview";
    const query = url.searchParams.get("query")?.trim() || "";

    // 1. OVERVIEW TAB: System Health & Metric Aggregates
    if (tab === "overview") {
      const [tiersRes, progsRes, grantsRes, codesRes, countersRes] = await Promise.all([
        supabase.from("access_tiers").select("id, tier_key, name, tier_priority, is_active").order("tier_priority", { ascending: false }),
        supabase.from("access_programmes").select("id, programme_key, name, is_active", { count: "exact" }),
        supabase.from("student_access_grants").select("id, status, target_tier_id, access_tiers(tier_key)").eq("status", "active"),
        supabase.from("access_codes").select("id, code_purpose, status, uses_allowed, uses_consumed"),
        supabase.from("access_usage_counters").select("usage_amount, quota_period").eq("quota_period", "monthly"),
      ]);

      const tiers = tiersRes.data || [];
      const tierCounts: Record<string, number> = {};
      tiers.forEach((t) => { tierCounts[t.tier_key] = 0; });

      (grantsRes.data || []).forEach((g: any) => {
        const key = g.access_tiers?.tier_key;
        if (key && tierCounts[key] !== undefined) {
          tierCounts[key] += 1;
        }
      });

      const totalVouchers = (codesRes.data || []).length;
      const activeVouchers = (codesRes.data || []).filter((c) => c.status === "active").length;
      const consumedVouchers = (codesRes.data || []).filter((c) => c.status === "exhausted" || c.uses_consumed >= c.uses_allowed).length;

      const totalMonthlyUsage = (countersRes.data || []).reduce((acc, curr) => acc + (curr.usage_amount || 0), 0);

      return NextResponse.json({
        ok: true,
        metrics: {
          totalProgrammes: progsRes.count || 0,
          totalGrants: (grantsRes.data || []).length,
          totalVouchers,
          activeVouchers,
          consumedVouchers,
          totalMonthlyUsage,
          tierCounts,
        },
        tiers,
      });
    }

    // 2. TIERS TAB
    if (tab === "tiers") {
      const [tiersRes, featuresRes] = await Promise.all([
        supabase.from("access_tiers").select("*, access_tier_features(*, feature_catalog(*))").order("tier_priority", { ascending: false }),
        supabase.from("feature_catalog").select("*").eq("is_active", true).order("feature_group"),
      ]);

      return NextResponse.json({
        ok: true,
        tiers: tiersRes.data || [],
        availableFeatures: featuresRes.data || [],
      });
    }

    // 3. PROGRAMMES & COHORTS TAB
    if (tab === "programmes") {
      const { data: programmes, error } = await supabase
        .from("access_programmes")
        .select(`
          id, programme_key, name, description, associated_tier_id, is_active, created_at,
          access_tiers(id, tier_key, name, tier_priority),
          programme_memberships(count)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        programmes: programmes || [],
      });
    }

    // 4. STUDENTS & GRANTS TAB (Search & Authoritative Resolution)
    if (tab === "students") {
      let studentsList: any[] = [];
      if (query.length >= 2) {
        // Query users by email or metadata from profiles / auth
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name, phone, role, created_at")
          .or(`email.ilike.%${query}%,full_name.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(20);

        if (profiles && profiles.length > 0) {
          // Resolve authoritative entitlements for each candidate
          studentsList = await Promise.all(
            profiles.map(async (p) => {
              const { data: resolved } = await supabase.rpc("resolve_student_entitlements_internal", {
                p_user_id: p.id,
              });
              return {
                ...p,
                entitlements: resolved || null,
              };
            })
          );
        }
      }

      const { data: recentGrants } = await supabase
        .from("student_access_grants")
        .select("*, access_tiers(name, tier_key), feature_catalog(display_name)")
        .order("created_at", { ascending: false })
        .limit(30);

      return NextResponse.json({
        ok: true,
        students: studentsList,
        recentGrants: recentGrants || [],
      });
    }

    // 5. FEATURE CATALOGUE TAB
    if (tab === "features") {
      const { data: features } = await supabase
        .from("feature_catalog")
        .select("*")
        .order("feature_group", { ascending: true });

      return NextResponse.json({
        ok: true,
        features: features || [],
      });
    }

    // 6. VOUCHER CODES TAB
    if (tab === "codes") {
      const { data: codes } = await supabase
        .from("access_codes")
        .select("*, access_tiers(name, tier_key), feature_catalog(display_name)")
        .order("created_at", { ascending: false })
        .limit(100);

      const { data: tiers } = await supabase
        .from("access_tiers")
        .select("id, tier_key, name")
        .eq("is_active", true);

      return NextResponse.json({
        ok: true,
        codes: codes || [],
        availableTiers: tiers || [],
      });
    }

    // 7. DURATION RULES TAB
    if (tab === "durations") {
      const presets = [
        { key: "7_days", label: "7 Days (Trial / Crash Revision)", days: 7, isDefault: false },
        { key: "30_days", label: "30 Days (1-Month Standard)", days: 30, isDefault: true },
        { key: "90_days", label: "90 Days (Quarterly Term / Intensive)", days: 90, isDefault: false },
        { key: "180_days", label: "180 Days (Semester / Half-Year)", days: 180, isDefault: false },
        { key: "365_days", label: "365 Days (Full Academic Session)", days: 365, isDefault: false },
        { key: "indefinite", label: "Indefinite / Permanent (Scholarship / Admin)", days: null, isDefault: false },
      ];

      return NextResponse.json({ ok: true, presets });
    }

    // 8. COMMERCIAL SETTINGS TAB
    if (tab === "commercial") {
      const { data: plans } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("display_order", { ascending: true });

      return NextResponse.json({
        ok: true,
        plans: plans || [],
      });
    }

    // 9. MIGRATION CENTRE TAB
    if (tab === "migration") {
      const [legacySubsRes, legacyEntsRes, newGrantsRes] = await Promise.all([
        supabase.from("user_subscriptions").select("id, user_id, plan_id, status, current_period_end").limit(100),
        supabase.from("learning_entitlements").select("id, user_id, membership_type, status, expires_at").limit(100),
        supabase.from("student_access_grants").select("id", { count: "exact" }),
      ]);

      const legacySubs = legacySubsRes.data || [];
      const legacyEnts = legacyEntsRes.data || [];

      const activeLegacySubs = legacySubs.filter((s) => s.status === "active");
      const activeLegacyEnts = legacyEnts.filter((e) => e.status === "active");

      return NextResponse.json({
        ok: true,
        summary: {
          totalLegacySubscriptions: legacySubs.length,
          activeLegacySubscriptions: activeLegacySubs.length,
          totalLegacyEntitlements: legacyEnts.length,
          activeLegacyEntitlements: activeLegacyEnts.length,
          currentUnifiedGrants: newGrantsRes.count || 0,
        },
        sampleLegacyRows: activeLegacySubs.slice(0, 10),
      });
    }

    // 10. IMMUTABLE AUDIT LOG TAB
    if (tab === "audit") {
      const { data: logs, error } = await supabase
        .from("access_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        logs: logs || [],
      });
    }

    return NextResponse.json({ ok: false, error: `Unrecognized tab '${tab}'` }, { status: 400 });
  } catch (err: any) {
    console.error("[api/admin/access:GET] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to retrieve access console data." }, { status: 500 });
  }
}

/**
 * POST /api/admin/access
 * Handles authoritative administrative actions:
 * - assign_grant
 * - revoke_grant
 * - create_programme
 * - enroll_student
 * - generate_codes
 * - revoke_code
 * - update_tier_priority
 * - execute_migration_dry_run
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const adminRole = await resolveAdminRole(user.id, undefined, user.email || undefined);
    if (!adminRole) {
      return NextResponse.json({ ok: false, error: "Administrator privileges required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim();
    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    // ------------------------------------------------------------------------
    // ACTION 1: ASSIGN ACCESS GRANT (UPGRADE TIER OR GRANT FEATURE)
    // ------------------------------------------------------------------------
    if (action === "assign_grant") {
      const { studentId, targetTierId, targetFeatureKey, featureLevel, quotaAmount, durationDays, reason } = body;
      if (!studentId) {
        return NextResponse.json({ ok: false, error: "Student ID is required." }, { status: 400 });
      }
      if (!targetTierId && !targetFeatureKey) {
        return NextResponse.json({ ok: false, error: "Either targetTierId or targetFeatureKey must be provided." }, { status: 400 });
      }

      let expiresAt: string | null = null;
      if (durationDays && Number.isFinite(Number(durationDays)) && Number(durationDays) > 0) {
        expiresAt = new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000).toISOString();
      }

      const grantPayload = {
        student_id: studentId,
        target_tier_id: targetTierId || null,
        target_feature_key: targetFeatureKey || null,
        feature_level: featureLevel || null,
        quota_amount: quotaAmount ? Number(quotaAmount) : null,
        quota_period: quotaAmount ? "monthly" : null,
        grant_source: "admin_manual",
        status: "active",
        starts_at: nowIso,
        expires_at: expiresAt,
        reason: reason || "Manual Administrator Grant",
        created_by: user.id,
      };

      const { data: newGrant, error: grantErr } = await supabase
        .from("student_access_grants")
        .insert(grantPayload)
        .select()
        .single();

      if (grantErr) {
        return NextResponse.json({ ok: false, error: grantErr.message }, { status: 400 });
      }

      // Append audit log
      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        target_student_id: studentId,
        action: "assigned_access_grant",
        entity_type: "student_access_grants",
        entity_id: newGrant.id,
        new_state: newGrant,
        reason: reason || "Administrator 1-Click Access Grant",
      });

      return NextResponse.json({
        ok: true,
        message: "Access grant successfully assigned.",
        grant: newGrant,
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 2: REVOKE ACCESS GRANT
    // ------------------------------------------------------------------------
    if (action === "revoke_grant") {
      const { grantId, revocationReason } = body;
      if (!grantId) {
        return NextResponse.json({ ok: false, error: "Grant ID is required." }, { status: 400 });
      }

      const { data: existingGrant } = await supabase
        .from("student_access_grants")
        .select("*")
        .eq("id", grantId)
        .single();

      if (!existingGrant) {
        return NextResponse.json({ ok: false, error: "Access grant not found." }, { status: 404 });
      }

      const { error: revokeErr } = await supabase
        .from("student_access_grants")
        .update({
          status: "revoked",
          revoked_at: nowIso,
          revoked_by: user.id,
          revoked_reason: revocationReason || "Administrative Revocation",
        })
        .eq("id", grantId);

      if (revokeErr) {
        return NextResponse.json({ ok: false, error: revokeErr.message }, { status: 400 });
      }

      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        target_student_id: existingGrant.student_id,
        action: "revoked_access_grant",
        entity_type: "student_access_grants",
        entity_id: grantId,
        previous_state: existingGrant,
        new_state: { status: "revoked", revoked_at: nowIso },
        reason: revocationReason || "Administrative Revocation",
      });

      return NextResponse.json({ ok: true, message: "Access grant successfully revoked." });
    }

    // ------------------------------------------------------------------------
    // ACTION 3: CREATE PROGRAMME / COHORT
    // ------------------------------------------------------------------------
    if (action === "create_programme") {
      const { programmeKey, name, description, associatedTierId } = body;
      if (!programmeKey || !name) {
        return NextResponse.json({ ok: false, error: "Programme key and name are required." }, { status: 400 });
      }

      const { data: newProg, error: progErr } = await supabase
        .from("access_programmes")
        .insert({
          programme_key: String(programmeKey).trim().toLowerCase(),
          name: String(name).trim(),
          description: String(description || "").trim(),
          associated_tier_id: associatedTierId || null,
          is_active: true,
        })
        .select()
        .single();

      if (progErr) {
        return NextResponse.json({ ok: false, error: progErr.message }, { status: 400 });
      }

      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        action: "created_access_programme",
        entity_type: "access_programmes",
        entity_id: newProg.id,
        new_state: newProg,
        reason: `Created cohort programme: ${name}`,
      });

      return NextResponse.json({ ok: true, programme: newProg });
    }

    // ------------------------------------------------------------------------
    // ACTION 4: ENROLL STUDENT IN PROGRAMME
    // ------------------------------------------------------------------------
    if (action === "enroll_student") {
      const { studentId, programmeId, durationDays, sourceRef } = body;
      if (!studentId || !programmeId) {
        return NextResponse.json({ ok: false, error: "Student ID and Programme ID are required." }, { status: 400 });
      }

      let expiresAt: string | null = null;
      if (durationDays && Number(durationDays) > 0) {
        expiresAt = new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000).toISOString();
      }

      const { data: membership, error: memErr } = await supabase
        .from("programme_memberships")
        .insert({
          student_id: studentId,
          programme_id: programmeId,
          membership_status: "active",
          starts_at: nowIso,
          expires_at: expiresAt,
          source_ref: sourceRef || "Admin Enrollment",
          assigned_by: user.id,
        })
        .select()
        .single();

      if (memErr) {
        return NextResponse.json({ ok: false, error: memErr.message }, { status: 400 });
      }

      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        target_student_id: studentId,
        action: "enrolled_programme_membership",
        entity_type: "programme_memberships",
        entity_id: membership.id,
        new_state: membership,
        reason: `Enrolled student into programme ${programmeId}`,
      });

      return NextResponse.json({ ok: true, membership });
    }

    // ------------------------------------------------------------------------
    // ACTION 5: BATCH VOUCHER CODE GENERATION (HASHED ON-THE-FLY)
    // ------------------------------------------------------------------------
    if (action === "generate_codes") {
      const { count = 1, codePurpose, targetTierId, targetFeatureKey, mockCredits = 1, validityDays = 30, prefix = "BLT" } = body;
      const numCount = Math.min(100, Math.max(1, Number(count) || 1));

      if (!["single_mock_pass", "bundle_mock_pass", "subscription_grant", "feature_grant"].includes(codePurpose)) {
        return NextResponse.json({ ok: false, error: "Invalid code purpose." }, { status: 400 });
      }

      const plainCodes: string[] = [];
      const codeRows: any[] = [];

      for (let i = 0; i < numCount; i++) {
        const randomEntropy = crypto.randomBytes(4).toString("hex").toUpperCase();
        const plain = `${prefix}-${randomEntropy.slice(0, 4)}-${randomEntropy.slice(4, 8)}`;
        plainCodes.push(plain);

        // Compute SHA-256 hash
        const codeHash = crypto.createHash("sha256").update(plain).digest("hex");
        const codeDisplay = `${prefix}-${plain.slice(-4)}`;

        codeRows.push({
          code_hash: codeHash,
          code_display: codeDisplay,
          code_purpose: codePurpose,
          target_tier_id: codePurpose === "subscription_grant" ? targetTierId : null,
          target_feature_key: codePurpose === "feature_grant" ? targetFeatureKey : null,
          mock_credits: codePurpose.includes("mock_pass") ? Number(mockCredits) : 0,
          uses_allowed: 1,
          uses_consumed: 0,
          status: "active",
          validity_days: Math.max(1, Number(validityDays) || 30),
          created_by: user.id,
        });
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("access_codes")
        .insert(codeRows)
        .select("id, code_display, code_purpose, validity_days, status, created_at");

      if (insertErr) {
        return NextResponse.json({ ok: false, error: insertErr.message }, { status: 400 });
      }

      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        action: "generated_voucher_batch",
        entity_type: "access_codes",
        entity_id: `${numCount} vouchers`,
        new_state: { count: numCount, purpose: codePurpose },
        reason: `Generated ${numCount} ${codePurpose} vouchers with prefix ${prefix}`,
      });

      // Return plaintext codes ONCE for immediate download/printing
      return NextResponse.json({
        ok: true,
        count: numCount,
        plaintextCodes: plainCodes,
        insertedSummaries: inserted,
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 6: DEACTIVATE / REVOKE VOUCHER CODE
    // ------------------------------------------------------------------------
    if (action === "revoke_code") {
      const { codeId, reason } = body;
      if (!codeId) {
        return NextResponse.json({ ok: false, error: "Code ID is required." }, { status: 400 });
      }

      const { error: revokeErr } = await supabase
        .from("access_codes")
        .update({ status: "revoked", updated_at: nowIso })
        .eq("id", codeId);

      if (revokeErr) {
        return NextResponse.json({ ok: false, error: revokeErr.message }, { status: 400 });
      }

      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        action: "revoked_voucher_code",
        entity_type: "access_codes",
        entity_id: codeId,
        reason: reason || "Administrative voucher deactivation",
      });

      return NextResponse.json({ ok: true, message: "Voucher code successfully revoked." });
    }

    // ------------------------------------------------------------------------
    // ACTION 7: UPDATE TIER PRIORITY
    // ------------------------------------------------------------------------
    if (action === "update_tier_priority") {
      const { tierId, priority, isActive, isRetired } = body;
      if (!tierId) {
        return NextResponse.json({ ok: false, error: "Tier ID is required." }, { status: 400 });
      }

      const updates: Record<string, any> = { updated_at: nowIso };
      if (priority !== undefined) updates.tier_priority = Number(priority);
      if (isActive !== undefined) updates.is_active = Boolean(isActive);
      if (isRetired !== undefined) updates.is_retired = Boolean(isRetired);

      const { data: updatedTier, error: tierErr } = await supabase
        .from("access_tiers")
        .update(updates)
        .eq("id", tierId)
        .select()
        .single();

      if (tierErr) {
        return NextResponse.json({ ok: false, error: tierErr.message }, { status: 400 });
      }

      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        action: "updated_tier_configuration",
        entity_type: "access_tiers",
        entity_id: tierId,
        new_state: updatedTier,
        reason: `Updated tier ${updatedTier.name} configuration`,
      });

      return NextResponse.json({ ok: true, tier: updatedTier });
    }

    // ------------------------------------------------------------------------
    // ACTION 8: DRY-RUN MIGRATION EVALUATION
    // ------------------------------------------------------------------------
    if (action === "execute_migration_dry_run") {
      const [subsRes, tiersRes] = await Promise.all([
        supabase.from("user_subscriptions").select("id, user_id, plan_id, status, current_period_end").eq("status", "active"),
        supabase.from("access_tiers").select("id, tier_key"),
      ]);

      const subs = subsRes.data || [];
      const tiers = tiersRes.data || [];
      const tierMap: Record<string, string> = {};
      tiers.forEach((t) => { tierMap[t.tier_key.toLowerCase()] = t.id; });

      let eligible = 0;
      let unmapped = 0;
      const sampleTransformations: any[] = [];

      subs.forEach((s) => {
        const targetTierId = tierMap[(s.plan_id || "").toLowerCase()];
        if (targetTierId) {
          eligible += 1;
          if (sampleTransformations.length < 5) {
            sampleTransformations.push({
              originalSubscriptionId: s.id,
              userId: s.user_id,
              legacyPlan: s.plan_id,
              targetTierId,
              expiresAt: s.current_period_end,
            });
          }
        } else {
          unmapped += 1;
        }
      });

      return NextResponse.json({
        ok: true,
        dryRun: {
          totalActiveFound: subs.length,
          eligibleForMigration: eligible,
          unmappedTiers: unmapped,
          sampleTransformations,
        },
      });
    }

    return NextResponse.json({ ok: false, error: `Unrecognized action '${action}'` }, { status: 400 });
  } catch (err: any) {
    console.error("[api/admin/access:POST] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to execute administrative action." }, { status: 500 });
  }
}
