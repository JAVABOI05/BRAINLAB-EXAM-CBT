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
      className="scroll-mt-20 sm:scroll-mt-24 relative w-full overflow-hidden py-14 sm:py-18 lg:py-20 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#070D18]"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-2.5">
            THE BRAINLAB LOOP (SLOTS S3-01 &amp; S3-02)
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
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
                className={`group relative flex flex-col items-start p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 bl-focus-ring min-h-[52px] ${
                  isSelected
                    ? "bg-blue-50/90 border-blue-600 border-b-4 border-b-blue-700 shadow-md ring-2 ring-blue-500/20 dark:bg-blue-950/50 dark:border-blue-500 dark:border-b-blue-600"
                    : "bg-white border-slate-200 border-b-4 border-b-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:border-b-slate-950 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform">
                    {route?.icon}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    STEP {stage.number}
                  </span>
                </div>
                <span
                  className={`text-xs sm:text-sm font-black tracking-tight ${
                    isSelected
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-slate-900 dark:text-white"
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
          className="rounded-3xl border-2 border-slate-200/90 bg-white p-6 sm:p-8 lg:p-10 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Column: Visual Highlights */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white text-base font-black border-b-4 border-blue-800 shadow-sm">
                  {activeStage.number}
                </span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
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
                <div className="flex flex-wrap gap-2">
                  {activeStage.products.map((prod) => (
                    <span
                      key={prod}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-50 text-slate-800 border-2 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 shadow-2xs"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span>{prod}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* STEM Studio Integration Callout */}
              {activeStage.stemRole && (
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-base">🔬</span>
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
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 active:translate-y-0.5 border-b-4 border-blue-800 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all bl-focus-ring min-h-[48px]"
                >
                  <span>{activeRoute.label}</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Real Stage Interactive Telemetry Card */}
            <div className="lg:col-span-6">
              <div
                className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 flex flex-col justify-between"
                role="region"
                aria-label={`Preview of ${activeStage.title} Stage Output`}
              >
                {/* Telemetry Chrome Bar */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">{activeRoute.icon}</span>
                    <span className="font-bold uppercase tracking-wider text-slate-900 dark:text-white text-[11px]">
                      Stage {activeStage.number} Visual Telemetry
                    </span>
                  </div>
                  <span className="font-mono text-[9px] bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    Live Data
                  </span>
                </div>

                {/* Stage-Specific Visual Widgets */}
                <div className="py-3">
                  {activeStageId === "learn" && (
                    <div className="space-y-2.5 text-xs">
                      <div className="p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                        <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 uppercase font-black">
                          NERDC Curriculum Milestone
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          Senior Secondary Biology: Genetics &amp; Monohybrid Crosses
                        </h4>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          Deduce phenotypic ratios (3:1) and genotypic ratios (1:2:1) in F2 offspring.
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 font-semibold">
                        <span>✓ 100% Syllabus Coverage</span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">Verified Curriculum Citation</span>
                      </div>
                    </div>
                  )}

                  {activeStageId === "practise" && (
                    <div className="space-y-2.5 text-xs">
                      <div className="p-3.5 rounded-2xl border-2 border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-950 dark:text-blue-200 text-xs">
                            UTME Mock Run #04 &bull; Full Combination
                          </span>
                          <span className="font-mono text-[11px] font-black text-blue-700 dark:text-blue-300" title="UTME Standard 180 Questions Blueprint">
                            180 Questions (UTME Standard)
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono font-bold">
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-2xs">ENG: 60</div>
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-2xs">MTH: 40</div>
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-2xs">PHY: 40</div>
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-2xs">CHM: 40</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between font-semibold">
                        <span>⚡ 8-Key Keyboard Navigation</span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">Offline Autosave Active</span>
                      </div>
                    </div>
                  )}

                  {activeStageId === "diagnose" && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            Diagnostic Cognitive Radar (Slot S3-02)
                          </span>
                          <span className="text-[9px] font-mono font-bold text-purple-600 dark:text-purple-400">
                            Topic-by-Topic Telemetry
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-700 dark:text-slate-300 font-medium">Organic Chemistry (Esters)</span>
                              <span className="font-mono font-bold text-rose-500">42% (Weak Spot)</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-rose-500 w-[42%]" />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-700 dark:text-slate-300 font-medium">Calculus &amp; Differentiation</span>
                              <span className="font-mono font-bold text-amber-500">68% (Needs Polish)</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-amber-500 w-[68%]" />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-700 dark:text-slate-300 font-medium">Lexis &amp; Structure</span>
                              <span className="font-mono font-bold text-emerald-500">89% (Mastered)</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-emerald-500 w-[89%]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStageId === "improve" && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3.5 rounded-2xl border-2 border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 space-y-2">
                        <span className="text-[9px] font-mono text-purple-700 dark:text-purple-300 uppercase font-black">
                          Socratic Guidance &bull; Step-by-Step Remediation
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 font-semibold text-xs leading-relaxed">
                          &ldquo;Reversed reagent in esterification: auto-enqueued 5 focused micro-drills on sulfuric acid catalyst temperatures.&rdquo;
                        </p>
                        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-purple-700 dark:text-purple-300 font-bold">
                          <span>💡 3 Adaptive Hints Remaining Today</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStageId === "master" && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3.5 rounded-2xl border-2 border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950 dark:text-amber-200 text-xs">
                            Challenge Arena National Elo Rating
                          </span>
                          <span className="font-mono font-black text-amber-800 dark:text-amber-400 text-sm">
                            Elo: 1420
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-xs">
                          Synchronous 1v1 speed duels against verified candidates across Nigeria.
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 font-bold pt-1">
                          <span>National Rank: Top 4%</span>
                          <span>🏆 8-Win Streak</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 pt-2.5 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-medium">
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
