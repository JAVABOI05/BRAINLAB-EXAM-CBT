import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { getPaymentGatewaysConfig } from "../../../lib/platformConfig";
import {
  createPaymentProviderFromConfig,
  paystackPaymentProvider,
  bachsPaymentProvider,
  flutterwavePaymentProvider,
} from "../../../lib/payments";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asReference(value: unknown): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const bachsSig =
      request.headers.get("x-bachs-signature-v2") ||
      request.headers.get("x-bachs-signature");
    const paystackSig = request.headers.get("x-paystack-signature");
    const flwSig =
      request.headers.get("verif-hash") ||
      request.headers.get("x-flutterwave-signature");

    // Load dynamic gateway configuration from database (falls back gracefully)
    const config = await getPaymentGatewaysConfig().catch(() => undefined);
    const activeBachs = config ? createPaymentProviderFromConfig("bachs", config) : bachsPaymentProvider;
    const activePaystack = config ? createPaymentProviderFromConfig("paystack", config) : paystackPaymentProvider;
    const activeFlutterwave = config ? createPaymentProviderFromConfig("flutterwave", config) : flutterwavePaymentProvider;

    let parsedEvent: unknown;
    try {
      parsedEvent = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    if (!isJsonRecord(parsedEvent)) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const event = parsedEvent;

    // ------------------------------------------------------------------------
    // 1. BACHS WEBHOOK HANDLING
    // ------------------------------------------------------------------------
    if (bachsSig) {
      const timestamp = request.headers.get("x-bachs-timestamp") || "";
      const isValid = activeBachs.verifyWebhookSignature(rawBody, bachsSig, {
        "x-bachs-timestamp": timestamp,
        "x-bachs-signature-v2": request.headers.get("x-bachs-signature-v2"),
        "x-bachs-signature": request.headers.get("x-bachs-signature"),
      });

      if (!isValid && process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Invalid Bachs signature" }, { status: 401 });
      }

      const eventType = String(event.type ?? event.event ?? "").toLowerCase();
      if (eventType !== "collection.succeeded" && eventType !== "checkout.completed") {
        return NextResponse.json({ received: true });
      }

      const data = isJsonRecord(event.data) ? event.data : {};
      const metadata = isJsonRecord(data.metadata) ? data.metadata : {};
      const checkoutId = asReference(data.checkout_id) ?? asReference(data.id);
      const reference = asReference(metadata.reference) ?? asReference(data.reference);

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

      const paidAt = typeof event.created_at === "string" ? event.created_at : new Date().toISOString();

      await supabase
        .from("payment_transactions")
        .update({
          status: "success",
          paid_at: paidAt,
          provider_reference: checkoutId || tx.provider_reference,
          provider: "bachs",
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
            payment_provider: "bachs",
            price_paid_kobo: tx.amount_kobo,
            currency: tx.currency,
            provider_subscription_id: tx.reference,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

        await supabase.from("configuration_audit_logs").insert({
          admin_email: "bachs-webhook@brainlabacademy.com.ng",
          entity_type: "plan",
          entity_id: tx.plan_id,
          action: "updated",
          new_value: {
            event: "webhook_charge_success",
            transaction_id: tx.id,
            reference: tx.reference,
            amount_kobo: tx.amount_kobo,
          },
          change_reason: `Automated Bachs webhook activation for ${tx.reference}`,
        });
      }

      return NextResponse.json({ received: true, success: true, provider: "bachs" });
    }

    // ------------------------------------------------------------------------
    // 2. FLUTTERWAVE WEBHOOK HANDLING
    // ------------------------------------------------------------------------
    if (flwSig || event.event === "charge.completed" || (isJsonRecord(event.data) && event.data.flw_ref)) {
      const isValid = activeFlutterwave.verifyWebhookSignature(rawBody, flwSig || "", {
        "verif-hash": flwSig,
      });

      if (!isValid && process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Invalid Flutterwave signature" }, { status: 401 });
      }

      const eventType = String(event.event ?? "").toLowerCase();
      const data = isJsonRecord(event.data) ? event.data : {};
      const dataStatus = String(data.status ?? "").toLowerCase();

      if (eventType !== "charge.completed" && dataStatus !== "successful") {
        return NextResponse.json({ received: true });
      }

      const txRef = asReference(data.tx_ref) ?? asReference(data.reference);
      const flwRef = asReference(data.flw_ref) ?? asReference(data.id);

      if (!txRef && !flwRef) {
        return NextResponse.json({ error: "Missing Flutterwave transaction reference" }, { status: 400 });
      }

      const supabase = getSupabaseServerClient();
      let query = supabase.from("payment_transactions").select("*, subscription_plans(*)");
      if (txRef) {
        query = query.eq("reference", txRef);
      } else {
        query = query.eq("provider_reference", flwRef);
      }

      const { data: tx, error: txError } = await query.maybeSingle();
      if (txError || !tx) {
        return NextResponse.json({ received: true, unhandled: true });
      }

      if (tx.status === "success") {
        return NextResponse.json({ received: true, alreadyProcessed: true });
      }

      const paidAt = typeof data.created_at === "string" ? data.created_at : new Date().toISOString();

      await supabase
        .from("payment_transactions")
        .update({
          status: "success",
          paid_at: paidAt,
          provider_reference: flwRef || tx.provider_reference,
          provider: "flutterwave",
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
            payment_provider: "flutterwave",
            price_paid_kobo: tx.amount_kobo,
            currency: tx.currency,
            provider_subscription_id: tx.reference,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

        await supabase.from("configuration_audit_logs").insert({
          admin_email: "flutterwave-webhook@brainlabacademy.com.ng",
          entity_type: "plan",
          entity_id: tx.plan_id,
          action: "updated",
          new_value: {
            event: "webhook_charge_success",
            transaction_id: tx.id,
            reference: tx.reference,
            amount_kobo: tx.amount_kobo,
          },
          change_reason: `Automated Flutterwave webhook activation for ${tx.reference}`,
        });
      }

      return NextResponse.json({ received: true, success: true, provider: "flutterwave" });
    }

    // ------------------------------------------------------------------------
    // 3. PAYSTACK WEBHOOK HANDLING
    // ------------------------------------------------------------------------
    const isValid = activePaystack.verifyWebhookSignature(rawBody, paystackSig || "");
    if (!isValid && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const data = isJsonRecord(event.data) ? event.data : {};
    const reference = asReference(data.reference);
    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: tx, error: txError } = await supabase
      .from("payment_transactions")
      .select("*, subscription_plans(*)")
      .eq("reference", reference)
      .maybeSingle();

    if (txError || !tx) {
      return NextResponse.json({ received: true, unhandled: true });
    }

    if (tx.status === "success") {
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    const paidAt = typeof data.paid_at === "string" ? data.paid_at : new Date().toISOString();

    await supabase
      .from("payment_transactions")
      .update({
        status: "success",
        paid_at: paidAt,
        provider_reference: data.id ? String(data.id) : reference,
        provider: "paystack",
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
        change_reason: `Automated Paystack webhook activation for ${reference}`,
      });
    }

    return NextResponse.json({ received: true, success: true, provider: "paystack" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal webhook error" },
      { status: 500 }
    );
  }
}
