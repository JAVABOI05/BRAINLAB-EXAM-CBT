"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG } from "@/app/lib/contentConfig";
import { DiagnosticScoreBarDemo } from "./DiagnosticScoreBarDemo";
import { useScrollReveal } from "@/app/lib/useScrollReveal";
import "./home-loop.css";

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
  learn: { href: "/learn",
    label: "Explore Curriculum Lessons",
    previewBadge: "Interactive Theory & Formulas",
    themeColor: "from-blue-600 via-sky-500 to-cyan-400",
    glow: "border-cyan-400/50 shadow-cyan-950/40",
    accentBorder: "border-blue-600 ",
    accentText: "text-blue-700 ",
    accentBg: "bg-blue-100 ",
  },
  practise: { href: "/cbt",
    label: "Launch Timed CBT Simulator",
    previewBadge: "Authentic 8-Key Simulator",
    themeColor: "from-teal-500 via-emerald-500 to-cyan-400",
    glow: "border-teal-400/50 shadow-teal-950/40",
    accentBorder: "border-emerald-600 ",
    accentText: "text-emerald-700 ",
    accentBg: "bg-emerald-100 ",
  },
  diagnose: { href: "/learning-dna",
    label: "Inspect Weak Subtopics",
    previewBadge: "AI Cognitive Diagnostic Radar",
    themeColor: "from-fuchsia-600 via-purple-500 to-pink-400",
    glow: "border-fuchsia-400/50 shadow-fuchsia-950/40",
    accentBorder: "border-purple-600 ",
    accentText: "text-purple-700 ",
    accentBg: "bg-purple-100 ",
  },
  improve: { href: "/ai-learning",
    label: "Launch Socratic AI Drills",
    previewBadge: "Step-by-Step AI Derivation",
    themeColor: "from-violet-600 via-purple-500 to-amber-400",
    glow: "border-amber-400/50 shadow-amber-950/40",
    accentBorder: "border-amber-600 ",
    accentText: "text-amber-700 ",
    accentBg: "bg-amber-100 ",
  },
  master: { href: "/challenge-arena",
    label: "Join 1v1 National Arena",
    previewBadge: "Live Synchronous Duels",
    themeColor: "from-amber-500 via-orange-500 to-rose-400",
    glow: "border-orange-400/50 shadow-orange-950/40",
    accentBorder: "border-orange-600 ",
    accentText: "text-orange-700 ",
    accentBg: "bg-orange-100 ",
  },
};

