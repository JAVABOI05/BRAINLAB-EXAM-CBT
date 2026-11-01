import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { bachsPaymentProvider } from "../../../../lib/payments/bachsProvider";
import { recordSuccessfulPayment } from "../../../../lib/payments/paymentProcessor.server";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
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
    let event: unknown;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    if (!isRecord(event)) {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    }
    const eventType = String(event.type || event.event || "").toLowerCase();

    // 3. Handle non-payment / unhandled events gracefully
    if (eventType !== "collection.succeeded" && eventType !== "checkout.completed") {
      if (eventType === "collection.failed" || eventType === "checkout.canceled") {
        const data = isRecord(event.data) ? event.data : {};
        const metadata = isRecord(data.metadata) ? data.metadata : {};
        const reference = asString(metadata.reference) ?? asString(data.reference);
        if (reference) {
          const supabase = getSupabaseServerClient();
          await supabase
            .from("payment_transactions")
            .update({
              status: "failed",
              metadata: { failure_event: eventType, failure_reason: asString(data.failure_reason) || "Canceled/Failed on Bachs" },
              updated_at: new Date().toISOString(),
            })
            .eq("reference", reference);
        }
      }
      return NextResponse.json({ received: true, event: eventType });
    }

    // 4. Extract event details
    const data = isRecord(event.data) ? event.data : {};
    const checkoutId = asString(data.checkout_id) ?? asString(data.id);
    const metadata = isRecord(data.metadata) ? data.metadata : {};
    const reference = asString(metadata.reference) ?? asString(data.reference);

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
      return NextResponse.json({ received: true, unhandled: true });
    }

    const pricing = isRecord(data.pricing) ? data.pricing : {};
    const amountVal = parseFloat(String(pricing.amount ?? data.amount ?? "0"));
    const amountKobo = Math.round(amountVal * 100);
    const paidAt = typeof event.created_at === "string" ? event.created_at : new Date().toISOString();

    const recordResult = await recordSuccessfulPayment(
      tx,
      {
        providerReference: checkoutId || tx.provider_reference,
        paidAt,
        amountKobo: amountKobo > 0 ? amountKobo : undefined,
        currency: String(pricing.currency ?? data.currency ?? tx.currency ?? "NGN"),
        channel: "bachs_webhook",
        metadata: {
          webhook_event: eventType,
          bachs_event_id: event.id,
          customer_email: isRecord(data.customer) ? data.customer.email : undefined,
        },
        verifiedBy: "bachs_webhook",
      },
      supabase
    );

    return NextResponse.json({ received: true, success: recordResult.ok, provider: "bachs" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Bachs webhook processing error" },
      { status: 500 }
    );
  }
}
