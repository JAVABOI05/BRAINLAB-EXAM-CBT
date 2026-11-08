import { supabase } from "../supabase";
import { getStudentSubscriptionAndEntitlements } from "../subscriptionEntitlements";

export interface LearnerStats {
  lessonsCompleted: number;
  questionsPracticed: number;
  revisionTasksTotal: number;
  revisionTasksCompleted: number;
  accessTier: string;
  maxQuestions: number;
  subscriptionExpiry?: string | null;
}

export interface ActivePlan {
  goal: string;
  days: number;
  dailyMinutes: number;
  tasksCount: number;
  completedTasks: number;
}

export interface RecentLesson {
  lessonId: string;
  title: string;
  subjectName?: string;
  status: string;
}

export interface LearnerDashboardSummary {
  stats: LearnerStats;
  activePlan: ActivePlan | null;
  recentLesson: RecentLesson | null;
  adminRole: string | null;
}

/**
 * Service function to retrieve aggregated learner dashboard telemetry,
 * active revision plans, entitlements, and recent activity.
 */
export async function getLearnerDashboardSummary(
  userId: string,
  recentExamTotal: number = 0
): Promise<LearnerDashboardSummary> {
  const [progressRes, planRes, entitlementsRes, subscriptionRes, testAttemptsRes] =
    await Promise.all([
      // 1. Lessons completed
      supabase
        .from("learning_lesson_progress")
        .select("lesson_id, status, updated_at")
        .eq("student_id", userId),

      // 2. Revision plan
      supabase
        .from("learning_revision_plans")
        .select("goal, plan_days, daily_minutes, tasks")
        .eq("user_id", userId)
        .maybeSingle(),

      // 3. Entitlements
      supabase
        .from("learning_entitlements")
        .select(
          "entitlement_type, membership_type, max_questions, status, starts_at, expires_at, permanent, revoked_at"
        )
        .eq("user_id", userId)
        .eq("status", "active"),

      // 4. Subscription fallback
      supabase
        .from("user_subscriptions")
        .select("plan_id, status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle(),

      // 5. Test attempts
      supabase
        .from("learning_test_attempts")
        .select("id, score, total_marks, status, submitted_at")
        .eq("student_id", userId),
    ]);

  // Lessons calculation
  let completedLessonsCount = 0;
  let lastLessonId: string | null = null;
  if (progressRes.data && Array.isArray(progressRes.data)) {
    completedLessonsCount = progressRes.data.filter((r) => r.status === "completed").length;
    const sorted = [...progressRes.data].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    if (sorted[0]?.lesson_id) {
      lastLessonId = sorted[0].lesson_id;
    }
  }

  // Recent lesson title resolution
  let recentLesson: RecentLesson | null = null;
  if (lastLessonId) {
    try {
      const { data: lessonData } = await supabase
        .from("learning_lessons")
        .select("id, title")
        .eq("id", lastLessonId)
        .maybeSingle();

      if (lessonData) {
        recentLesson = {
          lessonId: lessonData.id,
          title: lessonData.title,
          status: "In progress",
        };
      }
    } catch {}
  }

  // Active revision plan
  let activePlan: ActivePlan | null = null;
  let planTotalTasks = 0;
  let planCompletedTasks = 0;
  if (planRes.data) {
    const tasks = Array.isArray(planRes.data.tasks) ? planRes.data.tasks : [];
    planTotalTasks = tasks.length;
    planCompletedTasks = tasks.filter((t: { done?: boolean }) => t.done === true).length;
    activePlan = {
      goal: planRes.data.goal || "Exam Preparation",
      days: planRes.data.plan_days || 7,
      dailyMinutes: planRes.data.daily_minutes || 30,
      tasksCount: planTotalTasks,
      completedTasks: planCompletedTasks,
    };
  }

  // Admin role resolution
  let resolvedRole: string | null = null;
  try {
    const { data: role } = await supabase.rpc("get_admin_role");
    if (typeof role === "string" && role.length > 0) {
      resolvedRole = role;
    }
  } catch {}

  if (!resolvedRole) {
    try {
      const { data: profile } = await supabase
        .from("admin_profiles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile?.role) resolvedRole = profile.role;
    } catch {}
  }

  // Access Tier and Entitlements Resolution
  let tierName = "Free Learner";
  let maxAllowedQuestions = 50;
  let expiryDateText: string | null = null;

  try {
    const authTier = await getStudentSubscriptionAndEntitlements(userId);
    if (authTier.planId === "admin_vip" || resolvedRole) {
      tierName = `${
        resolvedRole === "super_admin" || authTier.planId === "admin_vip"
          ? "Super Admin"
          : "Administrator"
      } VIP (Universal Access)`;
      maxAllowedQuestions = 999999;
      expiryDateText = "Universal Access";
    } else if (authTier.isSubscribed && authTier.planId !== "free") {
      const planKey = authTier.planId.toLowerCase();
      tierName = `${planKey.toUpperCase()} Member`;
      maxAllowedQuestions = planKey === "pro" ? 500 : planKey === "plus" ? 400 : 250;
      expiryDateText = authTier.expiresAt
        ? new Date(authTier.expiresAt).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Active";
    } else {
      tierName = "Free Learner";
      maxAllowedQuestions = 50;
      expiryDateText = null;
    }
  } catch {
    tierName = "Free Learner";
    maxAllowedQuestions = 50;
    expiryDateText = null;
  }

  const testAttemptsCount = testAttemptsRes.data?.length ?? 0;

  const stats: LearnerStats = {
    lessonsCompleted: completedLessonsCount,
    questionsPracticed:
      testAttemptsCount > 0 ? testAttemptsCount * 20 : recentExamTotal,
    revisionTasksTotal: planTotalTasks,
    revisionTasksCompleted: planCompletedTasks,
    accessTier: tierName,
    maxQuestions: maxAllowedQuestions,
    subscriptionExpiry: expiryDateText,
  };

  return {
    stats,
    activePlan,
    recentLesson,
    adminRole: resolvedRole,
  };
}
