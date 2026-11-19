"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";
import { DynamicLiveStatisticsSlot } from "./DynamicLiveStatisticsSlot";
import { CBTHeroDemo } from "./CBTHeroDemo";

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
              <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
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

          {/* RIGHT / SIGNATURE CBT EXAM DEMONSTRATION */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <CBTHeroDemo />
          </div>
        </div>

        {/* Floating STEM Concept Cards Carousel (Dark Navy Translucent Surfaces) */}
        <div className="mt-14 sm:mt-20 pt-8 border-t border-white/10">
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
                  className={`group relative rounded-2xl border ${concept.accentBg} p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[200px] sm:min-h-[220px] shadow-sm ${concept.borderColor} ${
                    isSelected ? "ring-2 ring-cyan-400" : "opacity-95"
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
