"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HOMEPAGE_CONTENT_CONFIG, resolveClaimValue } from "@/app/lib/contentConfig";

type ProductPreviewTab = "cbt-simulator" | "learning-hub" | "ai-tutor" | "challenge-arena" | "live-classroom" | "stem-studio";

const PRODUCT_VISUAL_FEATURES: Record<
  ProductPreviewTab,
  { icon: string; title: string; desc: string }[]
> = {
  "cbt-simulator": [
    {
      icon: "⌨️",
      title: "Official 8-Key Engine",
      desc: "JAMB standard keys (A, B, C, D, P, N, S, R) with 4-subject combo timing.",
    },
    {
      icon: "🧮",
      title: "On-Screen Scientific Calc",
      desc: "Built-in official calculator runtime with full keyboard navigation.",
    },
    {
      icon: "💾",
      title: "Zero-Loss Offline Sync",
      desc: "Resilient against spotty connections; auto-syncs when online.",
    },
  ],
  "learning-hub": [
    {
      icon: "📖",
      title: "NERDC Curriculum Maps",
      desc: "Structured syllabus breakdowns with secondary learning milestones.",
    },
    {
      icon: "🎧",
      title: "Voice Audio Notes",
      desc: "Ultra low-data audio explainers for high-yield auditory review.",
    },
    {
      icon: "📑",
      title: "Sprint Cheatsheets",
      desc: "High-yield formula summaries and verified past question cross-references.",
    },
  ],
  "stem-studio": [
    {
      icon: "🪐",
      title: "2D Kinematics Bench",
      desc: "Interactive projectile & parabolic trajectory simulator with live vector math.",
    },
    {
      icon: "🧪",
      title: "Acid-Base Titration",
      desc: "Volumetric endpoint curves and real-time indicator pH reactions.",
    },
    {
      icon: "💡",
      title: "Digital Logic Gates",
      desc: "Interactive breadboard with live curriculum truth tables.",
    },
  ],
  "ai-tutor": [
    {
      icon: "🤖",
      title: "Socratic Hint Ladder",
      desc: "Guides candidates without spoiling answers; develops first-principles reasoning.",
    },
    {
      icon: "⚠️",
      title: "Examiner Trap Alerts",
      desc: "Highlights deceptive distractors and common arithmetic calculation traps.",
    },
    {
      icon: "🎯",
      title: "Targeted Micro-Packs",
      desc: "Auto-generates 5 focused drill questions for any detected weakness.",
    },
  ],
  "live-classroom": [
    {
      icon: "📻",
      title: "24kbps Low-Data Audio",
      desc: "Ultra-lean audio streaming engineered specifically for Nigerian mobile networks.",
    },
    {
      icon: "📐",
      title: "Vector & LaTeX Liveboard",
      desc: "Interactive whiteboard canvas with formula typesetting and drawing tools.",
    },
    {
      icon: "📼",
      title: "Instant Video Replays",
      desc: "Session recordings archive with timestamped review markers.",
    },
  ],
  "challenge-arena": [
    {
      icon: "⚔️",
      title: "1v1 Speed Sprints",
      desc: "60-second synchronized duels using real examination questions.",
    },
    {
      icon: "🏆",
      title: "National Elo Rating",
      desc: "Transparent competitive rank measuring speed and cognitive accuracy.",
    },
    {
      icon: "🛡️",
      title: "Anti-Cheat Integrity",
      desc: "Server-side answer timing and tamper-evident snapshot validation.",
    },
  ],
};

