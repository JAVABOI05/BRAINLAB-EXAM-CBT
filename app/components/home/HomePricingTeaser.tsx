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
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 mb-3">
            100% FREE FOR EVERY STUDENT &bull; NO SUBSCRIPTION REQUIRED
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Complete Academic Superpowers. Open to Every Candidate.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            BrainLab is an educational platform, not a paywalled service. All registered Nigerian candidates get unlimited CBT mock exams, syllabus-aligned past questions, AI study assistance, and 3D science labs completely free.
          </p>
        </div>

        {/* Free Public Access Showcase Bento Card */}
        <div className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-10 border border-emerald-500/30 bg-gradient-to-br from-[#0c1829] via-[#081220] to-[#050b14] shadow-2xl relative backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 mb-2">
                OPEN TO EVERY LEARNER
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Public Access Plan
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Zero fees &bull; No credit card &bull; Permanent access to all core study tools
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-4xl font-black text-emerald-400">₦0</span>
              <span className="text-xs text-slate-400 block font-medium">/ free forever</span>
            </div>
          </div>

          {/* 6 Core Feature Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-200">
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="text-emerald-400 font-bold text-base mt-0.5">✓</span>
              <div>
                <strong className="text-white block font-bold">Full CBT Practice Simulator</strong>
                <span className="text-slate-400 text-xs">Authentic 4-subject 400-mark timed mock exams matching JAMB 8-key hall parity.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="text-emerald-400 font-bold text-base mt-0.5">✓</span>
              <div>
                <strong className="text-white block font-bold">Curriculum Question Bank</strong>
                <span className="text-slate-400 text-xs">Verified past questions across WAEC, JAMB, and NECO with step-by-step master derivations.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="text-emerald-400 font-bold text-base mt-0.5">✓</span>
              <div>
                <strong className="text-white block font-bold">Socratic AI Study Assistant</strong>
                <span className="text-slate-400 text-xs">Interactive guiding hints that explain difficult formulas without spoiling the answers.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="text-emerald-400 font-bold text-base mt-0.5">✓</span>
              <div>
                <strong className="text-white block font-bold">Virtual STEM Studio 3D</strong>
                <span className="text-slate-400 text-xs">Interactive 3D molecular structures, circuits, and physics mechanics simulations.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="text-emerald-400 font-bold text-base mt-0.5">✓</span>
              <div>
                <strong className="text-white block font-bold">National Challenge Arena</strong>
                <span className="text-slate-400 text-xs">Real-time 1v1 sprint battles, daily study streaks, XP, and state leaderboards.</span>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5">
              <span className="text-emerald-400 font-bold text-base mt-0.5">✓</span>
              <div>
                <strong className="text-white block font-bold">Offline PWA Sync (&lt; 1.2 MB)</strong>
                <span className="text-slate-400 text-xs">Installable on Android, iOS, or PC with zero-data offline practice capabilities.</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/cbt"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-8 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition active:scale-95"
            >
              <span>Get Started, It&apos;s Free</span>
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
