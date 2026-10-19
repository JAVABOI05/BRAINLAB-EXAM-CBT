"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useLearnerTheme } from "../components/LearnerThemeProvider";

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
    title: "CBT practice",
    description: "Enter the existing exam portal and follow its access-code and exam instructions.",
    href: "/login",
    action: "Open CBT practice",
  },
];

export default function LearnerDashboardPage() {
  const router = useRouter();
  const { resolvedTheme } = useLearnerTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadAccount() {
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
      setLoading(false);
    }
    void loadAccount().catch(() => {
      if (active) {
        setLoading(false);
        router.replace("/account");
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main id="main" className="min-h-[70vh] px-5 py-16">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="mt-4 h-12 max-w-md rounded-2xl bg-slate-200" />
          <div className="mt-6 h-56 rounded-3xl bg-slate-200" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="h-44 rounded-2xl bg-slate-200" />
            <div className="h-44 rounded-2xl bg-slate-200" />
            <div className="h-44 rounded-2xl bg-slate-200" />
          </div>
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
          <Link
            href="/profile"
            className="group inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            {avatar && typeof avatar === "string" && /^https:\/\//i.test(avatar) ? (
              <img
                src={avatar}
                alt=""
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dbeafe] text-xs font-black text-[#12346b]"
              >
                {initials(fullName || "BL")}
              </span>
            )}
            <span className="text-sm font-semibold text-slate-700">
              {fullName || "Your profile"}
            </span>
            <span
              aria-hidden="true"
              className="text-slate-400 transition group-hover:translate-x-0.5"
            >
              ↗
            </span>
          </Link>
        </div>

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
                  Explore Learning Hub <span aria-hidden="true">↗</span>
                </Link>
                <Link
                  href="/learning/revision"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Open my study planner
                </Link>
              </div>
            </div>
            <div className="relative rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-blue-100">Your next step</span>
                <span className="rounded-full bg-cyan-200/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-100">
                  Start here
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

        {/* Practice & Resources Grid */}
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
                Set a study goal, add topics and track your revision checklist day by day.
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
              <h3 className="mt-2 text-base font-bold text-slate-950">Redeem Code</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">
                Activate an access code issued for tutorials, memberships, or assessments.
              </p>
              <Link
                href="/redeem-access"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
              >
                Redeem Code →
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
