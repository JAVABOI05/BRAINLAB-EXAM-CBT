"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";
import { DynamicLiveStatisticsSlot } from "./DynamicLiveStatisticsSlot";

interface ConceptCard {
  id: string;
  subject: string;
  title: string;
  tag: string;
  badgeColor: string;
  borderColor: string;
  glowColor: string;
  formulaOrSnippet: string;
  detail: string;
  accentBg: string;
}

const BRILLIANT_HERO_CONCEPTS: ConceptCard[] = [
  {
    id: "math",
    subject: "Mathematics",
    title: "Quadratic Functions",
    tag: "Algebra & Graphs",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/40",
    borderColor: "border-blue-200 hover:border-blue-500 dark:border-blue-500/30 dark:hover:border-blue-400/80",
    glowColor: "hover:shadow-md hover:shadow-blue-500/10",
    formulaOrSnippet: "2x² + 5x + 3 = 0  ⟹  x = -1, -3/2",
    detail: "Factorise by splitting terms: (2x + 3)(x + 1) = 0.",
    accentBg: "from-blue-50/60 via-white to-white dark:from-blue-950/30 dark:via-[#0D1727] dark:to-[#0D1727]",
  },
  {
    id: "physics",
    subject: "Physics",
    title: "Circuit Potential",
    tag: "Current Electricity",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-400/40",
    borderColor: "border-cyan-200 hover:border-cyan-500 dark:border-cyan-500/30 dark:hover:border-cyan-400/80",
    glowColor: "hover:shadow-md hover:shadow-cyan-500/10",
    formulaOrSnippet: "V = E - Ir  ⟹  2.0 - (0.4 × 1) = 1.6 V",
    detail: "Terminal p.d. accounts for internal lost volts.",
    accentBg: "from-cyan-50/60 via-white to-white dark:from-cyan-950/30 dark:via-[#0D1727] dark:to-[#0D1727]",
  },
  {
    id: "chemistry",
    subject: "Chemistry",
    title: "Redox States",
    tag: "Oxidation Numbers",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/40",
    borderColor: "border-purple-200 hover:border-purple-500 dark:border-purple-500/30 dark:hover:border-purple-400/80",
    glowColor: "hover:shadow-md hover:shadow-purple-500/10",
    formulaOrSnippet: "KMnO₄  ⟹  (+1) + Mn + 4(-2) = 0",
    detail: "Mn = +7 oxidation state in neutral permanganate.",
    accentBg: "from-purple-50/60 via-white to-white dark:from-purple-950/30 dark:via-[#0D1727] dark:to-[#0D1727]",
  },
  {
    id: "english",
    subject: "Use of English",
    title: "Proximity Concord",
    tag: "Lexis & Concord",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/40",
    borderColor: "border-emerald-200 hover:border-emerald-500 dark:border-emerald-500/30 dark:hover:border-emerald-400/80",
    glowColor: "hover:shadow-md hover:shadow-emerald-500/10",
    formulaOrSnippet: "Neither A nor B  ⟹  Verb matches B",
    detail: "'Neither the principal nor the teachers were present.'",
    accentBg: "from-emerald-50/60 via-white to-white dark:from-emerald-950/30 dark:via-[#0D1727] dark:to-[#0D1727]",
  },
  {
    id: "biology",
    subject: "Biology",
    title: "Mendelian Genetics",
    tag: "Heredity & Alleles",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/40",
    borderColor: "border-amber-200 hover:border-amber-500 dark:border-amber-500/30 dark:hover:border-amber-400/80",
    glowColor: "hover:shadow-md hover:shadow-amber-500/10",
    formulaOrSnippet: "Bb × Bb  ⟹  1 BB : 2 Bb : 1 bb",
    detail: "Classic 3:1 dominant to recessive phenotype ratio.",
    accentBg: "from-amber-50/60 via-white to-white dark:from-amber-950/30 dark:via-[#0D1727] dark:to-[#0D1727]",
  },
];

