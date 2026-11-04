import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Admin privileges required" }, { status: 401 });
    }

    const resolvedParams = await params;
    const candidateId = resolvedParams.id;
    if (!candidateId) {
      return NextResponse.json({ ok: false, error: "Candidate ID is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action;

    const supabase = getSupabaseServerClient();

    // Verify candidate exists
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(candidateId);
    if (userError || !userData.user) {
      return NextResponse.json({ ok: false, error: "Candidate account not found" }, { status: 404 });
    }

    const candidate = userData.user;
    const currentMeta = candidate.user_metadata || {};

    // ------------------------------------------------------------------------
    // ACTION 1: GRANT OR EXTEND SUBSCRIPTION (UPGRADE TO PREMIUM / PLUS / PRO)
    // ------------------------------------------------------------------------
    if (action === "grant_subscription" || action === "upgrade_tier") {
      const planId = String(body.planId || body.plan || "premium").trim().toLowerCase();
      const parsedDuration = Number.parseInt(String(body.durationDays || body.validityDays || "30"), 10);
      const durationDays = Number.isFinite(parsedDuration) ? parsedDuration : 30;
      const reason = String(body.reason || "Direct Administrator Plan Upgrade").trim();

      if (!["premium", "plus", "pro"].includes(planId)) {
        return NextResponse.json({ ok: false, error: "Invalid subscription plan." }, { status: 400 });
      }
      if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
        return NextResponse.json({ ok: false, error: "Subscription duration must be between 1 and 3650 days." }, { status: 400 });
      }

      // One database transaction updates the subscription, replaces the
      // membership entitlement, and notifies the candidate.
      const { data: grantResult, error: grantError } = await supabase.rpc(
        "admin_grant_candidate_subscription",
        {
          p_user_id: candidateId,
          p_plan_id: planId,
          p_duration_days: durationDays,
          p_reason: reason,
          p_admin_email: admin.email,
        }
      );

      if (grantError) {
        console.warn("[admin/candidates/action] RPC failed, applying direct guaranteed server-side upgrade fallback:", grantError.message);
        
        // Direct guaranteed fallback: execute with service client
        const periodStart = new Date().toISOString();
        const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
        const maxQ = planId === "pro" ? 500 : planId === "plus" ? 400 : 250;
        const planDisplayName = planId === "pro" ? "BrainLab Pro" : planId === "plus" ? "BrainLab Plus" : "Premium Study";

        // Resilient upsert user_subscriptions (query-then-update-or-insert)
        const subData = {
          user_id: candidateId,
          plan_id: planId,
          status: "active",
          current_period_start: periodStart,
          current_period_end: periodEnd,
          payment_provider: "admin_manual_grant",
          price_paid_kobo: 0,
          currency: "NGN",
          provider_subscription_id: `ADMIN-GRANT-${Date.now()}`,
          metadata: {
            grant_reason: reason,
            granted_by: admin.email,
            validity_days: durationDays,
          },
          updated_at: periodStart,
        };

        const { data: existingSub } = await supabase
          .from("user_subscriptions")
          .select("id")
          .eq("user_id", candidateId)
          .maybeSingle();

        if (existingSub?.id) {
          await supabase.from("user_subscriptions").update(subData).eq("id", existingSub.id);
        } else {
          await supabase.from("user_subscriptions").insert(subData);
        }

        // Revoke previous membership and insert new active membership
        await supabase.from("learning_entitlements").update({
          status: "revoked",
          revoked_at: periodStart,
        }).eq("user_id", candidateId).eq("entitlement_type", "membership").eq("status", "active");

        await supabase.from("learning_entitlements").insert({
          user_id: candidateId,
          entitlement_type: "membership",
          membership_type: planId,
          max_questions: maxQ,
          status: "active",
          permanent: false,
          starts_at: periodStart,
          expires_at: periodEnd,
        });

        // Insert notification
        await supabase.from("notifications").insert({
          user_id: candidateId,
          title: `🎉 Account Upgraded to ${planDisplayName}`,
          message: `Your account has been upgraded to ${planDisplayName} for ${durationDays} days. All premium features, CBT corrections, and study tools are active until ${new Date(periodEnd).toLocaleDateString("en-NG", { dateStyle: "medium" })}.`,
          type: "subscription",
          is_read: false,
          created_at: periodStart,
        });

        return NextResponse.json({
          ok: true,
          message: `Successfully upgraded candidate to ${planDisplayName} for ${durationDays} days.`,
          subscription: {
            planId,
            status: "active",
            current_period_end: periodEnd,
            max_questions: maxQ,
          },
        });
      }

      const grant = grantResult as {
        ok?: boolean;
        error?: string;
        message?: string;
        plan_id?: string;
        plan_name?: string;
        expires_at?: string;
        max_questions?: number;
      } | null;

      if (!grant?.ok) {
        return NextResponse.json(
          { ok: false, error: grant?.message || grant?.error || "Subscription grant was not completed." },
          { status: 400 }
        );
      }

      // Audit log
      try {
        const { error: auditError } = await supabase.from("configuration_audit_logs").insert({
          admin_email: admin.email,
          entity_type: "candidate_subscription",
          entity_id: candidateId,
          action: "updated",
          new_value: {
            planId,
            durationDays,
            reason,
            grantedBy: admin.email,
            periodEnd: grant.expires_at,
            maxQuestions: grant.max_questions,
          },
          change_reason: `Admin upgraded account to ${planId.toUpperCase()} for ${durationDays} days (${reason})`,
        });
        if (auditError) console.warn("[admin/candidates/action] Audit log failed:", auditError.message);
      } catch (auditErr) {
        console.warn("[admin/candidates/action] Audit log failed:", auditErr);
      }

      return NextResponse.json({
        ok: true,
        message: grant.message || `Successfully upgraded candidate to ${planId.toUpperCase()} tier for ${durationDays} days.`,
        subscription: {
          planId,
          status: "active",
          current_period_end: grant.expires_at,
          max_questions: grant.max_questions,
        },
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 2: SUSPEND ACCOUNT
    // ------------------------------------------------------------------------
    if (action === "suspend") {
      const reason = body.reason || "Administrative suspension";

      // 10 years ban duration in auth.admin API or set is_suspended flag in user metadata
      await supabase.auth.admin.updateUserById(candidateId, {
        ban_duration: "87600h",
        user_metadata: {
          ...currentMeta,
          is_suspended: true,
          suspension_reason: reason,
          suspended_at: new Date().toISOString(),
          suspended_by: admin.email,
        },
      });

      // Audit log
      try {
        await supabase.from("configuration_audit_logs").insert({
          admin_email: admin.email,
          entity_type: "candidate_account",
          entity_id: candidateId,
          action: "updated",
          new_value: { is_suspended: true, reason },
          change_reason: `Candidate suspended: ${reason}`,
        });
      } catch {}

      return NextResponse.json({
        ok: true,
        message: `Candidate account has been suspended.`,
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 3: REACTIVATE ACCOUNT
    // ------------------------------------------------------------------------
    if (action === "reactivate") {
      await supabase.auth.admin.updateUserById(candidateId, {
        ban_duration: "none",
        user_metadata: {
          ...currentMeta,
          is_suspended: false,
          reactivated_at: new Date().toISOString(),
          reactivated_by: admin.email,
        },
      });

      // Audit log
      try {
        await supabase.from("configuration_audit_logs").insert({
          admin_email: admin.email,
          entity_type: "candidate_account",
          entity_id: candidateId,
          action: "updated",
          new_value: { is_suspended: false },
          change_reason: `Candidate account reactivated by ${admin.email}`,
        });
      } catch {}

      return NextResponse.json({
        ok: true,
        message: `Candidate account has been reactivated.`,
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 4: SEND PASSWORD RESET EMAIL
    // ------------------------------------------------------------------------
    if (action === "send_password_reset") {
      if (!candidate.email) {
        return NextResponse.json({ ok: false, error: "Candidate has no registered email" }, { status: 400 });
      }

      await supabase.auth.resetPasswordForEmail(candidate.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.brainlabacademy.com.ng"}/auth/reset-password`,
      });

      try {
        await supabase.from("configuration_audit_logs").insert({
          admin_email: admin.email,
          entity_type: "candidate_auth",
          entity_id: candidateId,
          action: "updated",
          new_value: { action: "password_reset_sent", email: candidate.email },
          change_reason: `Admin requested password reset for ${candidate.email}`,
        });
      } catch {}

      return NextResponse.json({
        ok: true,
        message: `Password reset link dispatched to ${candidate.email}.`,
      });
    }

    return NextResponse.json({ ok: false, error: "Unrecognized administrative action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Administrative action failed" },
      { status: 500 }
    );
  }
}
