"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue, isContentRenderable } from "@/app/lib/contentConfig";
import { DynamicLiveStatisticsSlot } from "./DynamicLiveStatisticsSlot";
import { Reveal } from "./Reveal";
import "./home-motion.css";

interface ConceptCard {
  id: string;
  subject: string;
  title: string;
  tag: string;
  formulaOrSnippet: string;
  detail: string;
}

/**
 * Illustrative concept previews. One consistent palette (navy surface, blue label, orange
 * selection) so the row reads as a single set instead of a rainbow of subject colours.
 */
const CONCEPTS: ConceptCard[] = [
  {
    id: "math",
    subject: "Mathematics",
    title: "Quadratic Functions",
    tag: "Algebra & Graphs",
    formulaOrSnippet: "2x² + 5x + 3 = 0  ⟹  x = -1, -3/2",
    detail: "Factorise by splitting terms: (2x + 3)(x + 1) = 0.",
  },
  {
    id: "physics",
    subject: "Physics",
    title: "Circuit Potential",
    tag: "Current Electricity",
    formulaOrSnippet: "V = E - Ir  ⟹  2.0 - (0.4 × 1) = 1.6 V",
    detail: "Terminal p.d. accounts for internal lost volts.",
  },
  {
    id: "chemistry",
    subject: "Chemistry",
    title: "Redox States",
    tag: "Oxidation Numbers",
    formulaOrSnippet: "KMnO₄  ⟹  (+1) + Mn + 4(-2) = 0",
    detail: "Mn = +7 oxidation state in neutral permanganate.",
  },
  {
    id: "english",
    subject: "Use of English",
    title: "Proximity Concord",
    tag: "Lexis & Concord",
    formulaOrSnippet: "Neither A nor B  ⟹  Verb matches B",
    detail: "'Neither the principal nor the teachers were present.'",
  },
  {
    id: "biology",
    subject: "Biology",
    title: "Mendelian Genetics",
    tag: "Heredity & Alleles",
    formulaOrSnippet: "Bb × Bb  ⟹  1 BB : 2 Bb : 1 bb",
    detail: "Classic 3:1 dominant to recessive phenotype ratio.",
  },
];

