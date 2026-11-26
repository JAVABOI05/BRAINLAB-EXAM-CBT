"use client";

import React, { useState } from "react";
import Link from "next/link";

interface ProductEngine {
  slug: string;
  href: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  tagline: string;
  description: string;
  keyFeatures: string[];
  ctaLabel: string;
  portalTarget: string;
  portalLabel: string;
  accentColor: string;
  lightBg: string;
  darkBorder: string;
  statsLabel: string;
  statsValue: string;
}

export const PRODUCTS_LIST: ProductEngine[] = [
  {
    slug: "cbt",
    href: "/products/cbt",
    badge: "Official Examination Simulation",
    badgeColor: "bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-cyan-300 border-blue-200 dark:border-blue-800",
    title: "JAMB UTME CBT Simulator",
    subtitle: "Authentic 4-Subject Timed Cockpit",
    tagline: "Replicate the exact pressure, 8-key interface, and pacing of the JAMB CBT centre before your official exam day.",
    description:
      "Featuring official 4-subject papers, 2-hour countdown timers, built-in digital calculators, offline answer caching for unstable networks, and step-by-step post-exam worked explanations.",
    keyFeatures: [
      "Standard 180-question 4-subject papers",
      "Standardized 400-mark scoring with percentile rank",
      "Offline auto-sync queue for unstable Nigerian 3G/4G",
      "Integrated on-screen scientific calculator",
    ],
    ctaLabel: "Learn about CBT Practice",
    portalTarget: "/cbt",
    portalLabel: "Launch Simulator",
    accentColor: "from-blue-600 to-cyan-500",
    lightBg: "bg-blue-50/50",
    darkBorder: "dark:border-blue-500/30",
    statsLabel: "Exam Fidelity",
    statsValue: "JAMB 8-Key Ready",
  },
  {
    slug: "learning-hub",
    href: "/products/learning-hub",
    badge: "Curriculum & Syllabus Mastery",
    badgeColor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    title: "Curriculum Learning Hub",
    subtitle: "Structured Syllabus Modules & Reading Guides",
    tagline: "Master difficult secondary and UTME subjects through structured modules aligned directly to official examination boards.",
    description:
      "Review detailed topic summaries, specific learning objectives, and recommended reading texts across Science, Commercial, and Art disciplines, deep-linked directly to relevant past questions.",
    keyFeatures: [
      "Full coverage of Science, Commercial & Art subjects",
      "Specific learning goals and subtopic breakdowns",
      "Official recommended textbook bibliographies",
      "Seamless deep-links to relevant CBT past questions",
    ],
    ctaLabel: "Learn about Learning Hub",
    portalTarget: "/learn",
    portalLabel: "Open Curriculum",
    accentColor: "from-emerald-600 to-teal-500",
    lightBg: "bg-emerald-50/50",
    darkBorder: "dark:border-emerald-500/30",
    statsLabel: "Board Alignment",
    statsValue: "JAMB / WAEC / NECO",
  },
  {
    slug: "ai-learning",
    href: "/products/ai-learning",
    badge: "Adaptive AI Diagnostics",
    badgeColor: "bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    title: "AI Study Studio & Diagnostics",
    subtitle: "Misconception Analysis & Spaced Recall",
    tagline: "Transform mock examination mistakes into permanent mastery with intelligent diagnosis and micro-drills.",
    description:
      "Our AI diagnostic engine analyzes your answer patterns, flags specific topic blind spots, and automatically generates targeted 5-question reinforcement drills to close gaps before exam day.",
    keyFeatures: [
      "Automated misconception analysis on mock errors",
      "Targeted 5-question reinforcement drills",
      "SM-2 spaced repetition daily formula flashcards",
      "Step-by-step mathematical & scientific reasoning",
    ],
    ctaLabel: "Learn about AI Diagnostics",
    portalTarget: "/ai-learning",
    portalLabel: "Launch AI Studio",
    accentColor: "from-purple-600 to-pink-500",
    lightBg: "bg-purple-50/50",
    darkBorder: "dark:border-purple-500/30",
    statsLabel: "Recall Algorithm",
    statsValue: "SM-2 Spaced Recall",
  },
  {
    slug: "live-classroom",
    href: "/products/live-classroom",
    badge: "Synchronized Live Stage",
    badgeColor: "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    title: "Live Classroom & Whiteboard Stage",
    subtitle: "Interactive Lectures with Vector Chalkboard",
    tagline: "Join scheduled interactive classes hosted by experienced subject educators with real-time digital chalkboards.",
    description:
      "Experience multi-surface digital chalkboards, coordinate graphing planes, live checkpoint comprehension quizzes, and low-data recorded audio breakdowns.",
    keyFeatures: [
      "Multi-canvas whiteboard: chalkboard, grid & lined notebook",
      "Ultra-low latency live presentation sync",
      "Instant student comprehension checkpoint polls",
      "Low-bandwidth audio recordings for offline replay",
    ],
    ctaLabel: "Learn about Live Classroom",
    portalTarget: "/classroom",
    portalLabel: "Enter Classroom",
    accentColor: "from-amber-600 to-orange-500",
    lightBg: "bg-amber-50/50",
    darkBorder: "dark:border-amber-500/30",
    statsLabel: "Canvas Modes",
    statsValue: "Chalkboard & Grid",
  },
  {
    slug: "stem-studio",
    href: "/products/stem-studio",
    badge: "Virtual Laboratory Suite",
    badgeColor: "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    title: "STEM Studio Virtual Labs",
    subtitle: "Interactive Physics, Chemistry & Circuit Benches",
    tagline: "Bridge the gap between theoretical textbook formulas and practical understanding with real-time interactive models.",
    description:
      "Experiment with real-time interactive models covering parabolic kinematics, DC circuit resistance, acid-base pH curves, genetics Punnett squares, and Boolean logic gates.",
    keyFeatures: [
      "5 interactive multi-disciplinary simulation benches",
      "Real-time slider parameter controls & mathematical telemetry",
      "Synchronized tutor presentation and student exploration modes",
      "Direct linkage from experiment findings to UTME CBT drills",
    ],
    ctaLabel: "Learn about STEM Studio",
    portalTarget: "/classroom/stem",
    portalLabel: "Enter STEM Lab",
    accentColor: "from-cyan-600 to-blue-500",
    lightBg: "bg-cyan-50/50",
    darkBorder: "dark:border-cyan-500/30",
    statsLabel: "Framerate",
    statsValue: "60 FPS Telemetry",
  },
  {
    slug: "challenge-arena",
    href: "/products/challenge-arena",
    badge: "Gamified Academic Arena",
    badgeColor: "bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    title: "Academic Challenge Arena",
    subtitle: "Daily Speed Sprints & 1v1 Academic Duels",
    tagline: "Gamify examination preparation without losing academic rigor in competitive peer match-ups.",
    description:
      "Compete in 10-question rapid sprint challenges against fellow candidates nationwide, protect your daily learning streaks, and climb the verified national merit leaderboard.",
    keyFeatures: [
      "Daily 10-question timed speed sprints",
      "Real-time 1v1 live candidate academic duels",
      "Daily streak protection with automated alerts",
      "National merit leaderboard and verifiable badges",
    ],
    ctaLabel: "Learn about Challenge Arena",
    portalTarget: "/challenge-arena",
    portalLabel: "Enter Arena",
    accentColor: "from-rose-600 to-red-500",
    lightBg: "bg-rose-50/50",
    darkBorder: "dark:border-rose-500/30",
    statsLabel: "Competition",
    statsValue: "Real-Time 1v1 Duels",
  },
];

