"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSubscriptionPlans, DEFAULT_PLANS, type SubscriptionPlan } from "@/app/lib/platformConfig";

export function HomePricingTeaser() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);

  useEffect(() => {
    let isMounted = true;
    void getSubscriptionPlans()
      .then((livePlans) => {
        if (isMounted && Array.isArray(livePlans) && livePlans.length > 0) {
          setPlans(livePlans.filter((p) => p.is_active));
        }
      })
      .catch(() => {
        // Fall back to DEFAULT_PLANS
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const plan =
    plans.find((p) => p.id === "plus" || p.id === "premium" || p.id === "apex_cohort") ||
    plans[0];

  return (
    <section
      id="pricing"
      aria-label="BrainLab Open Academic Platform and Plans"
      className="scroll-mt-20 sm:scroll-mt-24 relative py-16 sm:py-20 lg:py-24 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070D18] transition-colors overflow-hidden"
    >
      {/* Brilliant Subtle Geometric Grid Matrix */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(#1e293b 1.2px, transparent 1.2px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 mb-3 shadow-xs">
            100% FREE FOR EVERY STUDENT &bull; NO SUBSCRIPTION REQUIRED
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Complete Academic Superpowers. Open to Every Candidate.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            BrainLab is an educational platform, not a paywalled service. All registered Nigerian candidates get unlimited CBT mock exams, syllabus-aligned past questions, AI study assistance, and 3D science labs completely free.
          </p>
        </div>

        {/* Free Public Access Showcase Bento Card */}
        <div className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-10 lg:p-12 border-2 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm relative transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-2">
                OPEN TO EVERY LEARNER
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Public Access Plan
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Zero fees &bull; No credit card &bull; Permanent access to all core study tools
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">₦0</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold uppercase tracking-wider mt-0.5">/ free forever</span>
            </div>
          </div>

          {/* 6 Core Feature Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="flex items-start gap-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-800/50 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-sm border border-emerald-200 dark:border-emerald-800 mt-0.5">
                ✓
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white block font-bold text-sm sm:text-base">Full CBT Practice Simulator</strong>
                <span className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-0.5 block leading-relaxed">Authentic 4-subject 400-mark timed mock exams matching JAMB 8-key hall parity.</span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-800/50 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-sm border border-emerald-200 dark:border-emerald-800 mt-0.5">
                ✓
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white block font-bold text-sm sm:text-base">Curriculum Question Bank</strong>
                <span className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-0.5 block leading-relaxed">Verified past questions across WAEC, JAMB, and NECO with step-by-step master derivations.</span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-800/50 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-sm border border-emerald-200 dark:border-emerald-800 mt-0.5">
                ✓
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white block font-bold text-sm sm:text-base">Socratic AI Study Assistant</strong>
                <span className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-0.5 block leading-relaxed">Interactive guiding hints that explain difficult formulas without spoiling the answers.</span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-800/50 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-sm border border-emerald-200 dark:border-emerald-800 mt-0.5">
                ✓
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white block font-bold text-sm sm:text-base">Virtual STEM Studio 3D</strong>
                <span className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-0.5 block leading-relaxed">Interactive 3D molecular structures, circuits, and physics mechanics simulations.</span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-800/50 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-sm border border-emerald-200 dark:border-emerald-800 mt-0.5">
                ✓
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white block font-bold text-sm sm:text-base">National Challenge Arena</strong>
                <span className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-0.5 block leading-relaxed">Real-time 1v1 sprint battles, daily study streaks, XP, and state leaderboards.</span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-800/50 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-sm border border-emerald-200 dark:border-emerald-800 mt-0.5">
                ✓
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white block font-bold text-sm sm:text-base">Offline PWA Sync (&lt; 1.2 MB)</strong>
                <span className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-0.5 block leading-relaxed">Installable on Android, iOS, or PC with zero-data offline practice capabilities.</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/cbt"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 text-base font-black border-2 border-emerald-700 border-b-4 active:border-b-2 active:translate-y-0.5 transition-all shadow-sm bl-focus-ring min-h-[48px]"
            >
              <span>Get Started, It&apos;s Free</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>

            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center sm:text-right">
              Optional upgrades from ₦{plan.price_naira.toLocaleString()} &bull;{" "}
              <Link href="/pricing" className="text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-1">
                View full plans breakdown &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
