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
      className="scroll-mt-20 sm:scroll-mt-24 py-10 sm:py-16 lg:py-24 border-b border-slate-200 bg-white text-slate-900 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 sm:px-3.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black bg-blue-50 text-blue-800 border border-blue-200 mb-2 sm:mb-3 shadow-2xs">
            TRANSPARENT CANDIDATE ACCESS &bull; HONEST COMMITMENT
          </span>
          <h2 className="text-xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            Complete Academic Superpowers for Every Candidate
          </h2>
          <p className="mt-2 text-xs sm:text-base text-slate-600 leading-relaxed font-normal">
            Comprehensive curriculum coverage, timed CBT mock engines, and diagnostic telemetry engineered specifically for candidates targeting top-percentile scores.
          </p>
        </div>

        {/* Pricing Layout: Light Standard Platform + One Deep Navy Highlight Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch max-w-6xl mx-auto">
          
          {/* 1. CANDIDATE STANDARD SUITE (Light Surface Bento Card) */}
          <div className="lg:col-span-7 rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-9 border-2 border-slate-200 bg-[#F8FAFC] shadow-md sm:shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-4 sm:pb-5 mb-4 sm:mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 mb-1.5">
                    OPEN CANDIDATE PLATFORM
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight">
                    Candidate Standard Suite
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1">
                    Standard access across UTME, O Level, and Post-UTME core study and simulation engines
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-lg sm:text-2xl font-black text-emerald-700 uppercase tracking-tight block">Free Access</span>
                  <span className="text-[11px] sm:text-xs text-slate-500 font-semibold">Included for All Candidates</span>
                </div>
              </div>

              {/* Core Feature Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm text-slate-800 mb-6">
                <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 mt-0.5" aria-hidden="true">
                    <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div>
                    <strong className="text-slate-950 block font-bold">UTME 4-Subject Simulator</strong>
                    <span className="text-slate-600 text-xs">Authentic 4-subject 400-mark timed mock exams with 8-key parity.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mt-0.5" aria-hidden="true">
                    <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div>
                    <strong className="text-slate-950 block font-bold">O Level Curriculum Bank</strong>
                    <span className="text-slate-600 text-xs">Verified past questions across WAEC, NECO, and GCE with derivations.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 mt-0.5" aria-hidden="true">
                    <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div>
                    <strong className="text-slate-950 block font-bold">Post-UTME Screening Drills</strong>
                    <span className="text-slate-600 text-xs">Timed university screening papers with composite aggregate calculator.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 mt-0.5" aria-hidden="true">
                    <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <div>
                    <strong className="text-slate-950 block font-bold">Virtual STEM Studio 3D</strong>
                    <span className="text-slate-600 text-xs">Interactive 3D molecular structures, circuits, and physics mechanics.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link
                href="/cbt"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-black text-white shadow-md shadow-blue-500/20 transition active:scale-95 bl-focus-ring"
              >
                <span>Launch Free CBT Simulator</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <span className="text-xs text-slate-500 font-medium">
                No credit card required &bull; 100% Free Starter
              </span>
            </div>
          </div>

          {/* 2. THE DEEP NAVY HIGHLIGHT CARD (Cohort Intensive Upgrade) */}
          <div className="lg:col-span-5 rounded-3xl p-6 sm:p-8 lg:p-9 border-2 border-blue-500/40 bg-[#0B1536] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Top Coral & Blue Accent Glow */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#FF5238]/15 blur-3xl" aria-hidden="true" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-blue-600 to-cyan-500 text-white mb-4 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                <span>INTENSIVE CANDIDATE ACCELERATOR</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {cohortConfig.active_cohort_name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 mb-6">
                Structured mentorship, live weekly national mock rankings, and rapid diagnostic intervention.
              </p>

              {/* Dynamic Rate Display */}
              <div
                className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6"
                data-plan-rate={plan.price_naira.toLocaleString()}
              >
                <div className="text-[11px] font-mono text-cyan-300 uppercase tracking-wider">
                  Verified Plan Rate
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                    ₦{plan.price_naira.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">/ candidate</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
                  Includes full mock series &amp; instructor diagnostic reviews
                </span>
              </div>

              {/* Value Add Bullets */}
              <ul className="space-y-2.5 text-xs text-slate-200 mb-6">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Weekly Timed All-Nigeria National Mock Exams</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Personalized Topic Weakness Diagnostic Radar</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Priority Socratic AI Hints &amp; Offline Syncing</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 pt-4 border-t border-white/10 flex flex-col gap-2">
              <Link
                href="/pricing"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition active:scale-95 bl-focus-ring"
              >
                <span>View Full Plans Breakdown</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <div className="text-[11px] text-slate-400 text-center">
                Instant activation upon enrolment
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
