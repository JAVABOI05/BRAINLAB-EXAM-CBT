"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG } from "@/app/lib/contentConfig";

interface ShowcaseQuestion {
  id: number;
  subject: string;
  topic: string;
  question: string;
  options: { key: "A" | "B" | "C" | "D"; label: string }[];
  correct: "A" | "B" | "C" | "D";
  derivation: string;
  examinerTrap: string;
}

const SHOWCASE_QUESTIONS: ShowcaseQuestion[] = [
  {
    id: 1,
    subject: "Use of English",
    topic: "Lexis & Concord (Rule of Proximity)",
    question: "Choose the correct verb: 'Neither the principal nor the teachers _______ present at the annual valedictory service.'",
    options: [
      { key: "A", label: "were" },
      { key: "B", label: "was" },
      { key: "C", label: "is" },
      { key: "D", label: "are being" },
    ],
    correct: "A",
    derivation: "Under the grammatical rule of proximity, with 'neither... nor', the verb agrees with the closer plural subject 'teachers' ⟹ 'were'.",
    examinerTrap: "Trap: Instinctively agreeing with the distant singular subject 'principal'.",
  },
  {
    id: 2,
    subject: "Mathematics",
    topic: "Quadratic Equations & Roots",
    question: "Find the values of x that satisfy: 2x² + 5x + 3 = 0.",
    options: [
      { key: "A", label: "x = -1 or x = -3/2" },
      { key: "B", label: "x = 1 or x = 3/2" },
      { key: "C", label: "x = -1 or x = 3/2" },
      { key: "D", label: "x = 1 or x = -3/2" },
    ],
    correct: "A",
    derivation: "Factorise: 2x² + 2x + 3x + 3 = 0 ⟹ (2x + 3)(x + 1) = 0 ⟹ x = -3/2 or -1.",
    examinerTrap: "Trap: Sign inversion error when solving linear factors to roots.",
  },
  {
    id: 3,
    subject: "Physics",
    topic: "Current Electricity & Internal Resistance",
    question: "A cell of e.m.f. 2.0 V and internal resistance 1.0 Ω is connected to a 4.0 Ω load. Find the terminal p.d.",
    options: [
      { key: "A", label: "1.60 V" },
      { key: "B", label: "2.00 V" },
      { key: "C", label: "0.40 V" },
      { key: "D", label: "0.80 V" },
    ],
    correct: "A",
    derivation: "Current I = E / (R + r) = 2.0V / 5.0Ω = 0.4 A. Terminal p.d. V = I × R = 0.4 × 4 = 1.6 V.",
    examinerTrap: "Trap: Confusing terminal potential difference (1.6V) with internal lost volts (0.4V).",
  },
];

