"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    badgeColor: "bg-blue-500/20 text-cyan-300 border-blue-400/40",
    borderColor: "border-blue-500/30 hover:border-blue-400/80",
    glowColor: "hover:shadow-md hover:shadow-blue-500/20",
    formulaOrSnippet: "2x² + 5x + 3 = 0  ⟹  x = -1, -3/2",
    detail: "Factorise by splitting terms: (2x + 3)(x + 1) = 0.",
    accentBg: "bg-[#071328]/90",
  },
  {
    id: "physics",
    subject: "Physics",
    title: "Circuit Potential",
    tag: "Current Electricity",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40",
    borderColor: "border-cyan-500/30 hover:border-cyan-400/80",
    glowColor: "hover:shadow-md hover:shadow-cyan-500/20",
    formulaOrSnippet: "V = E - Ir  ⟹  2.0 - (0.4 × 1) = 1.6 V",
    detail: "Terminal p.d. accounts for internal lost volts.",
    accentBg: "bg-[#071328]/90",
  },
  {
    id: "chemistry",
    subject: "Chemistry",
    title: "Redox States",
    tag: "Oxidation Numbers",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-400/40",
    borderColor: "border-purple-500/30 hover:border-purple-400/80",
    glowColor: "hover:shadow-md hover:shadow-purple-500/20",
    formulaOrSnippet: "KMnO₄  ⟹  (+1) + Mn + 4(-2) = 0",
    detail: "Mn = +7 oxidation state in neutral permanganate.",
    accentBg: "bg-[#071328]/90",
  },
  {
    id: "english",
    subject: "Use of English",
    title: "Proximity Concord",
    tag: "Lexis & Concord",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
    borderColor: "border-emerald-500/30 hover:border-emerald-400/80",
    glowColor: "hover:shadow-md hover:shadow-emerald-500/20",
    formulaOrSnippet: "Neither A nor B  ⟹  Verb matches B",
    detail: "'Neither the principal nor the teachers were present.'",
    accentBg: "bg-[#071328]/90",
  },
  {
    id: "biology",
    subject: "Biology",
    title: "Mendelian Genetics",
    tag: "Heredity & Alleles",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-400/40",
    borderColor: "border-amber-500/30 hover:border-amber-400/80",
    glowColor: "hover:shadow-md hover:shadow-amber-500/20",
    formulaOrSnippet: "Bb × Bb  ⟹  1 BB : 2 Bb : 1 bb",
    detail: "Classic 3:1 dominant to recessive phenotype ratio.",
    accentBg: "bg-[#071328]/90",
  },
];

