import { supabase } from "./supabase";
import {
  getSubscriptionPlans,
  DEFAULT_FREE_ENTITLEMENTS,
  normalizePlanEntitlements,
  type PlanEntitlements,
  type SubscriptionPlan,
} from "./platformConfig";

export interface StudentEntitlementsResult {
  userId: string | null;
  planId: string;
  planName: string;
  plan: SubscriptionPlan;
  entitlements: PlanEntitlements;
  isSubscribed: boolean;
  expiresAt: string | null;
}

/**
 * Resolves the student's active subscription tier and authoritative entitlements
 * configured by the administrator in the database.
 */
export async function getStudentSubscriptionAndEntitlements(
  userId?: string
): Promise<StudentEntitlementsResult> {
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

  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: authData } = await supabase.auth.getUser();
      targetUserId = authData.user?.id;
    }

    if (!targetUserId) {
      return {
        userId: null,
        planId: freePlan.id,
        planName: freePlan.name,
        plan: freePlan,
        entitlements: normalizePlanEntitlements(freePlan.entitlements, true),
        isSubscribed: false,
        expiresAt: null,
      };
    }

    // Check active subscription
    const { data: subData, error: subError } = await supabase
      .from("user_subscriptions")
      .select("plan_id, status, current_period_end")
      .eq("user_id", targetUserId)
      .eq("status", "active")
      .maybeSingle();

    if (subError || !subData) {
      return {
        userId: targetUserId,
        planId: freePlan.id,
        planName: freePlan.name,
        plan: freePlan,
        entitlements: normalizePlanEntitlements(freePlan.entitlements, true),
        isSubscribed: false,
        expiresAt: null,
      };
    }

    // Check expiration
    if (subData.current_period_end) {
      const expiry = new Date(subData.current_period_end);
      if (expiry.getTime() < Date.now()) {
        return {
          userId: targetUserId,
          planId: freePlan.id,
          planName: freePlan.name,
          plan: freePlan,
          entitlements: normalizePlanEntitlements(freePlan.entitlements, true),
          isSubscribed: false,
          expiresAt: subData.current_period_end,
        };
      }
    }

    const matchedPlan = plans.find((p) => p.id === subData.plan_id);
    const resolvedPlan = matchedPlan || freePlan;

    return {
      userId: targetUserId,
      planId: resolvedPlan.id,
      planName: resolvedPlan.name,
      plan: resolvedPlan,
      entitlements: normalizePlanEntitlements(resolvedPlan.entitlements, resolvedPlan.id === "free"),
      isSubscribed: true,
      expiresAt: subData.current_period_end || null,
    };
  } catch (err) {
    console.error("[subscriptionEntitlements] Error resolving student tier:", err);
    return {
      userId: null,
      planId: freePlan.id,
      planName: freePlan.name,
      plan: freePlan,
      entitlements: normalizePlanEntitlements(freePlan.entitlements, true),
      isSubscribed: false,
      expiresAt: null,
    };
  }
}

/**
 * Helper predicates to inspect entitlements cleanly
 */
export function canAccessClassroom(entitlements: PlanEntitlements): boolean {
  return Boolean(entitlements.classroom_access);
}

export function canAccessCompetitions(entitlements: PlanEntitlements): boolean {
  return Boolean(entitlements.competitions_included);
}

export function canAccessCorrections(entitlements: PlanEntitlements): boolean {
  return Boolean(entitlements.cbt_corrections);
}

export function canAccessAiTutor(entitlements: PlanEntitlements): boolean {
  return Boolean(entitlements.ai_tutor_enabled && entitlements.ai_monthly_quota > 0);
}

export function getCbtDailyQuota(entitlements: PlanEntitlements): {
  isUnlimited: boolean;
  dailyLimit: number;
} {
  return {
    isUnlimited: Boolean(entitlements.cbt_unlimited),
    dailyLimit: entitlements.cbt_unlimited ? 0 : Math.max(1, entitlements.cbt_daily_limit || 1),
  };
}
