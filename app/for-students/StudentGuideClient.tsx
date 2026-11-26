"use client";

import React, { useState } from "react";
import Link from "next/link";

interface SubjectSlider {
  name: string;
  score: number;
}

export function StudentGuideClient() {
  // Pacing Planner State
  const [faculty, setFaculty] = useState<"sciences" | "engineering" | "arts" | "commercial">("sciences");
  const [englishScore, setEnglishScore] = useState<number>(76);
  const [sub2Score, setSub2Score] = useState<number>(82);
  const [sub3Score, setSub3Score] = useState<number>(78);
  const [sub4Score, setSub4Score] = useState<number>(80);

  // Active Roadmap Phase Tab
  const [activePhase, setActivePhase] = useState<number>(0);

  const aggregateScore = englishScore + sub2Score + sub3Score + sub4Score;

  let standingBadge = "";
  let standingColor = "";
  let admissionAdvice = "";

  if (aggregateScore >= 310) {
    standingBadge = "Tier 1 Elite (Top 2% Nationwide)";
    standingColor = "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800";
    admissionAdvice = "Directly competitive for Medicine, Pharmacy, Nursing, and Law at Premier Universities (UNILAG, UI, OAU, ABU).";
  } else if (aggregateScore >= 280) {
    standingBadge = "Tier 1 High (Top 8% Nationwide)";
    standingColor = "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800";
    admissionAdvice = "Highly competitive for Computer Science, Electrical Engineering, and Accounting across top Federal Institutions.";
  } else if (aggregateScore >= 250) {
    standingBadge = "Competitive Standard (Above National Average)";
    standingColor = "text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-800";
    admissionAdvice = "Solid admission profile for Biological Sciences, Management Sciences, and Humanities faculties.";
  } else {
    standingBadge = "Foundational Revision Zone";
    standingColor = "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800";
    admissionAdvice = "Focus on high-yield syllabus topics and daily 5-question Socratic drills to cross the 260+ milestone.";
  }

  const ROADMAP_PHASES = [
    {
      phase: "Phase 1: Baseline Mock",
      tagline: "Uncover Your Starting Aggregate",
      duration: "Week 1",
      deliverable: "Complete 1 full 4-subject mock test under timed 2-hour conditions.",
      actionLabel: "Launch Diagnostic Mock",
      actionHref: "/cbt",
      details: "Reveals exact percentage mastery across all four exam combinations and highlights high-error subtopics.",
    },
    {
      phase: "Phase 2: Syllabus Mastery",
      tagline: "Fill Curriculum Knowledge Gaps",
      duration: "Weeks 2 – 6",
      deliverable: "Study topic-by-topic curriculum notes and worked examples.",
      actionLabel: "Explore Official Syllabus",
      actionHref: "/syllabus",
      details: "Targets specific JAMB syllabus objectives flagged weak during your baseline test, pairing formulas with derivations.",
    },
    {
      phase: "Phase 3: Socratic AI Drills",
      tagline: "Eradicate Misconceptions",
      duration: "Weeks 7 – 10",
      deliverable: "Daily 5-question reinforcement sessions & active recall.",
      actionLabel: "Try AI Socratic Drills",
      actionHref: "/ai-learning",
      details: "Transforms errors into confident answers with pedagogical grammar rules, reaction mechanisms, and coordinate geometry hints.",
    },
    {
      phase: "Phase 4: Speed & Arena Duels",
      tagline: "Build Decisive Exam Stamina",
      duration: "Weeks 11 – 14",
      deliverable: "Sit weekly timed simulations and compete in 1v1 arena sprints.",
      actionLabel: "Join Challenge Arena",
      actionHref: "/challenge-arena",
      details: "Condition your cognitive stamina to answer 180 questions with composure and physical JAMB 8-keypad agility.",
    },
  ];

  return (
    <div className="space-y-20">
      {/* 1. Student Advantage Bento Canvas */}
      <section aria-label="Student Advantage Bento Canvas" className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/60 px-4 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
            <span>AUTHENTIC CANDIDATE CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Why Candidates Trust BrainLab Academy
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Practical engineering designed specifically to solve Nigerian examination preparation bottlenecks.
          </p>
        </div>

        {/* Compact Alternating (Zig-Zag) Feature Cards */}
        <div className="space-y-12 sm:space-y-16">
          {/* Row 1: Daily Free Full-Length Practice Test (Text Left, Visual Preview Right) */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-blue-400/50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Text Side (Span 7) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>1 Free Full Mock / Day</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Daily Free Full-Length Practice Test
                </h3>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Every registered learner can sit one full 4-subject timed CBT mock paper every single day (180 questions, 120 minutes) without paying a kobo or entering debit card details.
                </p>

                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                    <span>180 questions across your customized 4-subject UTME combination</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                    <span>Official 120-minute countdown with automatic submission</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                    <span>Authentic 8-key terminal keyboard shortcuts ([P], [N], [R], [S])</span>
                  </li>
                </ul>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    href="/cbt"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                  >
                    <span>Launch Free Practice Engine</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Resets daily at 00:00 WAT
                  </span>
                </div>
              </div>

              {/* Visual Preview Side (Span 5) */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-slate-700/80 bg-slate-950 p-5 text-white shadow-lg space-y-4">
                  {/* Cockpit Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                        JAMB CBT TERMINAL
                      </span>
                    </div>
                    <span className="font-mono text-xs font-black text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded">
                      119:42
                    </span>
                  </div>

                  {/* Subject Badges */}
                  <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[11px]">
                    <span className="py-1 px-1 rounded-md bg-blue-600 text-white font-bold shadow-xs">ENG (60)</span>
                    <span className="py-1 px-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">BIO (40)</span>
                    <span className="py-1 px-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">CHM (40)</span>
                    <span className="py-1 px-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">PHY (40)</span>
                  </div>

                  {/* Mini Question Card */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Question 14 of 60</span>
                      <span className="text-emerald-400 font-bold">Antonyms</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-snug">
                      The witness gave a <span className="underline decoration-cyan-400 font-bold">candid</span> testimony in court.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                      <span className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-300">A. Truthful</span>
                      <span className="p-1.5 rounded-lg bg-cyan-950/90 border border-cyan-500/80 text-cyan-300 font-bold">B. Evasive</span>
                      <span className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-300">C. Blunt</span>
                      <span className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-300">D. Sincere</span>
                    </div>
                  </div>

                  {/* Hardware Keycap Bar */}
                  <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-400 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[10px]">[P]</kbd>
                      <span>Prev</span>
                      <kbd className="ml-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[10px]">[N]</kbd>
                      <span>Next</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[10px]">[R]</kbd>
                      <span>Flag</span>
                      <kbd className="ml-1 px-1.5 py-0.5 rounded bg-blue-900 border border-blue-700 text-cyan-300 font-bold text-[10px]">[S]</kbd>
                      <span>Submit</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Offline Answer Auto-Sync Protection (Visual Preview Left, Text Right) */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-emerald-400/50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Visual Preview Side (Span 5 - Order 2 on mobile, Order 1 on desktop) */}
              <div className="lg:col-span-5 order-2 lg:order-1">
                <div className="rounded-2xl border border-emerald-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-4">
                  {/* Status Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                        PWA RUNTIME METER
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                      OFFLINE-READY
                    </span>
                  </div>

                  {/* Data & Bundle Specs */}
                  <div className="grid grid-cols-2 gap-2 text-center font-mono">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Client Payload</div>
                      <div className="text-base font-black text-emerald-400 mt-0.5">1.18 MB</div>
                      <div className="text-[10px] text-slate-500">Zero remote fonts</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Live Network</div>
                      <div className="text-base font-black text-cyan-400 mt-0.5">0.0 KB/s</div>
                      <div className="text-[10px] text-slate-500">Airplane mode safe</div>
                    </div>
                  </div>

                  {/* Storage Persistence Meter */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">Encrypted IndexedDB Cache</span>
                      <span className="text-emerald-400 font-bold">180 / 180 Saved</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 w-full" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Responses stored cryptographically on-device. Auto-flushes to cloud when 3G/4G returns.
                    </p>
                  </div>

                  {/* Sync Status Badge */}
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-emerald-950/50 border border-emerald-900/60 p-2.5 rounded-xl">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[11px]">Zero exam loss guaranteed during NEPA power cuts</span>
                  </div>
                </div>
              </div>

              {/* Text Side (Span 7 - Order 1 on mobile, Order 2 on desktop) */}
              <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-300 dark:border-teal-700/60 bg-teal-50 dark:bg-teal-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                  <span>Offline-First Engine</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Offline Answer Auto-Sync Protection
                </h3>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Never lose test progress due to sudden power outages, dead generator fuel, or fluctuating network bars. Responses are stored in durable device storage and synced automatically once internet restores.
                </p>

                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 text-xs font-bold">✓</span>
                    <span>Ultra-low data footprint: full client download is under 1.2 MB</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 text-xs font-bold">✓</span>
                    <span>Take complete 180-question tests on airplane mode with zero data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 text-xs font-bold">✓</span>
                    <span>Automated conflict-free reconciliation when network reconnects</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <Link
                    href="/products/cbt"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                  >
                    <span>Explore Offline Architecture</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Socratic AI Misconception Diagnostics (Text Left, Visual Preview Right) */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-purple-400/50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Text Side (Span 7) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-300 dark:border-purple-700/60 bg-purple-50 dark:bg-purple-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <span>Socratic AI Pedagogy</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  AI Misconception Diagnostics
                </h3>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Don&apos;t just read correct option letters. Understand why your chosen distractor was wrong through Socratic rule derivations and get targeted 5-question reinforcement drills.
                </p>

                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                    <span>Deconstruct examiner trap options with root-cause curriculum derivations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                    <span>Instant rule cards for grammar concord, redox balancing &amp; organic mechanisms</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                    <span>Adaptive 5-question reinforcement drills to turn errors into lasting retention</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <Link
                    href="/products/ai-learning"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                  >
                    <span>Learn About Socratic AI</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>

              {/* Visual Preview Side (Span 5) */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-purple-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-4">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                        SOCRATIC DIAGNOSTIC
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/80 px-2 py-0.5 rounded">
                      CHEMISTRY
                    </span>
                  </div>

                  {/* Distractor Deconstruction */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-rose-400 font-bold flex items-center gap-1.5">
                        <span>✕</span> Selected: [C] Basic Oxide
                      </span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span>✓</span> Correct: [B] Amphoteric
                      </span>
                    </div>

                    <div className="rounded-xl border border-purple-900/60 bg-purple-950/40 p-3 text-xs space-y-1.5 text-purple-200">
                      <div className="font-mono font-bold text-cyan-300 text-[11px]">
                        Pedagogical Misconception:
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        Aluminum oxide (Al₂O₃) is metallic, leading many candidates to assume it is purely basic. However, it reacts with both HCl and NaOH to yield salts, making it <strong>amphoteric</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Reinforcement Action */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Targeted Reinforcement Drill</div>
                      <div className="text-[10px] text-slate-400 font-mono">5 High-Yield Period 3 Oxide Questions</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-mono font-bold text-[10px] shadow-xs">
                      Drill Ready
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Interactive Virtual STEM Labs (Visual Preview Left, Text Right) */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-cyan-400/50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Visual Preview Side (Span 5 - Order 2 on mobile, Order 1 on desktop) */}
              <div className="lg:col-span-5 order-2 lg:order-1">
                <div className="rounded-2xl border border-cyan-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-4">
                  {/* Lab Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                        VIRTUAL OPTICS LAB
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded">
                      THIN LENS RAY-TRACING
                    </span>
                  </div>

                  {/* SVG Ray Diagram */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                    <svg viewBox="0 0 320 120" className="w-full h-auto text-slate-300">
                      {/* Principal Axis */}
                      <line x1="10" y1="60" x2="310" y2="60" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
                      {/* Convex Lens */}
                      <ellipse cx="160" cy="60" rx="8" ry="48" fill="#0284c7" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1.5" />
                      {/* Focal Points */}
                      <circle cx="100" cy="60" r="3" fill="#38bdf8" />
                      <text x="96" y="75" fontSize="9" fill="#94a3b8" fontFamily="monospace">F</text>
                      <circle cx="220" cy="60" r="3" fill="#38bdf8" />
                      <text x="216" y="75" fontSize="9" fill="#94a3b8" fontFamily="monospace">F&apos;</text>
                      {/* 2F Points */}
                      <circle cx="40" cy="60" r="3" fill="#94a3b8" />
                      <text x="34" y="75" fontSize="9" fill="#94a3b8" fontFamily="monospace">2F</text>
                      <circle cx="280" cy="60" r="3" fill="#94a3b8" />
                      <text x="274" y="75" fontSize="9" fill="#94a3b8" fontFamily="monospace">2F&apos;</text>
                      {/* Object Arrow at 2F (x=40, height 30) */}
                      <line x1="40" y1="60" x2="40" y2="30" stroke="#f43f5e" strokeWidth="2.5" />
                      <polygon points="37,34 40,28 43,34" fill="#f43f5e" />
                      {/* Parallel Ray to Lens, then through F' */}
                      <line x1="40" y1="30" x2="160" y2="30" stroke="#38bdf8" strokeWidth="1.5" />
                      <line x1="160" y1="30" x2="280" y2="90" stroke="#38bdf8" strokeWidth="1.5" />
                      {/* Ray through Optical Center (160, 60) to image */}
                      <line x1="40" y1="30" x2="280" y2="90" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 2" />
                      {/* Inverted Image Arrow at 2F' (x=280, height 30 downward) */}
                      <line x1="280" y1="60" x2="280" y2="90" stroke="#10b981" strokeWidth="2.5" />
                      <polygon points="277,86 280,92 283,86" fill="#10b981" />
                    </svg>
                  </div>

                  {/* Physics Readout */}
                  <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Object Position</span>
                      <span className="font-bold text-white">dₒ = 2F (Equal Size)</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Image Nature</span>
                      <span className="font-bold text-emerald-400">Real &amp; Inverted</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Side (Span 7 - Order 1 on mobile, Order 2 on desktop) */}
              <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 dark:border-cyan-700/60 bg-cyan-50 dark:bg-cyan-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span>Interactive STEM Labs</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Interactive Virtual STEM Labs
                </h3>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Physics mechanics, acid-base titration curves, and cellular biology diagrams brought to life with 60fps parameter manipulation directly in your browser.
                </p>

                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                    <span>Direct parameter manipulation of focal lengths, object distances &amp; angles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                    <span>Instant ray convergence and image characteristics calculation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                    <span>Zero plugin downloads required; runs at 60fps on modest mobile phones</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <Link
                    href="/products/stem"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                  >
                    <span>Launch Virtual STEM Labs</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive UTME Score Pacing & Cut-off Target Planner */}
      <section aria-label="Target Pacing Planner" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-[#060D1A] dark:via-[#09152B] dark:to-[#060D1A] p-6 sm:p-10 shadow-sm space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800/80 bg-cyan-50/80 dark:bg-cyan-950/60 px-4 py-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-300 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
            <span>INTERACTIVE CANDIDATE UTME TARGET PACING PLANNER</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Calculate Your Path to University Admission
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            Slide each subject score to project your 4-subject JAMB aggregate and discover which tier of Nigerian universities you qualify for.
          </p>
        </div>

        {/* Faculty Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(
            [
              { id: "sciences", label: "Medicine & Health Sciences" },
              { id: "engineering", label: "Engineering & Physical Sciences" },
              { id: "arts", label: "Law, Arts & Humanities" },
              { id: "commercial", label: "Management & Social Sciences" },
            ] as const
          ).map((fac) => (
            <button
              key={fac.id}
              type="button"
              onClick={() => setFaculty(fac.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                faculty === fac.id
                  ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400"
              }`}
            >
              {fac.label}
            </button>
          ))}
        </div>

        {/* Sliders Grid & Projected Result HUD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Sliders Area (Span 7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <label htmlFor="student-slider-eng">Use of English (Compulsory 60 Qs)</label>
                <span className="font-mono text-blue-600 dark:text-cyan-400 text-sm font-black">{englishScore} / 100</span>
              </div>
              <input
                id="student-slider-eng"
                type="range"
                min={40}
                max={95}
                value={englishScore}
                onChange={(e) => setEnglishScore(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-200 dark:bg-slate-800 accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <label htmlFor="student-slider-sub2">
                  {faculty === "sciences" ? "Biology" : faculty === "engineering" ? "Mathematics" : faculty === "arts" ? "Literature in English" : "Economics"}
                </label>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm font-black">{sub2Score} / 100</span>
              </div>
              <input
                id="student-slider-sub2"
                type="range"
                min={40}
                max={95}
                value={sub2Score}
                onChange={(e) => setSub2Score(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-200 dark:bg-slate-800 accent-emerald-600 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <label htmlFor="student-slider-sub3">
                  {faculty === "sciences" || faculty === "engineering" ? "Chemistry" : faculty === "arts" ? "Government" : "Principles of Accounts"}
                </label>
                <span className="font-mono text-purple-600 dark:text-purple-400 text-sm font-black">{sub3Score} / 100</span>
              </div>
              <input
                id="student-slider-sub3"
                type="range"
                min={40}
                max={95}
                value={sub3Score}
                onChange={(e) => setSub3Score(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-200 dark:bg-slate-800 accent-purple-600 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <label htmlFor="student-slider-sub4">
                  {faculty === "sciences" || faculty === "engineering" ? "Physics" : faculty === "arts" ? "Christian / Islamic Studies" : "Commerce"}
                </label>
                <span className="font-mono text-amber-600 dark:text-amber-400 text-sm font-black">{sub4Score} / 100</span>
              </div>
              <input
                id="student-slider-sub4"
                type="range"
                min={40}
                max={95}
                value={sub4Score}
                onChange={(e) => setSub4Score(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-200 dark:bg-slate-800 accent-amber-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Projection Result HUD (Span 5) */}
          <div className="lg:col-span-5 rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#071120] p-6 sm:p-8 space-y-5 shadow-lg text-center">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Projected 4-Subject Aggregate
            </span>

            <div className="font-mono font-black text-5xl sm:text-6xl text-slate-950 dark:text-white tracking-tight">
              {aggregateScore}
              <span className="text-xl text-slate-500 dark:text-slate-400 font-normal"> / 400</span>
            </div>

            <div className={`inline-block px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${standingColor}`}>
              {standingBadge}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {admissionAdvice}
            </p>

            <div className="pt-2">
              <Link
                href="/login?mode=signup"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 px-4 shadow-sm transition"
              >
                <span>Lock In This Target &amp; Start Practice</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The 4-Phase Candidate Roadmap */}
      <section aria-label="4-Phase Study Roadmap" className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            The 4-Phase Candidate Master Roadmap
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
            How disciplined candidates organize their preparation from initial baseline to official examination day.
          </p>
        </div>

        {/* Phase Navigator Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ROADMAP_PHASES.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActivePhase(idx)}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                activePhase === idx
                  ? "bg-blue-50 dark:bg-blue-950/70 border-blue-600 dark:border-cyan-400 shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="text-[10px] font-mono font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400">
                Step 0{idx + 1}
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-white mt-1 leading-snug">
                {p.phase}
              </div>
            </button>
          ))}
        </div>

        {/* Active Phase Focal Stage */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1424] p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                {ROADMAP_PHASES[activePhase].duration}
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {ROADMAP_PHASES[activePhase].phase}: {ROADMAP_PHASES[activePhase].tagline}
              </h3>
            </div>
            <Link
              href={ROADMAP_PHASES[activePhase].actionHref}
              className="inline-flex items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-black px-5 py-3 shadow-xs transition"
            >
              <span>{ROADMAP_PHASES[activePhase].actionLabel}</span>
              <span aria-hidden="true" className="ml-1.5">&rarr;</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
            <div className="space-y-1.5">
              <h4 className="font-mono uppercase font-bold text-slate-600 dark:text-slate-400 text-[10px]">Deliverable Objective:</h4>
              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                {ROADMAP_PHASES[activePhase].deliverable}
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-mono uppercase font-bold text-slate-600 dark:text-slate-400 text-[10px]">Pedagogical Rationale:</h4>
              <p className="text-slate-600 dark:text-slate-300 font-normal">
                {ROADMAP_PHASES[activePhase].details}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
