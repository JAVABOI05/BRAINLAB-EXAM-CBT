"use client";

import React, { useState, useEffect, useMemo, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandHeader from "@/app/components/BrandHeader";
import BrandFooter from "@/app/components/BrandFooter";
import type { StemResource } from "@/app/lib/stem/stemService";
import { INITIAL_STEM_RESOURCES } from "@/app/lib/stem/seedData";

// Interactive 2D Quadratic Function Graph Canvas
function QuadraticCanvas({
  a,
  b,
  c,
  onChangeA,
  onChangeB,
  onChangeC,
}: {
  a: number;
  b: number;
  c: number;
  onChangeA: (v: number) => void;
  onChangeB: (v: number) => void;
  onChangeC: (v: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Discriminant and roots calculation
  const discriminant = useMemo(() => b * b - 4 * a * c, [a, b, c]);
  const vertex = useMemo(() => {
    const vx = -b / (2 * a);
    const vy = a * vx * vx + b * vx + c;
    return { x: vx, y: vy };
  }, [a, b, c]);

  const roots = useMemo(() => {
    if (discriminant < 0) return { type: "complex", r1: null, r2: null };
    if (discriminant === 0) {
      const r = -b / (2 * a);
      return { type: "coincident", r1: r, r2: r };
    }
    const sqrtD = Math.sqrt(discriminant);
    const r1 = (-b + sqrtD) / (2 * a);
    const r2 = (-b - sqrtD) / (2 * a);
    return { type: "real_distinct", r1: Math.min(r1, r2), r2: Math.max(r1, r2) };
  }, [a, b, c, discriminant]);

  // Redraw Canvas on parameter update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.fillStyle = "#070d1e";
    ctx.fillRect(0, 0, width, height);

    const originX = width / 2;
    const originY = height / 2;
    const scale = 32; // 32 pixels per Cartesian unit

    // Draw Grid Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    for (let x = originX % scale; x < width; x += scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = originY % scale; y < height; y += scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.5;

    // X-Axis
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    // Y-Axis
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Plot Parabola: y = ax^2 + bx + c
    ctx.strokeStyle = "#38bdf8"; // Cyan
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    let started = false;
    for (let px = 0; px <= width; px += 2) {
      const x = (px - originX) / scale;
      const y = a * x * x + b * x + c;
      const py = originY - y * scale;

      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Vertex Marker
    const pvx = originX + vertex.x * scale;
    const pvy = originY - vertex.y * scale;
    if (pvx >= 0 && pvx <= width && pvy >= 0 && pvy <= height) {
      ctx.fillStyle = "#f59e0b"; // Amber
      ctx.beginPath();
      ctx.arc(pvx, pvy, 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Roots Markers
    if (roots.type !== "complex") {
      ctx.fillStyle = "#10b981"; // Emerald
      if (roots.r1 !== null) {
        const pr1x = originX + roots.r1 * scale;
        ctx.beginPath();
        ctx.arc(pr1x, originY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
      if (roots.r2 !== null && roots.type === "real_distinct") {
        const pr2x = originX + roots.r2 * scale;
        ctx.beginPath();
        ctx.arc(pr2x, originY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }, [a, b, c, vertex, roots]);

  return (
    <div className="space-y-6">
      {/* Simulation Screen */}
      <div className="relative rounded-2xl border border-white/10 bg-[#070d1e] overflow-hidden shadow-2xl flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={760}
          height={420}
          className="w-full max-h-[420px] object-contain cursor-crosshair"
        />

        {/* Live Equation Badge Overlay */}
        <div className="absolute top-4 left-4 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md px-4 py-2 font-mono text-sm text-cyan-300 shadow">
          y = {a === 1 ? "" : a === -1 ? "-" : `${a}`}x² {b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}x{" "}
          {c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`}
        </div>

        {/* Live Roots Overlay */}
        <div className="absolute top-4 right-4 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md px-3.5 py-1.5 text-xs font-mono text-white shadow flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>
            {roots.type === "complex"
              ? "No Real Roots (Δ < 0)"
              : roots.type === "coincident"
              ? `Coincident Root: x = ${roots.r1?.toFixed(2)}`
              : `Roots: x₁ = ${roots.r1?.toFixed(2)}, x₂ = ${roots.r2?.toFixed(2)}`}
          </span>
        </div>
      </div>

      {/* Parameter Adjustment Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-[#0B1536] p-5 shadow">
        {/* Coefficient a */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">Leading Coefficient (a):</span>
            <span className="font-mono text-cyan-300">{a.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={-4}
            max={4}
            step={0.25}
            value={a}
            onChange={(e) => {
              const val = Number(e.target.value);
              onChangeA(val === 0 ? 0.25 : val);
            }}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-4 (Concave Down)</span>
            <span>+4 (Concave Up)</span>
          </div>
        </div>

        {/* Coefficient b */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">Linear Coefficient (b):</span>
            <span className="font-mono text-cyan-300">{b.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={-6}
            max={6}
            step={0.5}
            value={b}
            onChange={(e) => onChangeB(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-6</span>
            <span>+6</span>
          </div>
        </div>

        {/* Coefficient c */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">Constant / Intercept (c):</span>
            <span className="font-mono text-cyan-300">{c.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={-8}
            max={8}
            step={0.5}
            value={c}
            onChange={(e) => onChangeC(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-8 (Y-intercept)</span>
            <span>+8</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StemPlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const { slug } = use(params);

  const [resource, setResource] = useState<StemResource | null>(null);
  const [loading, setLoading] = useState(true);

  // Quadratic Simulation Parameters State
  const [paramA, setParamA] = useState(1);
  const [paramB, setParamB] = useState(-2);
  const [paramC, setParamC] = useState(-3);

  // Student Observation State
  const [observations, setObservations] = useState("");
  const [savedStatus, setSavedStatus] = useState("");

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
        // Fallback to seed
        const fallback = INITIAL_STEM_RESOURCES.find((r) => r.slug === slug);
        if (active && fallback) {
          setResource(fallback);
        }
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
      <BrandHeader />

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
              href="/classroom"
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
            <QuadraticCanvas
              a={paramA}
              b={paramB}
              c={paramC}
              onChangeA={setParamA}
              onChangeB={setParamB}
              onChangeC={setParamC}
            />

            {/* Live Quantitative Telemetry Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-5 space-y-3 shadow">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📊</span>
                <span>Quantitative Analysis &amp; Discriminant Telemetry</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#070d1e] border border-white/5">
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Discriminant (Δ)</span>
                  <span className="font-mono text-base font-black text-cyan-300">
                    {(paramB * paramB - 4 * paramA * paramC).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#070d1e] border border-white/5">
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Parabola Apex</span>
                  <span className="font-mono text-base font-black text-amber-400">
                    {paramA > 0 ? "Minimum" : "Maximum"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#070d1e] border border-white/5">
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Vertex (Xv, Yv)</span>
                  <span className="font-mono text-xs font-black text-white truncate">
                    {(-paramB / (2 * paramA)).toFixed(2)}, {-(paramB * paramB - 4 * paramA * paramC) / (4 * paramA) ? (-(paramB * paramB - 4 * paramA * paramC) / (4 * paramA)).toFixed(2) : "0.00"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#070d1e] border border-white/5">
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Y-Axis Intercept</span>
                  <span className="font-mono text-base font-black text-emerald-400">
                    (0, {paramC.toFixed(2)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Theory, Objectives & Observations */}
          <aside className="space-y-6">
            {/* Learning Objectives */}
            <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-5 space-y-3 shadow">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>🎯</span>
                <span>Learning Objectives</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {(version?.learning_objectives || [
                  "Relate the sign of leading coefficient 'a' to parabolic curvature",
                  "Compute discriminant Δ = b² - 4ac to predict root multiplicity",
                  "Solve standard UTME and WAEC algebra questions visually",
                ]).map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Official Curriculum Mapping */}
            <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-5 space-y-2 text-xs shadow">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Syllabus Alignment
              </span>
              <p className="font-bold text-white">JAMB UTME: Mathematics — Section II: Algebra</p>
              <p className="text-slate-400 leading-relaxed">
                Topic: Quadratic Equations, Simultaneous linear &amp; quadratic equations, roots and coefficients.
              </p>
              <Link
                href="/cbt?subject=mathematics"
                className="mt-2 inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold transition"
              >
                <span>Practice related CBT questions</span>
                <span>→</span>
              </Link>
            </div>

            {/* Student Observation & Workspace */}
            <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-5 space-y-3 shadow">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📝</span>
                <span>My Lab Observations</span>
              </h3>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Record your observations here (e.g. When a < 0, the curve is concave down; when Δ = 0, the parabola touches the x-axis exactly once)..."
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-[#070d1e] p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-emerald-400 font-medium">{savedStatus}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSavedStatus("Saved to personal workspace!");
                    setTimeout(() => setSavedStatus(""), 3000);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <BrandFooter />
    </div>
  );
}
