"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";
import { DynamicCountdownSlot } from "./DynamicCountdownSlot";
import { DynamicLiveStatisticsSlot } from "./DynamicLiveStatisticsSlot";

interface QuestionOption {
  key: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

interface HeroQuestion {
  subject: string;
  subjectBadge: string;
  year: string;
  questionNumber: string;
  question: string;
  options: QuestionOption[];
  examinerTrap: string;
}

const HERO_SUBJECTS: Array<{ id: string; label: string; iconType: "book" | "ruler" | "bolt" | "flask" }> = [
  { id: "english", label: "English", iconType: "book" },
  { id: "math", label: "Mathematics", iconType: "ruler" },
  { id: "physics", label: "Physics", iconType: "bolt" },
  { id: "chemistry", label: "Chemistry", iconType: "flask" },
];

function HeroSubjectIcon({ type }: { type: "book" | "ruler" | "bolt" | "flask" }) {
  if (type === "book") {
    return (
      <svg className="h-3 w-3 shrink-0 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
      </svg>
    );
  }
  if (type === "ruler") {
    return (
      <svg className="h-3 w-3 shrink-0 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      </svg>
    );
  }
  if (type === "bolt") {
    return (
      <svg className="h-3 w-3 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  return (
    <svg className="h-3 w-3 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2v7.31L4.2 19.5A2 2 0 0 0 6 22h12a2 2 0 0 0 1.8-2.5L14 9.31V2" />
      <path d="M8.5 2h7" />
    </svg>
  );
}

const HERO_QUESTIONS: Record<string, HeroQuestion> = {
  english: {
    subject: "Use of English",
    subjectBadge: "Lexis & Concord",
    year: "JAMB UTME Blueprint",
    questionNumber: "Question 14 of 40",
    question:
      "Choose the option that best completes the sentence: 'Neither the principal nor the teachers _______ present at the valedictory service.'",
    options: [
      {
        key: "A",
        text: "were",
        isCorrect: true,
        explanation:
          "Rule of Proximity: In 'neither... nor' constructions, the verb agrees with the nearer subject ('teachers' = plural ⟹ 'were').",
      },
      {
        key: "B",
        text: "was",
        isCorrect: false,
        explanation:
          "'Was' would agree with 'principal', but the closer subject is plural 'teachers'.",
      },
      {
        key: "C",
        text: "is",
        isCorrect: false,
        explanation:
          "The sentence refers to a completed past event ('valedictory service').",
      },
      {
        key: "D",
        text: "are",
        isCorrect: false,
        explanation:
          "Past tense is required for this historical occurrence.",
      },
    ],
    examinerTrap:
      "Trap: Instinctively matching the verb to the singular subject 'principal' instead of the nearest plural subject 'teachers'.",
  },
  math: {
    subject: "Mathematics",
    subjectBadge: "Algebra & Polynomials",
    year: "JAMB UTME Blueprint",
    questionNumber: "Question 8 of 40",
    question:
      "Find the values of x that satisfy the quadratic equation: 2x² + 5x + 3 = 0.",
    options: [
      {
        key: "A",
        text: "x = -1 or x = -3/2",
        isCorrect: true,
        explanation:
          "Factorise: 2x² + 2x + 3x + 3 = 0 ⟹ 2x(x + 1) + 3(x + 1) = 0 ⟹ (2x + 3)(x + 1) = 0. Hence x = -3/2 or x = -1.",
      },
      {
        key: "B",
        text: "x = 1 or x = 3/2",
        isCorrect: false,
        explanation:
          "Sign inversion error: setting (x + 1) = 0 gives x = -1, not +1.",
      },
      {
        key: "C",
        text: "x = -1 or x = 3/2",
        isCorrect: false,
        explanation:
          "Only one root is correct (-1); (2x + 3) = 0 gives x = -3/2, not +3/2.",
      },
      {
        key: "D",
        text: "x = 1 or x = -3/2",
        isCorrect: false,
        explanation:
          "Sign mistake when factoring the first bracket.",
      },
    ],
    examinerTrap:
      "Trap: Forgetting to reverse signs when moving from factors to roots (x + 1 = 0 ⟹ x = -1).",
  },
  physics: {
    subject: "Physics",
    subjectBadge: "Current Electricity",
    year: "JAMB UTME Blueprint",
    questionNumber: "Question 21 of 40",
    question:
      "A cell of e.m.f. 2.0 V and internal resistance 1.0 Ω is connected across an external resistor of 4.0 Ω. Calculate the terminal potential difference.",
    options: [
      {
        key: "A",
        text: "1.60 V",
        isCorrect: true,
        explanation:
          "Total resistance R_total = 4 + 1 = 5 Ω. Current I = 2.0 / 5 = 0.4 A. Terminal p.d. V = I × R = 0.4 × 4 = 1.6 V.",
      },
      {
        key: "B",
        text: "2.00 V",
        isCorrect: false,
        explanation:
          "2.0 V is open-circuit e.m.f.; internal resistance produces lost volts (Ir = 0.4 V).",
      },
      {
        key: "C",
        text: "0.40 V",
        isCorrect: false,
        explanation:
          "0.40 V is the lost voltage across internal resistance, not the terminal potential difference.",
      },
      {
        key: "D",
        text: "0.80 V",
        isCorrect: false,
        explanation:
          "Incorrect formula application.",
      },
    ],
    examinerTrap:
      "Trap: Confusing terminal potential difference (V = IR = 1.6V) with internal lost volts (v = Ir = 0.4V).",
  },
  chemistry: {
    subject: "Chemistry",
    subjectBadge: "Redox & States",
    year: "JAMB UTME Blueprint",
    questionNumber: "Question 17 of 40",
    question:
      "Determine the oxidation number of Manganese (Mn) in potassium permanganate (KMnO₄).",
    options: [
      {
        key: "A",
        text: "+7",
        isCorrect: true,
        explanation:
          "In neutral KMnO₄: K = +1, O = -2. (+1) + Mn + 4(-2) = 0 ⟹ 1 + Mn - 8 = 0 ⟹ Mn = +7.",
      },
      {
        key: "B",
        text: "+5",
        isCorrect: false,
        explanation:
          "Mistakenly computing 8 - 3 without balancing 4 oxygen atoms (-8).",
      },
      {
        key: "C",
        text: "+6",
        isCorrect: false,
        explanation:
          "+6 is the oxidation state in potassium manganate (K₂MnO₄), not permanganate.",
      },
      {
        key: "D",
        text: "+4",
        isCorrect: false,
        explanation:
          "+4 is the oxidation state in manganese dioxide (MnO₂).",
      },
    ],
    examinerTrap:
      "Trap: Confusing permanganate (KMnO₄: Mn = +7) with manganate (K₂MnO₄: Mn = +6).",
  },
};

export function HomeHero() {
  const heroConfig = HOMEPAGE_CONTENT_CONFIG.hero;
  const [activeSubject, setActiveSubject] = useState<string>("english");
  const [selectedOption, setSelectedOption] = useState<string>("A");
  const [showCalculator, setShowCalculator] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);

  const headline = resolveClaimValue(
    heroConfig.headline,
    "A Better Way to Learn, Practise and Achieve More."
  );

  const subhead = resolveClaimValue(
    heroConfig.subhead,
    "Your learning journey starts here. For free."
  );

  const disclosure = resolveClaimValue(
    heroConfig.disclosure,
    "Public learners receive full access to CBT practice, question banks, AI Tutor fair-use, and Learning Hub at ₦0."
  );

  const currentQ = HERO_QUESTIONS[activeSubject] || HERO_QUESTIONS.english;
  const activeOption = currentQ.options.find((opt) => opt.key === selectedOption);

  function handleSubjectChange(subId: string) {
    setActiveSubject(subId);
    setSelectedOption("A");
    setIsFlagged(false);
  }

  return (
    <section
      aria-label="BrainLab Learning Ecosystem Introduction"
      className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-slate-900 via-[#0a1326] to-[#060b14] text-white pt-16 pb-12 dark:border-slate-800 dark:from-[#060B18] dark:via-[#091226] dark:to-[#060B18] sm:pt-24 sm:pb-16"
    >
      {/* World-Class Atmospheric Ambient Mesh Glows */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-0 h-[480px] w-[480px] rounded-full bg-emerald-500/10 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[600px] rounded-full bg-sky-500/10 blur-[140px]"
        aria-hidden="true"
      />

      {/* Subtle Academic Precision Grid Texture */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.04]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Promise & Actions (Motion: bl-fade-up) */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left animate-bl-fade-up">
            {/* Category Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-300 backdrop-blur-md shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>OPEN TO EVERY LEARNER • FREE CBT &amp; LEARNING HUB</span>
            </div>

            {/* H1 Primary Promise: Directive Section 7 */}
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.08]">
              A Better Way to Learn, Practise <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400">
                and Achieve More.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl font-medium text-slate-200 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {subhead}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                href={heroConfig.primaryCta.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 transition-all duration-180 bl-focus-ring min-h-[48px] group"
              >
                <span>{heroConfig.primaryCta.label}</span>
                <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
              </Link>

              <Link
                href={heroConfig.secondaryCta.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-600 px-6 py-3.5 text-base font-bold text-slate-200 transition-all duration-180 bl-focus-ring min-h-[48px]"
              >
                <span>{heroConfig.secondaryCta.label}</span>
              </Link>
            </div>

            {/* High-Trust Value Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-300 pt-1">
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-400 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Real JAMB 8-Key Engine</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-400 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Step-by-Step Corrections</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-400 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>100% Free Daily Drills</span>
              </span>
            </div>

            {/* Truthful Free Tier Disclosure */}
            {disclosure && (
              <p className="text-xs text-slate-400 pt-0.5">
                &bull; {disclosure}
              </p>
            )}

            {/* Dynamic Live Statistics Slot (Rule S7 compliant, verified live aggregate data only) */}
            <DynamicLiveStatisticsSlot />
          </div>

          {/* Right Column: Real CBT Product Simulator Mockup & Countdown (Slot S1-02, Motion: bl-fade-in bl-stagger-2) */}
          <div className="lg:col-span-5 flex flex-col gap-5 animate-bl-fade-in bl-stagger-2 relative">
            {/* Real Product Simulator Mockup Chassis - Rock-solid static box (zero layout shift) */}
            <div
              className="relative rounded-3xl border border-blue-500/30 bg-gradient-to-b from-[#111c38] via-[#0c1427] to-[#070c18] p-4 sm:p-5 shadow-[0_20px_60px_-15px_rgba(14,165,233,0.25)] backdrop-blur-xl min-h-[520px] lg:h-[530px] flex flex-col justify-between"
              role="region"
              aria-label="Interactive CBT Practice Simulator Preview"
            >
              {/* Cockpit Hardware Top Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  </div>
                  <span className="ml-1 text-[11px] font-mono font-black uppercase tracking-wider text-cyan-300">
                    JAMB 8-KEY COCKPIT
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-200 hover:bg-cyan-900/60 transition cursor-pointer"
                    aria-label="Toggle JAMB On-screen Calculator"
                  >
                    {showCalculator ? "Hide Calc" : "Calc [C]"}
                  </button>
                  <span className="font-mono text-amber-400 font-black text-xs px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 tracking-wider shadow-inner">
                    01:42:15
                  </span>
                </div>
              </div>

              {/* Subject Tabs Switcher Strip */}
              <div
                role="tablist"
                aria-label="Mock Drill Subject Selection"
                className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-none"
              >
                {HERO_SUBJECTS.map((sub) => {
                  const isActive = sub.id === activeSubject;
                  return (
                    <button
                      key={sub.id}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleSubjectChange(sub.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                        isActive
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-xs"
                          : "text-slate-400 hover:text-slate-200 bg-slate-900/40 border border-white/5"
                      }`}
                    >
                      <HeroSubjectIcon type={sub.iconType} />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Optional On-screen calculator modal/drawer (zero layout shift) */}
              {showCalculator && (
                <div className="absolute inset-x-4 top-14 z-30 rounded-2xl border-2 border-cyan-500/50 bg-slate-950/98 p-4 text-center text-xs animate-bl-scale-in shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10 text-[11px] font-mono text-cyan-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                      JAMB STANDARD CALCULATOR
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCalculator(false)}
                      className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white bg-slate-800 border border-white/10 cursor-pointer"
                    >
                      Close [Esc]
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
                    {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "C", "0", "=", "+"].map((k) => (
                      <span
                        key={k}
                        className={`rounded-lg p-2 text-center font-bold ${
                          ["÷", "×", "-", "+", "="].includes(k)
                            ? "bg-blue-600 text-white shadow-xs"
                            : k === "C"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : "bg-slate-800 border border-white/10 text-slate-200"
                        }`}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Realistic CBT Question Preview Card */}
              <div className="mt-2 space-y-2.5 rounded-2xl bg-slate-950/80 border border-white/10 p-3.5 sm:p-4 text-left shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span>{currentQ.subject}</span>
                    <span className="text-[10px] font-normal text-slate-400">({currentQ.subjectBadge})</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isFlagged && (
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">
                        FLAGGED
                      </span>
                    )}
                    <span className="text-cyan-400 font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                      {currentQ.questionNumber}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                  {currentQ.question}
                </p>

                {/* Interactive Question Options with Tactile 3D Keycaps */}
                <fieldset className="space-y-1.5 text-xs" aria-label="Exam Options">
                  <legend className="sr-only">Select your answer</legend>
                  {currentQ.options.map((opt) => {
                    const isSelected = selectedOption === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSelectedOption(opt.key)}
                        className={`w-full flex items-center gap-2.5 rounded-xl border p-2 min-h-[44px] text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? opt.isCorrect
                              ? "border-emerald-500/80 bg-emerald-950/60 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)] font-bold"
                              : "border-rose-500/80 bg-rose-950/60 text-rose-100 font-bold"
                            : "border-white/10 bg-slate-900/60 text-slate-200 hover:border-white/20 hover:bg-slate-900/90"
                        }`}
                      >
                        {/* Physical Tactile Keycap */}
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-black transition-all ${
                            isSelected
                              ? opt.isCorrect
                                ? "bg-emerald-500 text-slate-950 shadow-[0_2px_0_#065f46]"
                                : "bg-rose-500 text-white shadow-[0_2px_0_#9f1239]"
                              : "bg-slate-800 text-slate-300 border border-white/10 shadow-[0_2px_0_#0f172a]"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="flex-1 text-[11px] sm:text-xs">{opt.text}</span>
                        {isSelected && (
                          <span
                            className={`text-[9px] uppercase font-black tracking-wide px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              opt.isCorrect
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {opt.isCorrect ? (
                              <>
                                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Correct</span>
                              </>
                            ) : (
                              <>
                                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                <span>Review</span>
                              </>
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </fieldset>

                {/* Authentic Physical JAMB 8-Key Navigation Strip */}
                <div className="pt-2 border-t border-white/10">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>JAMB 8-Keypad Controls:</span>
                    <span className="text-cyan-400 font-semibold">Active Hardware Emulation</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { key: "P", label: "Previous" },
                      { key: "N", label: "Next" },
                      { key: "R", label: "Reverse" },
                      { key: "S", label: "Submit" },
                    ].map((k) => (
                      <button
                        key={k.key}
                        type="button"
                        onClick={() => {
                          if (k.key === "N") {
                            const keys = ["A", "B", "C", "D"];
                            const currIdx = keys.indexOf(selectedOption);
                            setSelectedOption(keys[(currIdx + 1) % keys.length]);
                          } else if (k.key === "P") {
                            const keys = ["A", "B", "C", "D"];
                            const currIdx = keys.indexOf(selectedOption);
                            setSelectedOption(keys[(currIdx - 1 + keys.length) % keys.length]);
                          } else if (k.key === "R") {
                            setIsFlagged(!isFlagged);
                          } else if (k.key === "S") {
                            // Cycle to next subject for quick exploration
                            const subKeys = HERO_SUBJECTS.map((s) => s.id);
                            const nextIdx = (subKeys.indexOf(activeSubject) + 1) % subKeys.length;
                            handleSubjectChange(subKeys[nextIdx]);
                          }
                        }}
                        className="py-1.5 px-2 rounded-lg bg-slate-900 border border-white/15 text-center font-mono text-xs font-bold text-slate-300 hover:text-white hover:border-cyan-400/50 shadow-[0_2px_0_#0f172a] active:translate-y-0.5 active:shadow-none transition cursor-pointer flex items-center justify-center gap-1 min-h-[44px]"
                      >
                        <span className="text-cyan-400 font-black">[{k.key}]</span>
                        <span className="text-[10px] font-sans">{k.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Socratic Instant Explanation & Examiner Trap */}
                {activeOption && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-2.5 text-[11px] text-cyan-200 animate-bl-fade-in space-y-1">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span>Socratic Rule:</span>
                    </div>
                    <p className="leading-relaxed pl-5 text-[10px] sm:text-[11px]">{activeOption.explanation}</p>
                    <p className="text-[10px] text-amber-300/90 pl-5 font-mono italic">
                      {currentQ.examinerTrap}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[11px] text-slate-400">
                  <span className="text-[10px]">Split-Screen Simulator Preview</span>
                  <Link
                    href="/cbt"
                    className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors inline-flex items-center gap-1 text-[11px]"
                  >
                    <span>Launch Full Mock</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Dynamic Exam Countdown Slot (Rule S7 compliant) */}
            <DynamicCountdownSlot />
          </div>
        </div>
      </div>
    </section>
  );
}