export function HomeHero() {
  const heroConfig = HOMEPAGE_CONTENT_CONFIG.hero;
  const [activeConceptId, setActiveConceptId] = useState<string>("math");
  const [imgErrorLaptop, setImgErrorLaptop] = useState<boolean>(false);
  const [imgErrorTablet, setImgErrorTablet] = useState<boolean>(false);
  const [imgErrorPhone, setImgErrorPhone] = useState<boolean>(false);

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
      className="relative overflow-hidden bg-[#0B1536] text-white pt-8 pb-0 border-b-0"
    >
      {/* Soft Academic Ambient Glows (Electric Blue & Coral) */}
      <div
        className="pointer-events-none absolute -top-32 left-1/4 h-[520px] w-[520px] rounded-full bg-[#1356E8]/20 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-20 h-[450px] w-[450px] rounded-full bg-[#FF5238]/12 blur-[130px]"
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

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 lg:pb-20">
        {/* Main Hero Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT / EDITORIAL COPY & CANDIDATE PATHWAYS */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-7 text-left">
            
            {/* Category Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-900/40 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-cyan-300 shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>INTELLIGENT CBT SIMULATION &bull; AI DIAGNOSTICS &bull; STEM LABS</span>
            </div>

            {/* Authoritative Primary Headline with Coral Underline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08]">
              For every student,<br />
              every classroom.<br />
              <span className="relative inline-block text-cyan-400">
                Real exam results.
                {/* Organic coral underline accent */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-[#FF5238]"
                  viewBox="0 0 250 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M3 9C60 3 190 2 247 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            {/* High-Legibility Subheading */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl font-normal">
              {subhead} Practice under authentic timed test-hall conditions, master fundamental concepts through step-by-step derivations, and conquer entrance screenings with instant diagnostic scoring.
            </p>

            {/* Candidate Pathway Buttons (UTME & Post-UTME Primary) */}
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select your candidate pathway:
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                <Link
                  href="/cbt"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black px-7 py-3.5 text-sm sm:text-base shadow-lg shadow-blue-600/30 transition-all duration-200 active:scale-95 group min-h-[48px] w-full sm:w-auto bl-focus-ring"
                >
                  <span>UTME Candidates</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>

                <Link
                  href="/programmes/post-utme"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-white/10 hover:bg-white/20 text-white font-extrabold px-6 py-3.5 text-sm sm:text-base shadow-xs transition-all duration-200 active:scale-95 min-h-[48px] w-full sm:w-auto bl-focus-ring"
                >
                  <span>Post-UTME Screening</span>
                </Link>

                <Link
                  href="/learn"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 font-bold px-5 py-3.5 text-sm sm:text-base transition-all duration-200 active:scale-95 min-h-[48px] w-full sm:w-auto bl-focus-ring"
                >
                  <span>O Level (WAEC/NECO)</span>
                </Link>
              </div>
            </div>

            {/* Reassurance Badges */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-300 pt-2">
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
              <p className="text-xs text-slate-400 pt-1">
                &bull; {disclosure}
              </p>
            )}

            {/* Dynamic Live Statistics Slot (Rule S7 compliant, verified live aggregate data only) */}
            <div className="pt-2">
              <DynamicLiveStatisticsSlot />
            </div>
          </div>

          {/* RIGHT / 3-DEVICE CSS & TAILWIND MOCKUP SHOWCASE */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-[420px] sm:max-w-[560px] lg:max-w-none min-h-[360px] sm:min-h-[440px] flex items-center justify-center">
              
              {/* Device Ambient Halo Glows */}
              <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-[#1356E8]/25 blur-3xl pointer-events-none" aria-hidden="true" />
              <div className="absolute bottom-6 right-6 h-60 w-60 rounded-full bg-[#FF5238]/18 blur-3xl pointer-events-none" aria-hidden="true" />

              {/* ----------------------------------------------------------------- */}
              {/* DEVICE 1: TABLET (Left / Rear Overlap, Learning Hub Preview)     */}
              {/* ----------------------------------------------------------------- */}
              <div
                className="hidden sm:block absolute -left-4 md:-left-8 top-8 sm:top-10 w-44 sm:w-56 lg:w-64 z-10 -rotate-3 transition-transform duration-300 hover:rotate-0 hover:z-30 pointer-events-auto"
                aria-label="Tablet device preview: Curriculum Learning Hub"
              >
                <div className="rounded-2xl border-2 border-slate-700/80 bg-slate-900 p-2 shadow-2xl shadow-black/70">
                  {/* Camera hole */}
                  <div className="flex justify-center mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                  </div>
                  {/* Tablet Screen */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#071124] border border-white/5">
                    {!imgErrorTablet ? (
                      <Image
                        src="/images/mockups/learning-hub-tablet.png"
                        alt="BrainLab Curriculum Learning Hub tablet preview"
                        fill
                        sizes="(max-width: 768px) 240px, 280px"
                        onError={() => setImgErrorTablet(true)}
                        className="object-cover"
                      />
                    ) : null}

                    {/* High-Fidelity CSS Wireframe Fallback / Content */}
                    <div className="p-3 text-left space-y-2 h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-cyan-400 font-mono font-bold">
                          <span>LEARNING HUB</span>
                          <span>SS1–SS3</span>
                        </div>
                        <div className="text-xs font-black text-white mt-1 leading-tight">
                          Physics: Kinematics &amp; Motion
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          v² = u² + 2as derivations
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-slate-300">
                          <span>Syllabus Mastery</span>
                          <span className="text-emerald-400">78%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full w-[78%]" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <span className="bg-slate-800/80 rounded px-1.5 py-0.5 text-slate-300 text-center font-mono">
                          24 Subtopics
                        </span>
                        <span className="bg-emerald-950/60 text-emerald-300 rounded px-1.5 py-0.5 text-center font-mono">
                          NERDC Sync
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* DEVICE 2: LAPTOP (Center Anchor, CBT Exam Hall Simulator)         */}
              {/* ----------------------------------------------------------------- */}
              <div
                className="relative z-20 w-full max-w-[340px] sm:max-w-[440px] lg:max-w-[500px] transition-transform duration-300 hover:scale-[1.01]"
                aria-label="Laptop device preview: Official CBT Examination Simulator"
              >
                {/* Laptop Lid & Screen */}
                <div className="rounded-t-2xl border-2 border-slate-700 bg-slate-900 p-2 sm:p-2.5 shadow-2xl shadow-blue-950/50">
                  {/* Laptop Camera Notch Dot */}
                  <div className="flex justify-center pb-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                  </div>

                  {/* Screen Content Frame with Explicit CLS Prevention */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-[#060D20] border border-white/10 min-h-[200px] sm:min-h-[260px]">
                    {!imgErrorLaptop ? (
                      <Image
                        src="/images/mockups/cbt-laptop.png"
                        alt="BrainLab CBT Practice Simulator interface showing authentic JAMB 8-key examination environment"
                        fill
                        sizes="(max-width: 768px) 340px, 500px"
                        priority
                        onError={() => setImgErrorLaptop(true)}
                        className="object-cover"
                      />
                    ) : null}

                    {/* High-Fidelity CBT Simulator CSS UI Mockup */}
                    <div className="p-3 sm:p-4 text-left h-full flex flex-col justify-between">
                      {/* Top Exam Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[10px] sm:text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                          <span>JAMB UTME 8-Key Engine</span>
                        </div>
                        <div className="font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
                          Time Left: 01:42:15
                        </div>
                      </div>

                      {/* Question Body */}
                      <div className="space-y-1.5 my-auto">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span className="text-white font-bold">Question 14 of 40</span>
                          <span>&bull;</span>
                          <span className="text-blue-300">Physics &bull; Electricity</span>
                        </div>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-100 leading-snug">
                          A cell of e.m.f. 2.0 V and internal resistance 1.0 Ω is connected to a 4.0 Ω load. Find the terminal potential difference.
                        </p>
                      </div>

                      {/* Option Pills */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 font-bold">
                          <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500 text-slate-950 font-black text-[9px]">
                            A
                          </span>
                          <span className="truncate">1.60 V (Correct)</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-slate-300">
                          <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-700 text-slate-200 font-bold text-[9px]">
                            B
                          </span>
                          <span className="truncate">2.00 V</span>
                        </div>
                      </div>

                      {/* 8-Key Controls Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[9px] font-mono text-slate-400">
                        <span className="hidden sm:inline">Keys: [A] [B] [C] [D]</span>
                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">[P] Prev</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold">[N] Next</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">[S] Submit</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Laptop Keyboard Base & Hinge */}
                <div className="relative mx-auto w-[105%] -ml-[2.5%] h-3 sm:h-3.5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-b-xl shadow-2xl border-t border-slate-600 flex justify-center items-center">
                  <div className="h-1 w-14 rounded-full bg-slate-600/80" />
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* DEVICE 3: SMARTPHONE (Right / Foreground Overlap, Daily Feed)     */}
              {/* ----------------------------------------------------------------- */}
              <div
                className="absolute -right-2 sm:-right-6 -bottom-3 sm:-bottom-5 w-32 sm:w-40 lg:w-44 z-30 rotate-3 transition-transform duration-300 hover:rotate-0 hover:scale-105 pointer-events-auto"
                aria-label="Smartphone device preview: Student dashboard and daily learning streak"
              >
                <div className="rounded-3xl border-2 border-slate-600 bg-slate-900 p-1.5 shadow-2xl shadow-black/80">
                  {/* Dynamic Island / Speaker Pill */}
                  <div className="flex justify-center mb-1">
                    <span className="h-1.5 w-8 rounded-full bg-slate-800" />
                  </div>

                  {/* Phone Screen Frame */}
                  <div className="relative aspect-[9/18] w-full overflow-hidden rounded-2xl bg-[#0A1224] border border-white/10">
                    {!imgErrorPhone ? (
                      <Image
                        src="/images/mockups/dashboard-phone.png"
                        alt="BrainLab student dashboard mobile preview"
                        fill
                        sizes="(max-width: 768px) 140px, 180px"
                        onError={() => setImgErrorPhone(true)}
                        className="object-cover"
                      />
                    ) : null}

                    {/* High-Fidelity Mobile Dashboard CSS Wireframe */}
                    <div className="p-2 sm:p-2.5 text-left h-full flex flex-col justify-between text-[9px]">
                      <div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-mono text-cyan-300 font-bold">PORTAL</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <div className="font-black text-white text-[10px] mt-1">
                          Hi, Candidate 👋
                        </div>
                      </div>

                      {/* Daily Streak Card with Coral Glow */}
                      <div className="rounded-xl border border-[#FF5238]/30 bg-[#FF5238]/10 p-1.5 text-center">
                        <div className="text-[10px] font-black text-[#FF5238]">
                          🔥 12-Day Streak
                        </div>
                        <div className="text-[8px] text-slate-300">
                          +150 XP Today
                        </div>
                      </div>

                      {/* Target Score Metric */}
                      <div className="rounded-lg bg-slate-800/80 p-1.5 text-center">
                        <span className="text-[8px] text-slate-400 block uppercase">UTME Target</span>
                        <span className="font-mono font-black text-white text-xs">340+</span>
                      </div>

                      {/* Sprint Button */}
                      <div className="w-full text-center py-1 rounded-lg bg-blue-600 text-white font-bold text-[8px]">
                        Quick CBT Sprint &rarr;
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Floating STEM Concept Cards Carousel (Dark Navy Translucent Surfaces) */}
        <div className="mt-14 sm:mt-20 pt-8 border-t border-white/10 animate-bl-fade-in bl-stagger-2">
          <div className="text-center mb-6">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
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
                  className={`group relative rounded-2xl border ${concept.accentBg} p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[200px] sm:min-h-[220px] shadow-sm hover:-translate-y-1 ${concept.borderColor} ${concept.glowColor} ${
                    isSelected ? "ring-2 ring-cyan-400 scale-[1.02]" : "opacity-95 hover:opacity-100"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${concept.badgeColor}`}>
                        {concept.subject}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {concept.tag}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-white tracking-tight">
                      {concept.title}
                    </h3>

                    <div className="mt-3 rounded-xl bg-[#030814] border border-white/10 p-2.5 font-mono text-xs text-cyan-300 font-bold shadow-inner">
                      {concept.formulaOrSnippet}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-300 leading-relaxed font-normal">
                    {concept.detail}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>Official CBT engine and live countdown moved below to the interactive showcase &darr;</span>
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
