import {
  DEFAULT_FREE_ENTITLEMENTS,
  getSubscriptionPlans,
  normalizePlanEntitlements,
  type PlanEntitlements,
} from "@/app/lib/platformConfig";
import { getSupabaseServerClient, resolveAdminRole } from "@/app/lib/supabaseServer";

export type StemAccessLevel = "none" | "discover" | "explore" | "practise" | "advanced" | "complete";

const ACCESS_RANK: Record<StemAccessLevel, number> = {
  none: 0,
  discover: 1,
  explore: 2,
  practise: 3,
  advanced: 4,
  complete: 5,
};

const STEM_GOVERNANCE_ROLES = new Set([
  "super_admin",
  "platform_admin",
  "content_reviewer",
  "ai_learning_admin",
  "admin",
]);

const MEMBERSHIP_RANK: Record<string, number> = {
  premium: 1,
  plus: 2,
  pro: 3,
  apex: 4,
};

export interface StemAccessContext {
  userId: string | null;
  planId: string;
  accessLevel: StemAccessLevel;
  monthlyLabQuota: number;
  isPrivileged: boolean;
  canSubmitLabs: boolean;
  entitlements: PlanEntitlements;
}

export interface StemResourceAccess {
  locked: boolean;
  requiredLevel: StemAccessLevel;
  currentLevel: StemAccessLevel;
}

function asAccessLevel(value: unknown): StemAccessLevel {
  return value === "discover" || value === "explore" || value === "practise" ||
    value === "advanced" || value === "complete" || value === "none"
    ? value
    : "none";
}

export function getStemRequiredAccessLevel(entitlementTier?: string | null): StemAccessLevel {
  if (entitlementTier === "vip") return "complete";
  if (entitlementTier === "premium") return "practise";
  return "discover";
}

export function canAccessStemResource(
  context: StemAccessContext,
  resource: { entitlement_tier?: string | null }
): boolean {
  if (context.isPrivileged) return true;
  const required = getStemRequiredAccessLevel(resource.entitlement_tier);
  return context.accessLevel !== "none" &&
    ACCESS_RANK[context.accessLevel] >= ACCESS_RANK[required];
}

export function getStemResourceAccess(
  context: StemAccessContext,
  resource: { entitlement_tier?: string | null }
): StemResourceAccess {
  return {
    locked: !canAccessStemResource(context, resource),
    requiredLevel: getStemRequiredAccessLevel(resource.entitlement_tier),
    currentLevel: context.accessLevel,
  };
}

export function getMoleculeRequiredAccessLevel(molecule: { type: string; id: string }): StemAccessLevel {
  if (molecule.type === "small_molecule") return "discover";
  if (molecule.id === "hemoglobin-sickle") return "practise";
  return "explore";
}

export function canAccessMolecule(
  context: StemAccessContext,
  molecule: { type: string; id: string }
): boolean {
  if (context.isPrivileged) return true;
  const required = getMoleculeRequiredAccessLevel(molecule);
  return context.accessLevel !== "none" && ACCESS_RANK[context.accessLevel] >= ACCESS_RANK[required];
}

/**
 * Resolves learner STEM access from server-side subscription records and the
 * administrator-configured plan entitlements. It deliberately does not trust
 * user_metadata, browser storage, or a client-supplied user ID.
 */
