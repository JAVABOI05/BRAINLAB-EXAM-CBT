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
      const planId = (body.planId || body.plan || "premium").toLowerCase();
      const durationDays = Math.max(1, parseInt(body.durationDays || body.validityDays || "30", 10));
      const reason = body.reason || "Direct Administrator Plan Upgrade";

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      // Upsert into user_subscriptions
      const { error: subError } = await supabase.from("user_subscriptions").upsert(
        {
          user_id: candidateId,
          plan_id: planId,
          status: "active",
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          payment_provider: "admin_manual_grant",
          price_paid_kobo: 0,
          currency: "NGN",
          provider_subscription_id: `ADMIN-GRANT-${Date.now()}`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (subError) {
        return NextResponse.json(
          { ok: false, error: `Failed to update user subscription: ${subError.message}` },
          { status: 500 }
        );
      }

      // Upsert learning entitlements to grant full question quota if table exists
      try {
        await supabase.from("learning_entitlements").upsert({
          user_id: candidateId,
          entitlement_type: "tier_membership",
          membership_type: planId,
          max_questions: 10000,
          status: "active",
          permanent: durationDays > 365,
          starts_at: startDate.toISOString(),
          expires_at: endDate.toISOString(),
        });
      } catch (entErr) {
        console.warn("[admin/candidates/action] Entitlements table upsert skipped:", entErr);
      }

      // Deliver in-app notification if table exists
      try {
        const planName = planId === "pro" ? "BrainLab Pro" : planId === "plus" ? "BrainLab Plus" : "Premium Study";
        await supabase.from("notifications").insert({
          user_id: candidateId,
          title: `🎉 Account Upgraded to ${planName}`,
          message: `Your account has been upgraded to ${planName} for ${durationDays} days by Platform Administration. You now have full access to CBT corrections, step-by-step solutions, and AI tutor explanations.`,
          type: "subscription",
          is_read: false,
        });
      } catch (notifErr) {
        console.warn("[admin/candidates/action] Notification insert skipped:", notifErr);
      }

      // Audit log
      try {
        await supabase.from("configuration_audit_logs").insert({
          admin_email: admin.email,
          entity_type: "candidate_subscription",
          entity_id: candidateId,
          action: "updated",
          new_value: {
            planId,
            durationDays,
            reason,
            grantedBy: admin.email,
            periodEnd: endDate.toISOString(),
          },
          change_reason: `Admin upgraded account to ${planId.toUpperCase()} for ${durationDays} days (${reason})`,
        });
      } catch (auditErr) {
        console.warn("[admin/candidates/action] Audit log skipped:", auditErr);
      }

      return NextResponse.json({
        ok: true,
        message: `Successfully upgraded candidate to ${planId.toUpperCase()} tier for ${durationDays} days.`,
        subscription: {
          planId,
          status: "active",
          current_period_end: endDate.toISOString(),
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
