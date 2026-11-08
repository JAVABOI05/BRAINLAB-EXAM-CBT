"use client";

import React from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";
import { DynamicCountdownSlot } from "./DynamicCountdownSlot";
import { DynamicLiveStatisticsSlot } from "./DynamicLiveStatisticsSlot";

export function HomeHero() {
  const heroConfig = HOMEPAGE_CONTENT_CONFIG.hero;

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
          {/* Left Column: Promise & Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Category Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3.5 py-1 text-xs font-bold text-[var(--bl-color-brand-primary)] dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="flex h-2 w-2 rounded-full bg-[var(--bl-color-brand-primary)]" />
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--bl-color-brand-primary)] hover:bg-[var(--bl-color-brand-primary-hover)] px-7 py-3.5 text-base font-bold text-white shadow-md hover:shadow-lg transition-all duration-180 bl-focus-ring min-h-[48px] active:scale-[0.98]"
              >
                <span>{heroConfig.primaryCta.label}</span>
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href={heroConfig.secondaryCta.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80 px-6 py-3.5 text-base font-bold text-[var(--bl-color-text-primary)] transition-all duration-180 bl-focus-ring min-h-[48px] active:scale-[0.98]"
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

            {/* Dynamic Live Statistics Slot (Prompt 6 hook, renders nothing until approved) */}
            <DynamicLiveStatisticsSlot />
          </div>

          {/* Right Column: Real Product Visual & Dynamic Countdown Slot */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Real Product Screenshot Mockup (Slot S1-01) */}
            <div className="relative rounded-3xl border border-slate-200/90 bg-[var(--bl-color-surface)] p-4 shadow-xl dark:border-slate-800">
              {/* Browser/Simulator Chrome Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/80 inline-block" />
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  JAMB UTME CBT Engine
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Live Test
                </span>
              </div>

              {/* Realistic CBT Question Preview Card */}
              <div className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60 text-left">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Subject: English Language</span>
                  <span className="text-blue-600 dark:text-blue-400">Official Blueprint</span>
                </div>

                <p className="text-sm font-semibold text-[var(--bl-color-text-primary)] leading-relaxed">
                  Choose the option that best completes the sentence: &ldquo;Neither the principal nor the teachers _______ present at the valedictory service.&rdquo;
                </p>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 rounded-xl border border-blue-400/60 bg-blue-50/80 p-2 font-bold text-[var(--bl-color-brand-primary)] dark:bg-blue-950/60 dark:border-blue-600">
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[var(--bl-color-brand-primary)] text-white text-[10px]">
                      A
                    </span>
                    <span>were (Correct — Concord of proximity)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-100 text-slate-700 text-[10px] dark:bg-slate-700 dark:text-slate-300">
                      B
                    </span>
                    <span>was</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500">
                  <span>Standard Scoring Breakdown</span>
                  <span className="text-emerald-600 font-bold dark:text-emerald-400">Offline Auto-Sync Active</span>
                </div>
              </div>
            </div>

            {/* Dynamic Exam Countdown Slot (Prompt 6 hook, renders nothing until approved) */}
            <DynamicCountdownSlot />
          </div>
        </div>
      </div>
    </section>
  );
}