export function HomeBrainLabLoop(): React.JSX.Element {
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
  const { ref, isRevealed } = useScrollReveal();

  return (
    <section
      id="the-loop"
      data-slot="THE BRAINLAB LOOP (SLOTS S3-01 & S3-02)"
      aria-label="How BrainLab Works - The 5-Step Learning Method"
      className="scroll-mt-20 sm:scroll-mt-24 relative w-full overflow-hidden pt-10 pb-0 sm:pt-16 sm:pb-0 border-b-0 bg-blue-50/50 text-slate-900"
    >
      {/* Brilliant Subtle Geometric Grid Matrix */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#1e293b 1.2px, transparent 1.2px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />

      <div
        ref={ref}
        className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 bl-reveal-init ${isRevealed ? "bl-reveal-visible" : ""}`}
      >
        {/* Section Header with Refined Empirical Branding */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-0.5 sm:px-3.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black bg-blue-100 text-blue-800 border border-blue-300 mb-2 sm:mb-3 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span>HOW BRAINLAB WORKS &bull; THE 5-STEP STUDY METHOD</span>
          </span>
          <h2 className="text-xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            From Fundamental Concept to Complete Exam Mastery
          </h2>
          <p className="mt-2 text-xs sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
            A simple, powerful 5-step learning system designed to help you understand topics deeply, fix errors, and excel in your exams.
          </p>
        </div>

        {/* 1. SCULPTED 5-STAGE CONNECTED PEDAGOGICAL RAIL */}
        <div
          role="tablist"
          aria-label="Loop Stages"
          className="relative mb-6 sm:mb-10"
        >
          {/* Subtle Horizontal Connector Rail on Desktop */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 bg-slate-200 -translate-y-1/2 pointer-events-none" />

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 relative z-10">
            {loopStages.map((stage) => {
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
                  className={`group relative flex flex-col items-start p-2.5 sm:p-4 rounded-xl sm:rounded-2xl text-left transition-all duration-200 bl-focus-ring cursor-pointer border-2 border-b-4 active:border-b-2 active:translate-y-0.5 shadow-sm ${
                    isSelected
                      ? `bg-white text-slate-900 ${route.accentBorder} bl-loop-node-active`
                      : "border-slate-200 bg-slate-50/70 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        isSelected ? route.accentBg + " " + route.accentText : "bg-slate-200  text-slate-600"
                      } border border-slate-300  shrink-0 transition-transform group-hover:scale-110`}
                      aria-hidden="true"
                    >
                      <LoopStageIcon id={stage.id} className="h-4 w-4" />
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-blue-600 text-white font-black shadow-xs"
                          : "bg-slate-200  text-slate-600"
                      }`}
                    >
                      STAGE {stage.number}
                    </span>
                  </div>

                  <span
                    className={`text-sm sm:text-base font-black tracking-tight ${
                      isSelected ? "text-slate-900" : "text-slate-700"
                    }`}
                  >
                    {stage.title}
                  </span>
                  <span className="text-xs text-slate-500 truncate w-full mt-0.5 font-medium">
                    {stage.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. THE EXPANSIVE EMPIRICAL LAB STAGE (CINEMATIC 2-COLUMN VIEW - ROCK-SOLID STATIC BOX) */}
        <div
          key={activeStage.id}
          id={`panel-${activeStage.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeStage.id}`}
          className="bl-loop-grow relative rounded-3xl border-2 border-slate-200 bg-white p-5 sm:p-8 lg:p-10 shadow-sm transition-all overflow-hidden min-h-0 lg:min-h-[580px] flex flex-col justify-center dark:border-slate-800 dark:bg-slate-900/90"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch h-full">
            {/* LEFT COLUMN: Stage Identity, Narrative & Capabilities (Static height chassis) */}
            <div className="lg:col-span-6 flex flex-col justify-between h-full space-y-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white text-lg font-black shadow-md border-2 border-blue-700 border-b-4">
                    {activeStage.number}
                  </span>
                  <div>
                    <div className={`text-xs font-mono font-bold ${activeRoute.accentText} uppercase tracking-wider`}>
                      Step {activeStage.number} of 5 &bull; The BrainLab Method
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {activeStage.title}: {activeStage.subtitle}
                    </h3>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal min-h-[48px]">
                  {activeStage.description}
                </p>

                {/* Synchronized Platform Capabilities */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Integrated Platform Tools:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {activeStage.products.map((prod) => (
                      <span
                        key={prod}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100  text-slate-800  border border-slate-200  shadow-xs"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 " />
                        <span>{prod}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* STEM Studio Integration Callout / Curriculum Benchmark (Consistent static slot) */}
                <div className="min-h-[72px]">
                  {activeStage.stemRole ? (
                    <div className="rounded-2xl border-2 border-emerald-200  bg-emerald-50/70  p-3.5 text-xs text-emerald-900  flex items-start gap-3 shadow-xs">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100  text-emerald-700  border border-emerald-300  shrink-0 font-bold" aria-hidden="true">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                      </span>
                      <div>
                        <span className="font-extrabold text-emerald-800  uppercase tracking-wider block mb-0.5 text-[11px]">
                          Interactive Science &amp; STEM Lab:
                        </span>
                        <span className="leading-relaxed">{activeStage.stemRole}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-blue-200  bg-blue-50/70  p-3.5 text-xs text-blue-900  flex items-start gap-3 shadow-xs">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100  text-blue-700  border border-blue-300  shrink-0 font-bold" aria-hidden="true">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="6" />
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                      </span>
                      <div>
                        <span className="font-extrabold text-blue-800  uppercase tracking-wider block mb-0.5 text-[11px]">
                          Official NERDC Syllabus Benchmark:
                        </span>
                        <span className="leading-relaxed">100% verified question bank aligned with official UTME, WAEC and NECO standards.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stage Direct Action Link */}
              <div className="pt-2">
                <Link
                  href={activeRoute.href}
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 text-xs sm:text-sm font-black border-2 border-blue-700 border-b-4 active:border-b-2 active:translate-y-0.5 shadow-md transition-all bl-focus-ring min-h-[48px]"
                >
                  <span>{activeRoute.label}</span>
                  <span aria-hidden="true" className="text-base font-bold">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMN: Authentic High-Voltage Interactive Telemetry Stage (Static locked height) */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div
                className="rounded-2xl border-2 border-slate-200 bg-slate-50  p-5 sm:p-6 shadow-inner relative overflow-hidden h-[450px] flex flex-col justify-between"
                role="region"
                aria-label={`Preview of ${activeStage.title} Stage Output`}
                data-slot="Diagnostic Cognitive Radar (Slot S3-02)"
              >
                {/* Header Chrome Bar */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center text-blue-600 " aria-hidden="true">
                      <LoopStageIcon id={activeStage.id} className="h-4 w-4" />
                    </span>
                    <span className="font-bold uppercase tracking-wider text-slate-900 text-[11px]">
                      {activeStage.title} Preview &bull; Interactive Learning Simulation
                    </span>
                  </div>
                  <span className="rounded-md bg-blue-100  border border-blue-200  px-2.5 py-0.5 text-[9px] font-black uppercase text-blue-800 ">
                    {activeRoute.previewBadge}
                  </span>
                </div>

                {/* 1. STAGE 1: LEARN — Theory & Interactive Formula Laboratory */}
                {activeStage.id === "learn" && (
                  <div className="space-y-4 animate-bl-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Formula Breakdown Mode:</span>
                      <div className="flex rounded-lg bg-white  border border-slate-200 p-0.5 text-[11px] shadow-xs">
                        <button
                          type="button"
                          onClick={() => setLearnFormulaMode("formula")}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            learnFormulaMode === "formula" ? "bg-blue-600 text-white font-black shadow-xs" : "text-slate-600"
                          }`}
                        >
                          Equation
                        </button>
                        <button
                          type="button"
                          onClick={() => setLearnFormulaMode("derivation")}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            learnFormulaMode === "derivation" ? "bg-blue-600 text-white font-black shadow-xs" : "text-slate-600"
                          }`}
                        >
                          Derivation
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white  p-4 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between text-[11px] text-blue-600  font-mono font-bold">
                        <span>JAMB Physics &bull; Motion &amp; Kinematics</span>
                        <span>Equation #02</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-mono font-black text-slate-900 text-center py-2 bg-slate-50  rounded-lg border border-slate-200">
                        {learnFormulaMode === "formula" ? "v² = u² + 2as" : "s = ut + ½at²"}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed text-center font-normal min-h-[36px] flex items-center justify-center">
                        {learnFormulaMode === "formula"
                          ? "Relates final velocity directly to initial velocity, acceleration, and displacement without requiring time variable (t)."
                          : "Calculates total displacement covered under uniform acceleration over elapsed duration (t)."}
                      </p>
                    </div>

                    {/* Audio Narration Waveform Strip */}
                    <div className="rounded-xl border border-slate-200 bg-white  p-3 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100  text-blue-600  text-xs font-bold" aria-hidden="true">
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </span>
                        <div>
                          <div className="text-[11px] font-bold text-slate-900">Audio Theory Walkthrough</div>
                          <div className="text-[9px] text-slate-500 font-mono">Teacher: Dr. A. Bello (03:14)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 h-4">
                        {[40, 75, 55, 90, 60, 30, 80, 100, 45, 70, 85, 40].map((h, i) => (
                          <span
                            key={i}
                            className="w-1 bg-blue-600  rounded-full animate-pulse"
                            style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. STAGE 2: PRACTISE — Authentic JAMB 8-Key Exam Cockpit */}
                {activeStage.id === "practise" && (
                  <div className="space-y-4 animate-bl-fade-in">
                    <div className="flex items-center justify-between bg-white  border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs">
                      <span className="text-slate-600 font-mono font-medium">JAMB UTME Simulation</span>
                      <span className="font-mono text-amber-600  font-black flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>01:58:42</span>
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white  p-3.5 space-y-2.5 shadow-xs">
                      <div className="text-[11px] font-bold text-blue-600 ">
                        Question 14 of 40 &bull; Chemistry (Acids &amp; Bases)
                      </div>
                      <p className="text-xs text-slate-800  leading-relaxed font-medium">
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
                            className={`p-2.5 rounded-xl text-left flex items-center gap-2 transition-all border-2 border-b-4 cursor-pointer active:border-b-2 active:translate-y-0.5 ${
                              practiseOption === opt.k
                                ? "bg-emerald-50 border-emerald-600   text-emerald-900  font-bold shadow-xs"
                                : "bg-slate-50  border-slate-200 text-slate-700 hover:border-slate-300 :border-slate-700"
                            }`}
                          >
                            <span className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                              practiseOption === opt.k ? "bg-emerald-600 text-white" : "bg-slate-200  text-slate-700"
                            }`}>
                              {opt.k}
                            </span>
                            <span>{opt.val}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 8-Key Simulator Keypad */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">
                        Official 8-Key Exam Controls:
                      </span>
                      <div className="grid grid-cols-8 gap-1.5 text-center font-mono text-[10px] font-black">
                        {["A", "B", "C", "D", "P", "N", "S", "R"].map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (["A", "B", "C", "D"].includes(key)) setPractiseOption(key);
                            }}
                            className={`h-7 rounded-lg border-2 border-b-4 active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer shadow-xs ${
                              practiseOption === key
                                ? "bg-blue-600 text-white border-blue-800  font-black"
                                : "bg-white  border-slate-200 text-slate-800  hover:border-slate-300"
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. STAGE 3: DIAGNOSE — Slot S3-02 Cognitive Radar SVG & Diagnostic Score Bars */}
                {activeStage.id === "diagnose" && (
                  <div className="space-y-4 animate-bl-fade-in" data-slot="Diagnostic Cognitive Radar (Slot S3-02)">
                    <DiagnosticScoreBarDemo />
                  </div>
                )}

                {/* 4. STAGE 4: IMPROVE — Socratic AI Guidance */}
                {activeStage.id === "improve" && (
                  <div className="space-y-4 animate-bl-fade-in">
                    <div className="text-xs font-bold text-slate-700 flex justify-between items-center">
                      <span>Socratic Guidance Engine:</span>
                      <span className="text-purple-600  font-mono text-[11px] font-bold">Zero Answer Spoilers</span>
                    </div>

                    {/* Interactive Socratic Dialogue Box (Static height - zero layout jump) */}
                    <div className="rounded-xl border border-slate-200 bg-white  p-4 space-y-2.5 shadow-xs h-[255px] flex flex-col justify-between overflow-hidden">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5 text-xs">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100  text-slate-700 font-mono text-[10px] font-bold">
                            YOU
                          </span>
                          <p className="text-slate-700  bg-slate-50  p-2 rounded-lg border border-slate-200 text-[11px]">
                            &ldquo;Why is option B incorrect in the esterification question?&rdquo;
                          </p>
                        </div>

                        <div className="flex items-start gap-2.5 text-xs">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white font-mono text-[10px] font-bold">
                            AI
                          </span>
                          <div className="text-slate-700  bg-purple-50  p-2.5 rounded-lg border border-purple-200  space-y-1 leading-relaxed text-[11px]">
                            <p>
                              Examine the sulfuric acid reagent carefully. Is concentrated H₂SO₄ acting as an oxidising agent or a dehydrating catalyst in this temperature range?
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reserved Hint Slot (Zero layout shift whether revealed or hidden) */}
                      <div className="min-h-[54px] flex items-center">
                        {showSocraticHint ? (
                          <div className="w-full text-amber-800  text-[11px] font-medium border-t border-purple-200  pt-1.5 animate-bl-fade-in flex items-start gap-1.5 bg-amber-50/50  p-2 rounded-lg">
                            <span className="text-amber-700  font-bold uppercase text-[10px] tracking-wider bg-amber-100  px-1.5 py-0.5 rounded border border-amber-300 /30 shrink-0">Hint</span>
                            <span>At 170°C, concentrated sulfuric acid removes water completely to yield an alkene (ethene), not an ester!</span>
                          </div>
                        ) : (
                          <div className="w-full text-[11px] text-slate-400  italic text-center p-2 border border-dashed border-slate-200 rounded-lg">
                            Tap below to reveal Socratic Step 1 reasoning hint
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSocraticHint(!showSocraticHint)}
                      className="w-full py-2.5 rounded-xl border-2 border-b-4 border-purple-600 bg-purple-50  hover:bg-purple-100 :bg-purple-900/50 text-purple-900  font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:border-b-2 active:translate-y-0.5 shadow-xs"
                    >
                      <svg className="h-4 w-4 text-purple-600 " viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                  <div className="space-y-4 animate-bl-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">National Elo Sprint Battle:</span>
                      <span className="text-amber-600  font-mono font-black">National Master Tier</span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white  p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <div className="font-extrabold text-slate-900">Challenger Speed Sprint</div>
                          <div className="text-[10px] text-amber-600  font-mono font-bold">Rank #14 Nationwide</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-black text-amber-600  text-sm">Elo: 1420</div>
                          <div className="text-[10px] text-emerald-600  font-bold flex items-center justify-end gap-1">
                            <svg className="h-3 w-3 text-emerald-600 " viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span>8-Win Streak</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-2 rounded-full bg-slate-100  overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full w-[94%]" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
                        <div className="rounded-lg bg-slate-50  p-2 border border-slate-200">
                          <span className="text-slate-500 block">Avg Response</span>
                          <span className="font-bold text-slate-900 text-xs">11.4s / Question</span>
                        </div>
                        <div className="rounded-lg bg-slate-50  p-2 border border-slate-200">
                          <span className="text-slate-500 block">Sprint Duels</span>
                          <span className="font-bold text-amber-600  text-xs inline-flex items-center gap-1">
                            <span className="bl-loop-vs inline-block">⚔️</span>
                            <span>Synchronous 1v1</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200">
                      <span>Continuous Learning System</span>
                      <span className="text-emerald-600  font-bold inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Active for all candidate tracks</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asymmetric Angled SVG Transition into Deep Navy Product Showcase */}
      <div className="relative w-full overflow-hidden leading-none z-10 -mb-[1px] pointer-events-none mt-12 sm:mt-16" aria-hidden="true">
        <svg
          className="relative block w-full h-8 sm:h-12 lg:h-16 text-[#0B1536]"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
        >
          <path
            d="M0,60 L1440,0 L1440,60 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}
