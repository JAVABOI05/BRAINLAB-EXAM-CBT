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

export const ADMIN_VIP_ENTITLEMENTS: PlanEntitlements = {
  cbt_access: true,
  cbt_unlimited: true,
  cbt_daily_limit: 999999,
  cbt_corrections: true,
  offline_saving: true,
  ai_tutor_enabled: true,
  ai_monthly_quota: 999999,
  ai_voice_tutor: true,
  classroom_access: true,
  competitions_included: true,
  advanced_analytics: true,
  certificates_issued: true,
  calculator_type: "scientific",
  vip_support: true,
};

export const ADMIN_VIP_PLAN: SubscriptionPlan = {
  id: "admin_vip",
  name: "Super Admin (Universal Access)",
  description: "Unrestricted root-level administrative access to all platform features, testing tools, and AI capabilities.",
  price_kobo: 0,
  price_naira: 0,
  currency: "NGN",
  interval: "yearly",
  features: [
    "Full Unrestricted Access to All Platform Features",
    "Unlimited CBT Exam Simulator Attempts",
    "Full Step-by-Step Question Explanations & Corrections",
    "Unlimited AI Tutor Queries & Model Selection",
    "Live Interactive Academic Classrooms & Stages",
    "Competition Arena & 1v1 Battle Host Privileges",
    "Downloadable Formula Sheets & Study Resources",
    "Advanced Analytics & Performance Telemetry",
  ],
  entitlements: ADMIN_VIP_ENTITLEMENTS,
  is_active: true,
  display_order: 0,
};

/**
 * Checks whether the current or specified user has an active administrator role.
 */
export async function isCurrentUserAdmin(userId?: string): Promise<boolean> {
  try {
    const { data: rpcRole } = await supabase.rpc("get_admin_role");
    if (typeof rpcRole === "string" && rpcRole.trim().length > 0) {
      return true;
    }
  } catch {
    // fallback to table checks
  }

  let targetId = userId;
  if (!targetId) {
    const { data: authData } = await supabase.auth.getUser();
    targetId = authData.user?.id;
  }

  if (!targetId) return false;

  try {
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", targetId)
      .maybeSingle();
    if (profile && typeof profile.role === "string" && profile.role.trim().length > 0) {
      return true;
    }
  } catch {
    // proceed
  }

  try {
    const { data: userRole } = await supabase
      .from("admin_user_roles")
      .select("role")
      .eq("user_id", targetId)
      .maybeSingle();
    if (userRole && typeof userRole.role === "string" && userRole.role.trim().length > 0) {
      return true;
    }
  } catch {
    // proceed
  }

  return false;
}

/**
 * Resolves the student's active subscription tier and authoritative entitlements
 * configured by the administrator in the database.
 *
 * NOTE: Administrators automatically receive unrestricted Universal VIP access across
 * all platform tools and are never asked to pay for subscriptions.
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

    // =========================================================================
    // ADMIN VIP BYPASS:
    // Administrators (super_admin, platform_admin, cbt_admin, etc.) NEVER pay
    // for subscriptions and always possess 100% universal access to all
    // student, CBT, AI tutor, correction, classroom, and competition features.
    // =========================================================================
    const isAdmin = await isCurrentUserAdmin(targetUserId);
    if (isAdmin) {
      return {
        userId: targetUserId,
        planId: ADMIN_VIP_PLAN.id,
        planName: ADMIN_VIP_PLAN.name,
        plan: ADMIN_VIP_PLAN,
        entitlements: ADMIN_VIP_ENTITLEMENTS,
        isSubscribed: true,
        expiresAt: null, // Lifetime / Never expires
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
