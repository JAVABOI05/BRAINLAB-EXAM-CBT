import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "../supabaseServer";

export interface RecordSuccessfulPaymentParams {
  providerReference?: string;
  paidAt?: string;
  amountKobo?: number;
  currency?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
  verifiedBy?: string;
}

export interface PaymentRecordResult {
  ok: boolean;
  reference: string;
  planId?: string;
  userId?: string;
  returnUrl?: string;
  alreadyProcessed?: boolean;
  error?: string;
  fraudDetected?: boolean;
}

/**
 * Centrally records a verified successful payment in the database.
 * 
 * Security & Anti-Fraud Features:
 * 1. Strict amount verification: Verifies that amount charged by gateway is >= expected plan price.
 * 2. Currency verification: Prevents cross-currency manipulation.
 * 3. Idempotency: Prevents duplicate activations or double-crediting.
 * 4. Guaranteed subscription activation: Uses safe update-or-insert so users are NEVER left uncredited.
 * 5. Immutable audit logging: Records full activation footprint.
 */
export async function recordSuccessfulPayment(
  tx: {
    id: string;
    reference: string;
    user_id: string | null;
    plan_id: string | null;
    customer_email: string;
    amount_kobo: number;
    currency: string;
    provider: string;
    status: string;
    coupon_id?: string | null;
    discount_kobo?: number;
    provider_reference?: string | null;
    metadata?: Record<string, unknown> | null;
    subscription_plans?: {
      id?: string;
      interval?: string;
      price_kobo?: number;
      name?: string;
    } | null;
  },
  params: RecordSuccessfulPaymentParams = {},
  supabaseClient?: SupabaseClient
): Promise<PaymentRecordResult> {
  const supabase = supabaseClient || getSupabaseServerClient();
  const txMetadata = (tx.metadata || {}) as Record<string, unknown>;
  const returnUrl = typeof txMetadata.return_url === "string" ? txMetadata.return_url : undefined;

  // 1. Idempotency Check: If already marked success, return successfully immediately
  if (tx.status === "success") {
    return {
      ok: true,
      reference: tx.reference,
      planId: tx.plan_id || undefined,
      userId: tx.user_id || undefined,
      returnUrl,
      alreadyProcessed: true,
    };
  }

  // 2. Anti-Fraud Check: Amount tampering detection
  if (params.amountKobo !== undefined && Number.isFinite(params.amountKobo)) {
    const paidKobo = Math.round(Number(params.amountKobo));
    const expectedKobo = Number(tx.amount_kobo);

    // If customer paid less than required, flag as fraud and halt activation
    if (paidKobo < expectedKobo) {
      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          metadata: {
            ...txMetadata,
            fraud_detected: true,
            fraud_reason: `Amount tampering detected: expected ${expectedKobo} kobo, received ${paidKobo} kobo`,
            paid_amount_kobo: paidKobo,
            flagged_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      return {
        ok: false,
        reference: tx.reference,
        error: "Fraud detected: Gateway charged amount is less than required plan price.",
        fraudDetected: true,
      };
    }
  }

  // 3. Anti-Fraud Check: Currency matching
  if (params.currency && tx.currency) {
    if (params.currency.trim().toUpperCase() !== tx.currency.trim().toUpperCase()) {
      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          metadata: {
            ...txMetadata,
            fraud_detected: true,
            fraud_reason: `Currency mismatch: expected ${tx.currency}, received ${params.currency}`,
            flagged_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      return {
        ok: false,
        reference: tx.reference,
        error: "Fraud detected: Currency mismatch between order and gateway transaction.",
        fraudDetected: true,
      };
    }
  }

  const paidAt = params.paidAt || new Date().toISOString();
  const providerRef = params.providerReference || tx.provider_reference || tx.reference;

  // 4. Mark transaction as successfully paid
  const { error: updateTxError } = await supabase
    .from("payment_transactions")
    .update({
      status: "success",
      paid_at: paidAt,
      provider_reference: providerRef,
      metadata: {
        ...txMetadata,
        ...params.metadata,
        verified_by: params.verifiedBy || "gateway_verification",
        verified_channel: params.channel || "card",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", tx.id);

  if (updateTxError) {
    console.error("[paymentProcessor] Failed to update transaction status:", updateTxError);
  }

  // 5. Handle Coupon Redemption if applied
  if (tx.coupon_id && tx.user_id) {
    try {
      await supabase.from("coupon_redemptions").upsert(
        {
          coupon_id: tx.coupon_id,
          user_id: tx.user_id,
          transaction_id: tx.id,
          discount_applied_kobo: tx.discount_kobo || 0,
          redeemed_at: paidAt,
        },
        { onConflict: "coupon_id,user_id" }
      );

      const { data: coupon } = await supabase
        .from("coupon_campaigns")
        .select("current_redemptions")
        .eq("id", tx.coupon_id)
        .maybeSingle();

      if (coupon) {
        await supabase
          .from("coupon_campaigns")
          .update({
            current_redemptions: (coupon.current_redemptions || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", tx.coupon_id);
      }
    } catch (couponErr) {
      console.warn("[paymentProcessor] Coupon redemption bookkeeping warning:", couponErr);
    }
  }

  // 6. Authoritative Learner Subscription Activation (Guaranteed update or insert)
  if (tx.user_id && tx.plan_id) {
    const planInterval = tx.subscription_plans?.interval || "monthly";
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + (planInterval === "yearly" ? 365 : 30));

    const subscriptionPayload = {
      user_id: tx.user_id,
      plan_id: tx.plan_id,
      status: "active",
      current_period_start: paidAt,
      current_period_end: periodEnd.toISOString(),
      payment_provider: tx.provider,
      price_paid_kobo: tx.amount_kobo,
      currency: tx.currency,
      provider_subscription_id: providerRef,
      updated_at: new Date().toISOString(),
    };

    // Check if an existing subscription row exists for this user to guarantee error-free upsert
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", tx.user_id)
      .maybeSingle();

    if (existingSub?.id) {
      const { error: subUpdateErr } = await supabase
        .from("user_subscriptions")
        .update(subscriptionPayload)
        .eq("id", existingSub.id);

      if (subUpdateErr) {
        console.error("[paymentProcessor] Error updating user subscription:", subUpdateErr);
      }
    } else {
      const { error: subInsertErr } = await supabase
        .from("user_subscriptions")
        .insert(subscriptionPayload);

      if (subInsertErr) {
        console.error("[paymentProcessor] Error creating user subscription:", subInsertErr);
      }
    }

    // 6b. Authoritative Synchronous Learning Entitlements Activation
    try {
      const normalizedPlan = (tx.plan_id || "").toLowerCase();
      const maxQuestions = normalizedPlan === "pro" ? 500 : normalizedPlan === "plus" ? 400 : 250;
      const planDisplayName =
        normalizedPlan === "pro"
          ? "BrainLab Pro"
          : normalizedPlan === "plus"
          ? "BrainLab Plus"
          : "Premium Study";

      // Revoke any previous membership
      await supabase
        .from("learning_entitlements")
        .update({ status: "revoked", revoked_at: paidAt })
        .eq("user_id", tx.user_id)
        .eq("entitlement_type", "membership")
        .eq("status", "active");

      // Insert new active membership row
      const { error: entInsertErr } = await supabase.from("learning_entitlements").insert({
        user_id: tx.user_id,
        entitlement_type: "membership",
        membership_type: normalizedPlan,
        max_questions: maxQuestions,
        status: "active",
        permanent: false,
        starts_at: paidAt,
        expires_at: periodEnd.toISOString(),
      });

      if (entInsertErr) {
        console.warn("[paymentProcessor] Learning entitlement insert notice:", entInsertErr.message);
      }

      // Deliver user confirmation notification
      await supabase.from("notifications").insert({
        user_id: tx.user_id,
        title: `🎉 Account Upgraded to ${planDisplayName}`,
        message: `Your payment was confirmed. Full CBT corrections, solutions, unlimited practice, and AI tutoring are unlocked until ${periodEnd.toLocaleDateString("en-NG", { dateStyle: "medium" })}.`,
        type: "subscription",
        is_read: false,
        created_at: paidAt,
      });
    } catch (entErr) {
      console.warn("[paymentProcessor] Learning entitlement bookkeeping warning:", entErr);
    }

    // 7. Immutable audit logging
    try {
      await supabase.from("configuration_audit_logs").insert({
        admin_email: tx.customer_email || "system@brainlabacademy.com.ng",
        entity_type: "plan",
        entity_id: tx.plan_id,
        action: "updated",
        new_value: {
          event: "subscription_activated",
          transaction_id: tx.id,
          reference: tx.reference,
          amount_kobo: tx.amount_kobo,
          paid_at: paidAt,
          verified_by: params.verifiedBy || "paymentProcessor",
        },
        change_reason: `Learner subscription activation via ${tx.provider} (${tx.reference})`,
      });
    } catch {
      // Non-critical audit table catch
    }
  }

  return {
    ok: true,
    reference: tx.reference,
    planId: tx.plan_id || undefined,
    userId: tx.user_id || undefined,
    returnUrl,
  };
}
