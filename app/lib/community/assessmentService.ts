import { supabase } from "../supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GroupAssessmentSchedule,
  GroupAssessmentAttempt,
  CreateAssessmentScheduleParams,
} from "./types";

/**
 * List published assessment schedules for a cohort group.
 * Includes caller eligibility and attempt count if userId is provided.
 */
export async function listCohortAssessments(
  groupId: string,
  userId?: string | null,
  client: SupabaseClient = supabase
): Promise<GroupAssessmentSchedule[]> {
  try {
    const { data: schedules, error } = await client
      .from("group_assessment_schedules")
      .select("*")
      .eq("group_id", groupId)
      .eq("is_published", true)
      .order("starts_at", { ascending: false });

    if (error || !schedules || schedules.length === 0) {
      return getFallbackAssessments(groupId);
    }

    const now = new Date().toISOString();

    if (!userId) {
      return schedules.map((s) => ({
        ...s,
        is_open: s.starts_at <= now && s.ends_at >= now,
        is_eligible: true,
      })) as GroupAssessmentSchedule[];
    }

    const scheduleIds = schedules.map((s) => s.id);
    const { data: attempts } = await client
      .from("group_assessment_attempts")
      .select("*")
      .in("assessment_id", scheduleIds)
      .eq("user_id", userId);

    const attemptsList = attempts || [];

    return schedules.map((s) => {
      const userAttempts = attemptsList.filter((a) => a.assessment_id === s.id);
      const isEligible = !s.freeze_eligible_members ||
        !s.frozen_eligible_member_ids ||
        s.frozen_eligible_member_ids.includes(userId);

      const latestAttempt = userAttempts.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] || null;

      return {
        ...s,
        user_attempts_count: userAttempts.length,
        user_latest_attempt: latestAttempt,
        is_open: s.starts_at <= now && s.ends_at >= now,
        is_eligible: isEligible,
      } as GroupAssessmentSchedule;
    });
  } catch {
    return getFallbackAssessments(groupId);
  }
}

/**
 * Schedule a new timed cohort assessment with immutable frozen snapshots.
 */
export async function createCohortAssessment(
  params: CreateAssessmentScheduleParams,
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; assessment?: GroupAssessmentSchedule; error?: string }> {
  try {
    // 1. If freezing eligible members, snapshot current active cohort member IDs
    let frozenMembers: string[] | null = null;
    if (params.freeze_eligible_members !== false) {
      const { data: members } = await client
        .from("community_group_memberships")
        .select("user_id")
        .eq("group_id", params.group_id)
        .eq("status", "active");

      if (members && members.length > 0) {
        frozenMembers = members.map((m) => m.user_id);
      }
    }

    const payload = {
      group_id: params.group_id,
      created_by: params.created_by,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      subject: params.subject.trim(),
      topics: params.topics || [],
      question_count: params.question_count || 40,
      duration_minutes: params.duration_minutes || 60,
      starts_at: params.starts_at,
      ends_at: params.ends_at,
      max_attempts: params.max_attempts || 1,
      is_published: params.is_published ?? true,
      freeze_eligible_members: params.freeze_eligible_members ?? true,
      frozen_eligible_member_ids: frozenMembers,
      frozen_question_ids: params.frozen_question_ids || null,
    };

    const { data, error } = await client
      .from("group_assessment_schedules")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message || "Failed to schedule assessment" };
    }

    return { ok: true, assessment: data as GroupAssessmentSchedule };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

/**
 * Retrieve assessment details by ID with eligibility check.
 */
export async function getAssessmentById(
  assessmentId: string,
  userId?: string | null,
  client: SupabaseClient = supabase
): Promise<GroupAssessmentSchedule | null> {
  try {
    const { data: schedule, error } = await client
      .from("group_assessment_schedules")
      .select("*")
      .eq("id", assessmentId)
      .single();

    if (error || !schedule) return null;

    const now = new Date().toISOString();
    const isEligible = !userId ||
      !schedule.freeze_eligible_members ||
      !schedule.frozen_eligible_member_ids ||
      schedule.frozen_eligible_member_ids.includes(userId);

    return {
      ...schedule,
      is_open: schedule.starts_at <= now && schedule.ends_at >= now,
      is_eligible: isEligible,
    } as GroupAssessmentSchedule;
  } catch {
    return null;
  }
}

/**
 * Record a cohort candidate's assessment attempt.
 */
export async function recordCohortAttempt(
  attemptData: {
    assessment_id: string;
    group_id: string;
    user_id: string;
    exam_session_id?: string;
    score: number;
    total_questions: number;
    percentage: number;
    time_spent_seconds: number;
    tab_switch_count?: number;
    status: "in_progress" | "completed" | "disqualified" | "expired";
    answers?: Record<string, string>;
    submitted_at?: string;
  },
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; attempt?: GroupAssessmentAttempt; error?: string }> {
  try {
    const payload = {
      assessment_id: attemptData.assessment_id,
      group_id: attemptData.group_id,
      user_id: attemptData.user_id,
      exam_session_id: attemptData.exam_session_id || null,
      score: attemptData.score,
      total_questions: attemptData.total_questions,
      percentage: attemptData.percentage,
      time_spent_seconds: attemptData.time_spent_seconds,
      tab_switch_count: attemptData.tab_switch_count || 0,
      status: attemptData.status,
      answers: attemptData.answers || {},
      submitted_at: attemptData.submitted_at || new Date().toISOString(),
    };

    const { data, error } = await client
      .from("group_assessment_attempts")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message || "Failed to record attempt" };
    }

    return { ok: true, attempt: data as GroupAssessmentAttempt };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

function getFallbackAssessments(groupId: string): GroupAssessmentSchedule[] {
  const now = Date.now();
  return [
    {
      id: `fallback-assessment-${groupId}-1`,
      group_id: groupId,
      created_by: "faculty-lead",
      title: "Weekly Timed Diagnostic Mock Sprint 01",
      description: "Comprehensive exam simulation covering core syllabus high-yield areas. Answer key and explanations locked until schedule closes.",
      subject: "Biology & General Science",
      topics: ["Cell Biology", "Ecology", "Genetics & Heredity"],
      question_count: 40,
      difficulty_distribution: { easy: 30, medium: 50, hard: 20 },
      duration_minutes: 45,
      starts_at: new Date(now - 3600000 * 2).toISOString(),
      ends_at: new Date(now + 86400000 * 2).toISOString(),
      max_attempts: 1,
      is_published: true,
      freeze_eligible_members: true,
      frozen_eligible_member_ids: null,
      frozen_question_ids: null,
      settings: {
        shuffle_options: true,
        show_corrections_after_close: true,
        require_webcam: false,
        allow_late_entry: false,
      },
      created_at: new Date(now - 3600000 * 24).toISOString(),
      updated_at: new Date(now - 3600000 * 24).toISOString(),
      user_attempts_count: 0,
      user_latest_attempt: null,
      is_open: true,
      is_eligible: true,
    },
  ];
}
