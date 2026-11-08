import { supabase } from "../supabase";

export interface StatDisplayRule {
  minThreshold: number; // Hide completely if count is below this number
  roundStep: number;
}

export const DEFAULT_QUESTION_STAT_RULE: StatDisplayRule = {
  minThreshold: 50,
  roundStep: 100,
};

export const DEFAULT_ATTEMPT_STAT_RULE: StatDisplayRule = {
  minThreshold: 50,
  roundStep: 100,
};

export const DEFAULT_SUBJECT_STAT_RULE: StatDisplayRule = {
  minThreshold: 3,
  roundStep: 1,
};

export const DEFAULT_STEM_STAT_RULE: StatDisplayRule = {
  minThreshold: 5,
  roundStep: 5,
};

export const DEFAULT_TUTOR_STAT_RULE: StatDisplayRule = {
  minThreshold: 3,
  roundStep: 1,
};

/**
 * Format a verified live statistic adhering to Rule S7:
 * - If rawCount is null, NaN, or below rule.minThreshold => returns null (graceful suppression)
 * - If rawCount < 1000 => exact formatted string
 * - If rawCount < 10,000 => rounds down to nearest 100 with "+"
 * - If rawCount >= 10,000 => rounds down to nearest 1,000 with "+"
 */
export function formatVerifiedStat(
  rawCount: number | null | undefined,
  rule: StatDisplayRule = { minThreshold: 50, roundStep: 100 }
): string | null {
  if (rawCount === null || rawCount === undefined || isNaN(rawCount) || rawCount < rule.minThreshold) {
    return null;
  }

  if (rawCount < 1000) {
    return rawCount.toLocaleString("en-NG");
  }

  if (rawCount < 10000) {
    const rounded = Math.floor(rawCount / 100) * 100;
    return `${rounded.toLocaleString("en-NG")}+`;
  }

  const rounded = Math.floor(rawCount / 1000) * 1000;
  return `${rounded.toLocaleString("en-NG")}+`;
}

export interface PlatformVerifiedStats {
  questionsCount: number | null;
  formattedQuestions: string | null;
  attemptsCount: number | null;
  formattedAttempts: string | null;
  subjectsCount: number | null;
  formattedSubjects: string | null;
  stemResourcesCount: number | null;
  formattedStemResources: string | null;
  tutorsCount: number | null;
  formattedTutors: string | null;
  asOfDate: string;
  isLive: boolean;
}

/**
 * Fetch authoritative platform statistics using aggregate-only head queries.
 * Zero rows of student data or question records are downloaded.
 */
export async function getAuthoritativePlatformStats(): Promise<PlatformVerifiedStats> {
  const asOfDate = new Date().toISOString();

  try {
    // 1. Practice questions aggregate count
    const [questionsRes, attemptsRes, subjectsRes, stemRes, tutorsRes] = await Promise.all([
      // Count questions in learning_test_questions
      supabase
        .from("learning_test_questions")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
      // Count practice attempts
      supabase
        .from("learning_practice_attempts")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      // Count active subjects
      supabase
        .from("learning_subjects")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      // Count published STEM studio resources
      supabase
        .from("stem_resources")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
      // Count verified tutors
      supabase
        .from("tutor_profiles")
        .select("*", { count: "exact", head: true })
        .eq("profile_status", "approved")
        .eq("is_published", true),
    ]);

    const questionsCount = typeof questionsRes.count === "number" ? questionsRes.count : null;
    const attemptsCount = typeof attemptsRes.count === "number" ? attemptsRes.count : null;
    const subjectsCount = typeof subjectsRes.count === "number" ? subjectsRes.count : null;
    const stemResourcesCount = typeof stemRes.count === "number" ? stemRes.count : null;
    const tutorsCount = typeof tutorsRes.count === "number" ? tutorsRes.count : null;

    return {
      questionsCount,
      formattedQuestions: formatVerifiedStat(questionsCount, DEFAULT_QUESTION_STAT_RULE),
      attemptsCount,
      formattedAttempts: formatVerifiedStat(attemptsCount, DEFAULT_ATTEMPT_STAT_RULE),
      subjectsCount,
      formattedSubjects: formatVerifiedStat(subjectsCount, DEFAULT_SUBJECT_STAT_RULE),
      stemResourcesCount,
      formattedStemResources: formatVerifiedStat(stemResourcesCount, DEFAULT_STEM_STAT_RULE),
      tutorsCount,
      formattedTutors: formatVerifiedStat(tutorsCount, DEFAULT_TUTOR_STAT_RULE),
      asOfDate,
      isLive: true,
    };
  } catch (err) {
    console.warn("[platformStatsService] Error querying platform statistics:", err);
    return {
      questionsCount: null,
      formattedQuestions: null,
      attemptsCount: null,
      formattedAttempts: null,
      subjectsCount: null,
      formattedSubjects: null,
      stemResourcesCount: null,
      formattedStemResources: null,
      tutorsCount: null,
      formattedTutors: null,
      asOfDate,
      isLive: false,
    };
  }
}
