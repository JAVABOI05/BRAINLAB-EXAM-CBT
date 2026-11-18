"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  getLearnerDashboardSummary,
  type LearnerStats,
  type ActivePlan,
  type RecentLesson,
} from "../lib/services/learnerProgressService";
import { getTopicMasteryRecords, calculateExamReadiness, type ExamReadiness } from "../lib/adaptiveEngine";
import { getDueSpacedReviews } from "../lib/spacedRepetition";
import { useLearnerTheme } from "../components/LearnerThemeProvider";
import UserBadges from "../components/UserBadges";
import LearningStreakCard from "../components/LearningStreakCard";
import { getUserGamificationProfile, type UserGamificationProfile } from "../lib/gamification";
import { CardSkeleton, StatsSkeleton } from "../components/SkeletonLoader";
import ActivePresenceBar from "../components/ActivePresenceBar";
import DeviceNotificationPrompt from "../components/DeviceNotificationPrompt";
import ExamCountdownBanner from "../components/ExamCountdownBanner";
import WhatsAppChannelHeroBanner from "../components/WhatsAppChannelHeroBanner";
import DailyLearningFeedWidget from "../components/dashboard/DailyLearningFeedWidget";
import MigratedStudentBanner from "../components/dashboard/MigratedStudentBanner";
import { StudentAvatar } from "../components/ui/StudentAvatar";
import { extractStudentProfile } from "../lib/studentProfile";
import StudentGoalWizard from "../components/onboarding/StudentGoalWizard";
import { StudentCommandPalette } from "../components/StudentCommandPalette";

type RecentExam = {
  result_id: string;
  score: number;
  total: number;
  status?: string;
  subject_scores?: Record<string, number>;
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
    accent: "cyan",
    gradient: "from-cyan-500/10 via-blue-500/5 to-transparent dark:from-cyan-950/40",
    border: "border-cyan-200/80 dark:border-cyan-800/60 hover:border-cyan-400 dark:hover:border-cyan-400",
    badgeBg: "bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    hoverShadow: "hover:shadow-cyan-500/10",
  },
  {
    number: "02",
    eyebrow: "LEARN WITH INTENTION",
    title: "AI Learning",
    description: "Shape a study mission around a difficult idea, a mistake, or your next exam goal.",
    href: "/ai-learning",
    action: "Plan a learning mission",
    accent: "purple",
    gradient: "from-purple-500/10 via-fuchsia-500/5 to-transparent dark:from-purple-950/40",
    border: "border-purple-200/80 dark:border-purple-800/60 hover:border-purple-400 dark:hover:border-purple-400",
    badgeBg: "bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    hoverShadow: "hover:shadow-purple-500/10",
  },
  {
    number: "03",
    eyebrow: "PRACTISE WITH PURPOSE",
    title: "CBT Practice",
    description: "Enter the candidate examination portal, test your readiness, and review released corrections.",
    href: "/cbt",
    action: "Open CBT practice",
    accent: "emerald",
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/40",
    border: "border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-400 dark:hover:border-emerald-400",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    hoverShadow: "hover:shadow-emerald-500/10",
  },
  {
    number: "04",
    eyebrow: "LIVE INTERACTIVE CLASSES",
    title: "Live Academic Classroom",
    description: "Join scheduled tutor sessions, participate with audio/chat, and watch lecture recordings.",
    href: "/classroom",
    action: "Enter Classroom Hub →",
    accent: "amber",
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/40",
    border: "border-amber-200/80 dark:border-amber-800/60 hover:border-amber-400 dark:hover:border-amber-400",
    badgeBg: "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    hoverShadow: "hover:shadow-amber-500/10",
  },
  {
    number: "05",
    eyebrow: "STUDY COMMUNICATION",
    title: "Messages & Voice Notes",
    description: "Direct discussions with course tutors, audio note review, and study group communication.",
    href: "/messages",
    action: "Open Messages",
    accent: "indigo",
    gradient: "from-indigo-500/10 via-blue-500/5 to-transparent dark:from-indigo-950/40",
    border: "border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-400",
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    hoverShadow: "hover:shadow-indigo-500/10",
  },
  {
    number: "06",
    eyebrow: "CONTINUOUS ASSESSMENT",
    title: "Assignments & Homework",
    description: "Submit written tasks, record oral solutions, and receive tutor grades with audio critiques.",
    href: "/assignments",
    action: "View Assignments",
    accent: "rose",
    gradient: "from-rose-500/10 via-pink-500/5 to-transparent dark:from-rose-950/40",
    border: "border-rose-200/80 dark:border-rose-800/60 hover:border-rose-400 dark:hover:border-rose-400",
    badgeBg: "bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    hoverShadow: "hover:shadow-rose-500/10",
  },
];

