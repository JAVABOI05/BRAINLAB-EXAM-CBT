import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference")?.trim();

    if (!reference) {
      return NextResponse.json({ error: "Transaction reference is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Query payment transaction with plan details
    const { data: tx, error: txError } = await supabase
      .from("payment_transactions")
      .select("*, subscription_plans(*)")
      .eq("reference", reference)
      .maybeSingle();

    if (txError || !tx) {
      return NextResponse.json({ error: "Receipt not found for this reference" }, { status: 404 });
    }

    // Attempt to get candidate profile details if user_id exists
    let candidateName = "";
    if (tx.user_id) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, name")
        .eq("id", tx.user_id)
        .maybeSingle();

      if (profile) {
        candidateName = profile.full_name || profile.name || "";
      }
    }

    const plan = tx.subscription_plans || {};
    const planName = plan.name || (tx.plan_id ? tx.plan_id.toUpperCase() : "BrainLab CBT Subscription");
    const planInterval = plan.interval || "monthly";

    // Format receipt response
    const receipt = {
      reference: tx.reference,
      providerReference: tx.provider_reference || "N/A",
      provider: tx.provider || "paystack",
      status: tx.status,
      customerEmail: tx.customer_email,
      candidateName: candidateName || tx.customer_email.split("@")[0],
      amountKobo: tx.amount_kobo,
      amountNgn: (tx.amount_kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 }),
      discountKobo: tx.discount_kobo || 0,
      discountNgn: ((tx.discount_kobo || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 }),
      subtotalKobo: tx.amount_kobo + (tx.discount_kobo || 0),
      subtotalNgn: ((tx.amount_kobo + (tx.discount_kobo || 0)) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 }),
      currency: tx.currency || "NGN",
      planId: tx.plan_id,
      planName,
      planInterval,
      paidAt: tx.paid_at || tx.created_at,
      createdAt: tx.created_at,
      receiptNumber: `REC-${tx.reference.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`,
      metadata: tx.metadata || {},
    };

    return NextResponse.json({ ok: true, receipt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load receipt" },
      { status: 500 }
    );
  }
}
