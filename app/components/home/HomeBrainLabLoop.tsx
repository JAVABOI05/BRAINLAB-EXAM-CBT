"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG } from "@/app/lib/contentConfig";

function LoopStageIcon({ id, className = "h-4 w-4" }: { id: string; className?: string }) {
  switch (id) {
    case "learn":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10M6 10h10" />
        </svg>
      );
    case "practise":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
        </svg>
      );
    case "diagnose":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      );
    case "improve":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
        </svg>
      );
    case "master":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    default:
      return null;
  }
}

const STAGE_ROUTE_MAP: Record<
  string,
  {
    href: string;
    label: string;
    previewBadge: string;
    themeColor: string;
    glow: string;
    accentBorder: string;
    accentText: string;
    accentBg: string;
  }
> = {
  learn: {
    href: "/learn",
    label: "Explore Curriculum Lessons",
    previewBadge: "Interactive Theory & Formulas",
    themeColor: "from-blue-600 via-sky-500 to-cyan-400",
    glow: "border-cyan-400/50 shadow-cyan-950/40",
    accentBorder: "border-cyan-400",
    accentText: "text-cyan-300",
    accentBg: "bg-cyan-500/10",
  },
  practise: {
    href: "/cbt",
    label: "Launch Timed CBT Simulator",
    previewBadge: "Authentic 8-Key Simulator",
    themeColor: "from-teal-500 via-emerald-500 to-cyan-400",
    glow: "border-teal-400/50 shadow-teal-950/40",
    accentBorder: "border-teal-400",
    accentText: "text-teal-300",
    accentBg: "bg-teal-500/10",
  },
  diagnose: {
    href: "/learning-dna",
    label: "Inspect Weak Subtopics",
    previewBadge: "AI Cognitive Diagnostic Radar",
    themeColor: "from-fuchsia-600 via-purple-500 to-pink-400",
    glow: "border-fuchsia-400/50 shadow-fuchsia-950/40",
    accentBorder: "border-fuchsia-400",
    accentText: "text-fuchsia-300",
    accentBg: "bg-fuchsia-500/10",
  },
  improve: {
    href: "/ai-learning",
    label: "Launch Socratic AI Drills",
    previewBadge: "Step-by-Step AI Derivation",
    themeColor: "from-violet-600 via-purple-500 to-amber-400",
    glow: "border-amber-400/50 shadow-amber-950/40",
    accentBorder: "border-amber-400",
    accentText: "text-amber-300",
    accentBg: "bg-amber-500/10",
  },
  master: {
    href: "/challenge-arena",
    label: "Join 1v1 National Arena",
    previewBadge: "Live Synchronous Duels",
    themeColor: "from-amber-500 via-orange-500 to-rose-400",
    glow: "border-orange-400/50 shadow-orange-950/40",
    accentBorder: "border-orange-400",
    accentText: "text-orange-300",
    accentBg: "bg-orange-500/10",
  },
};

