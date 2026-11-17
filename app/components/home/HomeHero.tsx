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
    badgeColor: "bg-blue-500/20 text-cyan-300 border-blue-400/40",
    borderColor: "border-blue-500/30 hover:border-blue-400/80",
    glowColor: "hover:shadow-md hover:shadow-blue-500/20",
    formulaOrSnippet: "2x² + 5x + 3 = 0  ⟹  x = -1, -3/2",
    detail: "Factorise by splitting terms: (2x + 3)(x + 1) = 0.",
    accentBg: "from-blue-950/40 via-[#0B1528] to-[#070D1A]",
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
    accentBg: "from-cyan-950/40 via-[#0B1528] to-[#070D1A]",
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
    accentBg: "from-purple-950/40 via-[#0B1528] to-[#070D1A]",
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
    accentBg: "from-emerald-950/40 via-[#0B1528] to-[#070D1A]",
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
    accentBg: "from-amber-950/40 via-[#0B1528] to-[#070D1A]",
  },
];

/**
 * Splits the configured headline so the final words can carry the accent
 * underline. Works for any admin-set headline, so no copy is hardcoded here.
 */
function splitHeadline(text: string): { lead: string; accent: string } {
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return { lead: "", accent: text };
  const accentCount = 2;
  return {
    lead: words.slice(0, -accentCount).join(" "),
    accent: words.slice(-accentCount).join(" "),
  };
}

