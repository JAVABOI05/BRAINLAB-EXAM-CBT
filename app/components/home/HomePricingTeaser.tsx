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

  const plan = plans.find((p) => p.id === "plus" || p.id === "apex_cohort" || p.id === "premium") || plans[0];

  return (
    <section
      id="apex-cohort"
      aria-label="BrainLab Access Categories and Apex Cohort"
      className="py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-[#070e1e]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Apex Cohort Educational Showcase Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-8 sm:p-12 text-white shadow-2xl mb-16">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 mb-4">
              🏛️ INTENSIVE GUIDED LEARNING
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Ready for a More Intensive Learning Experience?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-indigo-100 leading-relaxed font-normal">
              Join Apex Cohort for structured tutorials, dedicated tutors, guided learning and continuous academic support.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/apex"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-blue-500 transition bl-focus-ring"
              >
                <span>Discover Apex Cohort</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/cbt"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-6 py-3.5 text-base font-bold text-slate-200 transition bl-focus-ring"
              >
                <span>Continue Free CBT Practice</span>
              </Link>
            </div>
          </div>

          {/* 5 Pillars of Apex Cohort */}
          <div className="mt-10 pt-8 border-t border-indigo-800/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-xs">
              <div className="text-xl mb-1">🎯</div>
              <h4 className="text-sm font-bold text-white">Intensive Teaching</h4>
              <p className="text-xs text-indigo-200 mt-1">Live subject-by-subject scheduled masterclasses with verified tutors.</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-xs">
              <div className="text-xl mb-1">🗺️</div>
              <h4 className="text-sm font-bold text-white">Structured Roadmap</h4>
              <p className="text-xs text-indigo-200 mt-1">Assigned weekly curriculum, scheduled milestones, and timed targets.</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-xs">
              <div className="text-xl mb-1">📊</div>
              <h4 className="text-sm font-bold text-white">Performance Monitoring</h4>
              <p className="text-xs text-indigo-200 mt-1">Tutor-monitored diagnostics, targeted feedback, and custom interventions.</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-xs">
              <div className="text-xl mb-1">👥</div>
              <h4 className="text-sm font-bold text-white">Cohort Community</h4>
              <p className="text-xs text-indigo-200 mt-1">Collaborative peer study groups, group challenges, and discussion rooms.</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-xs">
              <div className="text-xl mb-1">🤝</div>
              <h4 className="text-sm font-bold text-white">Continuous Support</h4>
              <p className="text-xs text-indigo-200 mt-1">Priority academic guidance, question clearing, and comprehensive lesson archives.</p>
            </div>
          </div>
        </div>

        {/* Two Access Categories Direct Comparison */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[var(--bl-color-brand-primary)] border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-3">
            CLEAR &amp; FAIR ACCESS MODEL
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--bl-color-text-primary)] tracking-tight">
            Independent Learning for Everyone. Guided Structure When You Want It.
          </h3>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            BrainLab is an educational platform, not a paywalled service. Public learners get everything to learn independently; Apex students receive intensive instruction and accountability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* Public Category Card */}
          <div className="flex flex-col justify-between rounded-3xl p-6 sm:p-8 border border-slate-200 bg-[var(--bl-color-surface)] shadow-sm dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-4">
                OPEN TO EVERY LEARNER
              </div>
              <h4 className="text-2xl font-black text-[var(--bl-color-text-primary)]">
                Public Access
              </h4>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Self-directed study and comprehensive practice tools for every registered student.
              </p>

              <div className="my-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[var(--bl-color-text-primary)]">
                    ₦0
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    / free forever
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 pt-5 dark:border-slate-800/80">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Full CBT Practice:</strong> Unlimited mock exams with JAMB 8-key timing</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Question Bank:</strong> Complete past question library and explanations</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>AI Tutor:</strong> Generous fair-use interactive study assistance</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Learning Hub:</strong> Open curriculum exploration and topic revision</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Competition Arena:</strong> Live duels, challenges, and global leaderboards</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>STEM Studio:</strong> Public 3D interactive molecular and science viewers</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <Link
                href="/cbt"
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 px-5 py-3 text-sm font-bold transition bl-focus-ring min-h-[44px]"
              >
                <span>Get Started, It&apos;s Free</span>
                <span aria-hidden="true" className="ml-1">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Apex Cohort Card */}
          <div className="flex flex-col justify-between rounded-3xl p-6 sm:p-8 border-2 border-indigo-600 bg-[var(--bl-color-surface)] shadow-xl relative dark:border-indigo-500">
            <div className="absolute -top-3.5 right-6">
              <span className="rounded-full bg-indigo-600 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md">
                INTENSIVE TUTORIALS
              </span>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-4">
                GUIDED PROGRAMME
              </div>
              <h4 className="text-2xl font-black text-[var(--bl-color-text-primary)]">
                Apex Cohort
              </h4>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Everything in Public, plus live teaching, dedicated tutors, and continuous academic accountability.
              </p>

              <div className="my-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                    ₦{plan.price_naira.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    / per session track
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 pt-5 dark:border-slate-800/80">
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">★</span>
                  <span><strong>Live Intensive Classes:</strong> Scheduled subject-by-subject live classes</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">★</span>
                  <span><strong>Dedicated Tutors:</strong> Personal academic mentorship and direct guidance</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">★</span>
                  <span><strong>Assigned Weekly Roadmap:</strong> Structured milestones and scheduled assessments</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">★</span>
                  <span><strong>Special Cohort Mocks:</strong> Monitored practice with detailed tutor intervention</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">★</span>
                  <span><strong>Full Lesson Library:</strong> Complete recorded video archive and session notes</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-indigo-600 font-bold">★</span>
                  <span><strong>Enhanced AI Tutor:</strong> Priority quota and deep diagnostic breakdowns</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4">
              <Link
                href="/apex"
                className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 text-sm font-bold shadow-md shadow-indigo-600/25 transition bl-focus-ring min-h-[44px]"
              >
                <span>Discover Apex Cohort</span>
                <span aria-hidden="true" className="ml-1">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Link to Apex and Pricing details */}
        <div className="mt-12 text-center flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link
            href="/apex"
            className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5"
          >
            <span>Learn more about upcoming Apex Cohort programmes &amp; timetables</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <Link
            href="/pricing"
            className="text-sm font-bold text-[var(--bl-color-brand-primary)] hover:underline inline-flex items-center gap-1.5"
          >
            <span>Compare full access category breakdown</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
