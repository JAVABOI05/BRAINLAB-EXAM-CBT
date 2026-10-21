import { supabase } from "./supabase";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: "academic" | "consistency" | "community" | "membership";
  rarity: "common" | "rare" | "epic" | "legendary";
  icon: string;
  visual_style: {
    color?: string;
    glow?: boolean;
    sparkle?: boolean;
    flame?: boolean;
    border?: boolean;
  };
  award_type: "permanent" | "temporary_ranking" | "entitlement";
  is_active: boolean;
  display_order: number;
}

export interface UserBadgeAward {
  badge_id: string;
  name: string;
  description: string;
  category: "academic" | "consistency" | "community" | "membership";
  rarity: "common" | "rare" | "epic" | "legendary";
  icon: string;
  visual_style: {
    color?: string;
    glow?: boolean;
    sparkle?: boolean;
    flame?: boolean;
    border?: boolean;
  };
  award_type: "permanent" | "temporary_ranking" | "entitlement";
  is_featured: boolean;
  awarded_at: string;
}

export interface GamificationLevel {
  level: number;
  name: string;
  min_xp: number;
  badge_reward_id?: string | null;
}

export interface UserGamificationProfile {
  user_id: string;
  lifetime_xp: number;
  current_level: number;
  level_name: string;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date?: string | null;
  quizzes_completed_count: number;
  perfect_scores_count: number;
  competitions_won_count: number;
  updated_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  score: number;
  current_level: number;
  level_name: string;
  streak_days: number;
  is_caller: boolean;
}

export interface GamificationReward {
  id: string;
  title: string;
  description: string | null;
  reward_type: "avatar_frame" | "coupon_discount" | "certificate" | "exclusive_challenge";
  cost_xp: number;
  min_level: number;
  quantity_available?: number | null;
  redemptions_count: number;
  is_active: boolean;
  payload?: Record<string, unknown>;
}

export interface RewardClaim {
  id: string;
  user_id: string;
  reward_id: string;
  claimed_at: string;
  claim_data?: Record<string, unknown>;
  reward?: GamificationReward;
}

export interface XpLedgerItem {
  id: string;
  user_id: string;
  amount: number;
  activity_type: string;
  idempotency_key: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * Fetch all active badges awarded to a specific user (featured first).
 */
export async function getUserBadges(userId: string): Promise<UserBadgeAward[]> {
  try {
    const { data, error } = await supabase.rpc("get_user_badges", {
      p_user_id: userId,
    });
    if (error || !data) return [];
    return (data as { ok: boolean; badges: UserBadgeAward[] }).badges || [];
  } catch {
    return [];
  }
}

/**
 * Fetch a user's full gamification stats (XP, level, streaks, counts).
 */
export async function getUserGamificationProfile(
  userId: string
): Promise<UserGamificationProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_gamification_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as UserGamificationProfile;
  } catch {
    return null;
  }
}

/**
 * Fetch all gamification levels for XP progression mapping.
 */
export async function getGamificationLevels(): Promise<GamificationLevel[]> {
  try {
    const { data, error } = await supabase
      .from("gamification_levels")
      .select("*")
      .order("level", { ascending: true });

    if (error || !data) return [];
    return data as GamificationLevel[];
  } catch {
    return [];
  }
}

/**
 * Fetch competitive leaderboards across periods.
 */
export async function getGamificationLeaderboard(
  period: "all_time" | "monthly" | "weekly" = "all_time",
  limit = 50
): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase.rpc("get_gamification_leaderboard", {
      p_period: period,
      p_limit: limit,
    });
    if (error || !data) return [];
    return (data as { ok: boolean; leaderboard: LeaderboardEntry[] }).leaderboard || [];
  } catch {
    return [];
  }
}

/**
 * Substantive activity logger: updates streaks, calculates XP, awards badges.
 */
export async function recordLearningActivity(
  activityType: "lesson_complete" | "quiz_complete" | "topic_mcq" | "competition",
  referenceId: string,
  scorePercent?: number
): Promise<{ ok: boolean; streak_days?: number; xp_awarded?: number; new_badges?: string[]; error?: string }> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return { ok: false, error: "not_signed_in" };
    }

    const { data, error } = await supabase.rpc("record_learning_activity", {
      p_user_id: auth.user.id,
      p_activity_type: activityType,
      p_reference_id: referenceId,
      p_score_percent: scorePercent ?? null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return data as { ok: boolean; streak_days?: number; xp_awarded?: number; new_badges?: string[] };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

/**
 * Fetch available catalog rewards.
 */
export async function getGamificationRewards(): Promise<GamificationReward[]> {
  try {
    const { data, error } = await supabase
      .from("gamification_rewards")
      .select("*")
      .eq("is_active", true)
      .order("cost_xp", { ascending: true });

    if (error || !data) return [];
    return data as GamificationReward[];
  } catch {
    return [];
  }
}

/**
 * Fetch user's claimed rewards.
 */
export async function getUserRewardClaims(userId: string): Promise<RewardClaim[]> {
  try {
    const { data, error } = await supabase
      .from("user_reward_claims")
      .select("*, reward:gamification_rewards(*)")
      .eq("user_id", userId)
      .order("claimed_at", { ascending: false });

    if (error || !data) return [];
    return data as unknown as RewardClaim[];
  } catch {
    return [];
  }
}

/**
 * Claim a reward with atomic XP deduction & requirement checks.
 */
export async function claimReward(rewardId: string): Promise<{ ok: boolean; message: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("claim_gamification_reward", {
      p_reward_id: rewardId,
    });

    if (error) {
      return { ok: false, message: error.message, error: error.code };
    }
    const res = data as { ok: boolean; message: string; error?: string };
    return res;
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to claim reward" };
  }
}

/**
 * Toggle featured state of a badge award on user profile.
 */
export async function toggleBadgeFeatured(badgeId: string, isFeatured: boolean): Promise<boolean> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false;

    const { error } = await supabase
      .from("user_badge_awards")
      .update({ is_featured: isFeatured })
      .eq("user_id", auth.user.id)
      .eq("badge_id", badgeId);

    return !error;
  } catch {
    return false;
  }
}
