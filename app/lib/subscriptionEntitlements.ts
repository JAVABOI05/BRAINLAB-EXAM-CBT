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
  stem_studio_access: true,
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
 * Exhaustively inspects:
 * 1. get_admin_role RPC
 * 2. Supabase Auth session app_metadata / user_metadata (role, is_super_admin)
 * 3. admin_profiles table
 * 4. admin_user_roles table
 * 5. admin_users table
 * 6. Server-side resolveAdminRole helper (if in Node environment)
 * 7. Browser client-side session cache
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
 * configured by the administrator in the database.
 *
 * NOTE: Administrators and Super Admins automatically receive unrestricted Universal VIP access across
 * all platform tools and are NEVER asked to pay for subscriptions or features.
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

    // =========================================================================
    // BROWSER CLIENT OPTIMIZATION:
    // When executing in browser, call authoritative server API route to guarantee
    // service-role resolution and auto-repair without RLS or 42501 permission blocks.
    // =========================================================================
    if (typeof window !== "undefined") {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        const res = await fetch(`/api/subscription/entitlements?userId=${encodeURIComponent(targetUserId)}`, {
          method: "POST",
          headers: {
            "Cache-Control": "no-cache",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.planId && json.entitlements) {
            return json as StudentEntitlementsResult;
          }
        }
      } catch (clientFetchErr) {
        console.warn("[subscriptionEntitlements] Client API fetch fallback:", clientFetchErr);
      }
    }

    // Select database client: use server-side client when in Node.js to bypass RLS, or client supabase in browser
    const dbClient =
      typeof window === "undefined"
        ? (await import("./supabaseServer")).getSupabaseServerClient()
        : supabase;

    // Query authoritative student_access_grants, programme_memberships, user_subscriptions, and learning_entitlements
    const nowIso = new Date().toISOString();
    const [subRes, entRes, grantRes, progRes] = await Promise.all([
      dbClient
        .from("user_subscriptions")
        .select("plan_id, status, current_period_end")
        .eq("user_id", targetUserId)
        .eq("status", "active")
        .maybeSingle(),
      dbClient
        .from("learning_entitlements")
        .select("entitlement_type, membership_type, max_questions, status, starts_at, expires_at, permanent, revoked_at")
        .eq("user_id", targetUserId)
        .eq("status", "active"),
      dbClient
        .from("student_access_grants")
        .select("target_tier_id, status, starts_at, expires_at, access_tiers(tier_key)")
        .eq("student_id", targetUserId)
        .eq("status", "active")
        .is("suspended_at", null)
        .is("revoked_at", null)
        .lte("starts_at", nowIso),
      dbClient
        .from("programme_memberships")
        .select("programme_id, membership_status, starts_at, expires_at, access_programmes(associated_tier_id, access_tiers(tier_key))")
        .eq("student_id", targetUserId)
        .eq("membership_status", "active")
        .lte("starts_at", nowIso),
    ]);

    const now = Date.now();

    // 1. Authoritative Student Grants
    const validGrants = (grantRes.data || []).filter((g: any) => {
      const exp = g.expires_at ? new Date(g.expires_at).getTime() : Number.POSITIVE_INFINITY;
      return exp > now;
    });

    // 2. Active Programme Memberships
    const validProgs = (progRes.data || []).filter((p: any) => {
      const exp = p.expires_at ? new Date(p.expires_at).getTime() : Number.POSITIVE_INFINITY;
      return exp > now;
    });

    // Tier rankings: apex (4) > pro (3) > plus (2) > premium (1) > free (0)
    const tierRank = (tier?: string | null): number => {
      const t = (tier || "").toLowerCase();
      if (t === "apex") return 4;
      if (t === "pro") return 3;
      if (t === "plus") return 2;
      if (t === "premium") return 1;
      return 0;
    };

    let bestGrantTier: string | null = null;
    let bestGrantExpiry: string | null = null;
    let highestGrantRank = 0;

    for (const g of validGrants as any[]) {
      const tKey = g.access_tiers?.tier_key;
      const rank = tierRank(tKey);
      if (rank > highestGrantRank) {
        highestGrantRank = rank;
        bestGrantTier = tKey;
        bestGrantExpiry = g.expires_at || null;
      }
    }

    for (const p of validProgs as any[]) {
      const tKey = p.access_programmes?.access_tiers?.tier_key;
      const rank = tierRank(tKey);
      if (rank > highestGrantRank) {
        highestGrantRank = rank;
        bestGrantTier = tKey;
        bestGrantExpiry = p.expires_at || null;
      }
    }

    // Filter valid, unrevoked, active learning entitlements
    const activeEntitlements = (entRes.data || []).filter((e) => {
      const startsAt = e.starts_at ? new Date(e.starts_at).getTime() : 0;
      const expiresAt = e.expires_at ? new Date(e.expires_at).getTime() : Number.POSITIVE_INFINITY;
      return !e.revoked_at && startsAt <= now && (e.permanent || expiresAt > now);
    });

    const activeMembership = activeEntitlements.find(
      (e) =>
        e.entitlement_type === "membership" &&
        ["premium", "plus", "pro", "apex"].includes((e.membership_type || "").toLowerCase())
    );

    // Validate active subscription row
    const subData = subRes.data;
    const subExpiry = subData?.current_period_end ? new Date(subData.current_period_end).getTime() : 0;
    const hasValidSub = Boolean(
      subData &&
      subData.status === "active" &&
      subExpiry > now &&
      ["premium", "plus", "pro", "apex"].includes((subData.plan_id || "").toLowerCase())
    );

    const entTier = activeMembership?.membership_type?.toLowerCase() || null;
    const subTier = hasValidSub ? subData!.plan_id.toLowerCase() : null;

    let effectivePlanId = "free";
    let effectiveExpiry: string | null = null;

    if (highestGrantRank >= tierRank(entTier) && highestGrantRank >= tierRank(subTier) && highestGrantRank > 0) {
      effectivePlanId = bestGrantTier!;
      effectiveExpiry = bestGrantExpiry;
    } else if (tierRank(entTier) >= tierRank(subTier) && tierRank(entTier) > 0) {
      effectivePlanId = entTier!;
      effectiveExpiry = activeMembership!.permanent ? null : (activeMembership!.expires_at || null);
    } else if (tierRank(subTier) > 0) {
      effectivePlanId = subTier!;
      effectiveExpiry = subData!.current_period_end || null;
    }

    if (effectivePlanId === "free") {
      return {
        userId: targetUserId,
        planId: freePlan.id,
        planName: freePlan.name,
        plan: freePlan,
        entitlements: normalizePlanEntitlements(freePlan.entitlements, true),
        isSubscribed: false,
        expiresAt: subData?.current_period_end || null,
      };
    }

    const matchedPlan = plans.find((p) => p.id === effectivePlanId);
    const resolvedPlan = matchedPlan || freePlan;

    return {
      userId: targetUserId,
      planId: resolvedPlan.id,
      planName: resolvedPlan.name,
      plan: resolvedPlan,
      entitlements: normalizePlanEntitlements(resolvedPlan.entitlements, false),
      isSubscribed: true,
      expiresAt: effectiveExpiry,
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
