"use client";

import React, { useState } from "react";
import Link from "next/link";

type StudioSurface = "whiteboard" | "polling" | "analytics";

export function TutorSuiteClient() {
  const [activeSurface, setActiveSurface] = useState<StudioSurface>("whiteboard");
  const [whiteboardTheme, setWhiteboardTheme] = useState<"chalkboard" | "grid">("chalkboard");

  // Interactive Poll Simulation State
  const [selectedPollOption, setSelectedPollOption] = useState<string>("B");

  return (
    <div className="space-y-20">
      {/* 1. Interactive Masterclass Studio Tour */}
      <section aria-label="Interactive Masterclass Studio Tour" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#081020] p-6 sm:p-10 shadow-sm space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/60 px-4 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
            <span>INTERACTIVE EDUCATOR STAGE PREVIEW</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Specialized Tools for Serious Subject Teaching
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            Switch between low-latency chalkboard surfaces, instant checkpoint polls, and cohort diagnostic heatmaps.
          </p>
        </div>

        {/* Surface Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSurface("whiteboard")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeSurface === "whiteboard"
                ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400"
            }`}
          >
            Vector Whiteboard Stage
          </button>
          <button
            type="button"
            onClick={() => setActiveSurface("polling")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeSurface === "polling"
                ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400"
            }`}
          >
            Live Socratic Checkpoint Poll
          </button>
          <button
            type="button"
            onClick={() => setActiveSurface("analytics")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              activeSurface === "analytics"
                ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400"
            }`}
          >
            Cohort Diagnostic Radar
          </button>
        </div>

        {/* Live Surface Display Screen */}
        <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-slate-950 p-6 sm:p-8 text-white min-h-[380px] shadow-xl relative overflow-hidden">
          {/* Surface Header Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="ml-2 font-mono text-xs uppercase tracking-wider text-cyan-300 font-bold">
                {activeSurface === "whiteboard"
                  ? "LECTURE STAGE · VECTOR CANVAS"
                  : activeSurface === "polling"
                  ? "IN-LECTURE INTERACTION · LIVE CHECKPOINT"
                  : "COHORT DIAGNOSTICS · TOPIC HEATMAP"}
              </span>
            </div>

            {activeSurface === "whiteboard" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWhiteboardTheme("chalkboard")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                    whiteboardTheme === "chalkboard" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Dark Chalkboard
                </button>
                <button
                  type="button"
                  onClick={() => setWhiteboardTheme("grid")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                    whiteboardTheme === "grid" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Cartesian Grid
                </button>
              </div>
            )}
          </div>

          {/* SURFACE 1: WHITEBOARD */}
          {activeSurface === "whiteboard" && (
            <div
              className={`rounded-2xl p-6 sm:p-8 min-h-[260px] flex flex-col justify-between transition-all ${
                whiteboardTheme === "chalkboard"
                  ? "bg-[#0A1624] border border-blue-500/20"
                  : "bg-[#06101E] border border-cyan-500/30"
              }`}
              style={
                whiteboardTheme === "grid"
                  ? {
                      backgroundImage: "radial-gradient(#1e3a8a 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }
                  : undefined
              }
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Topic: Simple Harmonic Motion &amp; Resonance</span>
                  <span className="text-emerald-400 font-bold">KaTeX Mathematical Stamp</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 max-w-lg space-y-2">
                  <div className="text-xs text-cyan-300 font-mono">Differential Equation of SHM:</div>
                  <div className="font-mono text-lg font-black text-white">
                    d²x/dt² + &omega;²x = 0 &rArr; x(t) = A &middot; cos(&omega;t + &phi;)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Velocity v = &plusmn;&omega;&radic;(A² - x²) &bull; Maximum at Equilibrium (x = 0)
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5">
                <span>Vector Geometry: Ruled lines &amp; Science apparatus stamps active</span>
                <span className="text-cyan-400 font-bold">Latency &lt; 45ms over 3G/4G</span>
              </div>
            </div>
          )}

          {/* SURFACE 2: POLLING */}
          {activeSurface === "polling" && (
            <div className="rounded-2xl bg-[#091526] border border-blue-500/20 p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-400 font-mono font-bold">Active Live Poll (42 Students Online)</span>
                <span className="text-slate-400 font-mono">Timer: 00:34 remaining</span>
              </div>

              <div className="text-sm sm:text-base font-bold text-white leading-relaxed">
                A simple pendulum is taken to the centre of the Earth. What happens to its period of oscillation T?
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { key: "A", label: "T remains 2.0 seconds", votes: "8%" },
                  { key: "B", label: "T becomes infinitely large (stops oscillating)", votes: "78%", correct: true },
                  { key: "C", label: "T decreases to zero", votes: "10%" },
                  { key: "D", label: "T doubles in frequency", votes: "4%" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedPollOption(opt.key)}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer flex items-center justify-between ${
                      selectedPollOption === opt.key
                        ? "bg-blue-600/30 border-cyan-400 text-white"
                        : "bg-slate-900 border-white/10 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <span>
                      <strong className="text-cyan-400 font-mono mr-2">[{opt.key}]</strong>
                      {opt.label}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 font-bold">{opt.votes}</span>
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200">
                <strong className="text-cyan-300">Tutor Pedagogical Insight:</strong> At Earth&apos;s centre, acceleration due to gravity g = 0. Since T = 2&pi;&radic;(L/g), dividing by zero yields infinite period; the pendulum does not oscillate.
              </div>
            </div>
          )}

          {/* SURFACE 3: ANALYTICS */}
          {activeSurface === "analytics" && (
            <div className="rounded-2xl bg-[#091526] border border-purple-500/20 p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-300 font-mono font-bold">Cohort Topic Misconception Radar</span>
                <span className="text-slate-400 font-mono">UTME Mock Series 4</span>
              </div>

              <div className="space-y-3">
                {[
                  { topic: "Electrolysis & Faraday's Laws", accuracy: 42, errorNote: "Common error: confusing charge Q = It with molar electrons" },
                  { topic: "Organic Chemistry: Functional Group Isomerism", accuracy: 68, errorNote: "Strong mastery on esterification, revision needed on tautomerism" },
                  { topic: "Wave Optics: Young's Double Slit Interference", accuracy: 51, errorNote: "Formula confusion between slit separation d and screen distance D" },
                  { topic: "Concord & Subject-Verb Proximity Rules", accuracy: 84, errorNote: "Excellent retention across collective and indefinite pronouns" },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{item.topic}</span>
                      <span className={`font-mono font-black ${item.accuracy < 55 ? "text-rose-400" : "text-emerald-400"}`}>
                        {item.accuracy}% Cohort Mastery
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.accuracy < 55 ? "bg-rose-500" : "bg-emerald-500"}`}
                        style={{ width: `${item.accuracy}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{item.errorNote}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. Specialized Teaching Tools - Compact Alternating Cards */}
      <section aria-label="Specialized Educator Tools" className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/60 px-4 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
            <span>EDUCATOR WORKSPACE SUITE</span>
          </div>
          <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            Specialized Educator Capabilities
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
            Every feature built deliberately for Nigerian secondary, WAEC, and UTME curriculum delivery.
          </p>
        </div>

        <div className="space-y-12 sm:space-y-16">
          {/* Row 1: Vector Academic Whiteboard & KaTeX Stamps (Text Left, Visual Preview Right) */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1424] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-blue-400/50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Text Side (Span 7) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-300 dark:border-blue-700/60 bg-blue-50 dark:bg-blue-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-blue-800 dark:text-cyan-300 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>Low-Latency Lecture Canvas</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Vector Academic Whiteboard &amp; KaTeX Stamps
                </h3>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Low-latency drawing engine with coordinate grids, ruled lined note sheets, and dark high-contrast chalkboards. Insert mathematical symbols, DC circuits, ray diagrams, and benzene rings without tedious hand drawing.
                </p>

                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                    <span>Sub-45ms drawing latency optimized for 3G/4G networks across Nigeria</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                    <span>Instant KaTeX mathematical formulas, physics apparatus &amp; reaction mechanisms</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                    <span>Multi-surface toggle: Dark Chalkboard, Cartesian Grid, and Ruled College Ruled</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <Link
                    href="/for-tutors/apply"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                  >
                    <span>Apply for Educator Workspace</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>

              {/* Visual Preview Side (Span 5) */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-blue-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                        WHITEBOARD STAMP HUD
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded">
                      &lt; 45ms Latency
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#0A1624] p-4 space-y-2">
                    <div className="text-[11px] text-cyan-300 font-mono flex items-center justify-between">
                      <span>Simple Harmonic Motion</span>
                      <span className="text-emerald-400 font-bold">KaTeX Stamp</span>
                    </div>
                    <div className="font-mono text-sm font-black text-white bg-slate-900/90 p-2.5 rounded-lg border border-white/10">
                      d²x/dt² + &omega;²x = 0 &rArr; x(t) = A &middot; cos(&omega;t + &phi;)
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Velocity v = &plusmn;&omega;&radic;(A² - x²) &bull; Maximum at x = 0
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px]">
                    <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">Cartesian</span>
                    <span className="p-1.5 rounded-lg bg-blue-950 border border-blue-700 text-cyan-300 font-bold">Chalkboard</span>
                    <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">Ruled Lines</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Live Socratic Checkpoint Polling (Visual Preview Left, Text Right) */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1424] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-cyan-400/50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Visual Preview Side (Span 5 - Order 2 on mobile, Order 1 on desktop) */}
              <div className="lg:col-span-5 order-2 lg:order-1">
                <div className="rounded-2xl border border-cyan-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                        LIVE CONCEPT CHECK
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded">
                      42 Responded
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-2">
                    <p className="text-xs text-white font-bold leading-snug">
                      A simple pendulum is taken to Earth&apos;s centre. What happens to period T?
                    </p>
                    <div className="space-y-1.5 text-[11px] font-mono">
                      <div className="flex items-center justify-between p-1.5 rounded-md bg-slate-800/60 border border-slate-700/50 text-slate-300">
                        <span>[A] Remains 2.0s</span>
                        <span className="text-slate-400 font-bold">8%</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded-md bg-cyan-950/80 border border-cyan-600/80 text-cyan-300 font-bold">
                        <span>[B] Infinitely large (stops)</span>
                        <span className="text-emerald-400 font-bold">78% ✓</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded-md bg-slate-800/60 border border-slate-700/50 text-slate-300">
                        <span>[C] Decreases to zero</span>
                        <span className="text-slate-400 font-bold">10%</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <strong className="text-cyan-300">Tutor Insight:</strong> At Earth center g = 0 &rArr; T = 2&pi;&radic;(L/g) &rArr; infinite.
                  </div>
                </div>
              </div>

              {/* Text Side (Span 7 - Order 1 on mobile, Order 2 on desktop) */}
              <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Real-Time Checkpoint Polling</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Instant Socratic Polls &amp; Active Recall
                </h3>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Fire instantaneous concept checks during lectures to gauge comprehension and clarify derivation stumbling blocks. Students respond anonymously from any phone or browser.
                </p>

                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-bold">✓</span>
                    <span>Instant response distribution reveals misconceptions immediately</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-bold">✓</span>
                    <span>Pair polling results with Socratic hints and step-by-step physical models</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-bold">✓</span>
                    <span>100% anonymous candidate submission preserves psychological safety</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <Link
                    href="/products/live-classroom"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                  >
                    <span>Explore Classroom Capabilities</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Cohort Diagnostic Radar (Text Left, Visual Preview Right) */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1424] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-purple-400/50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Text Side (Span 7) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-300 dark:border-purple-700/60 bg-purple-50 dark:bg-purple-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <span>Cohort Diagnostic Radar</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Cohort Misconception Diagnostics &amp; Analytics
                </h3>

                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Track attendance, average scores, and specific misconceptions across your student cohorts to plan high-impact reviews. Identify syllabus blind spots before mock exam day.
                </p>

                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                    <span>Automated syllabus mastery heatmaps across Physics, Chemistry, Biology &amp; Math</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                    <span>Identify high-error distractor traps (e.g. Faraday&apos;s Laws calculation errors)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                    <span>Exportable diagnostic reports for parents, schools &amp; tutorial centres</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <Link
                    href="/contact?subject=Tutor+Application"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                  >
                    <span>Contact Educator Desk</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>

              {/* Visual Preview Side (Span 5) */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-purple-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                        MASTERY RADAR
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/80 px-2 py-0.5 rounded">
                      MOCK SERIES 4
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-200 font-bold">Electrolysis &amp; Faraday</span>
                        <span className="text-rose-400 font-bold">42% (At Risk)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-rose-500 w-[42%]" />
                      </div>
                      <div className="text-[10px] text-slate-400">Common error: charge Q = It vs molar electrons</div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-200 font-bold">Concord &amp; Subject-Verb</span>
                        <span className="text-emerald-400 font-bold">84% (Strong)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 w-[84%]" />
                      </div>
                      <div className="text-[10px] text-slate-400">Excellent retention across collective pronouns</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Numbered Editorial Educator Standards (Manifesto Canvas) */}
      <section aria-label="Educator Standards Manifesto" className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            Our Educator Standards
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
            The core academic principles that unite our teaching community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              num: "01",
              title: "Academic Pedagogy Over Rote Tricks",
              desc: "We partner with educators who prioritize conceptual understanding and critical thinking over superficial cramming shortcuts.",
            },
            {
              num: "02",
              title: "Low-Bandwidth Mobile Accessibility",
              desc: "Our lecture technology runs smoothly on modest networks so your teaching reaches students regardless of location or carrier.",
            },
            {
              num: "03",
              title: "Verified Teacher Recognition",
              desc: "Approved educators receive dedicated verified tutor profiles, authoring attributions, and public bio listings.",
            },
            {
              num: "04",
              title: "Transparent Institutional Governance",
              desc: "Protected by strict role-based access control, ensuring lesson authoring and student data remain secure and confidential.",
            },
          ].map((item) => (
            <div
              key={item.num}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1424] p-8 shadow-xs flex items-start gap-5"
            >
              <span className="font-mono font-black text-3xl sm:text-4xl text-blue-600 dark:text-cyan-400 shrink-0">
                {item.num}
              </span>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
