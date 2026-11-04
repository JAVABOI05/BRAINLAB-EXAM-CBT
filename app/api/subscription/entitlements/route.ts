import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, resolveAdminRole } from "@/app/lib/supabaseServer";
import {
  ADMIN_VIP_PLAN,
  ADMIN_VIP_ENTITLEMENTS,
  type StudentEntitlementsResult,
} from "@/app/lib/subscriptionEntitlements";
import {
  getSubscriptionPlans,
  DEFAULT_FREE_ENTITLEMENTS,
  normalizePlanEntitlements,
  type SubscriptionPlan,
} from "@/app/lib/platformConfig";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleResolution(request);
}

export async function POST(request: NextRequest) {
  return handleResolution(request);
}

async function handleResolution(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const plans = await getSubscriptionPlans();
    const freePlan = plans.find((p) => p.id === "free") || {
      id: "free",
      name: "Free Learner",
      description: "Essential CBT exam preparation and basic practice.",
      price_kobo: 0,
      price_naira: 0,
      currency: "NGN",
      interval: "monthly" as const,
      features: ["1 CBT mock test per day", "Standard practice", "50 AI study hints per month"],
      entitlements: DEFAULT_FREE_ENTITLEMENTS,
      is_active: true,
      display_order: 1,
    };

    // 1. Resolve Target User ID
    let targetUserId: string | null = null;
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get("userId")?.trim();

    if (queryUserId) {
      targetUserId = queryUserId;
    } else {
      // Try resolving from Authorization header
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { data: authData } = await supabase.auth.getUser(token);
        if (authData?.user?.id) {
          targetUserId = authData.user.id;
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json({
        userId: null,
        planId: freePlan.id,
        planName: freePlan.name,
        plan: freePlan,
        entitlements: normalizePlanEntitlements(freePlan.entitlements, true),
        isSubscribed: false,
        expiresAt: null,
      });
    }

    // 2. Administrator VIP Check
    const adminRole = await resolveAdminRole(targetUserId);
    if (adminRole) {
      return NextResponse.json({
        userId: targetUserId,
        planId: ADMIN_VIP_PLAN.id,
        planName: ADMIN_VIP_PLAN.name,
        plan: ADMIN_VIP_PLAN,
        entitlements: ADMIN_VIP_ENTITLEMENTS,
        isSubscribed: true,
        expiresAt: null,
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // 3. Query user_subscriptions & learning_entitlements in parallel using service client
    const [subRes, entRes, txRes] = await Promise.all([
      supabase
        .from("user_subscriptions")
        .select("plan_id, status, current_period_start, current_period_end")
        .eq("user_id", targetUserId)
        .eq("status", "active")
        .gt("current_period_end", nowIso)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("learning_entitlements")
        .select("entitlement_type, membership_type, max_questions, status, starts_at, expires_at, permanent, revoked_at")
        .eq("user_id", targetUserId)
        .eq("status", "active")
        .is("revoked_at", null)
        .lte("starts_at", nowIso),
      // Check recent successful payment transaction (past 35 days) for automatic self-repair
      supabase
        .from("payment_transactions")
        .select("id, reference, plan_id, status, amount_kobo, currency, provider, paid_at, created_at")
        .eq("user_id", targetUserId)
        .eq("status", "success")
        .gte("created_at", new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    let activeSub = subRes.data;
    const activeEnts = (entRes.data || []).filter((e) => {
      const expiresAt = e.expires_at ? new Date(e.expires_at).getTime() : Number.POSITIVE_INFINITY;
      return e.permanent || expiresAt > Date.now();
    });

    // =========================================================================
    // 4. AUTOMATIC SELF-HEALING & REPAIR FOR PAID USERS
    // If user has a successful payment in payment_transactions but lacks an active
    // subscription row or active entitlement, ACTIVATE IT NOW ON-THE-FLY!
    // =========================================================================
    const recentTx = txRes.data;
    if (recentTx && recentTx.plan_id && ["premium", "plus", "pro"].includes(recentTx.plan_id.toLowerCase())) {
      const txPlanId = recentTx.plan_id.toLowerCase();
      const txPaidAt = recentTx.paid_at || recentTx.created_at || nowIso;
      const txExpiry = new Date(new Date(txPaidAt).getTime() + 30 * 24 * 60 * 60 * 1000);

      if (txExpiry.getTime() > Date.now()) {
        const isSubMissing = !activeSub || new Date(activeSub.current_period_end).getTime() <= Date.now();
        const isEntMissing = !activeEnts.some((e) => e.entitlement_type === "membership");

        if (isSubMissing || isEntMissing) {
          const maxQuestions = txPlanId === "pro" ? 500 : txPlanId === "plus" ? 400 : 250;

          // Upsert user_subscriptions
          await supabase.from("user_subscriptions").upsert(
            {
              user_id: targetUserId,
              plan_id: txPlanId,
              status: "active",
              current_period_start: txPaidAt,
              current_period_end: txExpiry.toISOString(),
              payment_provider: recentTx.provider || "payment_gateway",
              price_paid_kobo: recentTx.amount_kobo || 0,
              currency: recentTx.currency || "NGN",
              provider_subscription_id: recentTx.reference,
              updated_at: nowIso,
            },
            { onConflict: "user_id" }
          );

          // Upsert learning_entitlements
          await supabase
            .from("learning_entitlements")
            .update({ status: "revoked", revoked_at: nowIso })
            .eq("user_id", targetUserId)
            .eq("entitlement_type", "membership")
            .eq("status", "active");

          await supabase.from("learning_entitlements").insert({
            user_id: targetUserId,
            entitlement_type: "membership",
            membership_type: txPlanId,
            max_questions: maxQuestions,
            status: "active",
            permanent: false,
            starts_at: txPaidAt,
            expires_at: txExpiry.toISOString(),
          });

          activeSub = {
            plan_id: txPlanId,
            status: "active",
            current_period_start: txPaidAt,
            current_period_end: txExpiry.toISOString(),
          };
          activeEnts.push({
            entitlement_type: "membership",
            membership_type: txPlanId,
            max_questions: maxQuestions,
            status: "active",
            permanent: false,
            starts_at: txPaidAt,
            expires_at: txExpiry.toISOString(),
            revoked_at: null,
          });
        }
      }
    }

    // 5. Resolve Highest Effective Tier
    const tierRank = (t?: string | null): number => {
      const val = (t || "").toLowerCase();
      if (val === "pro") return 3;
      if (val === "plus") return 2;
      if (val === "premium") return 1;
      return 0;
    };

    const activeMembership = activeEnts.find(
      (e) => e.entitlement_type === "membership" && tierRank(e.membership_type) > 0
    );

    const subTier = activeSub?.plan_id?.toLowerCase() || null;
    const entTier = activeMembership?.membership_type?.toLowerCase() || null;

    let effectivePlanId = "free";
    let effectiveExpiry: string | null = null;

    if (tierRank(entTier) >= tierRank(subTier) && tierRank(entTier) > 0) {
      effectivePlanId = entTier!;
      effectiveExpiry = activeMembership!.permanent ? null : activeMembership!.expires_at;
    } else if (tierRank(subTier) > 0) {
      effectivePlanId = subTier!;
      effectiveExpiry = activeSub!.current_period_end;
    }

    if (effectivePlanId === "free") {
      return NextResponse.json({
        userId: targetUserId,
        planId: freePlan.id,
        planName: freePlan.name,
        plan: freePlan,
        entitlements: normalizePlanEntitlements(freePlan.entitlements, true),
        isSubscribed: false,
        expiresAt: activeSub?.current_period_end || null,
      });
    }

    const matchedPlan = plans.find((p) => p.id === effectivePlanId) || {
      id: effectivePlanId,
      name:
        effectivePlanId === "pro"
          ? "BrainLab Pro"
          : effectivePlanId === "plus"
          ? "BrainLab Plus"
          : "Premium Study",
      description: "Full active subscription with unlocked CBT corrections, AI Tutor, and masterclasses.",
      price_kobo: effectivePlanId === "pro" ? 500000 : effectivePlanId === "plus" ? 300000 : 150000,
      price_naira: effectivePlanId === "pro" ? 5000 : effectivePlanId === "plus" ? 3000 : 1500,
      currency: "NGN",
      interval: "monthly" as const,
      features: [
        "Unlimited CBT Exam Simulator Attempts",
        "Full Step-by-Step Question Explanations & Corrections",
        "AI Tutor Explanations & Diagnostic Drills",
        "Live Academic Classrooms & Stages",
        "Competition Arena Access",
      ],
      entitlements: {
        cbt_access: true,
        cbt_unlimited: true,
        cbt_daily_limit: 999999,
        cbt_corrections: true,
        offline_saving: true,
        ai_tutor_enabled: true,
        ai_monthly_quota: effectivePlanId === "pro" ? 999999 : effectivePlanId === "plus" ? 1500 : 500,
        ai_voice_tutor: effectivePlanId === "pro",
        classroom_access: true,
        competitions_included: true,
        advanced_analytics: true,
        certificates_issued: effectivePlanId === "pro" || effectivePlanId === "plus",
        calculator_type: "scientific",
        vip_support: effectivePlanId === "pro",
      },
      is_active: true,
      display_order: effectivePlanId === "pro" ? 4 : effectivePlanId === "plus" ? 3 : 2,
    };

    const resolvedResult: StudentEntitlementsResult = {
      userId: targetUserId,
      planId: matchedPlan.id,
      planName: matchedPlan.name,
      plan: matchedPlan,
      entitlements: normalizePlanEntitlements(matchedPlan.entitlements, false),
      isSubscribed: true,
      expiresAt: effectiveExpiry,
    };

    return NextResponse.json(resolvedResult);
  } catch (err) {
    console.error("[api/subscription/entitlements] Error resolving entitlements:", err);
    return NextResponse.json(
      { error: "Failed to resolve authoritative entitlements" },
      { status: 500 }
    );
  }
}
