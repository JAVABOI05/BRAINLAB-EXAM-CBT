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
              <span>⚡ OPEN TO EVERY LEARNER • FREE CBT &amp; LEARNING HUB</span>
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
                <span className="text-emerald-400 font-bold">✓</span> Real JAMB 8-Key Engine
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Step-by-Step Corrections
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> 100% Free Daily Drills
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
          <div className="lg:col-span-5 flex flex-col gap-6 animate-bl-fade-in bl-stagger-2 relative">
            {/* Real Product Simulator Mockup (Slot S1-02) */}
            <div
              className="relative rounded-3xl border border-slate-700/80 bg-slate-950/90 p-4 sm:p-5 shadow-2xl backdrop-blur-md min-h-[380px]"
              role="region"
              aria-label="Interactive CBT Practice Simulator Preview"
            >
              {/* Simulator Chrome Bar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/80 inline-block" />
                  <span className="ml-1 text-[11px] font-bold text-slate-400">
                    CBT Engine · Q 14 of 40
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700 bl-focus-ring"
                    aria-label="Toggle JAMB On-screen Calculator"
                  >
                    {showCalculator ? "Hide Calc" : "Calc"}
                  </button>
                  <span className="rounded bg-emerald-950 border border-emerald-700/60 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Time: 01:42:15
                  </span>
                </div>
              </div>

              {/* Optional On-screen calculator drawer */}
              {showCalculator && (
                <div className="mt-2.5 rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-center text-xs animate-bl-scale-in">
                  <p className="font-mono text-xs font-bold text-slate-200">
                    JAMB Official Scientific Calculator Ready
                  </p>
                  <div className="mt-1 grid grid-cols-4 gap-1 text-[11px]">
                    <span className="rounded bg-slate-800 border border-slate-700 p-1 font-mono text-slate-200">7</span>
                    <span className="rounded bg-slate-800 border border-slate-700 p-1 font-mono text-slate-200">8</span>
                    <span className="rounded bg-slate-800 border border-slate-700 p-1 font-mono text-slate-200">9</span>
                    <span className="rounded bg-blue-900/80 border border-blue-700 p-1 font-mono text-blue-200">÷</span>
                  </div>
                </div>
              )}

              {/* Realistic CBT Question Preview Card */}
              <div className="mt-3 space-y-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 p-4 text-left">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>Subject: {SAMPLE_QUESTION.subject}</span>
                  <span className="text-sky-400 font-bold">{SAMPLE_QUESTION.year}</span>
                </div>

                <p className="text-sm font-semibold text-white leading-relaxed">
                  {SAMPLE_QUESTION.question}
                </p>

                {/* Interactive Question Options */}
                <fieldset className="space-y-2 text-xs" aria-label="Exam Options">
                  <legend className="sr-only">Select your answer</legend>
                  {SAMPLE_QUESTION.options.map((opt) => {
                    const isSelected = selectedOption === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSelectedOption(opt.key)}
                        className={`w-full flex items-center gap-2.5 rounded-xl border p-2.5 min-h-[44px] text-left transition-colors duration-150 bl-focus-ring ${
                          isSelected
                            ? opt.isCorrect
                              ? "border-emerald-500 bg-emerald-950/70 text-emerald-200 shadow-md shadow-emerald-950 font-bold"
                              : "border-red-500 bg-red-950/70 text-red-200 font-bold"
                            : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                            isSelected
                              ? opt.isCorrect
                                ? "bg-emerald-600 text-white"
                                : "bg-red-600 text-white"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                        {isSelected && (
                          <span className="text-[10px] uppercase font-black tracking-wide">
                            {opt.isCorrect ? "✓ Correct" : "✗ Review"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </fieldset>

                {/* Socratic Instant Explanation */}
                {activeOption && (
                  <div className="rounded-xl border border-sky-900/60 bg-sky-950/50 p-2.5 text-[11px] text-sky-200 animate-bl-fade-in">
                    <span className="font-bold text-sky-300">Pedagogical Rule: </span>
                    {activeOption.explanation}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <span>Interactive Split-Screen Simulator Preview</span>
                  <Link
                    href="/cbt"
                    className="text-sky-400 font-bold hover:text-sky-300 transition-colors"
                  >
                    Launch Full Mock →
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
