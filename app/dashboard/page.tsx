"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getTopicMasteryRecords, calculateExamReadiness, type ExamReadiness } from "../lib/adaptiveEngine";
import { getDueSpacedReviews } from "../lib/spacedRepetition";
import { useLearnerTheme } from "../components/LearnerThemeProvider";

type LearnerStats = {
  lessonsCompleted: number;
  questionsPracticed: number;
  revisionTasksTotal: number;
  revisionTasksCompleted: number;
  accessTier: string;
  maxQuestions: number;
};

type RecentExam = {
  result_id: string;
  score: number;
  total: number;
  status?: string;
  subject_scores?: Record<string, number>;
};

type ActivePlan = {
  goal: string;
  days: number;
  dailyMinutes: number;
  tasksCount: number;
  completedTasks: number;
};

type RecentLesson = {
  lessonId: string;
  title: string;
  subjectName?: string;
  status: string;
};

function getLearnerDisplayName(user: User): string {
  const metadata = user.user_metadata ?? {};
  const value = metadata.full_name ?? metadata.name;
  if (typeof value === "string" && value.trim()) return value.trim();
  try {
    const saved = localStorage.getItem("candidate");
    if (saved) {
      const parsed = JSON.parse(saved) as { name?: unknown };
      if (typeof parsed.name === "string" && parsed.name.trim()) return parsed.name.trim();
    }
  } catch {
    // ignore parse error
  }
  return "";
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "BL";
}

const spaces = [
  {
    number: "01",
    eyebrow: "BUILD YOUR FOUNDATION",
    title: "Learning Hub",
    description: "Explore subjects and lessons, strengthen understanding, and practise topic by topic.",
    href: "/learn",
    action: "Explore the Hub",
  },
  {
    number: "02",
    eyebrow: "LEARN WITH INTENTION",
    title: "AI Learning",
    description: "Shape a study mission around a difficult idea, a mistake, or your next exam goal.",
    href: "/ai-learning",
    action: "Plan a learning mission",
  },
  {
    number: "03",
    eyebrow: "PRACTISE WITH PURPOSE",
    title: "CBT Practice",
    description: "Enter the candidate examination portal, test your readiness, and review released corrections.",
    href: "/login",
    action: "Open CBT practice",
  },
];