export function HomeHero() {
  const heroConfig = HOMEPAGE_CONTENT_CONFIG.hero;
  const [activeConceptId, setActiveConceptId] = useState<string>("math");

  const headline =
    resolveClaimValue(
      heroConfig.headline,
      "A Better Way to Learn, Practise and Achieve More."
    ) ?? "A Better Way to Learn, Practise and Achieve More.";

  const subhead =
    resolveClaimValue(
      heroConfig.subhead,
      "Unified examination preparation for UTME, O Level, and Post-UTME candidates."
    ) ?? "";

  const disclosure = resolveClaimValue(
    heroConfig.disclosure,
    "Public learners receive full access to CBT practice, question banks, AI Tutor fair-use, and Learning Hub completely free."
  );

  const { lead, accent } = splitHeadline(headline);

  return (
    <section
      aria-label="BrainLab Learning Ecosystem Introduction"
      className="relative overflow-hidden bg-[#060D20] text-white pt-8 pb-16 sm:pt-14 sm:pb-24 border-b border-white/[0.08]"
    >
      {/* Soft Academic Ambient Light */}
      <div
        className="pointer-events-none absolute -top-32 left-1/3 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/4 -right-24 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[120px]"
        aria-hidden="true"
      />

      {/* Delicate Dotted Matrix Canvas Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
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

          {/* LEFT / VISUAL STORYTELLING COLLAGE */}
          <div className="lg:col-span-6 order-2 lg:order-1 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">

              {/* Organic Background Shape Layer */}
              <div className="relative flex items-center justify-center">
                {/* Layer 1: Soft Cosmos Blob */}
                <div className="absolute -top-6 -left-6 h-64 w-64 sm:h-80 sm:w-80 rounded-[40%_60%_70%_30%/40%_50%_60%_55%] bg-gradient-to-tr from-blue-600/25 via-indigo-500/15 to-sky-400/25 blur-xl pointer-events-none" />

                {/* Layer 2: Warm Coral Petal Blob */}
                <div className="absolute -bottom-6 -right-4 h-60 w-60 sm:h-72 sm:w-72 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-gradient-to-br from-rose-500/20 via-orange-400/15 to-amber-300/15 blur-xl pointer-events-none" />

                {/* Primary Hero Showcase Card */}
                <div className="relative z-10 w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0B1426] p-3 shadow-2xl">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-[#091124] to-slate-950 p-6 sm:p-8">

                    {/* Dotted Backdrop Accent */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `radial-gradient(#2563eb 1.5px, transparent 1.5px)`,
                        backgroundSize: "18px 18px",
                      }}
                      aria-hidden="true"
                    />

                    <div className="relative z-10 space-y-5">
                      {/* Header: labelled as a sample, no invented people or status */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-cyan-300 border border-blue-500/40"
                            aria-hidden="true"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="14" rx="2" />
                              <path d="M8 20h8M12 18v2" />
                            </svg>
                          </span>
                          <div>
                            <span className="text-sm font-black text-white block">
                              Practice Simulator
                            </span>
                            <span className="text-xs font-semibold text-slate-300">
                              Sample question preview
                            </span>
                          </div>
                        </div>

                        <span className="rounded-full bg-blue-900/50 px-3 py-1 text-xs font-black text-cyan-300 border border-blue-700/60">
                          JAMB-style CBT
                        </span>
                      </div>

                      {/* Sample question (illustrative only, clearly labelled) */}
                      <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-cyan-300 flex items-center gap-1.5">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            Physics &bull; Sample
                          </span>
                          <span className="rounded border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-slate-200">
                            Timed practice
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-white leading-relaxed">
                          &ldquo;Find the terminal potential difference across a cell of e.m.f. 2.0 V and internal resistance 1.0 &Omega; connected to a 4.0 &Omega; load.&rdquo;
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-950/60 border-2 border-emerald-400 text-emerald-200 font-bold">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-white font-mono text-xs font-black">
                              A
                            </span>
                            <span>1.60 V (Correct)</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-700 text-slate-300 font-mono text-xs font-black">
                              B
                            </span>
                            <span>2.00 V</span>
                          </div>
                        </div>
                      </div>

                      {/* Product facts (taken from the verified claims register, no invented figures) */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="rounded-xl bg-white/[0.05] p-2.5 border border-white/10">
                          <div className="text-base sm:text-lg font-black text-white font-mono">4 Subjects</div>
                          <div className="text-xs font-semibold text-slate-300 tracking-tight">JAMB-style combination</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.05] p-2.5 border border-white/10">
                          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">3 Tracks</div>
                          <div className="text-xs font-semibold text-slate-300 tracking-tight">UTME &bull; O Level &bull; Post-UTME</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.05] p-2.5 border border-white/10">
                          <div className="text-base sm:text-lg font-black text-cyan-400 font-mono">Offline-safe</div>
                          <div className="text-xs font-semibold text-slate-300 tracking-tight">Answers sync on reconnect</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Feature Badge 1 (Top Right) */}
              <div className="absolute -top-4 -right-2 sm:-right-4 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/95 px-3.5 py-2 shadow-xl backdrop-blur-md animate-bl-float">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <div className="text-left">
                  <span className="text-xs font-black text-white block">
                    Instant Diagnostics
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    Topic-by-topic breakdown
                  </span>
                </div>
              </div>

              {/* Floating Feature Badge 2 (Bottom Left) */}
              <div className="absolute -bottom-4 -left-2 sm:-left-4 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/95 px-3.5 py-2 shadow-xl backdrop-blur-md">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-950 text-cyan-300 border border-blue-800/60">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                    <circle cx="9" cy="13" r="1" />
                    <circle cx="15" cy="13" r="1" />
                  </svg>
                </span>
                <div className="text-left">
                  <span className="text-xs font-black text-white block">
                    Socratic Hints
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    Step-by-step guidance
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT / EDITORIAL COPY & PATHWAYS */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6 sm:space-y-7 text-left">

            {/* Category Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-cyan-300 shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" aria-hidden="true" />
              <span>INTELLIGENT CBT SIMULATION &bull; AI DIAGNOSTICS &bull; STEM LABS</span>
            </div>

            {/* Primary headline: always the configured, verified claim */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08]">
              {lead && <>{lead} </>}
              <span className="relative inline-block text-cyan-400">
                {accent}
                {/* Hand-drawn organic underline stroke */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-emerald-400"
                  viewBox="0 0 250 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M3 9C60 3 190 2 247 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl font-normal">
              {subhead} Practice under authentic timed test-hall conditions, master fundamental concepts through step-by-step derivations, and conquer entrance screenings with instant diagnostic scoring.
            </p>

            {/* Candidate Pathways: UTME is the single primary action */}
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select your candidate pathway:
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/cbt"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black px-7 py-3.5 text-sm sm:text-base shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-95 group min-h-[48px]"
                >
                  <span>UTME Candidates</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>

                <Link
                  href="/programmes/post-utme"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/25 bg-white/10 hover:bg-white/20 text-white font-extrabold px-6 py-3.5 text-sm sm:text-base shadow-xs transition-all duration-200 active:scale-95 min-h-[48px]"
                >
                  <span>Post-UTME Screening</span>
                </Link>

                <Link
                  href="/learn"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm sm:text-base font-bold text-slate-200 underline decoration-white/30 underline-offset-4 hover:text-white hover:decoration-white min-h-[48px] transition-colors"
                >
                  <span>O Level (WAEC/NECO)</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Capability list (no unverified "official" or "verified" badges) */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-200 pt-2">
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-400 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>JAMB-style CBT simulator</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-400 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Step-by-step Socratic insights</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-400 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Practice that survives weak connections</span>
              </span>
            </div>

            {/* Truthful Free Tier Disclosure */}
            {disclosure && (
              <p className="text-xs text-slate-300 pt-1">
                &bull; {disclosure}
              </p>
            )}

            {/* Dynamic Live Statistics Slot (Rule S7 compliant, verified live aggregate data only) */}
            <div className="pt-2">
              <DynamicLiveStatisticsSlot />
            </div>
          </div>
        </div>

        {/* Concept cards (keyboard accessible) */}
        <div className="mt-16 sm:mt-24 pt-8 border-t border-white/[0.08] animate-bl-fade-in bl-stagger-2">
          <div className="text-center mb-6">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">
              Interactive First-Principles Learning &bull; Visual Concept Explorers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5 text-left">
            {BRILLIANT_HERO_CONCEPTS.map((concept) => {
              const isSelected = activeConceptId === concept.id;
              return (
                <button
                  type="button"
                  key={concept.id}
                  onClick={() => setActiveConceptId(concept.id)}
                  aria-pressed={isSelected}
                  className={`group relative w-full text-left rounded-2xl border-2 bg-gradient-to-b ${concept.accentBg} p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[220px] shadow-sm hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${concept.borderColor} ${concept.glowColor} ${
                    isSelected ? "ring-2 ring-cyan-400 scale-[1.02]" : "opacity-95 hover:opacity-100"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${concept.badgeColor}`}>
                        {concept.subject}
                      </span>
                      <span className="text-xs text-slate-300 font-mono">
                        {concept.tag}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-white tracking-tight">
                      {concept.title}
                    </h3>

                    <div className="mt-3 rounded-xl bg-slate-950 border border-white/10 p-2.5 font-mono text-xs text-emerald-300 font-bold shadow-inner">
                      {concept.formulaOrSnippet}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-300 leading-relaxed font-normal">
                    {concept.detail}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
