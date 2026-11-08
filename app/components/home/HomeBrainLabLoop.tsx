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
      className="py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#070D18]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[var(--bl-color-brand-primary)] border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-3">
            THE BRAINLAB LOOP (SLOTS S3-01 &amp; S3-02)
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--bl-color-text-primary)] tracking-tight">
            A Continuous 5-Stage Journey from Concept to Mastery
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Every product in the ecosystem maps to a vital pedagogical phase, ensuring students never practice blindly without understanding root causes.
          </p>
        </div>

        {/* 5-Stage Stepper Navigation (Slot S3-01) */}
        <div
          role="tablist"
          aria-label="Loop Stages"
          className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-10"
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
                className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-150 bl-focus-ring min-h-[48px] bl-interactive-hover ${
                  isSelected
                    ? "bg-blue-50/80 border-[var(--bl-color-brand-primary)] shadow-sm dark:bg-blue-950/40 dark:border-blue-700"
                    : "bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm sm:text-base">{route?.icon}</span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    STAGE {stage.number}
                  </span>
                </div>
                <span
                  className={`text-sm sm:text-base font-extrabold tracking-tight ${
                    isSelected
                      ? "text-[var(--bl-color-brand-primary)] dark:text-blue-400"
                      : "text-[var(--bl-color-text-primary)]"
                  }`}
                >
                  {stage.title}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 hidden sm:block mt-0.5">
                  {stage.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Stage Detailed Panel */}
        <div
          id={`panel-${activeStage.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeStage.id}`}
          className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-6 sm:p-10 lg:p-12 shadow-sm dark:border-slate-800 dark:from-slate-900/60 dark:to-slate-950/80"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Stage Info */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bl-color-brand-primary)] text-white text-base font-black">
                  {activeStage.number}
                </span>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--bl-color-text-primary)]">
                    {activeStage.title}: {activeStage.subtitle}
                  </h3>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Stage {activeStage.number} of 05 in the BrainLab Cycle
                  </span>
                </div>
              </div>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeStage.description}
              </p>

              {/* Mapped Products Pills */}
              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2.5">
                  Integrated Products in this Stage:
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeStage.products.map((prod) => (
                    <span
                      key={prod}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span>{prod}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* STEM Studio Integration Callout */}
              {activeStage.stemRole && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/60 p-4 text-xs sm:text-sm text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                    STEM Studio Role:{" "}
                  </span>
                  <span>{activeStage.stemRole}</span>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href={activeRoute.href}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--bl-color-brand-primary)] hover:bg-[var(--bl-color-brand-primary-hover)] px-6 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all bl-focus-ring min-h-[44px] bl-interactive-hover"
                >
                  <span>{activeRoute.label}</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Real Stage Artifact Interactive Preview (Slot S3-02, CLS = 0) */}
            <div className="lg:col-span-6">
              <div
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-md dark:border-slate-800 dark:bg-[#070e1c] min-h-[320px] flex flex-col justify-between"
                role="region"
                aria-label={`Preview of ${activeStage.title} Stage Output`}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">{activeRoute.icon}</span>
                    <span className="font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Stage {activeStage.number} Telemetry Artifact
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                    Real Platform Data Contract
                  </span>
                </div>

                {/* Stage-Specific Visual Artifact */}
                <div className="my-auto py-3">
                  {activeStageId === "learn" && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-1.5">
                        <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase font-bold">NERDC Learning Objective</span>
                        <h4 className="font-bold text-slate-900 dark:text-white">Senior Secondary Biology: Genetics &amp; Monohybrid Inheritance</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                          Deduce phenotypic ratios (3:1) and genotypic ratios (1:2:1) in F2 generations of homozygous crosses.
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                        <span>Status: 100% Syllabus Coverage</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Verified Citation</span>
                      </div>
                    </div>
                  )}

                  {activeStageId === "practise" && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-950 dark:text-blue-200">UTME Mock Run #04 • Full Combination</span>
                          <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300" title="Official UTME Standard Blueprint">180 Questions</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">English: 60</div>
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">Maths: 40</div>
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">Physics: 40</div>
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">Chemistry: 40</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
                        <span>Offline Autosave Active</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Zero Lost Submissions</span>
                      </div>
                    </div>
                  )}

                  {activeStageId === "diagnose" && (
                    <div className="space-y-3 text-xs">
                      {/* Cognitive Radar Diagnostic (Slot S3-02) */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">Diagnostic Cognitive Radar (Slot S3-02)</span>
                          <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">Topic-by-Topic Drilldown</span>
                        </div>
                        <div className="space-y-1.5">
                          <div>
                            <div className="flex justify-between text-[11px] mb-0.5">
                              <span className="text-slate-600 dark:text-slate-300">Organic Chemistry (Alkanols &amp; Esters)</span>
                              <span className="font-mono font-bold text-rose-500">42% (Weak Spot)</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-rose-500 w-[42%]" />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] mb-0.5">
                              <span className="text-slate-600 dark:text-slate-300">Calculus &amp; Differentiation</span>
                              <span className="font-mono font-bold text-amber-500">68% (Needs Polish)</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-amber-500 w-[68%]" />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[11px] mb-0.5">
                              <span className="text-slate-600 dark:text-slate-300">Lexis &amp; Structure</span>
                              <span className="font-mono font-bold text-emerald-500">89% (Mastered)</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-emerald-500 w-[89%]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStageId === "improve" && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 space-y-2">
                        <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 uppercase font-bold">Targeted Socratic Remediation</span>
                        <p className="text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                          &quot;Candidate missed question on esterification because reagents were reversed. Auto-enqueued 5 focused practice drills on catalyst conditions.&quot;
                        </p>
                      </div>
                    </div>
                  )}

                  {activeStageId === "master" && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950 dark:text-amber-200">Academic Challenge Speed Rating</span>
                          <span className="font-mono font-black text-amber-800 dark:text-amber-400 text-sm">Elo: 1420</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                          Synchronous 1v1 examination sprints against candidates across Nigeria.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 pt-2.5 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>BrainLab Loop Architecture</span>
                  <span className="font-mono">Updated in real-time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
