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
    href: "/cbt",
    action: "Open CBT practice",
  },
  {
    number: "04",
    eyebrow: "LIVE INTERACTIVE CLASSES",
    title: "Live Academic Classroom",
    description: "Join scheduled tutor sessions, participate with audio/chat, and watch lecture recordings.",
    href: "/classroom",
    action: "Enter Classroom Hub →",
  },
  {
    number: "05",
    eyebrow: "STUDY COMMUNICATION",
    title: "Messages & Voice Notes",
    description: "Direct discussions with course tutors, audio note review, and study group communication.",
    href: "/messages",
    action: "Open Messages",
  },
  {
    number: "06",
    eyebrow: "CONTINUOUS ASSESSMENT",
    title: "Assignments & Homework",
    description: "Submit written tasks, record oral solutions, and receive tutor grades with audio critiques.",
    href: "/assignments",
    action: "View Assignments",
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

  useEffect(() => {
    let active = true;
    async function loadRecentAttempt() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser || !active) return;

        // Fetch authoritative recent attempt from learning_test_attempts
        const { data: attempts } = await supabase
          .from("learning_test_attempts")
          .select("id, score, total_marks, status, submitted_at")
          .eq("student_id", currentUser.id)
          .order("submitted_at", { ascending: false })
          .limit(1);

        if (active && attempts && attempts[0]) {
          setRecentExam({
            result_id: attempts[0].id,
            score: attempts[0].score || 0,
            total: attempts[0].total_marks || 100,
            status: attempts[0].status,
          });
        }
      } catch {
        // Honest defensive handling
      }
    }
    void loadRecentAttempt();
    return () => {
      active = false;
    };
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
        router.replace("/login?redirect=/dashboard");
        return;
      }

      setUser(currentUser);

      // Fetch authentic progress data via consolidated Data Access Layer
      try {
        void getTopicMasteryRecords().then((list) => {
          if (list.length) setReadiness(calculateExamReadiness(list));
        });
        void getDueSpacedReviews().then((cards) => setDueSpacedCount(cards.length));
        void getUserGamificationProfile(currentUser.id).then((gp) => {
          if (active && gp) setGamification(gp);
        });

        void supabase
          .from("community_group_memberships")
          .select("group_role, status, group:community_groups(id, slug, name, icon_emoji, category)")
          .eq("user_id", currentUser.id)
          .eq("status", "active")
          .limit(3)
          .then(({ data }) => {
            if (active && data) setUserCohorts(data);
          });

        const summary = await getLearnerDashboardSummary(
          currentUser.id,
          recentExam ? recentExam.total : 0
        );

        if (!active) return;

        setStats(summary.stats);
        if (summary.activePlan) setActivePlan(summary.activePlan);
        if (summary.recentLesson) setRecentLesson(summary.recentLesson);
        if (summary.adminRole) setAdminRole(summary.adminRole);
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
                <span>👨‍🏫 Open Instructor Studio</span>
              </Link>
            </div>
          </div>
        )}

        {/* Migrated Student Verified Upgrade Banner (Decision D6) */}
        <MigratedStudentBanner />

        {/* Luxury Glassmorphic Learner Welcome Hero Card */}
        <section
          aria-label="Welcome Hero"
          className="relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-[#061129] via-[#0b1c45] to-[#04091a] p-6 sm:p-8 lg:p-10 text-white shadow-[0_25px_60px_-15px_rgba(2,12,38,0.5)] backdrop-blur-2xl transition-all"
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
                  {firstName ? <span>, {firstName}! ✨</span> : <span>, Scholar! ✨</span>}
                  {user && <UserBadges userId={user.id} size="sm" maxVisible={3} />}
                </h1>

                <p className="mt-1.5 max-w-xl text-xs sm:text-sm text-blue-100/80 leading-relaxed font-medium">
                  Welcome to your academic sanctuary. Track topic mastery, complete daily quests, and prepare to ace your exams.
                </p>

                {/* Student Ambition & Vibe Badges */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {studentProfile.targetCourse && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/25 border border-blue-400/40 px-3 py-1 font-bold text-cyan-200 backdrop-blur-md">
                      <span>🎯</span> {studentProfile.targetCourse}
                    </span>
                  )}
                  {studentProfile.dreamSchool && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500/25 border border-indigo-400/40 px-3 py-1 font-bold text-indigo-200 backdrop-blur-md">
                      <span>🏛️</span> {studentProfile.dreamSchool}
                    </span>
                  )}
                  {studentProfile.targetScore && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/25 border border-amber-400/40 px-3 py-1 font-bold text-amber-200 backdrop-blur-md">
                      <span>⭐</span> Goal: {studentProfile.targetScore}
                    </span>
                  )}
                  {studentProfile.studyVibe && (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-500/25 border border-purple-400/40 px-3 py-1 font-bold text-purple-200 backdrop-blur-md">
                      <span>✨</span> {studentProfile.studyVibe}
                    </span>
                  )}
                  {!studentProfile.targetCourse && !studentProfile.dreamSchool && (
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-cyan-400/50 bg-cyan-400/10 px-3 py-1 font-bold text-cyan-200 hover:bg-cyan-400/20 backdrop-blur-md transition"
                    >
                      <span>✨ Customise your dream school, course & avatar</span>
                      <span>→</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Right Status Cluster: Level & Streak & Live Presence */}
            <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
              <ActivePresenceBar activityContext="Studying on Learner Dashboard" variant="pill" />
              {gamification && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2 backdrop-blur-md shadow-inner">
                    <span className="text-base">⭐</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-cyan-200 leading-none">Level {gamification.current_level}</p>
                      <p className="text-xs font-black text-white mt-0.5">{gamification.lifetime_xp.toLocaleString()} XP</p>
                    </div>
                  </div>
                  <LearningStreakCard
                    currentStreak={gamification.current_streak_days}
                    longestStreak={gamification.longest_streak_days}
                    lastActiveDate={gamification.last_activity_date}
                    compact={true}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Quick-Launch Interactive Action Strip */}
          <div className="relative mt-7 pt-5 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/cbt"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 px-4 py-2 text-xs font-black transition active:scale-95 shadow-md shadow-cyan-500/20"
              >
                <span>✍️</span>
                <span>Launch CBT Practice</span>
              </Link>
              <Link
                href="/ai-learning"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-bold transition active:scale-95 backdrop-blur-md"
              >
                <span>🤖</span>
                <span>AI Study Mission</span>
              </Link>
              <Link
                href="/community"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-bold transition active:scale-95 backdrop-blur-md"
              >
                <span>👥</span>
                <span>Communities</span>
              </Link>
              <Link
                href="/challenge-arena"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 px-3.5 py-2 text-xs font-bold transition active:scale-95 backdrop-blur-md"
              >
                <span>⚡</span>
                <span>Arena (2× XP)</span>
              </Link>
              <Link
                href="/classroom/BL-LIVE-101"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 px-3.5 py-2 text-xs font-bold transition active:scale-95 backdrop-blur-md"
              >
                <span>🎥</span>
                <span>Live Stage</span>
              </Link>
              <Link
                href="/resources"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-bold transition active:scale-95 backdrop-blur-md"
              >
                <span>📐</span>
                <span>Formulas</span>
              </Link>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-cyan-200">
              <Link href="/leaderboard" className="hover:text-white transition inline-flex items-center gap-1">
                <span>🏆</span> Leaderboard
              </Link>
              <span className="text-white/30">·</span>
              <Link href="/learning/achievements" className="hover:text-white transition inline-flex items-center gap-1">
                <span>🎖️</span> Badges &amp; Streaks
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
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ExamCountdownBanner
              variant="dashboard"
              studentProgramme={user?.user_metadata?.programme || user?.user_metadata?.target_exam}
              showCta={true}
            />
          </div>
          <div className="lg:col-span-4">
            <WhatsAppChannelHeroBanner variant="card" />
          </div>
        </div>

        {/* Phase 5: Unified Daily Learning Feed & Cohort Quests */}
        <DailyLearningFeedWidget />

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
            <div className="group rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/70 p-4 transition duration-200 hover:border-blue-300 hover:shadow-sm hover-lift">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Lessons Completed</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10" />
                    <path d="M6 10h10" />
                  </svg>
                </span>
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900 tabular-nums">
                {stats.lessonsCompleted > 0 ? stats.lessonsCompleted : "0"}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                {stats.lessonsCompleted > 0 ? "Saved across devices" : "Start in Learning Hub"}
              </p>
            </div>

            <div className="group rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/70 p-4 transition duration-200 hover:border-sky-300 hover:shadow-sm hover-lift">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Practice Questions</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 11 3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </span>
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900 tabular-nums">
                {stats.questionsPracticed > 0 ? stats.questionsPracticed : "0"}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                {stats.questionsPracticed > 0 ? "Attempted & reviewed" : "CBT & Self Practice"}
              </p>
            </div>

            <div className="group rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/70 p-4 transition duration-200 hover:border-emerald-300 hover:shadow-sm hover-lift">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Revision Checklist</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900 tabular-nums">
                {stats.revisionTasksTotal > 0
                  ? `${stats.revisionTasksCompleted}/${stats.revisionTasksTotal}`
                  : "—"}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                {stats.revisionTasksTotal > 0
                  ? `${Math.round((stats.revisionTasksCompleted / stats.revisionTasksTotal) * 100)}% checklist complete`
                  : "Plan not yet created"}
              </p>
            </div>

            <div className="group rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/70 p-4 transition duration-200 hover:border-purple-300 hover:shadow-sm hover-lift">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Practice Limit</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900 tabular-nums">
                {stats.maxQuestions}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg><span>Exam Readiness Intelligence</span>
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
                    {readiness ? readiness.predictedJambScore : "—"} {readiness && <span className="text-xs text-slate-400 font-bold">/ 400</span>}
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">WAEC / NECO</span>
                  <span className="text-2xl font-black text-emerald-700">
                    {readiness ? `${readiness.predictedWaecPercent}%` : "—"}
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
                      <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />
                      <span>{topic.subject}: {topic.category}</span>
                      <span className="text-[10px] text-red-700 bg-white/80 px-1.5 py-0.5 rounded">
                        {Math.round(topic.mastery * 100)}% mastery
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-indigo-200/80 bg-white/70 p-4 text-center">
                <p className="text-xs font-semibold text-slate-600">
                  No verified CBT diagnostic attempts recorded yet.
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Complete your first timed practice or subject drill to unlock your predicted examination standing and personalized syllabus weak spots.
                </p>
                <div className="mt-3">
                  <Link
                    href="/cbt"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 px-4 py-2 text-xs font-bold text-white transition shadow-xs"
                  >
                    <span>✍️ Take Diagnostic CBT Drill</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Daily 10-Minute Spaced Review Action Box */}
          <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50/60 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-purple-900">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a4 4 0 0 0-4 4c0 .8.2 1.5.7 2.1L8 10a4 4 0 0 0 4 4 4 4 0 0 0 4-4l-.7-1.9c.5-.6.7-1.3.7-2.1a4 4 0 0 0-4-4Z" /><path d="M12 14v8" /><path d="M9 18h6" /></svg><span>Daily Retention</span>
              </div>
              <h3 className="mt-2 text-lg font-black text-slate-900">10-Minute Spaced Review</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
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

        {/* Personal Study Report & Performance Radar Card */}
        <section aria-label="Study Report Card" className="rounded-3xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-cyan-50/60 p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#012153] text-cyan-300 shadow-sm"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg></div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-900">
                    Candidate Analytics
                  </span>
                  <span className="text-xs text-slate-400 font-bold">•</span>
                  <span className="text-xs font-semibold text-slate-500">Cognitive Radar &amp; Mastery Matrix</span>
                </div>
                <h3 className="mt-1 text-lg font-black text-slate-900">
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#012153] px-5 py-2.5 text-xs font-black text-white hover:bg-blue-950 transition shadow-sm hover:-translate-y-0.5 active:scale-95"
              >
                <span>Open Study Report</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
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
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold">
                    <Link
                      href="/corrections"
                      className="text-blue-700 hover:text-blue-900"
                    >
                      Corrections →
                    </Link>
                    <Link
                      href="/student/exams"
                      className="text-amber-700 hover:text-amber-900"
                    >
                      📜 Certificates &amp; History →
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
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <article
                key={space.href}
                className="group flex min-h-[240px] flex-col rounded-3xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-[#0c1527] p-6 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-blue-300 dark:hover:border-cyan-500/40 hover:shadow-md hover-lift"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-sm font-black text-blue-700 dark:text-cyan-400 border border-blue-200/60 dark:border-blue-800">
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
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {space.description}
                </p>
                <Link
                  href={space.href}
                  className="mt-4 inline-flex min-h-10 items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs font-black text-blue-700 dark:text-cyan-400 group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition"
                >
                  <span>{space.action}</span>
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
            <article className="group rounded-3xl border border-indigo-200/80 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/70 to-white dark:from-slate-900 dark:to-[#0c1527] p-5 transition duration-200 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md hover-lift flex flex-col justify-between">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <h3 className="mt-3 text-base font-black text-slate-950">Self Practice</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  Choose your subjects and question count, practise with unique random questions.
                </p>
              </div>
              <Link
                href="/self-practice"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#012153] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-900 active-press hover-lift"
              >
                Start Practice →
              </Link>
            </article>

            <article className="group rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/60 to-white dark:from-slate-900 dark:to-[#0c1527] p-5 transition duration-200 hover:border-amber-300 dark:hover:border-amber-500/50 hover:shadow-md hover-lift flex flex-col justify-between">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </span>
                <h3 className="mt-3 text-base font-black text-slate-950">Quizzes &amp; Contests</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  Participate in published organisation quizzes and competition assessments.
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/challenge-arena"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:from-blue-500 hover:to-indigo-500 transition active-press"
                >
                  ⚡ Competition Arena →
                </Link>
                <Link
                  href="/assessments"
                  className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Browse Quizzes →
                </Link>
              </div>
            </article>

            <article className="group rounded-3xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/70 to-white dark:from-slate-900 dark:to-[#0c1527] p-5 transition duration-200 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md hover-lift flex flex-col justify-between">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                </span>
                <h3 className="mt-3 text-base font-black text-slate-950">Revision Planner</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  Set a study goal, add topics and track your revision checklist. Saved to your account across devices.
                </p>
              </div>
              <Link
                href="/learning/revision"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#012153] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-900 active-press hover-lift"
              >
                Open Planner →
              </Link>
            </article>

            <article className="group rounded-3xl border border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/60 to-white dark:from-slate-900 dark:to-[#0c1527] p-5 transition duration-200 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-md hover-lift flex flex-col justify-between">
              <div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="7.5" cy="15.5" r="5.5" />
                    <path d="m21 2-9.6 9.6" />
                    <path d="m15.5 7.5 3 3L22 7l-3-3" />
                  </svg>
                </span>
                <h3 className="mt-3 text-base font-black text-slate-950">My Access &amp; Code</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  View your active membership, allowed question limits, and redeem access codes.
                </p>
              </div>
              <Link
                href="/account/access"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition active-press"
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
    </main>
  );
}
