/**
 * =============================================================================
 * BrainLab Academy — Authoritative Central Entitlement Engine
 * =============================================================================
 * Single authoritative server and client resolver for student entitlements,
 * feature catalogue gates, atomic quota consumption, and access code redemption.
 *
 * Implements Prompt 2A Rules B1-K and Approved Owner Decisions D1-D7:
 * - D1: Preserves verified legacy subscription expiry.
 * - D2: Implicit Free fallback when no active paid or programme tier exists.
 * - D3: Boolean feature merge: Union of active tier and individual grants, with revocations/suspensions.
 * - D4: Feature-level merge: Highest active level wins.
 * - D5: Quota merge: Tier limit plus separately tracked grant allowance.
 * - D6: Migrated student communication flagged for post-verification dispatch.
 * - D7: Production safety: Disposable database testing only; manual runbook for production.
 */

import {
  type PlanEntitlements,
  type SubscriptionPlan,
  DEFAULT_FREE_ENTITLEMENTS,
  normalizePlanEntitlements,
  getSubscriptionPlans,
} from "./platformConfig";

export type FeatureType = "boolean" | "quota" | "level";
export type QuotaPeriod = "daily" | "monthly" | "total";

export interface ResolvedFeature {
  enabled: boolean;
  type: FeatureType;
  level?: string | null;
  quota_limit: number;
  base_quota?: number;
  grant_quota?: number;
  used: number;
  remaining: number;
  period?: QuotaPeriod;
}

export interface ResolvedEntitlements {
  user_id: string | null;
  tier_key: string;
  tier_name: string;
  rank: number;
  is_subscribed: boolean;
  expires_at: string | null;
  features: Record<string, ResolvedFeature>;
}

export interface QuotaConsumptionResult {
  ok: boolean;
  consumed?: number;
  current_usage?: number;
  quota_limit?: number;
  remaining: number;
  unlimited?: boolean;
  error?: string;
  message?: string;
}

export interface AccessCodeRedemptionResult {
  ok: boolean;
  tier_key?: string;
  tier_name?: string;
  expires_at?: string | null;
  message: string;
  error?: string;
}

// Canonical feature keys matching feature_catalog
export const FEATURE_KEYS = {
  CBT_PRACTICE: "cbt.practice",
  CBT_UNLIMITED: "cbt.unlimited",
  CBT_DAILY_LIMIT: "cbt.daily_limit",
  CBT_CORRECTIONS: "cbt.corrections",
  AI_HINTS: "ai.hints",
  AI_VOICE: "ai.voice",
  CLASSROOM_LIVE: "classroom.live",
  COMPETITIONS_ARENA: "competitions.arena",
  ANALYTICS_ADVANCED: "analytics.advanced",
  CERTIFICATES_VERIFY: "certificates.verify",
  STEM_STUDIO: "stem.studio",
  CALCULATOR_TYPE: "calculator.type",
  OFFLINE_SYNC: "offline.sync",
  VIP_SUPPORT: "vip.support",
} as const;

/**
 * Universal VIP Plan for Administrators (Super Admin & Platform Admins)
 */
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
  stem_access_level: "complete",
  stem_monthly_lab_quota: 999999,
};

async function getClient() {
  if (typeof window === "undefined") {
    const { getSupabaseServerClient } = await import("./supabaseServer");
    return getSupabaseServerClient();
  }
  const { supabase } = await import("./supabase");
  return supabase;
}

/**
 * Maps database resolved features to existing PlanEntitlements interface
 * for 100% backward compatibility across all legacy components.
 */
