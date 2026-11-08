"use client";

import React, { useState, useEffect, useRef, useId, useCallback } from "react";
import Link from "next/link";

interface QuadraticTelemetry {
  equation: string;
  discriminant: number;
  rootType: "two_real" | "one_real" | "complex";
  root1: number | null;
  root2: number | null;
  vertexX: number;
  vertexY: number;
  concavity: "upward" | "downward";
}

function calculateTelemetry(a: number, b: number, c: number): QuadraticTelemetry {
  const safeA = a === 0 ? 0.001 : a;
  const discriminant = b * b - 4 * safeA * c;
  const vertexX = -b / (2 * safeA);
  const vertexY = safeA * vertexX * vertexX + b * vertexX + c;

  let rootType: "two_real" | "one_real" | "complex" = "complex";
  let root1: number | null = null;
  let root2: number | null = null;

  if (Math.abs(discriminant) < 0.0001) {
    rootType = "one_real";
    root1 = -b / (2 * safeA);
    root2 = root1;
  } else if (discriminant > 0) {
    rootType = "two_real";
    const sqrtDisc = Math.sqrt(discriminant);
    root1 = (-b - sqrtDisc) / (2 * safeA);
    root2 = (-b + sqrtDisc) / (2 * safeA);
  }

  const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
  const signC = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;
  const aStr = safeA === 1 ? "" : safeA === -1 ? "-" : `${safeA}`;
  const equation = `y = ${aStr}x² ${signB}x ${signC}`;

  return {
    equation,
    discriminant: Math.round(discriminant * 100) / 100,
    rootType,
    root1: root1 !== null ? Math.round(root1 * 100) / 100 : null,
    root2: root2 !== null ? Math.round(root2 * 100) / 100 : null,
    vertexX: Math.round(vertexX * 100) / 100,
    vertexY: Math.round(vertexY * 100) / 100,
    concavity: safeA > 0 ? "upward" : "downward",
  };
}

