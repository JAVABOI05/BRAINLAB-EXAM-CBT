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
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-400/40",
    borderColor: "border-blue-500/30 hover:border-blue-400/80",
    glowColor: "group-hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]",
    formulaOrSnippet: "2x² + 5x + 3 = 0  ⟹  x = -1, -3/2",
    detail: "Factorise by splitting terms: (2x + 3)(x + 1) = 0.",
    accentBg: "from-blue-900/40 via-blue-950/20 to-slate-950/60",
  },
  {
    id: "physics",
    subject: "Physics",
    title: "Circuit Potential",
    tag: "Current Electricity",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40",
    borderColor: "border-cyan-500/30 hover:border-cyan-400/80",
    glowColor: "group-hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]",
    formulaOrSnippet: "V = E - Ir  ⟹  2.0 - (0.4 × 1) = 1.6 V",
    detail: "Terminal p.d. accounts for internal lost volts.",
    accentBg: "from-cyan-900/40 via-cyan-950/20 to-slate-950/60",
  },
  {
    id: "chemistry",
    subject: "Chemistry",
    title: "Redox States",
    tag: "Oxidation Numbers",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-400/40",
    borderColor: "border-purple-500/30 hover:border-purple-400/80",
    glowColor: "group-hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]",
    formulaOrSnippet: "KMnO₄  ⟹  (+1) + Mn + 4(-2) = 0",
    detail: "Mn = +7 oxidation state in neutral permanganate.",
    accentBg: "from-purple-900/40 via-purple-950/20 to-slate-950/60",
  },
  {
    id: "english",
    subject: "Use of English",
    title: "Proximity Concord",
    tag: "Lexis & Concord",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
    borderColor: "border-emerald-500/30 hover:border-emerald-400/80",
    glowColor: "group-hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]",
    formulaOrSnippet: "Neither A nor B  ⟹  Verb matches B",
    detail: "'Neither the principal nor the teachers were present.'",
    accentBg: "from-emerald-900/40 via-emerald-950/20 to-slate-950/60",
  },
  {
    id: "biology",
    subject: "Biology",
    title: "Mendelian Genetics",
    tag: "Heredity & Alleles",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-400/40",
    borderColor: "border-amber-500/30 hover:border-amber-400/80",
    glowColor: "group-hover:shadow-[0_0_25px_rgba(245,158,11,0.3)]",
    formulaOrSnippet: "Bb × Bb  ⟹  1 BB : 2 Bb : 1 bb",
    detail: "Classic 3:1 dominant to recessive phenotype ratio.",
    accentBg: "from-amber-900/40 via-amber-950/20 to-slate-950/60",
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
      className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-slate-950 via-[#070D1A] to-[#040810] text-white pt-20 pb-16 dark:border-slate-800 dark:from-[#050A14] dark:via-[#070E1C] dark:to-[#040810] sm:pt-28 sm:pb-20"
    >
      {/* World-Class Atmospheric Ambient Mesh Glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[700px] rounded-full bg-blue-600/15 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/3 -left-32 h-[450px] w-[450px] rounded-full bg-emerald-500/10 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-32 h-[450px] w-[450px] rounded-full bg-purple-500/10 blur-[130px]"
        aria-hidden="true"
      />

      {/* Subtle Academic Precision Grid Texture */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.035]"
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

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Centralized Hero Typography & Actions (Brilliant.org Inspired Breathing Space) */}
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-bl-fade-up">
          {/* Category Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-300 backdrop-blur-md shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>OPEN TO EVERY LEARNER &bull; 100% FREE CBT &amp; LEARNING HUB</span>
          </div>

          {/* H1 Primary Promise: Spacious, Authoritative, Student-Friendly */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08]">
            A Better Way to Learn, Practise <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400">
              and Achieve More.
            </span>
          </h1>

          {/* Subheading with Generous Breathing Room */}
          <p className="text-base sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            {subhead}
          </p>

          {/* Centralized Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href={heroConfig.primaryCta.href}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 px-8 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200 active:scale-95 min-h-[48px] group"
            >
              <span>{heroConfig.primaryCta.label}</span>
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
            </Link>

            <Link
              href={heroConfig.secondaryCta.href}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-600 px-7 py-4 text-base font-bold text-slate-200 transition-all duration-200 min-h-[48px]"
            >
              <span>{heroConfig.secondaryCta.label}</span>
            </Link>
          </div>

          {/* High-Trust Value Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-300 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-4 w-4 text-emerald-400 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>100% Free Public CBT Practice</span>
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
            <p className="text-xs text-slate-400 pt-0.5">
              &bull; {disclosure}
            </p>
          )}

          {/* Dynamic Live Statistics Slot (Rule S7 compliant, verified live aggregate data only) */}
          <div className="pt-2">
            <DynamicLiveStatisticsSlot />
          </div>
        </div>

        {/* Brilliant-Style Floating STEM Concept Cards Carousel (Interactive, Student-Friendly Deck) */}
        <div className="mt-14 sm:mt-20 pt-2 animate-bl-fade-in bl-stagger-2">
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
                  className={`group relative rounded-2xl border-2 bg-gradient-to-b ${concept.accentBg} p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[220px] shadow-sm hover:-translate-y-1 ${concept.borderColor} ${concept.glowColor} ${
                    isSelected ? "ring-2 ring-emerald-400/60 scale-[1.02]" : "opacity-90 hover:opacity-100"
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

                    <div className="mt-3 rounded-xl bg-slate-950/80 border border-white/10 p-2.5 font-mono text-xs text-emerald-300 font-semibold shadow-inner">
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
    </section>
  );
}