export async function resolveStemAccessContext(
  user: { id: string; email?: string | null } | null,
  bearerToken?: string
): Promise<StemAccessContext> {
  const plans = await getSubscriptionPlans();
  const freePlan = plans.find((plan) => plan.id === "free");
  const freeEntitlements = normalizePlanEntitlements(
    freePlan?.entitlements || DEFAULT_FREE_ENTITLEMENTS,
    true
  );

  const freeContext: StemAccessContext = {
    userId: user?.id || null,
    planId: "free",
    accessLevel: freeEntitlements.stem_studio_access
      ? asAccessLevel(freeEntitlements.stem_access_level || "discover")
      : "none",
    monthlyLabQuota: freeEntitlements.stem_monthly_lab_quota ?? 0,
    isPrivileged: false,
    canSubmitLabs: Boolean(user),
    entitlements: freeEntitlements,
  };

  if (!user?.id) return { ...freeContext, canSubmitLabs: false };

  const serviceClient = getSupabaseServerClient();
  const role = await resolveAdminRole(user.id, bearerToken, user.email || undefined);
  const { data: approvedTutor } = await serviceClient
    .from("tutor_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("profile_status", "approved")
    .maybeSingle();

  const isPrivileged = STEM_GOVERNANCE_ROLES.has((role || "").toLowerCase()) ||
    role === "teacher" || Boolean(approvedTutor);

  if (isPrivileged) {
    return {
      userId: user.id,
      planId: "admin_vip",
      accessLevel: "complete",
      monthlyLabQuota: 999999,
      isPrivileged: true,
      canSubmitLabs: true,
      entitlements: {
        ...freeEntitlements,
        stem_studio_access: true,
        stem_access_level: "complete",
        stem_monthly_lab_quota: 999999,
      },
    };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const [subscriptionResult, entitlementResult, grantResult, progResult] = await Promise.all([
    serviceClient
      .from("user_subscriptions")
      .select("plan_id, current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("current_period_end", nowIso)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceClient
      .from("learning_entitlements")
      .select("membership_type, starts_at, expires_at, permanent, revoked_at")
      .eq("user_id", user.id)
      .eq("entitlement_type", "membership")
      .eq("status", "active")
      .is("revoked_at", null)
      .lte("starts_at", nowIso),
    serviceClient
      .from("student_access_grants")
      .select("target_tier_id, status, starts_at, expires_at, access_tiers(tier_key)")
      .eq("student_id", user.id)
      .eq("status", "active")
      .is("suspended_at", null)
      .is("revoked_at", null)
      .lte("starts_at", nowIso),
    serviceClient
      .from("programme_memberships")
      .select("programme_id, membership_status, starts_at, expires_at, access_programmes(associated_tier_id, access_tiers(tier_key))")
      .eq("student_id", user.id)
      .eq("membership_status", "active")
      .lte("starts_at", nowIso),
  ]);

  if (subscriptionResult.error && entitlementResult.error) {
    throw new Error("Unable to verify your BrainLab subscription for STEM access.");
  }

  // Check valid grants & programmes
  let bestGrantTier: string | null = null;
  let highestGrantRank = 0;

  const validGrants = (grantResult.data || []).filter((g: any) => {
    const exp = g.expires_at ? new Date(g.expires_at).getTime() : Number.POSITIVE_INFINITY;
    return exp > now.getTime();
  });
  for (const g of validGrants as any[]) {
    const tKey = g.access_tiers?.tier_key;
    const rank = MEMBERSHIP_RANK[(tKey || "").toLowerCase()] || 0;
    if (rank > highestGrantRank) {
      highestGrantRank = rank;
      bestGrantTier = tKey;
    }
  }

  const validProgs = (progResult.data || []).filter((p: any) => {
    const exp = p.expires_at ? new Date(p.expires_at).getTime() : Number.POSITIVE_INFINITY;
    return exp > now.getTime();
  });
  for (const p of validProgs as any[]) {
    const tKey = p.access_programmes?.access_tiers?.tier_key;
    const rank = MEMBERSHIP_RANK[(tKey || "").toLowerCase()] || 0;
    if (rank > highestGrantRank) {
      highestGrantRank = rank;
      bestGrantTier = tKey;
    }
  }

  const activeMembership = (entitlementResult.data || [])
    .filter((entry) => entry.permanent || !entry.expires_at || new Date(entry.expires_at).getTime() > now.getTime())
    .sort((a, b) => (MEMBERSHIP_RANK[(b.membership_type || "").toLowerCase()] || 0) -
      (MEMBERSHIP_RANK[(a.membership_type || "").toLowerCase()] || 0))[0];

  const subscriptionPlanId = (subscriptionResult.data?.plan_id || "").toLowerCase();
  const membershipPlanId = (activeMembership?.membership_type || "").toLowerCase();
  const subscriptionRank = MEMBERSHIP_RANK[subscriptionPlanId] || 0;
  const membershipRank = MEMBERSHIP_RANK[membershipPlanId] || 0;

  let effectivePlanId = "free";
  if (highestGrantRank >= membershipRank && highestGrantRank >= subscriptionRank && highestGrantRank > 0) {
    effectivePlanId = bestGrantTier!;
  } else if (membershipRank >= subscriptionRank && membershipRank > 0) {
    effectivePlanId = membershipPlanId;
  } else if (subscriptionRank > 0) {
    effectivePlanId = subscriptionPlanId;
  }

  const selectedPlan = plans.find((plan) => plan.id === effectivePlanId) || freePlan;
  const entitlements = normalizePlanEntitlements(
    selectedPlan?.entitlements || DEFAULT_FREE_ENTITLEMENTS,
    effectivePlanId === "free" || !selectedPlan
  );
  const accessLevel = entitlements.stem_studio_access
    ? asAccessLevel(entitlements.stem_access_level)
    : "none";

  return {
    userId: user.id,
    planId: selectedPlan?.id || "free",
    accessLevel,
    monthlyLabQuota: Math.max(0, entitlements.stem_monthly_lab_quota || 0),
    isPrivileged: false,
    canSubmitLabs: accessLevel !== "none",
    entitlements,
  };
}
