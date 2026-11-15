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

  // Physics Trajectory Interactive State
  const [launchAngle, setLaunchAngle] = useState<number>(45);

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
      className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-20 lg:py-24 border-b border-white/10 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border-2 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 sm:p-10 lg:p-12 text-slate-900 dark:text-white shadow-sm relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            {/* Left Column: Catchy Educational Overview */}
            <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-3.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                <span>VIRTUAL SCIENCE &amp; STEM LABORATORIES (SLOT S5-01)</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Interactive Science in Motion. <br className="hidden sm:inline" />
                <span className="text-blue-600 dark:text-blue-400">
                  Not Just Dry Textbooks.
                </span>
              </h2>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Rather than memorizing abstract formulas, candidates manipulate live variables and watch real physical outcomes happen instantly—bridging classroom theory directly with WAEC &amp; JAMB practical CBT exams.
              </p>

              {/* Catchy Value Badges */}
              {/* Catchy Value Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-left">
                  <span className="text-base" aria-hidden="true">⚡</span>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white">60 FPS Motion</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Zero lag physics</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-left">
                  <span className="text-base" aria-hidden="true">🧪</span>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white">WAEC &amp; JAMB</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Practical syllabus</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-left">
                  <span className="text-base" aria-hidden="true">📱</span>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white">Instant Load</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Low data overhead</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/classroom/stem"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-blue-600 hover:bg-blue-500 active:border-b-2 active:translate-y-0.5 px-6 py-3.5 text-sm font-black text-white shadow-md transition-all bl-focus-ring min-h-[48px] group"
                >
                  <span>Launch STEM Studio</span>
                  <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                </Link>

                <Link
                  href="/products/stem-studio"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border-2 border-b-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:border-b-2 active:translate-y-0.5 px-5 py-3.5 text-sm font-bold text-slate-800 dark:text-slate-200 transition-all bl-focus-ring min-h-[48px]"
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
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "circuits"}
                  onClick={() => setActiveTab("circuits")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    activeTab === "circuits"
                      ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm border-slate-200 dark:border-slate-700 font-black"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span aria-hidden="true">⚡</span>
                  <span className="truncate">Logic Gates & Circuit Simulators</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "physics"}
                  onClick={() => setActiveTab("physics")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    activeTab === "physics"
                      ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm border-slate-200 dark:border-slate-700 font-black"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span aria-hidden="true">📐</span>
                  <span className="truncate">Physics Mechanics & Kinematics</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "chemistry"}
                  onClick={() => setActiveTab("chemistry")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    activeTab === "chemistry"
                      ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm border-slate-200 dark:border-slate-700 font-black"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span aria-hidden="true">🧪</span>
                  <span className="truncate">Acid-Base Titration & pH Reactions</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "biology"}
                  onClick={() => setActiveTab("biology")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    activeTab === "biology"
                      ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm border-slate-200 dark:border-slate-700 font-black"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span aria-hidden="true">🧬</span>
                  <span className="truncate">Cellular Atlas & Metabolic Pathways</span>
                </button>
              </div>

              {/* Main Interactive Animated Stage */}
              <div
                className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5 sm:p-6 shadow-inner min-h-[360px] flex flex-col justify-between"
                role="region"
                aria-label="Interactive Logic Gate Bench and Virtual Science Stage"
              >
                {/* 1. DIGITAL CIRCUITS & LOGIC GATES */}
                {activeTab === "circuits" && (
                  <div className="space-y-5 animate-bl-fade-in">
                    {/* Header Controls: Gate Selection Chips */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                          Interactive Logic Gate Bench
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Click a gate or flip switches to see the circuit power up</p>
                      </div>

                      {/* Gate Type Toggle */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        {(["AND", "OR", "XOR", "NOT"] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGate(g)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              gate === g
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Animated Circuit Board Visual */}
                    <div className="relative rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden shadow-xs">
                      {/* Interactive Switch Controls */}
                      <div className="flex sm:flex-col gap-3 z-10">
                        <button
                          type="button"
                          onClick={() => setInputA(!inputA)}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-b-4 font-bold text-xs transition-all cursor-pointer active:border-b-2 active:translate-y-0.5 ${
                            inputA
                              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-900 dark:text-emerald-200 shadow-xs"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <span className={`h-3 w-3 rounded-full ${inputA ? "bg-emerald-500 shadow-xs" : "bg-slate-400 dark:bg-slate-600"}`} />
                          <span>Switch A: {inputA ? "ON (1)" : "OFF (0)"}</span>
                        </button>

                        {gate !== "NOT" ? (
                          <button
                            type="button"
                            onClick={() => setInputB(!inputB)}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-b-4 font-bold text-xs transition-all cursor-pointer active:border-b-2 active:translate-y-0.5 ${
                              inputB
                                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-900 dark:text-emerald-200 shadow-xs"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            <span className={`h-3 w-3 rounded-full ${inputB ? "bg-emerald-500 shadow-xs" : "bg-slate-400 dark:bg-slate-600"}`} />
                            <span>Switch B: {inputB ? "ON (1)" : "OFF (0)"}</span>
                          </button>
                        ) : (
                          <div className="px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-[11px] italic text-center">
                            Single Input (Inverter)
                          </div>
                        )}
                      </div>

                      {/* Animated Circuit Core & Chip */}
                      <div className="flex flex-col items-center justify-center z-10">
                        <div className={`relative px-5 py-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center ${
                          isCircuitLit
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 shadow-md text-blue-950 dark:text-blue-100"
                            : "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-500"
                        }`}>
                          <span className="text-[10px] font-mono tracking-widest text-blue-600 dark:text-blue-400 font-bold uppercase">LOGIC CHIP</span>
                          <span className="text-xl font-black text-slate-900 dark:text-white">{gate}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 font-bold">
                            {gate === "NOT" ? "Q = ¬A" : `Q = A ${gate} B`}
                          </span>
                        </div>
                      </div>

                      {/* Glowing Lightbulb / Power Indicator */}
                      <div className="flex flex-col items-center justify-center z-10">
                        <div className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-500 ${
                          isCircuitLit
                            ? "bg-amber-100 dark:bg-amber-400/20 border-2 border-amber-500 text-amber-500 shadow-xl shadow-amber-400/30"
                            : "bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400"
                        }`}>
                          <span className={`text-4xl transition-transform duration-300 ${isCircuitLit ? "scale-110 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]" : "grayscale opacity-40"}`}>
                            💡
                          </span>
                        </div>
                        <div className="mt-2 text-center">
                          <span className={`text-xs font-black uppercase tracking-wider ${isCircuitLit ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
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

                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/60 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-800">
                      <span>Curriculum Rule: <strong>{gate}</strong> gate outputs active current when its logic condition is met.</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">Physics &amp; Computer Studies</span>
                    </div>
                  </div>
                )}

                {/* 2. PHYSICS MECHANICS & KINEMATICS */}
                {activeTab === "physics" && (
                  <div className="space-y-5 animate-bl-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <span className="text-base">📐</span>
                          Physics Mechanics & Kinematics
                        </div>
                        <p className="text-[11px] text-slate-400">Simulate parabolic projectile motion and gravitational trajectory in real-time</p>
                      </div>

                      {/* Angle Selector */}
                      <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 px-2 font-bold">Launch Angle:</span>
                        {[30, 45, 60].map((angle) => (
                          <button
                            key={angle}
                            type="button"
                            onClick={() => setLaunchAngle(angle)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                              launchAngle === angle
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {angle}°
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Animated Trajectory SVG Canvas */}
                    <div className="relative rounded-2xl bg-[#030712] border border-slate-800 p-4 h-48 flex items-end justify-center overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 500 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Grid Lines */}
                        <line x1="40" y1="150" x2="460" y2="150" stroke="#1e293b" strokeWidth="2" />
                        <line x1="40" y1="30" x2="40" y2="150" stroke="#1e293b" strokeWidth="2" />
                        
                        {/* Trajectory Parabola (changes according to launch angle) */}
                        <path
                          d={
                            launchAngle === 30
                              ? "M 50 150 Q 240 70 430 150"
                              : launchAngle === 45
                              ? "M 50 150 Q 240 25 430 150"
                              : "M 50 150 Q 200 10 350 150"
                          }
                          stroke="#38bdf8"
                          strokeWidth="3"
                          strokeDasharray="6,4"
                          className="transition-all duration-500"
                        />

                        {/* Cannon / Launcher */}
                        <circle cx="50" cy="150" r="10" fill="#3b82f6" />
                        
                        {/* Moving Projectile Particle */}
                        <circle cx={launchAngle === 60 ? "200" : "240"} cy={launchAngle === 45 ? "35" : launchAngle === 60 ? "20" : "75"} r="7" fill="#fbbf24">
                          <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
                        </circle>

                        {/* Target Flag */}
                        <circle cx={launchAngle === 60 ? "350" : "430"} cy="150" r="6" fill="#10b981" />
                        <text x={launchAngle === 60 ? "335" : "415"} y="170" fill="#10b981" fontSize="11" fontWeight="bold">Target</text>
                        <text x="50" y="170" fill="#64748b" fontSize="10">Origin (0m)</text>
                      </svg>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Apex Height</div>
                        <div className="text-sm font-black text-sky-400">{launchAngle === 45 ? "22.5 m" : launchAngle === 60 ? "31.2 m" : "14.8 m"}</div>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Flight Range</div>
                        <div className="text-sm font-black text-emerald-400">{launchAngle === 45 ? "92.0 m (Max)" : launchAngle === 60 ? "76.4 m" : "80.1 m"}</div>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Equation</div>
                        <div className="text-xs font-mono font-bold text-amber-300">y = v₀t - ½gt²</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. CHEMISTRY ACID-BASE TITRATION */}
                {activeTab === "chemistry" && (
                  <div className="space-y-5 animate-bl-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <span className="text-base">🧪</span>
                          Acid-Base Titration & pH Reactions
                        </div>
                        <p className="text-[11px] text-slate-400">Volumetric analysis, neutralization color shifts, and indicator reaction curves</p>
                      </div>

                      {/* Titrant Dosing Slider */}
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 font-bold">Add Base (NaOH):</span>
                        <input
                          type="range"
                          min="1"
                          max="14"
                          step="0.5"
                          value={phLevel}
                          onChange={(e) => setPhLevel(parseFloat(e.target.value))}
                          className="w-24 accent-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-black text-blue-300">pH {phLevel.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Animated Flask & Color Reaction */}
                    <div className="relative rounded-2xl bg-[#030712] border border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-around gap-6">
                      {/* Interactive Flask Graphic */}
                      <div className="relative flex flex-col items-center">
                        <div className="w-12 h-14 border-t-2 border-x-2 border-slate-600 rounded-t-sm" />
                        <div
                          className={`w-32 h-28 border-2 rounded-b-3xl transition-colors duration-500 relative overflow-hidden flex items-end justify-center ${
                            phLevel < 6.5
                              ? "border-rose-400/80 bg-rose-950/40"
                              : phLevel <= 8.0
                              ? "border-emerald-400/80 bg-emerald-950/40"
                              : "border-purple-400/80 bg-purple-950/40"
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
                              <span className="animate-bounce text-xs">⚪</span>
                              <span className="animate-ping text-[8px]">⚪</span>
                              <span className="animate-bounce text-[10px]">⚪</span>
                            </div>
                          </div>
                        </div>

                        <span className="mt-2 text-xs font-bold text-slate-300">Conical Flask (Analyte)</span>
                      </div>

                      {/* Reaction State Information Card */}
                      <div className="space-y-2.5 max-w-xs">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black ${
                          phLevel < 6.5
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : phLevel <= 8.0
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-md shadow-emerald-950"
                            : "bg-purple-950 text-purple-300 border border-purple-800"
                        }`}>
                          <span>{phLevel < 6.5 ? "🔴 Acidic Solution" : phLevel <= 8.0 ? "🟢 Neutral Endpoint (Titration Done)" : "🟣 Alkaline / Basic Solution"}</span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {phLevel <= 8.0 && phLevel >= 6.5
                            ? "Equivalence point reached! Volume of acid neutralized exactly matches volume of base (C₁V₁ = C₂V₂)."
                            : phLevel < 6.5
                            ? "Excess H⁺ hydronium ions in solution. Add more drops from the burette to reach the equivalence point."
                            : "Excess OH⁻ hydroxide ions. The solution is over-titrated beyond the phenolphthalein end point."}
                        </p>

                        <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          Indicator: <strong>Phenolphthalein</strong> (Colorless ➔ Pink)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 rounded-xl px-4 py-2 border border-slate-800">
                      <span>🧪 WAEC Chemistry Alternative to Practical Syllabus (Volumetric Analysis)</span>
                      <span className="text-emerald-400 font-bold">Standard Lab Model</span>
                    </div>
                  </div>
                )}

                {/* 4. CELLULAR ATLAS & METABOLIC PATHWAYS */}
                {activeTab === "biology" && (
                  <div className="space-y-5 animate-bl-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <span className="text-base">🧬</span>
                          Cellular Atlas & Metabolic Pathways
                        </div>
                        <p className="text-[11px] text-slate-400">Interactive eukaryotic cell explorer and double-helix genetics structure</p>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-xs font-bold text-emerald-300">
                        <span>WAEC Biology Core</span>
                      </div>
                    </div>

                    {/* Animated Cellular Diagram */}
                    <div className="relative rounded-2xl bg-[#030712] border border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-around gap-6">
                      {/* Pulsing Eukaryotic Cell Model */}
                      <div className="relative w-44 h-44 rounded-full border-2 border-emerald-500/40 bg-emerald-950/20 flex items-center justify-center shadow-xl shadow-emerald-950/40">
                        {/* Nucleus */}
                        <div className="w-20 h-20 rounded-full border-2 border-sky-400/80 bg-sky-950/60 flex items-center justify-center animate-pulse">
                          <span className="text-[10px] font-black text-sky-300 text-center">Nucleus<br />(DNA)</span>
                        </div>

                        {/* Orbiting Mitochondria */}
                        <div className="absolute top-3 right-6 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/80 text-[10px] text-amber-300 font-bold animate-bl-scale-in">
                          ⚡ Mitochondria
                        </div>

                        {/* Ribosomes */}
                        <div className="absolute bottom-4 left-6 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-600/80 text-[10px] text-purple-300 font-bold">
                          🧬 Ribosome
                        </div>
                      </div>

                      {/* Biological Explanations */}
                      <div className="space-y-2.5 max-w-xs">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Mitochondria: ATP Energy Synthesis
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            Generates cellular energy via aerobic cellular respiration and Krebs cycle enzyme pathways.
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-sky-400" />
                            Nucleus & Double-Helix Chromatin
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            Stores genetic code $(A-T, G-C)$ and orchestrates RNA transcription for protein synthesis.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 rounded-xl px-4 py-2 border border-slate-800">
                      <span>🧬 Senior Secondary Biology Syllabus: Cell Structure &amp; Functions</span>
                      <span className="text-sky-400 font-bold">Interactive Anatomy</span>
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
