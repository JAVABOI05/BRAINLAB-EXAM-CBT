import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { resolveActivePaymentProvider } from "../../../lib/payments";
import { recordSuccessfulPayment } from "../../../lib/payments/paymentProcessor.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ ok: false, error: "Missing reference" }, { status: 400 });
  }
  return handleVerification(reference);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const reference = body.reference;
  if (!reference) {
    return NextResponse.json({ ok: false, error: "Missing reference" }, { status: 400 });
  }
  return handleVerification(reference);
}

async function handleVerification(reference: string) {
  try {
    const supabase = getSupabaseServerClient();

    // 1. Fetch transaction record
    const { data: tx, error: txError } = await supabase
      .from("payment_transactions")
      .select("*, subscription_plans(*)")
      .eq("reference", reference)
      .maybeSingle();

    if (txError || !tx) {
      return NextResponse.json(
        { ok: false, error: "Transaction not found." },
        { status: 404 }
      );
    }

    const txMetadata = (tx.metadata || {}) as Record<string, unknown>;
    const returnUrl = typeof txMetadata.return_url === "string" ? txMetadata.return_url : undefined;

    // 2. Idempotent Success: If already recorded as success, return immediately
    if (tx.status === "success") {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        reference: tx.reference,
        planId: tx.plan_id,
        status: "success",
        returnUrl,
        message: "Payment already confirmed and activated.",
      });
    }

    // 3. Bank Transfer Handling
    if (tx.provider === "bank_transfer") {
      return NextResponse.json({
        ok: true,
        isBankTransfer: true,
        status: "pending_clearance",
        reference: tx.reference,
        amountKobo: tx.amount_kobo,
        planId: tx.plan_id,
        returnUrl,
        message: "Bank transfer reference recorded. Awaiting admin clearance.",
      });
    }

    // 4. Verify with Payment Gateway (Paystack, Flutterwave, or Bachs)
    const provider = await resolveActivePaymentProvider(tx.provider);
    const verifyResult = await provider.verifyPayment(reference, tx.provider_reference);

    if (!verifyResult.ok || verifyResult.status !== "success") {
      // If payment is pending with the gateway, do not mark abandoned prematurely
      if (verifyResult.status === "pending") {
        return NextResponse.json(
          {
            ok: false,
            pending: true,
            status: "pending",
            message: "Payment is still processing by payment provider. Please wait...",
          },
          { status: 202 }
        );
      }

      // If gateway confirmed terminal failure
      if (verifyResult.status === "failed") {
        await supabase
          .from("payment_transactions")
          .update({
            status: "failed",
            metadata: { ...txMetadata, verify_error: verifyResult.error },
            updated_at: new Date().toISOString(),
          })
          .eq("id", tx.id);
      }

      return NextResponse.json(
        {
          ok: false,
          error: verifyResult.error || "Payment verification failed or was not completed.",
          details: verifyResult.error,
        },
        { status: 400 }
      );
    }

    // 5. Centrally record successful payment with anti-fraud amount & currency checks
    const recordResult = await recordSuccessfulPayment(
      tx,
      {
        providerReference: verifyResult.reference || tx.provider_reference,
        paidAt: verifyResult.paidAt,
        amountKobo: verifyResult.amountKobo,
        currency: verifyResult.currency,
        channel: verifyResult.channel,
        metadata: verifyResult.metadata,
        verifiedBy: `verify_route_${tx.provider}`,
      },
      supabase
    );

    if (!recordResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: recordResult.error || "Payment could not be confirmed.",
          fraudDetected: recordResult.fraudDetected,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      reference: tx.reference,
      planId: tx.plan_id,
      status: "success",
      returnUrl: recordResult.returnUrl || returnUrl,
      message: "Subscription activated successfully!",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "server_error", message: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
