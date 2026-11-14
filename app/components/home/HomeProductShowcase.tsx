"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";

export function HomeProductShowcase() {
  const products = HOMEPAGE_CONTENT_CONFIG.products;

  // Interactive state for Card 1: 8-Key Simulator
  const [selected8KeyOption, setSelected8KeyOption] = useState<string>("B");
  const [selectedKeyStroke, setSelectedKeyStroke] = useState<string>("B");

  // Interactive state for Card 3: Daily Quests
  const [completedQuests, setCompletedQuests] = useState<Record<string, boolean>>({
    quest1: true,
    quest2: true,
    quest3: false,
  });

  // Interactive state for Card 4: Offline Toggle
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(true);

  // Active view mode: "pillars" (4 visual cards) vs "products" (all 6 ecosystem products)
  const [activeTab, setActiveTab] = useState<"pillars" | "products">("pillars");
  const [selectedProductId, setSelectedProductId] = useState<string>("cbt-simulator");

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleKeyClick = (key: string) => {
    setSelectedKeyStroke(key);
    if (["A", "B", "C", "D"].includes(key)) {
      setSelected8KeyOption(key);
    }
  };

  const toggleQuest = (id: string) => {
    setCompletedQuests((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      id="products"
      aria-label="Integrated Learning Products"
      className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20 lg:py-24 border-b border-white/10 bg-[#060B18] overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Refined Empirical Branding */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <span
            data-slot="SLOTS S4-01 TO S4-04"
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-blue-500/10 text-cyan-300 border border-blue-400/30 mb-3 shadow-xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>4 CORE EXAM SUPERPOWERS (SLOTS S4-01 TO S4-04)</span>
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            High-Impact Academic Tools. Zero Distractions.
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Engineered from real candidate examination room data to build authentic speed, eliminate guessing traps, and guarantee syllabus readiness.
          </p>

          {/* View Mode Switcher */}
          <div className="mt-7 inline-flex p-1.5 rounded-2xl bg-slate-900 border border-white/10 shadow-xl">
            <button
              type="button"
              onClick={() => setActiveTab("pillars")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "pillars"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              4 Core Exam Superpowers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "products"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Full 6-Product Ecosystem
            </button>
          </div>
        </div>

        {/* MODE 1: 4 HIGH-VOLTAGE VISUAL SUPERPOWER STUDIOS */}
        {activeTab === "pillars" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 min-h-[420px]">
            {/* CARD 1: JAMB 8-KEY SPEED ENGINE (cbt-simulator) */}
            <div
              id="cbt-simulator"
              className="flex flex-col justify-between rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/95 via-[#081326]/90 to-[#030612]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-cyan-400/50 transition-all duration-300"
            >
              {/* Corner Ambient Glow */}
              <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300 border border-cyan-400/30">
                    <svg className="h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
                    </svg>
                    <span>100% Exam Hall Parity</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/60">
                    +15 Min Time Saved
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Official JAMB 8-Key Exam Engine
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Practice without a mouse — exactly like the real CBT center. Tap keys <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-cyan-300 font-bold">A</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-cyan-300 font-bold">B</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-cyan-300 font-bold">C</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-cyan-300 font-bold">D</kbd> to answer, and <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-slate-300 font-bold">P</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-slate-300 font-bold">N</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-slate-300 font-bold">S</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-slate-300 font-bold">R</kbd> to navigate.
                </p>

                {/* Tactile Hardware Terminal Widget */}
                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/90 text-white p-4 sm:p-5 space-y-3.5 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-2 text-slate-400">
                    <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Physics Question 14 of 40
                    </span>
                    <span className="text-amber-400 font-bold font-mono flex items-center gap-1">
                      <svg className="h-3 w-3 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>01:42:15</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    A body accelerates uniformly from rest at 2.0 m/s² for 5.0 seconds. Calculate the total distance covered.
                  </p>

                  {/* Interactive Options HUD */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: "A", label: "10.0 meters" },
                      { key: "B", label: "25.0 meters (s = ½at²)" },
                      { key: "C", label: "50.0 meters" },
                      { key: "D", label: "100.0 meters" },
                    ].map((opt) => {
                      const isSelected = selected8KeyOption === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleKeyClick(opt.key)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-100 font-bold ring-1 ring-cyan-400 shadow-md shadow-cyan-900/30"
                              : "bg-slate-900/80 border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                              isSelected ? "bg-cyan-400 text-slate-950 font-black" : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="text-[11px] truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Physical 3D Beveled Mechanical Keycaps */}
                  <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                      Tap Physical Keycaps:
                    </span>
                    <div className="flex gap-1.5">
                      {["A", "B", "C", "D", "P", "N", "S", "R"].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleKeyClick(k)}
                          className={`h-7 w-7 rounded-lg font-mono text-xs font-black transition-all cursor-pointer border-b-2 active:border-b-0 active:translate-y-0.5 ${
                            selectedKeyStroke === k
                              ? "bg-cyan-400 text-slate-950 border-cyan-600 shadow-lg shadow-cyan-400/50 scale-105"
                              : "bg-slate-800 text-slate-300 border-slate-950 hover:bg-slate-700"
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  Official 2026/2027 Keyboard Mapping
                </span>
                <Link
                  href="/cbt"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-cyan-400 hover:text-cyan-300 bl-focus-ring rounded-lg"
                >
                  <span>Launch 8-Key CBT</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* CARD 2: INSTANT AI DIAGNOSTICS & LEARNING DNA */}
            <div className="flex flex-col justify-between rounded-3xl border border-purple-500/30 bg-gradient-to-br from-slate-900/95 via-[#120826]/90 to-[#030612]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-purple-400/50 transition-all duration-300">
              {/* Corner Ambient Glow */}
              <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-purple-500/15 blur-3xl" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-400/30">
                    <svg className="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>Precision Topic Mastery</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-800/60">
                    Cognitive Radar
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Instant AI Diagnostics &amp; Learning DNA
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Never practice blindly. Our diagnostic engine evaluates your response patterns across the NERDC syllabus, highlighting weak subtopics before exam day.
                </p>

                {/* Interactive Diagnostic Radar Matrix */}
                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/90 text-white p-4 sm:p-5 space-y-3.5 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-2 text-slate-400">
                    <span className="text-purple-400 font-bold">Personalized UTME Syllabus Breakdown</span>
                    <span className="text-slate-400">Real-time Telemetry</span>
                  </div>

                  {/* Topic Mastery Bars with High Contrast */}
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-semibold">Organic Chemistry (Alkanols &amp; Esters)</span>
                        <span className="font-mono font-bold text-rose-400">42% (Needs Review)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 w-[42%] rounded-full shadow-xs" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-semibold">Calculus &amp; Differentiation</span>
                        <span className="font-mono font-bold text-amber-400">68% (Moderate)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 w-[68%] rounded-full shadow-xs" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-semibold">Lexis, Structure &amp; Oral English</span>
                        <span className="font-mono font-bold text-emerald-400">89% (Mastered)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 w-[89%] rounded-full shadow-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Socratic AI Insight Chip */}
                  <div className="rounded-xl bg-purple-950/50 border border-purple-800/60 p-3 text-[11px] text-purple-200 flex items-start gap-2.5">
                    <svg className="h-4 w-4 text-purple-300 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
                    </svg>
                    <span className="leading-relaxed">
                      <strong className="text-white">AI Examiner Insight:</strong> You lose marks in Organic Chemistry due to confusing IUPAC functional priority rules. Focus on targeted drills to boost chemistry score by +18 marks.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  Dynamic weakness tracking on every test
                </span>
                <Link
                  href="/learning-dna"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-purple-400 hover:text-purple-300 bl-focus-ring rounded-lg"
                >
                  <span>Explore Learning DNA</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* CARD 3: NATIONAL ARENA & DAILY QUESTS */}
            <div className="flex flex-col justify-between rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900/95 via-[#1f1308]/90 to-[#030612]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-amber-400/50 transition-all duration-300">
              {/* Corner Ambient Glow */}
              <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
                    <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>Synchronous 1v1 Academic Duels</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/60">
                    Live Leaderboard
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  National Arena &amp; Daily Quests
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Compete with ambitious candidates across Nigeria. Maintain study streaks, conquer daily challenges, and earn peer-verified ranking badges.
                </p>

                {/* Interactive Duel & Quest Widget */}
                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/90 text-white p-4 sm:p-5 space-y-3 shadow-inner">
                  {/* Live Duel Banner */}
                  <div className="rounded-xl bg-amber-950/40 border border-amber-800/60 p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-amber-300">Live 1v1 Arena Duel</span>
                    </div>
                    <span className="font-mono text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md font-bold">
                      Round 4 of 5
                    </span>
                  </div>

                  {/* Duel Scores */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-blue-950/50 border border-blue-800/80">
                      <span className="block text-[11px] text-blue-300 font-bold">You (Candidate)</span>
                      <span className="text-base font-black text-white">850 pts</span>
                      <span className="text-[10px] text-emerald-400 block font-mono">Streak: 5 Days</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10">
                      <span className="block text-[11px] text-slate-300 font-bold">Abuja High-Scorer</span>
                      <span className="text-base font-black text-slate-300">720 pts</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Streak: 3 Days</span>
                    </div>
                  </div>

                  {/* Interactive Daily Quests */}
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 block">
                      Today&apos;s Active Quests (Click to Toggle):
                    </span>
                    {[
                      { id: "quest1", title: "Complete 20 Physics CBT practice questions" },
                      { id: "quest2", title: "Review 1 Socratic AI weak topic correction" },
                      { id: "quest3", title: "Win 1 Synchronous Challenge Arena duel" },
                    ].map((q) => {
                      const isDone = completedQuests[q.id];
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => toggleQuest(q.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] transition-all border cursor-pointer ${
                            isDone
                              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                              : "bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          <span className={isDone ? "text-emerald-400 font-bold" : "text-slate-500 font-bold"}>
                            {isDone ? "✓" : "○"}
                          </span>
                          <span className={isDone ? "line-through opacity-75" : ""}>{q.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  State &amp; National Leaderboards
                </span>
                <Link
                  href="/challenge-arena"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-400 hover:text-amber-300 bl-focus-ring rounded-lg"
                >
                  <span>Enter Challenge Arena</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* CARD 4: ZERO-DATA OFFLINE PWA SYNC */}
            <div className="flex flex-col justify-between rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/95 via-[#081f18]/90 to-[#030612]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-emerald-400/50 transition-all duration-300">
              {/* Corner Ambient Glow */}
              <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                    <span className="text-base" aria-hidden="true">📶</span>
                    <span>Zero-Data PWA Sync</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/60">
                    Works on 2G / 3G
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Offline PWA &amp; Low-Data Mode
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Poor internet in your area? Zero problem. BrainLab installs seamlessly on Android, iOS, and PC, caching complete practice drills locally so you never get interrupted.
                </p>

                {/* Interactive Offline Engine Simulation */}
                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/90 text-white p-4 sm:p-5 space-y-3.5 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-2 text-slate-400">
                    <span className="text-emerald-400 font-bold">Offline Storage Engine</span>
                    <button
                      type="button"
                      onClick={() => setIsOfflineSimulated(!isOfflineSimulated)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/15 text-xs font-mono text-emerald-300 hover:bg-slate-800 cursor-pointer"
                    >
                      {isOfflineSimulated ? "Switch: Online 🌐" : "Simulate: Offline 🔌"}
                    </button>
                  </div>

                  {/* Status Banner */}
                  <div
                    className={`rounded-xl p-3 border text-xs transition-all ${
                      isOfflineSimulated
                        ? "bg-emerald-950/50 border-emerald-800/60 text-emerald-200"
                        : "bg-blue-950/50 border-blue-800/60 text-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isOfflineSimulated ? "bg-emerald-400" : "bg-blue-400"
                          } animate-pulse`}
                        />
                        {isOfflineSimulated ? "Offline Mode Engaged (Zero Data Consumed)" : "Online Cloud Sync Active"}
                      </span>
                      <span className="font-mono text-[10px]">
                        {isOfflineSimulated ? "0.00 KB/s" : "Connected"}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      {isOfflineSimulated
                        ? "All questions, timer ticks, and answers save directly to browser IndexedDB storage. Zero lost data."
                        : "Synchronizing practice results, weak topic scores, and streak data with your central learning profile."}
                    </p>
                  </div>

                  {/* Data Efficiency Comparison */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase block">BrainLab CBT Session</span>
                      <span className="text-emerald-400 font-bold">&lt; 1.2 MB data total</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-white/10">
                      <span className="text-[10px] text-slate-400 uppercase block">Typical Video Class</span>
                      <span className="text-rose-400 font-bold">~45 MB - 120 MB</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  Installable PWA with IndexedDB
                </span>
                <Link
                  href="/for-students"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 bl-focus-ring rounded-lg"
                >
                  <span>Student Offline Guide</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: FULL 6-PRODUCT ECOSYSTEM PREVIEW (PRESERVED) */}
        {activeTab === "products" && (
          <div className="space-y-8 min-h-[420px]">
            {/* Product Selector Tabs */}
            <div
              role="tablist"
              aria-label="Product Showcase Previews"
              className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none justify-start lg:justify-center"
            >
              {products.map((prod) => {
                const isSelected = prod.id === selectedProductId;
                return (
                  <button
                    key={prod.id}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedProductId(prod.id)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-150 bl-focus-ring min-h-[44px] flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                        : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-white/10"
                    }`}
                  >
                    <span>{prod.badge || "Product"}</span>
                    <span className="font-extrabold">{prod.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Product Detailed Showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-white/15 bg-slate-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
              <div className="lg:col-span-5 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-cyan-300 border border-blue-400/30">
                  <span>{activeProduct.category}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {activeProduct.name}
                </h3>

                <p className="text-sm font-semibold text-cyan-400">
                  {resolveClaimValue(activeProduct.tagline, "")}
                </p>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  {resolveClaimValue(activeProduct.description, "")}
                </p>

                <div>
                  <Link
                    href={activeProduct.href}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-teal-300 px-6 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/25 transition-all bl-focus-ring min-h-[44px]"
                  >
                    <span>Launch {activeProduct.name}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-white/15 bg-[#030712] p-6 text-white min-h-[280px] flex flex-col justify-between shadow-2xl">
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-3">
                    <span className="font-mono text-cyan-400 font-bold">{activeProduct.name} Live Engine</span>
                    <span className="font-mono text-emerald-400 text-[10px] font-bold">✓ WCAG 2.1 AA Compliant</span>
                  </div>
                  <div className="py-6 text-center space-y-2">
                    <span className="text-4xl block">✨</span>
                    <h4 className="text-lg font-bold text-white">{activeProduct.name}</h4>
                    <p className="text-xs text-slate-300 max-w-md mx-auto">
                      Fully integrated with your central profile, learning DNA, and national ranking.
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-400 border-t border-white/10 pt-3 flex justify-between">
                    <span>Synchronized with central database</span>
                    <span className="font-mono text-cyan-400">Low-Latency WebSockets</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
