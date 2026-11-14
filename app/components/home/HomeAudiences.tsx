"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";

function AudienceIcon({ type, className = "h-4 w-4" }: { type: string; className?: string }) {
  switch (type) {
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
    case "secondary":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10M6 10h10" />
        </svg>
      );
    case "stem":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 2v7.31L4.2 18.24A2 2 0 0 0 5.86 21h12.28a2 2 0 0 0 1.66-2.76L14 9.31V2" />
          <path d="M8.5 2h7" />
        </svg>
      );
    case "independent":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
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
    case "3d":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case "sliders":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      );
    case "lab":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 2v14a6 6 0 0 0 12 0V2" />
          <line x1="6" y1="6" x2="18" y2="6" />
        </svg>
      );
    case "arena":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polygon points="12 6 14.5 10.5 19 11.5 15.5 15 16.5 19.5 12 17 7.5 19.5 8.5 15 5 11.5 9.5 10.5 12 6" />
        </svg>
      );
    case "socratic":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
        </svg>
      );
    case "credentials":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
      );
    default:
      return null;
  }
}

export function HomeAudiences() {
  const audiences = HOMEPAGE_CONTENT_CONFIG.audiences;
  const [activeAudienceId, setActiveAudienceId] = useState<string>("students");

  // Interactive state for Students simulator widget
  const [targetScore, setTargetScore] = useState<number>(290);
  // Interactive state for Secondary stream selector
  const [secondaryStream, setSecondaryStream] = useState<"science" | "arts" | "commercial">("science");
  // Interactive state for STEM simulation
  const [stemEnergy, setStemEnergy] = useState<number>(3);
  // Interactive state for Challenge Arena
  const [isMatchReady, setIsMatchReady] = useState<boolean>(true);

  const AUDIENCE_METADATA: Record<
    string,
    {
      icon: string;
      tag: string;
      themeColor: string;
      glowGradient: string;
      accentBg: string;
      features: { icon: string; title: string; desc: string }[];
      badge: string;
    }
  > = {
    students: {
      icon: "students",
      tag: "UTME & JAMB Candidates",
      themeColor: "text-cyan-400",
      glowGradient: "from-blue-600/20 via-cyan-500/10 to-transparent",
      accentBg: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
      badge: "JAMB 2027 Blueprint Ready",
      features: [
        {
          icon: "keyboard",
          title: "Authentic 8-Key Exam Parity",
          desc: "Practice with the exact A, B, C, D, P, N, S, R keyboard controls used in the official CBT center.",
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
    secondary: {
      icon: "secondary",
      tag: "SS1–SS3, WAEC & NECO",
      themeColor: "text-emerald-400",
      glowGradient: "from-emerald-600/20 via-teal-500/10 to-transparent",
      accentBg: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      badge: "NERDC Curriculum Standard",
      features: [
        {
          icon: "curriculum",
          title: "Science, Arts & Commercial Streams",
          desc: "Comprehensive syllabi with structured lessons, definitions, formula sheets, and solved examples.",
        },
        {
          icon: "theory",
          title: "Master Step-by-Step Derivations",
          desc: "Detailed working for WAEC & NECO theory and objective papers across all secondary grades.",
        },
        {
          icon: "diagnostic",
          title: "Topic-by-Topic Mastery Diagnostic",
          desc: "Pinpoint exact syllabus gaps before term exams with continuous diagnostic tracking.",
        },
      ],
    },
    stem: {
      icon: "stem",
      tag: "STEM & Science Explorers",
      themeColor: "text-indigo-400",
      glowGradient: "from-indigo-600/20 via-purple-500/10 to-transparent",
      accentBg: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
      badge: "60 FPS Interactive Labs",
      features: [
        {
          icon: "3d",
          title: "Interactive 3D Virtual Science",
          desc: "Rotate molecules, trigger logic circuits, and launch projectile vectors with real physical laws.",
        },
        {
          icon: "sliders",
          title: "Kinesthetic Parameter Sliders",
          desc: "Manipulate angles, pH levels, and voltage in real time to transform abstract equations into intuition.",
        },
        {
          icon: "lab",
          title: "WAEC Alternative to Practical",
          desc: "Virtual apparatus simulations bridging classroom theory directly with laboratory CBT tests.",
        },
      ],
    },
    independent: {
      icon: "independent",
      tag: "Competition & Self-Paced",
      themeColor: "text-amber-400",
      glowGradient: "from-amber-600/20 via-rose-500/10 to-transparent",
      accentBg: "border-amber-500/30 bg-amber-500/10 text-amber-300",
      badge: "National Synchronous Elo",
      features: [
        {
          icon: "arena",
          title: "1v1 National Speed Arena",
          desc: "Challenge peers across Nigeria in live synchronous sprint battles with Elo rating progression.",
        },
        {
          icon: "socratic",
          title: "Socratic AI Learning Assistant",
          desc: "Get intelligent hints and concept breakthroughs without having the final answers spoiled.",
        },
        {
          icon: "credentials",
          title: "Verified Skills Passports",
          desc: "Earn digital verifiable academic credentials and milestone achievement certificates.",
        },
      ],
    },
  };

  const activeAudience =
    audiences.find((a) => a.id === activeAudienceId) || audiences[0];
  const activeMeta = AUDIENCE_METADATA[activeAudience.id] || AUDIENCE_METADATA.students;

  const headline = resolveClaimValue(
    activeAudience.headline,
    "Tailored Academic Excellence for Every Pathway"
  );
  const body = resolveClaimValue(
    activeAudience.body,
    "Explore dedicated curriculum tools, timed exam simulators, and visual learning aids."
  );

  return (
    <section
      id="audiences"
      aria-label="Tailored Experiences for Every Learner"
      className="scroll-mt-20 sm:scroll-mt-24 relative w-full overflow-hidden py-14 sm:py-20 border-b border-white/10"
    >
      {/* Dynamic Ambient Lighting */}
      <div
        className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r ${activeMeta.glowGradient} blur-[140px] opacity-75 transition-all duration-700`}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Refined Editorial Voice */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-blue-500/10 text-cyan-300 border border-blue-400/30 mb-3 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>LEARNER-FIRST ACADEMIC ECOSYSTEM</span>
          </span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Engineered Specifically for How You Learn
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Choose your academic path below to explore tailored simulation engines, real-time diagnostic telemetry, and targeted learning tools.
          </p>
        </div>

        {/* 1. INTERACTIVE PERSONA SELECTOR STRIP (NO BORING BOXES) */}
        <div
          role="tablist"
          aria-label="Academic Learner Pathways"
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8 sm:mb-12"
        >
          {audiences.map((aud) => {
            const meta = AUDIENCE_METADATA[aud.id] || AUDIENCE_METADATA.students;
            const isActive = aud.id === activeAudienceId;

            return (
              <button
                key={aud.id}
                role="tab"
                id={`tab-${aud.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${aud.id}`}
                type="button"
                onClick={() => setActiveAudienceId(aud.id)}
                className={`group relative flex items-center gap-2.5 rounded-2xl px-4 sm:px-6 py-3 text-xs sm:text-sm font-bold transition-all duration-300 bl-focus-ring cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xl shadow-cyan-950/40 border-2 border-cyan-400/80 scale-102"
                    : "bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-white/10"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-cyan-300 border border-white/10 shrink-0 transition-transform group-hover:scale-105" aria-hidden="true">
                  <AudienceIcon type={meta.icon} className="h-3.5 w-3.5" />
                </span>
                <span className="font-extrabold tracking-tight">{meta.tag}</span>
                {isActive && (
                  <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-xs shadow-cyan-400 animate-pulse ml-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* 2. THE WIDESCREEN INTERACTIVE PERSONA CANVAS */}
        <div
          role="tabpanel"
          id={`panel-${activeAudience.id}`}
          aria-labelledby={`tab-${activeAudience.id}`}
          className="relative rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-[#081226]/90 to-[#040814]/95 p-6 sm:p-10 lg:p-12 shadow-2xl backdrop-blur-xl transition-all duration-500 overflow-hidden"
        >
          {/* Subtle Top Gradient Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* LEFT COLUMN: Editorial Value & Feature Highlights */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border ${activeMeta.accentBg}`}>
                  <AudienceIcon type={activeMeta.icon} className="h-3.5 w-3.5" />
                  <span>{activeMeta.badge}</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Dedicated Pathway
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                {headline}
              </h3>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {body}
              </p>

              {/* High-Contrast Illustrated Feature Modules (Not Generic Bullets) */}
              <div className="space-y-3 pt-2">
                {activeMeta.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 sm:p-4 transition-all hover:border-white/20 hover:bg-slate-950/80 shadow-xs"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-white/15 text-cyan-300 shadow-inner">
                      <AudienceIcon type={feat.icon} className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-xs sm:text-sm font-bold text-white tracking-tight">
                        {feat.title}
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed">
                        {feat.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Direct Pathway Action */}
              <div className="pt-3 flex flex-wrap items-center gap-4">
                <Link
                  href={activeAudience.cta.href}
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-teal-300 active:translate-y-0.5 px-6 sm:px-8 py-3.5 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/25 transition-all bl-focus-ring min-h-[48px]"
                >
                  <span>{activeAudience.cta.label}</span>
                  <span aria-hidden="true" className="text-base font-bold">&rarr;</span>
                </Link>

                <span className="text-xs text-slate-400 font-mono">
                  100% Free Starter Access &bull; No Credit Card Required
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: Bespoke Interactive Live Simulator Widget */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/15 bg-[#030712]/90 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                {/* Glow pill header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                      Live Pathway Preview Engine
                    </span>
                  </div>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                    Interactive
                  </span>
                </div>

                {/* 1. STUDENT PERSONA: Interactive Target Score & University Dial */}
                {activeAudience.id === "students" && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <div className="text-xs font-bold text-slate-300 mb-1.5 flex justify-between">
                        <span>Select Target UTME Score:</span>
                        <span className="font-mono text-cyan-400 font-black">{targetScore} / 400</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[260, 290, 320].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setTargetScore(score)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                              targetScore === score
                                ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30"
                                : "bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800"
                            }`}
                          >
                            {score}+ Target
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Radial Admission Gauge Preview */}
                    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/40 to-slate-950/60 p-4 text-center">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Admission Merit Probability
                      </div>
                      <div className="text-3xl font-black text-white mt-1">
                        {targetScore >= 310
                          ? "96% High Merit"
                          : targetScore >= 285
                          ? "88% Competitive"
                          : "74% Qualified"}
                      </div>
                      <p className="text-[11px] text-cyan-300 mt-1">
                        {targetScore >= 290
                          ? "Direct merit qualification for UNILAG, UI, and OAU Tier-1 programs."
                          : "Strong standing for Federal institution admission with targeted CBT practice."}
                      </p>
                    </div>

                    {/* Target Institutions Status */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Top Benchmark Alignments
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-900/80 border border-white/10 p-2">
                          <span className="text-slate-400 block text-[10px]">UNILAG Akoka</span>
                          <span className="font-bold text-white">290+ Cut-Off Target</span>
                        </div>
                        <div className="rounded-lg bg-slate-900/80 border border-white/10 p-2">
                          <span className="text-slate-400 block text-[10px]">UI Ibadan</span>
                          <span className="font-bold text-white">285+ Cut-Off Target</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                        <span>Standard 4-Subject Blueprints</span>
                        <span className="text-emerald-400 font-bold">● 100% 8-Key Ready</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SECONDARY PERSONA: Curriculum Track & Subject Streams */}
                {activeAudience.id === "secondary" && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <div className="text-xs font-bold text-slate-300 mb-1.5">
                        Select Secondary Academic Stream:
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(["science", "arts", "commercial"] as const).map((stream) => (
                          <button
                            key={stream}
                            type="button"
                            onClick={() => setSecondaryStream(stream)}
                            className={`py-1.5 px-2 rounded-xl text-xs capitalize font-bold transition-all ${
                              secondaryStream === stream
                                ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30"
                                : "bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800"
                            }`}
                          >
                            {stream}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Progress Rings / Bars */}
                    <div className="space-y-2.5 rounded-xl border border-emerald-500/20 bg-slate-950/60 p-4">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        NERDC Syllabus Topic Coverage
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white font-medium">General Mathematics</span>
                          <span className="text-emerald-400 font-mono font-bold">100% Tracked</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full w-[94%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white font-medium">English Lexis &amp; Structure</span>
                          <span className="text-emerald-400 font-mono font-bold">100% Tracked</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-teal-400 rounded-full w-[88%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white font-medium">
                            {secondaryStream === "science"
                              ? "Physics & Chemistry Theory"
                              : secondaryStream === "commercial"
                              ? "Financial Accounting & Commerce"
                              : "Literature & Government"}
                          </span>
                          <span className="text-emerald-400 font-mono font-bold">Full Derivations</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-cyan-400 rounded-full w-[92%]" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/40 p-2.5 text-[11px] text-emerald-200">
                      📖 Includes verified 2015–2026 WAEC &amp; NECO past questions with detailed theory step-by-step marking schemes.
                    </div>
                  </div>
                )}

                {/* 3. STEM PERSONA: 3D Molecule & Physics Sandbox */}
                {activeAudience.id === "stem" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Molecular Resonance Model:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Energy Level:</span>
                        {[1, 2, 3].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setStemEnergy(lvl)}
                            className={`h-6 w-6 rounded-md text-xs font-mono font-bold ${
                              stemEnergy === lvl
                                ? "bg-indigo-500 text-white font-black"
                                : "bg-slate-900 border border-white/10 text-slate-400"
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Animated Geometric Molecular SVG */}
                    <div className="relative rounded-xl border border-indigo-500/20 bg-slate-950/80 p-4 flex items-center justify-center h-40">
                      <svg viewBox="0 0 200 120" className="w-48 h-32 overflow-visible">
                        {/* Orbital rings */}
                        <ellipse
                          cx="100"
                          cy="60"
                          rx={stemEnergy * 25}
                          ry="20"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="1.5"
                          strokeDasharray="4,3"
                          className="animate-spin"
                          style={{ animationDuration: `${6 / stemEnergy}s` }}
                        />
                        <ellipse
                          cx="100"
                          cy="60"
                          rx="20"
                          ry={stemEnergy * 20}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          strokeDasharray="4,3"
                          className="animate-spin"
                          style={{ animationDuration: `${4 / stemEnergy}s` }}
                        />
                        {/* Central Nucleus */}
                        <circle cx="100" cy="60" r="14" fill="#4f46e5" />
                        <circle cx="98" cy="58" r="4" fill="#a5f3fc" />
                        {/* Orbiting valence particles */}
                        <circle cx={100 + stemEnergy * 20} cy="60" r="4" fill="#fbbf24" />
                        <circle cx="100" cy={60 - stemEnergy * 15} r="4" fill="#34d399" />
                      </svg>
                      <span className="absolute bottom-2 right-3 text-[10px] font-mono text-cyan-300">
                        Benzene / C₆H₆ Pi Cloud
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-slate-900 border border-white/10 p-2">
                        <span className="text-[10px] text-slate-400 block uppercase">Hybridization</span>
                        <span className="font-mono font-bold text-indigo-300">sp² Planar</span>
                      </div>
                      <div className="rounded-lg bg-slate-900 border border-white/10 p-2">
                        <span className="text-[10px] text-slate-400 block uppercase">Bond Angle</span>
                        <span className="font-mono font-bold text-cyan-300">120.0° Fixed</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. INDEPENDENT / COMPETITION: Live 1v1 Arena HUD */}
                {activeAudience.id === "independent" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Synchronous 1v1 Matchmaker:</span>
                      <span className="flex items-center gap-1 font-mono text-emerald-400 text-[11px] font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active Duels
                      </span>
                    </div>

                    {/* Match Card */}
                    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-slate-950/80 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-400/30">
                            YOU
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white">Challenger #284</div>
                            <div className="text-[10px] text-amber-300 font-mono">Elo 1420 &bull; Rank #14</div>
                          </div>
                        </div>

                        <span className="text-xs font-black text-rose-400 animate-pulse">VS</span>

                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <div className="text-xs font-bold text-white">David O.</div>
                            <div className="text-[10px] text-slate-400 font-mono">ABU Aspirant</div>
                          </div>
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 font-bold text-xs border border-white/10">
                            DO
                          </span>
                        </div>
                      </div>

                      <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full w-[65%]" />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-300">
                        <span>Sprint Topic: JAMB Use of English</span>
                        <span className="text-amber-400 font-bold">🏆 8-Win Streak</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMatchReady(!isMatchReady)}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      {isMatchReady ? "⚡ Enter Next 60-Second Arena Duel" : "Matchmaking Queued..."}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. MULTI-PATHWAY QUICK ACCESS DOCK (DISCOVERABLE JUMP TRAY) */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {audiences.map((aud) => {
            const meta = AUDIENCE_METADATA[aud.id] || AUDIENCE_METADATA.students;
            const isCurrent = aud.id === activeAudienceId;

            return (
              <div
                key={aud.id}
                className={`rounded-2xl p-4 transition-all duration-200 border ${
                  isCurrent
                    ? "bg-slate-900/90 border-cyan-400/40 shadow-lg"
                    : "bg-slate-900/40 border-white/5 hover:border-white/15 hover:bg-slate-900/70"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-cyan-400 border border-white/10" aria-hidden="true">
                    <AudienceIcon type={meta.icon} className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">
                    {aud.label}
                  </span>
                </div>
                <div className="text-xs font-bold text-white mb-2 line-clamp-1">
                  {meta.tag}
                </div>
                <Link
                  href={aud.cta.href}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors bl-focus-ring"
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
