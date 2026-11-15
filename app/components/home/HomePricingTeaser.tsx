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
      className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20 lg:py-24 border-b border-white/10"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-cyan-300 border border-cyan-500/30 mb-3">
            UNIFIED EXAMINATION PREPARATION &bull; 3 CANDIDATE TRACKS
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Complete Academic Superpowers for Every Candidate
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            Comprehensive curriculum coverage, timed CBT mock engines, and diagnostic telemetry engineered specifically for candidates targeting top-percentile scores.
          </p>
        </div>

        {/* Candidate Standard Suite Bento Card */}
        <div className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-10 border border-cyan-500/30 bg-gradient-to-br from-[#0c1829] via-[#081220] to-[#050b14] shadow-2xl relative backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-950/80 text-cyan-300 border border-cyan-700/60 mb-2">
                OPEN CANDIDATE PLATFORM
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Candidate Standard Suite
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Standard access across UTME, O Level, and Post-UTME core study and simulation engines
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-4xl font-black text-cyan-400">₦0</span>
              <span className="text-xs text-slate-400 block font-medium">/ candidate standard tier</span>
            </div>
          </div>

          {/* 6 Core Feature Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-200">
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-white block font-bold">UTME 4-Subject Simulator</strong>
                <span className="text-slate-400 text-xs">Authentic 4-subject 400-mark timed mock exams matching JAMB 8-key hall parity.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-white block font-bold">O Level Curriculum Bank</strong>
                <span className="text-slate-400 text-xs">Verified past questions across WAEC, NECO, and GCE with step-by-step master derivations.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-white block font-bold">Post-UTME Screening Drills</strong>
                <span className="text-slate-400 text-xs">Timed 30-min university screening papers with composite aggregate admission calculator.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-white block font-bold">Socratic AI Study Assistant</strong>
                <span className="text-slate-400 text-xs">Interactive guiding hints that explain difficult formulas without spoiling the answers.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-white block font-bold">Virtual STEM Studio 3D</strong>
                <span className="text-slate-400 text-xs">Interactive 3D molecular structures, circuits, and physics mechanics simulations.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 mt-0.5" aria-hidden="true">
                <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <strong className="text-white block font-bold">Offline PWA Sync (&lt; 1.2 MB)</strong>
                <span className="text-slate-400 text-xs">Installable on Android, iOS, or PC with zero-data offline practice capabilities.</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/cbt"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-teal-300 px-8 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/25 transition active:scale-95"
            >
              <span>Launch Candidate Simulator</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>

            <div className="text-xs text-slate-400 text-center sm:text-right">
              Optional upgrades from ₦{plan.price_naira.toLocaleString()} &bull;{" "}
              <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300 font-bold underline">
                View full plans breakdown &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
