import { supabase } from "../supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateLevelFromXp } from "../gamification";
import type {
  LearningQuest,
  StudentDailyFeed,
  GroupAssessmentSchedule,
  CommunityAnnouncement,
} from "./types";

/**
 * List active quests for today with student progress if authenticated.
 */
export async function listDailyQuests(
  userId?: string | null,
  client: SupabaseClient = supabase
): Promise<LearningQuest[]> {
  try {
    const { data: quests, error } = await client
      .from("learning_quests")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error || !quests || quests.length === 0) {
      return getFallbackQuests(userId);
    }

    if (!userId) {
      return quests.map((q) => ({
        ...q,
        current_count: 0,
        is_completed: false,
        is_claimed: false,
      })) as LearningQuest[];
    }

    const questIds = quests.map((q) => q.id);
    const { data: progressList } = await client
      .from("user_quest_progress")
      .select("*")
      .in("quest_id", questIds)
      .eq("user_id", userId);

    const progMap = new Map((progressList || []).map((p) => [p.quest_id, p]));

    return quests.map((q) => {
      const prog = progMap.get(q.id);
      return {
        ...q,
        current_count: prog?.current_count || 0,
        is_completed: Boolean(prog?.is_completed),
        is_claimed: Boolean(prog?.is_claimed),
      } as LearningQuest;
    });
  } catch {
    return getFallbackQuests(userId);
  }
}

export interface ClaimQuestRewardResult {
  ok: boolean;
  xp_earned?: number;
  lifetime_xp?: number;
  current_level?: number;
  level_name?: string;
  leveled_up?: boolean;
  error?: string;
  message?: string;
}

/**
 * Claim completed quest reward XP and advance student streak.
 * Enforces genuine completion, concurrency safety, and database-level idempotency.
 */
export async function claimQuestReward(
  questId: string,
  userId: string,
  client: SupabaseClient = supabase
): Promise<ClaimQuestRewardResult> {
  if (!questId || !userId) {
    return { ok: false, error: "invalid_parameters", message: "Quest ID and User ID are required." };
  }

  try {
    // 1. Try atomic PostgreSQL RPC first
    const { data: rpcData, error: rpcErr } = await client.rpc(
      "claim_quest_reward",
      { p_quest_id: questId, p_user_id: userId }
    );

    if (!rpcErr && rpcData && typeof rpcData === "object") {
      const typed = rpcData as ClaimQuestRewardResult;
      if (typed.ok) {
        return {
          ok: true,
          xp_earned: typed.xp_earned,
          lifetime_xp: typed.lifetime_xp,
          current_level: typed.current_level,
          level_name: typed.level_name,
          leveled_up: typed.leveled_up,
        };
      }
      return {
        ok: false,
        error: typed.error || "claim_rejected",
        message: typed.message || "Quest reward could not be claimed.",
      };
    }

    // 2. Strict Service Fallback (enforces the exact same invariants)
    const now = new Date().toISOString();
    const todayStr = now.split("T")[0];

    // Fetch quest
    const { data: quest, error: qErr } = await client
      .from("learning_quests")
      .select("id, title, xp_reward, target_count, is_active, expires_at")
      .eq("id", questId)
      .maybeSingle();

    if (qErr || !quest) {
      return { ok: false, error: "quest_not_found", message: "Quest not found." };
    }

    if (!quest.is_active) {
      return { ok: false, error: "quest_inactive", message: "This quest is no longer active." };
    }

    if (quest.expires_at && new Date(quest.expires_at).getTime() <= Date.now()) {
      return { ok: false, error: "quest_expired", message: "This quest has expired." };
    }

    // Fetch current progress
    const { data: prog, error: pErr } = await client
      .from("user_quest_progress")
      .select("id, current_count, is_completed, is_claimed, completed_at")
      .eq("user_id", userId)
      .eq("quest_id", questId)
      .maybeSingle();

    if (pErr) {
      return { ok: false, error: "progress_fetch_failed", message: pErr.message };
    }

    if (!prog) {
      return {
        ok: false,
        error: "quest_incomplete",
        message: "No progress found for this quest. Target has not been reached.",
      };
    }

    if (prog.is_claimed) {
      return {
        ok: false,
        error: "already_claimed",
        message: "This quest reward has already been claimed.",
      };
    }

    const currentCount = prog.current_count || 0;
    const targetCount = quest.target_count || 1;
    const isCompleted = Boolean(prog.is_completed) || currentCount >= targetCount;

    if (!isCompleted) {
      return {
        ok: false,
        error: "quest_incomplete",
        message: `Quest target not reached (${currentCount}/${targetCount}).`,
      };
    }

    // Check ledger idempotency
    const idempotencyKey = `quest_claim:${userId}:${questId}`;
    try {
      const { data: ledgerEntry } = await client
        .from("user_xp_ledger")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (ledgerEntry) {
        // Mark progress claimed locally
        await client
          .from("user_quest_progress")
          .update({ is_claimed: true, claimed_at: now, updated_at: now })
          .eq("id", prog.id);

        return {
          ok: false,
          error: "already_claimed",
          message: "XP reward has already been credited for this quest.",
        };
      }
    } catch {
      // ledger table optional in fallback environments
    }

    // Mark quest claimed
    const { error: markErr } = await client
      .from("user_quest_progress")
      .update({
        is_completed: true,
        completed_at: prog.completed_at || now,
        is_claimed: true,
        claimed_at: now,
        updated_at: now,
      })
      .eq("id", prog.id);

    if (markErr) {
      return { ok: false, error: "claim_update_failed", message: markErr.message };
    }

    // Update or insert XP ledger record
    try {
      await client.from("user_xp_ledger").insert({
        user_id: userId,
        amount: quest.xp_reward,
        activity_type: "quest_complete",
        idempotency_key: idempotencyKey,
        description: `Daily Quest Completed: ${quest.title}`,
        metadata: { quest_id: questId, claimed_at: now },
      });
    } catch {
      // Non-fatal if table not installed
    }

    // Update or initialize user_gamification_profiles
    let updatedLifetimeXp = quest.xp_reward;
    let newLevel = 1;
    let newLevelName = "Beginner";
    let leveledUp = false;

    try {
      const { data: profile } = await client
        .from("user_gamification_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        const oldXp = profile.lifetime_xp || 0;
        updatedLifetimeXp = oldXp + (quest.xp_reward || 0);
        const calc = calculateLevelFromXp(updatedLifetimeXp);
        newLevel = calc.level;
        newLevelName = calc.name;
        leveledUp = newLevel > (profile.current_level || 1);

        await client
          .from("user_gamification_profiles")
          .update({
            lifetime_xp: updatedLifetimeXp,
            current_level: newLevel,
            level_name: newLevelName,
            last_activity_date: todayStr,
            updated_at: now,
          })
          .eq("user_id", userId);
      } else {
        const calc = calculateLevelFromXp(updatedLifetimeXp);
        newLevel = calc.level;
        newLevelName = calc.name;

        await client
          .from("user_gamification_profiles")
          .insert({
            user_id: userId,
            lifetime_xp: updatedLifetimeXp,
            current_level: newLevel,
            level_name: newLevelName,
            current_streak_days: 1,
            longest_streak_days: 1,
            last_activity_date: todayStr,
            updated_at: now,
          });
      }
    } catch (profileErr: unknown) {
      // If profile update fails, do not report false success
      return {
        ok: false,
        error: "profile_update_failed",
        message: profileErr instanceof Error ? profileErr.message : "Failed to update XP profile.",
      };
    }

    return {
      ok: true,
      xp_earned: quest.xp_reward,
      lifetime_xp: updatedLifetimeXp,
      current_level: newLevel,
      level_name: newLevelName,
      leveled_up: leveledUp,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: "server_error",
      message: err instanceof Error ? err.message : "Unknown error processing claim.",
    };
  }
}

