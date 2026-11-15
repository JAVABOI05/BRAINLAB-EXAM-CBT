"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG } from "@/app/lib/contentConfig";

function AudienceIcon({ type, className = "h-4 w-4" }: { type: string; className?: string }) {
  switch (type) {
    case "utme":
    case "students":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
        </svg>
      );
    case "olevel":
    case "secondary":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10M6 10h10" />
        </svg>
      );
    case "post_utme":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
          <line x1="9" y1="12" x2="15" y2="12" />
        </svg>
      );
    case "keyboard":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
        </svg>
      );
    case "target":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 21V10M20 21V10M12 21V10M2 10h20M12 3l10 7H2zM2 21h20" />
        </svg>
      );
    case "offline":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
        </svg>
      );
    case "curriculum":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "theory":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case "diagnostic":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case "arena":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polygon points="12 6 14.5 10.5 19 11.5 15.5 15 16.5 19.5 12 17 7.5 19.5 8.5 15 5 11.5 9.5 10.5 12 6" />
        </svg>
      );
    case "calculator":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="16" y1="14" x2="16" y2="18" />
          <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01" />
        </svg>
      );
    case "schools":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "tutors":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "parents":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * The 3 canonical candidate pathways requested by the user:
 * 1. UTME CANDIDATES
 * 2. O LEVEL CANDIDATES
 * 3. POST UTME CANDIDATES
 */
interface CandidateTrack {
  id: "utme" | "olevel" | "post_utme";
  tag: string;
  badge: string;
  headline: string;
  body: string;
  cta: { label: string; href: string };
  icon: string;
  themeColor: string;
  glowGradient: string;
  accentBg: string;
  features: { icon: string; title: string; desc: string }[];
}

const CANDIDATE_TRACKS: CandidateTrack[] = [
  {
    id: "utme",
    tag: "UTME Candidates",
    badge: "JAMB 2027 Blueprint Standard",
    headline: "Target 300+ with Official 4-Subject Combinations & 8-Key Speed Parity",
    body: "Simulate the authentic JAMB CBT terminal experience. Master 180 questions across your chosen 4-subject combination with 120-minute countdowns, official A, B, C, D, P, N, S, R keyboard controls, negative marking analysis, and Tier-1 university cut-off benchmarking.",
    cta: { label: "Launch UTME Exam Simulator", href: "/cbt" },
    icon: "utme",
    themeColor: "text-cyan-400",
    glowGradient: "from-blue-600/20 via-cyan-500/10 to-transparent",
    accentBg: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    features: [
      {
        icon: "keyboard",
        title: "Authentic 8-Key Exam Parity",
        desc: "Practice with the exact A, B, C, D, P, N, S, R keyboard controls used in the official CBT center without mouse dependency.",
      },
      {
        icon: "target",
        title: "Tier-1 University Target Radar",
        desc: "Benchmark scores against official merit cut-offs for UNILAG, UI, OAU, UNN, and ABU.",
      },
      {
        icon: "offline",
        title: "Zero-Data Offline Exam Mode",
        desc: "Download full 4-subject exam packages to your device; practise anywhere without network lag.",
      },
    ],
  },
  {
    id: "olevel",
    tag: "O Level Candidates",
    badge: "WAEC SSCE & NECO Standard",
    headline: "Master Senior Secondary Theory Derivations & Objective Papers",
    body: "Comprehensive syllabus coverage for SS1–SS3 candidates across Science, Commercial, and Arts streams. Practice with verified 2015–2026 past questions, step-by-step mathematical working, and WAEC Chief Examiner standards to secure distinctions.",
    cta: { label: "Explore O Level Curriculum Hub", href: "/learn" },
    icon: "olevel",
    themeColor: "text-emerald-400",
    glowGradient: "from-emerald-600/20 via-teal-500/10 to-transparent",
    accentBg: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    features: [
      {
        icon: "curriculum",
        title: "Science, Arts & Commercial Streams",
        desc: "Complete NERDC curriculum syllabi with structured lessons, definitions, formula sheets, and solved exercises.",
      },
      {
        icon: "theory",
        title: "Master Step-by-Step Derivations",
        desc: "Detailed working for WAEC & NECO theory and objective papers across Mathematics, Sciences, and Humanities.",
      },
      {
        icon: "diagnostic",
        title: "Topic-by-Topic Mastery Diagnostic",
        desc: "Pinpoint exact syllabus gaps before senior secondary certificate exams with continuous diagnostic tracking.",
      },
    ],
  },
  {
    id: "post_utme",
    tag: "Post-UTME Candidates",
    badge: "University Screening Accelerator",
    headline: "Crush University Screening CBTs with Institutional Time Formats",
    body: "University screening formats differ drastically from UTME. Train under institution-specific constraints for UNILAG (30-min 40-question sprints), UI, OAU, UNIBEN, UNN, and ABU with our composite aggregate admission calculator.",
    cta: { label: "Start Post-UTME Screening Drills", href: "/programmes/post-utme" },
    icon: "post_utme",
    themeColor: "text-amber-400",
    glowGradient: "from-amber-600/20 via-orange-500/10 to-transparent",
    accentBg: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    features: [
      {
        icon: "target",
        title: "Institution-Specific Timed Formats",
        desc: "Tailored 30–45 minute speed papers reflecting UNILAG 30-min 40-question sprints, UI general paper, and OAU faculty screenings.",
      },
      {
        icon: "diagnostic",
        title: "Composite Admission Merit Calculator",
        desc: "Dynamically calculate weighted aggregate scores across 50% UTME, 30% Post-UTME, and 20% O-Level points.",
      },
      {
        icon: "arena",
        title: "High-Pressure Speed & Accuracy Drills",
        desc: "High-yield drills focused on rapid numerical reasoning, verbal logic, and faculty core subjects under time pressure.",
      },
    ],
  },
];

