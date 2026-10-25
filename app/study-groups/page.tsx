"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

interface StudyCircle {
  id: string;
  name: string;
  tagline: string;
  category: "Medicine" | "Engineering" | "Law & Arts" | "Commercial" | "Elite Sprint";
  icon: string;
  badge: string;
  membersCount: number;
  leadTutor: string;
  weeklyFocus: string;
  coreSubjects: string[];
  scheduleTime: string;
}

const STUDY_CIRCLES: StudyCircle[] = [
  {
    id: "med-circle",
    name: "JAMB Medicine & Health Sciences Guild",
    tagline: "Dedicated to candidates targeting 320+ aggregate for Medicine, Pharmacy, Nursing, and Dentistry.",
    category: "Medicine",
    icon: "🩺",
    badge: "320+ TARGET",
    membersCount: 428,
    leadTutor: "Dr. A. Adebayo (Senior Biology/Chemistry Faculty)",
    weeklyFocus: "Mendelian Genetics, Blood Grouping & Gas Stoichiometry",
    coreSubjects: ["English", "Biology", "Chemistry", "Physics"],
    scheduleTime: "Tuesdays & Thursdays · 7:00 PM",
  },
  {
    id: "eng-circle",
    name: "Engineering & Physical Sciences Circle",
    tagline: "Rigorous analytical drills for Electrical, Mechanical, Civil, and Computer Engineering aspirants.",
    category: "Engineering",
    icon: "⚙️",
    badge: "300+ TARGET",
    membersCount: 386,
    leadTutor: "Engr. F. Okon (Applied Mathematics & Physics Lead)",
    weeklyFocus: "Differential Calculus, Projectile Motion & Ohm's Circuitry",
    coreSubjects: ["English", "Mathematics", "Physics", "Chemistry"],
    scheduleTime: "Mondays & Wednesdays · 6:30 PM",
  },
  {
    id: "law-circle",
    name: "Law, Arts & Social Sciences Squad",
    tagline: "High-yield vocabulary, literary analysis, and government constitutional structures.",
    category: "Law & Arts",
    icon: "⚖️",
    badge: "290+ TARGET",
    membersCount: 294,
    leadTutor: "Barr. C. Eze (Literature & Government Faculty)",
    weeklyFocus: "Constitutional Separation of Powers & Grammatical Concord",
    coreSubjects: ["English", "Literature", "Government", "CRS/IRS"],
    scheduleTime: "Wednesdays & Fridays · 5:00 PM",
  },
  {
    id: "comm-circle",
    name: "Commercial, Accounting & Economics Forum",
    tagline: "Macro/micro economics, business law, and commercial mathematics speed tactics.",
    category: "Commercial",
    icon: "📊",
    badge: "280+ TARGET",
    membersCount: 245,
    leadTutor: "Mrs. K. Ibrahim (Senior Economics Specialist)",
    weeklyFocus: "Price Elasticity of Demand & National Income Accounting",
    coreSubjects: ["English", "Mathematics", "Economics", "Commerce"],
    scheduleTime: "Tuesdays & Saturdays · 4:00 PM",
  },
  {
    id: "sprint-circle",
    name: "UTME 300+ Elite Speed Sprint Squad",
    tagline: "Fast-paced cross-disciplinary past question blitz for ambitious scholarship candidates.",
    category: "Elite Sprint",
    icon: "⚡",
    badge: "DAILY SPRINT",
    membersCount: 512,
    leadTutor: "BrainLab Academic Master Tutors",
    weeklyFocus: "5-Minute Timed Arena Challenges & Time-Per-Question Velocity",
    coreSubjects: ["Cross-Disciplinary All Subjects"],
    scheduleTime: "Daily Sprints · Anytime in Arena",
  },
];

const LOCAL_JOINED_CIRCLES_KEY = "brainlab_joined_study_circles_v1";
const DEFAULT_JOINED_CIRCLES = JSON.stringify(["sprint-circle"]);
const JOINED_CIRCLES_CHANGE_EVENT = "brainlab:joined-circles-change";

function subscribeJoinedCircles(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(JOINED_CIRCLES_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(JOINED_CIRCLES_CHANGE_EVENT, onStoreChange);
  };
}

function getJoinedCirclesSnapshot(): string {
  try {
    return window.localStorage.getItem(LOCAL_JOINED_CIRCLES_KEY) ?? DEFAULT_JOINED_CIRCLES;
  } catch {
    return DEFAULT_JOINED_CIRCLES;
  }
}

function getServerJoinedCirclesSnapshot(): string {
  return DEFAULT_JOINED_CIRCLES;
}

