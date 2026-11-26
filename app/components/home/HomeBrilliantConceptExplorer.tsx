"use client";

import React, { useState } from "react";
import Link from "next/link";

type SubjectTab = "optics" | "titration" | "parabola";

export function HomeBrilliantConceptExplorer() {
  const [activeTab, setActiveTab] = useState<SubjectTab>("optics");

  // -------------------------------------------------------------
  // EXPERIMENT 1: OPTICS (Convex Lens Ray Tracing)
  // Focal length f = 20cm
  // Object distance do: 10cm to 60cm
  // -------------------------------------------------------------
  const [objectDist, setObjectDist] = useState<number>(35); // cm
  const focalLength = 20; // cm

  // Lens formula: 1/di = 1/f - 1/do  =>  di = (f * do) / (do - f)
  const isVirtual = objectDist < focalLength;
  const isAtFocus = objectDist === focalLength;
  const imageDist = isAtFocus ? 999 : (focalLength * objectDist) / (objectDist - focalLength);
  const magnification = isAtFocus ? 999 : Math.abs(imageDist / objectDist);

  // Status explanation
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

  // -------------------------------------------------------------
  // EXPERIMENT 2: CHEMISTRY (Titration Neutralisation & Indicator)
  // Volume of 0.1M NaOH added: 0 mL to 50 mL
  // Equivalence point = 25 mL
  // -------------------------------------------------------------
  const [baseVolume, setBaseVolume] = useState<number>(20); // mL

  // Calculate approximate pH
  let pH = 1.0;
  let indicatorColor = "#ef4444"; // Crimson Red
  let titrationStage = "Acidic Excess (pH < 7)";

  if (baseVolume < 24) {
    pH = Number((1.0 + (baseVolume / 25) * 2.5).toFixed(1));
    indicatorColor = baseVolume < 15 ? "#ef4444" : "#f97316";
    titrationStage = "Strong Acid Zone (HCl excess)";
  } else if (baseVolume >= 24 && baseVolume <= 26) {
    pH = 7.0;
    indicatorColor = "#10b981"; // Vibrant Emerald Green
    titrationStage = "Equivalence Point Hit! Neutral (pH 7.0)";
  } else {
    pH = Number((7.0 + ((baseVolume - 25) / 25) * 6.5).toFixed(1));
    indicatorColor = baseVolume < 35 ? "#3b82f6" : "#8b5cf6";
    titrationStage = "Alkaline Excess (NaOH excess)";
  }

  // -------------------------------------------------------------
  // EXPERIMENT 3: MATHEMATICS (Quadratic Parabola & Discriminant)
  // Equation: y = x^2 - 4x + c
  // a = 1, b = -4. Delta = b^2 - 4ac = 16 - 4c
  // -------------------------------------------------------------
  const [constC, setConstC] = useState<number>(3); // c slider from 0 to 6
  const discriminant = 16 - 4 * constC;

  let rootNature = "";
  let rootBadgeColor = "";
  if (discriminant > 0) {
    rootNature = "Two Distinct Real Roots (Crosses x-axis twice)";
    rootBadgeColor = "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800";
  } else if (discriminant === 0) {
    rootNature = "One Repeated Real Root (Tangent to x-axis at x = 2)";
    rootBadgeColor = "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800";
  } else {
    rootNature = "Zero Real Roots (Floating curve, complex roots)";
    rootBadgeColor = "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800";
  }

  return (
    <section
      id="concept-explorer"
      aria-label="Interactive STEM Concept Explorer"
      className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-16 lg:py-20 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-[#060b14] dark:via-[#081020] dark:to-[#060b14] overflow-hidden"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Centralized Editorial Header (Brilliant.org Style with Breathing Space) */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/60 px-4 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
            <span>LEARN BY DOING • BRILLIANT-STYLE INTERACTIVE EXPLORER</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Master Difficult Concepts Visually. <br className="hidden sm:inline" />
            <span className="text-blue-600 dark:text-cyan-400">
              Manipulate Variables With Your Own Hands.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto pt-1">
            Rote memorisation collapses under exam hall pressure. When you test live optics rays, titration curves, and parabolas in real time, difficult WAEC &amp; JAMB questions become obvious.
          </p>

          {/* Subject Switcher Tabs */}
          <div className="pt-2 inline-flex p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("optics")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                activeTab === "optics"
                  ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm border-slate-200 dark:border-slate-700 font-black"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Physics: Convex Lens Optics</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("titration")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                activeTab === "titration"
                  ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-sm border-slate-200 dark:border-slate-700 font-black"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 2v7.31L4.89 20a2 2 0 0 0 1.78 3h14.66a2 2 0 0 0 1.78-3L18 9.31V2" />
                <path d="M8 2h8" />
              </svg>
              <span>Chemistry: Titration Neutralisation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("parabola")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                activeTab === "parabola"
                  ? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm border-slate-200 dark:border-slate-700 font-black"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Maths: Quadratic Discriminant</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* EXPERIMENT 1: PHYSICS CONVEX LENS OPTICS RAY TRACER       */}
        {/* ========================================================= */}
        {activeTab === "optics" && (
          <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 lg:p-10 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">
                  Geometrical Optics Simulation • Focal Length f = 20 cm
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  Convex Lens Real-Time Ray Tracer
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isVirtual
                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                }`}>
                  {opticsNature}
                </span>
              </div>
            </div>

            {/* Interactive Ray Canvas (SVG) */}
            <div className="relative rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-950 p-4 sm:p-6 overflow-hidden">
              <div className="absolute top-3 left-4 text-[10px] font-mono text-slate-400 flex items-center gap-3">
                <span>Principal Axis</span>
                <span className="text-cyan-400 font-bold">Object: {objectDist} cm</span>
                <span className="text-emerald-400 font-bold">Image: {isAtFocus ? "Infinity" : `${Math.abs(imageDist).toFixed(1)} cm`}</span>
                <span className="text-amber-400 font-bold">Magnification: {isAtFocus ? "Infinity" : `${magnification.toFixed(2)}x`}</span>
              </div>

              {/* 2D Ray Tracing Canvas */}
              <div className="w-full h-56 sm:h-64 flex items-center justify-center">
                <svg viewBox="0 0 600 240" className="w-full h-full select-none" aria-label="Convex lens ray tracing diagram">
                  {/* Grid Lines */}
                  <line x1="0" y1="120" x2="600" y2="120" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
                  
                  {/* Lens Center (x = 300) */}
                  <line x1="300" y1="20" x2="300" y2="220" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="3 3" />
                  <ellipse cx="300" cy="120" rx="14" ry="100" fill="#0284c7" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="2.5" />

                  {/* Focal Points: F1 (200), 2F1 (100) on left; F2 (400), 2F2 (500) on right */}
                  <circle cx="200" cy="120" r="4" fill="#f59e0b" />
                  <text x="195" y="140" fill="#94a3b8" fontSize="11" fontFamily="monospace">F</text>
                  <circle cx="100" cy="120" r="4" fill="#f59e0b" />
                  <text x="92" y="140" fill="#94a3b8" fontSize="11" fontFamily="monospace">2F</text>

                  <circle cx="400" cy="120" r="4" fill="#f59e0b" />
                  <text x="395" y="140" fill="#94a3b8" fontSize="11" fontFamily="monospace">F'</text>
                  <circle cx="500" cy="120" r="4" fill="#f59e0b" />
                  <text x="492" y="140" fill="#94a3b8" fontSize="11" fontFamily="monospace">2F'</text>

                  {/* OBJECT ARROW (Left of Lens) */}
                  {/* objectDist in range 10..60 maps to x = 300 - objectDist*4.5 */}
                  {(() => {
                    const objX = Math.max(30, 300 - objectDist * 4.8);
                    const objHeight = 50;
                    const imgHeight = Math.min(90, Math.max(10, objHeight * (magnification > 5 ? 5 : magnification)));
                    const imgX = isVirtual
                      ? 300 - Math.min(270, Math.abs(imageDist) * 4.8)
                      : 300 + Math.min(270, imageDist * 4.8);

                    return (
                      <g>
                        {/* Object Arrow */}
                        <line x1={objX} y1="120" x2={objX} y2={120 - objHeight} stroke="#06b6d4" strokeWidth="3.5" />
                        <polygon points={`${objX - 5},${120 - objHeight + 8} ${objX + 5},${120 - objHeight + 8} ${objX},${120 - objHeight}`} fill="#06b6d4" />
                        <text x={objX - 18} y={120 - objHeight - 6} fill="#22d3ee" fontSize="10" fontWeight="bold">Object</text>

                        {/* Ray 1: Parallel to axis, then through F' */}
                        <line x1={objX} y1={120 - objHeight} x2="300" y2={120 - objHeight} stroke="#38bdf8" strokeWidth="1.5" />
                        <line x1="300" y1={120 - objHeight} x2="600" y2={120 + ((objHeight * (600 - 300)) / (400 - 300))} stroke="#38bdf8" strokeWidth="1.5" />

                        {/* Ray 2: Through optical center (300, 120) */}
                        <line x1={objX} y1={120 - objHeight} x2="600" y2={120 + (((120 - (120 - objHeight)) * (600 - 300)) / (300 - objX))} stroke="#a855f7" strokeWidth="1.5" />

                        {/* Virtual Backwards Extension Rays (Dashed) */}
                        {isVirtual && (
                          <g stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3">
                            <line x1="300" y1={120 - objHeight} x2={imgX} y2={120 - imgHeight} />
                            <line x1="300" y1="120" x2={imgX} y2={120 - imgHeight} />
                          </g>
                        )}

                        {/* IMAGE ARROW */}
                        {!isAtFocus && (
                          <g>
                            <line
                              x1={imgX}
                              y1="120"
                              x2={imgX}
                              y2={isVirtual ? 120 - imgHeight : 120 + imgHeight}
                              stroke={isVirtual ? "#f59e0b" : "#10b981"}
                              strokeWidth="3.5"
                              strokeDasharray={isVirtual ? "4 2" : "none"}
                            />
                            <polygon
                              points={
                                isVirtual
                                  ? `${imgX - 5},${120 - imgHeight + 8} ${imgX + 5},${120 - imgHeight + 8} ${imgX},${120 - imgHeight}`
                                  : `${imgX - 5},${120 + imgHeight - 8} ${imgX + 5},${120 + imgHeight - 8} ${imgX},${120 + imgHeight}`
                              }
                              fill={isVirtual ? "#f59e0b" : "#10b981"}
                            />
                            <text
                              x={imgX - 16}
                              y={isVirtual ? 120 - imgHeight - 8 : 120 + imgHeight + 16}
                              fill={isVirtual ? "#f59e0b" : "#34d399"}
                              fontSize="10"
                              fontWeight="bold"
                            >
                              Image {isVirtual ? "(Virtual)" : "(Real)"}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Tactile Slider Control & Live Diagnostics */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">
                    Slide Object Distance: <strong className="text-blue-600 dark:text-cyan-400 font-mono text-sm">{objectDist} cm</strong>
                  </span>
                  <span className="text-slate-500 text-[11px]">Focal Length f = 20 cm</span>
                </div>

                <input
                  type="range"
                  min="10"
                  max="55"
                  step="1"
                  value={objectDist}
                  onChange={(e) => setObjectDist(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  aria-label="Object Distance Slider"
                />

                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>10 cm (Inside F)</span>
                  <span>20 cm (At F)</span>
                  <span>40 cm (At 2F)</span>
                  <span>55 cm (Beyond 2F)</span>
                </div>
              </div>

              <div className="md:col-span-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-4 space-y-1.5 text-xs text-blue-950 dark:text-blue-200">
                <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <span>Practical Examination Application:</span>
                </div>
                <p className="leading-relaxed">
                  Real-world application: <strong>{opticsDevice}</strong>.
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  <strong>JAMB Question Tip:</strong> When object is within focal length (&lt; 20 cm), rays diverge on the right; the eye projects them backward, producing a virtual, erect, magnified image.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* EXPERIMENT 2: CHEMISTRY ACID-BASE TITRATION & pH CURVE    */}
        {/* ========================================================= */}
        {activeTab === "titration" && (
          <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 lg:p-10 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                  Volumetric Analysis • 25 mL 0.1M HCl titrated against 0.1M NaOH
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  Acid-Base Neutralisation &amp; Indicator Spectrum
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="px-3.5 py-1 rounded-full text-xs font-black border shadow-xs transition-colors duration-300"
                  style={{
                    backgroundColor: `${indicatorColor}20`,
                    borderColor: indicatorColor,
                    color: indicatorColor,
                  }}
                >
                  {titrationStage}
                </span>
              </div>
            </div>

            {/* Simulation Canvas: Flask + Live Dynamic Color Indicator */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: Animated Conical Flask */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-950 text-white min-h-[260px] relative overflow-hidden">
                <span className="text-[11px] font-mono text-slate-400 mb-3">Conical Flask with Indicator</span>

                <div className="relative w-36 h-44 flex flex-col items-center justify-end">
                  {/* Burette Tip */}
                  <div className="absolute top-0 w-2 h-10 bg-slate-400 rounded-b-sm flex flex-col items-center justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mb-0.5" />
                  </div>

                  {/* Glass Flask SVG */}
                  <svg viewBox="0 0 100 120" className="w-full h-full z-10 select-none">
                    <path
                      d="M40 0 L60 0 L60 30 L95 110 A 5 5 0 0 1 90 118 L10 118 A 5 5 0 0 1 5 110 L40 30 Z"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="3.5"
                    />
                    {/* Liquid fill inside flask */}
                    <path
                      d="M20 95 L80 95 L88 114 L12 114 Z"
                      fill={indicatorColor}
                      fillOpacity="0.75"
                      className="transition-colors duration-300"
                    />
                  </svg>
                </div>

                <div className="mt-4 flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">Current pH:</span>
                  <span
                    className="text-lg font-black px-2.5 py-0.5 rounded-lg border"
                    style={{ borderColor: indicatorColor, color: indicatorColor }}
                  >
                    {pH.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Right Column: Controls & Stoichiometry Formula */}
              <div className="md:col-span-7 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">
                      Burette NaOH Added: <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{baseVolume} mL</strong>
                    </span>
                    <span className="text-slate-500 text-[11px]">Equivalence Target = 25.0 mL</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={baseVolume}
                    onChange={(e) => setBaseVolume(Number(e.target.value))}
                    className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    aria-label="Base Volume Added Slider"
                  />

                  <div className="flex justify-between text-[11px] font-mono text-slate-500">
                    <span>0 mL (Pure Acid)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">25 mL (Neutral pH 7)</span>
                    <span>50 mL (Excess Base)</span>
                  </div>
                </div>

                {/* Quick Add Drop Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setBaseVolume((v) => Math.min(50, v + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                  >
                    +1.0 mL Drop
                  </button>
                  <button
                    type="button"
                    onClick={() => setBaseVolume(25)}
                    className="px-3 py-1.5 rounded-xl border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    <span>Jump to Equivalence (25 mL)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBaseVolume(0)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                  >
                    Reset to 0 mL
                  </button>
                </div>

                <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-4 space-y-1.5 text-xs text-emerald-950 dark:text-emerald-200">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <span>WAEC Practical Stoichiometry Equation:</span>
                  </div>
                  <p className="font-mono font-bold text-xs">
                    (C_a &times; V_a) / (C_b &times; V_b) = n_a / n_b = 1 / 1
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    At exactly 25.0 mL of NaOH added, all hydronium ions (H⁺) from the acid have bound with hydroxide ions (OH⁻) from the base to yield neutral H₂O.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* EXPERIMENT 3: MATHEMATICS QUADRATIC PARABOLA & ROOTS      */}
        {/* ========================================================= */}
        {activeTab === "parabola" && (
          <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 lg:p-10 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold">
                  Algebra &amp; Coordinate Geometry • Equation: y = x² - 4x + c
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  Parabola Trajectory &amp; Discriminant (Δ = b² - 4ac)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${rootBadgeColor}`}>
                  {rootNature}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: Interactive Coordinate Canvas */}
              <div className="md:col-span-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-950 p-4 sm:p-6 text-white overflow-hidden">
                <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mb-2">
                  <span>Cartesian Grid [-2 to 6]</span>
                  <span className="text-purple-400 font-bold">Discriminant Δ = {discriminant}</span>
                </div>

                <div className="w-full h-52 flex items-center justify-center">
                  <svg viewBox="0 0 300 200" className="w-full h-full select-none" aria-label="Quadratic curve diagram">
                    {/* Axes: Origin at (150, 130) */}
                    <line x1="20" y1="130" x2="280" y2="130" stroke="#475569" strokeWidth="1.5" />
                    <line x1="90" y1="20" x2="90" y2="180" stroke="#475569" strokeWidth="1.5" />
                    <text x="270" y="145" fill="#94a3b8" fontSize="10">x</text>
                    <text x="75" y="30" fill="#94a3b8" fontSize="10">y</text>

                    {/* Plot Parabola: y = (x - 2)^2 + (c - 4) */}
                    {/* Vertex is at x = 2 (SVG x = 90 + 2*25 = 140), y = c - 4 (SVG y = 130 - (c - 4)*18) */}
                    {(() => {
                      const points: string[] = [];
                      for (let xVal = -1; xVal <= 5; xVal += 0.2) {
                        const yVal = xVal * xVal - 4 * xVal + constC;
                        const svgX = 90 + xVal * 25;
                        const svgY = 130 - yVal * 16;
                        points.push(`${svgX.toFixed(1)},${svgY.toFixed(1)}`);
                      }
                      return (
                        <g>
                          <polyline
                            points={points.join(" ")}
                            fill="none"
                            stroke="#c084fc"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          {/* Vertex Dot */}
                          <circle cx="140" cy={130 - (constC - 4) * 16} r="4" fill="#f59e0b" />
                          <text x="145" y={130 - (constC - 4) * 16 - 8} fill="#f59e0b" fontSize="9" fontFamily="monospace">
                            V(2, {constC - 4})
                          </text>

                          {/* Roots Dots if Discriminant >= 0 */}
                          {discriminant >= 0 && (
                            <g fill="#10b981">
                              <circle cx={90 + (2 - Math.sqrt(discriminant) / 2) * 25} cy="130" r="4" />
                              <circle cx={90 + (2 + Math.sqrt(discriminant) / 2) * 25} cy="130" r="4" />
                            </g>
                          )}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Right Column: Coefficient Slider & Exam Rule */}
              <div className="md:col-span-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">
                      Constant Term (c): <strong className="text-purple-600 dark:text-purple-400 font-mono text-sm">{constC}</strong>
                    </span>
                    <span className="text-slate-500 text-[11px]">y = x² - 4x + {constC}</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={constC}
                    onChange={(e) => setConstC(Number(e.target.value))}
                    className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    aria-label="Constant C Slider"
                  />

                  <div className="flex justify-between text-[11px] font-mono text-slate-500">
                    <span>c = 0 (Δ = +16, 2 Roots)</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">c = 4 (Δ = 0, 1 Root)</span>
                    <span>c = 6 (Δ = -8, 0 Roots)</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 p-4 space-y-1.5 text-xs text-purple-950 dark:text-purple-200">
                  <div className="font-bold flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                    <span>JAMB UTME Discriminant Rule:</span>
                  </div>
                  <p className="leading-relaxed">
                    Formula: <strong>&Delta; = b² - 4ac = (-4)² - 4(1)({constC}) = {discriminant}</strong>.
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    When c = 4, &Delta; = 0. The parabola touches the x-axis at exactly one point (x = 2). If c &gt; 4, &Delta; &lt; 0 and no real roots exist.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA to Full STEM Studio */}
        <div className="mt-8 text-center">
          <Link
            href="/products/stem-studio"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm px-6 py-3.5 shadow-md transition-all active:translate-y-0.5"
          >
            <span>Explore 40+ Interactive Virtual Experiments in STEM Studio</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
export default HomeBrilliantConceptExplorer;
