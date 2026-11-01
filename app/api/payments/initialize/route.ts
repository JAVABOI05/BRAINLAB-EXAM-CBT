import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "../../../lib/supabaseServer";
import { resolveActivePaymentProvider } from "../../../lib/payments";
import { getSubscriptionPlans, validateCoupon } from "../../../lib/platformConfig";
import { isCurrentUserAdmin } from "../../../lib/subscriptionEntitlements";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !user.email) {
      return NextResponse.json(
        { ok: false, error: "unauthorized", message: "Please sign in to subscribe or upgrade your plan." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { planId, couponCode, callbackUrl, provider } = body;
    const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : typeof body.redirectUrl === "string" ? body.redirectUrl : undefined;

    // Super Admin Bypass: Super Admins are NEVER asked or required to pay for any feature!
    const isAdmin = await isCurrentUserAdmin(user.id);
    if (isAdmin) {
      return NextResponse.json({
        ok: true,
        adminBypass: true,
        message: "Super Admin has universal unrestricted access to all platform features. No payment required.",
        redirectUrl: returnUrl || "/dashboard",
      });
    }

    if (!planId || typeof planId !== "string") {
      return NextResponse.json(
        { ok: false, error: "bad_request", message: "Plan ID is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch Plan details from database or central configuration engine
    let plan = null;
    const { data: dbPlan } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .maybeSingle();

    if (dbPlan) {
      plan = dbPlan;
    } else {
      const allPlans = await getSubscriptionPlans();
      const matched = allPlans.find((p) => p.id === planId && p.is_active);
      if (matched) {
        plan = matched;
      }
    }

    if (!plan) {
      return NextResponse.json(
        { ok: false, error: "plan_not_found", message: "Selected subscription tier does not exist or is inactive." },
        { status: 404 }
      );
    }

    let finalAmountKobo = Number(plan.price_kobo);
    let discountKobo = 0;
    let appliedCouponId: string | null = null;

    // 2. Validate coupon if provided
    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      let couponValid = false;
      const { data: couponRes, error: couponErr } = await supabase.rpc("validate_and_apply_coupon", {
        p_code: couponCode.trim(),
        p_user_id: user.id,
        p_amount_kobo: finalAmountKobo,
      });

      if (!couponErr && couponRes?.ok) {
        couponValid = true;
        appliedCouponId = couponRes.coupon_id;
        discountKobo = Number(couponRes.discount_kobo || 0);
        finalAmountKobo = Number(couponRes.final_amount_kobo || 0);
      } else {
        // Fall back to central platformConfig validation
        const valRes = await validateCoupon(couponCode.trim(), plan.id, finalAmountKobo);
        if (valRes.valid) {
          couponValid = true;
          discountKobo = valRes.discount_kobo;
          finalAmountKobo = Math.max(0, finalAmountKobo - discountKobo);
        }
      }

      if (!couponValid) {
        return NextResponse.json(
          {
            ok: false,
            error: "invalid_coupon",
            message: couponRes?.message || "Invalid or expired promo coupon.",
          },
          { status: 400 }
        );
      }
    }

    // 3. Handle 100% discount or Free Tier directly without gateway
    if (finalAmountKobo <= 0) {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + (plan.interval === "yearly" ? 365 : 30));

      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const freeSubPayload = {
        user_id: user.id,
        plan_id: plan.id,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        price_paid_kobo: 0,
        currency: plan.currency || "NGN",
        payment_provider: "free_grant",
        metadata: { plan_name: plan.name, coupon_code: couponCode || null, return_url: returnUrl || null },
        updated_at: new Date().toISOString(),
      };

      if (existingSub?.id) {
        await supabase.from("user_subscriptions").update(freeSubPayload).eq("id", existingSub.id);
      } else {
        await supabase.from("user_subscriptions").insert(freeSubPayload);
      }

      if (appliedCouponId) {
        await supabase.from("coupon_redemptions").upsert({
          coupon_id: appliedCouponId,
          user_id: user.id,
          discount_applied_kobo: discountKobo,
        }, { onConflict: "coupon_id,user_id" });
        await supabase.rpc("increment_coupon_redemption", { p_coupon_id: appliedCouponId });
      }

      return NextResponse.json({
        ok: true,
        freePlan: true,
        message: "Plan activated successfully at no charge.",
        redirectUrl: returnUrl || "/account/access",
      });
    }

    // 4. Resolve selected payment provider
    const selectedProvider = await resolveActivePaymentProvider(provider);
    const paymentProviderName = selectedProvider.name;
    const allowedProviders = ["paystack", "flutterwave", "bachs", "bank_transfer"];
    if (!allowedProviders.includes(paymentProviderName)) {
      return NextResponse.json(
        { ok: false, error: "provider_configuration_error", message: "The configured payment provider is not supported." },
        { status: 500 }
      );
    }

    const reference = `BL_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 5. Create pending transaction record with return_url captured in metadata
    const { error: txError } = await supabase.from("payment_transactions").insert({
      reference,
      user_id: user.id,
      plan_id: plan.id,
      customer_email: user.email,
      amount_kobo: finalAmountKobo,
      currency: plan.currency || "NGN",
      provider: paymentProviderName,
      status: "pending",
      coupon_id: appliedCouponId,
      discount_kobo: discountKobo,
      metadata: {
        plan_name: plan.name,
        plan_interval: plan.interval,
        original_price_kobo: plan.price_kobo,
        requested_provider: paymentProviderName,
        return_url: returnUrl || null,
      },
    });

    if (txError) {
      return NextResponse.json(
        { ok: false, error: "db_error", message: "Failed to create transaction record: " + txError.message },
        { status: 500 }
      );
    }

    // 6. Initialize payment with selected provider and preserve returnUrl in callbackUrl
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const callbackRedirectParam = returnUrl ? `?redirect=${encodeURIComponent(returnUrl)}` : "";
    const defaultCallback = `${protocol}://${host}/account/subscription/callback${callbackRedirectParam}`;

    const initResult = await selectedProvider.initializePayment({
      email: user.email,
      amountKobo: finalAmountKobo,
      currency: plan.currency || "NGN",
      reference,
      planId: plan.id,
      userId: user.id,
      provider: paymentProviderName as "paystack" | "bachs",
      couponCode: couponCode || undefined,
      callbackUrl: callbackUrl || defaultCallback,
      metadata: {
        planName: plan.name,
        planInterval: plan.interval,
        returnUrl: returnUrl || null,
      },
    });

    if (!initResult.ok) {
      await supabase
        .from("payment_transactions")
        .update({ status: "failed", metadata: { failure_reason: initResult.error, return_url: returnUrl || null } })
        .eq("reference", reference);

      return NextResponse.json(
        { ok: false, error: "gateway_error", message: initResult.error || "Payment initialization failed." },
        { status: 502 }
      );
    }

    // Update transaction with provider's session ID if returned (e.g. Bachs checkout session ID)
    if (initResult.sessionId) {
      await supabase
        .from("payment_transactions")
        .update({ provider_reference: initResult.sessionId })
        .eq("reference", reference);
    }

    return NextResponse.json({
      ok: true,
      reference,
      authorizationUrl: initResult.authorizationUrl,
      isTestMode: initResult.isTestMode,
      provider: selectedProvider.name,
      returnUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "server_error", message: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
