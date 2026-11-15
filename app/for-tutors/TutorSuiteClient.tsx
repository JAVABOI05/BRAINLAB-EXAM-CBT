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

      {/* 2. Specialized Teaching Tools Bento Grid */}
      <section aria-label="Specialized Educator Tools" className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            Specialized Educator Capabilities
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
            Every feature built deliberately for Nigerian secondary, WAEC and UTME curriculum delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tool 1 */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1424] p-6 space-y-3 shadow-xs hover:border-blue-400/50 transition">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-blue-800">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </span>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white">Vector Academic Whiteboard</h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
              Low-latency drawing engine with coordinate grids, ruled lined note sheets, and dark high-contrast chalkboards.
            </p>
          </div>

          {/* Tool 2 */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1424] p-6 space-y-3 shadow-xs hover:border-cyan-400/50 transition">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10M6 10h10" />
              </svg>
            </span>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white">KaTeX Science Diagram Stamps</h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
              Insert mathematical symbols, DC circuits, ray diagrams, and organic benzene rings without tedious hand drawing.
            </p>
          </div>

          {/* Tool 3 */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1424] p-6 space-y-3 shadow-xs hover:border-emerald-400/50 transition">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
            </span>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white">Real-Time Checkpoint Polling</h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
              Fire instantaneous concept checks during lectures to gauge comprehension and clarify derivation stumbling blocks.
            </p>
          </div>

          {/* Tool 4 */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1424] p-6 space-y-3 shadow-xs hover:border-purple-400/50 transition">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </span>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white">Curriculum Authoring Studio</h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
              Design structured syllabus lessons, standardized questions with full worked solutions, and set difficulty tags.
            </p>
          </div>

          {/* Tool 5 */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1424] p-6 space-y-3 shadow-xs hover:border-cyan-400/50 transition">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 2v7.31L4.1 19.34A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-2.66L14 9.31V2" />
                <path d="M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" />
              </svg>
            </span>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white">STEM Simulation Presenter</h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
              Stage interactive laboratory simulations live on your screen, adjust variables with sliders, and prompt student discovery.
            </p>
          </div>

          {/* Tool 6 */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1424] p-6 space-y-3 shadow-xs hover:border-amber-400/50 transition">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </span>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white">Cohort Diagnostic Analytics</h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
              Track attendance, average scores, and specific misconceptions across your student cohorts to plan high-impact reviews.
            </p>
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
