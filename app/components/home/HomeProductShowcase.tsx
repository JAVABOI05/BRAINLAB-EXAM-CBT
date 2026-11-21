"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const [cbtShowcaseMode, setCbtShowcaseMode] = useState<"mockup" | "interactive">("mockup");
  const [activeQIndex, setActiveQIndex] = useState<number>(0);
  const [cbtAnswers, setCbtAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [isFlagged, setIsFlagged] = useState<boolean>(false);

  const currentQ = SHOWCASE_QUESTIONS[activeQIndex];
  const userChoice = cbtAnswers[currentQ.id];

  function handleSelectCbtAnswer(key: "A" | "B" | "C" | "D") {
    setCbtAnswers((prev) => ({ ...prev, [currentQ.id]: key }));
  }

  return (
    <section
      id="products"
      aria-label="BrainLab Learning Ecosystem Products and Interactive Showcase"
      className="scroll-mt-20 pt-12 sm:pt-20 lg:pt-28 pb-0 bg-[#0B1536] text-white relative overflow-hidden border-none"
    >
      {/* Harmonious Dual-Tone Ambient Lighting Mesh */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(19,86,232,0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(19,86,232,0.25),transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.06),transparent_50%)] dark:bg-[radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_50%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_50%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] [background-size:24px_24px] opacity-5 dark:opacity-20" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-12 lg:space-y-16">
        {/* Universal Header with Generous Negative Space, High Contrast & Jewel-Toned Aesthetics */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          {/* Luminous Pill Badge */}
          <div
            data-slot="SLOTS S4-01 TO S4-04 • THE BRAINLAB ECOSYSTEM"
            className="inline-flex items-center gap-2 sm:gap-2.5 rounded-full border border-blue-400/30 bg-blue-900/40 px-3.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-cyan-300 shadow-2xs transition-all"
          >
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            <span>CORE LEARNING TOOLS &bull; THE BRAINLAB ECOSYSTEM</span>
          </div>

          {/* High-Impact Dual-Color Heading */}
          <h2 className="text-xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Everything You Need to Master <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">
              Your Core Learning &amp; Examination Tools.
            </span>
          </h2>

          {/* Rich High-Contrast Subtitle */}
          <p className="text-xs sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            Bite-sized, purposeful tools designed to replace passive textbook cramming with active recall, tactile problem-solving, and diagnostic clarity.
          </p>

          {/* Core Capability Guarantee Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-slate-200 shadow-2xs">
              <svg className="h-3.5 w-3.5 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                <circle cx="9" cy="13" r="1" />
                <circle cx="15" cy="13" r="1" />
              </svg>
              <span>Socratic AI</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-slate-200 shadow-2xs">
              <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
              </svg>
              <span>8-Key Simulator</span>
            </div>

          </div>
        </div>

        {/* -------------------------------------------------------------
            ROW 1: 24/7 AI STUDY STUDIO
            Story: Concept Breakdown & Socratic Step-by-Step Factoring
            Style: Crisp Elevated White Card on Desktop & Mobile
        ------------------------------------------------------------- */}
        <div className="relative rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] border-2 border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-gradient-to-br dark:from-[#060D24] dark:via-[#09153A] dark:to-[#050C1F] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-500/50">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 dark:via-cyan-400/40 to-transparent pointer-events-none" aria-hidden="true" />
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-0 lg:min-h-[440px]">
            {/* Left: Text Column */}
            <div className="lg:col-span-6 p-4 sm:p-8 lg:p-10 text-slate-900 dark:text-white flex flex-col justify-center space-y-3 sm:space-y-4 text-left relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300 self-start">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <span>01 &bull; 24/7 AI STUDY STUDIO</span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
                Always by your side when you get stuck.
              </h3>

              <p className="text-sm sm:text-base text-slate-600 dark:text-blue-100/90 leading-relaxed max-w-lg font-normal">
                Ask questions in natural conversational language. Instead of simply spoon-feeding final answers, the AI Tutor guides you step-by-step through the underlying theorem and mathematical proofs.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-blue-100/90 max-w-md text-left">
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-400/40 dark:text-emerald-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Socratic question-and-answer hints that build genuine comprehension</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-400/40 dark:text-emerald-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>High-resolution LaTeX and KaTeX mathematical equation breakdowns</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-400/40 dark:text-emerald-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Calibrated specifically to official examination syllabuses &amp; past patterns</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/products/ai-learning"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition-all group min-h-[44px]"
                >
                  <span>Explore AI Study Studio</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Right: Dedicated Workbench Canvas Frame hosting Socratic Card */}
            <div className="lg:col-span-6 p-4 sm:p-8 lg:p-10 flex items-center justify-center relative">
              {/* Socratic Card in High-Contrast Theme */}
              <div
                className="w-full max-w-md rounded-2xl sm:rounded-3xl border-2 border-purple-200/80 bg-slate-50 text-slate-900 p-4 sm:p-6 shadow-md min-h-0 sm:min-h-[380px] lg:min-h-[420px] flex flex-col justify-between relative overflow-hidden dark:border-slate-700/80 dark:bg-gradient-to-b dark:from-[#0F1B3B] dark:via-[#09132C] dark:to-[#060D1E] dark:text-white group"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 border border-purple-200 text-purple-700 dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400 shadow-2xs">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                        <circle cx="9" cy="13" r="1" />
                        <circle cx="15" cy="13" r="1" />
                      </svg>
                    </span>
                    <div>
                      <span className="text-xs font-black text-slate-950 dark:text-white block">BrainLab AI Tutor</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Socratic Mode
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 font-bold dark:text-slate-300 dark:bg-white/10 dark:border-white/10">
                    Algebra Drill
                  </span>
                </div>

                {/* Dialogue Area */}
                <div className="space-y-3 my-3 text-xs leading-relaxed relative z-10">
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-xs bg-blue-600 text-white px-4 py-2.5 max-w-[85%] shadow-xs font-medium text-xs">
                      How do I factorise 2x² + 5x + 3 = 0 without using the quadratic formula?
                    </div>
                  </div>

                  {/* AI Tutor Prompt */}
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-xs bg-white border border-slate-200 px-4 py-3 max-w-[92%] shadow-2xs space-y-2 text-slate-800 dark:bg-white/5 dark:border-white/10 dark:text-slate-200">
                      <p className="text-blue-700 dark:text-cyan-300 font-bold text-xs">
                        Let&apos;s use factorisation by splitting the middle term!
                      </p>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed font-normal">
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
                            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer border shadow-xs active:translate-y-0.5 ${
                              aiSelectedFactor === item.label
                                ? item.correct
                                  ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                                  : "bg-rose-600 text-white border-rose-500 shadow-sm"
                                : "bg-white text-slate-700 border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 dark:bg-[#0B1536] dark:text-slate-200 dark:border-slate-700 dark:hover:border-cyan-400 dark:hover:bg-white/10"
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
                      <div className="rounded-2xl rounded-tl-xs bg-emerald-50 border border-emerald-300 px-4 py-2.5 max-w-[92%] shadow-2xs space-y-1 text-emerald-950 text-[11px] dark:bg-emerald-950/70 dark:border-emerald-500/50 dark:text-emerald-200">
                        <span className="font-black block text-emerald-700 dark:text-emerald-300">Spot on! 2 &times; 3 = 6 and 2 + 3 = 5.</span>
                        <p className="text-emerald-800 dark:text-emerald-100">Rewrite: 2x² + 2x + 3x + 3 = 0 ⟹ 2x(x + 1) + 3(x + 1) = 0 ⟹ <strong>(2x + 3)(x + 1) = 0</strong>.</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">Roots: x = -3/2 or x = -1</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Status */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 relative z-10">
                  <span>Free fair-use tier included</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
            Style: Crisp Elevated White Card on Desktop & Mobile
        ------------------------------------------------------------- */}
        <div className="relative rounded-3xl sm:rounded-[2.5rem] border-2 border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-gradient-to-br dark:from-[#060D24] dark:via-[#09153A] dark:to-[#050C1F] overflow-hidden transition-all duration-300 hover:border-cyan-500/50">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none" aria-hidden="true" />
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-0 lg:min-h-[440px]">
            {/* Left: Dedicated Workbench Canvas Frame hosting 3D CBT Cockpit or Authentic Mockup */}
            <div className="lg:col-span-6 p-4 sm:p-8 lg:p-10 flex flex-col items-center justify-center relative order-2 lg:order-1">
              {/* View Switcher Controls */}
              <div className="flex items-center justify-between mb-3 w-full max-w-md lg:max-w-lg">
                <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 dark:bg-slate-800/80 dark:border-white/10 text-xs font-bold shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCbtShowcaseMode("mockup")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      cbtShowcaseMode === "mockup"
                        ? "bg-white text-blue-700 shadow-xs dark:bg-blue-600 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                  >
                    Authentic Exam Hall
                  </button>
                  <button
                    type="button"
                    onClick={() => setCbtShowcaseMode("interactive")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      cbtShowcaseMode === "interactive"
                        ? "bg-white text-blue-700 shadow-xs dark:bg-blue-600 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                  >
                    Interactive 8-Key Drill
                  </button>
                </div>
                <span className="hidden sm:inline-flex text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Official JAMB Layout
                </span>
              </div>

              {cbtShowcaseMode === "mockup" ? (
                /* Authentic High-Resolution Browser Simulator Mockup View */
                <div
                  className="w-full max-w-md lg:max-w-lg rounded-2xl sm:rounded-3xl border-2 border-blue-200/80 bg-slate-900 text-white shadow-xl overflow-hidden relative group transition-all duration-300 hover:border-cyan-400/60"
                  data-testid="cbt-simulator"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                    <Image
                      src="/cbt-exam-simulator-showcase.jpg"
                      alt="Authentic BrainLab JAMB UTME CBT Examination Hall Simulator with live countdown timer and 8-keypad terminal"
                      width={1024}
                      height={640}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 540px"
                      priority={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity pointer-events-none" />
                  </div>
                  <div className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-200">
                        180 Mins &bull; 4 Electives &bull; 8-Key Emulation
                      </span>
                    </div>
                    <Link
                      href="/products/cbt"
                      className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <span>Try Simulator</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Elevated CBT Simulator Card */
                <div
                  className="w-full max-w-md lg:max-w-lg rounded-2xl sm:rounded-3xl border-2 border-blue-200/80 bg-slate-50 text-slate-900 p-4 sm:p-6 shadow-md min-h-0 sm:min-h-[380px] lg:min-h-[420px] flex flex-col justify-between relative overflow-hidden dark:border-slate-700/80 dark:bg-gradient-to-b dark:from-slate-900 dark:via-[#0a1329] dark:to-[#060c18] dark:text-white group"
                  data-testid="cbt-simulator"
                >
                {/* Cockpit Top Bar */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-mono font-black uppercase tracking-wider text-blue-700 dark:text-cyan-300">
                      {currentQ.subject} Cockpit
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFlagged && (
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 dark:text-amber-400 dark:bg-amber-500/20 dark:border-amber-500/40">
                        FLAGGED [R]
                      </span>
                    )}
                    <span className="font-mono text-amber-800 dark:text-amber-400 font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 shadow-xs">
                      01:42:15
                    </span>
                  </div>
                </div>

                {/* Question Body */}
                <div className="space-y-2.5 my-2.5 text-left relative z-10">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Topic: {currentQ.topic}</span>
                    <span className="font-mono text-blue-600 dark:text-cyan-400 font-bold">Q{currentQ.id} of 40</span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {currentQ.question}
                  </p>

                  {/* Option Keycaps */}
                  <div className="space-y-1.5">
                    {currentQ.options.map((opt) => {
                      const isSelected = userChoice === opt.key;
                      const isCorrect = opt.key === currentQ.correct;

                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectCbtAnswer(opt.key)}
                          className={`w-full flex items-center gap-2.5 rounded-xl border p-2 text-left text-xs transition-all cursor-pointer min-h-[44px] shadow-xs active:translate-y-0.5 ${
                            isSelected
                              ? isCorrect
                                ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-emerald-500/10 dark:border-emerald-500 dark:bg-emerald-950/70 dark:text-emerald-100"
                                : "border-rose-500 bg-rose-50 text-rose-950 font-bold shadow-rose-500/10 dark:border-rose-500 dark:bg-rose-950/70 dark:text-rose-100"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-blue-50/50 hover:border-blue-400 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-cyan-400/40"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-black shadow-xs ${
                              isSelected
                                ? isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : "bg-rose-600 text-white"
                                : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-white/10"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="flex-1 text-[11px] sm:text-xs">{opt.label}</span>
                          {isSelected && (
                            <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                              isCorrect ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300"
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
                    <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 text-[11px] text-blue-900 space-y-1 animate-bl-fade-in shadow-xs dark:border-cyan-500/30 dark:bg-cyan-950/50 dark:text-cyan-200">
                      <p className="leading-snug text-[10px] sm:text-[11px]">{currentQ.derivation}</p>
                      <p className="text-[10px] text-amber-800 dark:text-amber-300 font-mono italic">{currentQ.examinerTrap}</p>
                    </div>
                  )}
                </div>

                {/* 8-Key Controls Strip */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between relative z-10">
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
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[10px] font-mono font-bold text-slate-700 hover:text-slate-950 hover:border-blue-500 shadow-xs active:translate-y-0.5 transition cursor-pointer dark:bg-slate-800 dark:border-white/20 dark:text-slate-300 dark:hover:text-white dark:hover:border-cyan-400"
                      >
                        <span className="text-blue-600 dark:text-cyan-400 font-black">[{k.key}]</span> {k.label}
                      </button>
                    ))}
                  </div>

                  <Link
                    href="/products/cbt"
                    className="text-blue-600 dark:text-cyan-400 text-xs font-bold hover:text-blue-800 dark:hover:text-cyan-300 transition-colors flex items-center gap-1"
                  >
                    <span>Full Mock</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
              )}
            </div>

            {/* Right: Text Column */}
            <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 text-slate-900 dark:text-white flex flex-col justify-center space-y-4 sm:space-y-5 text-left relative z-10 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-blue-800 dark:border-cyan-400/30 dark:bg-cyan-500/15 dark:text-cyan-300 self-start">
                <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
                <span>02 &bull; CBT PRACTICE ENGINE</span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
                Simulate the real 8-key examination terminal.
              </h3>

              <p className="text-sm sm:text-base text-slate-600 dark:text-blue-100/90 leading-relaxed max-w-lg font-normal">
                Train under authentic test-hall conditions with official 8-key hardware navigation, strict countdown timers, question review flagging, and instant score diagnostics.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-blue-100/90 max-w-md text-left">
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 border border-blue-300 text-blue-700 dark:bg-cyan-500/20 dark:border-cyan-400/40 dark:text-cyan-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Hardware key emulation (A, B, C, D, P, N, S, R) for rapid answering</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 border border-blue-300 text-blue-700 dark:bg-cyan-500/20 dark:border-cyan-400/40 dark:text-cyan-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>PWA offline resilience: zero answer loss even if internet disconnects</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 border border-blue-300 text-blue-700 dark:bg-cyan-500/20 dark:border-cyan-400/40 dark:text-cyan-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Topic-by-topic diagnostic breakdown immediately upon submission</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/products/cbt"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition-all group min-h-[44px]"
                >
                  <span>Launch CBT Simulator</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            ROW 4: LEARNING DNA & DIAGNOSTICS
            Story: Topic-by-Topic Diagnostic Telemetry & Score Prediction
            Style: Crisp Elevated White Card on Desktop & Mobile
        ------------------------------------------------------------- */}
        <div className="relative rounded-3xl sm:rounded-[2.5rem] border-2 border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-gradient-to-br dark:from-[#060D24] dark:via-[#09153A] dark:to-[#050C1F] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-sky-500/50">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent pointer-events-none" aria-hidden="true" />
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-0 lg:min-h-[440px]">
            {/* Left: Dedicated Workbench Canvas Frame hosting Learning DNA Radar */}
            <div className="lg:col-span-6 p-4 sm:p-8 lg:p-10 flex items-center justify-center relative order-2 lg:order-1">
              {/* Elevated Learning DNA Card */}
              <div
                className="w-full max-w-md rounded-2xl sm:rounded-3xl border-2 border-cyan-200/80 bg-slate-50 text-slate-900 p-4 sm:p-6 shadow-md min-h-0 sm:min-h-[380px] lg:min-h-[420px] flex flex-col justify-between relative overflow-hidden dark:border-slate-700/80 dark:bg-gradient-to-b dark:from-[#0F1B3B] dark:via-[#09132C] dark:to-[#060D1E] dark:text-white group"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 border border-cyan-200 text-cyan-700 dark:bg-sky-500/20 dark:border-sky-500/30 dark:text-sky-400 shadow-2xs">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="12" width="4" height="8" rx="1" />
                        <rect x="10" y="8" width="4" height="12" rx="1" />
                        <rect x="17" y="4" width="4" height="16" rx="1" />
                      </svg>
                    </span>
                    <div>
                      <span className="text-xs font-black text-slate-950 dark:text-white block">Learning DNA Radar</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">4-Subject Readiness Map</span>
                    </div>
                  </div>

                  <span className="text-xs font-black font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 dark:text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/30 px-2.5 py-0.5 rounded-full shadow-2xs">
                    Overall: 84% Ready
                  </span>
                </div>

                {/* Multi-Subject Progress Bars */}
                <div className="space-y-3 my-3 relative z-10">
                  {[
                    { subject: "Use of English", score: 88, target: "290+ High Merit", color: "bg-blue-600" },
                    { subject: "Mathematics", score: 82, target: "Premier Target", color: "bg-cyan-500" },
                    { subject: "Physics", score: 76, target: "Revision Needed", color: "bg-amber-500" },
                    { subject: "Chemistry", score: 90, target: "Distinction", color: "bg-emerald-500" },
                  ].map((item) => (
                    <div key={item.subject} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.subject}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{item.target}</span>
                          <span className="font-mono font-black text-slate-950 dark:text-white">{item.score}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800/90 border border-slate-300 dark:border-white/5 overflow-hidden shadow-inner">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-700 shadow-xs`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Diagnostic Recommendation Box */}
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs space-y-1 shadow-2xs relative z-10 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Adaptive Recommendation:
                  </span>
                  <p className="text-[11px] text-amber-900 dark:text-amber-200/90 leading-snug">
                    Strengthen <strong className="text-slate-950 dark:text-white">Physics (Mechanics &amp; Electricity)</strong> to boost your cumulative projection from 276 to <strong className="text-amber-800 dark:text-amber-300">305+</strong>.
                  </p>
                </div>

                {/* Bottom Info */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 relative z-10">
                  <span>Updated after every CBT drill</span>
                  <Link
                    href="/products/learning-hub"
                    className="text-blue-600 dark:text-sky-400 font-bold hover:text-blue-800 dark:hover:text-sky-300 flex items-center gap-1"
                  >
                    <span>View Full Syllabus Radar</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Text Column */}
            <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 text-slate-900 dark:text-white flex flex-col justify-center space-y-4 sm:space-y-5 text-left relative z-10 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-300 self-start">
                <span className="flex h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-pulse" />
                <span>04 &bull; LEARNING DNA &amp; DIAGNOSTICS</span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
                Pinpoint exactly where you are losing marks.
              </h3>

              <p className="text-sm sm:text-base text-slate-600 dark:text-blue-100/90 leading-relaxed max-w-lg font-normal">
                Never waste time revising topics you already know. BrainLab&apos;s cognitive diagnostic engine tracks every attempt topic-by-topic, exposing knowledge gaps and recommending targeted drills to maximize your exam score.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-blue-100/90 max-w-md text-left">
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 border border-sky-300 text-sky-700 dark:bg-sky-500/20 dark:border-sky-400/40 dark:text-sky-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Cumulative readiness prediction against your dream university cut-off</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 border border-sky-300 text-sky-700 dark:bg-sky-500/20 dark:border-sky-400/40 dark:text-sky-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Sub-topic weakness flags identifying your most recurring mistakes</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 border border-sky-300 text-sky-700 dark:bg-sky-500/20 dark:border-sky-400/40 dark:text-sky-300 text-xs font-black">
                    <svg className="h-3 w-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>Automatic daily sprint recommendations tailored to your syllabus gaps</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/products/learning-hub"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition-all group min-h-[44px]"
                >
                  <span>Explore Learning DNA</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Downward Organic Curved Transition into Luminous Light STEM Studio */}
      <div className="relative w-full overflow-hidden leading-none z-10 -mb-[1px] pointer-events-none mt-16 sm:mt-24" aria-hidden="true">
        <svg
          className="relative block w-full h-10 sm:h-16 lg:h-20 text-white"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 C480,80 960,80 1440,0 L1440,100 L0,100 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}