export function ProductsHubClient() {
  const [activeSlug, setActiveSlug] = useState<string>("cbt");
  const activeProduct = PRODUCTS_LIST.find((p) => p.slug === activeSlug) || PRODUCTS_LIST[0];

  return (
    <div className="space-y-20 sm:space-y-28 py-10 sm:py-16">
      {/* 1. Hero Header: Modern Atmospheric Intro */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/70 dark:text-cyan-300 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
          <span>Unified Learning Architecture</span>
        </div>

        <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl leading-tight">
          One Connected <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 dark:from-cyan-300 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
            Academic Engine.
          </span>
        </h1>

        <p className="mx-auto max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-xl leading-relaxed">
          Every critical dimension of Nigerian academic preparation—examination simulations, curriculum mastery, interactive virtual laboratories, AI diagnostics, and live tutor masterclasses—engineered into one fluid, low-data platform.
        </p>

        {/* Verification Checklist */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5">
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            <span>JAMB UTME Aligned</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5">
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            <span>Offline-Resilient PWA</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5">
            <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            <span>Free Practice Daily</span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Product Switcher Stage (The Anti-Box Cockpit) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#070f22] p-5 sm:p-8 lg:p-12 shadow-xl dark:shadow-2xl relative overflow-hidden">
          {/* Header Switcher Rail */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                Interactive Studio Tour
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mt-1">
                Select an Engine to Inspect
              </h2>
            </div>

            {/* Product Switcher Pills */}
            <div
              role="tablist"
              aria-label="BrainLab Product Engines"
              className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full"
            >
              {PRODUCTS_LIST.map((prod) => {
                const isSelected = activeSlug === prod.slug;
                return (
                  <button
                    key={prod.slug}
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveSlug(prod.slug)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? "bg-[#012153] dark:bg-blue-600 text-white shadow-md font-black scale-[1.02]"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {prod.title.replace("JAMB UTME ", "").replace("Virtual Labs", "").replace(" & Diagnostics", "").replace(" & Whiteboard Stage", "")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Product Interactive Showcase Stage */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Descriptive Dossier */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider border ${activeProduct.badgeColor}`}>
                  {activeProduct.badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white leading-tight">
                  {activeProduct.title}
                </h3>
                <p className="text-sm font-semibold text-blue-700 dark:text-cyan-300">
                  {activeProduct.subtitle}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeProduct.description}
                </p>
              </div>

              {/* Key Capabilities */}
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-4 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Core Capabilities
                </span>
                <ul className="space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {activeProduct.keyFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-cyan-300 font-black text-[10px]">
                        ✓
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={activeProduct.portalTarget}
                  className="rounded-xl bg-[#012153] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 px-5 py-3 text-xs font-black text-white shadow-md transition-all active:scale-95"
                >
                  {activeProduct.portalLabel} →
                </Link>
                <Link
                  href={activeProduct.href}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-5 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
                >
                  {activeProduct.ctaLabel}
                </Link>
              </div>
            </div>

            {/* Right Column: Live Mockup Console Simulation */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-950 text-slate-100 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
                {/* Console Top Bar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="ml-2 font-mono text-slate-300">brainlab.console // {activeProduct.slug}</span>
                  </div>
                  <span className="rounded-md bg-blue-950 border border-blue-800 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                    {activeProduct.statsValue}
                  </span>
                </div>

                {/* Specific Live Cockpit Visuals per product */}
                {activeSlug === "cbt" && (
                  <div className="space-y-4 font-sans">
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <div className="flex gap-2">
                        <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-black text-white">English (60 Qs)</span>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300">Physics (40 Qs)</span>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300">Chemistry (40 Qs)</span>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300">Biology (40 Qs)</span>
                      </div>
                      <span className="font-mono text-xs font-black text-amber-400">⏱ 01:42:15</span>
                    </div>

                    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
                      <div className="text-xs text-cyan-400 font-mono">QUESTION 24 OF 60 // USE OF ENGLISH</div>
                      <p className="text-sm font-medium text-slate-200">
                        In the sentence <em>&quot;Neither the class prefect nor the students _______ present at the national symposium,&quot;</em> choose the option that best completes the sentence:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-2 cursor-pointer hover:border-blue-500">
                          <span className="font-mono font-bold text-blue-400">[A]</span> is
                        </div>
                        <div className="p-2.5 rounded-lg bg-blue-900/60 border border-blue-500 flex items-center gap-2 font-bold text-cyan-200">
                          <span className="font-mono font-bold text-cyan-300">[B]</span> were (Selected)
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-2 cursor-pointer hover:border-blue-500">
                          <span className="font-mono font-bold text-blue-400">[C]</span> was
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-2 cursor-pointer hover:border-blue-500">
                          <span className="font-mono font-bold text-blue-400">[D]</span> has been
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>Keyboard Navigation: <strong className="text-slate-200">A, B, C, D</strong> (Select) • <strong className="text-slate-200">P / N</strong> (Prev/Next)</span>
                      <span className="text-emerald-400 font-bold">● Offline Queue Active</span>
                    </div>
                  </div>
                )}

                {activeSlug === "learning-hub" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
                      <span className="font-bold text-emerald-400">UTME Physics Curriculum // Wave Motion</span>
                      <span className="text-slate-400">Subtopic 4 of 12</span>
                    </div>

                    <div className="space-y-2.5 rounded-xl bg-slate-900/80 border border-slate-800 p-4">
                      <div className="text-xs font-bold text-slate-300">Specific Learning Objective:</div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Candidates should be able to: calculate frequency $(f)$, wavelength $(\lambda)$, and wave speed $(v = f\lambda)$ for mechanical and electromagnetic transverse waves.
                      </p>
                      <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-emerald-900/60 font-mono text-xs text-emerald-300">
                        Formula: v = f &times; &lambda; &rArr; &lambda; = v / f
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Official Bibliography: <em>New School Physics (M.W. Anyakoha)</em></span>
                      <span className="text-cyan-400 font-bold">14 Past Questions Linked &rarr;</span>
                    </div>
                  </div>
                )}

                {activeSlug === "ai-learning" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
                      <span className="font-bold text-purple-400">Socratic Diagnostic Inspector</span>
                      <span className="font-mono text-purple-300">Error Pattern Detected</span>
                    </div>

                    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
                      <div className="text-xs font-bold text-rose-400">Diagnostic Finding: Sign Convention Error in Convex Mirror</div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        In your last mock exam, focal length was assigned +15 cm instead of -15 cm. For convex mirrors, the focal point is behind the reflective surface, requiring a negative sign.
                      </p>
                      <div className="mt-2 rounded-lg bg-purple-950/50 border border-purple-800 p-2 text-xs text-purple-200">
                        Generated 5-question reinforcement drill &quot;Spherical Mirror Sign Conventions&quot;
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Spaced Repetition: <strong>Formula Card Due in 18 hrs</strong></span>
                      <span className="text-emerald-400 font-bold">Review Score: 92%</span>
                    </div>
                  </div>
                )}

                {activeSlug === "live-classroom" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
                      <span className="font-bold text-amber-400">Live Stage Whiteboard Sync // Coordinate Geometry</span>
                      <span className="text-rose-400 font-bold animate-pulse">● LIVE (Masterclass)</span>
                    </div>

                    <div className="rounded-xl bg-[#031508] border border-emerald-900/60 p-4 font-mono text-emerald-400 space-y-2 h-36 flex flex-col justify-between">
                      <div className="text-xs opacity-75">SURFACE: Chalkboard (Dark Green)</div>
                      <div className="text-center text-sm font-bold text-white">
                        Gradient: m = (y₂ - y₁) / (x₂ - x₁) = (8 - 2) / (5 - 1) = 6/4 = 1.5
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-emerald-500">
                        <span>Vector Path Broadcast: 25 FPS Sync</span>
                        <span>Checkpoint Poll: 89% Comprehension</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Low-Bandwidth Mode: <strong>12 kbps Audio Sync</strong></span>
                      <span className="text-amber-400 font-bold">Ask Educator &rarr;</span>
                    </div>
                  </div>
                )}

                {activeSlug === "stem-studio" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
                      <span className="font-bold text-cyan-400">Kinematics Parabolic Trajectory Bench</span>
                      <span className="text-cyan-300 font-mono">60 FPS Interactive</span>
                    </div>

                    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Launch Angle: <strong>45&deg; (Optimum)</strong></span>
                        <span className="text-emerald-400 font-mono">Range: 92.0 m</span>
                        <span className="text-cyan-400 font-mono">Apex: 22.5 m</span>
                      </div>
                      <div className="h-16 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                        <svg className="w-full h-12 px-4" viewBox="0 0 200 40" fill="none">
                          <path d="M 10 35 Q 100 5 190 35" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 2" />
                          <circle cx="100" cy="20" r="4" fill="#f59e0b" />
                          <circle cx="10" cy="35" r="5" fill="#3b82f6" />
                          <circle cx="190" cy="35" r="4" fill="#10b981" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>WAEC Physics Practical // Projectile Motion</span>
                      <span className="text-cyan-400 font-bold">Launch Full Bench &rarr;</span>
                    </div>
                  </div>
                )}

                {activeSlug === "challenge-arena" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
                      <span className="font-bold text-rose-400">National 1v1 Academic Duel HUD</span>
                      <span className="font-mono text-amber-400">Sprint Question 4/10</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-500/40 text-center space-y-1">
                        <div className="text-xs font-bold text-blue-400">You (Candidate)</div>
                        <div className="text-lg font-black text-white">300 pts</div>
                        <div className="text-[10px] text-emerald-400 font-bold">3/3 Correct (Streak x3)</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-rose-500/40 text-center space-y-1">
                        <div className="text-xs font-bold text-rose-400">Challenger (Ibadan)</div>
                        <div className="text-lg font-black text-white">200 pts</div>
                        <div className="text-[10px] text-slate-400 font-bold">2/3 Correct</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Timed Sprint: <strong>12s remaining</strong></span>
                      <span className="text-rose-400 font-bold">Live National Rank #42</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The Connected Product Pipeline (Flowing Lifecycle) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-cyan-400">
            Ecosystem Integration
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white">
            How Every Product Connects
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Unlike fragmented sites with past questions here, video tutorials on YouTube, and notes elsewhere, BrainLab links your journey in one closed feedback loop.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-2.5 py-0.5 text-xs font-black text-blue-800 dark:text-cyan-300">
              Stage 01
            </span>
            <h4 className="text-base font-black text-slate-950 dark:text-white">1. Practise</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Take an authentic 4-subject CBT mock exam under full timed pressure with the 8-key cockpit.
            </p>
            <div className="text-[11px] font-bold text-blue-600 dark:text-cyan-400">CBT Exam Engine &rarr;</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 text-xs font-black text-emerald-800 dark:text-emerald-300">
              Stage 02
            </span>
            <h4 className="text-base font-black text-slate-950 dark:text-white">2. Understand</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              When a question is missed, launch Learning Hub syllabus notes or STEM Studio laboratory experiments.
            </p>
            <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Learning Hub &amp; STEM Studio &rarr;</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <span className="rounded-full bg-purple-100 dark:bg-purple-900/50 px-2.5 py-0.5 text-xs font-black text-purple-800 dark:text-purple-300">
              Stage 03
            </span>
            <h4 className="text-base font-black text-slate-950 dark:text-white">3. Reinforce</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              AI generates a 5-question micro-drill focused solely on your misconception until fully resolved.
            </p>
            <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400">AI Diagnostics &rarr;</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <span className="rounded-full bg-rose-100 dark:bg-rose-900/50 px-2.5 py-0.5 text-xs font-black text-rose-800 dark:text-rose-300">
              Stage 04
            </span>
            <h4 className="text-base font-black text-slate-950 dark:text-white">4. Compete &amp; Master</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Validate your speed and accuracy in daily speed sprints and 1v1 national duels on the arena leaderboard.
            </p>
            <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Challenge Arena &rarr;</div>
          </div>
        </div>
      </section>

      {/* 4. Cross-Audience Guidance Banner */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-blue-200 dark:border-blue-900/40 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300">Next Step</span>
            <h3 className="text-2xl sm:text-3xl font-black">Ready to explore BrainLab for your academic goals?</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Whether you are a secondary student preparing for JAMB UTME, an educator managing classes, or a school director looking for offline-resilient CBT labs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/for-students"
              className="rounded-xl bg-white text-slate-950 hover:bg-slate-100 px-5 py-3 text-xs font-black shadow-md transition"
            >
              Read Student Guide →
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-slate-600 hover:border-slate-400 bg-white/10 px-5 py-3 text-xs font-bold text-white transition"
            >
              Compare Plans &amp; Access
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
