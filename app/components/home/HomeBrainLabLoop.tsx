"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG } from "@/app/lib/contentConfig";

export function HomeBrainLabLoop() {
  const loopStages = HOMEPAGE_CONTENT_CONFIG.loopStages;
  const [activeStageId, setActiveStageId] = useState<string>("learn");

  const STAGE_ROUTE_MAP: Record<string, { href: string; label: string; icon: string }> = {
    learn: { href: "/learn", label: "Explore Learning Hub", icon: "📖" },
    practise: { href: "/cbt", label: "Launch CBT Simulator", icon: "⏱️" },
    diagnose: { href: "/learning-dna", label: "View Diagnostic DNA", icon: "🔍" },
    improve: { href: "/ai-learning", label: "Start AI Socratic Drill", icon: "🤖" },
    master: { href: "/challenge-arena", label: "Enter Challenge Arena", icon: "🏆" },
  };

  const activeStage =
    loopStages.find((s) => s.id === activeStageId) || loopStages[0];
  const activeRoute = STAGE_ROUTE_MAP[activeStage.id] || {
    href: "/products",
    label: "Explore Products",
    icon: "🚀",
  };

  return (
    <section
      id="the-loop"
      aria-label="The BrainLab Pedagogical Loop"
      className="scroll-mt-20 sm:scroll-mt-24 py-14 sm:py-18 lg:py-20 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#070D18]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-[var(--bl-color-brand-primary)] border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-2.5">
            THE BRAINLAB LOOP (SLOTS S3-01 &amp; S3-02)
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--bl-color-text-primary)] tracking-tight">
            From Fundamental Concept to Exam Mastery
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            A continuous pedagogical cycle that replaces blind guessing with targeted diagnostic improvement.
          </p>
        </div>

        {/* 5 Clean Visual Feature Stage Cards (Navigation Strip) */}
        <div
          role="tablist"
          aria-label="Loop Stages"
          className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 mb-8"
        >
          {loopStages.map((stage) => {
            const isSelected = stage.id === activeStageId;
            const route = STAGE_ROUTE_MAP[stage.id];

            return (
              <button
                key={stage.id}
                role="tab"
                id={`tab-${stage.id}`}
                aria-controls={`panel-${stage.id}`}
                aria-selected={isSelected}
                onClick={() => setActiveStageId(stage.id)}
                className={`group relative flex flex-col items-start p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 bl-focus-ring min-h-[50px] ${
                  isSelected
                    ? "bg-blue-50/90 border-[var(--bl-color-brand-primary)] shadow-md shadow-blue-950/5 ring-1 ring-blue-500/20 dark:bg-blue-950/40 dark:border-blue-700"
                    : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform">
                    {route?.icon}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    STEP {stage.number}
                  </span>
                </div>
                <span
                  className={`text-xs sm:text-sm font-black tracking-tight ${
                    isSelected
                      ? "text-[var(--bl-color-brand-primary)] dark:text-blue-400"
                      : "text-[var(--bl-color-text-primary)]"
                  }`}
                >
                  {stage.title}
                </span>
                <span
                  className={`text-[11px] truncate w-full mt-0.5 ${
                    isSelected
                      ? "text-blue-900 dark:text-blue-200"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {stage.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Visual Feature Card Showcase Panel */}
        <div
          id={`panel-${activeStage.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeStage.id}`}
          className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white p-6 sm:p-8 lg:p-10 shadow-sm dark:border-slate-800 dark:from-slate-900/50 dark:to-slate-950/80"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Column: Visual Highlights */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white text-base font-black shadow-md shadow-blue-900/20">
                  {activeStage.number}
                </span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-[var(--bl-color-text-primary)] tracking-tight">
                    {activeStage.title}: {activeStage.subtitle}
                  </h3>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Cycle Stage {activeStage.number} of 05 &bull; Continuous Cognitive Loop
                  </span>
                </div>
              </div>

              {/* Punchy Stage Description */}
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeStage.description}
              </p>

              {/* Visual Product Chips */}
              <div className="pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Synchronized Platform Capabilities:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeStage.products.map((prod) => (
                    <span
                      key={prod}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span>{prod}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* STEM Studio Integration Callout */}
              {activeStage.stemRole && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 p-3 text-xs text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">🔬</span>
                  <div>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                      STEM Studio Integration:{" "}
                    </span>
                    <span>{activeStage.stemRole}</span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href={activeRoute.href}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--bl-color-brand-primary)] hover:bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg transition-all bl-focus-ring min-h-[44px]"
                >
                  <span>{activeRoute.label}</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Real Stage Interactive Telemetry Card */}
            <div className="lg:col-span-6">
              <div
                className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-lg dark:border-slate-800 dark:bg-[#070e1c] flex flex-col justify-between"
                role="region"
                aria-label={`Preview of ${activeStage.title} Stage Output`}
              >
                {/* Telemetry Chrome Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">{activeRoute.icon}</span>
                    <span className="font-bold uppercase tracking-wider text-slate-900 dark:text-white text-[11px]">
                      Stage {activeStage.number} Visual Telemetry
                    </span>
                  </div>
                  <span className="font-mono text-[9px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    Live Data
                  </span>
                </div>

                {/* Stage-Specific Visual Widgets */}
                <div className="py-3">
                  {activeStageId === "learn" && (
                    <div className="space-y-2.5 text-xs">
                      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 space-y-1">
                        <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 uppercase font-black">
                          NERDC Curriculum Milestone
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                          Senior Secondary Biology: Genetics &amp; Monohybrid Crosses
                        </h4>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Deduce phenotypic ratios (3:1) and genotypic ratios (1:2:1) in F2 offspring.
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1 font-semibold">
                        <span>✓ 100% Syllabus Coverage</span>
                        <span className="text-emerald-700 dark:text-emerald-300">Verified Curriculum Citation</span>
                      </div>
                    </div>
                  )}

                  {activeStageId === "practise" && (
                    <div className="space-y-2.5 text-xs">
                      <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-950 dark:text-blue-200 text-xs">
                            UTME Mock Run #04 • Full Combination
                          </span>
                          <span className="font-mono text-[11px] font-black text-blue-700 dark:text-blue-300" title="UTME Standard 180 Questions Blueprint">
                            180 Questions (UTME Standard)
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono font-bold">
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">ENG: 60</div>
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">MTH: 40</div>
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">PHY: 40</div>
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">CHM: 40</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between font-semibold">
                        <span>⚡ 8-Key Keyboard Navigation</span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">Offline Autosave Active</span>
                      </div>
                    </div>
                  )}

                  {activeStageId === "diagnose" && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            Diagnostic Cognitive Radar (Slot S3-02)
                          </span>
                          <span className="text-[9px] font-mono font-bold text-purple-600 dark:text-purple-400">
                            Topic-by-Topic Telemetry
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="text-slate-600 dark:text-slate-300">Organic Chemistry (Esters)</span>
                              <span className="font-mono font-bold text-rose-500">42% (Weak Spot)</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-rose-500 w-[42%]" />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="text-slate-600 dark:text-slate-300">Calculus &amp; Differentiation</span>
                              <span className="font-mono font-bold text-amber-500">68% (Needs Polish)</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-amber-500 w-[68%]" />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="text-slate-600 dark:text-slate-300">Lexis &amp; Structure</span>
                              <span className="font-mono font-bold text-emerald-500">89% (Mastered)</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-emerald-500 w-[89%]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStageId === "improve" && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 space-y-1.5">
                        <span className="text-[9px] font-mono text-purple-700 dark:text-purple-300 uppercase font-black">
                          Socratic Guidance &bull; Step-by-Step Remediation
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 font-semibold text-[11px] leading-relaxed">
                          &ldquo;Reversed reagent in esterification: auto-enqueued 5 focused micro-drills on sulfuric acid catalyst temperatures.&rdquo;
                        </p>
                        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-purple-700 dark:text-purple-300 font-bold">
                          <span>💡 3 Adaptive Hints Remaining Today</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStageId === "master" && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950 dark:text-amber-200 text-xs">
                            Challenge Arena National Elo Rating
                          </span>
                          <span className="font-mono font-black text-amber-800 dark:text-amber-400 text-sm">
                            Elo: 1420
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                          Synchronous 1v1 speed duels against verified candidates across Nigeria.
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-400 font-bold pt-1">
                          <span>National Rank: Top 4%</span>
                          <span>🏆 8-Win Streak</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 pt-2 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                  <span>BrainLab Pedagogical Engine</span>
                  <span className="font-mono">Real-time Telemetry</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
