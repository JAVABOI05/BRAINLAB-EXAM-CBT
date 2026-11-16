"use client";

import React, { useState } from "react";
import Link from "next/link";

type ScienceDiscipline = "circuits" | "physics" | "chemistry" | "biology";
type GateType = "AND" | "OR" | "NOT" | "XOR";

export function HomeStemStudio() {
  const [activeTab, setActiveTab] = useState<ScienceDiscipline>("circuits");

  // Logic Gate Interactive State (Slot S5-01 / Interactive Logic Gate Bench)
  const [gate, setGate] = useState<GateType>("AND");
  const [inputA, setInputA] = useState<boolean>(true);
  const [inputB, setInputB] = useState<boolean>(true);

  // Physics Interactive States
  const [physicsSubMode, setPhysicsSubMode] = useState<"kinematics" | "optics">("kinematics");
  const [launchAngle, setLaunchAngle] = useState<number>(45);
  const [objectDist, setObjectDist] = useState<number>(35); // cm
  const focalLength = 20; // cm

  // Lens formula calculations: 1/di = 1/f - 1/do  =>  di = (f * do) / (do - f)
  const isVirtual = objectDist < focalLength;
  const isAtFocus = objectDist === focalLength;
  const imageDist = isAtFocus ? 999 : (focalLength * objectDist) / (objectDist - focalLength);
  const magnification = isAtFocus ? 999 : Math.abs(imageDist / objectDist);

  let opticsNature = "";
  let opticsDevice = "";
  if (objectDist > 2 * focalLength) {
    opticsNature = "Real, Inverted & Diminished";
    opticsDevice = "Human Eye & Camera Lens";
  } else if (objectDist === 2 * focalLength) {
    opticsNature = "Real, Inverted & Same Size (m = 1.0)";
    opticsDevice = "Photocopier (1:1 Scaling)";
  } else if (objectDist > focalLength) {
    opticsNature = "Real, Inverted & Magnified";
    opticsDevice = "Cinema Projector & Slide Viewer";
  } else if (isAtFocus) {
    opticsNature = "Image at Infinity (Parallel Rays)";
    opticsDevice = "Searchlight & Car Headlight";
  } else {
    opticsNature = "Virtual, Erect & Magnified";
    opticsDevice = "Simple Microscope / Magnifying Glass";
  }

  // Chemistry Titration Interactive State
  const [phLevel, setPhLevel] = useState<number>(7.0);

  // Compute logic gate output
  const computeOutput = (g: GateType, a: boolean, b: boolean): boolean => {
    switch (g) {
      case "AND":
        return a && b;
      case "OR":
        return a || b;
      case "NOT":
        return !a;
      case "XOR":
        return a !== b;
    }
  };

  const isCircuitLit = computeOutput(gate, inputA, inputB);

  return (
    <section
      id="stem-studio"
      aria-label="STEM Studio Virtual Science Laboratories"
      className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20 lg:py-24 border-b border-white/10 overflow-hidden bg-[#020617] text-white"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border-2 border-white/10 bg-[#0A1128] p-6 sm:p-10 lg:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            {/* Left Column: Catchy Educational Overview */}
            <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
              <div
                data-slot="VIRTUAL SCIENCE & STEM LABORATORIES (SLOT S5-01)"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-bold text-cyan-300"
              >
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>VIRTUAL SCIENCE &amp; STEM LABORATORIES</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Interactive Science in Motion. <br className="hidden sm:inline" />
                <span className="text-cyan-400">
                  Not Just Dry Textbooks.
                </span>
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Rather than memorizing abstract formulas, candidates manipulate live variables and watch real physical outcomes happen instantly—bridging classroom theory directly with WAEC &amp; JAMB practical CBT exams.
              </p>

              {/* Catchy Value Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="flex items-center gap-2.5 rounded-xl bg-[#070D1B] border border-white/10 px-3 py-2 text-left">
                  <svg className="h-4 w-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <div>
                    <div className="text-[11px] font-bold text-white">60 FPS Motion</div>
                    <div className="text-[10px] text-slate-400">Zero lag physics</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl bg-[#070D1B] border border-white/10 px-3 py-2 text-left">
                  <svg className="h-4 w-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 2v7.31L4.2 18.24A2 2 0 0 0 5.86 21h12.28a2 2 0 0 0 1.66-2.76L14 9.31V2" />
                    <path d="M8.5 2h7M7 16h10" />
                  </svg>
                  <div>
                    <div className="text-[11px] font-bold text-white">WAEC &amp; JAMB</div>
                    <div className="text-[10px] text-slate-400">Practical syllabus</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl bg-[#070D1B] border border-white/10 px-3 py-2 text-left">
                  <svg className="h-4 w-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                  <div>
                    <div className="text-[11px] font-bold text-white">Instant Load</div>
                    <div className="text-[10px] text-slate-400">Low data overhead</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/classroom/stem"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-teal-300 text-slate-950 font-black px-6 py-3.5 text-sm shadow-lg shadow-cyan-500/25 active:translate-y-0.5 transition-all bl-focus-ring min-h-[48px] group"
                >
                  <span>Launch STEM Studio</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>

                <Link
                  href="/products/stem-studio"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border-2 border-white/10 bg-[#070D1B] hover:bg-[#0F1A36] px-5 py-3.5 text-sm font-bold text-slate-200 transition-all bl-focus-ring min-h-[48px]"
                >
                  Explore Virtual Labs
                </Link>
              </div>
            </div>

            {/* Right Column: Catchy Animated Interactive Visual Lab */}
            <div className="lg:col-span-7 space-y-4">
              {/* Lab Subject Switcher Tabs */}
              <div
                role="tablist"
                aria-label="STEM Laboratory Subjects"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-[#050914] border border-white/10"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "circuits"}
                  onClick={() => setActiveTab("circuits")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    activeTab === "circuits"
                      ? "bg-[#0C162E] text-emerald-700 text-emerald-300 shadow-md border-emerald-500/40 font-black"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span className="truncate">{"Logic Gates & Circuit Simulators"}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "physics"}
                  onClick={() => setActiveTab("physics")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    activeTab === "physics"
                      ? "bg-[#0C162E] text-cyan-700 text-cyan-300 shadow-md border-cyan-500/40 font-black"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
                    <line x1="14.5" y1="5.5" x2="18.5" y2="9.5" />
                  </svg>
                  <span className="truncate">{"Physics Mechanics & Kinematics"}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "chemistry"}
                  onClick={() => setActiveTab("chemistry")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    activeTab === "chemistry"
                      ? "bg-[#0C162E] text-rose-400 shadow-md border-rose-500/40 font-black"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 2v7.31L4.2 18.24A2 2 0 0 0 5.86 21h12.28a2 2 0 0 0 1.66-2.76L14 9.31V2" />
                    <path d="M8.5 2h7M7 16h10" />
                  </svg>
                  <span className="truncate">{"Acid-Base Titration & pH Reactions"}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "biology"}
                  onClick={() => setActiveTab("biology")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    activeTab === "biology"
                      ? "bg-[#0C162E] text-teal-400 shadow-md border-teal-500/40 font-black"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a10 10 0 0 0-4 18M12 2a10 10 0 0 1 4 18" />
                  </svg>
                  <span className="truncate">{"Cellular Atlas & Metabolic Pathways"}</span>
                </button>
              </div>

              {/* Main Interactive Animated Stage */}
              <div
                className="rounded-2xl border-2 border-white/10 bg-[#030612] p-5 sm:p-6 shadow-inner min-h-[360px] flex flex-col justify-between relative overflow-hidden"
                role="region"
                aria-label="Interactive Logic Gate Bench and Virtual Science Stage"
              >
                {/* 1. DIGITAL CIRCUITS & LOGIC GATES */}
                {activeTab === "circuits" && (
                  <div className="space-y-5 animate-bl-fade-in">
                    {/* Header Controls: Gate Selection Chips */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                          Interactive Logic Gate Bench
                        </div>
                        <p className="text-[11px] text-slate-400">Click a gate or flip switches to see the circuit power up</p>
                      </div>

                      {/* Gate Type Toggle */}
                      <div className="flex items-center gap-1 bg-[#070D1B] p-1 rounded-xl border border-slate-200 shadow-xs">
                        {(["AND", "OR", "XOR", "NOT"] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGate(g)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              gate === g
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Animated Circuit Board Visual */}
                    <div className="relative rounded-2xl bg-[#070D1B] border-2 border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden shadow-xs">
                      {/* Interactive Switch Controls */}
                      <div className="flex sm:flex-col gap-3 z-10">
                        <button
                          type="button"
                          onClick={() => setInputA(!inputA)}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-b-4 font-bold text-xs transition-all cursor-pointer active:border-b-2 active:translate-y-0.5 ${
                            inputA
                              ? "bg-emerald-950/60 border-emerald-600 text-emerald-200 shadow-xs"
                              : "bg-slate-800/80 border-slate-700 text-slate-400"
                          }`}
                        >
                          <span className={`h-3 w-3 rounded-full ${inputA ? "bg-emerald-500 shadow-xs" : "bg-slate-400 "}`} />
                          <span>Switch A: {inputA ? "ON (1)" : "OFF (0)"}</span>
                        </button>

                        {gate !== "NOT" ? (
                          <button
                            type="button"
                            onClick={() => setInputB(!inputB)}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-b-4 font-bold text-xs transition-all cursor-pointer active:border-b-2 active:translate-y-0.5 ${
                              inputB
                                ? "bg-emerald-950/60 border-emerald-600 text-emerald-200 shadow-xs"
                                : "bg-slate-800/80 border-slate-700 text-slate-400"
                            }`}
                          >
                            <span className={`h-3 w-3 rounded-full ${inputB ? "bg-emerald-500 shadow-xs" : "bg-slate-400 "}`} />
                            <span>Switch B: {inputB ? "ON (1)" : "OFF (0)"}</span>
                          </button>
                        ) : (
                          <div className="px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-[11px] italic text-center">
                            Single Input (Inverter)
                          </div>
                        )}
                      </div>

                      {/* Animated Circuit Core & Chip */}
                      <div className="flex flex-col items-center justify-center z-10">
                        <div className={`relative px-5 py-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center ${
                          isCircuitLit
                            ? "border-cyan-500 bg-cyan-950/60 shadow-md text-blue-950 "
                            : "border-slate-200  bg-slate-800/60 text-slate-500"
                        }`}>
                          <span className="text-[10px] font-mono tracking-widest text-blue-600 font-bold uppercase">LOGIC CHIP</span>
                          <span className="text-xl font-black text-white">{gate}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 font-bold">
                            {gate === "NOT" ? "Q = ¬A" : `Q = A ${gate} B`}
                          </span>
                        </div>
                      </div>

                      {/* Glowing Lightbulb / Power Indicator */}
                      <div className="flex flex-col items-center justify-center z-10">
                        <div className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-500 ${
                          isCircuitLit
                            ? "bg-amber-400/20 border-2 border-amber-500 text-amber-500 shadow-xl shadow-amber-400/30"
                            : "bg-slate-800 border-2 border-slate-700 text-slate-400"
                        }`}>
                          <svg className={`h-8 w-8 transition-transform duration-300 ${isCircuitLit ? "scale-110 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]" : "text-slate-500 opacity-40"}`} viewBox="0 0 24 24" fill={isCircuitLit ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 18h6" />
                            <path d="M10 22h4" />
                            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                          </svg>
                        </div>
                        <div className="mt-2 text-center">
                          <span className={`text-xs font-black uppercase tracking-wider ${isCircuitLit ? "text-amber-600 " : "text-slate-500"}`}>
                            {isCircuitLit ? "Current Active" : "Circuit Open"}
                          </span>
                        </div>
                      </div>

                      {/* Animated Circuit Wire Traces */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
                        <line x1="25%" y1="35%" x2="50%" y2="50%" stroke={inputA ? "#10b981" : "#94a3b8"} strokeWidth="2" strokeDasharray={isCircuitLit ? "4,4" : "none"} />
                        <line x1="25%" y1="65%" x2="50%" y2="50%" stroke={inputB ? "#10b981" : "#94a3b8"} strokeWidth="2" strokeDasharray={isCircuitLit ? "4,4" : "none"} />
                        <line x1="50%" y1="50%" x2="80%" y2="50%" stroke={isCircuitLit ? "#0284c7" : "#94a3b8"} strokeWidth="3" />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-[#070D1B]/60 rounded-xl px-4 py-2 border border-slate-200">
                      <span>Curriculum Rule: <strong>{gate}</strong> gate outputs active current when its logic condition is met.</span>
                      <span className="text-blue-600 font-bold">Physics &amp; Computer Studies</span>
                    </div>
                  </div>
                )}

                {/* 2. PHYSICS MECHANICS & KINEMATICS */}
                {activeTab === "physics" && (
                  <div className="space-y-5 animate-bl-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <svg className="h-4 w-4 text-blue-600 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
                            <line x1="14.5" y1="5.5" x2="18.5" y2="9.5" />
                          </svg>
                          <span>Physics Mechanics &amp; Kinematics</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {physicsSubMode === "kinematics"
                            ? "Simulate parabolic projectile motion and gravitational trajectory in real-time"
                            : "Interactive thin lens ray-tracing, focal planes, and optical magnification"}
                        </p>
                      </div>

                      {/* Physics Sub-Experiment Switcher */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-[#070D1B] p-1 rounded-xl border border-slate-200 shadow-xs">
                          <button
                            type="button"
                            onClick={() => setPhysicsSubMode("kinematics")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              physicsSubMode === "kinematics"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Trajectory
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhysicsSubMode("optics")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              physicsSubMode === "optics"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Convex Lens Ray-Trace
                          </button>
                        </div>

                        {physicsSubMode === "kinematics" ? (
                          <div className="flex items-center gap-1.5 bg-[#070D1B] p-1 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 px-2 font-bold">Angle:</span>
                            {[30, 45, 60].map((angle) => (
                              <button
                                key={angle}
                                type="button"
                                onClick={() => setLaunchAngle(angle)}
                                className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                  launchAngle === angle
                                    ? "bg-cyan-600 text-white shadow-xs"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                {angle}°
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-[#070D1B] px-3 py-1 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] text-slate-400 font-bold">Object d₀:</span>
                            <input
                              type="range"
                              min="10"
                              max="55"
                              step="5"
                              value={objectDist}
                              onChange={(e) => setObjectDist(Number(e.target.value))}
                              className="w-20 accent-blue-600 cursor-pointer"
                            />
                            <span className="text-xs font-mono font-bold text-cyan-600 text-cyan-300">{objectDist}cm</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Simulation 1: Projectile Kinematics */}
                    {physicsSubMode === "kinematics" ? (
                      <>
                        <div className="relative rounded-2xl bg-white border-2 border-slate-200 p-4 h-48 flex items-end justify-center overflow-hidden shadow-xs">
                          <svg className="w-full h-full" viewBox="0 0 500 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Grid Lines */}
                            <line x1="40" y1="150" x2="460" y2="150" stroke="#cbd5e1" strokeWidth="2" className="" />
                            <line x1="40" y1="30" x2="40" y2="150" stroke="#cbd5e1" strokeWidth="2" className="" />
                            
                            {/* Trajectory Parabola */}
                            <path
                              d={
                                launchAngle === 30
                                  ? "M 50 150 Q 240 70 430 150"
                                  : launchAngle === 45
                                  ? "M 50 150 Q 240 25 430 150"
                                  : "M 50 150 Q 200 10 350 150"
                              }
                              stroke="#0284c7"
                              strokeWidth="3"
                              strokeDasharray="6,4"
                              className="transition-all duration-500"
                            />

                            {/* Cannon / Launcher */}
                            <circle cx="50" cy="150" r="10" fill="#2563eb" />
                            
                            {/* Moving Projectile Particle */}
                            <circle cx={launchAngle === 60 ? "200" : "240"} cy={launchAngle === 45 ? "35" : launchAngle === 60 ? "20" : "75"} r="7" fill="#f59e0b">
                              <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
                            </circle>

                            {/* Target Flag */}
                            <circle cx={launchAngle === 60 ? "350" : "430"} cy="150" r="6" fill="#10b981" />
                            <text x={launchAngle === 60 ? "335" : "415"} y="170" fill="#10b981" fontSize="11" fontWeight="bold">Target</text>
                            <text x="50" y="170" fill="#64748b" fontSize="10">Origin (0m)</text>
                          </svg>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-[#070D1B]/60 border border-slate-200 rounded-xl p-2.5 shadow-xs">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Apex Height</div>
                            <div className="text-sm font-black text-blue-600">{launchAngle === 45 ? "22.5 m" : launchAngle === 60 ? "31.2 m" : "14.8 m"}</div>
                          </div>
                          <div className="bg-[#070D1B]/60 border border-slate-200 rounded-xl p-2.5 shadow-xs">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Flight Range</div>
                            <div className="text-sm font-black text-emerald-400">{launchAngle === 45 ? "92.0 m (Max)" : launchAngle === 60 ? "76.4 m" : "80.1 m"}</div>
                          </div>
                          <div className="bg-[#070D1B]/60 border border-slate-200 rounded-xl p-2.5 shadow-xs">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Equation</div>
                            <div className="text-xs font-mono font-bold text-amber-600">y = v₀t - ½gt²</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Simulation 2: Brilliant Optics & Convex Lens Ray Tracing */
                      <>
                        <div className="relative rounded-2xl bg-white border-2 border-slate-200 p-4 h-48 flex items-center justify-center overflow-hidden shadow-xs">
                          <svg className="w-full h-full" viewBox="0 0 500 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Principal Axis */}
                            <line x1="20" y1="90" x2="480" y2="90" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4,4" />

                            {/* Convex Lens at center x=250 */}
                            <path d="M 250 15 Q 262 90 250 165 Q 238 90 250 15 Z" fill="#38bdf8" fillOpacity="0.25" stroke="#0284c7" strokeWidth="2" />
                            <line x1="250" y1="10" x2="250" y2="170" stroke="#0284c7" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />

                            {/* Focal points (f = 20cm -> 65px scale) */}
                            {/* Left F1 & 2F1 */}
                            <circle cx="185" cy="90" r="3" fill="#38bdf8" />
                            <text x="180" y="108" fill="#38bdf8" fontSize="10" fontWeight="bold">F</text>
                            <circle cx="120" cy="90" r="3" fill="#64748b" />
                            <text x="113" y="108" fill="#64748b" fontSize="10">2F</text>

                            {/* Right F2 & 2F2 */}
                            <circle cx="315" cy="90" r="3" fill="#38bdf8" />
                            <text x="312" y="108" fill="#38bdf8" fontSize="10" fontWeight="bold">F&apos;</text>
                            <circle cx="380" cy="90" r="3" fill="#64748b" />
                            <text x="373" y="108" fill="#64748b" fontSize="10">2F&apos;</text>

                            {/* Object Arrow on Left */}
                            {(() => {
                              const objX = 250 - objectDist * 3.2;
                              const objH = 40;
                              return (
                                <g>
                                  <line x1={objX} y1="90" x2={objX} y2={90 - objH} stroke="#ef4444" strokeWidth="3" />
                                  <polygon points={`${objX},${85 - objH} ${objX - 4},${95 - objH} ${objX + 4},${95 - objH}`} fill="#ef4444" />
                                  <text x={objX - 10} y={80 - objH} fill="#ef4444" fontSize="10" fontWeight="bold">Object</text>

                                  {/* Ray 1: Parallel to axis, then through F2 */}
                                  <line x1={objX} y1={90 - objH} x2="250" y2={90 - objH} stroke="#0284c7" strokeWidth="1.5" />
                                  <line x1="250" y1={90 - objH} x2="480" y2={90 - objH + (90 - (90 - objH)) * (230 / 65)} stroke="#0284c7" strokeWidth="1.5" />

                                  {/* Ray 2: Through optical center O (250, 90) */}
                                  <line x1={objX} y1={90 - objH} x2="480" y2={90 + (objH / (250 - objX)) * 230} stroke="#f59e0b" strokeWidth="1.5" />

                                  {/* Image Arrow on Right if real */}
                                  {!isVirtual && !isAtFocus && (
                                    <g>
                                      {(() => {
                                        const imgX = 250 + imageDist * 3.2;
                                        const imgH = Math.min(65, 40 * magnification);
                                        if (imgX > 250 && imgX < 475) {
                                          return (
                                            <>
                                              <line x1={imgX} y1="90" x2={imgX} y2={90 + imgH} stroke="#10b981" strokeWidth="3" />
                                              <polygon points={`${imgX},${95 + imgH} ${imgX - 4},${85 + imgH} ${imgX + 4},${85 + imgH}`} fill="#10b981" />
                                              <text x={imgX - 10} y={110 + imgH} fill="#10b981" fontSize="10" fontWeight="bold">Image</text>
                                            </>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </g>
                                  )}
                                </g>
                              );
                            })()}
                          </svg>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                          <div className="bg-[#070D1B]/60 border border-slate-200 rounded-xl p-2.5 shadow-xs">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Image Distance (dᵢ)</div>
                            <div className="text-sm font-black text-cyan-600 text-cyan-300">
                              {isAtFocus ? "Infinity (∞)" : `${imageDist.toFixed(1)} cm`}
                            </div>
                          </div>
                          <div className="bg-[#070D1B]/60 border border-slate-200 rounded-xl p-2.5 shadow-xs">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Nature &amp; Sizing</div>
                            <div className="text-xs font-bold text-emerald-400 truncate">
                              {opticsNature}
                            </div>
                          </div>
                          <div className="bg-[#070D1B]/60 border border-slate-200 rounded-xl p-2.5 shadow-xs">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Real Application</div>
                            <div className="text-xs font-mono font-bold text-amber-600 truncate">
                              {opticsDevice}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 3. CHEMISTRY ACID-BASE TITRATION */}
                {activeTab === "chemistry" && (
                  <div className="space-y-5 animate-bl-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <svg className="h-4 w-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M10 2v7.31L4.2 18.24A2 2 0 0 0 5.86 21h12.28a2 2 0 0 0 1.66-2.76L14 9.31V2" />
                            <path d="M8.5 2h7M7 16h10" />
                          </svg>
                          <span>Acid-Base Titration &amp; pH Reactions</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Volumetric analysis, neutralization color shifts, and indicator reaction curves</p>
                      </div>

                      {/* Titrant Dosing Slider */}
                      <div className="flex items-center gap-2 bg-[#070D1B] px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-[11px] text-slate-400 font-bold">Add Base (NaOH):</span>
                        <input
                          type="range"
                          min="1"
                          max="14"
                          step="0.5"
                          value={phLevel}
                          onChange={(e) => setPhLevel(parseFloat(e.target.value))}
                          className="w-24 accent-blue-600 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-black text-blue-600">pH {phLevel.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Animated Flask & Color Reaction */}
                    <div className="relative rounded-2xl bg-white border-2 border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-around gap-6 shadow-xs">
                      {/* Interactive Flask Graphic */}
                      <div className="relative flex flex-col items-center">
                        <div className="w-12 h-14 border-t-2 border-x-2 border-slate-400 rounded-t-sm" />
                        <div
                          className={`w-32 h-28 border-2 rounded-b-3xl transition-colors duration-500 relative overflow-hidden flex items-end justify-center ${
                            phLevel < 6.5
                              ? "border-rose-400/80 bg-rose-50 "
                              : phLevel <= 8.0
                              ? "border-emerald-400/80 bg-emerald-50 "
                              : "border-purple-400/80 bg-purple-50 "
                          }`}
                        >
                          {/* Liquid Level with Rising Bubbles */}
                          <div
                            className={`w-full transition-all duration-500 ${
                              phLevel < 6.5
                                ? "bg-rose-500/50 h-16"
                                : phLevel <= 8.0
                                ? "bg-emerald-500/50 h-20"
                                : "bg-purple-600/50 h-24"
                            }`}
                          >
                            <div className="flex justify-around items-center h-full opacity-60">
                              <span className="animate-bounce h-2 w-2 rounded-full bg-white/70" />
                              <span className="animate-ping h-1.5 w-1.5 rounded-full bg-white/50" />
                              <span className="animate-bounce h-2.5 w-2.5 rounded-full bg-white/60" />
                            </div>
                          </div>
                        </div>

                        <span className="mt-2 text-xs font-bold text-slate-700">Conical Flask (Analyte)</span>
                      </div>

                      {/* Reaction State Information Card */}
                      <div className="space-y-2.5 max-w-xs">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black ${
                          phLevel < 6.5
                            ? "bg-rose-100 text-rose-800   border border-rose-300 "
                            : phLevel <= 8.0
                            ? "bg-emerald-100 text-emerald-800  text-emerald-300 border border-emerald-300  shadow-sm"
                            : "bg-purple-100 text-purple-800   border border-purple-300 "
                        }`}>
                          <span>{phLevel < 6.5 ? "Acidic Solution" : phLevel <= 8.0 ? "Neutral Endpoint (Titration Done)" : "Alkaline / Basic Solution"}</span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {phLevel <= 8.0 && phLevel >= 6.5
                            ? "Equivalence point reached! Volume of acid neutralized exactly matches volume of base (C₁V₁ = C₂V₂)."
                            : phLevel < 6.5
                            ? "Excess H⁺ hydronium ions in solution. Add more drops from the burette to reach the equivalence point."
                            : "Excess OH⁻ hydroxide ions. The solution is over-titrated beyond the phenolphthalein end point."}
                        </p>

                        <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-200">
                          Indicator: <strong>Phenolphthalein</strong> (Colorless &rarr; Pink)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-[#070D1B]/60 rounded-xl px-4 py-2 border border-slate-200">
                      <span>WAEC Chemistry Alternative to Practical Syllabus (Volumetric Analysis)</span>
                      <span className="text-emerald-400 font-bold">Standard Lab Model</span>
                    </div>
                  </div>
                )}

                {/* 4. CELLULAR ATLAS & METABOLIC PATHWAYS */}
                {activeTab === "biology" && (
                  <div className="space-y-5 animate-bl-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 2a10 10 0 0 0-4 18M12 2a10 10 0 0 1 4 18" />
                          </svg>
                          <span>Cellular Atlas &amp; Metabolic Pathways</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Interactive eukaryotic cell explorer and double-helix genetics structure</p>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-200 text-xs font-bold text-emerald-800 text-emerald-300">
                        <span>WAEC Biology Core</span>
                      </div>
                    </div>

                    {/* Animated Cellular Diagram */}
                    <div className="relative rounded-2xl bg-white border-2 border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-around gap-6 shadow-xs">
                      {/* Pulsing Eukaryotic Cell Model */}
                      <div className="relative w-44 h-44 rounded-full border-2 border-emerald-500/40 bg-emerald-50 flex items-center justify-center shadow-md">
                        {/* Nucleus */}
                        <div className="w-20 h-20 rounded-full border-2 border-sky-400/80 bg-sky-100 flex items-center justify-center animate-pulse">
                          <span className="text-[10px] font-black text-sky-800 text-center">Nucleus<br />(DNA)</span>
                        </div>

                        {/* Orbiting Mitochondria */}
                        <div className="absolute top-3 right-6 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] text-amber-800 font-bold animate-bl-scale-in">
                          Mitochondria
                        </div>

                        {/* Ribosomes */}
                        <div className="absolute bottom-4 left-6 px-2 py-0.5 rounded-full bg-purple-100 border border-purple-300 text-[10px] text-purple-800 font-bold">
                          Ribosome
                        </div>
                      </div>

                      {/* Biological Explanations */}
                      <div className="space-y-2.5 max-w-xs">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 bg-slate-900/60 p-3 space-y-1">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Mitochondria: ATP Energy Synthesis
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            Generates cellular energy via aerobic cellular respiration and Krebs cycle enzyme pathways.
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 bg-slate-900/60 p-3 space-y-1">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-sky-500" />
                            Nucleus &amp; Double-Helix Chromatin
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            Stores genetic code $(A-T, G-C)$ and orchestrates RNA transcription for protein synthesis.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-[#070D1B]/60 rounded-xl px-4 py-2 border border-slate-200">
                      <span>Senior Secondary Biology Syllabus: Cell Structure &amp; Functions</span>
                      <span className="text-cyan-400 font-bold">Interactive Anatomy</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