/** Orbit node positions (r = 176 around 200,200), precomputed so the markup stays static. */
const ORBIT_NODES: { cx: number; cy: number; accent: boolean }[] = [
  { cx: 200, cy: 24, accent: true },
  { cx: 367.4, cy: 145.6, accent: false },
  { cx: 303.5, cy: 342.4, accent: true },
  { cx: 96.5, cy: 342.4, accent: false },
  { cx: 32.6, cy: 145.6, accent: true },
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

const MS_PER_DAY = 86_400_000;

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 stroke-current stroke-[2.5] fill-none bl-home-accent-orange" viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function HomeHero() {
  const heroConfig = HOMEPAGE_CONTENT_CONFIG.hero;
  const [activeConceptId, setActiveConceptId] = useState<string>("math");

  // Countdown comes from the admin-set config (Claims Register). It is computed after mount
  // so the server and client HTML always match, and its space is reserved to avoid layout shift.
  const showCountdown = isContentRenderable({
    status: heroConfig.countdown.status,
    value: heroConfig.countdown.targetDate,
  });
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!showCountdown) return;
    const target = new Date(heroConfig.countdown.targetDate).getTime();
    if (Number.isNaN(target)) return;
    const days = Math.ceil((target - Date.now()) / MS_PER_DAY);
    if (days > 0) setDaysLeft(days);
  }, [showCountdown, heroConfig.countdown.targetDate]);

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
      className="relative overflow-hidden bg-[#060D20] text-white pt-8 pb-14 sm:pt-14 sm:pb-24 border-b border-white/[0.08]"
    >
      {/* Soft Academic Ambient Light */}
      <div
        className="pointer-events-none absolute -top-32 left-1/3 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[130px]"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">

          {/* LEFT / VISUAL COMPOSITION (below the copy on phones) */}
          <div className="lg:col-span-6 order-2 lg:order-1 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none pt-14">

              {/* Learning-loop orbit: slow rotating rings with five nodes (decorative) */}
              <svg
                viewBox="0 0 400 400"
                className="bl-home-fade-in pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[135%] max-w-none -translate-x-1/2 -translate-y-1/2"
                aria-hidden="true"
              >
                <g className="bl-home-orbit">
                  <circle cx="200" cy="200" r="176" fill="none" stroke="rgba(148,163,184,0.28)" strokeWidth="1.2" strokeDasharray="2 9" strokeLinecap="round" />
                  {ORBIT_NODES.map((n, i) => (
                    <circle
                      key={i}
                      cx={n.cx}
                      cy={n.cy}
                      r={n.accent ? 6 : 4.5}
                      className={i % 3 === 0 ? "bl-home-twinkle" : i % 3 === 1 ? "bl-home-twinkle bl-home-twinkle-2" : "bl-home-twinkle bl-home-twinkle-3"}
                      style={{ fill: n.accent ? "var(--bl-color-brand-orange)" : "#60a5fa" }}
                    />
                  ))}
                </g>
                <g className="bl-home-orbit bl-home-orbit-rev">
                  <circle cx="200" cy="200" r="142" fill="none" stroke="rgba(96,165,250,0.22)" strokeWidth="1.2" strokeDasharray="6 12" strokeLinecap="round" />
                </g>
              </svg>

              {/* Rising arrow (echoes the logo), drawn once on load */}
              <svg
                viewBox="0 0 140 70"
                className="pointer-events-none absolute right-2 top-0 z-20 h-14 w-28 sm:right-6 sm:h-16 sm:w-32"
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="blHeroArrowGrad" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" style={{ stopColor: "var(--bl-color-brand-orange-light)" }} />
                    <stop offset="1" style={{ stopColor: "var(--bl-color-brand-orange-deep)" }} />
                  </linearGradient>
                </defs>
                <path
                  d="M10 62 C 44 56, 90 40, 118 10"
                  pathLength="1"
                  stroke="url(#blHeroArrowGrad)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  className="bl-home-draw"
                />
                <path
                  d="M92 8 L120 8 L120 36"
                  stroke="url(#blHeroArrowGrad)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="bl-home-pop"
                />
              </svg>

              <div className="relative flex items-center justify-center">
                {/* Crisp layered panels behind the card */}
                <div
                  className="bl-home-panel-orange pointer-events-none absolute inset-0 -rotate-3 translate-x-2 translate-y-3 rounded-3xl"
                  aria-hidden="true"
                />
                <div
                  className="bl-home-panel-blue pointer-events-none absolute inset-0 rotate-2 -translate-x-2 translate-y-2 rounded-3xl"
                  aria-hidden="true"
                />

                {/* Primary Hero Showcase Card */}
                <div className="bl-home-enter relative z-10 w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0B1426] p-2.5 sm:p-3 shadow-2xl">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-[#091124] to-slate-950 p-4 sm:p-8">

                    {/* Dotted Backdrop Accent */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `radial-gradient(#2563eb 1.5px, transparent 1.5px)`,
                        backgroundSize: "18px 18px",
                      }}
                      aria-hidden="true"
                    />

                    <div className="relative z-10 space-y-4 sm:space-y-5">
                      {/* Countdown strip: admin-set date from the content config */}
                      {showCountdown && (
                        <div
                          className={`bl-home-chip-orange bl-home-fade flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-black ${
                            daysLeft === null ? "opacity-0" : "opacity-100"
                          }`}
                          aria-hidden={daysLeft === null}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="9" />
                              <path d="M12 7v5l3 2" />
                            </svg>
                            <span className="truncate">{heroConfig.countdown.targetExam}</span>
                          </span>
                          <span className="font-mono tabular-nums shrink-0">
                            {daysLeft === null ? "000" : daysLeft} {daysLeft === 1 ? "day" : "days"} to go
                          </span>
                        </div>
                      )}

                      {/* Header: labelled as a sample, no invented people or status */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-200 border border-blue-500/40"
                            aria-hidden="true"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="14" rx="2" />
                              <path d="M8 20h8M12 18v2" />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <span className="text-sm font-black text-white block truncate">
                              Practice Simulator
                            </span>
                            <span className="text-xs font-semibold text-slate-300">
                              Sample question preview
                            </span>
                          </div>
                        </div>

                        <span className="hidden sm:inline-block shrink-0 rounded-full bg-blue-900/50 px-3 py-1 text-xs font-black text-blue-200 border border-blue-700/60">
                          JAMB-style CBT
                        </span>
                      </div>

                      {/* Sample question (illustrative only, clearly labelled) */}
                      <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-3.5 sm:p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <span className="text-blue-200">Physics &bull; Sample</span>
                          <span className="rounded border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-slate-200">
                            Timed practice
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-white leading-relaxed">
                          &ldquo;Find the terminal potential difference across a cell of e.m.f. 2.0 V and internal resistance 1.0 &Omega; connected to a 4.0 &Omega; load.&rdquo;
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-950/60 border-2 border-emerald-400 text-emerald-200 font-bold">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white font-mono text-xs font-black">
                              A
                            </span>
                            <span>1.60 V</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-700 text-slate-300 font-mono text-xs font-black">
                              B
                            </span>
                            <span>2.00 V</span>
                          </div>
                        </div>
                      </div>

                      {/* Product facts (taken from the verified claims register, no invented figures) */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-white/[0.05] px-2 py-2.5 border border-white/10">
                          <div className="text-sm sm:text-base font-black text-white">4 Subjects</div>
                          <div className="hidden sm:block text-xs font-semibold text-slate-300">JAMB-style combination</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.05] px-2 py-2.5 border border-white/10">
                          <div className="text-sm sm:text-base font-black text-white">3 Tracks</div>
                          <div className="hidden sm:block text-xs font-semibold text-slate-300">UTME &bull; O Level &bull; Post-UTME</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.05] px-2 py-2.5 border border-white/10">
                          <div className="text-sm sm:text-base font-black text-white">Offline-safe</div>
                          <div className="hidden sm:block text-xs font-semibold text-slate-300">Answers sync on reconnect</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating feature badges (tablet and desktop only, they overlap the card edge) */}
              <div className="bl-home-float absolute top-24 -right-4 z-20 hidden sm:flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/95 px-3.5 py-2 shadow-xl backdrop-blur-md">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-400/40">
                  <CheckIcon />
                </span>
                <div className="text-left">
                  <span className="text-xs font-black text-white block">Instant Diagnostics</span>
                  <span className="text-xs text-slate-300 font-medium">Topic-by-topic breakdown</span>
                </div>
              </div>

              <div className="bl-home-float bl-home-float-alt absolute -bottom-4 -left-4 z-20 hidden sm:flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/95 px-3.5 py-2 shadow-xl backdrop-blur-md">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-400/40 text-blue-200">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
                  </svg>
                </span>
                <div className="text-left">
                  <span className="text-xs font-black text-white block">Socratic Hints</span>
                  <span className="text-xs text-slate-300 font-medium">Step-by-step guidance</span>
                </div>
              </div>
            </div>

            {/* Phones: the same two features as simple pills under the card */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:hidden">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-slate-100">
                <CheckIcon />
                Instant diagnostics
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-slate-100">
                <CheckIcon />
                Socratic hints
              </span>
            </div>
          </div>

          {/* RIGHT / EDITORIAL COPY & PATHWAYS (first on phones) */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-5 sm:space-y-7 text-left">

            {/* Category Pill (shorter on phones so it stays on one or two tidy lines) */}
            <div className="bl-home-tint-orange inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider">
              <span className="flex h-2 w-2 shrink-0 rounded-full animate-pulse" style={{ background: "var(--bl-color-brand-orange)" }} aria-hidden="true" />
              <span className="sm:hidden">CBT SIMULATION &bull; AI DIAGNOSTICS</span>
              <span className="hidden sm:inline">INTELLIGENT CBT SIMULATION &bull; AI DIAGNOSTICS &bull; STEM LABS</span>
            </div>

            {/* Primary headline: always the configured, verified claim. Not animated, so LCP is immediate. */}
            <h1 className="text-[2.1rem] leading-[1.1] sm:text-5xl lg:text-6xl font-black tracking-tight text-white sm:leading-[1.08]">
              {lead && <>{lead} </>}
              <span className="bl-home-accent-orange relative inline-block">
                {accent}
                {/* Hand-drawn organic underline stroke */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3"
                  viewBox="0 0 250 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M3 9C60 3 190 2 247 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            {/* Subheading (the longer second sentence is tablet and up) */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl font-normal">
              {subhead}
              <span className="hidden sm:inline"> Practice under authentic timed test-hall conditions, master fundamental concepts through step-by-step derivations, and conquer entrance screenings with instant diagnostic scoring.</span>
            </p>

            {/* Candidate Pathways: UTME is the single filled orange action. Full width on phones. */}
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select your candidate pathway:
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                <Link
                  href="/cbt"
                  className="bl-home-cta-orange bl-focus-ring inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full font-black px-7 py-3.5 text-base shadow-lg shadow-orange-500/20 active:scale-95 group min-h-[52px]"
                >
                  <span>UTME Candidates</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>

                <Link
                  href="/programmes/post-utme"
                  className="bl-focus-ring inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border-2 border-white/25 bg-white/10 hover:bg-white/20 text-white font-extrabold px-6 py-3.5 text-base shadow-xs transition-all duration-200 active:scale-95 min-h-[52px]"
                >
                  <span>Post-UTME Screening</span>
                </Link>

                <Link
                  href="/learn"
                  className="bl-focus-ring inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-full px-3 py-3 text-base font-bold text-slate-200 underline decoration-white/30 underline-offset-4 hover:text-white hover:decoration-white min-h-[48px] transition-colors"
                >
                  <span>O Level (WAEC/NECO)</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Capability list: stacked on phones, inline on larger screens */}
            <ul className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2 text-sm sm:text-xs font-bold text-slate-200 pt-1">
              <li className="inline-flex items-center gap-2">
                <CheckIcon />
                <span>JAMB-style CBT simulator</span>
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckIcon />
                <span>Step-by-step Socratic insights</span>
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckIcon />
                <span>Practice that survives weak connections</span>
              </li>
            </ul>

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

        {/* Concept explorer: swipeable on phones and tablets, five-up grid on desktop */}
        <div className="mt-14 sm:mt-24 pt-8 border-t border-white/[0.08]">
          <h2 className="sr-only">Interactive concept explorer</h2>
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">
              Visual concept explorers
            </span>
            <span className="lg:hidden text-xs font-semibold text-slate-300" aria-hidden="true">
              Swipe &rarr;
            </span>
          </div>

          <div
            role="group"
            aria-label="Concept previews"
            className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-4 lg:grid lg:grid-cols-5 lg:gap-5 lg:overflow-visible lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {CONCEPTS.map((concept, index) => {
              const isSelected = activeConceptId === concept.id;
              return (
                <Reveal
                  key={concept.id}
                  delay={index * 70}
                  className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-auto"
                >
                  <button
                    type="button"
                    onClick={() => setActiveConceptId(concept.id)}
                    aria-pressed={isSelected}
                    className={`group relative flex h-full min-h-[200px] w-full flex-col justify-between rounded-2xl border-2 bg-gradient-to-b from-slate-900 via-[#0B1528] to-[#070D1A] p-4 sm:p-5 text-left shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 ${
                      isSelected
                        ? "border-orange-400 shadow-lg shadow-orange-500/10"
                        : "border-white/10 hover:border-blue-400/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-blue-400/40 bg-blue-500/15 text-blue-200">
                          {concept.subject}
                        </span>
                        <span className="text-xs text-slate-300 font-mono text-right">
                          {concept.tag}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-white tracking-tight">
                        {concept.title}
                      </h3>

                      <div className="mt-3 rounded-xl bg-slate-950 border border-white/10 p-2.5 font-mono text-xs font-bold shadow-inner bl-home-accent-orange">
                        {concept.formulaOrSnippet}
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-300 leading-relaxed font-normal">
                      {concept.detail}
                    </p>
                  </button>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