export default function LearnerDashboardPage() {
  const router = useRouter();
  const { resolvedTheme } = useLearnerTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<string | null>(null);

  // Authoritative Learner Progress State
  const [stats, setStats] = useState<LearnerStats>({
    lessonsCompleted: 0,
    questionsPracticed: 0,
    revisionTasksTotal: 0,
    revisionTasksCompleted: 0,
    accessTier: "Free Learner",
    maxQuestions: 50,
    subscriptionExpiry: null,
  });

  const [recentExam, setRecentExam] = useState<RecentExam | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [recentLesson, setRecentLesson] = useState<RecentLesson | null>(null);
  const [readiness, setReadiness] = useState<ExamReadiness | null>(null);
  const [dueSpacedCount, setDueSpacedCount] = useState<number>(0);
  const [gamification, setGamification] = useState<UserGamificationProfile | null>(null);
  const [userCohorts, setUserCohorts] = useState<any[]>([]);
  const [showGoalWizard, setShowGoalWizard] = useState(false);
  const [showSearchPalette, setShowSearchPalette] = useState(false);

  useEffect(() => {
    let active = true;

    // 1. Instant Cache Hydration: Render immediately from cache for 0ms perceived latency
    try {
      const cachedDashboard = localStorage.getItem("bl_dashboard_cache");
      if (cachedDashboard) {
        const parsed = JSON.parse(cachedDashboard);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.recentExam) setRecentExam(parsed.recentExam);
        if (parsed.activePlan) setActivePlan(parsed.activePlan);
        if (parsed.recentLesson) setRecentLesson(parsed.recentLesson);
        if (parsed.readiness) setReadiness(parsed.readiness);
        if (parsed.gamification) setGamification(parsed.gamification);
        if (parsed.adminRole) setAdminRole(parsed.adminRole);
        if (parsed.userCohorts) setUserCohorts(parsed.userCohorts);
        setLoading(false);
      }
      const cachedXp = localStorage.getItem("bl_student_xp_cache");
      if (cachedXp && !gamification) {
        setGamification(JSON.parse(cachedXp));
      }
    } catch {}

    // 2. Real-time Gamification Event Listener (synchronizes XP across tabs & tests)
    const handleXpAwarded = (e: Event) => {
      const detail = (e as CustomEvent).detail as UserGamificationProfile | undefined;
      if (detail && active) {
        setGamification(detail);
      }
    };
    window.addEventListener("brainlab_xp_awarded", handleXpAwarded);

    async function loadAccountAndProgress() {
      try {
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (!active) return;
        if (error || !currentUser) {
          router.replace("/login?redirect=/dashboard");
          return;
        }

        setUser(currentUser);

        // Check if student needs initial study goal onboarding
        try {
          const prof = extractStudentProfile(currentUser);
          const goalsSet = localStorage.getItem("brainlab_student_goals_set") === "true";
          const dismissed = localStorage.getItem("brainlab_goal_wizard_dismissed") === "true";
          if (!prof.isCustomized && !goalsSet && !dismissed) {
            setShowGoalWizard(true);
          }
        } catch {}

        // Parallel non-blocking execution of all dashboard telemetry (eliminates waterfall delays)
        const [
          attemptsRes,
          masteryRes,
          spacedRes,
          gamificationRes,
          cohortsRes,
          summaryRes,
        ] = await Promise.allSettled([
          supabase
            .from("learning_test_attempts")
            .select("id, score, total_marks, status, submitted_at")
            .eq("student_id", currentUser.id)
            .order("submitted_at", { ascending: false })
            .limit(1),
          getTopicMasteryRecords(),
          getDueSpacedReviews(),
          getUserGamificationProfile(currentUser.id),
          supabase
            .from("community_group_memberships")
            .select("group_role, status, group:community_groups(id, slug, name, icon_emoji, category)")
            .eq("user_id", currentUser.id)
            .eq("status", "active")
            .limit(3),
          getLearnerDashboardSummary(currentUser.id, 0),
        ]);

        if (!active) return;

        let latestExam: RecentExam | null = null;
        if (attemptsRes.status === "fulfilled" && attemptsRes.value.data?.[0]) {
          const first = attemptsRes.value.data[0];
          latestExam = {
            result_id: first.id,
            score: first.score || 0,
            total: first.total_marks || 100,
            status: first.status,
          };
          setRecentExam(latestExam);
        }

        let latestReadiness: ExamReadiness | null = null;
        if (masteryRes.status === "fulfilled" && masteryRes.value.length) {
          latestReadiness = calculateExamReadiness(masteryRes.value);
          setReadiness(latestReadiness);
        }

        if (spacedRes.status === "fulfilled") {
          setDueSpacedCount(spacedRes.value.length);
        }

        let latestGamification: UserGamificationProfile | null = null;
        if (gamificationRes.status === "fulfilled" && gamificationRes.value) {
          latestGamification = gamificationRes.value;
          setGamification(latestGamification);
        }

        let latestCohorts: any[] = [];
        if (cohortsRes.status === "fulfilled" && cohortsRes.value.data) {
          latestCohorts = cohortsRes.value.data;
          setUserCohorts(latestCohorts);
        }

        let latestStats: LearnerStats | null = null;
        let latestPlan: ActivePlan | null = null;
        let latestLesson: RecentLesson | null = null;
        let latestAdminRole: string | null = null;

        if (summaryRes.status === "fulfilled") {
          const s = summaryRes.value;
          latestStats = s.stats;
          latestPlan = s.activePlan;
          latestLesson = s.recentLesson;
          latestAdminRole = s.adminRole;

          setStats(s.stats);
          if (s.activePlan) setActivePlan(s.activePlan);
          if (s.recentLesson) setRecentLesson(s.recentLesson);
          if (s.adminRole) setAdminRole(s.adminRole);
        }

        // Cache fresh snapshot for next instant render
        try {
          localStorage.setItem(
            "bl_dashboard_cache",
            JSON.stringify({
              stats: latestStats,
              recentExam: latestExam,
              gamification: latestGamification,
              readiness: latestReadiness,
              activePlan: latestPlan,
              recentLesson: latestLesson,
              adminRole: latestAdminRole,
              userCohorts: latestCohorts,
            })
          );
        } catch {}
      } catch {
        // Defensive: dashboard remains operational even if database tables are in migration
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAccountAndProgress();

    return () => {
      active = false;
      window.removeEventListener("brainlab_xp_awarded", handleXpAwarded);
    };
  }, [router]);

  if (loading) {
    return (
      <main id="main" className="min-h-[70vh] max-w-5xl mx-auto px-5 py-12 space-y-8 animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-8 w-64 rounded-xl bg-slate-200 animate-pulse" />
          </div>
          <div className="h-10 w-28 rounded-full bg-slate-200 animate-pulse" />
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="h-4 w-44 rounded-full bg-slate-200 mb-4 animate-pulse" />
          <StatsSkeleton count={4} />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-40 rounded-full bg-slate-200 animate-pulse" />
          <CardSkeleton count={3} />
        </div>
      </main>
    );
  }

  if (!user) return null;

  const fullName = getLearnerDisplayName(user);
  const firstName = fullName ? fullName.split(/\s+/)[0] : "";
  const greeting = timeGreeting();
  const avatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
  const studentProfile = extractStudentProfile(user);

  return (
    <main
      id="main"
      data-theme={resolvedTheme}
      className="learner-theme mx-auto min-h-[75vh] max-w-5xl px-5 py-10 text-slate-900 sm:px-8 sm:py-14"
    >
      <div className="space-y-8">
        {/* Admin VIP Mode Navigation Banner */}
        {adminRole && (
          <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 p-4 sm:p-5 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Administrator Preview Mode Active
                    </span>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400 dark:border-emerald-600 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:text-emerald-300">
                      Root VIP Access
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    You are exploring the student portal with <strong>Universal Platform Access</strong>. All CBT mock exams, AI study tools, question corrections, and live classrooms are 100% unlocked with zero subscription fees.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black px-4 py-2.5 text-xs shadow-md transition active:scale-95 shrink-0"
              >
                <span>← Return to Admin Portal</span>
              </Link>
              <Link
                href="/tutor"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black px-4 py-2.5 text-xs shadow-md transition active:scale-95 shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <span>Open Instructor Studio</span>
              </Link>
            </div>
          </div>
        )}

        {/* Migrated Student Verified Upgrade Banner (Decision D6) */}
        <MigratedStudentBanner />

        {/* Luxury Brilliant-Style Learner Welcome Hero Card */}
        <section
          aria-label="Welcome Hero"
          className="relative min-h-[380px] lg:min-h-[340px] overflow-hidden rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-[#061129] via-[#0b1c45] to-[#04091a] p-6 sm:p-8 lg:p-10 text-white shadow-[0_25px_60px_-15px_rgba(2,12,38,0.5)] backdrop-blur-2xl transition-all"
        >
          {/* Ambient Glowing Orbs & Tech Mesh */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10"
          />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              {/* Profile Avatar with Glowing Ring & Presence */}
              <Link href="/profile" className="relative group shrink-0" title="View & Edit Profile">
                <StudentAvatar
                  profile={studentProfile}
                  size="lg"
                  showOnlineDot={true}
                  className="ring-2 ring-cyan-400/50 shadow-xl group-hover:scale-105 group-hover:ring-cyan-300 transition duration-300"
                />
              </Link>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/15 border border-cyan-400/30 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-300 backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    BrainLab Academy · Learner Space
                  </span>
                  {stats.accessTier && (
                    <span className="rounded-full bg-white/10 border border-white/20 px-3 py-0.5 text-[10px] font-black text-white backdrop-blur-md shadow-xs">
                      {stats.accessTier}
                    </span>
                  )}
                </div>

                <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
                  <span>{timeGreeting()}</span>
                  {firstName ? (
                    <span className="inline-flex items-center gap-2">
                      , {firstName}!
                      <span className="inline-flex text-cyan-400" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                        </svg>
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      , Scholar!
                      <span className="inline-flex text-cyan-400" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                        </svg>
                      </span>
                    </span>
                  )}
                  {user && <UserBadges userId={user.id} size="sm" maxVisible={3} />}
                </h1>

                <p className="mt-1.5 max-w-xl text-xs sm:text-sm text-blue-100/80 leading-relaxed font-medium">
                  Welcome to your academic sanctuary. Track topic mastery, complete daily quests, and prepare to ace your exams.
                </p>

                {/* Student Ambition & Vibe Badges */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {studentProfile.targetCourse && (
                    <button
                      type="button"
                      onClick={() => setShowGoalWizard(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/25 border border-blue-400/40 px-3 py-1 font-bold text-cyan-200 hover:bg-blue-500/40 backdrop-blur-md transition cursor-pointer"
                      title="Edit Course Goal"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                      <span>{studentProfile.targetCourse}</span>
                    </button>
                  )}
                  {studentProfile.dreamSchool && (
                    <button
                      type="button"
                      onClick={() => setShowGoalWizard(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500/25 border border-indigo-400/40 px-3 py-1 font-bold text-indigo-200 hover:bg-indigo-500/40 backdrop-blur-md transition cursor-pointer"
                      title="Edit Dream School"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      <span>{studentProfile.dreamSchool}</span>
                    </button>
                  )}
                  {studentProfile.targetScore && (
                    <button
                      type="button"
                      onClick={() => setShowGoalWizard(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/25 border border-amber-400/40 px-3 py-1 font-bold text-amber-200 hover:bg-amber-500/40 backdrop-blur-md transition cursor-pointer"
                      title="Edit Score Goal"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-amber-300" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span>Goal: {studentProfile.targetScore}</span>
                    </button>
                  )}
                  {studentProfile.studyVibe && (
                    <button
                      type="button"
                      onClick={() => setShowGoalWizard(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-500/25 border border-purple-400/40 px-3 py-1 font-bold text-purple-200 hover:bg-purple-500/40 backdrop-blur-md transition cursor-pointer"
                      title="Edit Study Persona"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                      </svg>
                      <span>{studentProfile.studyVibe}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowGoalWizard(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-cyan-400/50 bg-cyan-400/10 px-3 py-1 font-bold text-cyan-200 hover:bg-cyan-400/20 backdrop-blur-md transition cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                    </svg>
                    <span>{studentProfile.isCustomized ? "Update Study Goals" : "Set Your Target Exam, School & Course"}</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Student Quick Search & Navigator Bar */}
                <div className="mt-4 pt-2 max-w-xl">
                  <button
                    type="button"
                    onClick={() => setShowSearchPalette(true)}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/15 px-4 py-2.5 text-left text-xs sm:text-sm text-blue-100/90 shadow-md backdrop-blur-md transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <svg className="h-4 w-4 text-cyan-300 group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span className="truncate">Search subjects, syllabus topics, CBT mock, or formulas...</span>
                    </div>
                    <kbd className="hidden sm:inline-block rounded-lg border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-mono text-cyan-200">
                      Ctrl + K
                    </kbd>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Status Cluster: Level & Streak & Live Presence */}
            <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
              <ActivePresenceBar activityContext="Studying on Learner Dashboard" variant="pill" />
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2 backdrop-blur-md shadow-inner">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-amber-300" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-cyan-200 leading-none">Level {gamification?.current_level || 1}</p>
                    <p className="text-xs font-black text-white mt-0.5">{(gamification?.lifetime_xp || 100).toLocaleString()} XP</p>
                  </div>
                </div>
                <LearningStreakCard
                  currentStreak={gamification?.current_streak_days || 1}
                  longestStreak={gamification?.longest_streak_days || 1}
                  lastActiveDate={gamification?.last_activity_date || null}
                  compact={true}
                />
              </div>
            </div>
          </div>

          {/* Quick-Launch Interactive Action Strip */}
          <div className="relative mt-7 pt-5 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/cbt"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 px-4 py-2 text-xs font-black transition active:scale-95 shadow-md shadow-cyan-500/20"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Launch CBT Practice</span>
              </Link>
              <Link
                href="/ai-learning"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-bold transition active:scale-95 backdrop-blur-md"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                  <circle cx="9" cy="13" r="1" />
                  <circle cx="15" cy="13" r="1" />
                  <path d="M10 17h4" />
                </svg>
                <span>AI Study Mission</span>
              </Link>
              <Link
                href="/community"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-bold transition active:scale-95 backdrop-blur-md"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Communities</span>
              </Link>
              <Link
                href="/challenge-arena"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 px-3.5 py-2 text-xs font-bold transition active:scale-95 backdrop-blur-md"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Arena (2× XP)</span>
              </Link>
              <Link
                href="/classroom/BL-LIVE-101"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 px-3.5 py-2 text-xs font-bold transition active:scale-95 backdrop-blur-md"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" />
                </svg>
                <span>Live Stage</span>
              </Link>
              <Link
                href="/resources"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-bold transition active:scale-95 backdrop-blur-md"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Formulas</span>
              </Link>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-cyan-200">
              <Link href="/leaderboard" className="hover:text-white transition inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h9c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5H15c-.55 0-1-.45-1-1v-2.34" />
                  <path d="M18 4H6v7a6 6 0 0 0 12 0V4Z" />
                </svg>
                <span>Leaderboard</span>
              </Link>
              <span className="text-white/30">·</span>
              <Link href="/learning/achievements" className="hover:text-white transition inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
                <span>Badges &amp; Streaks</span>
              </Link>
            </div>
          </div>
        </section>

        {adminRole === "teacher" && (
          <section className="flex flex-col gap-4 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">Tutor workspace</p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-950">Build your BrainLab tutor profile</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Add your biography, qualifications, subjects and teaching experience. Your profile becomes visible to learners after review.</p>
            </div>
            <Link href="/tutor/profile" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#0B1536] px-5 py-3 text-sm font-black text-white hover:bg-blue-900">Manage my tutor profile →</Link>
          </section>
        )}

        {/* Live Classroom Quick Launch Bar */}
        <div className="rounded-3xl border border-blue-600/30 bg-gradient-to-r from-[#012153] via-blue-900 to-indigo-950 p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-inner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m22 8-6 4 6 4V8Z" />
                <rect width="14" height="12" x="2" y="6" rx="2" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300">Live Stage &amp; Timetable</span>
              </div>
              <p className="mt-0.5 text-sm font-bold text-white">
                Live interactive classes, tutor sessions &amp; timetable schedule
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/classroom/BL-LIVE-101"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-400 hover:bg-emerald-300 px-4 py-2 text-xs font-black text-slate-950 dark:text-white transition active:scale-95 shadow-sm"
            >
              Enter Live Room ↗
            </Link>
            <Link
              href="/learn?tab=timetable"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-white transition active:scale-95"
            >
              Timetable
            </Link>
          </div>
        </div>

        {/* Exam Countdown & Official WhatsApp Community Row */}
        <div className="grid gap-4 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-center">
            <ExamCountdownBanner
              variant="dashboard"
              studentProgramme={user?.user_metadata?.programme || user?.user_metadata?.target_exam}
              showCta={true}
            />
          </div>
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-center">
            <WhatsAppChannelHeroBanner variant="card" />
          </div>
        </div>

        {/* Phase 5: Unified Daily Learning Feed & Cohort Quests */}
        <DailyLearningFeedWidget />

        {/* Real Learner Progress Metrics Bar */}
        <section aria-labelledby="stats-heading" className="rounded-[2rem] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#081021] p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 id="stats-heading" className="text-sm font-extrabold uppercase tracking-wide text-blue-900 dark:text-cyan-400">
                Your learning at a glance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live metrics verified from your account activity.</p>
            </div>
            <Link href="/account/access" className="text-xs font-bold text-blue-700 dark:text-cyan-400 hover:underline">
              Manage Access →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="group relative overflow-hidden flex min-h-[160px] flex-col justify-between rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-500/10 via-white to-slate-50/70 dark:from-indigo-950/40 dark:via-[#0c1527] dark:to-[#081021] p-4 transition duration-200 hover:border-indigo-400 dark:hover:border-indigo-400 hover:shadow-md hover-lift">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lessons Completed</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10" />
                    <path d="M6 10h10" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                  {stats.lessonsCompleted > 0 ? stats.lessonsCompleted : "0"}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {stats.lessonsCompleted > 0 ? "Saved across devices" : "Start in Learning Hub"}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden flex min-h-[160px] flex-col justify-between rounded-2xl border border-sky-200/80 dark:border-sky-800/60 bg-gradient-to-br from-sky-500/10 via-white to-slate-50/70 dark:from-sky-950/40 dark:via-[#0c1527] dark:to-[#081021] p-4 transition duration-200 hover:border-sky-400 dark:hover:border-sky-400 hover:shadow-md hover-lift">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Practice Questions</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 11 3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                  {stats.questionsPracticed > 0 ? stats.questionsPracticed : "0"}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {stats.questionsPracticed > 0 ? "Attempted & reviewed" : "CBT & Self Practice"}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden flex min-h-[160px] flex-col justify-between rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-500/10 via-white to-slate-50/70 dark:from-emerald-950/40 dark:via-[#0c1527] dark:to-[#081021] p-4 transition duration-200 hover:border-emerald-400 dark:hover:border-emerald-400 hover:shadow-md hover-lift">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Revision Checklist</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                  {stats.revisionTasksTotal > 0
                    ? `${stats.revisionTasksCompleted}/${stats.revisionTasksTotal}`
                    : "—"}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {stats.revisionTasksTotal > 0
                    ? `${Math.round((stats.revisionTasksCompleted / stats.revisionTasksTotal) * 100)}% checklist complete`
                    : "Plan not yet created"}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden flex min-h-[160px] flex-col justify-between rounded-2xl border border-purple-200/80 dark:border-purple-800/60 bg-gradient-to-br from-purple-500/10 via-white to-slate-50/70 dark:from-purple-950/40 dark:via-[#0c1527] dark:to-[#081021] p-4 transition duration-200 hover:border-purple-400 dark:hover:border-purple-400 hover:shadow-md hover-lift">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Practice Limit</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                  {stats.maxQuestions}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Questions / practice paper
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Adaptive Exam Readiness & Spaced Repetition Strip */}
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Exam Readiness Intelligence */}
          <div className="min-h-[320px] flex flex-col justify-between rounded-[2rem] border border-indigo-200/80 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/40 dark:from-[#0b1428] dark:via-[#091021] dark:to-[#120f29] p-6 shadow-sm">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-indigo-100 dark:border-indigo-900/40 pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                    <span>Exam Readiness Intelligence</span>
                  </span>
                  <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                    Estimated National Examination Standing
                  </h2>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Calculated from your verified CBT attempts and topic-by-topic question mastery.
                  </p>
                </div>
                <div className="flex items-baseline gap-2 rounded-2xl bg-white dark:bg-[#070e1b] border border-indigo-100 dark:border-indigo-900/50 px-4 py-2.5 shadow-sm">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Predicted JAMB</span>
                    <span className="text-2xl font-black text-indigo-950 dark:text-indigo-200">
                      {readiness ? readiness.predictedJambScore : "—"} {readiness && <span className="text-xs text-slate-400 font-bold">/ 400</span>}
                    </span>
                  </div>
                  <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">WAEC / NECO</span>
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                      {readiness ? `${readiness.predictedWaecPercent}%` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {readiness?.weakestTopics && readiness.weakestTopics.length > 0 ? (
                <div className="mt-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
                    Top Priority Areas to Bridge:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {readiness.weakestTopics.map((topic, i) => (
                      <Link
                        key={i}
                        href="/self-practice"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-rose-900/60 bg-red-50/80 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-red-950 dark:text-rose-200 hover:bg-red-100 dark:hover:bg-rose-900/50 transition"
                      >
                        <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />
                        <span>{topic.subject}: {topic.category}</span>
                        <span className="text-[10px] text-red-700 dark:text-rose-300 bg-white/80 dark:bg-rose-950/80 px-1.5 py-0.5 rounded">
                          {Math.round(topic.mastery * 100)}% mastery
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-indigo-200/80 dark:border-indigo-800/60 bg-white/70 dark:bg-[#070e1b]/60 p-5 text-center">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    No verified CBT diagnostic attempts recorded yet.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                    Complete your first timed practice or subject drill to unlock your predicted examination standing and personalized syllabus weak spots.
                  </p>
                  <div className="mt-3">
                    <Link
                      href="/cbt"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      <span>Take Diagnostic CBT Drill</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Daily 10-Minute Spaced Review Action Box */}
          <div className="min-h-[320px] rounded-[2rem] border border-purple-200/80 dark:border-purple-800/60 bg-gradient-to-br from-purple-50 via-white to-indigo-50/60 dark:from-[#110d24] dark:via-[#091021] dark:to-[#0d1428] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-950/70 border border-purple-200/60 dark:border-purple-800 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-purple-900 dark:text-purple-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a4 4 0 0 0-4 4c0 .8.2 1.5.7 2.1L8 10a4 4 0 0 0 4 4 4 4 0 0 0 4-4l-.7-1.9c.5-.6.7-1.3.7-2.1a4 4 0 0 0-4-4Z" /><path d="M12 14v8" /><path d="M9 18h6" /></svg>
                <span>Daily Retention</span>
              </div>
              <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">10-Minute Spaced Review</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Review questions you previously missed before they fade from memory.
              </p>
              <div className="mt-4 rounded-2xl bg-white dark:bg-[#070e1b] border border-purple-100 dark:border-purple-900/50 p-4 shadow-sm text-center">
                <p className="text-3xl font-black text-purple-950 dark:text-purple-200 tabular-nums">{dueSpacedCount}</p>
                <p className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wide mt-0.5">
                  {dueSpacedCount === 1 ? "Question Due Today" : "Questions Due Today"}
                </p>
              </div>
            </div>
            <Link
              href="/learning/revision"
              className="mt-4 block w-full rounded-xl bg-[#061a3a] dark:bg-purple-600 py-3 text-center text-xs font-black text-white hover:bg-[#123566] dark:hover:bg-purple-500 transition shadow-sm"
            >
              Start 10-Min Review →
            </Link>
          </div>
        </section>

        {/* Personal Study Report & Performance Radar Card */}
        <section aria-label="Study Report Card" className="rounded-[2rem] border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/80 via-white to-cyan-50/60 dark:from-[#071329] dark:via-[#081021] dark:to-[#051c2e] p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#012153] dark:bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 shadow-sm">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-900 dark:text-cyan-300">
                    Candidate Analytics
                  </span>
                  <span className="text-xs text-slate-400 font-bold">•</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cognitive Radar &amp; Mastery Matrix</span>
                </div>
                <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  Comprehensive Candidate Study Report
                </h3>
                <p className="mt-1 max-w-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Track cognitive processing speed, subject syllabus completion, retention benchmarks, and download your printable verified examination performance slip.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/skills-passport"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#012153] dark:bg-cyan-600 px-5 py-2.5 text-xs font-black text-white hover:bg-blue-950 dark:hover:bg-cyan-500 transition shadow-sm hover:-translate-y-0.5 active:scale-95"
              >
                <span>Open Study Report</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* "Pick up where you left off" Continuity Strip */}
        {(recentExam || activePlan || recentLesson) && (
          <section aria-labelledby="resume-heading" className="rounded-[2rem] border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-[#071124] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-blue-900 dark:text-cyan-400">Resume your study</p>
                <h2 id="resume-heading" className="mt-0.5 text-xl font-black text-slate-950 dark:text-white">
                  Pick up where you left off
                </h2>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentExam && (
                <div className="flex min-h-[190px] flex-col justify-between rounded-2xl border border-white/80 dark:border-slate-800 bg-white dark:bg-[#0c1527] p-5 shadow-sm">
                  <div>
                    <span className="rounded-full bg-blue-100 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-900 dark:text-cyan-300">
                      Recent CBT Exam
                    </span>
                    <h3 className="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
                      Score: {recentExam.score} / {recentExam.total}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Review explanations and targeted test strategies.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold">
                    <Link
                      href="/corrections"
                      className="text-blue-700 dark:text-cyan-400 hover:text-blue-900 dark:hover:text-cyan-300"
                    >
                      Corrections →
                    </Link>
                    <Link
                      href="/student/exams"
                      className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="8" r="6" />
                        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                      </svg>
                      <span>Certificates &amp; History →</span>
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

        {/* Learning Paths */}
        <section aria-labelledby="spaces-heading">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800 dark:text-cyan-400">
              Made for your next step
            </p>
            <h2 id="spaces-heading" className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Choose your learning path
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Structured learning spaces tailored for high retention, live collaboration, and active practice.
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <article
                key={space.href}
                className={`group relative overflow-hidden flex min-h-[285px] flex-col justify-between rounded-[2rem] border ${space.border} bg-gradient-to-br ${space.gradient} bg-white dark:bg-[#091021] p-6 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${space.hoverShadow}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${space.badgeBg} text-sm font-black border shadow-xs`}>
                      {space.number}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Study Space
                    </span>
                  </div>
                  <p className="mt-4 text-[10px] font-black tracking-[0.16em] uppercase text-blue-700 dark:text-cyan-400">
                    {space.eyebrow}
                  </p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">{space.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {space.description}
                  </p>
                </div>
                <Link
                  href={space.href}
                  className="mt-5 inline-flex min-h-10 items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs font-black text-slate-900 dark:text-cyan-400 group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition"
                >
                  <span>{space.action}</span>
                  <span aria-hidden="true" className="transition group-hover:translate-x-1 font-bold">
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
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800 dark:text-cyan-400">
              Practice &amp; Assessment Tools
            </p>
            <h2 id="tools-heading" className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              CBT Practice &amp; Quizzes
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Targeted diagnostic drills, timed national examination simulations, and live competitive tournaments.
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <article className="group relative overflow-hidden flex min-h-[265px] flex-col justify-between rounded-[2rem] border border-indigo-200/80 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 dark:from-slate-900 dark:to-[#0c1527] p-5 transition duration-200 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md hover-lift">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <h3 className="mt-3 text-base font-black text-slate-950 dark:text-white">Self Practice</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  Choose your subjects and question count, practise with unique random questions.
                </p>
              </div>
              <Link
                href="/self-practice"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#012153] dark:bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-900 dark:hover:bg-indigo-500 active-press hover-lift"
              >
                Start Practice →
              </Link>
            </article>

            <article className="group relative overflow-hidden flex min-h-[265px] flex-col justify-between rounded-[2rem] border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 dark:from-slate-900 dark:to-[#0c1527] p-5 transition duration-200 hover:border-amber-300 dark:hover:border-amber-500/50 hover:shadow-md hover-lift">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </span>
                <h3 className="mt-3 text-base font-black text-slate-950 dark:text-white">Organisation Assessments</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  Participate in published organisation tests, school term assessments, and timed curriculum quizzes.
                </p>
              </div>
              <Link
                href="/assessments"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#012153] dark:bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-900 dark:hover:bg-amber-500 active-press hover-lift"
              >
                Browse Assessments →
              </Link>
            </article>

            <article className="group relative overflow-hidden flex min-h-[265px] flex-col justify-between rounded-[2rem] border border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/60 via-white to-amber-50/30 dark:from-slate-900 dark:to-[#0c1527] p-5 transition duration-200 hover:border-rose-300 dark:hover:border-rose-500/50 hover:shadow-md hover-lift">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm shadow-rose-600/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </span>
                <div className="flex items-center gap-2 mt-3">
                  <h3 className="text-base font-black text-slate-950 dark:text-white">Competition Arena</h3>
                  <span className="rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 px-2 py-0.5 text-[9px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                    2× XP
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  Live head-to-head sprint duels, speed tournament matches, and national leaderboard challenges.
                </p>
              </div>
              <Link
                href="/challenge-arena"
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition active-press hover-lift"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-amber-200" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Enter Arena →</span>
              </Link>
            </article>

            <article className="group relative overflow-hidden flex min-h-[265px] flex-col justify-between rounded-[2rem] border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 dark:from-slate-900 dark:to-[#0c1527] p-5 transition duration-200 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md hover-lift">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                </span>
                <h3 className="mt-3 text-base font-black text-slate-950 dark:text-white">Revision Planner</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  Set a study goal, add topics and track your revision checklist. Saved to your account across devices.
                </p>
              </div>
              <Link
                href="/learning/revision"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#012153] dark:bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-900 dark:hover:bg-blue-500 active-press hover-lift"
              >
                Open Planner →
              </Link>
            </article>

            <article className="group relative overflow-hidden flex min-h-[265px] flex-col justify-between rounded-[2rem] border border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 dark:from-slate-900 dark:to-[#0c1527] p-5 transition duration-200 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-md hover-lift">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="7.5" cy="15.5" r="5.5" />
                    <path d="m21 2-9.6 9.6" />
                    <path d="m15.5 7.5 3 3L22 7l-3-3" />
                  </svg>
                </span>
                <h3 className="mt-3 text-base font-black text-slate-950 dark:text-white">My Access &amp; Code</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  View your active membership, allowed question limits, and redeem access codes.
                </p>
              </div>
              <Link
                href="/account/access"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#081021] px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition active-press"
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
      <DeviceNotificationPrompt />
      <StudentGoalWizard
        isOpen={showGoalWizard}
        onClose={() => {
          setShowGoalWizard(false);
          try {
            localStorage.setItem("brainlab_goal_wizard_dismissed", "true");
          } catch {}
        }}
        currentProfile={studentProfile}
        onSaved={() => window.location.reload()}
      />
      <StudentCommandPalette
        isOpen={showSearchPalette}
        onClose={() => setShowSearchPalette(false)}
      />
    </main>
  );
}
