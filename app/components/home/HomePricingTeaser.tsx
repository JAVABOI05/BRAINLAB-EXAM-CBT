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

  return (
    <section
      id="pricing"
      aria-label="Transparent Subscription Pricing"
      className="py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-[#070e1e]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[var(--bl-color-brand-primary)] border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-3">
            TRANSPARENT PLANS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--bl-color-text-primary)] tracking-tight">
            Predictable Preparation Pricing with No Hidden Fees
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Begin with daily free practice or unlock unlimited timed mocks, full worked step-by-step corrections, and live classroom masterclasses.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto items-stretch">
          {plans.slice(0, 3).map((plan) => {
            const isFree = plan.price_kobo === 0 || plan.id === "free";
            const isPopular = plan.id === "premium" || plan.id === "pro";

            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-3xl p-6 sm:p-8 transition-all duration-200 ${
                  isPopular
                    ? "border-2 border-[var(--bl-color-brand-primary)] bg-[var(--bl-color-surface)] shadow-xl relative"
                    : "border border-slate-200/90 bg-[var(--bl-color-surface)] shadow-sm dark:border-slate-800"
                }`}
              >
                <div>
                  {isPopular && (
                    <div className="mb-4">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-[var(--bl-color-brand-primary)] dark:bg-blue-950 dark:text-blue-300">
                        Most Popular for Candidates
                      </span>
                    </div>
                  )}

                  <h3 className="text-xl font-extrabold text-[var(--bl-color-text-primary)] tracking-tight">
                    {plan.name}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {plan.description}
                  </p>

                  {/* Dynamic Price Display */}
                  <div className="my-6">
                    {isFree ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-[var(--bl-color-text-primary)]">
                          Free
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          / forever
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-[var(--bl-color-text-primary)]">
                          ₦{plan.price_naira.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          / {plan.interval}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 pt-5 dark:border-slate-800/80">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <svg
                          className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <Link
                    href={isFree ? "/cbt" : `/pricing?plan=${plan.id}`}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition bl-focus-ring min-h-[44px] ${
                      isPopular
                        ? "bg-[var(--bl-color-brand-primary)] hover:bg-[var(--bl-color-brand-primary-hover)] text-white shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <span>{isFree ? "Start Free Practice" : `Choose ${plan.name}`}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* View Full Plans Anchor */}
        <div className="mt-12 text-center">
          <Link
            href="/pricing"
            className="text-sm font-bold text-[var(--bl-color-brand-primary)] hover:underline inline-flex items-center gap-1.5"
          >
            <span>Compare all plan entitlements &amp; school bulk licensing</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
