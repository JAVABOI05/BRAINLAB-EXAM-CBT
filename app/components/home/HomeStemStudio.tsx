"use client";

import React, { useState } from "react";
import Link from "next/link";

type GateType = "AND" | "OR" | "NOT" | "XOR";

export function HomeStemStudio() {
  // Interactive Boolean Logic Gate Bench State (Slot S5-01)
  const [gate, setGate] = useState<GateType>("AND");
  const [inputA, setInputA] = useState<boolean>(true);
  const [inputB, setInputB] = useState<boolean>(false);

  // Compute output
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

  const outputQ = computeOutput(gate, inputA, inputB);

  const STEM_LABS = [
    {
      title: "Physics Mechanics & Kinematics",
      discipline: "Physics",
      description: "Tweak velocity, angles, and gravitational constants with real-time trajectory curves and projectile formula derivation.",
      badge: "Parameter Sandbox",
      icon: "📐",
    },
    {
      title: "Acid-Base Titration & pH Reactions",
      discipline: "Chemistry",
      description: "Simulate volumetric analysis, neutralization endpoints, and indicator color changes with precise molarity sliders.",
      badge: "Volumetric Lab",
      icon: "🧪",
    },
    {
      title: "Cellular Atlas & Metabolic Pathways",
      discipline: "Biology",
      description: "Interactive 3D organelle explorer and stepped Krebs cycle enzyme pathways with high-contrast cellular diagrams.",
      badge: "3D Biology",
      icon: "🧬",
    },
    {
      title: "Logic Gates & Circuit Simulators",
      discipline: "Applied Science",
      description: "Build AND, OR, and NOT gate configurations. Test truth tables with live toggles directly mapped to secondary physics curricula.",
      badge: "Circuit Stage",
      icon: "⚡",
    },
  ];

  return (
    <section
      id="stem-studio"
      aria-label="STEM Studio Virtual Science Laboratories"
      className="py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#070D18]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#0a1326] to-[#060b14] p-6 sm:p-10 lg:p-12 text-white shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Header & Actions */}
            <div className="lg:col-span-5 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-3.5 py-1 text-xs font-bold text-blue-300">
                <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-bl-pulse" />
                <span>STEM STUDIO SPOTLIGHT (SLOT S5-01)</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Virtual Science Labs. Real Empirical Understanding.
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Rather than memorizing abstract textbook equations, candidates manipulate variables, observe instantaneous physical outcomes, and connect practical laboratory concepts directly to CBT examination questions.
              </p>

              {/* Honest Pedagogical Boundary Disclosure */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs text-slate-400 space-y-1">
                <span className="font-bold text-blue-300 block">Performance &amp; Battery Notice:</span>
                <span>
                  Interactive 2D physics and logic engines run locally at 60 FPS without high data overhead. 3D molecular models load strictly on-demand on the STEM page after explicit user intent.
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/classroom/stem"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all bl-focus-ring min-h-[44px] bl-interactive-hover"
                >
                  <span>Launch STEM Studio</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>

                <Link
                  href="/products/stem-studio"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition-all bl-focus-ring min-h-[44px] bl-interactive-hover"
                >
                  Explore Virtual Labs
                </Link>
              </div>
            </div>

            {/* Right Interactive Logic Gates Workbench (Slot S5-01) */}
            <div className="lg:col-span-7 space-y-5">
              <div
                className="rounded-2xl border border-slate-700/80 bg-slate-950/90 p-5 sm:p-6 shadow-inner space-y-5"
                role="region"
                aria-label="Interactive Boolean Logic Gates Simulation Bench"
              >
                {/* Bench Header & Gate Selector */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">⚡</span>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        Interactive Logic Gate Bench
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Senior Secondary Physics &amp; Computer Studies Syllabus
                      </p>
                    </div>
                  </div>

                  {/* Gate Toggle Buttons */}
                  <div
                    role="group"
                    aria-label="Select Logic Gate Type"
                    className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800"
                  >
                    {(["AND", "OR", "NOT", "XOR"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGate(g)}
                        aria-pressed={gate === g}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          gate === g
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Circuit Schematic Visualization */}
                <div className="rounded-xl border border-slate-800/80 bg-[#040812] p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Input Controls */}
                    <div className="md:col-span-4 flex md:flex-col justify-around gap-3">
                      {/* Input A */}
                      <button
                        type="button"
                        onClick={() => setInputA(!inputA)}
                        aria-pressed={inputA}
                        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-xs font-bold ${
                          inputA
                            ? "border-emerald-500/80 bg-emerald-950/40 text-emerald-300"
                            : "border-slate-800 bg-slate-900 text-slate-400"
                        }`}
                      >
                        <span>Input A:</span>
                        <span className="font-mono text-sm px-2 py-0.5 rounded bg-black/40">
                          {inputA ? "1 (HIGH)" : "0 (LOW)"}
                        </span>
                      </button>

                      {/* Input B (Hidden if NOT gate) */}
                      {gate !== "NOT" ? (
                        <button
                          type="button"
                          onClick={() => setInputB(!inputB)}
                          aria-pressed={inputB}
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-xs font-bold ${
                            inputB
                              ? "border-emerald-500/80 bg-emerald-950/40 text-emerald-300"
                              : "border-slate-800 bg-slate-900 text-slate-400"
                          }`}
                        >
                          <span>Input B:</span>
                          <span className="font-mono text-sm px-2 py-0.5 rounded bg-black/40">
                            {inputB ? "1 (HIGH)" : "0 (LOW)"}
                          </span>
                        </button>
                      ) : (
                        <div className="px-3.5 py-2.5 rounded-xl border border-dashed border-slate-800 text-[11px] text-slate-500 italic text-center">
                          Input B not used by NOT gate
                        </div>
                      )}
                    </div>

                    {/* Schematic Representation */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-3">
                      <div className="relative flex items-center justify-center w-28 h-20 rounded-2xl border border-blue-500/40 bg-blue-950/30">
                        <span className="text-sm font-black text-blue-300 tracking-wider">
                          {gate}
                        </span>
                        <span className="text-[10px] text-slate-400 absolute bottom-1">
                          GATE
                        </span>
                      </div>
                      <div className="mt-2 text-[10px] font-mono text-slate-400">
                        Signal: {gate === "NOT" ? `Q = ¬A` : `Q = A ${gate} B`}
                      </div>
                    </div>

                    {/* Output Probe */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                        Output Q (Signal)
                      </span>
                      <div
                        className={`text-2xl font-black font-mono px-4 py-1.5 rounded-xl border transition-all ${
                          outputQ
                            ? "border-emerald-500/80 bg-emerald-900/40 text-emerald-300 shadow-md shadow-emerald-950"
                            : "border-rose-900/60 bg-rose-950/30 text-rose-300"
                        }`}
                      >
                        {outputQ ? "1" : "0"}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {outputQ ? "CURRENT DETECTED" : "NO CURRENT"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Truth Table Verification */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">
                      Official Curriculum Truth Table ({gate} Gate):
                    </span>
                    <span className="text-[10px] text-blue-400 font-mono">
                      Active: {inputA ? "1" : "0"}, {gate === "NOT" ? "-" : inputB ? "1" : "0"} ➔ Q={outputQ ? "1" : "0"}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                    <div className="bg-slate-950 p-1.5 rounded text-slate-400 font-bold">A</div>
                    <div className="bg-slate-950 p-1.5 rounded text-slate-400 font-bold">
                      {gate === "NOT" ? "—" : "B"}
                    </div>
                    <div className="bg-slate-950 p-1.5 rounded text-slate-400 font-bold">Operation</div>
                    <div className="bg-slate-950 p-1.5 rounded text-slate-400 font-bold">Q</div>
                  </div>

                  {/* Dynamic Active Row */}
                  <div className="mt-1 grid grid-cols-4 gap-2 text-center font-mono text-[11px] bg-blue-950/60 border border-blue-500/50 text-blue-200 p-1.5 rounded-lg font-bold">
                    <div>{inputA ? "1" : "0"}</div>
                    <div>{gate === "NOT" ? "—" : inputB ? "1" : "0"}</div>
                    <div>{gate}</div>
                    <div className={outputQ ? "text-emerald-400" : "text-rose-400"}>
                      {outputQ ? "1" : "0"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Science Lab Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {STEM_LABS.slice(0, 2).map((lab) => (
                  <div
                    key={lab.title}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-1 hover:border-blue-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg" aria-hidden="true">{lab.icon}</span>
                      <span className="text-[10px] font-bold uppercase rounded bg-slate-900 px-2 py-0.5 text-blue-300">
                        {lab.discipline}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white">{lab.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">{lab.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
