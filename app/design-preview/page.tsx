"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";
import { DynamicCountdownSlot } from "@/app/components/home/DynamicCountdownSlot";
import { DynamicLiveStatisticsSlot } from "@/app/components/home/DynamicLiveStatisticsSlot";
import { HomeUniversityTargetSocialProof } from "@/app/components/home/HomeUniversityTargetSocialProof";
import { HomeJoinChannel } from "@/app/components/home/HomeJoinChannel";
import { HomeAudiences } from "@/app/components/home/HomeAudiences";
import HomeInstantMiniMock from "@/app/components/home/HomeInstantMiniMock";
import { HomeBrainLabLoop } from "@/app/components/home/HomeBrainLabLoop";
import { HomeProductShowcase } from "@/app/components/home/HomeProductShowcase";
import { HomeStemStudio } from "@/app/components/home/HomeStemStudio";
import { HomeTrustOutcomes } from "@/app/components/home/HomeTrustOutcomes";
import { HomePricingTeaser } from "@/app/components/home/HomePricingTeaser";
import { HomeFounderNote } from "@/app/components/home/HomeFounderNote";
import { HomeFaqCta } from "@/app/components/home/HomeFaqCta";

// Exact Verified Question Content
const SAMPLE_QUESTION = {
  subject: "Use of English",
  topic: "Concord & Grammatical Agreement",
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

/**
 * PRODUCTION-GRADE BRILLIANT.ORG HERO (CYCLE 3 FINAL PERFECTION)
 */
function BrilliantHero() {
  const heroConfig = HOMEPAGE_CONTENT_CONFIG.hero;
  const [selectedOption, setSelectedOption] = useState<string>("A");
  const [showCalculator, setShowCalculator] = useState(false);
  const [streakCount, setStreakCount] = useState<number>(3);
  const [justSelected, setJustSelected] = useState<boolean>(false);

  const headline = resolveClaimValue(
    heroConfig.headline,
    "A Smarter Way to Learn, Practise and Achieve."
  );
  const subhead = resolveClaimValue(
    heroConfig.subhead,
    "West Africa's connected academy for examination excellence, interactive STEM exploration, and personalised AI tutoring."
  );
  const disclosure = resolveClaimValue(
    heroConfig.disclosure,
    "Public learners receive full access to CBT practice, question banks, AI Tutor fair-use, and Learning Hub at ₦0."
  );

  const activeOption = SAMPLE_QUESTION.options.find((opt) => opt.key === selectedOption);

  const handleSelectOption = (key: string) => {
    setSelectedOption(key);
    setJustSelected(true);
    setTimeout(() => setJustSelected(false), 300);
    if (key === "A") {
      setStreakCount(4);
    }
  };

  return (
    <section
      aria-label="BrainLab Learning Ecosystem Introduction"
      className="relative overflow-hidden bg-white dark:bg-[#070D18] text-slate-900 dark:text-white pt-6 pb-12 sm:pt-10 sm:pb-16 lg:pt-14 lg:pb-20 border-b border-slate-200/80 dark:border-slate-800 transition-colors"
    >
      {/* Brilliant-style Subtle Geometric Dot Matrix */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(#1e293b 1.2px, transparent 1.2px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />

      {/* Gentle Ambient Warmth Radiance */}
      <div
        className="pointer-events-none absolute -top-40 right-1/4 h-[550px] w-[550px] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 -left-32 h-[450px] w-[450px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 blur-[130px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Micro-Navigation & Exam Standard Ribbon - Streamlined */}
        <div className="flex items-center justify-between gap-2 pb-4 mb-6 border-b border-slate-100 dark:border-slate-800/80 text-[11px] sm:text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              JAMB UTME 2027 &bull; OFFICIAL BLUEPRINT
            </span>
          </div>

          <div className="flex items-center gap-3 font-semibold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-amber-900 dark:text-amber-200">
              <span>🔥</span>
              <span>Streak: <strong className="font-mono font-bold">{streakCount}d</strong></span>
            </span>
            <span className="hidden md:inline text-emerald-700 dark:text-emerald-400 font-bold">₦0 FREE LEARNER ACCESS</span>
          </div>
        </div>

        {/* Master Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Bold, Inspiring Educational Editorial */}
          <div className="lg:col-span-6 space-y-5 text-center lg:text-left">
            
            {/* Brilliant-style Category Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs">
              <span className="text-emerald-600 dark:text-emerald-400 text-sm">✦</span>
              <span>INTERACTIVE PROBLEM-SOLVING &bull; 100% FREE CBT</span>
            </div>

            {/* H1 Primary Promise: Scaled for Fluid Mobile & Desktop Hierarchy */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.08]">
              A Smarter Way to <br className="hidden sm:inline" />
              Learn, Practise <br className="hidden sm:inline" />
              <span className="relative inline-block text-blue-600 dark:text-sky-400">
                and Achieve.
                {/* Hand-drawn style decorative wave underline */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-emerald-500 dark:text-emerald-400"
                  viewBox="0 0 240 10"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 7C45 2 115 1 238 7"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Subheading: High Clarity & Accessible Contrast */}
            <p className="text-base sm:text-lg font-normal text-slate-700 dark:text-slate-200 leading-relaxed max-w-xl mx-auto lg:mx-0">
              {subhead}
            </p>

            {/* Brilliant Tactile Action Buttons: Solid Weight & Physical Depth */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-1">
              <Link
                href={heroConfig.primaryCta.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 border-b-4 border-emerald-700 hover:border-emerald-600 px-8 py-3.5 sm:py-4 text-base font-black text-white shadow-lg shadow-emerald-600/25 transition-all duration-150 bl-focus-ring min-h-[50px] group"
              >
                <span>{heroConfig.primaryCta.label}</span>
                <span className="transition-transform group-hover:translate-x-1 font-bold text-lg" aria-hidden="true">&rarr;</span>
              </Link>

              <Link
                href={heroConfig.secondaryCta.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 active:translate-y-0.5 border-b-4 border-slate-400 dark:border-slate-800 px-7 py-3 text-base font-bold text-slate-800 dark:text-slate-200 shadow-sm transition-all duration-150 bl-focus-ring min-h-[50px]"
              >
                <span>{heroConfig.secondaryCta.label}</span>
              </Link>
            </div>

            {/* Trust Proof Badges */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-xs">✓</span>
                  <span>Real JAMB 8-Key Engine</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-xs">✓</span>
                  <span>Step-by-Step Corrections</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-xs">✓</span>
                  <span>100% Free Daily Drills</span>
                </span>
              </div>

              {disclosure && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  &bull; {disclosure}
                </p>
              )}
            </div>

            {/* Mobile Scroll Indicator Pill */}
            <div className="lg:hidden pt-2 flex justify-center">
              <a
                href="#interactive-solve"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span>Solve live question below</span>
                <span>&darr;</span>
              </a>
            </div>

            {/* Live Aggregate Candidate Count */}
            <div className="pt-1">
              <DynamicLiveStatisticsSlot />
            </div>
          </div>

          {/* Right Column: Brilliant-Style Interactive Visual Problem Card */}
          <div id="interactive-solve" className="lg:col-span-6 relative">
            
            {/* Main Interactive Solve Card */}
            <div
              className={`relative rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0D1727] p-5 sm:p-7 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] transition-all min-h-[460px] flex flex-col justify-between ${
                justSelected ? "scale-[1.005]" : ""
              }`}
              role="region"
              aria-label="Interactive CBT Practice Simulator Preview"
            >
              {/* Card Header: Topic Badge + Calculator Toggle + Timer */}
              <div>
                <div className="flex flex-wrap items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                      Q 14 of 40
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {SAMPLE_QUESTION.subject} &bull; <span className="text-slate-500 dark:text-slate-400 font-normal">{SAMPLE_QUESTION.topic}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCalculator(!showCalculator)}
                      className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 transition-colors bl-focus-ring min-h-[44px]"
                      aria-label="Toggle JAMB On-screen Calculator"
                    >
                      {showCalculator ? "Hide Calc" : "8-Key Calc"}
                    </button>
                    <span className="rounded-xl bg-slate-900 dark:bg-emerald-950 text-white dark:text-emerald-300 px-3 py-1.5 text-xs font-mono font-bold shadow-xs">
                      ⏱ 01:42:15
                    </span>
                  </div>
                </div>

                {/* Calculator Popout Drawer */}
                {showCalculator && (
                  <div className="mb-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3.5 text-xs animate-bl-scale-in">
                    <div className="flex justify-between font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                      <span>OFFICIAL JAMB DESK CALCULATOR</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">READY</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 max-w-xs font-mono font-bold">
                      <span className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 text-center shadow-xs">7</span>
                      <span className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 text-center shadow-xs">8</span>
                      <span className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 text-center shadow-xs">9</span>
                      <span className="rounded-xl bg-blue-600 text-white p-2 text-center shadow-xs font-bold">÷</span>
                    </div>
                  </div>
                )}

                {/* Question Statement */}
                <div className="space-y-3.5">
                  <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                    {SAMPLE_QUESTION.question}
                  </p>

                  {/* Brilliant-style Tactile Choice Cards: 48px Minimum Height for Touch */}
                  <fieldset className="space-y-2.5" aria-label="Exam Options">
                    <legend className="sr-only">Choose the correct answer option</legend>
                    {SAMPLE_QUESTION.options.map((opt) => {
                      const isSelected = selectedOption === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectOption(opt.key)}
                          className={`w-full flex items-center gap-3.5 rounded-2xl border-2 p-3 sm:p-3.5 min-h-[48px] text-left transition-all duration-150 bl-focus-ring ${
                            isSelected
                              ? opt.isCorrect
                                ? "border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100 shadow-md shadow-emerald-500/10 font-bold"
                                : "border-red-500 bg-red-50/90 dark:bg-red-950/60 text-red-950 dark:text-red-100 font-bold"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {/* Circular Letter Keycap */}
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold transition-transform ${
                              isSelected
                                ? opt.isCorrect
                                  ? "bg-emerald-600 text-white shadow-xs scale-105"
                                  : "bg-red-600 text-white shadow-xs scale-105"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {opt.key}
                          </span>

                          <span className="flex-1 text-sm sm:text-base font-semibold">{opt.text}</span>

                          {isSelected && (
                            <span
                              className={`rounded-full px-3 py-0.5 text-xs font-bold tracking-wide transition-all ${
                                opt.isCorrect
                                  ? "bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200"
                                  : "bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-200"
                              }`}
                            >
                              {opt.isCorrect ? "✓ Correct" : "✗ Review Rule"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </fieldset>

                  {/* Socratic Step-by-Step Pedagogical Explanation Drawer */}
                  {activeOption && (
                    <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 space-y-1.5 animate-bl-fade-up">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                          <span>💡</span>
                          <span>Why this works (Socratic Rule of Proximity):</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                          JAMB ENGLISH CONCORD
                        </span>
                      </div>
                      <p className="leading-relaxed text-slate-800 dark:text-slate-200">
                        {activeOption.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Hardware 8-Key Legend & Full Simulator Link */}
              <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-bold">HOTKEYS:</span>
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">A</span>
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">B</span>
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">C</span>
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">D</span>
                  <span className="hidden sm:inline rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">P</span>
                  <span className="hidden sm:inline rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">N</span>
                </div>

                <Link
                  href="/cbt"
                  className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 transition-colors min-h-[44px]"
                >
                  <span>Launch 40-Question Mock</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Embedded Live Countdown Slot */}
            <div className="mt-4">
              <DynamicCountdownSlot />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// MAIN /design-preview WRAPPER
// =============================================================================
export default function DesignPreviewPage() {
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      localStorage.setItem("brainlab-cookie-consent", "all");
      window.dispatchEvent(
        new CustomEvent("brainlab-consent-updated", { detail: { status: "all" } })
      );
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = themeMode === "light" ? "dark" : "light";
    setThemeMode(next);
    if (typeof document !== "undefined") {
      if (next === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      }
    }
  };

  return (
    <main id="main" className={`min-h-screen ${themeMode === "dark" ? "dark bg-[#070D18]" : "bg-white"}`}>
      {/* Top Preview Control Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#070D18]/95 px-4 py-2.5 backdrop-blur-md transition-colors">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-black tracking-wider text-white">
              BRILLIANT.ORG STYLING
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              BrainLab Master Redesign &bull; Interactive Problem-First Hero
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors bl-focus-ring min-h-[44px]"
            >
              <span>{themeMode === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Render */}
      <BrilliantHero />

      {/* Group 1: Join Our Channel */}
      <HomeJoinChannel />

      {/* Group 2: Audience Entry Points & The BrainLab Loop */}
      <HomeAudiences />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <HomeInstantMiniMock />
      </div>
      <HomeBrainLabLoop />

      {/* Group 3: Product Showcase Superpower Studios & STEM Laboratories */}
      <HomeProductShowcase />
      <HomeStemStudio />

      {/* Group 4: Trust Outcomes, University Targets & Pricing Teaser */}
      <HomeTrustOutcomes />
      <HomeUniversityTargetSocialProof />
      <HomePricingTeaser />

      {/* Group 5: Founder Note & FAQ */}
      <HomeFounderNote />
      <HomeFaqCta />

      {/* Craftsmanship & Design Quality Documentation Note */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400" role="complementary" aria-label="Preview Design Documentation">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-2">
              <span className="text-emerald-500 text-base">✦</span>
              <span>Visual Learning by Doing</span>
            </div>
            <p className="text-xs leading-relaxed">
              Directly translates Brilliant.org&apos;s signature problem-first philosophy: visitors solve a genuine UTME question within 3 seconds, triggering immediate pedagogical feedback.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-2">
              <span className="text-blue-500 text-base">⚡</span>
              <span>Tactile Physical Buttons</span>
            </div>
            <p className="text-xs leading-relaxed">
              Beveled 3D buttons (`border-b-4`) with physical press states provide unmistakable feedback on mobile touchscreens without excessive neon or childish styling.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-2">
              <span className="text-amber-500 text-base">🛡️</span>
              <span>Authentic Nigerian Context</span>
            </div>
            <p className="text-xs leading-relaxed">
              Maintains full UTME blueprint fidelity: JAMB 8-key shortcuts (`A, B, C, D, P, N`), official on-screen calculator drawer, and 2027 examination countdown.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
