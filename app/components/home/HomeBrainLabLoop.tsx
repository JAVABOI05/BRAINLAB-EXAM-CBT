"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG } from "@/app/lib/contentConfig";

const STAGE_ROUTE_MAP: Record<
  string,
  { href: string; label: string; icon: string; previewBadge: string }
> = {
  learn: {
    href: "/learn",
    label: "Explore Curriculum Lessons",
    icon: "📖",
    previewBadge: "Interactive Theory & Formulas",
  },
  practise: {
    href: "/cbt",
    label: "Launch Timed CBT Simulator",
    icon: "⌨️",
    previewBadge: "Authentic 8-Key Simulator",
  },
  diagnose: {
    href: "/learning-dna",
    label: "Inspect Weak Subtopics",
    icon: "🧬",
    previewBadge: "AI Cognitive Diagnostic Radar",
  },
  improve: {
    href: "/ai-learning",
    label: "Launch Socratic AI Drills",
    icon: "💡",
    previewBadge: "Step-by-Step AI Derivation",
  },
  master: {
    href: "/arena",
    label: "Join 1v1 National Arena",
    icon: "🏆",
    previewBadge: "Live Synchronous Duels",
  },
};

export function HomeBrainLabLoop() {
  const loopStages = HOMEPAGE_CONTENT_CONFIG.loop;
  const [activeStageId, setActiveStageId] = useState<string>("learn");

  const activeStage =
    loopStages.find((s) => s.id === activeStageId) || loopStages[0];
  const activeRoute = STAGE_ROUTE_MAP[activeStage.id] || STAGE_ROUTE_MAP.learn;

  return (
    <section
      id="the-loop"
      aria-label="The BrainLab Pedagogical Loop"
      className="scroll-mt-20 sm:scroll-mt-24 relative w-full overflow-hidden py-14 sm:py-18 lg:py-20 border-b border-white/10"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-blue-500/10 text-cyan-300 border border-blue-400/30 mb-2.5">
            THE BRAINLAB LOOP (SLOTS S3-01 &amp; S3-02)
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            From Fundamental Concept to Exam Mastery
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
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
                className={`group relative flex flex-col items-start p-3.5 sm:p-4 rounded-2xl text-left transition-all duration-200 bl-focus-ring min-h-[52px] ${
                  isSelected
                    ? "bg-gradient-to-br from-blue-900/90 via-[#0d1e3d] to-indigo-950/90 border-2 border-cyan-400 shadow-xl shadow-blue-900/30 ring-2 ring-cyan-500/30"
                    : "border border-white/10 bg-slate-900/80 hover:bg-slate-800/90 hover:border-white/20 text-white"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform">
                    {route?.icon}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 font-black"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    STEP {stage.number}
                  </span>
                </div>
                <span
                  className={`text-xs sm:text-sm font-black tracking-tight ${
                    isSelected ? "text-cyan-300" : "text-white"
                  }`}
                >
                  {stage.title}
                </span>
                <span
                  className={`text-[11px] truncate w-full mt-0.5 ${
                    isSelected ? "text-slate-200" : "text-slate-400"
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
          className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Column: Visual Highlights */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-base font-black shadow-md border border-white/20">
                  {activeStage.number}
                </span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {activeStage.title}: {activeStage.subtitle}
                  </h3>
                  <span className="text-xs font-bold text-cyan-400">
                    Cycle Stage {activeStage.number} of 05 &bull; Continuous Cognitive Loop
                  </span>
                </div>
              </div>

              {/* Punchy Stage Description */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-200 border border-white/10 shadow-2xs"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      <span>{prod}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* STEM Studio Integration Callout */}
              {activeStage.stemRole && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5">
                  <span className="text-emerald-400 font-black text-base">🔬</span>
                  <div>
                    <span className="font-bold text-emerald-300">
                      STEM Studio Integration:{" "}
                    </span>
                    <span>{activeStage.stemRole}</span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href={activeRoute.href}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:translate-y-0.5 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all bl-focus-ring min-h-[48px]"
                >
                  <span>{activeRoute.label}</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Real Stage Interactive Telemetry Card */}
            <div className="lg:col-span-6">
              <div
                className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 sm:p-5 shadow-inner flex flex-col justify-between"
                role="region"
                aria-label={`Preview of ${activeStage.title} Stage Output`}
              >
                {/* Telemetry Chrome Bar */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">{activeRoute.icon}</span>
                    <span className="font-bold uppercase tracking-wider text-white text-[11px]">
                      {activeStage.title} Mode Telemetry
                    </span>
                  </div>
                  <span className="rounded-md bg-blue-900/60 border border-blue-700/60 px-2 py-0.5 text-[9px] font-black uppercase text-cyan-300">
                    {activeRoute.previewBadge}
                  </span>
                </div>

                {/* Simulated Telemetry Body */}
                <div className="py-4 space-y-3">
                  <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3 text-xs">
                    <span className="text-slate-400 font-mono text-[10px] block mb-1">
                      ACTIVE CYCLE TARGET
                    </span>
                    <p className="font-extrabold text-white">
                      {activeStage.id === "learn" && "NERDC Physics & Chemistry Syllabus: Waves, Motion & Organic Functional Groups"}
                      {activeStage.id === "practise" && "JAMB UTME 4-Subject Simulation: English, Mathematics, Physics, Chemistry"}
                      {activeStage.id === "diagnose" && "Dynamic Weakness Telemetry: Calculus (68%), Alkanols (42%), Lexis (89%)"}
                      {activeStage.id === "improve" && "Socratic Hint Ladder: Clue 1 > Formula Derivation > Distractor Traps"}
                      {activeStage.id === "master" && "Head-to-head 1v1 National Sprint: Rank #14 Nationwide • 8-day streak"}
                    </p>
                  </div>

                  {/* Micro metric bar */}
                  <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3">
                    <div className="flex justify-between text-[11px] mb-1 font-mono">
                      <span className="text-slate-400">Pedagogical Readiness</span>
                      <span className="text-cyan-400 font-bold">
                        {activeStage.id === "learn" && "94% Syllabus Tracked"}
                        {activeStage.id === "practise" && "100% 8-Key Exam Parity"}
                        {activeStage.id === "diagnose" && "Real-time Telemetry"}
                        {activeStage.id === "improve" && "Zero Answer Spoilers"}
                        {activeStage.id === "master" && "Top 2% Accuracy Tier"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{
                          width:
                            activeStage.id === "learn"
                              ? "94%"
                              : activeStage.id === "practise"
                              ? "100%"
                              : activeStage.id === "diagnose"
                              ? "75%"
                              : activeStage.id === "improve"
                              ? "85%"
                              : "98%",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-white/10">
                  <span>Continuous Learning System</span>
                  <span className="text-emerald-400 font-bold">● Active in all plan tiers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
