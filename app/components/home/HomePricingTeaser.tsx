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
        {/* 100% FREE & OPEN ACADEMIC PLATFORM (IMPROVED BENTO CARDS) */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-cyan-300 border border-blue-400/30 mb-3">
            100% FREE FOR EVERY STUDENT &bull; NO SUBSCRIPTION REQUIRED
          </span>
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Complete Academic Superpowers. Open to Every Candidate.
          </h3>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            BrainLab Academy believes every Nigerian student deserves world-class exam preparation without paywalls. All self-study practice drills, full mock exams, past questions, and 3D science labs are completely free at ₦0.
          </p>
        </div>

        {/* Improved Bento Cards Grid (6 Platform Superpowers) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {/* Card 1: CBT Mock Simulator */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-blue-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 border border-blue-400/30 text-cyan-400">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
                  </svg>
                </span>
                <span className="rounded-full bg-blue-900/60 border border-blue-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-cyan-300">
                  100% Exam Parity
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                Authentic 8-Key CBT Simulator
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Full-length 4-subject 400-mark timed mock exams matching official JAMB speed, calculator, and keyboard controls.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Official 120-minute timer countdown</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Instant score breakdown &amp; school cut-offs</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/cbt"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-all"
              >
                <span>Launch Free CBT Exam</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 2: 20,000+ Past Questions */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-indigo-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-400">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10M6 10h10" />
                  </svg>
                </span>
                <span className="rounded-full bg-indigo-900/60 border border-indigo-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-300">
                  Verified Question Pool
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                Curriculum Question Bank
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Verified WAEC, JAMB, and NECO question bank organized strictly by syllabus topic with master step-by-step proofs.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>All core Science, Art &amp; Commercial subjects</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Examiner trap warnings &amp; formula sheets</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/learn"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 group-hover:translate-x-1 transition-all"
              >
                <span>Explore Syllabus Bank</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 3: Socratic AI Study Tutor */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-purple-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-400/30 text-purple-400">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
                  </svg>
                </span>
                <span className="rounded-full bg-purple-900/60 border border-purple-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-purple-300">
                  Socratic AI Tutor
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                AI Diagnostic &amp; Study Guide
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Get intelligent Socratic clues and conceptual formula proofs without having the final answers spoiled prematurely.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>3-stage progressive hint guidance</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Pinpoints weak syllabus subtopics automatically</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/learning-dna"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 group-hover:translate-x-1 transition-all"
              >
                <span>Check Your Learning DNA</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 4: STEM Studio 3D Laboratories */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-cyan-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 2v7.31L4.2 18.24A2 2 0 0 0 5.86 21h12.28a2 2 0 0 0 1.66-2.76L14 9.31V2" />
                    <path d="M8.5 2h7M7 16h10" />
                  </svg>
                </span>
                <span className="rounded-full bg-cyan-900/60 border border-cyan-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-cyan-300">
                  Interactive 3D
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                Virtual STEM Studio
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Interact directly with 3D molecular structures (DNA, Hemoglobin, Lysozyme), physics mechanics, and chemistry experiments.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>High-speed Mol* WebGL graphics engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Labelled 2D fallback for low-spec devices</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/products/stem-studio"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-all"
              >
                <span>Launch STEM Studio</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 5: Low-Data Offline PWA */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-emerald-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                  </svg>
                </span>
                <span className="rounded-full bg-emerald-900/60 border border-emerald-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                  Zero Data Interruption
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                Offline PWA &amp; Low-Data Sync
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Installs on any phone or laptop. Complete practice sets cache locally in IndexedDB (&lt; 1.2 MB total footprint) for zero data usage.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Works seamlessly on slow 2G &amp; 3G mobile data</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Automatic background sync when reconnected</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/for-students"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 group-hover:translate-x-1 transition-all"
              >
                <span>Install Offline App</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Card 6: National Challenge Arena */}
          <div className="group flex flex-col justify-between rounded-3xl p-6 sm:p-7 border border-amber-500/25 bg-slate-900/85 shadow-xl backdrop-blur-md hover:border-amber-500/40 hover:-translate-y-1 transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-400">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </span>
                <span className="rounded-full bg-amber-900/60 border border-amber-700/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                  Live 1v1 Duels
                </span>
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">
                National Challenge Arena
              </h4>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Compete against thousands of candidates nationwide in live synchronous 1v1 academic sprint battles and climb school ranks.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/10 pt-4">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Daily quests, study streaks, and badges</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Live leaderboard across all 36 states</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-white/10">
              <Link
                href="/challenge-arena"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 group-hover:translate-x-1 transition-all"
              >
                <span>Enter National Arena</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Call to Action Ribbon */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-slate-900/70 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-sm font-extrabold text-white">
              Ready to start your exam preparation?
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Zero payment card required &bull; Free instant practice &bull; Optional upgrades from ₦{plan.price_naira.toLocaleString()} &bull;{" "}
              <Link href="/pricing" className="text-cyan-400 hover:text-cyan-300 font-bold underline">
                View full plans breakdown &rarr;
              </Link>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/cbt"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-3 text-xs sm:text-sm font-black text-white shadow-lg shadow-blue-600/30 transition active:scale-95"
            >
              <span>Start Free CBT Practice</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>

            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-950/40 hover:bg-blue-900/50 px-5 py-3 text-xs sm:text-sm font-bold text-blue-300 transition active:scale-95"
            >
              <span>View Pricing Plans</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