export function HomeProductShowcase() {
  // Row 1: AI Tutor Socratic Step State
  const [aiTutorStep, setAiTutorStep] = useState<number>(1);
  const [aiSelectedFactor, setAiSelectedFactor] = useState<string | null>(null);

  // Row 2: CBT Question Simulator State (SLOTS S4-01 TO S4-04 / cbt-simulator)
  const [activeQIndex, setActiveQIndex] = useState<number>(0);
  const [cbtAnswers, setCbtAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [isFlagged, setIsFlagged] = useState<boolean>(false);

  // Row 3: STEM Logic Gate Interactive State
  const [stemGate, setStemGate] = useState<"AND" | "OR" | "XOR">("AND");
  const [switchA, setSwitchA] = useState<boolean>(true);
  const [switchB, setSwitchB] = useState<boolean>(false);

  const currentQ = SHOWCASE_QUESTIONS[activeQIndex];
  const userChoice = cbtAnswers[currentQ.id];

  const isStemLit =
    stemGate === "AND"
      ? switchA && switchB
      : stemGate === "OR"
      ? switchA || switchB
      : switchA !== switchB;

  function handleSelectCbtAnswer(key: "A" | "B" | "C" | "D") {
    setCbtAnswers((prev) => ({ ...prev, [currentQ.id]: key }));
  }

  return (
    <section
      id="products"
      aria-label="BrainLab Learning Ecosystem Products and Interactive Showcase"
      className="scroll-mt-20 py-24 sm:py-32 bg-white dark:bg-[#020B1A] text-slate-900 dark:text-white relative overflow-hidden border-y border-slate-200/80 dark:border-blue-950/60 transition-colors"
    >
      {/* Harmonious Dual-Tone Ambient Lighting Mesh (Vibrant on White & Luminous in Dark) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-5%,rgba(37,99,235,0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(19,86,232,0.25),transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.06),transparent_50%)] dark:bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_50%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_50%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-25 dark:opacity-15" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20 sm:space-y-28">
        {/* Universal Header with Generous Negative Space, High Contrast & Jewel-Toned Aesthetics */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          {/* Luminous Pill Badge */}
          <div
            data-slot="SLOTS S4-01 TO S4-04 • THE BRAINLAB ECOSYSTEM"
            className="inline-flex items-center gap-2.5 rounded-full border border-blue-200/90 dark:border-cyan-400/30 bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-cyan-50/90 dark:from-cyan-950/40 dark:via-blue-950/40 dark:to-emerald-950/40 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-300 shadow-[0_2px_12px_rgba(37,99,235,0.08),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(6,182,212,0.15)] transition-all"
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-600 dark:bg-cyan-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400" />
            </span>
            <span>CORE LEARNING TOOLS &bull; THE BRAINLAB ECOSYSTEM</span>
          </div>

          {/* High-Impact Dual-Color Heading */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.15]">
            Everything You Need to Master <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-teal-600 dark:from-blue-400 dark:via-cyan-300 dark:to-emerald-400 drop-shadow-xs">
              Your Core Examination &amp; STEM Subjects.
            </span>
          </h2>

          {/* Rich High-Contrast Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-blue-100/90 leading-relaxed max-w-2xl mx-auto font-normal">
            Bite-sized, purposeful tools designed to replace passive textbook cramming with active recall, tactile problem-solving, and diagnostic clarity.
          </p>

          {/* Core Capability Guarantee Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100/90 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
              <svg className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                <circle cx="9" cy="13" r="1" />
                <circle cx="15" cy="13" r="1" />
              </svg>
              <span>Socratic Step-by-Step AI</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100/90 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
              <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
              </svg>
              <span>Authentic 8-Keypad Engine</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100/90 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
              <svg className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Tactile STEM Laboratories</span>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            ROW 1: 24/7 AI STUDY STUDIO
            Story: Concept Breakdown & Socratic Step-by-Step Factoring
            Style: Unified Midnight Obsidian Glassmorphic Card
        ------------------------------------------------------------- */}
        <div className="relative rounded-3xl sm:rounded-[2.5rem] border border-slate-700/60 bg-gradient-to-br from-[#060D24] via-[#09153A] to-[#050C1F] shadow-[0_20px_50px_-15px_rgba(2,11,26,0.6)] overflow-hidden transition-all duration-300 hover:border-blue-500/50">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" aria-hidden="true" />
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[460px]">
            {/* Left: Deep Royal Blue Space with Pure White Explanation Text */}
            <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-center space-y-5 text-left relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-300 self-start">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>01 &bull; 24/7 AI STUDY STUDIO</span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Always by your side when you get stuck.
              </h3>

              <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-lg font-normal">
                Ask questions in natural conversational language. Instead of simply spoon-feeding final answers, the AI Tutor guides you step-by-step through the underlying theorem and mathematical proofs.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-blue-100/90 max-w-md text-left">
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Socratic question-and-answer hints that build genuine comprehension</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>High-resolution LaTeX and KaTeX mathematical equation breakdowns</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Calibrated specifically to official examination syllabuses &amp; past patterns</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/products/ai-learning"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 transition-all group"
                >
                  <span>Explore AI Study Studio</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Right: Dedicated Workbench Canvas Frame hosting Socratic Card */}
            <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex items-center justify-center relative bl-perspective-container">
              {/* Subtle Ambient Radial Light Aura */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.12),transparent_70%)] pointer-events-none" aria-hidden="true" />

              {/* 3D Floating Ground Shadow */}
              <div className="absolute -bottom-4 inset-x-12 h-8 rounded-full bg-black/40 blur-xl pointer-events-none transition-all duration-500" aria-hidden="true" />

              {/* 3D Elevated Socratic Card in High-Contrast Cockpit Theme */}
              <div
                className="w-full max-w-md rounded-3xl border border-slate-700/80 bg-gradient-to-b from-[#0F1B3B] via-[#09132C] to-[#060D1E] text-white p-5 sm:p-6 shadow-2xl min-h-[420px] flex flex-col justify-between relative overflow-hidden bl-3d-card-stage bl-3d-card-right group"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* 3D Specular Sheen Effect */}
                <div className="pointer-events-none absolute -inset-full bg-gradient-to-tr from-transparent via-cyan-400/10 to-transparent rotate-12 transition-transform duration-700 group-hover:translate-x-1/2" aria-hidden="true" />

                {/* Card Header (Parallax Z=18) */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10" style={{ transform: "translateZ(18px)" }}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-2xs">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                        <circle cx="9" cy="13" r="1" />
                        <circle cx="15" cy="13" r="1" />
                      </svg>
                    </span>
                    <div>
                      <span className="text-xs font-black text-white block">BrainLab AI Tutor</span>
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active Socratic Mode
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 font-bold">
                    Algebra Drill
                  </span>
                </div>

                {/* Dialogue Area (Parallax Z=24) */}
                <div className="space-y-3.5 my-3 text-xs leading-relaxed relative z-10" style={{ transform: "translateZ(24px)" }}>
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-xs bg-blue-600 text-white px-4 py-2.5 max-w-[85%] shadow-md font-medium text-xs">
                      How do I factorise 2x² + 5x + 3 = 0 without using the quadratic formula?
                    </div>
                  </div>

                  {/* AI Tutor Prompt */}
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-xs bg-white/5 border border-white/10 px-4 py-3 max-w-[92%] shadow-2xs space-y-2 text-slate-200">
                      <p className="text-cyan-300 font-bold text-xs">
                        Let&apos;s use factorisation by splitting the middle term!
                      </p>
                      <p className="text-slate-300 text-[11px] leading-relaxed font-normal">
                        Multiply the first and last coefficients: <strong>2 &times; 3 = 6</strong>. What two numbers multiply to <strong>6</strong> and add up to <strong>5</strong>?
                      </p>

                      {/* Tactile Factor Buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { key: "a", label: "2 and 3", correct: true },
                          { key: "b", label: "1 and 6", correct: false },
                          { key: "c", label: "4 and 1", correct: false },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              setAiSelectedFactor(item.label);
                              setAiTutorStep(item.correct ? 2 : 1);
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer border shadow-[0_3px_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-0.5 ${
                              aiSelectedFactor === item.label
                                ? item.correct
                                  ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_3px_0_#065f46]"
                                  : "bg-rose-600 text-white border-rose-500 shadow-[0_3px_0_#9f1239]"
                                : "bg-[#0B1536] text-slate-200 border-slate-700 hover:border-cyan-400 hover:bg-white/10"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Socratic Success Reveal */}
                  {aiSelectedFactor === "2 and 3" && (
                    <div className="flex justify-start animate-bl-fade-in">
                      <div className="rounded-2xl rounded-tl-xs bg-emerald-950/70 border border-emerald-500/50 px-4 py-2.5 max-w-[92%] shadow-2xs space-y-1 text-emerald-200 text-[11px]">
                        <span className="font-black block text-emerald-300">Spot on! 2 &times; 3 = 6 and 2 + 3 = 5.</span>
                        <p className="text-emerald-100">Rewrite: 2x² + 2x + 3x + 3 = 0 ⟹ 2x(x + 1) + 3(x + 1) = 0 ⟹ <strong>(2x + 3)(x + 1) = 0</strong>.</p>
                        <p className="text-[10px] text-emerald-400 font-mono font-bold">Roots: x = -3/2 or x = -1</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Status */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 relative z-10" style={{ transform: "translateZ(18px)" }}>
                  <span>Free fair-use tier included</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    No sign-up required for trial
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            ROW 2: CBT PRACTICE ENGINE
            Story: Authentic 8-Key Hardware Emulation & Test-Hall Readiness
            Style: Unified Midnight Obsidian Glassmorphic Card
        ------------------------------------------------------------- */}
        <div className="relative rounded-3xl sm:rounded-[2.5rem] border border-slate-700/60 bg-gradient-to-br from-[#060D24] via-[#09153A] to-[#050C1F] shadow-[0_20px_50px_-15px_rgba(2,11,26,0.6)] overflow-hidden transition-all duration-300 hover:border-cyan-500/50">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" aria-hidden="true" />
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[460px]">
            {/* Left: Dedicated Workbench Canvas Frame hosting 3D CBT Cockpit */}
            <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex items-center justify-center relative bl-perspective-container order-2 lg:order-1">
              {/* Subtle Ambient Radial Light Aura */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12),transparent_70%)] pointer-events-none" aria-hidden="true" />

              {/* 3D Floating Ground Shadow */}
              <div className="absolute -bottom-4 inset-x-12 h-8 rounded-full bg-black/40 blur-xl pointer-events-none transition-all duration-500" aria-hidden="true" />

              {/* 3D Elevated CBT Simulator Card */}
              <div
                className="w-full max-w-md rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-900 via-[#0a1329] to-[#060c18] text-white p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,17,43,0.30),0_10px_25px_-5px_rgba(0,17,43,0.15)] min-h-[420px] flex flex-col justify-between relative overflow-hidden bl-3d-card-stage bl-3d-card-left group"
                data-testid="cbt-simulator"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Cockpit Top Glass Specular Bezel */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" aria-hidden="true" />

                {/* Cockpit Top Bar (Parallax Z=18) */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10" style={{ transform: "translateZ(18px)" }}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-mono font-black uppercase tracking-wider text-cyan-300">
                      {currentQ.subject} Cockpit
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFlagged && (
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">
                        FLAGGED [R]
                      </span>
                    )}
                    <span className="font-mono text-amber-400 font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 shadow-inner">
                      01:42:15
                    </span>
                  </div>
                </div>

                {/* Question Body (Parallax Z=24) */}
                <div className="space-y-2.5 my-2.5 text-left relative z-10" style={{ transform: "translateZ(24px)" }}>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Topic: {currentQ.topic}</span>
                    <span className="font-mono text-cyan-400 font-bold">Q{currentQ.id} of 40</span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                    {currentQ.question}
                  </p>

                  {/* 3D Option Keycaps */}
                  <div className="space-y-1.5">
                    {currentQ.options.map((opt) => {
                      const isSelected = userChoice === opt.key;
                      const isCorrect = opt.key === currentQ.correct;

                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectCbtAnswer(opt.key)}
                          className={`w-full flex items-center gap-2.5 rounded-xl border p-2 text-left text-xs transition-all cursor-pointer min-h-[44px] shadow-[0_2px_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-0.5 ${
                            isSelected
                              ? isCorrect
                                ? "border-emerald-500 bg-emerald-950/70 text-emerald-100 font-bold shadow-emerald-500/20"
                                : "border-rose-500 bg-rose-950/70 text-rose-100 font-bold shadow-rose-500/20"
                              : "border-white/10 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:border-cyan-400/40"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-black shadow-xs ${
                              isSelected
                                ? isCorrect
                                  ? "bg-emerald-500 text-slate-950"
                                  : "bg-rose-500 text-white"
                                : "bg-slate-800 text-slate-300 border border-white/10"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="flex-1 text-[11px] sm:text-xs">{opt.label}</span>
                          {isSelected && (
                            <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                              isCorrect ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                            }`}>
                              {isCorrect ? "Correct" : "Trap"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Examiner Trap & Derivation */}
                  {userChoice && (
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/50 p-2.5 text-[11px] text-cyan-200 space-y-1 animate-bl-fade-in shadow-inner">
                      <p className="leading-snug text-[10px] sm:text-[11px]">{currentQ.derivation}</p>
                      <p className="text-[10px] text-amber-300 font-mono italic">{currentQ.examinerTrap}</p>
                    </div>
                  )}
                </div>

                {/* 8-Key Controls Strip (Parallax Z=20) */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between relative z-10" style={{ transform: "translateZ(20px)" }}>
                  <div className="flex items-center gap-1.5">
                    {[
                      { key: "P", label: "Prev" },
                      { key: "N", label: "Next" },
                      { key: "R", label: "Flag" },
                      { key: "S", label: "Cycle" },
                    ].map((k) => (
                      <button
                        key={k.key}
                        type="button"
                        onClick={() => {
                          if (k.key === "N") {
                            setActiveQIndex((prev) => (prev + 1) % SHOWCASE_QUESTIONS.length);
                          } else if (k.key === "P") {
                            setActiveQIndex((prev) => (prev - 1 + SHOWCASE_QUESTIONS.length) % SHOWCASE_QUESTIONS.length);
                          } else if (k.key === "R") {
                            setIsFlagged(!isFlagged);
                          } else if (k.key === "S") {
                            setActiveQIndex((prev) => (prev + 1) % SHOWCASE_QUESTIONS.length);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/20 text-[10px] font-mono font-bold text-slate-300 hover:text-white hover:border-cyan-400 shadow-[0_3px_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-1 transition cursor-pointer"
                      >
                        <span className="text-cyan-400 font-black">[{k.key}]</span> {k.label}
                      </button>
                    ))}
                  </div>

                  <Link
                    href="/products/cbt"
                    className="text-cyan-400 text-xs font-bold hover:text-cyan-300 transition-colors flex items-center gap-1"
                  >
                    <span>Full Mock</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Deep Royal Blue Space with Pure White Explanation Text */}
            <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-center space-y-5 text-left relative z-10 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-cyan-300 self-start">
                <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>02 &bull; CBT PRACTICE ENGINE</span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Simulate the real 8-key examination terminal.
              </h3>

              <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-lg font-normal">
                Train under authentic test-hall conditions with official 8-key hardware navigation, strict countdown timers, question review flagging, and instant score diagnostics.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-blue-100/90 max-w-md text-left">
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Hardware key emulation (A, B, C, D, P, N, S, R) for rapid answering</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>PWA offline resilience: zero answer loss even if internet disconnects</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Topic-by-topic diagnostic breakdown immediately upon submission</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/products/cbt"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 transition-all group"
                >
                  <span>Launch CBT Simulator</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            ROW 3: STEM VIRTUAL LABS
            Story: Tactile Physical Experimentation & Interactive Logic Gates
            Style: Unified Midnight Obsidian Glassmorphic Card
        ------------------------------------------------------------- */}
        <div className="relative rounded-3xl sm:rounded-[2.5rem] border border-slate-700/60 bg-gradient-to-br from-[#060D24] via-[#09153A] to-[#050C1F] shadow-[0_20px_50px_-15px_rgba(2,11,26,0.6)] overflow-hidden transition-all duration-300 hover:border-purple-500/50">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent pointer-events-none" aria-hidden="true" />
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[460px]">
            {/* Left: Deep Royal Blue Space with Pure White Explanation Text */}
            <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-center space-y-5 text-left relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-purple-300 self-start">
                <span className="flex h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                <span>03 &bull; STEM STUDIO VIRTUAL LABS</span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Touch the science. Not just dry formulas.
              </h3>

              <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-lg font-normal">
                Bridge classroom theory with interactive laboratories. From thin-lens optics ray tracing to digital logic gate circuits and volumetric acid-base titrations, watch real physical reactions happen in real time.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-blue-100/90 max-w-md text-left">
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Thin lens ray tracing with real-time focal point and image nature metrics</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Interactive digital logic gate circuit toggles (AND, OR, NOT, XOR)</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>60 FPS lightweight vector graphics with zero heavy 3D engine bloat</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/products/stem-studio"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20 transition-all group"
                >
                  <span>Explore Virtual Laboratories</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Right: Dedicated Workbench Canvas Frame hosting 3D Circuit Workbench */}
            <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex items-center justify-center relative bl-perspective-container">
              {/* Subtle Ambient Radial Light Aura */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.14),transparent_70%)] pointer-events-none" aria-hidden="true" />

              {/* 3D Floating Ground Shadow */}
              <div className="absolute -bottom-4 inset-x-12 h-8 rounded-full bg-black/40 blur-xl pointer-events-none transition-all duration-500" aria-hidden="true" />

              {/* 3D Elevated Circuit Card in High-Contrast Cockpit Theme */}
              <div
                className="w-full max-w-md rounded-3xl border border-slate-700/80 bg-gradient-to-b from-[#0F1B3B] via-[#09132C] to-[#060D1E] text-white p-5 sm:p-6 shadow-2xl min-h-[420px] flex flex-col justify-between relative overflow-hidden bl-3d-card-stage bl-3d-card-right group"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* 3D Specular Sheen Effect */}
                <div className="pointer-events-none absolute -inset-full bg-gradient-to-tr from-transparent via-purple-400/10 to-transparent rotate-12 transition-transform duration-700 group-hover:translate-x-1/2" aria-hidden="true" />

                {/* Header (Parallax Z=18) */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10" style={{ transform: "translateZ(18px)" }}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 shadow-2xs">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </span>
                    <div>
                      <span className="text-xs font-black text-white block">Digital Circuit Workbench</span>
                      <span className="text-[10px] text-slate-400 font-medium">Physics &amp; Practical Sciences</span>
                    </div>
                  </div>

                  {/* 3D Tactile Gate Selector */}
                  <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700/80 shadow-2xs">
                    {(["AND", "OR", "XOR"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setStemGate(g)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer shadow-[0_2px_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-0.5 ${
                          stemGate === g
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3D Interactive Circuit Board (Parallax Z=26) */}
                <div className="my-4 rounded-2xl bg-[#081024]/80 border border-slate-800 p-5 flex items-center justify-around gap-3 relative shadow-inner z-10" style={{ transform: "translateZ(26px)" }}>
                  {/* Physical 3D Rocker Switches */}
                  <div className="space-y-3 z-10">
                    <button
                      type="button"
                      onClick={() => setSwitchA(!switchA)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer shadow-[0_3px_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-1 ${
                        switchA
                          ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-emerald-500/20"
                          : "bg-slate-900/80 border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${switchA ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-slate-600"}`} />
                      <span>Input A: {switchA ? "1 (ON)" : "0 (OFF)"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSwitchB(!switchB)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer shadow-[0_3px_0_rgba(0,0,0,0.4)] active:shadow-none active:translate-y-1 ${
                        switchB
                          ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-emerald-500/20"
                          : "bg-slate-900/80 border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${switchB ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-slate-600"}`} />
                      <span>Input B: {switchB ? "1 (ON)" : "0 (OFF)"}</span>
                    </button>
                  </div>

                  {/* 3D Gate Chip */}
                  <div className={`z-10 px-4 py-3 rounded-2xl border-2 text-center transition-all shadow-[0_6px_16px_rgba(0,0,0,0.2)] ${
                    isStemLit
                      ? "border-purple-400 bg-purple-950/70 text-purple-200 shadow-purple-500/30 scale-105"
                      : "border-slate-700 bg-slate-900/90 text-slate-400"
                  }`}>
                    <span className="text-[9px] font-mono uppercase tracking-wider block font-bold text-purple-400">CHIP</span>
                    <span className="text-lg font-black text-white">{stemGate}</span>
                    <span className="text-[9px] font-mono block mt-0.5 text-slate-400">Q = A {stemGate} B</span>
                  </div>

                  {/* 3D Glowing Output Bulb */}
                  <div className="z-10 flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      isStemLit
                        ? "border-amber-400 bg-amber-950/40 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)] scale-110"
                        : "border-slate-700 bg-slate-900/80 text-slate-500"
                    }`}>
                      <svg className={`h-7 w-7 transition-all duration-300 ${isStemLit ? "text-amber-400 drop-shadow-[0_0_12px_#f59e0b]" : "opacity-30 text-slate-500"}`} viewBox="0 0 24 24" fill={isStemLit ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M9 18h6" />
                        <path d="M10 22h4" />
                        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                      </svg>
                    </div>
                    <span className={`text-[10px] font-mono font-bold mt-1.5 uppercase ${isStemLit ? "text-amber-400 font-black" : "text-slate-500"}`}>
                      {isStemLit ? "Output = 1" : "Output = 0"}
                    </span>
                  </div>
                </div>

                {/* Bottom Rule */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 relative z-10" style={{ transform: "translateZ(18px)" }}>
                  <span>Rule: <strong className="text-white">{stemGate}</strong> outputs high (1) when its condition is met</span>
                  <span className="text-purple-400 font-bold">Standard Benchmarks</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            ROW 4: LEARNING DNA & DIAGNOSTICS
            Story: Topic-by-Topic Diagnostic Telemetry & Score Prediction
            Style: Unified Midnight Obsidian Glassmorphic Card
        ------------------------------------------------------------- */}
        <div className="relative rounded-3xl sm:rounded-[2.5rem] border border-slate-700/60 bg-gradient-to-br from-[#060D24] via-[#09153A] to-[#050C1F] shadow-[0_20px_50px_-15px_rgba(2,11,26,0.6)] overflow-hidden transition-all duration-300 hover:border-sky-500/50">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent pointer-events-none" aria-hidden="true" />
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[460px]">
            {/* Left: Dedicated Workbench Canvas Frame hosting 3D Learning DNA Radar */}
            <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex items-center justify-center relative bl-perspective-container order-2 lg:order-1">
              {/* Subtle Ambient Radial Light Aura */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14),transparent_70%)] pointer-events-none" aria-hidden="true" />

              {/* 3D Floating Ground Shadow */}
              <div className="absolute -bottom-4 inset-x-12 h-8 rounded-full bg-black/40 blur-xl pointer-events-none transition-all duration-500" aria-hidden="true" />

              {/* 3D Elevated Learning DNA Card in High-Contrast Cockpit Theme */}
              <div
                className="w-full max-w-md rounded-3xl border border-slate-700/80 bg-gradient-to-b from-[#0F1B3B] via-[#09132C] to-[#060D1E] text-white p-5 sm:p-6 shadow-2xl min-h-[420px] flex flex-col justify-between relative overflow-hidden bl-3d-card-stage bl-3d-card-left group"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* 3D Specular Sheen Effect */}
                <div className="pointer-events-none absolute -inset-full bg-gradient-to-tr from-transparent via-sky-400/10 to-transparent rotate-12 transition-transform duration-700 group-hover:translate-x-1/2" aria-hidden="true" />

                {/* Header (Parallax Z=18) */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10" style={{ transform: "translateZ(18px)" }}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 shadow-2xs">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="12" width="4" height="8" rx="1" />
                        <rect x="10" y="8" width="4" height="12" rx="1" />
                        <rect x="17" y="4" width="4" height="16" rx="1" />
                      </svg>
                    </span>
                    <div>
                      <span className="text-xs font-black text-white block">Learning DNA Radar</span>
                      <span className="text-[10px] text-slate-400 font-medium">4-Subject Readiness Map</span>
                    </div>
                  </div>

                  <span className="text-xs font-black font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full shadow-2xs">
                    Overall: 84% Ready
                  </span>
                </div>

                {/* Multi-Subject Progress Bars (Parallax Z=24) */}
                <div className="space-y-3.5 my-3 relative z-10" style={{ transform: "translateZ(24px)" }}>
                  {[
                    { subject: "Use of English", score: 88, target: "290+ High Merit", color: "bg-blue-500" },
                    { subject: "Mathematics", score: 82, target: "Premier Target", color: "bg-cyan-400" },
                    { subject: "Physics", score: 76, target: "Revision Needed", color: "bg-amber-400" },
                    { subject: "Chemistry", score: 90, target: "Distinction", color: "bg-emerald-400" },
                  ].map((item) => (
                    <div key={item.subject} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">{item.subject}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">{item.target}</span>
                          <span className="font-mono font-black text-white">{item.score}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-800/90 border border-white/5 overflow-hidden shadow-inner">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-700 shadow-xs`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Diagnostic Recommendation Box (Parallax Z=20) */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1 shadow-2xs relative z-10" style={{ transform: "translateZ(20px)" }}>
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    Adaptive Recommendation:
                  </span>
                  <p className="text-[11px] text-amber-200/90 leading-snug">
                    Strengthen <strong className="text-white">Physics (Mechanics &amp; Electricity)</strong> to boost your cumulative projection from 276 to <strong className="text-amber-300">305+</strong>.
                  </p>
                </div>

                {/* Bottom Info */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 relative z-10" style={{ transform: "translateZ(18px)" }}>
                  <span>Updated after every CBT drill</span>
                  <Link
                    href="/products/learning-hub"
                    className="text-sky-400 font-bold hover:text-sky-300 flex items-center gap-1"
                  >
                    <span>View Full Syllabus Radar</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Deep Royal Blue Space with Pure White Explanation Text */}
            <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-center space-y-5 text-left relative z-10 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-sky-300 self-start">
                <span className="flex h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span>04 &bull; LEARNING DNA &amp; DIAGNOSTICS</span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Pinpoint exactly where you are losing marks.
              </h3>

              <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-lg font-normal">
                Never waste time revising topics you already know. BrainLab&apos;s cognitive diagnostic engine tracks every attempt topic-by-topic, exposing knowledge gaps and recommending targeted drills to maximize your exam score.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-blue-100/90 max-w-md text-left">
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Cumulative readiness prediction against your dream university cut-off</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Sub-topic weakness flags identifying your most recurring mistakes</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Automatic daily sprint recommendations tailored to your syllabus gaps</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/products/learning-hub"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 hover:border-sky-400 hover:shadow-lg hover:shadow-sky-500/20 transition-all group"
                >
                  <span>Explore Learning DNA</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
