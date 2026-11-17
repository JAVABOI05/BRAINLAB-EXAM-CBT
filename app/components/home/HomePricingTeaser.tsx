"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSubscriptionPlans, DEFAULT_PLANS, type SubscriptionPlan } from "@/app/lib/platformConfig";
import { useCohortConfig } from "@/app/lib/useCohortConfig";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";
import { Reveal } from "./Reveal";
import "./home-motion.css";

const ICONS: Record<string, string> = {
  keyboard:
    "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10",
  book: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5ZM6 6h10M6 10h10",
  school: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM9 22V12h6v10",
  bulb: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z",
  cube: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7 12 12l8.7-5M12 22V12",
  offline:
    "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  check: "M20 6 9 17l-5-5",
};

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const FEATURES = [
  { icon: "keyboard", title: "UTME 4-Subject Simulator", desc: "Timed four-subject practice mocks in the JAMB CBT style, with 8-key controls." },
  { icon: "book", title: "O Level Curriculum Bank", desc: "Past-question practice across WAEC, NECO and GCE, with step-by-step working." },
  { icon: "school", title: "Post-UTME Screening Drills", desc: "Timed screening-style papers and an example aggregate calculator." },
  { icon: "bulb", title: "Socratic AI Study Assistant", desc: "Guiding hints that explain difficult ideas without giving the answer away." },
  { icon: "cube", title: "Virtual STEM Studio", desc: "Interactive 3D molecules, circuits and physics simulations." },
  { icon: "offline", title: "Offline-Safe Practice", desc: "Install on Android, iOS or PC. Answers are saved and sync when you reconnect." },
];

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

  // Free-access statement comes from the verified claims register, not hardcoded here.
  const freeAccess = resolveClaimValue(HOMEPAGE_CONTENT_CONFIG.hero.disclosure, "");

  return (
    <section
      id="pricing"
      aria-label="BrainLab Open Academic Platform and Plans"
      className="relative scroll-mt-20 overflow-hidden border-b border-white/10 bg-[#060D20] py-16 text-white sm:scroll-mt-24 sm:py-24"
    >
      <div className="bl-home-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <span className="bl-home-eyebrow bl-home-eyebrow-dark">07 &middot; Plans</span>
          <h2 className="mt-4 text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
            Complete academic tools for <span className="bl-home-mark">every candidate</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            Curriculum practice, timed CBT mock exams and diagnostics for UTME, O Level and Post-UTME candidates, in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Left: suite card */}
          <div className="lg:col-span-5">
            <div className="relative flex h-full flex-col justify-between gap-8 overflow-hidden rounded-3xl border border-white/10 bg-[#0B1426] p-6 shadow-[0_32px_64px_-32px_rgba(0,0,0,0.9)] sm:p-9">
              <span className="bl-home-gradient-orange absolute inset-x-0 top-0 h-1" aria-hidden="true" />

              <div className="space-y-5">
                <span className="bl-home-tint-orange inline-flex rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider">
                  Open candidate platform
                </span>
                <h3 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                  Candidate Standard Suite
                </h3>
                <p className="text-base leading-relaxed text-slate-300">
                  Standard access across UTME, O Level and Post-UTME study and simulation tools. Included for all candidates.
                </p>

                {freeAccess && (
                  <p className="rounded-xl border border-white/10 border-l-4 border-l-[var(--bl-color-brand-orange)] bg-white/5 p-4 text-sm leading-relaxed text-slate-200">
                    {freeAccess}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <Link
                  href="/cbt"
                  className="bl-home-cta-orange bl-focus-ring group inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full px-8 py-3.5 text-base font-black shadow-lg shadow-black/30 active:scale-95"
                >
                  <span>Launch Candidate Simulator</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>

                <div
                  className="text-center text-sm text-slate-300"
                  data-plan-rate={plan.price_naira.toLocaleString()}
                >
                  Optional {cohortConfig.active_cohort_name} upgrades from ₦{plan.price_naira.toLocaleString()} &bull;{" "}
                  <Link href="/pricing" className="bl-focus-ring font-bold text-white underline underline-offset-4 hover:text-[var(--bl-color-brand-orange-light)]">
                    View full plans &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right: feature grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <div className="bl-home-lift flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-[#0B1426] p-5 hover:border-white/25">
                  <span className="bl-home-gradient-orange flex h-11 w-11 items-center justify-center rounded-xl">
                    <Icon name={f.icon} />
                  </span>
                  <div>
                    <h4 className="text-base font-extrabold text-white">{f.title}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
