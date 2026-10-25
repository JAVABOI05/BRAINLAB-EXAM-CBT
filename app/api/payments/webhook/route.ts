import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { paystackPaymentProvider } from "../../../lib/payments/paystackProvider";
import { bachsPaymentProvider } from "../../../lib/payments/bachsProvider";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const bachsSig =
      request.headers.get("x-bachs-signature-v2") ||
      request.headers.get("x-bachs-signature");
    const paystackSig = request.headers.get("x-paystack-signature");

    // ------------------------------------------------------------------------
    // 1. If Bachs Webhook Header Detected, Process as Bachs
    // ------------------------------------------------------------------------
    if (bachsSig) {
      const timestamp = request.headers.get("x-bachs-timestamp") || "";
      const isValid = bachsPaymentProvider.verifyWebhookSignature(rawBody, bachsSig, {
        "x-bachs-timestamp": timestamp,
        "x-bachs-signature-v2": request.headers.get("x-bachs-signature-v2"),
        "x-bachs-signature": request.headers.get("x-bachs-signature"),
      });

      if (!isValid && process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Invalid Bachs signature" }, { status: 401 });
      }

      let event: unknown;
      try {
        event = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
      }

      const eventType = String(event.type || event.event || "").toLowerCase();
      if (eventType !== "collection.succeeded" && eventType !== "checkout.completed") {
        return NextResponse.json({ received: true });
      }

      const data = event.data || {};
      const checkoutId = data.checkout_id || data.id;
      const reference = data.metadata?.reference || data.reference;

      if (!reference && !checkoutId) {
        return NextResponse.json({ error: "Missing reference" }, { status: 400 });
      }

      const supabase = getSupabaseServerClient();
      let query = supabase.from("payment_transactions").select("*, subscription_plans(*)");
      if (reference) {
        query = query.eq("reference", reference);
      } else {
        query = query.eq("provider_reference", checkoutId);
      }

      const { data: tx, error: txError } = await query.maybeSingle();
      if (txError || !tx) {
        return NextResponse.json({ received: true, unhandled: true });
      }

      if (tx.status === "success") {
        return NextResponse.json({ received: true, alreadyProcessed: true });
      }

      const paidAt = event.created_at || new Date().toISOString();

      await supabase
        .from("payment_transactions")
        .update({
          status: "success",
          paid_at: paidAt,
          provider_reference: checkoutId || tx.provider_reference,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      if (tx.user_id && tx.plan_id) {
        const planInterval = tx.subscription_plans?.interval || "monthly";
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + (planInterval === "yearly" ? 365 : 30));

        await supabase.from("user_subscriptions").upsert(
          {
            user_id: tx.user_id,
            plan_id: tx.plan_id,
            status: "active",
            current_period_start: paidAt,
            current_period_end: periodEnd.toISOString(),
            payment_provider: "bachs",
            price_paid_kobo: tx.amount_kobo,
            currency: tx.currency,
            provider_subscription_id: tx.reference,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }

      return NextResponse.json({ received: true, success: true, provider: "bachs" });
    }

    // ------------------------------------------------------------------------
    // 2. Paystack Webhook Handling (Existing Flow Preserved)
    // ------------------------------------------------------------------------
    const isValid = paystackPaymentProvider.verifyWebhookSignature(rawBody, paystackSig || "");
    if (!isValid && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const data = event.data;
    const reference = data?.reference;
    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: tx, error: txError } = await supabase
      .from("payment_transactions")
      .select("*, subscription_plans(*)")
      .eq("reference", reference)
      .single();

    if (txError || !tx) {
      return NextResponse.json({ received: true, unhandled: true });
    }

    if (tx.status === "success") {
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    const paidAt = data.paid_at || new Date().toISOString();

    await supabase
      .from("payment_transactions")
      .update({
        status: "success",
        paid_at: paidAt,
        provider_reference: data.id ? String(data.id) : reference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tx.id);

    if (tx.coupon_id && tx.user_id) {
      await supabase.from("coupon_redemptions").upsert(
        {
          coupon_id: tx.coupon_id,
          user_id: tx.user_id,
          transaction_id: tx.id,
          discount_applied_kobo: tx.discount_kobo,
          redeemed_at: paidAt,
        },
        { onConflict: "coupon_id,user_id" }
      );
    }

    if (tx.user_id && tx.plan_id) {
      const planInterval = tx.subscription_plans?.interval || "monthly";
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + (planInterval === "yearly" ? 365 : 30));

      await supabase.from("user_subscriptions").upsert(
        {
          user_id: tx.user_id,
          plan_id: tx.plan_id,
          status: "active",
          current_period_start: paidAt,
          current_period_end: periodEnd.toISOString(),
          payment_provider: "paystack",
          price_paid_kobo: tx.amount_kobo,
          currency: tx.currency,
          provider_subscription_id: reference,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      await supabase.from("configuration_audit_logs").insert({
        admin_email: "paystack-webhook@brainlabacademy.com.ng",
        entity_type: "plan",
        entity_id: tx.plan_id,
        action: "updated",
        new_value: {
          event: "webhook_charge_success",
          transaction_id: tx.id,
          reference,
          amount_kobo: tx.amount_kobo,
        },
        change_reason: `Automated webhook activation for ${reference}`,
      });
    }

    return NextResponse.json({ received: true, success: true, provider: "paystack" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "Internal webhook error" },
      { status: 500 }
    );
  }
}
