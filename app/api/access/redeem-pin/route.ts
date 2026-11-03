import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawCode = String(body.code || body.pin || "").trim().toUpperCase();
    const phone = body.phone ? String(body.phone).trim() : null;

    if (!rawCode) {
      return NextResponse.json(
        { ok: false, error: "empty_code", message: "Please enter an access PIN or voucher code." },
        { status: 400 }
      );
    }

    // Resolve caller identity from Bearer token or Supabase session cookies
    const user = await getUserFromRequest(request);
    let userId: string | null = user?.id || null;

    const serviceClient = getSupabaseServerClient();

    // If still no user id, check if candidate provided phone matching an existing profile
    if (!userId && phone) {
      try {
        const { data: matchedUser } = await serviceClient
          .from("profiles")
          .select("id, email")
          .eq("phone", phone)
          .maybeSingle();
        if (matchedUser?.id) {
          userId = matchedUser.id;
        }
      } catch {}
    }

    // Try calling the atomic PostgreSQL RPC
    try {
      const { data: rpcData, error: rpcError } = await serviceClient.rpc("redeem_plan_voucher", {
        p_code: rawCode,
        p_user_id: userId,
        p_phone: phone,
      });

      if (!rpcError && rpcData) {
        if (!rpcData.ok) {
          const status = rpcData.error === "auth_required" ? 401 : 400;
          return NextResponse.json(rpcData, { status });
        }
        return NextResponse.json(rpcData);
      }
    } catch (rpcErr) {
      console.warn("[api/access/redeem-pin] RPC redeem_plan_voucher call failed, attempting fallback:", rpcErr);
    }

    // Fallback direct execution if RPC is not yet registered in database
    const { data: codeRow, error: codeErr } = await serviceClient
      .from("access_codes")
      .select("*")
      .eq("code", rawCode)
      .maybeSingle();

    if (codeErr || !codeRow) {
      return NextResponse.json(
        { ok: false, error: "not_found", message: "The access PIN entered is invalid or does not exist." },
        { status: 404 }
      );
    }

    if (codeRow.is_used) {
      return NextResponse.json(
        {
          ok: false,
          error: "already_used",
          message: `This PIN has already been used on ${new Date(codeRow.used_at || codeRow.created_at).toLocaleDateString("en-NG")}.`,
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "auth_required",
          message: "Please sign in or create a BrainLab account to activate this voucher code on your profile.",
          plan_id: codeRow.grants_plan || "premium",
        },
        { status: 401 }
      );
    }

    const planId = (codeRow.grants_plan || "premium").toLowerCase();
    const validityDays = Math.max(1, codeRow.validity_days || 30);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + validityDays);

    const planName =
      planId === "pro"
        ? "BrainLab Pro"
        : planId === "plus"
        ? "BrainLab Plus"
        : "Premium Study";

    // 1. Upsert into user_subscriptions
    const { error: subErr } = await serviceClient.from("user_subscriptions").upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: "active",
        current_period_start: startDate.toISOString(),
        current_period_end: endDate.toISOString(),
        payment_provider: "voucher_pin",
        price_paid_kobo: 0,
        currency: "NGN",
        provider_subscription_id: `PIN-${rawCode}`,
        metadata: {
          pin_code: rawCode,
          cohort: codeRow.cohort || null,
          subject: codeRow.subject || null,
          redeemed_at: startDate.toISOString(),
        },
        updated_at: startDate.toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (subErr) {
      console.error("[api/access/redeem-pin] Subscription upsert error:", subErr);
      return NextResponse.json(
        { ok: false, error: "subscription_error", message: `Failed to activate subscription: ${subErr.message}` },
        { status: 500 }
      );
    }

    // 2. Mark code as consumed
    await serviceClient
      .from("access_codes")
      .update({
        is_used: true,
        used_by: userId,
        used_at: startDate.toISOString(),
      })
      .eq("id", codeRow.id);

    // 3. Optional learning entitlements
    try {
      await serviceClient.from("learning_entitlements").upsert({
        user_id: userId,
        entitlement_type: "tier_membership",
        membership_type: planId,
        max_questions: 10000,
        status: "active",
        permanent: validityDays >= 365,
        starts_at: startDate.toISOString(),
        expires_at: endDate.toISOString(),
      });
    } catch {}

    // 4. Notification
    try {
      await serviceClient.from("notifications").insert({
        user_id: userId,
        title: `🎉 Account Upgraded to ${planName}`,
        message: `Your access voucher ${rawCode} was redeemed successfully! You now have full access to CBT corrections, step-by-step solutions, and AI tutor explanations until ${endDate.toLocaleDateString("en-NG", { dateStyle: "medium" })}.`,
        type: "subscription",
        is_read: false,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      code: rawCode,
      plan_id: planId,
      plan_name: planName,
      validity_days: validityDays,
      expires_at: endDate.toISOString(),
      message: `Congratulations! Your account has been upgraded to ${planName}. Full question solutions and AI corrections are now unlocked.`,
    });
  } catch (err) {
    console.error("[api/access/redeem-pin] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error redeeming PIN voucher" },
      { status: 500 }
    );
  }
}