export default function StudyGroupsPage() {
  const joinedCirclesSnapshot = useSyncExternalStore(
    subscribeJoinedCircles,
    getJoinedCirclesSnapshot,
    getServerJoinedCirclesSnapshot,
  );
  const joinedCircleIds = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(joinedCirclesSnapshot);
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : ["sprint-circle"];
    } catch {
      return ["sprint-circle"];
    }
  }, [joinedCirclesSnapshot]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"circles" | "rules">("circles");


  const handleToggleJoin = (circleId: string) => {
    let next: string[];
    if (joinedCircleIds.includes(circleId)) {
      next = joinedCircleIds.filter((id) => id !== circleId);
    } else {
      next = [...joinedCircleIds, circleId];
    }
    try {
      localStorage.setItem(LOCAL_JOINED_CIRCLES_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(JOINED_CIRCLES_CHANGE_EVENT));
    } catch {}
  };

  const filteredCircles = STUDY_CIRCLES.filter((circle) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "joined") return joinedCircleIds.includes(circle.id);
    return circle.category === selectedCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Header Breadcrumb */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/dashboard" className="hover:text-blue-700 dark:hover:text-cyan-400">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-200">Community</span>
              <span>/</span>
              <span className="text-blue-700 dark:text-cyan-400">Study Groups &amp; Circles</span>
            </nav>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white flex items-center gap-3">
              <span>👥 Moderated Study Circles</span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 px-3 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                COHORT LEARNING
              </span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Connect with peers aspiring to your chosen faculty, participate in weekly tutor-moderated discussions, and conquer target score milestones together.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/messages"
              className="inline-flex items-center gap-2 rounded-xl bg-[#012153] hover:bg-blue-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
            >
              <span>💬</span> Messages &amp; Chat
            </Link>
            <Link
              href="/classroom/BL-LIVE-101"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
            >
              <span>🎥</span> Live Room
            </Link>
          </div>
        </div>

        {/* Tab Switcher & Filter Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Study Circles" },
              { id: "joined", label: `My Joined Circles (${joinedCircleIds.length})` },
              { id: "Medicine", label: "🩺 Medicine" },
              { id: "Engineering", label: "⚙️ Engineering" },
              { id: "Law & Arts", label: "⚖️ Law & Arts" },
              { id: "Commercial", label: "📊 Commercial" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-150 active:scale-95 ${
                  selectedCategory === cat.id
                    ? "bg-[#012153] text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("circles")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "circles"
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Browse Groups
            </button>
            <button
              onClick={() => setActiveTab("rules")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "rules"
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Community Code of Conduct
            </button>
          </div>
        </div>

        {/* CIRCLES DIRECTORY TAB */}
        {activeTab === "circles" && (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredCircles.map((circle) => {
              const isJoined = joinedCircleIds.includes(circle.id);
              return (
                <div
                  key={circle.id}
                  className={`flex flex-col justify-between rounded-3xl border p-6 shadow-sm transition ${
                    isJoined
                      ? "border-emerald-300 dark:border-emerald-700/80 bg-white dark:bg-slate-900 ring-2 ring-emerald-500/10"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-2xl">
                          {circle.icon}
                        </span>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {circle.category} Cohort
                          </span>
                          <h3 className="text-base font-black text-slate-950 dark:text-white">
                            {circle.name}
                          </h3>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          isJoined
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-cyan-300 border border-blue-200 dark:border-blue-800"
                        }`}
                      >
                        {circle.badge}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {circle.tagline}
                    </p>

                    {/* Metadata Specs */}
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Faculty Lead:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{circle.leadTutor}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Active Members:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          👥 {circle.membersCount + (isJoined ? 1 : 0)} Enrolled Learners
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Live Stage Session:</span>
                        <span className="font-semibold text-blue-700 dark:text-cyan-300">
                          {circle.scheduleTime}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block mb-1">
                          Current Weekly Focus:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          🎯 {circle.weeklyFocus}
                        </span>
                      </div>
                    </div>

                    {/* Subject Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {circle.coreSubjects.map((sub) => (
                        <span
                          key={sub}
                          className="rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-cyan-300"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => handleToggleJoin(circle.id)}
                      className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-150 active:scale-95 ${
                        isJoined
                          ? "border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100"
                          : "bg-[#012153] hover:bg-blue-900 text-white shadow-sm"
                      }`}
                    >
                      {isJoined ? "✓ Joined · Leave Circle" : "+ Join Study Circle"}
                    </button>

                    <div className="flex items-center gap-2">
                      <Link
                        href="/messages"
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                      >
                        💬 Chat
                      </Link>
                      <Link
                        href="/challenge-arena"
                        className="rounded-xl bg-amber-400 hover:bg-amber-300 px-3 py-2 text-xs font-black text-slate-950 transition active:scale-95"
                      >
                        ⚡ Squad Sprint
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* COMMUNITY CODE OF CONDUCT TAB */}
        {activeTab === "rules" && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-cyan-400">
                Safe Academic Environment
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mt-1">
                BrainLab Study Circle Guidelines
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                To keep our study circles productive, supportive, and focused on examination excellence:
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">1. Academic Focus Only</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Discussions are strictly dedicated to past question solutions, study techniques, formula clarity, and syllabus topics.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">2. Mutual Respect &amp; Encouragement</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Every candidate is here to improve. Ridiculing mistaken answers or difficult topics is strictly prohibited.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">3. Zero Spam or Solicitations</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Sharing unsolicited promotional links, commercial services, or fraudulent examination &quot;runz&quot; results in immediate permanent ban.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">4. Verified Faculty Moderation</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  All circles are overseen by senior BrainLab subject tutors who review shared solutions and lead live revision rooms.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">Need to report inappropriate behavior?</span>
              <a
                href="https://wa.me/2349074310204?text=Hello%20BrainLab%20Moderation%2C%20I%20would%20like%20to%20report%20an%20issue."
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline"
              >
                Contact Moderation Desk →
              </a>
            </div>
          </div>
        )}
      </main>

          </div>
  );
}
