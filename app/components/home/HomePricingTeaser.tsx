"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSubscriptionPlans, DEFAULT_PLANS, type SubscriptionPlan } from "@/app/lib/platformConfig";
import { useCohortConfig } from "@/app/lib/useCohortConfig";

export function HomePricingTeaser() {
  const cohortConfig = useCohortConfig();
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
      className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20 lg:py-24 border-b border-slate-200 bg-white text-slate-900"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-800 border border-blue-200 mb-3 shadow-2xs">
            UNIFIED EXAMINATION PREPARATION &bull; 3 CANDIDATE TRACKS
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            Complete Academic Superpowers for Every Candidate
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            Comprehensive curriculum coverage, timed CBT mock engines, and diagnostic telemetry engineered specifically for candidates targeting top-percentile scores.
          </p>
        </div>

        {/* Candidate Standard Suite Bento Card */}
        <div className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-10 border-2 border-slate-200/90 bg-[#F8FAFC] shadow-xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 mb-2">
                OPEN CANDIDATE PLATFORM
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Candidate Standard Suite
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Standard access across UTME, O Level, and Post-UTME core study and simulation engines
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">Standard Suite</span>
              <span className="text-xs text-slate-500 block font-semibold">Included for All Candidates</span>
            </div>
          </div>

          {/* 6 Core Feature Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-800">
            <div className="flex items-start gap-3 rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-slate-950 block font-bold">UTME 4-Subject Simulator</strong>
                <span className="text-slate-600 text-xs">Authentic 4-subject 400-mark timed mock exams matching JAMB 8-key hall parity.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-slate-950 block font-bold">O Level Curriculum Bank</strong>
                <span className="text-slate-600 text-xs">Verified past questions across WAEC, NECO, and GCE with step-by-step master derivations.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-slate-950 block font-bold">Post-UTME Screening Drills</strong>
                <span className="text-slate-600 text-xs">Timed 30-min university screening papers with composite aggregate admission calculator.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-slate-950 block font-bold">Socratic AI Study Assistant</strong>
                <span className="text-slate-600 text-xs">Interactive guiding hints that explain difficult formulas without spoiling the answers.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-slate-950 block font-bold">Virtual STEM Studio 3D</strong>
                <span className="text-slate-600 text-xs">Interactive 3D molecular structures, circuits, and physics mechanics simulations.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-slate-950 block font-bold">Offline PWA Sync (&lt; 1.2 MB)</strong>
                <span className="text-slate-600 text-xs">Installable on Android, iOS, or PC with zero-data offline practice capabilities.</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/cbt"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition active:scale-95"
            >
              <span>Launch Candidate Simulator</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>

            <div
              className="text-xs text-slate-600 text-center sm:text-right"
              data-plan-rate={plan.price_naira.toLocaleString()}
            >
              Optional {cohortConfig.active_cohort_name} upgrades from ₦{plan.price_naira.toLocaleString()} &bull;{" "}
              <Link href="/pricing" className="text-blue-600 hover:text-blue-800 font-bold underline">
                View full plans breakdown &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