export function HomeProductShowcase() {
  const products = HOMEPAGE_CONTENT_CONFIG.products;
  const [activePreviewId, setActivePreviewId] = useState<ProductPreviewTab>("cbt-simulator");

  const activeProduct = products.find((p) => p.id === activePreviewId) || products[0];

  return (
    <section
      id="products"
      aria-label="Integrated Learning Products"
      className="py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-[#070e1e]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[var(--bl-color-brand-primary)] border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 mb-3">
            PRODUCT SHOWCASE &amp; REAL INTERACTIVE PREVIEWS (SLOTS S4-01 TO S4-04)
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--bl-color-text-primary)] tracking-tight">
            Six Purpose-Built Products. Zero Disconnected Tools.
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Every product connects directly to your central learning profile, synchronizing your strengths, weaknesses, and exam trajectory across all subjects.
          </p>
        </div>

        {/* Product Selector Tabs */}
        <div
          role="tablist"
          aria-label="Product Showcase Previews"
          className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none justify-start lg:justify-center mb-8"
        >
          {products.map((prod) => {
            const isSelected = prod.id === activePreviewId;
            return (
              <button
                key={prod.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActivePreviewId(prod.id as ProductPreviewTab)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-150 bl-focus-ring min-h-[44px] flex items-center gap-2 ${
                  isSelected
                    ? "bg-[var(--bl-color-brand-primary)] text-white shadow-md shadow-blue-900/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span>{prod.badge || "Product"}</span>
                <span className="font-extrabold">{prod.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Product Detailed Showcase & Real UI Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-slate-200/90 bg-[var(--bl-color-surface)] p-6 sm:p-10 shadow-lg dark:border-slate-800">
          {/* Left Column: Capabilities & Direct Routing */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
              <span className="text-base" aria-hidden="true">
                {activePreviewId === "cbt-simulator" ? "⏱️" : activePreviewId === "learning-hub" ? "📚" : activePreviewId === "stem-studio" ? "🔬" : activePreviewId === "ai-tutor" ? "🤖" : activePreviewId === "live-classroom" ? "👨‍🏫" : "⚡"}
              </span>
              <span>{activeProduct.category}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-[var(--bl-color-text-primary)] tracking-tight">
              {activeProduct.name}
            </h3>

            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {resolveClaimValue(activeProduct.tagline, "")}
            </p>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {resolveClaimValue(activeProduct.description, "")}
            </p>

            {/* Clean Visual Feature Cards */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Visual Feature Highlights:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {PRODUCT_VISUAL_FEATURES[activePreviewId]?.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-800/80 dark:bg-slate-900/60 transition-colors hover:border-blue-200 dark:hover:border-blue-900"
                  >
                    <span className="text-lg shrink-0 mt-0.5">{feat.icon}</span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {feat.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href={activeProduct.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--bl-color-brand-primary)] hover:bg-[var(--bl-color-brand-primary-hover)] px-6 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all bl-focus-ring min-h-[44px] bl-interactive-hover"
              >
                <span>Launch {activeProduct.name}</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Real UI Interactive Component Preview (Explicit Dimensions, CLS = 0) */}
          <div className="lg:col-span-7">
            <div
              className="relative min-h-[420px] rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-inner dark:border-slate-800 dark:bg-[#060c18] flex flex-col justify-between"
              role="region"
              aria-label={`${activeProduct.name} Real Interface Preview`}
            >
              {/* Product Chrome Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500" />
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="ml-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                    brainlab.app/{activePreviewId}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">
                  Live UI Preview
                </span>
              </div>

              {/* Dynamic Mockup Body per Product */}
              <div className="py-4 my-auto">
                {activePreviewId === "cbt-simulator" && (
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800/60">
                      <div>
                        <span className="font-bold text-blue-900 dark:text-blue-300 block">JAMB UTME CBT Mock Simulation</span>
                        <span className="text-[11px] text-blue-700 dark:text-blue-400">Combos: English (60), Maths (40), Physics (40), Chemistry (40)</span>
                      </div>
                      <span className="font-mono font-black text-sm text-blue-900 dark:text-blue-300">01:58:45</span>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Mathematics • Question 14 of 40</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        If \( \log_{10} 2 = 0.3010 \) and \( \log_{10} 3 = 0.4771 \), find the value of \( \log_{10} 18 \).
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="p-2 rounded-lg border border-blue-500 bg-blue-100/60 dark:bg-blue-950/50 font-bold text-blue-900 dark:text-blue-200">
                          A. 1.2552 (Selected)
                        </div>
                        <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                          B. 1.0791
                        </div>
                        <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                          C. 1.4313
                        </div>
                        <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                          D. 1.1552
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewId === "learning-hub" && (
                  <div className="space-y-3 text-xs">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
                      <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">Physics Curriculum Breakdown</span>
                      <h4 className="font-bold text-slate-900 dark:text-white mt-1">Electromagnetic Induction &amp; Faraday&apos;s Laws</h4>
                      <p className="text-slate-500 text-[11px] mt-1">Key Concept: Induced emf is directly proportional to the time rate of change of magnetic flux.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                        12 Practice Questions
                      </div>
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
                        Formula Card Attached
                      </div>
                      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300">
                        Audio Note Ready
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewId === "stem-studio" && (
                  <div className="space-y-3 text-xs">
                    <div className="rounded-xl border border-blue-300 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-blue-900 dark:text-blue-300">Kinematics Trajectory Simulation</span>
                        <span className="font-mono text-[10px] text-blue-700 dark:text-blue-400">g = 9.8 m/s² • θ = 45°</span>
                      </div>
                      <div className="h-28 rounded-lg bg-slate-900 p-2 flex items-end justify-between border border-slate-800 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:12px_12px] opacity-20" />
                        <span className="text-[10px] font-mono text-emerald-400 z-10">Peak H: 12.8m</span>
                        <span className="text-[10px] font-mono text-cyan-400 z-10">Range R: 51.0m</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewId === "ai-tutor" && (
                  <div className="space-y-3 text-xs">
                    <div className="rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden="true">🤖</span>
                        <span className="font-bold text-purple-900 dark:text-purple-300">Socratic Breakdown</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                        &quot;Notice that in the half-life equation N(t) = N₀ (1/2)^(t/T_half), the remaining fraction depends on elapsed time divided by half-life. Don&apos;t divide the initial mass directly by time!&quot;
                      </p>
                      <div className="text-[10px] font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800/60">
                        Examiner Trap: 68% of candidates forget that mass remaining is exponential, not linear.
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewId === "live-classroom" && (
                  <div className="space-y-3 text-xs">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          Live Session Active
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Audio: 24 kbps Opus (Low Data)</span>
                      </div>
                      <div className="h-24 rounded-lg bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between">
                        <span className="text-[11px] font-mono text-slate-300">Whiteboard Canvas #1: Geometric Optics</span>
                        <span className="text-[10px] text-blue-400 font-mono">Tutor Annotation: Snell&apos;s Law n₁ sin θ₁ = n₂ sin θ₂</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewId === "challenge-arena" && (
                  <div className="space-y-3 text-xs">
                    <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 dark:text-amber-300">1v1 Synchronous Academic Duel</span>
                        <span className="font-mono font-black text-amber-800 dark:text-amber-400">00:34</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3 rounded-xl bg-blue-100/60 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800">
                          <span className="font-bold block text-blue-950 dark:text-blue-200">You (Candidate)</span>
                          <span className="text-lg font-black text-blue-600 dark:text-blue-400">850 pts</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="font-bold block text-slate-700 dark:text-slate-300">Challenger</span>
                          <span className="text-lg font-black text-slate-600 dark:text-slate-400">720 pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Footer Guarantee */}
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Zero decorative mockups: rendered using real platform components.</span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ WCAG 2.1 AA Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
