"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StemResource } from "@/app/lib/stem/stemService";
import { INITIAL_STEM_RESOURCES } from "@/app/lib/stem/seedData";
import {
  QuadraticGraphAdapter,
  DEFAULT_QUADRATIC_STATE,
  ProjectileMotionAdapter,
  DEFAULT_PROJECTILE_STATE,
  OhmsLawCircuitAdapter,
  DEFAULT_OHMS_LAW_STATE,
  AcidBaseTitrationAdapter,
  DEFAULT_TITRATION_STATE,
  GeneticsPunnettAdapter,
  DEFAULT_GENETICS_STATE,
  LogicGatesAdapter,
  DEFAULT_LOGIC_GATES_STATE,
} from "@/app/components/classroom/whiteboard/stemAdapter";
import { getCbtSubjectKey } from "@/app/lib/curriculumData";

export default function StemPlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const { slug } = use(params);

  const [resource, setResource] = useState<StemResource | null>(null);
  const [loading, setLoading] = useState(true);

  // Student Observations & Lab Attempts
  const [observations, setObservations] = useState("");
  const [savedStatus, setSavedStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"workspace" | "instructions" | "assessment">("workspace");

  // Simulation Parameter States
  const [quadState, setQuadState] = useState({ ...DEFAULT_QUADRATIC_STATE });
  const [projState, setProjState] = useState({ ...DEFAULT_PROJECTILE_STATE });
  const [circState, setCircState] = useState({ ...DEFAULT_OHMS_LAW_STATE });
  const [titrState, setTitrState] = useState({ ...DEFAULT_TITRATION_STATE });
  const [genState, setGenState] = useState({ ...DEFAULT_GENETICS_STATE });
  const [logicState, setLogicState] = useState({ ...DEFAULT_LOGIC_GATES_STATE });
  const [selectedOrganelle, setSelectedOrganelle] = useState<string>("nucleus");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch or fallback resource
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/stem/resources/${slug}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.ok && data.resource) {
            setResource(data.resource);
            return;
          }
        }
        const fallback = INITIAL_STEM_RESOURCES.find((r) => r.slug === slug);
        if (active && fallback) setResource(fallback);
      } catch {
        const fallback = INITIAL_STEM_RESOURCES.find((r) => r.slug === slug);
        if (active && fallback) setResource(fallback);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [slug]);

  // Redraw Canvas on any parameter update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (slug === "quadratic-graph-explorer") {
      const adapter = new QuadraticGraphAdapter();
      adapter.init(quadState, false);
      adapter.renderToCanvas(ctx, canvas.width, canvas.height, "dark");
    } else if (slug === "projectile-motion-simulator") {
      const adapter = new ProjectileMotionAdapter();
      adapter.init(projState, false);
      adapter.renderToCanvas(ctx, canvas.width, canvas.height, "dark");
    } else if (slug === "ohms-law-dc-circuit") {
      const adapter = new OhmsLawCircuitAdapter();
      adapter.init(circState, false);
      adapter.renderToCanvas(ctx, canvas.width, canvas.height, "dark");
    } else if (slug === "acid-base-titration-curve") {
      const adapter = new AcidBaseTitrationAdapter();
      adapter.init(titrState, false);
      adapter.renderToCanvas(ctx, canvas.width, canvas.height, "dark");
    } else if (slug === "genetics-punnett-square-lab") {
      const adapter = new GeneticsPunnettAdapter();
      adapter.init(genState, false);
      adapter.renderToCanvas(ctx, canvas.width, canvas.height, "dark");
    }
  }, [slug, quadState, projState, circState, titrState, genState, logicState]);

  const handleSaveObservation = async () => {
    setSavedStatus("Submitting experiment attempt…");
    try {
      const activeState =
        slug === "quadratic-graph-explorer"
          ? quadState
          : slug === "projectile-motion-simulator"
          ? projState
          : slug === "ohms-law-dc-circuit"
          ? circState
          : slug === "acid-base-titration-curve"
          ? titrState
          : slug === "genetics-punnett-square-lab"
          ? genState
          : { selectedOrganelle };

      const res = await fetch("/api/stem/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_version_id: resource?.current_version?.id || resource?.id,
          observations: { notes: observations, state: activeState },
          measurements: [activeState],
          conclusion: observations,
        }),
      });

      if (res.ok) {
        setSavedStatus("Submitted to tutor academic log! ✓");
      } else {
        localStorage.setItem(`stem-attempt-${slug}`, JSON.stringify({ activeState, observations, at: Date.now() }));
        setSavedStatus("Saved to your local laboratory portfolio! ✓");
      }
    } catch {
      localStorage.setItem(`stem-attempt-${slug}`, JSON.stringify({ observations, at: Date.now() }));
      setSavedStatus("Saved to your local laboratory portfolio! ✓");
    }
    setTimeout(() => setSavedStatus(""), 4000);
  };

  if (loading && !resource) {
    return (
      <div className="min-h-screen bg-[#070d1e] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-300">Loading interactive STEM laboratory…</p>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-[#070d1e] text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold">STEM Resource Not Found</h2>
        <Link href="/classroom/stem" className="mt-4 px-4 py-2 bg-blue-600 rounded-xl text-xs font-bold">
          Return to STEM Studio
        </Link>
      </div>
    );
  }

  const version = resource.current_version;

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans">
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb & Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link href="/classroom/stem" className="hover:text-white transition">
                ← Back to STEM Studio Hub
              </Link>
              <span>/</span>
              <span className="text-cyan-400 font-bold">{resource.subject?.name || "STEM"}</span>
      </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{resource.title}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 text-xs font-mono font-bold">
                Tier {resource.tier} · v{version?.version_number || 1}.0
              </span>
      </div>
    </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <Link
              href={`/classroom/studio?importStem=${resource.slug}`}
              className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <span>🎬</span>
              <span>Import to Prep Studio</span>
            </Link>
            <Link
              href={`/classroom/BL-LIVE-101?role=host&stem=${resource.slug}`}
              className="px-4 py-2 rounded-xl bg-[#1356E8] hover:bg-blue-600 text-white text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
            >
              <span>📡</span>
              <span>Present in Liveboard</span>
            </Link>
    </div>
        </div>

        {/* Main Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Central Lab Canvas (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            {slug !== "cell-ultrastructure-guide" ? (
              <div className="space-y-4">
                <div className="relative rounded-2xl border border-white/10 bg-[#070d1e] overflow-hidden shadow-2xl flex flex-col items-center">
                  <canvas
                    ref={canvasRef}
                    width={760}
                    height={420}
                    className="w-full max-h-[420px] object-contain cursor-crosshair block"
                  />
          </div>

                {/* Simulation Parameter Controls */}
                <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-5 shadow space-y-4">
                  {slug === "quadratic-graph-explorer" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-300">Leading (a):</span>
                          <span className="font-mono text-cyan-300">{quadState.a}</span>
                  </div>
                        <input
                          type="range"
                          min={-3}
                          max={3}
                          step={0.25}
                          value={quadState.a}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0.25;
                            setQuadState((p) => ({ ...p, a: val }));
                          }}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-300">Linear (b):</span>
                          <span className="font-mono text-cyan-300">{quadState.b}</span>
                  </div>
                        <input
                          type="range"
                          min={-6}
                          max={6}
                          step={0.5}
                          value={quadState.b}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setQuadState((p) => ({ ...p, b: val }));
                          }}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-300">Constant (c):</span>
                          <span className="font-mono text-cyan-300">{quadState.c}</span>
                  </div>
                        <input
                          type="range"
                          min={-6}
                          max={6}
                          step={0.5}
                          value={quadState.c}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setQuadState((p) => ({ ...p, c: val }));
                          }}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                </div>
              </div>
                  )}

                  {slug === "projectile-motion-simulator" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-300">Launch Velocity (v₀):</span>
                          <span className="font-mono text-cyan-300">{projState.v0} m/s</span>
                  </div>
                        <input
                          type="range"
                          min={10}
                          max={55}
                          step={1}
                          value={projState.v0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setProjState((p) => ({ ...p, v0: val }));
                          }}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-300">Launch Angle (θ):</span>
                          <span className="font-mono text-cyan-300">{projState.angleDeg}°</span>
                  </div>
                        <input
                          type="range"
                          min={15}
                          max={85}
                          step={1}
                          value={projState.angleDeg}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setProjState((p) => ({ ...p, angleDeg: val }));
                          }}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-300">Gravity (g):</span>
                          <span className="font-mono text-cyan-300">{projState.gravity} m/s²</span>
                  </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setProjState((p) => ({ ...p, gravity: 9.8 }))}
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              projState.gravity === 9.8 ? "bg-blue-600 text-white" : "bg-white/10 text-slate-400"
                            }`}
                          >
                            Earth (9.8)
                          </button>
                          <button
                            type="button"
                            onClick={() => setProjState((p) => ({ ...p, gravity: 1.62 }))}
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              projState.gravity === 1.62 ? "bg-blue-600 text-white" : "bg-white/10 text-slate-400"
                            }`}
                          >
                            Moon (1.62)
                          </button>
                  </div>
                </div>
              </div>
                  )}

                  {slug === "ohms-law-dc-circuit" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-300">DC Voltage (V):</span>
                          <span className="font-mono text-cyan-300">{circState.voltage} V</span>
                  </div>
                        <input
                          type="range"
                          min={1}
                          max={36}
                          step={1}
                          value={circState.voltage}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCircState((p) => ({ ...p, voltage: val }));
                          }}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-300">Load Resistance (R):</span>
                          <span className="font-mono text-cyan-300">{circState.resistance} Ω</span>
                  </div>
                        <input
                          type="range"
                          min={1}
                          max={50}
                          step={1}
                          value={circState.resistance}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCircState((p) => ({ ...p, resistance: val }));
                          }}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                </div>
              </div>
                  )}

                  {slug === "acid-base-titration-curve" && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-300">Buret Titrant Added (0.1M NaOH):</span>
                        <span className="font-mono text-cyan-300">{titrState.titrantAddedMl} mL</span>
                </div>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        step={0.5}
                        value={titrState.titrantAddedMl}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTitrState((p) => ({ ...p, titrantAddedMl: val }));
                        }}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTitrState((p) => ({ ...p, titrantAddedMl: Math.min(50, p.titrantAddedMl + 1) }))}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold"
                        >
                          +1 mL Dropwise
                        </button>
                        <button
                          type="button"
                          onClick={() => setTitrState((p) => ({ ...p, titrantAddedMl: 0 }))}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold"
                        >
                          Reset Buret
                        </button>
                </div>
              </div>
                  )}

                  {slug === "logic-gates-circuits" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-300 mr-2">Gate Type:</span>
                        {(["AND", "OR", "NOT", "NAND", "NOR", "XOR"] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setLogicState((p: any) => ({ ...p, gateType: g }))}
                            className={`px-3 py-1 rounded text-xs font-mono font-bold transition ${
                              logicState.gateType === g ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-white/10 text-slate-400 hover:text-white"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                </div>
                      <div className="flex items-center gap-6 pt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-300">Input A:</span>
                          <button
                            type="button"
                            onClick={() => setLogicState((p: any) => ({ ...p, inputA: p.inputA === 1 ? 0 : 1 }))}
                            className={`w-14 py-1.5 rounded text-xs font-mono font-bold transition ${
                              logicState.inputA === 1 ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"
                            }`}
                          >
                            {logicState.inputA === 1 ? "1 (HIGH)" : "0 (LOW)"}
                          </button>
                  </div>
                        {logicState.gateType !== "NOT" && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-300">Input B:</span>
                            <button
                              type="button"
                              onClick={() => setLogicState((p: any) => ({ ...p, inputB: p.inputB === 1 ? 0 : 1 }))}
                              className={`w-14 py-1.5 rounded text-xs font-mono font-bold transition ${
                                logicState.inputB === 1 ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"
                              }`}
                            >
                              {logicState.inputB === 1 ? "1 (HIGH)" : "0 (LOW)"}
                            </button>
                    </div>
                        )}
                </div>
              </div>
                  )}

                  {slug === "genetics-punnett-square-lab" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs font-bold text-slate-300 mb-1.5">Maternal Alleles:</span>
                        <div className="flex items-center gap-2">
                          {(
                            [
                              { alleles: ["B", "B"] as [string, string], label: "BB" },
                              { alleles: ["B", "b"] as [string, string], label: "Bb" },
                              { alleles: ["b", "b"] as [string, string], label: "bb" },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setGenState((p) => ({ ...p, maternalAlleles: opt.alleles }))}
                              className={`px-3 py-1 rounded text-xs font-bold font-mono ${
                                genState.maternalAlleles[0] === opt.alleles[0] &&
                                genState.maternalAlleles[1] === opt.alleles[1]
                                  ? "bg-pink-600 text-white"
                                  : "bg-white/10 text-slate-400"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                  </div>
                </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-300 mb-1.5">Paternal Alleles:</span>
                        <div className="flex items-center gap-2">
                          {(
                            [
                              { alleles: ["B", "B"] as [string, string], label: "BB" },
                              { alleles: ["B", "b"] as [string, string], label: "Bb" },
                              { alleles: ["b", "b"] as [string, string], label: "bb" },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setGenState((p) => ({ ...p, paternalAlleles: opt.alleles }))}
                              className={`px-3 py-1 rounded text-xs font-bold font-mono ${
                                genState.paternalAlleles[0] === opt.alleles[0] &&
                                genState.paternalAlleles[1] === opt.alleles[1]
                                  ? "bg-blue-600 text-white"
                                  : "bg-white/10 text-slate-400"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                  </div>
                </div>
              </div>
                  )}
          </div>
        </div>
            ) : (
              /* Cell Structure Biology Interactive View */
              <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-base font-bold text-white">Eukaryotic Cell Ultrastructure</h3>
                  <span className="text-xs text-cyan-300 font-mono">JAMB Biology Syllabus</span>
          </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: "nucleus", name: "Nucleus", desc: "Contains genomic DNA and directs transcription" },
                      { id: "mitochondria", name: "Mitochondria", desc: "Site of aerobic cellular respiration & ATP production" },
                      { id: "ribosome", name: "Ribosomes", desc: "Translate mRNA into polypeptide chains" },
                      { id: "chloroplast", name: "Chloroplast", desc: "Thylakoid membranes convert solar energy to glucose (Plant)" },
                      { id: "plasma_membrane", name: "Plasma Membrane", desc: "Fluid mosaic lipid bilayer with selective permeability" },
                      { id: "golgi", name: "Golgi Apparatus", desc: "Modifies, packages, and sorts secretory proteins" },
                    ] as const
                  ).map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => setSelectedOrganelle(org.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedOrganelle === org.id
                          ? "border-cyan-400 bg-cyan-950/40 text-white shadow-lg"
                          : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-bold text-cyan-300">{org.name}</div>
                      <div className="text-[11px] text-slate-300 mt-1 line-clamp-2">{org.desc}</div>
                    </button>
                  ))}
          </div>
        </div>
            )}

            {/* Experiment Findings Logger */}
            <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-5 shadow space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📝</span>
                  <span>Student Experiment Log &amp; Scientific Hypotheses</span>
                </h3>
                {savedStatus && <span className="text-xs font-bold text-emerald-400 animate-pulse">{savedStatus}</span>}
        </div>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                placeholder="Record your observations, mathematical deductions, or hypothesis tests here..."
                className="w-full rounded-xl border border-white/15 bg-[#070d1e] p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveObservation}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow"
                >
                  Save Experiment Attempt
                </button>
        </div>
      </div>
    </div>

          {/* Right Sidebar: Learning Objectives, Curriculum & Theory (1 Column) */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-5 shadow space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                <span>🎯</span>
                <span>Learning Objectives</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                {(version?.learning_objectives || [
                  "Analyze parameter interactions dynamically",
                  "Formulate deductive hypotheses based on mathematical models",
                  "Solve standard WAEC/JAMB examination questions with empirical proof",
                ]).map((obj, i) => (
                  <li key={i} className="leading-relaxed">
                    {obj}
                  </li>
                ))}
              </ul>
      </div>

            <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-5 shadow space-y-3">
              <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
                <span>📚</span>
                <span>Official Curriculum Alignment</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Subject:</span>
                  <span className="font-bold text-white">{resource.subject?.name}</span>
          </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Syllabus Topic:</span>
                  <span className="font-bold text-cyan-300 text-right">{resource.topic?.title}</span>
          </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target Exams:</span>
                  <span className="font-bold text-white">WAEC / UTME / GCSE / NECO</span>
          </div>
        </div>
      </div>

            {/* Direct CBT Exam Practice Connection */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0e275c] to-[#0B1536] p-5 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <span>🎯</span>
                <span>Exam Connection &amp; CBT Drills</span>
        </div>
              <h4 className="text-sm font-black text-white">
                Practice {resource.subject?.name || "Subject"} Exam Questions
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect your laboratory experiment findings directly to standardized UTME &amp; WAEC past examination questions.
              </p>
              <Link
                href={`/cbt?subject=${encodeURIComponent(getCbtSubjectKey(resource.subject?.slug || resource.subject_id))}&source=stem`}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-900/30 transition group"
              >
                <span>Launch {resource.subject?.name || "Subject"} CBT Practice</span>
                <span className="group-hover:translate-x-0.5 transition">→</span>
              </Link>
      </div>
    </div>
        </div>
      </main>

    </div>
  );
}
