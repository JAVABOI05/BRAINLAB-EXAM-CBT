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

const SAMPLE_QUESTION: {
  subject: string;
  year: string;
  question: string;
  options: QuestionOption[];
} = {
  subject: "Use of English",
  year: "JAMB UTME Blueprint",
  question:
    "Choose the option that best completes the sentence: 'Neither the principal nor the teachers _______ present at the valedictory service.'",
  options: [
    {
      key: "A",
      text: "were",
      isCorrect: true,
      explanation:
        "Correct. Under the grammatical rule of proximity, when subjects are connected by 'neither... nor', the verb agrees in number with the nearer subject ('teachers' = plural -> 'were').",
    },
    {
      key: "B",
      text: "was",
      isCorrect: false,
      explanation:
        "Incorrect. 'Was' would agree with 'principal', but the closer subject is plural 'teachers'.",
    },
    {
      key: "C",
      text: "is",
      isCorrect: false,
      explanation:
        "Incorrect. The sentence refers to a completed past event ('valedictory service').",
    },
    {
      key: "D",
      text: "are",
      isCorrect: false,
      explanation:
        "Incorrect. The past tense is required for this context.",
    },
  ],
};

export function HomeHero() {
  const heroConfig = HOMEPAGE_CONTENT_CONFIG.hero;
  const [selectedOption, setSelectedOption] = useState<string>("A");
  const [showCalculator, setShowCalculator] = useState(false);

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

  const activeOption = SAMPLE_QUESTION.options.find(
    (opt) => opt.key === selectedOption
  );

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
              <div className="mt-3.5 space-y-3 rounded-2xl bg-slate-950/80 border border-white/10 p-4 text-left shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span>Subject: {SAMPLE_QUESTION.subject}</span>
                  </span>
                  <span className="text-cyan-400 font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                    Question 14 of 40
                  </span>
                </div>

                <p className="text-sm font-semibold text-white leading-relaxed">
                  {SAMPLE_QUESTION.question}
                </p>

                {/* Interactive Question Options with Tactile 3D Keycaps */}
                <fieldset className="space-y-2 text-xs" aria-label="Exam Options">
                  <legend className="sr-only">Select your answer</legend>
                  {SAMPLE_QUESTION.options.map((opt) => {
                    const isSelected = selectedOption === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSelectedOption(opt.key)}
                        className={`w-full flex items-center gap-3 rounded-xl border p-2.5 min-h-[44px] text-left transition-all duration-150 cursor-pointer ${
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
                        <span className="flex-1 text-xs">{opt.text}</span>
                        {isSelected && (
                          <span
                            className={`text-[10px] uppercase font-black tracking-wide px-2 py-0.5 rounded flex items-center gap-1 ${
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
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Physical JAMB 8-Keypad:</span>
                    <span className="text-cyan-400 font-semibold">Active Mode</span>
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
                          }
                        }}
                        className="py-1.5 px-2 rounded-lg bg-slate-900 border border-white/15 text-center font-mono text-xs font-bold text-slate-300 hover:text-white hover:border-cyan-400/50 shadow-[0_2px_0_#0f172a] active:translate-y-0.5 active:shadow-none transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span className="text-cyan-400 font-black">[{k.key}]</span>
                        <span className="text-[10px] font-sans">{k.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Socratic Instant Explanation */}
                {activeOption && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-2.5 text-[11px] text-cyan-200 animate-bl-fade-in space-y-1">
                    <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span>Pedagogical Grammar Rule:</span>
                    </div>
                    <p className="leading-relaxed pl-5">{activeOption.explanation}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-slate-400">
                  <span>Interactive Split-Screen Simulator Preview</span>
                  <Link
                    href="/cbt"
                    className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
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