export function mapResolvedToPlanEntitlements(resolved: ResolvedEntitlements): PlanEntitlements {
  const f = resolved.features;

  const isUnlimitedCbt = Boolean(f[FEATURE_KEYS.CBT_UNLIMITED]?.enabled);
  const dailyLimit = f[FEATURE_KEYS.CBT_DAILY_LIMIT]?.quota_limit ?? (isUnlimitedCbt ? 0 : 1);

  return {
    cbt_access: Boolean(f[FEATURE_KEYS.CBT_PRACTICE]?.enabled),
    cbt_unlimited: isUnlimitedCbt,
    cbt_daily_limit: isUnlimitedCbt ? 0 : dailyLimit,
    cbt_corrections: Boolean(f[FEATURE_KEYS.CBT_CORRECTIONS]?.enabled),
    offline_saving: Boolean(f[FEATURE_KEYS.OFFLINE_SYNC]?.enabled),
    ai_tutor_enabled: Boolean(f[FEATURE_KEYS.AI_HINTS]?.enabled),
    ai_monthly_quota: f[FEATURE_KEYS.AI_HINTS]?.quota_limit ?? 50,
    ai_voice_tutor: Boolean(f[FEATURE_KEYS.AI_VOICE]?.enabled),
    classroom_access: Boolean(f[FEATURE_KEYS.CLASSROOM_LIVE]?.enabled),
    competitions_included: Boolean(f[FEATURE_KEYS.COMPETITIONS_ARENA]?.enabled),
    advanced_analytics: Boolean(f[FEATURE_KEYS.ANALYTICS_ADVANCED]?.enabled),
    certificates_issued: Boolean(f[FEATURE_KEYS.CERTIFICATES_VERIFY]?.enabled),
    calculator_type: (f[FEATURE_KEYS.CALCULATOR_TYPE]?.level as "none" | "standard" | "scientific") || "scientific",
    vip_support: Boolean(f[FEATURE_KEYS.VIP_SUPPORT]?.enabled),
    stem_studio_access: Boolean(f[FEATURE_KEYS.STEM_STUDIO]?.enabled),
    stem_access_level: (f[FEATURE_KEYS.STEM_STUDIO]?.level as any) || "none",
    stem_monthly_lab_quota: f[FEATURE_KEYS.STEM_STUDIO]?.quota_limit ?? 0,
  };
}

/**
 * Authoritative Central Resolver:
 * Dispatches to database RPC `public.resolve_student_entitlements` or evaluates
 * server-side client with fallback.
 */
export async function resolveStudentEntitlements(userId?: string): Promise<ResolvedEntitlements> {
  let targetUserId = userId;

  try {
    const client = await getClient();

    if (!targetUserId) {
      const { data } = await client.auth.getUser();
      targetUserId = data.user?.id;
    }

    const { data, error } = await client.rpc("resolve_student_entitlements", {
      p_user_id: targetUserId || null,
    });

    if (!error && data && data.features) {
      return data as ResolvedEntitlements;
    }
  } catch (rpcErr) {
    console.warn("[centralEntitlementsResolver] RPC invocation fallback:", rpcErr);
  }

  // Client-side HTTP endpoint fallback when browser is offline or unprivileged
  if (typeof window !== "undefined") {
    try {
      const client = await getClient();
      const { data: sessionData } = await client.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const res = await fetch(`/api/subscription/entitlements${targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : ""}`, {
        method: "POST",
        headers: {
          "Cache-Control": "no-cache",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.features) {
          return json as ResolvedEntitlements;
        }
      }
    } catch {
      // Fall through to default fallback
    }
  }

  // Fallback to Implicit Free Tier (Decision D2)
  return getBaselineFreeEntitlements(targetUserId || null);
}

/**
 * Returns clean in-memory fallback for unauthenticated or offline clients.
 */
export function getBaselineFreeEntitlements(userId: string | null): ResolvedEntitlements {
  return {
    user_id: userId,
    tier_key: "free",
    tier_name: "Free Learner",
    rank: 0,
    is_subscribed: false,
    expires_at: null,
    features: {
      [FEATURE_KEYS.CBT_PRACTICE]: { enabled: true, type: "boolean", quota_limit: 0, used: 0, remaining: 0 },
      [FEATURE_KEYS.CBT_UNLIMITED]: { enabled: false, type: "boolean", quota_limit: 0, used: 0, remaining: 0 },
      [FEATURE_KEYS.CBT_DAILY_LIMIT]: { enabled: true, type: "quota", quota_limit: 1, used: 0, remaining: 1, period: "daily" },
      [FEATURE_KEYS.CBT_CORRECTIONS]: { enabled: false, type: "boolean", quota_limit: 0, used: 0, remaining: 0 },
      [FEATURE_KEYS.AI_HINTS]: { enabled: true, type: "quota", quota_limit: 50, used: 0, remaining: 50, period: "monthly" },
      [FEATURE_KEYS.AI_VOICE]: { enabled: false, type: "boolean", quota_limit: 0, used: 0, remaining: 0 },
      [FEATURE_KEYS.CLASSROOM_LIVE]: { enabled: false, type: "boolean", quota_limit: 0, used: 0, remaining: 0 },
      [FEATURE_KEYS.COMPETITIONS_ARENA]: { enabled: false, type: "boolean", quota_limit: 0, used: 0, remaining: 0 },
      [FEATURE_KEYS.ANALYTICS_ADVANCED]: { enabled: false, type: "boolean", quota_limit: 0, used: 0, remaining: 0 },
      [FEATURE_KEYS.CERTIFICATES_VERIFY]: { enabled: false, type: "boolean", quota_limit: 0, used: 0, remaining: 0 },
      [FEATURE_KEYS.STEM_STUDIO]: { enabled: false, type: "level", level: "none", quota_limit: 0, used: 0, remaining: 0 },
      [FEATURE_KEYS.CALCULATOR_TYPE]: { enabled: true, type: "level", level: "scientific", quota_limit: 0, used: 0, remaining: 0 },
      [FEATURE_KEYS.OFFLINE_SYNC]: { enabled: false, type: "boolean", quota_limit: 0, used: 0, remaining: 0 },
      [FEATURE_KEYS.VIP_SUPPORT]: { enabled: false, type: "boolean", quota_limit: 0, used: 0, remaining: 0 },
    },
  };
}

/**
 * Atomically consumes student quota with concurrency protection.
 */
export async function consumeStudentQuota(
  featureKey: string,
  amount: number = 1,
  userId?: string
): Promise<QuotaConsumptionResult> {
  const client = await getClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const { data } = await client.auth.getUser();
    targetUserId = data.user?.id;
  }

  if (!targetUserId) {
    return { ok: false, remaining: 0, error: "unauthenticated", message: "Authentication required" };
  }

  const { data, error } = await client.rpc("consume_student_quota", {
    p_user_id: targetUserId,
    p_feature_key: featureKey,
    p_amount: amount,
  });

  if (error) {
    console.error("[centralEntitlementsResolver] consume_student_quota error:", error);
    return { ok: false, remaining: 0, error: error.message };
  }

  return data as QuotaConsumptionResult;
}

