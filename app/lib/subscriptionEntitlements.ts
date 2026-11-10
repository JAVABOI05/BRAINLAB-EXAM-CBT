import { supabase } from "./supabase";
import {
  getSubscriptionPlans,
  DEFAULT_FREE_ENTITLEMENTS,
  normalizePlanEntitlements,
  type PlanEntitlements,
  type SubscriptionPlan,
} from "./platformConfig";
import {
  resolveStudentEntitlements,
  mapResolvedToPlanEntitlements,
  FEATURE_KEYS,
  ADMIN_VIP_ENTITLEMENTS as RESOLVER_ADMIN_VIP_ENTITLEMENTS,
} from "./centralEntitlementsResolver";

export interface StudentEntitlementsResult {
  userId: string | null;
  planId: string;
  planName: string;
  plan: SubscriptionPlan;
  entitlements: PlanEntitlements;
  isSubscribed: boolean;
  expiresAt: string | null;
}

export const ADMIN_VIP_ENTITLEMENTS: PlanEntitlements = RESOLVER_ADMIN_VIP_ENTITLEMENTS;

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
  let authUser: { id: string; email?: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user) authUser = { id: data.user.id, email: data.user.email };
  } catch {
    // Treat failed authentication as unauthenticated.
  }

  const targetId = userId || authUser?.id;
  if (!targetId) return false;

  if (typeof window === "undefined") {
    try {
      const { resolveAdminRole } = await import("./supabaseServer");
      return Boolean(await resolveAdminRole(
        targetId,
        undefined,
        authUser?.id === targetId ? authUser.email : undefined
      ));
    } catch {
      return false;
    }
  }

  // The browser may only resolve the currently authenticated account.
  if (!authUser || authUser.id !== targetId) return false;

  try {
    const { data: rpcRole } = await supabase.rpc("get_admin_role");
    if (typeof rpcRole === "string" && rpcRole.trim()) return true;
  } catch {
    // Continue to database-backed role checks.
  }

  try {
    const { data } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", targetId)
      .maybeSingle();
    if (typeof data?.role === "string" && data.role.trim()) return true;
  } catch {
    // Continue to the consolidated admin table.
  }

  try {
    const { data } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", targetId)
      .maybeSingle();
    return Boolean(typeof data?.role === "string" && data.role.trim());
  } catch {
    return false;
  }
}

export async function isCurrentUserSuperAdmin(userId?: string): Promise<boolean> {
  let authUser: { id: string; email?: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user) authUser = { id: data.user.id, email: data.user.email };
  } catch {
    // Treat failed authentication as unauthenticated.
  }

  const targetId = userId || authUser?.id;
  if (!targetId) return false;

  if (typeof window === "undefined") {
    try {
      const { resolveAdminRole } = await import("./supabaseServer");
      return (await resolveAdminRole(
        targetId,
        undefined,
        authUser?.id === targetId ? authUser.email : undefined
      ))?.toLowerCase() === "super_admin";
    } catch {
      return false;
    }
  }

  if (!authUser || authUser.id !== targetId) return false;

  try {
    const { data: rpcRole } = await supabase.rpc("get_admin_role");
    if (typeof rpcRole === "string" && rpcRole.trim().toLowerCase() === "super_admin") {
      return true;
    }
  } catch {
    // Continue to database-backed role checks.
  }

  try {
    const { data } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", targetId)
      .maybeSingle();
    if (String(data?.role || "").toLowerCase() === "super_admin") return true;
  } catch {
    // Continue to the consolidated admin table.
  }

  try {
    const { data } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", targetId)
      .maybeSingle();
    return String(data?.role || "").toLowerCase() === "super_admin";
  } catch {
    return false;
  }
}

/**
 * Resolves the student's active subscription tier and authoritative entitlements
 * via the central authoritative resolver.
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
    // Central Authoritative Resolver delegates to database RPC or fallback
    const resolved = await resolveStudentEntitlements(userId);
    const mappedEntitlements = mapResolvedToPlanEntitlements(resolved);

    if (resolved.tier_key === "apex" && resolved.tier_name.includes("Universal VIP")) {
      return {
        userId: resolved.user_id,
        planId: ADMIN_VIP_PLAN.id,
        planName: ADMIN_VIP_PLAN.name,
        plan: ADMIN_VIP_PLAN,
        entitlements: ADMIN_VIP_ENTITLEMENTS,
        isSubscribed: true,
        expiresAt: null,
      };
    }

    const matchedPlan = plans.find((p) => p.id.toLowerCase() === resolved.tier_key.toLowerCase());
    const finalPlan = matchedPlan || {
      ...freePlan,
      id: resolved.tier_key,
      name: resolved.tier_name,
      entitlements: mappedEntitlements,
    };

    return {
      userId: resolved.user_id,
      planId: resolved.tier_key,
      planName: resolved.tier_name,
      plan: finalPlan,
      entitlements: mappedEntitlements,
      isSubscribed: resolved.is_subscribed,
      expiresAt: resolved.expires_at,
    };
  } catch (err) {
    console.error("[subscriptionEntitlements] Error in central resolver delegator:", err);
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