export function HomeBrainLabLoop() {
  const loopStages = HOMEPAGE_CONTENT_CONFIG.loopStages;
  const [activeStageId, setActiveStageId] = useState<string>("learn");

  // Interactive state for Learn stage
  const [learnFormulaMode, setLearnFormulaMode] = useState<"formula" | "derivation">("formula");
  // Interactive state for Practise stage
  const [practiseOption, setPractiseOption] = useState<string>("B");
  // Interactive state for Socratic stage
  const [showSocraticHint, setShowSocraticHint] = useState<boolean>(false);

  const activeStage =
    loopStages.find((s) => s.id === activeStageId) || loopStages[0];
  const activeRoute = STAGE_ROUTE_MAP[activeStage.id] || STAGE_ROUTE_MAP.learn;

  return (
    <section
      id="the-loop"
      aria-label="The BrainLab Pedagogical Loop"
      className="scroll-mt-20 sm:scroll-mt-24 relative w-full overflow-hidden py-14 sm:py-20 border-b border-white/10"
    >
      {/* Dynamic Ambient Background Glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[450px] bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-purple-600/15 blur-[150px] opacity-70"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Refined Empirical Branding */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-blue-500/10 text-cyan-300 border border-blue-400/30 mb-3 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>THE BRAINLAB LOOP (SLOTS S3-01 &amp; S3-02)</span>
          </span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            From Fundamental Concept to Complete Exam Mastery
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            A continuous 5-stage pedagogical pipeline engineered to replace blind past-question cramming with scientific diagnostic mastery.
          </p>
        </div>

        {/* 1. SCULPTED 5-STAGE CONNECTED PEDAGOGICAL RAIL */}
        <div
          role="tablist"
          aria-label="Loop Stages"
          className="relative mb-10 sm:mb-12"
        >
          {/* Subtle Horizontal Connector Rail on Desktop */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 bg-gradient-to-r from-blue-500/30 via-indigo-500/40 to-amber-500/30 -translate-y-1/2 pointer-events-none" />

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative z-10">
            {loopStages.map((stage, idx) => {
              const isSelected = stage.id === activeStageId;
              const route = STAGE_ROUTE_MAP[stage.id] || STAGE_ROUTE_MAP.learn;

              return (
                <button
                  key={stage.id}
                  role="tab"
                  id={`tab-${stage.id}`}
                  aria-controls={`panel-${stage.id}`}
                  aria-selected={isSelected}
                  onClick={() => setActiveStageId(stage.id)}
                  className={`group relative flex flex-col items-start p-4 rounded-2xl text-left transition-all duration-300 bl-focus-ring cursor-pointer ${
                    isSelected
                      ? `bg-[#0E172A] text-white shadow-2xl border-2 ${route.accentBorder} scale-102 ${route.glow}`
                      : "border border-white/[0.08] bg-[#0A101D]/80 hover:bg-[#111A2E] hover:border-white/20 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        isSelected ? route.accentBg + " " + route.accentText : "bg-slate-800 text-slate-400"
                      } border border-white/10 shrink-0 transition-transform group-hover:scale-110`}
                      aria-hidden="true"
                    >
                      <LoopStageIcon id={stage.id} className="h-4 w-4" />
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isSelected
                          ? `bg-gradient-to-r ${route.themeColor} text-slate-950 font-black shadow-xs`
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      STAGE {stage.number}
                    </span>
                  </div>

                  <span
                    className={`text-sm sm:text-base font-black tracking-tight ${
                      isSelected ? route.accentText : "text-white"
                    }`}
                  >
                    {stage.title}
                  </span>
                  <span className="text-xs text-slate-400 truncate w-full mt-0.5">
                    {stage.subtitle}
                  </span>

                  {isSelected && (
                    <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r ${route.themeColor} shadow-md`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. THE EXPANSIVE EMPIRICAL LAB STAGE (CINEMATIC 2-COLUMN VIEW) */}
        <div
          id={`panel-${activeStage.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeStage.id}`}
          className="relative rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-[#071124]/90 to-[#030612]/95 p-6 sm:p-10 lg:p-12 shadow-2xl backdrop-blur-xl transition-all duration-500 overflow-hidden"
        >
          {/* Glowing Top Edge Line */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${activeRoute.themeColor}`} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* LEFT COLUMN: Stage Identity, Narrative & Capabilities */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-3.5">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${activeRoute.themeColor} text-slate-950 text-lg font-black shadow-lg border border-white/20`}>
                  {activeStage.number}
                </span>
                <div>
                  <div className={`text-xs font-mono font-bold ${activeRoute.accentText} uppercase tracking-wider`}>
                    Stage {activeStage.number} &bull; Continuous Cognitive Loop
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {activeStage.title}: {activeStage.subtitle}
                  </h3>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {activeStage.description}
              </p>

              {/* Synchronized Platform Capabilities */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Integrated Platform Tools:
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeStage.products.map((prod) => (
                    <span
                      key={prod}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950/80 text-slate-200 border border-white/15 shadow-xs"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      <span>{prod}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* STEM Studio Integration Callout */}
              {activeStage.stemRole && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-200 flex items-start gap-3 shadow-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 shrink-0" aria-hidden="true">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 2v7.31L4.2 18.24A2 2 0 0 0 5.86 21h12.28a2 2 0 0 0 1.66-2.76L14 9.31V2" />
                      <path d="M8.5 2h7M7 16h10" />
                    </svg>
                  </span>
                  <div>
                    <span className="font-extrabold text-emerald-300 uppercase tracking-wider block mb-0.5 text-[11px]">
                      STEM Studio Cross-Cutting Integration:
                    </span>
                    <span className="leading-relaxed">{activeStage.stemRole}</span>
                  </div>
                </div>
              )}

              {/* Stage Direct Action Link */}
              <div className="pt-2">
                <Link
                  href={activeRoute.href}
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-teal-300 active:translate-y-0.5 px-7 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/25 transition-all bl-focus-ring min-h-[48px]"
                >
                  <span>{activeRoute.label}</span>
                  <span aria-hidden="true" className="text-base font-bold">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMN: Authentic High-Voltage Interactive Telemetry Stage */}
            <div className="lg:col-span-6">
              <div
                className="rounded-2xl border border-white/15 bg-[#030712]/95 p-5 sm:p-6 shadow-2xl relative overflow-hidden"
                role="region"
                aria-label={`Preview of ${activeStage.title} Stage Output`}
              >
                {/* Header Chrome Bar */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center text-cyan-300" aria-hidden="true">
                      <LoopStageIcon id={activeStage.id} className="h-4 w-4" />
                    </span>
                    <span className="font-bold uppercase tracking-wider text-white text-[11px]">
                      {activeStage.title} Mode &bull; Diagnostic Cognitive Radar (Slot S3-02)
                    </span>
                  </div>
                  <span className="rounded-md bg-blue-900/60 border border-blue-700/60 px-2.5 py-0.5 text-[9px] font-black uppercase text-cyan-300">
                    {activeRoute.previewBadge}
                  </span>
                </div>

                {/* 1. STAGE 1: LEARN — Theory & Interactive Formula Laboratory */}
                {activeStage.id === "learn" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Formula Breakdown Mode:</span>
                      <div className="flex rounded-lg bg-slate-900 border border-white/10 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setLearnFormulaMode("formula")}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                            learnFormulaMode === "formula" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                          }`}
                        >
                          Equation
                        </button>
                        <button
                          type="button"
                          onClick={() => setLearnFormulaMode("derivation")}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                            learnFormulaMode === "derivation" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                          }`}
                        >
                          Derivation
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-500/30 bg-slate-900/90 p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-cyan-400 font-mono">
                        <span>JAMB Physics &bull; Motion &amp; Kinematics</span>
                        <span>Equation #02</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-mono font-black text-white text-center py-2 bg-slate-950/80 rounded-lg border border-white/10">
                        {learnFormulaMode === "formula" ? "v² = u² + 2as" : "s = ut + ½at²"}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed text-center">
                        {learnFormulaMode === "formula"
                          ? "Relates final velocity directly to initial velocity, acceleration, and displacement without requiring time variable (t)."
                          : "Calculates total displacement covered under uniform acceleration over elapsed duration (t)."}
                      </p>
                    </div>

                    {/* Audio Narration Waveform Strip */}
                    <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-cyan-300 text-xs font-bold" aria-hidden="true">
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </span>
                        <div>
                          <div className="text-[11px] font-bold text-white">Audio Theory Walkthrough</div>
                          <div className="text-[9px] text-slate-400 font-mono">Teacher: Dr. A. Bello (03:14)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 h-4">
                        {[40, 75, 55, 90, 60, 30, 80, 100, 45, 70, 85, 40].map((h, i) => (
                          <span
                            key={i}
                            className="w-1 bg-cyan-400 rounded-full animate-pulse"
                            style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. STAGE 2: PRACTISE — Authentic JAMB 8-Key Exam Cockpit */}
                {activeStage.id === "practise" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                      <span className="text-slate-400 font-mono">JAMB UTME Simulation</span>
                      <span className="font-mono text-amber-400 font-black animate-pulse flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>01:58:42</span>
                      </span>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3.5 space-y-2.5">
                      <div className="text-[11px] font-bold text-cyan-400">
                        Question 14 of 40 &bull; Chemistry (Acids &amp; Bases)
                      </div>
                      <p className="text-xs text-white leading-relaxed font-medium">
                        What is the pH of a 0.001 M solution of hydrochloric acid (HCl)?
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { k: "A", val: "pH = 1.0" },
                          { k: "B", val: "pH = 3.0" },
                          { k: "C", val: "pH = 7.0" },
                          { k: "D", val: "pH = 11.0" },
                        ].map((opt) => (
                          <button
                            key={opt.k}
                            type="button"
                            onClick={() => setPractiseOption(opt.k)}
                            className={`p-2 rounded-lg text-left flex items-center gap-2 transition-all ${
                              practiseOption === opt.k
                                ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30"
                                : "bg-slate-950 border border-white/10 text-slate-300 hover:text-white"
                            }`}
                          >
                            <span className="h-5 w-5 rounded-md bg-white/20 flex items-center justify-center text-[10px] font-black">
                              {opt.k}
                            </span>
                            <span>{opt.val}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 8-Key Simulator Keypad */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">
                        Official 8-Key Exam Controls:
                      </span>
                      <div className="grid grid-cols-8 gap-1 text-center font-mono text-[10px] font-black">
                        {["A", "B", "C", "D", "P", "N", "S", "R"].map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (["A", "B", "C", "D"].includes(key)) setPractiseOption(key);
                            }}
                            className={`py-1.5 rounded-md border transition-all ${
                              practiseOption === key
                                ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-xs"
                                : "bg-slate-900 border-white/15 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. STAGE 3: DIAGNOSE — Slot S3-02 Cognitive Radar SVG */}
                {activeStage.id === "diagnose" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="text-xs font-bold text-slate-300 flex justify-between items-center">
                      <span>Multi-Subject Mastery Analysis:</span>
                      <span className="text-cyan-400 font-mono text-[11px]">Real-time Telemetry</span>
                    </div>

                    {/* SVG 5-Axis Radar Diagram */}
                    <div className="relative rounded-xl border border-purple-500/30 bg-slate-950 p-4 flex items-center justify-center h-44">
                      <svg viewBox="0 0 200 200" className="w-44 h-44 overflow-visible">
                        {/* Radar Grid Rings */}
                        <polygon points="100,20 176,75 147,165 53,165 24,75" fill="none" stroke="#334155" strokeWidth="1" />
                        <polygon points="100,50 148,85 130,145 70,145 52,85" fill="none" stroke="#1e293b" strokeWidth="1" />
                        <polygon points="100,75 124,92 115,122 85,122 76,92" fill="none" stroke="#1e293b" strokeWidth="1" />

                        {/* Axis Lines */}
                        <line x1="100" y1="100" x2="100" y2="20" stroke="#334155" strokeWidth="1" />
                        <line x1="100" y1="100" x2="176" y2="75" stroke="#334155" strokeWidth="1" />
                        <line x1="100" y1="100" x2="147" y2="165" stroke="#334155" strokeWidth="1" />
                        <line x1="100" y1="100" x2="53" y2="165" stroke="#334155" strokeWidth="1" />
                        <line x1="100" y1="100" x2="24" y2="75" stroke="#334155" strokeWidth="1" />

                        {/* Candidate Performance Polygon */}
                        <polygon
                          points="100,32 165,80 135,155 60,140 38,82"
                          fill="rgba(56, 189, 248, 0.25)"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />

                        {/* Data Points */}
                        <circle cx="100" cy="32" r="3" fill="#38bdf8" />
                        <circle cx="165" cy="80" r="3" fill="#38bdf8" />
                        <circle cx="135" cy="155" r="3" fill="#38bdf8" />
                        <circle cx="60" cy="140" r="3" fill="#f43f5e" />
                        <circle cx="38" cy="82" r="3" fill="#38bdf8" />

                        {/* Axis Labels */}
                        <text x="100" y="14" fill="#94a3b8" fontSize="8" textAnchor="middle">Math (88%)</text>
                        <text x="180" y="75" fill="#94a3b8" fontSize="8">Physics (82%)</text>
                        <text x="150" y="178" fill="#94a3b8" fontSize="8">English (91%)</text>
                        <text x="50" y="178" fill="#f43f5e" fontSize="8" fontWeight="bold">Chemistry (42%)</text>
                        <text x="10" y="75" fill="#94a3b8" fontSize="8">Biology (78%)</text>
                      </svg>
                    </div>

                    {/* Prescribed Targeted Action */}
                    <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-2.5 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-rose-400 font-bold block text-[11px]">Flagged Diagnostic Weakness:</span>
                        <span className="text-white text-[11px]">Organic Chemistry (Alkanols &amp; Esters)</span>
                      </div>
                      <span className="rounded-md bg-rose-500 text-slate-950 px-2 py-1 text-[10px] font-black">
                        5 Remedial Drills
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. STAGE 4: IMPROVE — Socratic AI Guidance */}
                {activeStage.id === "improve" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="text-xs font-bold text-slate-300 flex justify-between items-center">
                      <span>Socratic Guidance Engine:</span>
                      <span className="text-purple-400 font-mono text-[11px]">Zero Answer Spoilers</span>
                    </div>

                    {/* Interactive Socratic Dialogue Box */}
                    <div className="rounded-xl border border-purple-500/30 bg-slate-900/90 p-4 space-y-3">
                      <div className="flex items-start gap-2.5 text-xs">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                          YOU
                        </span>
                        <p className="text-slate-200 bg-slate-950 p-2 rounded-lg border border-white/5">
                          &ldquo;Why is option B incorrect in the esterification question?&rdquo;
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5 text-xs">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white font-mono text-[10px] font-bold">
                          AI
                        </span>
                        <div className="text-slate-200 bg-purple-950/40 p-2.5 rounded-lg border border-purple-800/40 space-y-1.5 leading-relaxed">
                          <p>
                            Examine the sulfuric acid reagent carefully. Is concentrated H₂SO₄ acting as an oxidising agent or a dehydrating catalyst in this temperature range?
                          </p>
                          {showSocraticHint && (
                            <p className="text-amber-300 text-[11px] font-medium border-t border-purple-800/60 pt-1.5 animate-fade-in flex items-start gap-1.5">
                              <span className="text-amber-400 font-bold uppercase text-[10px] tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">Hint</span>
                              <span>At 170°C, concentrated sulfuric acid removes water completely to yield an alkene (ethene), not an ester!</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSocraticHint(!showSocraticHint)}
                      className="w-full py-2.5 rounded-xl border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 text-purple-200 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <svg className="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span>{showSocraticHint ? "Hide Socratic Step" : "Reveal Socratic Step 1 Hint"}</span>
                    </button>
                  </div>
                )}

                {/* 5. STAGE 5: MASTER — National 1v1 Arena HUD */}
                {activeStage.id === "master" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">National Elo Sprint Battle:</span>
                      <span className="text-amber-400 font-mono font-black">National Master Tier</span>
                    </div>

                    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <div className="font-extrabold text-white">Challenger Speed Sprint</div>
                          <div className="text-[10px] text-amber-300 font-mono">Rank #14 Nationwide</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-black text-amber-400 text-sm">Elo: 1420</div>
                          <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-end gap-1">
                            <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span>8-Win Streak</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full w-[94%]" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
                        <div className="rounded-lg bg-slate-900 p-2 border border-white/5">
                          <span className="text-slate-400 block">Avg Response</span>
                          <span className="font-bold text-white text-xs">11.4s / Question</span>
                        </div>
                        <div className="rounded-lg bg-slate-900 p-2 border border-white/5">
                          <span className="text-slate-400 block">Sprint Duels</span>
                          <span className="font-bold text-amber-300 text-xs">Synchronous 1v1</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between border-t border-white/10">
                      <span>Continuous Learning System</span>
                      <span className="text-emerald-400 font-bold inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Active in all plan tiers</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
