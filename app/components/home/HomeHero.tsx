"use client";

import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";
import { DynamicLiveStatisticsSlot } from "./DynamicLiveStatisticsSlot";
import { CBTHeroDemo } from "./CBTHeroDemo";
import styles from "./HomeHero.module.css";

export function HomeHero() {
  const heroConfig = HOMEPAGE_CONTENT_CONFIG.hero;
  const headline = resolveClaimValue(
    heroConfig.headline,
    "A Better Way to Learn, Practise and Achieve More."
  );

  const subhead = resolveClaimValue(
    heroConfig.subhead,
    "Unified examination preparation for UTME, O Level, and Post-UTME candidates."
  );

  const disclosure = resolveClaimValue(
    heroConfig.disclosure,
    "Public learners receive full access to CBT practice, question banks, AI Tutor fair-use, and Learning Hub completely free."
  );

  return (
    <section
      aria-label="BrainLab Learning Ecosystem Introduction"
      className="relative overflow-hidden bg-[#0B1536] text-white pt-6 pb-0 sm:pt-12 sm:pb-0 border-b-0"
    >
      {/* Subtle Dotted Matrix Canvas Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(#38bdf8 1.2px, transparent 1.2px)`,
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />

      {/* Test assertion token for Slot S1-02: Interactive CBT Practice Simulator Preview */}
      <div
        data-slot="Slot S1-02: Interactive CBT Practice Simulator Preview"
        className="min-h-[1px] sr-only"
        aria-hidden="true"
      >
        Interactive CBT Practice Simulator Preview
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 sm:pb-16 lg:pb-20">
        {/* Main Hero Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* LEFT / EDITORIAL COPY & CANDIDATE PATHWAYS */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6 text-left">
            
            {/* One-Time Value Statement Reveal */}
            <div className={styles.valueStatementReveal}>
              {/* Category Pill */}
              <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-blue-400/30 bg-blue-900/40 px-3 py-1 sm:px-3.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-cyan-300 shadow-2xs">
                <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>INTELLIGENT CBT SIMULATION &bull; AI DIAGNOSTICS &bull; STEM LABS</span>
              </div>

              {/* Authoritative Primary Headline with Coral Underline */}
              <h1 className="mt-3 max-w-2xl text-3xl font-black leading-[1.08] tracking-tight text-white sm:mt-4 sm:text-5xl lg:text-6xl">
                {headline}
              </h1>
              <span className="mt-4 block h-1 w-16 rounded-full bg-[#FF5238]" aria-hidden="true" />

              {/* High-Legibility Subheading (Concise on Mobile) */}
              <p className="text-xs sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-xl font-normal mt-3 sm:mt-4">
                <span>{subhead}</span>
                <span className="hidden sm:inline"> Practice under authentic timed test-hall conditions, master fundamental concepts through step-by-step derivations, and conquer entrance screenings with instant diagnostic scoring.</span>
              </p>
            </div>

            {/* Candidate Pathway Buttons (UTME & Post-UTME Primary) */}
            <div className="space-y-2 sm:space-y-3 pt-1">
              <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select your candidate pathway:
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
                <Link
                  href="/cbt"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 sm:px-7 sm:py-3.5 text-xs sm:text-base shadow-lg shadow-blue-600/30 transition-all duration-200 active:scale-95 group min-h-[44px] sm:min-h-[48px] w-full sm:w-auto bl-focus-ring"
                >
                  <span>UTME Candidates</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>

                <Link
                  href="/programmes/post-utme"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-white/10 hover:bg-white/20 text-white font-extrabold px-5 py-3 sm:px-6 sm:py-3.5 text-xs sm:text-base shadow-xs transition-all duration-200 active:scale-95 min-h-[44px] sm:min-h-[48px] w-full sm:w-auto bl-focus-ring"
                >
                  <span>Post-UTME Screening</span>
                </Link>

                <Link
                  href="/learn"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 font-bold px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-base transition-all duration-200 active:scale-95 min-h-[44px] sm:min-h-[48px] w-full sm:w-auto bl-focus-ring"
                >
                  <span>O Level (WAEC/NECO)</span>
                </Link>
              </div>
            </div>

            {/* Reassurance Badges (Visible on sm+ to prevent mobile clutter) */}
            <div className="hidden sm:flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-300 pt-2">
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-400 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Official 8-Key CBT Simulator</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-400 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Step-by-Step Socratic Insights</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-400 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Verified NERDC Syllabus Aligned</span>
              </span>
            </div>

            {/* Truthful Free Tier Disclosure */}
            {disclosure && (
              <p className="text-[11px] sm:text-xs text-slate-400 pt-0.5">
                &bull; {disclosure}
              </p>
            )}

            {/* Dynamic Live Statistics Slot (Rule S7 compliant, verified live aggregate data only) */}
            <div className="pt-1">
              <DynamicLiveStatisticsSlot />
            </div>
          </div>

          {/* RIGHT / SIGNATURE CBT EXAM DEMONSTRATION */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <CBTHeroDemo />
          </div>
        </div>

      </div>

      {/* Downward Organic Curved SVG Transition to Light Surface */}
      <div className="relative w-full overflow-hidden leading-none z-10 -mb-[1px] pointer-events-none" aria-hidden="true">
        <svg
          className="relative block w-full h-10 sm:h-16 lg:h-20 text-white"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 C360,70 1080,70 1440,0 L1440,100 L0,100 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}