/**
 * Authoritatively redeems a hashed access code or voucher.
 */
export async function redeemAccessCode(
  code: string,
  userId?: string
): Promise<AccessCodeRedemptionResult> {
  const client = await getClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const { data } = await client.auth.getUser();
    targetUserId = data.user?.id;
  }

  if (!targetUserId) {
    return { ok: false, message: "You must be signed in to redeem an access code." };
  }

  const cleanCode = code.trim().toUpperCase();
  const { data, error } = await client.rpc("redeem_hashed_access_code", {
    p_code: cleanCode,
    p_user_id: targetUserId,
  });

  if (error) {
    console.error("[centralEntitlementsResolver] redeem_hashed_access_code error:", error);
    return { ok: false, message: error.message || "Failed to redeem code" };
  }

  return data as AccessCodeRedemptionResult;
}

// -----------------------------------------------------------------------------
// Domain Feature Predicates (Direct Replacement for Ad-Hoc / Tier Checks)
// -----------------------------------------------------------------------------
export function canAccessCbtPractice(ent: ResolvedEntitlements): boolean {
  return Boolean(ent.features[FEATURE_KEYS.CBT_PRACTICE]?.enabled);
}

export function canAccessUnlimitedCbt(ent: ResolvedEntitlements): boolean {
  return Boolean(ent.features[FEATURE_KEYS.CBT_UNLIMITED]?.enabled);
}

export function canAccessCorrections(ent: ResolvedEntitlements): boolean {
  return Boolean(ent.features[FEATURE_KEYS.CBT_CORRECTIONS]?.enabled);
}

export function canAccessAiTutor(ent: ResolvedEntitlements): boolean {
  const feat = ent.features[FEATURE_KEYS.AI_HINTS];
  return Boolean(feat?.enabled && feat.remaining > 0);
}

export function canAccessVoiceTutor(ent: ResolvedEntitlements): boolean {
  return Boolean(ent.features[FEATURE_KEYS.AI_VOICE]?.enabled);
}

export function canAccessLiveClassroom(ent: ResolvedEntitlements): boolean {
  return Boolean(ent.features[FEATURE_KEYS.CLASSROOM_LIVE]?.enabled);
}

export function canAccessCompetitionArena(ent: ResolvedEntitlements): boolean {
  return Boolean(ent.features[FEATURE_KEYS.COMPETITIONS_ARENA]?.enabled);
}

export function canAccessAdvancedAnalytics(ent: ResolvedEntitlements): boolean {
  return Boolean(ent.features[FEATURE_KEYS.ANALYTICS_ADVANCED]?.enabled);
}

export function canAccessStemStudio(ent: ResolvedEntitlements): boolean {
  const feat = ent.features[FEATURE_KEYS.STEM_STUDIO];
  return Boolean(feat?.enabled && feat.level && feat.level !== "none");
}

export function getStemStudioLevel(ent: ResolvedEntitlements): string {
  return ent.features[FEATURE_KEYS.STEM_STUDIO]?.level || "none";
}

export function canAccessOfflineSync(ent: ResolvedEntitlements): boolean {
  return Boolean(ent.features[FEATURE_KEYS.OFFLINE_SYNC]?.enabled);
}