export default function PublicStemDemo() {
  const [a, setA] = useState<number>(1);
  const [b, setB] = useState<number>(-2);
  const [c, setC] = useState<number>(-3);
  const [forceFallback, setForceFallback] = useState<boolean>(false);
  const [isLowSpecDevice, setIsLowSpecDevice] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aId = useId();
  const bId = useId();
  const cId = useId();

  // Detect low-spec devices or missing Canvas 2D support
  useEffect(() => {
    try {
      const nav = typeof navigator !== "undefined" ? (navigator as unknown as { deviceMemory?: number; hardwareConcurrency?: number }) : null;
      const mem = nav?.deviceMemory || 4;
      const cores = nav?.hardwareConcurrency || 4;
      if (mem <= 1 || cores <= 1) {
        setIsLowSpecDevice(true);
      }
    } catch {
      // Ignore detection errors safely
    }

    // Check system or document dark mode
    const checkTheme = () => {
      const isDocDark = document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark";
      setIsDark(isDocDark);
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, []);

  const telemetry = calculateTelemetry(a, b, c);

  // Canvas drawing loop
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    const bgColor = isDark ? "#070e1b" : "#f8fafc";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.06)";
    const axisColor = isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.3)";
    const curveColor = isDark ? "#38bdf8" : "#0284c7";
    const vertexColor = isDark ? "#f59e0b" : "#d97706";
    const rootColor = isDark ? "#10b981" : "#059669";

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const originX = width / 2;
    const originY = height / 2;
    const scale = 26; // pixels per unit

    // Grid lines
    ctx.strokeStyle = gridColor;
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

    // Main Axes
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
    ctx.font = "10px monospace";
    ctx.fillText("x", width - 14, originY - 6);
    ctx.fillText("y", originX + 6, 14);

    // Plot Parabola: y = ax^2 + bx + c
    const safeA = a === 0 ? 0.001 : a;
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    let started = false;
    for (let px = 0; px <= width; px += 2) {
      const mathX = (px - originX) / scale;
      const mathY = safeA * mathX * mathX + b * mathX + c;
      const py = originY - mathY * scale;

      if (py >= -20 && py <= height + 20) {
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      } else {
        started = false;
      }
    }
    ctx.stroke();

    // Vertex point
    const vx = originX + telemetry.vertexX * scale;
    const vy = originY - telemetry.vertexY * scale;
    if (vx >= 0 && vx <= width && vy >= 0 && vy <= height) {
      ctx.fillStyle = vertexColor;
      ctx.beginPath();
      ctx.arc(vx, vy, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Real Roots
    if (telemetry.root1 !== null) {
      const r1x = originX + telemetry.root1 * scale;
      if (r1x >= 0 && r1x <= width) {
        ctx.fillStyle = rootColor;
        ctx.beginPath();
        ctx.arc(r1x, originY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (telemetry.root2 !== null && telemetry.rootType === "two_real") {
      const r2x = originX + telemetry.root2 * scale;
      if (r2x >= 0 && r2x <= width) {
        ctx.fillStyle = rootColor;
        ctx.beginPath();
        ctx.arc(r2x, originY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }, [a, b, c, isDark, telemetry]);

  useEffect(() => {
    if (!forceFallback && !isLowSpecDevice) {
      drawCanvas();
    }
  }, [drawCanvas, forceFallback, isLowSpecDevice]);

  const useFallbackView = forceFallback || isLowSpecDevice;

  return (
    <section
      aria-label="STEM Studio Quadratic Parabola Simulation Preview"
      className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-lg transition-colors dark:border-slate-800 dark:bg-[#0b1328]"
    >
      {/* Header and Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Live Mathematical Simulation
            </span>
            <span className="text-xs text-slate-400 font-mono">JAMB UTME • WAEC Algebra</span>
          </div>
          <h3 className="mt-1 text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Quadratic Function & Parabola Explorer
          </h3>
        </div>

        {/* Device Mode Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setForceFallback((prev) => !prev)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Switch between 2D Canvas render and static SVG low-bandwidth mode"
          >
            {useFallbackView ? "🖥️ Switch to 2D Canvas" : "⚡ Switch to Low-Data SVG"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Render Surface (Canvas or SVG Fallback) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#070e1b] aspect-[4/3] flex items-center justify-center">
            {useFallbackView ? (
              /* Lightweight Static SVG Fallback */
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <svg
                  viewBox="0 0 320 220"
                  className="w-full max-w-[280px] h-auto"
                  aria-label={`Static coordinate graph representing parabola with vertex at (${telemetry.vertexX}, ${telemetry.vertexY})`}
                >
                  <rect width="320" height="220" fill={isDark ? "#070e1b" : "#f8fafc"} />
                  {/* Grid */}
                  <path d="M 0 110 L 320 110 M 160 0 L 160 220" stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"} strokeWidth="1.5" />
                  {/* Conceptual curve */}
                  <path
                    d={
                      a >= 0
                        ? "M 40 40 Q 160 180 280 40"
                        : "M 40 180 Q 160 40 280 180"
                    }
                    fill="none"
                    stroke={isDark ? "#38bdf8" : "#0284c7"}
                    strokeWidth="3"
                  />
                  {/* Vertex */}
                  <circle cx="160" cy={a >= 0 ? 180 : 40} r="5" fill="#f59e0b" />
                </svg>
                <div className="mt-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                  ⚡ Lightweight Static Mode active (low GPU & data consumption)
                </div>
              </div>
            ) : (
              /* Dynamic 60FPS 2D Canvas */
              <canvas
                ref={canvasRef}
                width={560}
                height={420}
                className="w-full h-full object-contain cursor-crosshair"
                aria-label="Interactive 2D parabolic curve canvas"
              />
            )}
          </div>

          {/* Canvas Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-sky-500" />
              <span>Parabola Curve</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <span>Vertex Point</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span>Real Roots (x-intercepts)</span>
            </span>
          </div>
        </div>

        {/* Interactive Controls & Real-Time Telemetry */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Slider Controls */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-[#070e1b]/70 flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Coefficients & Parameters
            </h4>

            {/* Parameter a */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <label htmlFor={aId} className="text-slate-700 dark:text-slate-300">
                  Coefficient a (Curvature & Orientation)
                </label>
                <span className="font-mono text-blue-600 dark:text-blue-400">{a}</span>
              </div>
              <input
                id={aId}
                type="range"
                min="-3"
                max="3"
                step="0.5"
                value={a}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setA(val === 0 ? 0.5 : val);
                }}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg dark:bg-slate-700"
                aria-label="Quadratic coefficient a"
                aria-valuenow={a}
                aria-valuemin={-3}
                aria-valuemax={3}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-3 (Opens Down)</span>
                <span>+3 (Opens Up)</span>
              </div>
            </div>

            {/* Parameter b */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <label htmlFor={bId} className="text-slate-700 dark:text-slate-300">
                  Coefficient b (Horizontal Axis Shift)
                </label>
                <span className="font-mono text-blue-600 dark:text-blue-400">{b}</span>
              </div>
              <input
                id={bId}
                type="range"
                min="-6"
                max="6"
                step="1"
                value={b}
                onChange={(e) => setB(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg dark:bg-slate-700"
                aria-label="Quadratic coefficient b"
                aria-valuenow={b}
                aria-valuemin={-6}
                aria-valuemax={6}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-6</span>
                <span>+6</span>
              </div>
            </div>

            {/* Parameter c */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <label htmlFor={cId} className="text-slate-700 dark:text-slate-300">
                  Constant c (y-intercept)
                </label>
                <span className="font-mono text-blue-600 dark:text-blue-400">{c}</span>
              </div>
              <input
                id={cId}
                type="range"
                min="-8"
                max="8"
                step="1"
                value={c}
                onChange={(e) => setC(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg dark:bg-slate-700"
                aria-label="Quadratic constant c"
                aria-valuenow={c}
                aria-valuemin={-8}
                aria-valuemax={8}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-8</span>
                <span>+8</span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="pt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => { setA(1); setB(-2); setC(-3); }}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              >
                Preset: 2 Roots (Δ &gt; 0)
              </button>
              <button
                type="button"
                onClick={() => { setA(1); setB(-4); setC(4); }}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              >
                Preset: Tangent (Δ = 0)
              </button>
              <button
                type="button"
                onClick={() => { setA(1); setB(2); setC(5); }}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              >
                Preset: Complex (Δ &lt; 0)
              </button>
            </div>
          </div>

          {/* Mathematical Telemetry Readout */}
          <div
            aria-live="polite"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#070e1b] flex flex-col gap-2.5 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800/80">
              <span className="font-bold text-slate-500 dark:text-slate-400">Standard Form</span>
              <span className="font-mono font-black text-sm text-sky-600 dark:text-sky-400">{telemetry.equation}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800/80">
              <span className="font-bold text-slate-500 dark:text-slate-400">Discriminant (b² - 4ac)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                Δ = {telemetry.discriminant}
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                  telemetry.rootType === "two_real"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : telemetry.rootType === "one_real"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                }`}>
                  {telemetry.rootType === "two_real"
                    ? "2 Real Roots"
                    : telemetry.rootType === "one_real"
                    ? "Coincident Root"
                    : "Complex (No Intercept)"}
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800/80">
              <span className="font-bold text-slate-500 dark:text-slate-400">Vertex Coordinates</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                ({telemetry.vertexX}, {telemetry.vertexY})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500 dark:text-slate-400">Calculated Roots</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {telemetry.rootType === "two_real"
                  ? `x₁ = ${telemetry.root1}, x₂ = ${telemetry.root2}`
                  : telemetry.rootType === "one_real"
                  ? `x = ${telemetry.root1}`
                  : "None on real axis"}
              </span>
            </div>
          </div>

          {/* CTA to full STEM workspace */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs dark:border-blue-500/30 dark:bg-blue-500/10 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Want to record hypotheses and lab notes?</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                The full STEM Studio includes tutor synchronisation, laboratory quizzes, and 7 additional experimental benches.
              </p>
            </div>
            <Link
              href="/classroom/stem"
              className="shrink-0 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-black text-white hover:bg-blue-700 transition shadow-sm"
            >
              Enter Full Lab →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
