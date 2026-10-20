import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { paymentProvider } from "../../../lib/payments/paystackProvider";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature") || "";

    // Signature verification (strict security)
    const isValid = paymentProvider.verifyWebhookSignature(rawBody, signature);
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
      // Acknowledge receipt of other events
      return NextResponse.json({ received: true });
    }

    const data = event.data;
    const reference = data?.reference;
    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Check transaction idempotency
    const { data: tx, error: txError } = await supabase
      .from("payment_transactions")
      .select("*, subscription_plans(*)")
      .eq("reference", reference)
      .single();

    if (txError || !tx) {
      // Transaction might belong to external system or unrecorded
      return NextResponse.json({ received: true, unhandled: true });
    }

    if (tx.status === "success") {
      // Already processed idempotently
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    const paidAt = data.paid_at || new Date().toISOString();

    // Mark transaction success
    await supabase
      .from("payment_transactions")
      .update({
        status: "success",
        paid_at: paidAt,
        provider_reference: data.id ? String(data.id) : reference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tx.id);

    // Coupon record
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

    // Activate subscription
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

      // Audit log
      await supabase.from("configuration_audit_logs").insert({
        admin_email: "paystack-webhook@brainlab.ac",
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

    return NextResponse.json({ received: true, success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Webhook processing error: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