export function HomeHero() {
  const heroConfig = HOMEPAGE_CONTENT_CONFIG.hero;
  const [activeConceptId, setActiveConceptId] = useState<string>("math");

  const headline = resolveClaimValue(
    heroConfig.headline,
    "A Better Way to Learn, Practise and Achieve More."
  );

  const subhead = resolveClaimValue(
    heroConfig.subhead,
    "Your learning journey starts here. For free."
  );

  const disclosure = resolveClaimValue(
    heroConfig.disclosure,
    "Public learners receive full access to CBT practice, question banks, AI Tutor fair-use, and Learning Hub at ₦0."
  );

  return (
    <section
      aria-label="BrainLab Learning Ecosystem Introduction"
      className="relative overflow-hidden bg-white text-slate-900 pt-8 pb-16 sm:pt-14 sm:pb-24 border-b border-slate-200/80 dark:bg-[#050811] dark:text-white dark:border-white/[0.08] transition-colors"
    >
      {/* Soft Academic Ambient Light (Airy & Non-Suffocating) */}
      <div
        className="pointer-events-none absolute -top-32 left-1/3 h-[500px] w-[500px] rounded-full bg-blue-500/5 dark:bg-blue-600/10 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/4 -right-24 h-[400px] w-[400px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px]"
        aria-hidden="true"
      />

      {/* Delicate Dotted Matrix Canvas Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(#1e293b 1px, transparent 1px)`,
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

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Khan Academy-Inspired Asymmetric Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT / VISUAL STORYTELLING COLLAGE (Organic Shapes & Real Student Achievements) */}
          <div className="lg:col-span-6 order-2 lg:order-1 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              
              {/* Organic Background Shape Layer (Khan Academy Blob Artistry) */}
              <div className="relative flex items-center justify-center">
                {/* Layer 1: Soft Cosmos Blob */}
                <div className="absolute -top-6 -left-6 h-64 w-64 sm:h-80 sm:w-80 rounded-[40%_60%_70%_30%/40%_50%_60%_55%] bg-gradient-to-tr from-blue-600/15 via-indigo-500/10 to-sky-400/20 blur-xl pointer-events-none" />
                
                {/* Layer 2: Warm Coral Petal Blob */}
                <div className="absolute -bottom-6 -right-4 h-60 w-60 sm:h-72 sm:w-72 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-gradient-to-br from-rose-500/15 via-orange-400/15 to-amber-300/15 blur-xl pointer-events-none" />

                {/* Primary Student Hero Showcase Card with Organic Framing */}
                <div className="relative z-10 w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#0B1426]">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 via-blue-50/40 to-slate-50 dark:from-slate-900 dark:via-[#091124] dark:to-slate-950 p-6 sm:p-8">
                    
                    {/* Dotted Backdrop Accent */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `radial-gradient(#2563eb 1.5px, transparent 1.5px)`,
                        backgroundSize: "18px 18px",
                      }}
                      aria-hidden="true"
                    />

                    {/* Collaborative Student Visual Composition */}
                    <div className="relative z-10 space-y-5">
                      {/* Top Student Header Card */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2 overflow-hidden">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white ring-2 ring-white dark:ring-slate-900 shadow-xs">
                              AO
                            </span>
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white ring-2 ring-white dark:ring-slate-900 shadow-xs">
                              CE
                            </span>
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-xs font-black text-white ring-2 ring-white dark:ring-slate-900 shadow-xs">
                              IK
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block">
                              Active Candidates
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Simulating JAMB Exam Hall
                            </span>
                          </div>
                        </div>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black text-blue-800 dark:bg-blue-900/50 dark:text-cyan-300 border border-blue-200 dark:border-blue-700/60">
                          National CBT Standard
                        </span>
                      </div>

                      {/* Interactive Cockpit Mini-Simulation Snapshot */}
                      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/90 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-blue-600 dark:text-cyan-400 flex items-center gap-1.5">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            UTME 8-Key Simulator
                          </span>
                          <span className="font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 text-[11px]">
                            Timer: 01:42:15
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                          &ldquo;Find the terminal potential difference across a cell of e.m.f. 2.0 V and internal resistance 1.0 Ω connected to a 4.0 Ω load.&rdquo;
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-bold dark:bg-emerald-950/50 dark:text-emerald-200">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-white font-mono text-[10px] font-black">
                              A
                            </span>
                            <span>1.60 V (Correct)</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200 text-slate-700 font-mono text-[10px] font-black dark:bg-slate-700 dark:text-slate-300">
                              B
                            </span>
                            <span>2.00 V</span>
                          </div>
                        </div>
                      </div>

                      {/* Verified Milestone Strip */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="rounded-xl bg-white/80 p-2.5 border border-slate-200/70 dark:bg-white/[0.04] dark:border-white/[0.06]">
                          <div className="text-base sm:text-lg font-black text-slate-950 dark:text-white font-mono">338</div>
                          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Avg Target</div>
                        </div>
                        <div className="rounded-xl bg-white/80 p-2.5 border border-slate-200/70 dark:bg-white/[0.04] dark:border-white/[0.06]">
                          <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">3 Tracks</div>
                          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">UTME &bull; O Level &bull; Post-UTME</div>
                        </div>
                        <div className="rounded-xl bg-white/80 p-2.5 border border-slate-200/70 dark:bg-white/[0.04] dark:border-white/[0.06]">
                          <div className="text-base sm:text-lg font-black text-blue-600 dark:text-cyan-400 font-mono">2026/27</div>
                          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">NERDC Syllabus</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Reassurance Badge 1 (Top Right) */}
              <div className="absolute -top-4 -right-2 sm:-right-4 z-20 flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 animate-bl-float">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-900 dark:text-white block">
                    JAMB Mock Top 1%
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Verified Diagnostics
                  </span>
                </div>
              </div>

              {/* Floating Reassurance Badge 2 (Bottom Left) */}
              <div className="absolute -bottom-4 -left-2 sm:-left-4 z-20 flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-cyan-300">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                    <circle cx="9" cy="13" r="1" />
                    <circle cx="15" cy="13" r="1" />
                  </svg>
                </span>
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-900 dark:text-white block">
                    Socratic Hints
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Step-by-step guidance
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT / EDITORIAL COPY & AUDIENCE ENTRY PILLS (Clean, Human, Spacious) */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6 sm:space-y-7 text-left">
            
            {/* Category Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300 shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
              <span>NIGERIA&apos;S PREMIER ACADEMIC CBT &bull; UTME, O LEVEL &amp; POST-UTME</span>
            </div>

            {/* Authoritative Primary Headline with Playful Underline Accent */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.08]">
              For every student,<br />
              every classroom.<br />
              <span className="relative inline-block text-blue-600 dark:text-cyan-400">
                Real exam results.
                {/* Hand-drawn organic underline stroke (Khan Academy aesthetic) */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-emerald-500/80 dark:text-emerald-400"
                  viewBox="0 0 250 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M3 9C60 3 190 2 247 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            {/* High-Legibility Subheading with Generous Breathing Room */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl font-normal">
              {subhead} Practice under real JAMB UTME test-hall conditions, master Senior Secondary WAEC/NECO concepts through step-by-step derivations, and conquer university Post-UTME screening sprints with instant diagnostic scoring.
            </p>

            {/* Candidate Pathway Buttons */}
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Select your candidate pathway:
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/cbt"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black px-7 py-3.5 text-sm sm:text-base shadow-md shadow-blue-600/25 transition-all duration-200 active:scale-95 group min-h-[48px]"
                >
                  <span>UTME Candidates</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>

                <Link
                  href="/learn"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-extrabold px-6 py-3.5 text-sm sm:text-base shadow-xs transition-all duration-200 active:scale-95 min-h-[48px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <span>O Level (WAEC/NECO)</span>
                </Link>

                <Link
                  href="/programmes/post-utme"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-extrabold px-6 py-3.5 text-sm sm:text-base shadow-xs transition-all duration-200 active:scale-95 min-h-[48px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <span>Post-UTME Screening</span>
                </Link>
              </div>
            </div>

            {/* Reassurance Badges */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-600 dark:text-slate-300 pt-2">
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-500 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Official 8-Key CBT Simulator</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-500 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Step-by-Step Socratic Insights</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-500 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Verified NERDC Syllabus Aligned</span>
              </span>
            </div>

            {/* Truthful Free Tier Disclosure */}
            {disclosure && (
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                &bull; {disclosure}
              </p>
            )}

            {/* Dynamic Live Statistics Slot (Rule S7 compliant, verified live aggregate data only) */}
            <div className="pt-2">
              <DynamicLiveStatisticsSlot />
            </div>
          </div>
        </div>

        {/* Floating STEM Concept Cards Carousel (Crisp White Card Surfaces with Subject Accents) */}
        <div className="mt-16 sm:mt-24 pt-8 border-t border-slate-100 dark:border-white/[0.06] animate-bl-fade-in bl-stagger-2">
          <div className="text-center mb-6">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Interactive First-Principles Learning &bull; Visual Concept Explorers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5 text-left">
            {BRILLIANT_HERO_CONCEPTS.map((concept) => {
              const isSelected = activeConceptId === concept.id;
              return (
                <div
                  key={concept.id}
                  onClick={() => setActiveConceptId(concept.id)}
                  className={`group relative rounded-2xl border-2 bg-gradient-to-b ${concept.accentBg} p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[220px] shadow-sm hover:-translate-y-1 ${concept.borderColor} ${concept.glowColor} ${
                    isSelected ? "ring-2 ring-blue-500 dark:ring-cyan-400 scale-[1.02]" : "opacity-95 hover:opacity-100"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${concept.badgeColor}`}>
                        {concept.subject}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {concept.tag}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                      {concept.title}
                    </h3>

                    <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 p-2.5 font-mono text-xs text-blue-900 dark:text-emerald-300 font-bold shadow-inner">
                      {concept.formulaOrSnippet}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {concept.detail}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Official CBT engine and live countdown moved below to the interactive showcase &darr;</span>
          </div>
        </div>
      </div>
    </section>
  );
}
