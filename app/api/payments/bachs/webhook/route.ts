import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { bachsPaymentProvider } from "../../../../lib/payments/bachsProvider";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
    let event: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!isRecord(parsed)) throw new Error("Expected an event object");
      event = parsed;
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    const eventType = String(event.type || event.event || "").toLowerCase();

    // 3. Handle non-payment / unhandled events gracefully
    if (eventType !== "collection.succeeded" && eventType !== "checkout.completed") {
      if (eventType === "collection.failed" || eventType === "checkout.canceled") {
        const data = isRecord(event.data) ? event.data : {};
        const metadata = isRecord(data.metadata) ? data.metadata : {};
        const reference = typeof metadata.reference === "string"
          ? metadata.reference
          : typeof data.reference === "string" ? data.reference : "";
        if (reference) {
          const supabase = getSupabaseServerClient();
          await supabase
            .from("payment_transactions")
            .update({
              status: "failed",
              metadata: { failure_event: eventType, failure_reason: typeof data.failure_reason === "string" ? data.failure_reason : "Canceled/Failed on Bachs" },
              updated_at: new Date().toISOString(),
            })
            .eq("reference", reference);
        }
      }
      return NextResponse.json({ received: true, event: eventType });
    }

    // 4. Extract event details
    const data = isRecord(event.data) ? event.data : {};
    const checkoutId = typeof data.checkout_id === "string"
      ? data.checkout_id
      : typeof data.id === "string" || typeof data.id === "number" ? String(data.id) : "";
    const metadata = isRecord(data.metadata) ? data.metadata : {};
    const reference = typeof metadata.reference === "string"
      ? metadata.reference
      : typeof data.reference === "string" ? data.reference : "";

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

    // 7. Validate Amount & Currency Match
    // Bachs amount is typically a decimal string (e.g. "15000.00")
    if (data.amount !== undefined) {
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

    if (typeof data.currency === "string" && tx.currency) {
      if (String(data.currency).toUpperCase() !== String(tx.currency).toUpperCase()) {
        return NextResponse.json(
          { error: "Currency mismatch between Bachs payment and order" },
          { status: 400 }
        );
      }
    }

    // 8. Confirm Payment Success
    const paidAt = typeof event.created_at === "string" ? event.created_at : new Date().toISOString();

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