export function HomeAudiences() {
  const [activeTrackId, setActiveTrackId] = useState<"utme" | "olevel" | "post_utme">("utme");

  // Interactive state for UTME candidate widget
  const [targetScore, setTargetScore] = useState<number>(290);
  // Interactive state for O Level stream selector
  const [secondaryStream, setSecondaryStream] = useState<"science" | "arts" | "commercial">("science");
  // Interactive state for Post-UTME widget
  const [targetUni, setTargetUni] = useState<"unilag" | "ui" | "oau">("unilag");
  const [projectedPostUtme, setProjectedPostUtme] = useState<number>(26); // out of 30

  const activeTrack = CANDIDATE_TRACKS.find((t) => t.id === activeTrackId) || CANDIDATE_TRACKS[0];

  // Dynamic Post-UTME aggregate calculation
  // UTME (50%): (290 / 400) * 50 = 36.25 pts
  // Post-UTME (30%): (26 / 30) * 30 = 26.00 pts
  // O-Level (20%): Standard 5 A1s = 20.00 pts
  const utmeContribution = Number(((targetScore / 400) * 50).toFixed(2));
  const postUtmeContribution = Number(projectedPostUtme.toFixed(2));
  const olevelContribution = 20.0;
  const compositeAggregate = Number((utmeContribution + postUtmeContribution + olevelContribution).toFixed(2));

  return (
    <section
      id="audiences"
      aria-label="Tailored Experiences for Every Learner"
      className="scroll-mt-20 sm:scroll-mt-24 relative w-full overflow-hidden py-14 sm:py-20 border-b border-slate-200/80 bg-white text-slate-900 dark:border-white/10 dark:bg-[#050811] dark:text-white transition-colors"
    >
      {/* Dynamic Ambient Lighting */}
      <div
        className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r ${activeTrack.glowGradient} blur-[140px] opacity-40 dark:opacity-75 transition-all duration-700`}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-500/10 dark:text-cyan-300 dark:border-blue-400/30 mb-3 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
            <span>EXAMINATION CANDIDATE PATHWAYS</span>
          </span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
            Engineered Specifically for How You Learn
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            Select your candidate category below to explore tailored simulation engines, official marking schemes, and real-time diagnostic telemetry.
          </p>
        </div>

        {/* 1. THREE CANONICAL CANDIDATE PATHWAYS SELECTOR */}
        <div
          role="tablist"
          aria-label="Academic Candidate Pathways"
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-8 sm:mb-12"
        >
          {CANDIDATE_TRACKS.map((track) => {
            const isActive = track.id === activeTrackId;

            return (
              <button
                key={track.id}
                role="tab"
                id={`tab-${track.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${track.id}`}
                type="button"
                onClick={() => setActiveTrackId(track.id)}
                className={`group relative flex items-center gap-3 rounded-2xl px-5 sm:px-7 py-3.5 text-xs sm:text-sm font-bold transition-all duration-300 bl-focus-ring cursor-pointer ${
                  isActive
                    ? "bg-slate-950 text-white shadow-xl border-2 border-slate-900 scale-102 dark:bg-[#0E172A] dark:border-cyan-400"
                    : "bg-slate-100/80 text-slate-700 hover:text-slate-950 hover:bg-slate-200/80 border border-slate-200/80 dark:bg-[#0A101D]/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#111A2E] dark:border-white/[0.08]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-xl ${
                    isActive ? track.accentBg : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  } border border-slate-200 dark:border-white/10 shrink-0 transition-transform group-hover:scale-110`}
                  aria-hidden="true"
                >
                  <AudienceIcon type={track.icon} className="h-4 w-4" />
                </span>
                <span className={`font-black text-sm tracking-tight ${isActive ? "text-white" : "text-slate-800 dark:text-slate-200"}`}>
                  {track.tag}
                </span>
                {isActive && (
                  <span className={`flex h-2.5 w-2.5 rounded-full ${track.themeColor.replace("text-", "bg-")} shadow-xs animate-pulse ml-0.5`} />
                )}
              </button>
            );
          })}
        </div>

        {/* 2. THE WIDESCREEN CANDIDATE PATHWAY CANVAS */}
        <div
          role="tabpanel"
          id={`panel-${activeTrack.id}`}
          aria-labelledby={`tab-${activeTrack.id}`}
          className="relative rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 lg:p-12 shadow-lg backdrop-blur-xl transition-all duration-500 overflow-hidden dark:border-white/15 dark:bg-gradient-to-br dark:from-[#0B1222]/95 dark:via-[#081226]/90 dark:to-[#040814]/95 dark:shadow-2xl"
        >
          {/* Subtle Top Gradient Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* LEFT COLUMN: Editorial Value & Feature Highlights */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border ${activeTrack.accentBg}`}>
                  <AudienceIcon type={activeTrack.icon} className="h-3.5 w-3.5" />
                  <span>{activeTrack.badge}</span>
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Primary Candidate Track
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
                {activeTrack.headline}
              </h3>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {activeTrack.body}
              </p>

              {/* High-Contrast Illustrated Feature Modules */}
              <div className="space-y-3 pt-2">
                {activeTrack.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 sm:p-4 transition-all hover:border-slate-300 hover:bg-slate-100/80 shadow-2xs dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-white/20 dark:hover:bg-slate-950/80"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-blue-700 shadow-2xs dark:bg-slate-900 dark:border-white/15 dark:text-cyan-300 dark:shadow-inner">
                      <AudienceIcon type={feat.icon} className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-xs sm:text-sm font-bold text-slate-950 dark:text-white tracking-tight">
                        {feat.title}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        {feat.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Direct Pathway Action */}
              <div className="pt-3 flex flex-wrap items-center gap-4">
                <Link
                  href={activeTrack.cta.href}
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:translate-y-0.5 px-6 sm:px-8 py-3.5 text-xs sm:text-sm font-black text-white shadow-md shadow-blue-600/25 transition-all bl-focus-ring min-h-[48px]"
                >
                  <span>{activeTrack.cta.label}</span>
                  <span aria-hidden="true" className="text-base font-bold">&rarr;</span>
                </Link>

                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  100% Free Starter Access &bull; No Credit Card Required
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: Bespoke Interactive Live Simulator Widget */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/90 p-5 sm:p-6 shadow-sm dark:border-white/15 dark:bg-[#030712]/90 dark:shadow-2xl relative overflow-hidden">
                {/* Glow pill header */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Live Candidate Telemetry Simulator
                    </span>
                  </div>
                  <span className="rounded-md bg-blue-50 dark:bg-white/10 px-2 py-0.5 text-[10px] font-mono text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-white/10 font-bold">
                    Interactive
                  </span>
                </div>

                {/* 1. UTME CANDIDATES: Target Score & University Dial */}
                {activeTrack.id === "utme" && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-300 mb-1.5 flex justify-between">
                        <span>Select Target UTME Score:</span>
                        <span className="font-mono text-cyan-700 dark:text-cyan-400 font-black">{targetScore} / 400</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[260, 290, 320].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setTargetScore(score)}
                            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              targetScore === score
                                ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30 scale-102"
                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800"
                            }`}
                          >
                            {score}+ Target
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Radial Admission Gauge Preview */}
                    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-50 to-white dark:from-cyan-950/40 dark:to-slate-950/60 p-4 text-center">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Admission Merit Probability
                      </div>
                      <div className="text-3xl font-black text-slate-950 dark:text-white mt-1">
                        {targetScore >= 310
                          ? "96% High Merit"
                          : targetScore >= 285
                          ? "88% Competitive"
                          : "74% Qualified"}
                      </div>
                      <p className="text-[11px] text-cyan-800 dark:text-cyan-300 mt-1 font-medium">
                        {targetScore >= 290
                          ? "Direct merit qualification for UNILAG, UI, and OAU Tier-1 programs."
                          : "Strong standing for Federal institution admission with targeted CBT practice."}
                      </p>
                    </div>

                    {/* Target Institutions Status */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Top Benchmark Alignments
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 p-2.5">
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">UNILAG Akoka</span>
                          <span className="font-bold text-slate-900 dark:text-white">290+ Cut-Off Target</span>
                        </div>
                        <div className="rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 p-2.5">
                          <span className="text-slate-500 dark:text-slate-400 block text-[10px]">UI Ibadan</span>
                          <span className="font-bold text-slate-900 dark:text-white">285+ Cut-Off Target</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono flex items-center justify-between">
                        <span>Standard 4-Subject Blueprints</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">● 100% 8-Key Ready</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. O LEVEL CANDIDATES: Stream Selector & Syllabus Telemetry */}
                {activeTrack.id === "olevel" && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-300 mb-1.5">
                        Select Academic Stream:
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(["science", "arts", "commercial"] as const).map((stream) => (
                          <button
                            key={stream}
                            type="button"
                            onClick={() => setSecondaryStream(stream)}
                            className={`py-2 px-2 rounded-xl text-xs capitalize font-bold transition-all cursor-pointer ${
                              secondaryStream === stream
                                ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30 scale-102"
                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800"
                            }`}
                          >
                            {stream}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Syllabus Progress Rings / Bars */}
                    <div className="space-y-2.5 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-slate-950/60 p-4">
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                        NERDC Syllabus Topic Coverage
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-900 dark:text-white font-medium">General Mathematics</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">100% Tracked</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full w-[94%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-900 dark:text-white font-medium">English Lexis &amp; Structure</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">100% Tracked</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full w-[88%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-900 dark:text-white font-medium">
                            {secondaryStream === "science"
                              ? "Physics & Chemistry Theory"
                              : secondaryStream === "commercial"
                              ? "Financial Accounting & Commerce"
                              : "Literature & Government"}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">Full Derivations</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full w-[92%]" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-emerald-100/70 border border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/40 p-2.5 text-[11px] text-emerald-900 dark:text-emerald-200">
                      Includes verified 2015–2026 WAEC &amp; NECO past questions with detailed theory step-by-step marking schemes.
                    </div>
                  </div>
                )}

                {/* 3. POST-UTME CANDIDATES: Composite Aggregate Admission Calculator */}
                {activeTrack.id === "post_utme" && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-300 mb-1.5">
                        Target Screening University:
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "unilag", label: "UNILAG" },
                          { id: "ui", label: "UI Ibadan" },
                          { id: "oau", label: "OAU Ife" },
                        ].map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setTargetUni(u.id as "unilag" | "ui" | "oau")}
                            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              targetUni === u.id
                                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30 scale-102"
                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800"
                            }`}
                          >
                            {u.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Post-UTME Projected Score Slider */}
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-300 mb-1">
                        <span>Projected Screening Score:</span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
                          {projectedPostUtme} / 30 Pts
                        </span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="30"
                        step="1"
                        value={projectedPostUtme}
                        onChange={(e) => setProjectedPostUtme(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                      />
                    </div>

                    {/* Composite Aggregate Breakdown Card */}
                    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-50/70 to-white dark:from-amber-950/30 dark:to-slate-950/80 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Composite Admission Aggregate
                        </span>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                          {targetUni.toUpperCase()} Model
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-black text-slate-950 dark:text-white">
                          {compositeAggregate}%
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          {compositeAggregate >= 80 ? "Direct Merit Threshold" : "Competitive Range"}
                        </span>
                      </div>

                      {/* Formula contributions */}
                      <div className="grid grid-cols-3 gap-1.5 text-center pt-1 border-t border-slate-200 dark:border-white/10 text-[10px]">
                        <div className="p-1 rounded bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-white/5">
                          <span className="text-slate-500 dark:text-slate-400 block">UTME (50%)</span>
                          <span className="font-bold text-slate-900 dark:text-white">{utmeContribution}</span>
                        </div>
                        <div className="p-1 rounded bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-white/5">
                          <span className="text-slate-500 dark:text-slate-400 block">Screening (30%)</span>
                          <span className="font-bold text-slate-900 dark:text-white">{postUtmeContribution}</span>
                        </div>
                        <div className="p-1 rounded bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-white/5">
                          <span className="text-slate-500 dark:text-slate-400 block">O-Level (20%)</span>
                          <span className="font-bold text-slate-900 dark:text-white">{olevelContribution}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-amber-100/70 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-800/40 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between">
                      <span>Timed Sprint Mode:</span>
                      <span className="font-mono font-bold">30 Mins &bull; 40 Questions</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. MULTI-PATHWAY QUICK ACCESS DOCK (Preserving aud.cta.href for architecture tests) */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {HOMEPAGE_CONTENT_CONFIG.audiences.map((aud) => {
            return (
              <div
                key={aud.id}
                className="rounded-2xl p-4 transition-all duration-200 border bg-slate-50/80 border-slate-200/80 hover:border-slate-300 hover:bg-white shadow-2xs dark:bg-slate-900/40 dark:border-white/5 dark:hover:border-white/15 dark:hover:bg-slate-900/70"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-slate-800 dark:text-cyan-400 dark:border-white/10"
                    aria-hidden="true"
                  >
                    <AudienceIcon type={aud.id} className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase font-bold">
                    Partner Access
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-950 dark:text-white mb-2 line-clamp-1">
                  {aud.label}
                </div>
                <Link
                  href={aud.cta.href}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors bl-focus-ring"
                >
                  <span>Explore Pathway</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
