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

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Daily Free Full-Length Practice Test (Span 7) */}
          <div className="md:col-span-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-blue-400/50 transition">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-blue-800">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
                  </svg>
                </span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
                  1 Free Full Mock / Day
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Daily Free Full-Length Practice Test
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Every registered learner can sit one full 4-subject timed CBT mock paper every single day (180 questions, 120 minutes) without paying a kobo or entering debit card details.
              </p>

              {/* Realistic Cockpit Preview Mini Bar */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
                  <span>Physical Keypad: [P] Prev · [N] Next · [S] Submit</span>
                  <span className="text-cyan-800 dark:text-cyan-300 font-bold">120:00 Countdown</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  <span className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white">ENG (60 Qs)</span>
                  <span className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white">BIO (40 Qs)</span>
                  <span className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white">CHM (40 Qs)</span>
                  <span className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white">PHY (40 Qs)</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Link
                href="/cbt"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-cyan-300 hover:underline"
              >
                <span>Launch Free Practice Engine</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">Resets Daily at 00:00 WAT</span>
            </div>
          </div>

          {/* Card 2: Offline Answer Auto-Sync Protection (Span 5) */}
          <div className="md:col-span-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 group hover:border-emerald-400/50 transition">
            <div className="space-y-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                </svg>
              </span>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Offline Auto-Sync Protection
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Never lose test progress due to sudden power outages or fluctuating network bars. Responses are stored in durable device storage and synced automatically once internet restores.
              </p>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Ultra-Low Data Footprint</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Full PWA download is under 1.2 MB. You can take an entire 180-question test on airplane mode with zero mobile data consumption.
                </p>
              </div>
            </div>

            <Link
              href="/products/cbt"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300 hover:underline"
            >
              <span>Explore Offline Architecture</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {/* Card 3: Socratic AI Misconception Diagnostics (Span 6) */}
          <div className="md:col-span-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 group hover:border-purple-400/50 transition">
            <div className="space-y-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
                </svg>
              </span>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                AI Misconception Diagnostics
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Don&apos;t just read correct option letters. Understand why your chosen distractor was wrong through Socratic rule derivations and get targeted 5-question reinforcement drills.
              </p>
            </div>

            <Link
              href="/products/ai-learning"
              className="inline-flex items-center gap-2 text-sm font-bold text-purple-800 dark:text-purple-300 hover:underline"
            >
              <span>Learn About Socratic AI</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {/* Card 4: Interactive Virtual STEM Labs (Span 6) */}
          <div className="md:col-span-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 group hover:border-cyan-400/50 transition">
            <div className="space-y-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 2v7.31L4.1 19.34A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-2.66L14 9.31V2" />
                  <path d="M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" />
                </svg>
              </span>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Interactive Virtual STEM Labs
              </h3>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Physics mechanics, acid-base titration curves, and cellular biology diagrams brought to life with 60fps parameter manipulation directly in your browser.
              </p>
            </div>

            <Link
              href="/products/stem"
              className="inline-flex items-center gap-2 text-sm font-bold text-cyan-800 dark:text-cyan-300 hover:underline"
            >
              <span>Launch Virtual STEM Labs</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
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
