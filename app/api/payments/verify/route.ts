import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { getPaymentProvider, resolveActivePaymentProvider } from "../../../lib/payments";

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
      .single();

    if (txError || !tx) {
      return NextResponse.json(
        { ok: false, error: "Transaction not found." },
        { status: 404 }
      );
    }

    // 2. If already processed, return idempotent success
    if (tx.status === "success") {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        reference: tx.reference,
        planId: tx.plan_id,
        status: "success",
      });
    }

    // 3. Verify with Payment Gateway
    const provider = await resolveActivePaymentProvider(tx.provider);
    const verifyResult = await provider.verifyPayment(reference, tx.provider_reference);

    if (!verifyResult.ok || verifyResult.status !== "success") {
      await supabase
        .from("payment_transactions")
        .update({
          status: verifyResult.status === "failed" ? "failed" : "abandoned",
          metadata: { ...tx.metadata, verify_error: verifyResult.error },
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      return NextResponse.json(
        {
          ok: false,
          error: "Payment verification failed or payment was not completed.",
          details: verifyResult.error,
        },
        { status: 400 }
      );
    }

    // 4. Mark transaction as successful
    const paidAt = verifyResult.paidAt || new Date().toISOString();
    await supabase
      .from("payment_transactions")
      .update({
        status: "success",
        paid_at: paidAt,
        provider_reference: verifyResult.reference || tx.provider_reference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tx.id);

    // 5. Handle Coupon Redemption if applied
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

      // Increment campaign counter
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

    // 6. Activate Learner Subscription in user_subscriptions
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
          payment_provider: tx.provider,
          price_paid_kobo: tx.amount_kobo,
          currency: tx.currency,
          provider_subscription_id: tx.reference,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      // 7. Immutable audit log entry
      await supabase.from("configuration_audit_logs").insert({
        admin_email: tx.customer_email,
        entity_type: "plan",
        entity_id: tx.plan_id,
        action: "updated",
        new_value: {
          event: "subscription_activated",
          transaction_id: tx.id,
          reference: tx.reference,
          amount_kobo: tx.amount_kobo,
          paid_at: paidAt,
        },
        change_reason: `Learner subscription activation via ${tx.provider} (${reference})`,
      });
    }

    return NextResponse.json({
      ok: true,
      reference: tx.reference,
      planId: tx.plan_id,
      status: "success",
      message: "Subscription activated successfully!",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "server_error", message: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