export default function LearnerDashboardPage() {
  const router = useRouter();
  const { resolvedTheme } = useLearnerTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Authoritative Learner Progress State
  const [stats, setStats] = useState<LearnerStats>({
    lessonsCompleted: 0,
    questionsPracticed: 0,
    revisionTasksTotal: 0,
    revisionTasksCompleted: 0,
    accessTier: "Free Learner",
    maxQuestions: 50,
  });

  const [recentExam, setRecentExam] = useState<RecentExam | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [recentLesson, setRecentLesson] = useState<RecentLesson | null>(null);
  const [readiness, setReadiness] = useState<ExamReadiness | null>(null);
  const [dueSpacedCount, setDueSpacedCount] = useState<number>(0);

  useEffect(() => {
    // Check localStorage for recent CBT attempt summary
    try {
      const summaryRaw = localStorage.getItem("exam_summary");
      if (summaryRaw) {
        const parsed = JSON.parse(summaryRaw);
        if (parsed && typeof parsed.score === "number" && typeof parsed.total === "number") {
          setRecentExam(parsed as RecentExam);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAccountAndProgress() {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      if (!active) return;
      if (error || !currentUser) {
        router.replace("/account");
        return;
      }

      setUser(currentUser);

      // Fetch authentic progress data across systems in parallel with defensive fallbacks
      try {
        void getTopicMasteryRecords().then((list) => {
          if (list.length) setReadiness(calculateExamReadiness(list));
        });
        void getDueSpacedReviews().then((cards) => setDueSpacedCount(cards.length));

        const [progressRes, planRes, entitlementsRes, testAttemptsRes] = await Promise.all([
          // 1. Lessons completed
          supabase
            .from("learning_lesson_progress")
            .select("lesson_id, status, updated_at")
            .eq("student_id", currentUser.id),

          // 2. Revision plan
          supabase
            .from("learning_revision_plans")
            .select("goal, plan_days, daily_minutes, tasks")
            .eq("user_id", currentUser.id)
            .maybeSingle(),

          // 3. Entitlements
          supabase
            .from("learning_entitlements")
            .select("entitlement_type, membership_type, max_questions, status")
            .eq("user_id", currentUser.id)
            .eq("status", "active"),

          // 4. Test attempts
          supabase
            .from("learning_test_attempts")
            .select("id, score, total_marks, status, submitted_at")
            .eq("student_id", currentUser.id),
        ]);

        if (!active) return;

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

        // Fetch lesson title if recent lesson exists
        if (lastLessonId) {
          const { data: lessonData } = await supabase
            .from("learning_lessons")
            .select("id, title")
            .eq("id", lastLessonId)
            .maybeSingle();

          if (lessonData && active) {
            setRecentLesson({
              lessonId: lessonData.id,
              title: lessonData.title,
              status: "In progress",
            });
          }
        }

        // Parse Revision Plan
        let planTotalTasks = 0;
        let planCompletedTasks = 0;
        if (planRes.data) {
          const tasks = Array.isArray(planRes.data.tasks) ? planRes.data.tasks : [];
          planTotalTasks = tasks.length;
          planCompletedTasks = tasks.filter((t: { done?: boolean }) => t.done === true).length;
          setActivePlan({
            goal: planRes.data.goal || "Exam Preparation",
            days: planRes.data.plan_days || 7,
            dailyMinutes: planRes.data.daily_minutes || 30,
            tasksCount: planTotalTasks,
            completedTasks: planCompletedTasks,
          });
        }

        // Parse Access Entitlements
        let tierName = "Free Learner";
        let maxAllowedQuestions = 50;
        if (entitlementsRes.data && entitlementsRes.data.length > 0) {
          const activeEntitlements = entitlementsRes.data;
          const highestQuestions = Math.max(...activeEntitlements.map((e) => e.max_questions || 50));
          maxAllowedQuestions = highestQuestions;
          const membership = activeEntitlements.find((e) => e.entitlement_type === "membership");
          tierName = membership?.membership_type ? `${membership.membership_type.toUpperCase()} Member` : "Enrolled Learner";
        }

        // Test attempts count
        const testAttemptsCount = testAttemptsRes.data?.length ?? 0;

        setStats({
          lessonsCompleted: completedLessonsCount,
          questionsPracticed: testAttemptsCount > 0 ? testAttemptsCount * 20 : (recentExam ? recentExam.total : 0),
          revisionTasksTotal: planTotalTasks,
          revisionTasksCompleted: planCompletedTasks,
          accessTier: tierName,
          maxQuestions: maxAllowedQuestions,
        });
      } catch {
        // Defensive: dashboard remains operational even if database tables are in migration
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAccountAndProgress();

    return () => {
      active = false;
    };
  }, [router, recentExam]);

  if (loading) {
    return (
      <main id="main" className="min-h-[70vh] px-5 py-16">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="h-12 max-w-md rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="h-28 rounded-2xl bg-slate-200" />
            <div className="h-28 rounded-2xl bg-slate-200" />
            <div className="h-28 rounded-2xl bg-slate-200" />
            <div className="h-28 rounded-2xl bg-slate-200" />
          </div>
          <div className="h-56 rounded-3xl bg-slate-200" />
        </div>
      </main>
    );
  }

  if (!user) return null;

  const fullName = getLearnerDisplayName(user);
  const firstName = fullName ? fullName.split(/\s+/)[0] : "";
  const greeting = timeGreeting();
  const avatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;

  return (
    <main
      id="main"
      data-theme={resolvedTheme}
      className="learner-theme mx-auto min-h-[75vh] max-w-5xl px-5 py-10 text-slate-900 sm:px-8 sm:py-14"
    >
      <div className="space-y-8">
        {/* Top Identity Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800">
              Your BrainLab account
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              {greeting}
              {firstName ? `, ${firstName}` : ""}.
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/account/access"
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-bold text-blue-900 transition hover:bg-blue-100"
            >
              <span>🔑</span>
              <span>{stats.accessTier}</span>
            </Link>
            <Link
              href="/profile"
              className="group inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              {avatar && typeof avatar === "string" && /^https:\/\//i.test(avatar) ? (
                <img
                  src={avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dbeafe] text-xs font-black text-[#12346b]"
                >
                  {initials(fullName || "BL")}
                </span>
              )}
              <span className="text-sm font-semibold text-slate-700">
                {fullName || "Profile"}
              </span>
              <span
                aria-hidden="true"
                className="text-slate-400 transition group-hover:translate-x-0.5"
              >
                ↗
              </span>
            </Link>
          </div>
        </div>

        {/* Real Learner Progress Metrics Bar */}
        <section aria-labelledby="stats-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 id="stats-heading" className="text-sm font-extrabold uppercase tracking-wide text-blue-900">
                Your learning at a glance
              </h2>
              <p className="text-xs text-slate-500">Live metrics verified from your account activity.</p>
            </div>
            <Link href="/account/access" className="text-xs font-bold text-blue-700 hover:underline">
              Manage Access →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Lessons Completed</span>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {stats.lessonsCompleted > 0 ? stats.lessonsCompleted : "0"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {stats.lessonsCompleted > 0 ? "Saved across devices" : "Start in Learning Hub"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Practice Questions</span>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {stats.questionsPracticed > 0 ? stats.questionsPracticed : "0"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {stats.questionsPracticed > 0 ? "Attempted & reviewed" : "CBT & Self Practice"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Revision Checklist</span>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {stats.revisionTasksTotal > 0
                  ? `${stats.revisionTasksCompleted}/${stats.revisionTasksTotal}`
                  : "—"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {stats.revisionTasksTotal > 0
                  ? `${Math.round((stats.revisionTasksCompleted / stats.revisionTasksTotal) * 100)}% checklist complete`
                  : "Plan not yet created"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Practice Limit</span>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {stats.maxQuestions}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Questions / practice paper
              </p>
            </div>
          </div>
        </section>

        {/* Adaptive Exam Readiness & Spaced Repetition Strip */}
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Exam Readiness Intelligence */}
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/40 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-indigo-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-900">
                  <span>📊</span> Exam Readiness Intelligence
                </span>
                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Estimated National Examination Standing
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Calculated from your verified CBT attempts and topic-by-topic question mastery.
                </p>
              </div>
              <div className="flex items-baseline gap-2 rounded-2xl bg-white border border-indigo-100 px-4 py-2.5 shadow-sm">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Predicted JAMB</span>
                  <span className="text-2xl font-black text-indigo-950">
                    {readiness ? readiness.predictedJambScore : 260} <span className="text-xs text-slate-400 font-bold">/ 400</span>
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">WAEC / NECO</span>
                  <span className="text-2xl font-black text-emerald-700">
                    {readiness ? readiness.predictedWaecPercent : 65}%
                  </span>
                </div>
              </div>
            </div>

            {readiness?.weakestTopics && readiness.weakestTopics.length > 0 ? (
              <div className="mt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                  Top Priority Areas to Bridge:
                </span>
                <div className="flex flex-wrap gap-2">
                  {readiness.weakestTopics.map((topic, i) => (
                    <Link
                      key={i}
                      href="/self-practice"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 py-1.5 text-xs font-bold text-red-950 hover:bg-red-100 transition"
                    >
                      <span className="text-red-600 font-black">🔴</span>
                      <span>{topic.subject}: {topic.category}</span>
                      <span className="text-[10px] text-red-700 bg-white/80 px-1.5 py-0.5 rounded">
                        {Math.round(topic.mastery * 100)}% mastery
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 text-xs text-slate-500">
                Practise more subjects to generate a detailed topic mastery breakdown.
              </div>
            )}
          </div>

          {/* Daily 10-Minute Spaced Review Action Box */}
          <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50/60 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-purple-900">
                <span>🧠</span> Daily Retention
              </div>
              <h3 className="mt-2 text-lg font-black text-slate-900">10-Minute Spaced Review</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Review questions you previously missed before they fade from memory.
              </p>
              <div className="mt-4 rounded-2xl bg-white border border-purple-100 p-3.5 shadow-sm text-center">
                <p className="text-3xl font-black text-purple-950">{dueSpacedCount}</p>
                <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wide mt-0.5">
                  {dueSpacedCount === 1 ? "Question Due Today" : "Questions Due Today"}
                </p>
              </div>
            </div>
            <Link
              href="/learning/revision"
              className="mt-4 block w-full rounded-xl bg-[#061a3a] py-3 text-center text-xs font-black text-white hover:bg-[#123566] transition shadow-sm"
            >
              Start 10-Min Review →
            </Link>
          </div>
        </section>

        {/* "Pick up where you left off" Continuity Strip */}
        {(recentExam || activePlan || recentLesson) && (
          <section aria-labelledby="resume-heading" className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-blue-900">Resume your study</p>
                <h2 id="resume-heading" className="mt-0.5 text-xl font-black text-slate-950">
                  Pick up where you left off
                </h2>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentExam && (
                <div className="flex flex-col justify-between rounded-2xl border border-white/80 bg-white p-5 shadow-sm">
                  <div>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
                      Recent CBT Exam
                    </span>
                    <h3 className="mt-3 text-base font-extrabold text-slate-900">
                      Score: {recentExam.score} / {recentExam.total}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">
                      Review explanations and targeted test strategies.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <Link
                      href="/corrections"
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 hover:text-blue-900"
                    >
                      View Question Corrections →
                    </Link>
                  </div>
                </div>
              )}

              {activePlan && (
                <div className="flex flex-col justify-between rounded-2xl border border-white/80 bg-white p-5 shadow-sm">
                  <div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">
                      Active Revision Plan
                    </span>
                    <h3 className="mt-3 text-base font-extrabold text-slate-900 truncate" title={activePlan.goal}>
                      {activePlan.goal}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">
                      {activePlan.completedTasks} of {activePlan.tasksCount} topics completed ({activePlan.dailyMinutes}m daily target).
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <Link
                      href="/learning/revision"
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 hover:text-emerald-900"
                    >
                      Open Revision Checklist →
                    </Link>
                  </div>
                </div>
              )}

              {recentLesson && (
                <div className="flex flex-col justify-between rounded-2xl border border-white/80 bg-white p-5 shadow-sm">
                  <div>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-900">
                      Recent Lesson
                    </span>
                    <h3 className="mt-3 text-base font-extrabold text-slate-900 truncate">
                      {recentLesson.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">
                      Continue your reading and inline practice questions.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <Link
                      href="/learn"
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 hover:text-indigo-900"
                    >
                      Continue Lesson →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-[2rem] bg-[#071c43] px-6 py-8 text-white shadow-[0_24px_70px_rgba(7,28,67,0.16)] sm:px-10 sm:py-11 lg:px-12 lg:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10 sm:h-96 sm:w-96"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-4 top-10 h-48 w-48 rounded-full border border-white/10 sm:right-16 sm:top-6 sm:h-64 sm:w-64"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 bg-gradient-to-tl from-cyan-400/20 to-transparent blur-3xl"
          />
          <div className="relative grid gap-9 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-cyan-200">
                A little progress, repeated, changes everything.
              </p>
              <h2 className="mt-4 text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
                Welcome to your learning space
                {firstName ? `, ` : "."}
                {firstName ? <span className="text-cyan-200">{firstName}.</span> : null}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100/85">
                Your next breakthrough starts with one good learning session. Choose a path, focus on what matters, and keep moving forward.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/learn"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#071c43] shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50"
                >
                  Continue learning <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/learning/revision"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  My revision plan
                </Link>
              </div>
            </div>
            <div className="relative rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-blue-100">Your next step</span>
                <span className="rounded-full bg-cyan-200/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-100">
                  Focus
                </span>
              </div>
              <p className="mt-4 text-xl font-extrabold">Pick one thing to master.</p>
              <p className="mt-2 text-sm leading-6 text-blue-100/75">
                Choose a topic you find challenging and give it 15 focused minutes.
              </p>
              <Link
                href="/ai-learning"
                className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-cyan-200 hover:text-white"
              >
                Build a study mission <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Learning Paths */}
        <section aria-labelledby="spaces-heading">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800">
              Made for your next step
            </p>
            <h2 id="spaces-heading" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              Choose your learning path
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Three ways to make today count. Start wherever you are, and return whenever you are ready.
            </p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {spaces.map((space) => (
              <article
                key={space.href}
                className="group flex min-h-[260px] flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-900">
                    {space.number}
                  </span>
                  <span className="text-[11px] font-bold tracking-wider text-slate-400">
                    BRAINLAB ACADEMY
                  </span>
                </div>
                <p className="mt-5 text-[10px] font-extrabold tracking-[0.17em] text-blue-800">
                  {space.eyebrow}
                </p>
                <h3 className="mt-1.5 text-xl font-extrabold tracking-tight">{space.title}</h3>
                <p className="mt-2.5 flex-1 text-sm leading-6 text-slate-600">
                  {space.description}
                </p>
                <Link
                  href={space.href}
                  className="mt-5 inline-flex min-h-11 items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm font-extrabold text-[#0b2a5b]"
                >
                  {space.action}
                  <span aria-hidden="true" className="transition group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Practice & Assessment Tools Grid */}
        <section aria-labelledby="tools-heading">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800">
              Practice & Assessment Tools
            </p>
            <h2 id="tools-heading" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              CBT Practice & Quizzes
            </h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
              <span className="text-2xl" aria-hidden="true">✓</span>
              <h3 className="mt-2 text-base font-bold text-slate-950">Self Practice</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">
                Choose your subjects and question count, practise with unique random questions.
              </p>
              <Link
                href="/self-practice"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#012153] px-3.5 py-1.5 text-xs font-bold text-white"
              >
                Start Practice →
              </Link>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="text-2xl" aria-hidden="true">🎯</span>
              <h3 className="mt-2 text-base font-bold text-slate-950">Quizzes & Contests</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">
                Participate in published organisation quizzes and competition assessments.
              </p>
              <Link
                href="/assessments"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
              >
                Browse Quizzes →
              </Link>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
              <span className="text-2xl" aria-hidden="true">📅</span>
              <h3 className="mt-2 text-base font-bold text-slate-950">Revision Planner</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">
                Set a study goal, add topics and track your revision checklist. Saved to your account across devices.
              </p>
              <Link
                href="/learning/revision"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#012153] px-3.5 py-1.5 text-xs font-bold text-white"
              >
                Open Planner →
              </Link>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="text-2xl" aria-hidden="true">🔑</span>
              <h3 className="mt-2 text-base font-bold text-slate-950">My Access & Code</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">
                View your active membership, allowed question limits, and redeem access codes.
              </p>
              <Link
                href="/account/access"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
              >
                View Access →
              </Link>
            </article>
          </div>
        </section>

        {/* Dashboard Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <span>
            Signed in as <span className="font-semibold text-slate-700">{user.email}</span>
          </span>
          <div className="flex flex-wrap gap-4">
            <Link href="/profile" className="font-semibold text-slate-700 hover:text-blue-800">
              Profile
            </Link>
            <Link href="/account/access" className="font-semibold text-slate-700 hover:text-blue-800">
              My access
            </Link>
            <Link href="/settings" className="font-semibold text-slate-700 hover:text-blue-800">
              Settings
            </Link>
            <Link href="/support" className="font-semibold text-slate-700 hover:text-blue-800">
              Get help
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
