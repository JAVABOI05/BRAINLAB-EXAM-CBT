import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    // Allow service key or admin session
    const authHeader = request.headers.get("authorization");
    const isServiceKey = authHeader?.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || "never-match");

    if (!admin && !isServiceKey) {
      return NextResponse.json({ ok: false, error: "Unauthorized: Admin privileges required" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Fetch all successful payment transactions
    const { data: successfulTxs, error: txErr } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("status", "success")
      .not("user_id", "is", null);

    if (txErr) {
      return NextResponse.json({ ok: false, error: txErr.message }, { status: 500 });
    }

    let repairedCount = 0;

    for (const tx of successfulTxs || []) {
      const planId = (tx.plan_id || "premium").toLowerCase();
      if (!["premium", "plus", "pro"].includes(planId)) continue;

      const paidAt = tx.paid_at || tx.created_at || nowIso;
      const originalEnd = new Date(new Date(paidAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      const periodEnd = originalEnd.getTime() > now.getTime()
        ? originalEnd
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const maxQ = planId === "pro" ? 500 : planId === "plus" ? 400 : 250;
      const planName = planId === "pro" ? "BrainLab Pro" : planId === "plus" ? "BrainLab Plus" : "Premium Study";

      // Upsert user_subscriptions
      await supabase.from("user_subscriptions").upsert(
        {
          user_id: tx.user_id,
          plan_id: planId,
          status: "active",
          current_period_start: paidAt,
          current_period_end: periodEnd.toISOString(),
          payment_provider: tx.provider || "payment_gateway",
          price_paid_kobo: tx.amount_kobo || 0,
          currency: tx.currency || "NGN",
          provider_subscription_id: tx.reference,
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );

      // Revoke old membership and insert active
      await supabase
        .from("learning_entitlements")
        .update({ status: "revoked", revoked_at: nowIso })
        .eq("user_id", tx.user_id)
        .eq("entitlement_type", "membership")
        .eq("status", "active");

      await supabase.from("learning_entitlements").insert({
        user_id: tx.user_id,
        entitlement_type: "membership",
        membership_type: planId,
        max_questions: maxQ,
        status: "active",
        permanent: false,
        starts_at: paidAt,
        expires_at: periodEnd.toISOString(),
      });

      repairedCount++;
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully synchronized and verified ${repairedCount} subscriber entitlements for 30 days.`,
      repairedCount,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Repair failed" },
      { status: 500 }
    );
  }
}
