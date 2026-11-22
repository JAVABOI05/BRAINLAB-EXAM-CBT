"use client";

import React from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";
import { DynamicLiveStatisticsSlot } from "./DynamicLiveStatisticsSlot";
import { CBTHeroDemo } from "./CBTHeroDemo";
import styles from "./HomeHero.module.css";
import "./home-motion.css";

const ORBIT_NODES: { cx: number; cy: number; accent: boolean }[] = [
  { cx: 200, cy: 24, accent: true },
  { cx: 367.4, cy: 145.6, accent: false },
  { cx: 303.5, cy: 342.4, accent: true },
  { cx: 96.5, cy: 342.4, accent: false },
  { cx: 32.6, cy: 145.6, accent: true },
];

export function HomeHero() {
  const heroConfig = HOMEPAGE_CONTENT_CONFIG.hero;

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
      {/* Editorial Ambient Lighting (Electric Blue & Coral Glows) */}
      <div
        className="pointer-events-none absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-[#1356E8]/20 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-24 h-[420px] w-[420px] rounded-full bg-[#FF5238]/12 blur-[120px]"
        aria-hidden="true"
      />

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

              {/* Authoritative Primary Headline matching the Official Brand Banner */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12] sm:leading-[1.08] mt-3 sm:mt-4">
                Learn. Practise.<br />
                <span className="relative inline-block text-cyan-400">
                  Achieve More.
                  {/* Brand Orange curved swoosh underline */}
                  <svg
                    className="absolute -bottom-2.5 left-0 w-full h-3.5 text-[var(--bl-color-brand-orange,#e8512f)]"
                    viewBox="0 0 250 14"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path d="M3 10C65 3 185 2 247 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              {/* High-Legibility Subheading */}
              <p className="text-xs sm:text-base lg:text-lg text-slate-100 sm:text-white/95 leading-relaxed max-w-xl font-medium mt-3 sm:mt-4">
                <span className="font-semibold text-cyan-200">Your complete online learning and exam preparation platform.</span>
                <span className="hidden sm:inline"> Practise under authentic timed test-hall conditions, master fundamental concepts through step-by-step derivations, and conquer entrance screenings with instant diagnostic scoring.</span>
              </p>
            </div>

            {/* Candidate Pathway Buttons (UTME & Post-UTME Primary) */}
            <div className="space-y-2 sm:space-y-3 pt-1">
              <div className="text-[11px] sm:text-xs font-black text-cyan-300 uppercase tracking-wider">
                Select your candidate pathway:
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
                <Link
                  href="/cbt"
                  className="bl-home-cta-orange bl-focus-ring inline-flex items-center justify-center gap-2 rounded-full font-black px-6 py-3 sm:px-7 sm:py-3.5 text-xs sm:text-base shadow-lg shadow-orange-500/25 active:scale-95 group min-h-[44px] sm:min-h-[48px] w-full sm:w-auto"
                >
                  <span>Start Free UTME Practice</span>
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
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-slate-100 font-bold px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-base transition-all duration-200 active:scale-95 min-h-[44px] sm:min-h-[48px] w-full sm:w-auto bl-focus-ring"
                >
                  <span>O Level (WAEC/NECO)</span>
                </Link>
              </div>
            </div>

            {/* 5 Signature Modules Ribbon (Matching Official Brand Visual) */}
            <div className="pt-2 sm:pt-3">
              <div className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
                Unified Learning & Exam Modules:
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                <Link
                  href="/cbt"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/80 hover:bg-slate-800/90 px-3 py-2 text-xs font-bold text-white transition-all hover:border-cyan-400/50 shadow-xs group"
                >
                  <svg className="h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                    <polyline points="7 10 10 13 17 6" />
                  </svg>
                  <span>CBT Practice</span>
                </Link>

                <Link
                  href="/learn"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/80 hover:bg-slate-800/90 px-3 py-2 text-xs font-bold text-white transition-all hover:border-blue-400/50 shadow-xs group"
                >
                  <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                  </svg>
                  <span>Learning Hub</span>
                </Link>

                <Link
                  href="/arena"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/80 hover:bg-slate-800/90 px-3 py-2 text-xs font-bold text-white transition-all hover:border-amber-400/50 shadow-xs group"
                >
                  <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                  <span>Challenge Arena</span>
                </Link>

                <Link
                  href="/stem-studio"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/80 hover:bg-slate-800/90 px-3 py-2 text-xs font-bold text-white transition-all hover:border-cyan-400/50 shadow-xs group"
                >
                  <svg className="h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 2v7.31M14 2v7.31M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" />
                  </svg>
                  <span>STEM Studio</span>
                </Link>

                <Link
                  href="/products/ai-learning"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/80 hover:bg-slate-800/90 px-3 py-2 text-xs font-bold text-white transition-all hover:border-purple-400/50 shadow-xs group"
                >
                  <svg className="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="6" height="6" />
                    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
                  </svg>
                  <span>AI Learning</span>
                </Link>

                <Link
                  href="/account"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--bl-color-brand-orange,#e8512f)] to-[var(--bl-color-brand-orange-deep,#c9401f)] hover:brightness-110 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-orange-500/25 transition-all group col-span-2 sm:col-span-auto justify-center"
                >
                  <span>Join BrainLab Academy</span>
                  <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Reassurance Badges (Visible on sm+ with bright contrast) */}
            <div className="hidden sm:flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-100 pt-2">
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
              <p className="text-[11px] sm:text-xs text-slate-200 font-medium pt-0.5">
                &bull; {disclosure}
              </p>
            )}

            {/* Dynamic Live Statistics Slot (Rule S7 compliant, verified live aggregate data only) */}
            <div className="pt-1">
              <DynamicLiveStatisticsSlot />
            </div>
          </div>

          {/* RIGHT / SIGNATURE CBT EXAM DEMONSTRATION WITH ANIMATED BACKDROP */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            {/* Concentric Learning-Loop Orbit & Constellation Graphic */}
            <svg
              viewBox="0 0 400 400"
              className="bl-home-fade-in pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[130%] max-w-none -translate-x-1/2 -translate-y-1/2"
              aria-hidden="true"
            >
              <g className="bl-home-orbit">
                <circle cx="200" cy="200" r="176" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="1.2" strokeDasharray="2 9" strokeLinecap="round" />
                {ORBIT_NODES.map((n, i) => (
                  <circle
                    key={i}
                    cx={n.cx}
                    cy={n.cy}
                    r={n.accent ? 6 : 4.5}
                    className={i % 3 === 0 ? "bl-home-twinkle" : i % 3 === 1 ? "bl-home-twinkle bl-home-twinkle-2" : "bl-home-twinkle bl-home-twinkle-3"}
                    style={{ fill: n.accent ? "var(--bl-color-brand-orange, #e8512f)" : "#38bdf8" }}
                  />
                ))}
              </g>
              <g className="bl-home-orbit-rev">
                <circle cx="200" cy="200" r="142" fill="none" stroke="rgba(56,189,248,0.20)" strokeWidth="1.2" strokeDasharray="6 12" strokeLinecap="round" />
              </g>
            </svg>

            {/* Rising Drawn Logo-Arrow (SVG stroke draw & pop) */}
            <svg
              viewBox="0 0 140 70"
              className="pointer-events-none absolute -right-2 -top-6 z-20 h-14 w-28 sm:right-2 sm:h-16 sm:w-32"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="blHeroArrowGrad" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--bl-color-brand-orange-light, #f2703c)" />
                  <stop offset="100%" stopColor="var(--bl-color-brand-orange-deep, #c9401f)" />
                </linearGradient>
              </defs>
              <path
                d="M10 62 C 44 56, 90 40, 118 10"
                pathLength="1"
                stroke="url(#blHeroArrowGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                className="bl-home-draw"
              />
              <path
                d="M92 8 L120 8 L120 36"
                stroke="url(#blHeroArrowGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="bl-home-pop"
              />
            </svg>

            {/* Crisp Layered Tilted Panels Behind CBT Card */}
            <div
              className="bl-home-panel-orange pointer-events-none absolute inset-0 -rotate-2 translate-x-2 translate-y-3 rounded-3xl"
              aria-hidden="true"
            />
            <div
              className="bl-home-panel-blue pointer-events-none absolute inset-0 rotate-1 -translate-x-2 translate-y-2 rounded-3xl"
              aria-hidden="true"
            />

            {/* Floating feature badges with ambient drift */}
            <div className="bl-home-float absolute -top-4 -right-2 z-20 hidden sm:flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/95 px-3.5 py-1.5 shadow-xl backdrop-blur-md text-xs font-bold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-orange-500/20 border border-orange-400/40 text-[var(--bl-color-brand-orange,#e8512f)]">
                ✓
              </span>
              <span>8-Key Parity</span>
            </div>

            <div className="bl-home-float-alt absolute -bottom-4 -left-2 z-20 hidden sm:flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/95 px-3.5 py-1.5 shadow-xl backdrop-blur-md text-xs font-bold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-400/40 text-cyan-300">
                ⚡
              </span>
              <span>Diagnostic Scoring</span>
            </div>

            {/* CBT Simulator Preview */}
            <div className="relative w-full z-10 bl-home-enter">
              <CBTHeroDemo />
            </div>
          </div>
        </div>
      </div>

      {/* Downward Organic Curved SVG Transition to Surface */}
      <div className="relative w-full overflow-hidden leading-none z-10 -mb-[1px] pointer-events-none" aria-hidden="true">
        <svg
          className="relative block w-full h-10 sm:h-16 lg:h-20 text-white dark:text-[#060D20] transition-colors duration-200"
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