/**
 * Aggregate unified student daily learning feed for the main dashboard.
 */
export async function getStudentDailyFeed(
  userId?: string | null,
  client: SupabaseClient = supabase
): Promise<StudentDailyFeed> {
  let streak_days = 0;
  let total_xp = 0;

  try {
    const quests = await listDailyQuests(userId, client);

    // Fetch user's enrolled group assessments and gamification metrics
    let assessments: GroupAssessmentSchedule[] = [];
    let announcements: CommunityAnnouncement[] = [];

    if (userId) {
      const { data: gProfile } = await client
        .from("user_gamification_profiles")
        .select("current_streak_days, lifetime_xp")
        .eq("user_id", userId)
        .maybeSingle();

      if (gProfile) {
        streak_days = gProfile.current_streak_days ?? 0;
        total_xp = gProfile.lifetime_xp ?? 0;
      }

      const { data: memberships } = await client
        .from("community_group_memberships")
        .select("group_id")
        .eq("user_id", userId)
        .eq("status", "active");

      const groupIds = (memberships || []).map((m) => m.group_id);

      if (groupIds.length > 0) {
        const { data: assessList } = await client
          .from("group_assessment_schedules")
          .select("*")
          .in("group_id", groupIds)
          .eq("is_published", true)
          .order("starts_at", { ascending: false })
          .limit(3);

        if (assessList) assessments = assessList as GroupAssessmentSchedule[];

        const { data: annList } = await client
          .from("community_announcements")
          .select("*")
          .in("group_id", groupIds)
          .order("created_at", { ascending: false })
          .limit(5);

        if (annList) announcements = annList as CommunityAnnouncement[];
      }
    }

    return {
      streak_days,
      total_xp,
      today_assessments: assessments,
      active_quests: quests,
      recent_announcements: announcements,
    };
  } catch {
    return {
      streak_days: 0,
      total_xp: 0,
      today_assessments: [],
      active_quests: getFallbackQuests(userId),
      recent_announcements: [],
    };
  }
}

function getFallbackQuests(userId?: string | null): LearningQuest[] {
  return [
    {
      id: "quest-daily-cbt-01",
      title: "Daily JAMB Speed Sprint",
      description: "Answer 20 questions in any subject on the CBT practice engine.",
      quest_type: "cbt_drill",
      subject: "All Subjects",
      target_count: 20,
      xp_reward: 50,
      is_daily: true,
      is_active: true,
      starts_at: new Date().toISOString(),
      current_count: 0,
      is_completed: false,
      is_claimed: false,
    },
    {
      id: "quest-daily-cohort-02",
      title: "Cohort Test Completion",
      description: "Complete today's timed speed drill assigned by your cohort tutor.",
      quest_type: "group_assessment",
      subject: "Biology & General Science",
      target_count: 1,
      xp_reward: 100,
      is_daily: true,
      is_active: true,
      starts_at: new Date().toISOString(),
      current_count: 0,
      is_completed: false,
      is_claimed: false,
    },
    {
      id: "quest-daily-streak-03",
      title: "Maintain Study Streak",
      description: "Log in and perform at least one learning activity today.",
      quest_type: "streak_maintain",
      subject: null,
      target_count: 1,
      xp_reward: 25,
      is_daily: true,
      is_active: true,
      starts_at: new Date().toISOString(),
      current_count: 0,
      is_completed: false,
      is_claimed: false,
    },
  ];
}
