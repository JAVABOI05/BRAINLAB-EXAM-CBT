import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { bachsPaymentProvider } from "../../../../lib/payments/bachsProvider";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const signatureV2 = request.headers.get("x-bachs-signature-v2") || "";
    const signature = request.headers.get("x-bachs-signature") || "";
    const timestamp = request.headers.get("x-bachs-timestamp") || "";

    const activeSig = signatureV2 || signature;

    // 1. Strict signature verification
    const isValid = bachsPaymentProvider.verifyWebhookSignature(rawBody, activeSig, {
      "x-bachs-timestamp": timestamp,
      "x-bachs-signature-v2": signatureV2,
      "x-bachs-signature": signature,
    });

    if (!isValid && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Invalid Bachs signature" }, { status: 401 });
    }

    // 2. Parse event payload
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    const eventType = String(event.type || event.event || "").toLowerCase();

    // 3. Handle non-payment / unhandled events gracefully
    if (eventType !== "collection.succeeded" && eventType !== "checkout.completed") {
      if (eventType === "collection.failed" || eventType === "checkout.canceled") {
        const data = event.data || {};
        const reference = data.metadata?.reference;
        if (reference) {
          const supabase = getSupabaseServerClient();
          await supabase
            .from("payment_transactions")
            .update({
              status: "failed",
              metadata: { failure_event: eventType, failure_reason: data.failure_reason || "Canceled/Failed on Bachs" },
              updated_at: new Date().toISOString(),
            })
            .eq("reference", reference);
        }
      }
      return NextResponse.json({ received: true, event: eventType });
    }

    // 4. Extract event details
    const data = event.data || {};
    const checkoutId = data.checkout_id || data.id;
    const metadata = data.metadata || {};
    const reference = metadata.reference || data.reference;

    if (!reference && !checkoutId) {
      return NextResponse.json({ error: "Missing order reference or checkout_id" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 5. Look up transaction by reference or provider_reference (idempotent retrieval)
    let query = supabase
      .from("payment_transactions")
      .select("*, subscription_plans(*)");

    if (reference) {
      query = query.eq("reference", reference);
    } else {
      query = query.eq("provider_reference", checkoutId);
    }

    const { data: tx, error: txError } = await query.maybeSingle();

    if (txError || !tx) {
      // Transaction might belong to external system or unrecorded
      return NextResponse.json({ received: true, unhandled: true });
    }

    // 6. Idempotency Check: if already marked success, acknowledge immediately
    if (tx.status === "success") {
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    // 7. Require amount and currency in the signed event, then independently
    // verify the checkout with BACHS. A signed payload alone is not the source
    // of truth for fulfillment, and missing fields must fail closed.
    if (data.amount === undefined || data.currency === undefined || data.currency === null || !checkoutId) {
      return NextResponse.json(
        { error: "Successful BACHS event is missing amount, currency, or checkout ID." },
        { status: 400 }
      );
    }

    const incomingAmountDecimal = Number(data.amount);
    const incomingKobo = Math.round(incomingAmountDecimal * 100);
    const expectedKobo = Number(tx.amount_kobo);
    if (
      !Number.isFinite(incomingAmountDecimal) ||
      !Number.isFinite(expectedKobo) ||
      incomingKobo !== expectedKobo ||
      String(data.currency).toUpperCase() !== String(tx.currency || "NGN").toUpperCase()
    ) {
      return NextResponse.json(
        { error: "Payment amount or currency does not match order record" },
        { status: 400 }
      );
    }

    const providerCheck = await bachsPaymentProvider.verifyPayment(tx.reference, String(checkoutId));
    const verifiedCurrency = String(providerCheck.currency || "").toUpperCase();
    if (
      !providerCheck.ok ||
      providerCheck.status !== "success" ||
      providerCheck.reference !== tx.reference ||
      Number(providerCheck.amountKobo) !== expectedKobo ||
      verifiedCurrency !== String(tx.currency || "NGN").toUpperCase()
    ) {
      return NextResponse.json(
        { error: "BACHS could not independently verify this payment against the order." },
        { status: 400 }
      );
    }

    // 8. Mark transaction successful only after signature, provider verification,
    // exact reference, amount and currency checks all pass.
    const paidAt = providerCheck.paidAt || event.created_at || new Date().toISOString();

    await supabase
      .from("payment_transactions")
      .update({
        status: "success",
        paid_at: paidAt,
        provider_reference: checkoutId || tx.provider_reference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tx.id);

    // 9. Coupon redemption recording
      const incomingAmountDecimal = parseFloat(String(data.amount));
      const incomingKobo = Math.round(incomingAmountDecimal * 100);
      const expectedKobo = Number(tx.amount_kobo);

      // Verify that amount does not underpay the expected amount
      if (incomingKobo > 0 && expectedKobo > 0 && Math.abs(incomingKobo - expectedKobo) > 5) {
        await supabase
          .from("payment_transactions")
          .update({
            metadata: {
              ...tx.metadata,
              amount_mismatch_warning: {
                incoming_kobo: incomingKobo,
                expected_kobo: expectedKobo,
              },
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", tx.id);

        return NextResponse.json(
          { error: "Payment amount does not match order record" },
          { status: 400 }
        );
      }
    }

    if (data.currency && tx.currency) {
      if (String(data.currency).toUpperCase() !== String(tx.currency).toUpperCase()) {
        return NextResponse.json(
          { error: "Currency mismatch between Bachs payment and order" },
          { status: 400 }
        );
      }
    }

    // 8. Confirm Payment Success
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

    // 9. Coupon redemption recording
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

      const { data: coupon } = await supabase
        .from("coupon_campaigns")
        .select("current_redemptions")
        .eq("id", tx.coupon_id)
        .single();

      if (coupon) {
        await supabase
          .from("coupon_campaigns")
          .update({
            current_redemptions: (coupon.current_redemptions || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", tx.coupon_id);
      }
    }

    // 10. Activate Subscription & Entitlements for Learner
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

      // Audit log entry
      await supabase.from("configuration_audit_logs").insert({
        admin_email: "bachs-webhook@brainlabacademy.com.ng",
        entity_type: "plan",
        entity_id: tx.plan_id,
        action: "updated",
        new_value: {
          event: "webhook_bachs_success",
          transaction_id: tx.id,
          reference: tx.reference,
          checkout_id: checkoutId,
          amount_kobo: tx.amount_kobo,
          paid_at: paidAt,
        },
        change_reason: `Automated Bachs webhook activation for ${tx.reference}`,
      });
    }

    return NextResponse.json({ received: true, success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal webhook processing error" },
      { status: 500 }
    );
  }
}
