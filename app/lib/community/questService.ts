import { supabase } from "../supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
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

/**
 * Claim completed quest reward XP and advance student streak.
 */
export async function claimQuestReward(
  questId: string,
  userId: string,
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; xp_earned?: number; error?: string }> {
  try {
    const { data: quest, error: qErr } = await client
      .from("learning_quests")
      .select("xp_reward, target_count")
      .eq("id", questId)
      .single();

    if (qErr || !quest) {
      return { ok: false, error: "quest_not_found" };
    }

    const now = new Date().toISOString();
    const { error: upsertErr } = await client
      .from("user_quest_progress")
      .upsert(
        {
          user_id: userId,
          quest_id: questId,
          current_count: quest.target_count,
          is_completed: true,
          completed_at: now,
          is_claimed: true,
          claimed_at: now,
        },
        { onConflict: "user_id,quest_id" }
      );

    if (upsertErr) {
      return { ok: false, error: upsertErr.message };
    }

    // Increment lifetime_xp in user_gamification_profiles if profile exists
    try {
      const { data: profile } = await client
        .from("user_gamification_profiles")
        .select("lifetime_xp")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        await client
          .from("user_gamification_profiles")
          .update({
            lifetime_xp: (profile.lifetime_xp || 0) + (quest.xp_reward || 0),
            updated_at: now,
          })
          .eq("user_id", userId);
      }
    } catch {
      // Non-blocking for quest claim status
    }

    return { ok: true, xp_earned: quest.xp_reward };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
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
