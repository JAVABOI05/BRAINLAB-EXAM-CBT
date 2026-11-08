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
    "One Intelligent Learning Ecosystem. A Complete Journey from Learning to Mastery."
  );

  const subhead = resolveClaimValue(
    heroConfig.subhead,
    "From syllabus fundamentals and CBT mocks to weak-spot diagnostics and live tutor mastery — unified in one high-performance platform for Nigerian students."
  );

  const disclosure = resolveClaimValue(
    heroConfig.disclosure,
    "Free tier includes diagnostic tests and daily practice drills."
  );

  const activeOption = SAMPLE_QUESTION.options.find(
    (opt) => opt.key === selectedOption
  );

  return (
    <section
      aria-label="BrainLab Learning Ecosystem Introduction"
      className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-16 pb-12 dark:border-slate-800 dark:from-[#070D18] dark:via-[#0B1536] dark:to-[#070D18] sm:pt-24 sm:pb-16"
    >
      {/* Decorative Radial Grid */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1356E8_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.035] dark:opacity-[0.06]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Promise & Actions (Motion: bl-fade-up) */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left animate-bl-fade-up">
            {/* Category Pill (Slot S1-01 Brand Mark integration) */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3.5 py-1 text-xs font-bold text-[var(--bl-color-brand-primary)] dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="flex h-2 w-2 rounded-full bg-[var(--bl-color-brand-primary)] animate-bl-pulse" />
              <span>NIGERIA&apos;S INTELLIGENT LEARNING PLATFORM</span>
            </div>

            {/* H1 Primary Promise */}
            <h1 className="text-4xl font-black tracking-tight text-[var(--bl-color-text-primary)] sm:text-5xl lg:text-6xl leading-[1.08]">
              {headline}
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {subhead}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                href={heroConfig.primaryCta.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--bl-color-brand-primary)] hover:bg-[var(--bl-color-brand-primary-hover)] px-7 py-3.5 text-base font-bold text-white shadow-md hover:shadow-lg transition-all duration-180 bl-focus-ring min-h-[48px] bl-interactive-hover"
              >
                <span>{heroConfig.primaryCta.label}</span>
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href={heroConfig.secondaryCta.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80 px-6 py-3.5 text-base font-bold text-[var(--bl-color-text-primary)] transition-all duration-180 bl-focus-ring min-h-[48px] bl-interactive-hover"
              >
                <span>{heroConfig.secondaryCta.label}</span>
              </Link>
            </div>

            {/* Truthful Free Tier Disclosure */}
            {disclosure && (
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                &bull; {disclosure}
              </p>
            )}

            {/* Dynamic Live Statistics Slot (Rule S7 compliant, verified data only) */}
            <DynamicLiveStatisticsSlot />
          </div>

          {/* Right Column: Real CBT Product Simulator Mockup & Countdown (Slot S1-02, Motion: bl-fade-in bl-stagger-2) */}
          <div className="lg:col-span-5 flex flex-col gap-6 animate-bl-fade-in bl-stagger-2">
            {/* Real Product Simulator Mockup (Slot S1-02) */}
            <div
              className="relative rounded-3xl border border-slate-200/90 bg-[var(--bl-color-surface)] p-4 sm:p-5 shadow-xl dark:border-slate-800 min-h-[380px]"
              role="region"
              aria-label="Interactive CBT Practice Simulator Preview"
            >
              {/* Simulator Chrome Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/80 inline-block" />
                  <span className="ml-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    CBT Engine · Q 14 of 40
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 bl-focus-ring"
                    aria-label="Toggle JAMB On-screen Calculator"
                  >
                    {showCalculator ? "Hide Calc" : "Calc"}
                  </button>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Time: 01:42:15
                  </span>
                </div>
              </div>

              {/* Optional On-screen calculator drawer */}
              {showCalculator && (
                <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-center text-xs dark:border-slate-700 dark:bg-slate-800 animate-bl-scale-in">
                  <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                    JAMB Official Scientific Calculator Ready
                  </p>
                  <div className="mt-1 grid grid-cols-4 gap-1 text-[11px]">
                    <span className="rounded bg-white p-1 font-mono dark:bg-slate-700">7</span>
                    <span className="rounded bg-white p-1 font-mono dark:bg-slate-700">8</span>
                    <span className="rounded bg-white p-1 font-mono dark:bg-slate-700">9</span>
                    <span className="rounded bg-blue-100 p-1 font-mono text-blue-700 dark:bg-blue-900 dark:text-blue-200">÷</span>
                  </div>
                </div>
              )}

              {/* Realistic CBT Question Preview Card */}
              <div className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60 text-left">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Subject: {SAMPLE_QUESTION.subject}</span>
                  <span className="text-blue-600 dark:text-blue-400">{SAMPLE_QUESTION.year}</span>
                </div>

                <p className="text-sm font-semibold text-[var(--bl-color-text-primary)] leading-relaxed">
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
                        className={`w-full flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors duration-150 bl-focus-ring ${
                          isSelected
                            ? opt.isCorrect
                              ? "border-emerald-500 bg-emerald-50/90 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-200 font-bold"
                              : "border-red-400 bg-red-50/90 text-red-900 dark:border-red-600 dark:bg-red-950/60 dark:text-red-200 font-bold"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                            isSelected
                              ? opt.isCorrect
                                ? "bg-emerald-600 text-white"
                                : "bg-red-600 text-white"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
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
                  <div className="rounded-xl border border-blue-200/80 bg-blue-50/80 p-2.5 text-[11px] text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200 animate-bl-fade-in">
                    <span className="font-bold">Pedagogical Rule: </span>
                    {activeOption.explanation}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500">
                  <span>Interactive Split-Screen Simulator Preview</span>
                  <Link
                    href="/cbt"
                    className="text-[var(--bl-color-brand-primary)] font-bold hover:underline"
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
