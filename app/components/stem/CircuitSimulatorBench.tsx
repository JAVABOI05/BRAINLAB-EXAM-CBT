"use client";

import React, { useEffect, useRef, useState } from "react";

export default function CircuitSimulatorBench() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Circuit Parameters
  const [voltage, setVoltage] = useState(12); // Volts
  const [resistance1, setResistance1] = useState(4); // Ohms
  const [resistance2, setResistance2] = useState(6); // Ohms
  const [circuitType, setCircuitType] = useState<"series" | "parallel">("series");
  const [switchClosed, setSwitchClosed] = useState(true);

  // Electron Animation Particle offset
  const animOffsetRef = useRef(0);

  // Equivalent Resistance & Current calculations
  const rEq =
    circuitType === "series"
      ? resistance1 + resistance2
      : (resistance1 * resistance2) / (resistance1 + resistance2);

  const current = switchClosed ? voltage / Math.max(0.1, rEq) : 0; // Amperes (I = V / R)
  const power = current * voltage; // Watts (P = VI)
  const bulbBrightness = Math.min(1.0, power / 40); // 0.0 to 1.0

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Advance particles if switch is closed and current > 0
      if (switchClosed && current > 0) {
        animOffsetRef.current = (animOffsetRef.current + current * 0.8) % 30;
      }

      ctx.clearRect(0, 0, width, height);

      // Dark workbench background with blueprint grid
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, width, height);

      // Subtle grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Circuit Wire Coordinates
      const left = 120;
      const right = width - 120;
      const top = 100;
      const bottom = height - 100;

      // Draw Main Circuit Wire Loop
      ctx.lineWidth = 4;
      ctx.strokeStyle = switchClosed && current > 0 ? "#38bdf8" : "#475569";
      ctx.lineCap = "round";

      ctx.beginPath();
      // Top wire (Battery to Resistors)
      ctx.moveTo(left, top);
      ctx.lineTo(right, top);
      // Right wire (Through load to switch)
      ctx.lineTo(right, bottom);
      // Bottom wire
      ctx.lineTo(left, bottom);
      // Left wire (Back to battery)
      ctx.lineTo(left, top);
      ctx.stroke();

      // Parallel secondary branch if in parallel mode
      if (circuitType === "parallel") {
        const midY = (top + bottom) / 2;
        ctx.beginPath();
        ctx.moveTo(right - 140, top);
        ctx.lineTo(right - 140, bottom);
        ctx.stroke();
      }

      // Draw Animated Drifting Electrons
      if (switchClosed && current > 0) {
        ctx.fillStyle = "#38bdf8";
        ctx.shadowColor = "#0284c7";
        ctx.shadowBlur = 8;

        // Loop perimeter points
        const perimeter = 2 * (right - left) + 2 * (bottom - top);
        const numParticles = 40;
        for (let i = 0; i < numParticles; i++) {
          const dist = (i * (perimeter / numParticles) + animOffsetRef.current * 4) % perimeter;
          let px = 0;
          let py = 0;

          if (dist < right - left) {
            // Top wire (going right)
            px = left + dist;
            py = top;
          } else if (dist < right - left + (bottom - top)) {
            // Right wire (going down)
            px = right;
            py = top + (dist - (right - left));
          } else if (dist < 2 * (right - left) + (bottom - top)) {
            // Bottom wire (going left)
            px = right - (dist - (right - left + (bottom - top)));
            py = bottom;
          } else {
            // Left wire (going up)
            px = left;
            py = bottom - (dist - (2 * (right - left) + (bottom - top)));
          }

          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0; // reset shadow
      }

      // --- Component 1: DC Battery (Left Wire) ---
      const batteryY = (top + bottom) / 2;
      ctx.fillStyle = "#090d16";
      ctx.fillRect(left - 25, batteryY - 35, 50, 70); // clear wire behind

      // Positive long plate
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(left - 20, batteryY - 25);
      ctx.lineTo(left + 20, batteryY - 25);
      ctx.stroke();

      // Negative short plate
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(left - 12, batteryY - 5);
      ctx.lineTo(left + 12, batteryY - 5);
      ctx.stroke();

      // Battery Labels
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("+", left - 28, batteryY - 22);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`${voltage}V DC`, left - 32, batteryY + 25);

      // --- Component 2: Resistors (Top Wire) ---
      const res1X = left + (right - left) * 0.4;
      ctx.fillStyle = "#090d16";
      ctx.fillRect(res1X - 30, top - 18, 60, 36);

      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.fillRect(res1X - 25, top - 12, 50, 24);
      ctx.strokeRect(res1X - 25, top - 12, 50, 24);

      // Color bands on resistor
      ctx.fillStyle = "#eab308";
      ctx.fillRect(res1X - 15, top - 12, 4, 24);
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(res1X - 5, top - 12, 4, 24);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(res1X + 5, top - 12, 4, 24);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`R₁ = ${resistance1}Ω`, res1X, top - 20);

      // Second Resistor (R2)
      const res2X = left + (right - left) * 0.75;
      ctx.fillStyle = "#090d16";
      ctx.fillRect(res2X - 30, top - 18, 60, 36);

      ctx.fillStyle = "#1e293b";
      ctx.fillRect(res2X - 25, top - 12, 50, 24);
      ctx.strokeRect(res2X - 25, top - 12, 50, 24);

      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(res2X - 15, top - 12, 4, 24);
      ctx.fillStyle = "#10b981";
      ctx.fillRect(res2X - 5, top - 12, 4, 24);
      ctx.fillStyle = "#ec4899";
      ctx.fillRect(res2X + 5, top - 12, 4, 24);

      ctx.fillStyle = "#f8fafc";
      ctx.fillText(`R₂ = ${resistance2}Ω`, res2X, top - 20);

      // --- Component 3: Incandescent Lamp / Load (Right Wire) ---
      const bulbY = (top + bottom) / 2;
      ctx.fillStyle = "#090d16";
      ctx.fillRect(right - 25, bulbY - 30, 50, 60);

      // Glow halo
      if (switchClosed && current > 0) {
        const glowRad = 35 + bulbBrightness * 35;
        const glowGrad = ctx.createRadialGradient(right, bulbY, 5, right, bulbY, glowRad);
        glowGrad.addColorStop(0, `rgba(250, 204, 21, ${0.4 + bulbBrightness * 0.5})`);
        glowGrad.addColorStop(1, "rgba(250, 204, 21, 0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(right, bulbY, glowRad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bulb glass
      ctx.strokeStyle = switchClosed && current > 0 ? "#facc15" : "#64748b";
      ctx.fillStyle = switchClosed && current > 0 ? "rgba(254, 240, 138, 0.6)" : "rgba(30, 41, 59, 0.5)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(right, bulbY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bulb filament X
      ctx.strokeStyle = switchClosed && current > 0 ? "#f59e0b" : "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(right - 9, bulbY + 9);
      ctx.lineTo(right + 9, bulbY - 9);
      ctx.moveTo(right - 9, bulbY - 9);
      ctx.lineTo(right + 9, bulbY + 9);
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`Load: ${power.toFixed(1)}W`, right + 38, bulbY + 4);

      // --- Component 4: Single Pole Switch (Bottom Wire) ---
      const switchX = (left + right) / 2;
      ctx.fillStyle = "#090d16";
      ctx.fillRect(switchX - 35, bottom - 15, 70, 30);

      // Terminal terminals
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.arc(switchX - 20, bottom, 5, 0, Math.PI * 2);
      ctx.arc(switchX + 20, bottom, 5, 0, Math.PI * 2);
      ctx.fill();

      // Knife switch blade
      ctx.strokeStyle = switchClosed ? "#10b981" : "#ef4444";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(switchX - 20, bottom);
      if (switchClosed) {
        ctx.lineTo(switchX + 20, bottom);
      } else {
        ctx.lineTo(switchX + 10, bottom - 22); // Open switch angle
      }
      ctx.stroke();

      ctx.fillStyle = switchClosed ? "#34d399" : "#f87171";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(switchClosed ? "Switch: CLOSED (ON)" : "Switch: OPEN (OFF)", switchX, bottom + 25);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [voltage, resistance1, resistance2, circuitType, switchClosed, current, power, bulbBrightness]);

  return (
    <div className="space-y-6">
      {/* Simulation Screen */}
      <div className="relative rounded-3xl border border-slate-200 bg-slate-950 overflow-hidden shadow-2xl dark:border-slate-800">
        <canvas
          ref={canvasRef}
          width={800}
          height={440}
          className="w-full h-[440px] block"
        />

        {/* Live Telemetry Pill Overlay */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
          <span className="rounded-xl bg-slate-900/90 border border-white/10 px-3 py-1.5 text-xs font-black text-cyan-400 backdrop-blur-md">
            I = {current.toFixed(2)} A ({Math.round(current * 1000)} mA)
          </span>
          <span className="rounded-xl bg-slate-900/90 border border-white/10 px-3 py-1.5 text-xs font-bold text-amber-300 backdrop-blur-md">
            P = {power.toFixed(1)} W
          </span>
          <span className="rounded-xl bg-slate-900/90 border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 backdrop-blur-md">
            R(eq) = {rEq.toFixed(2)} Ω
          </span>
        </div>

        {/* Switch Toggle Button inside Canvas */}
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={() => setSwitchClosed(!switchClosed)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition shadow-lg ${
              switchClosed
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-rose-600 text-white hover:bg-rose-700"
            }`}
          >
            {switchClosed ? "⚡ Switch ON (Open Circuit)" : "🔴 Switch OFF (Close Circuit)"}
          </button>
        </div>
      </div>

      {/* Interactive Sliders & Parameter Controllers */}
      <div className="grid gap-4 sm:grid-cols-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            DC Power Supply: <span className="text-cyan-600 font-black">{voltage} V</span>
          </label>
          <input
            type="range"
            min={1}
            max={48}
            step={1}
            value={voltage}
            onChange={(e) => setVoltage(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400">Range: 1V to 48V DC</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Resistor R₁: <span className="text-indigo-600 font-black">{resistance1} Ω</span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={resistance1}
            onChange={(e) => setResistance1(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400">Standard Ohmic Resistor</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Resistor R₂: <span className="text-purple-600 font-black">{resistance2} Ω</span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={resistance2}
            onChange={(e) => setResistance2(Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400">Series/Parallel Load</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Circuit Topology
          </label>
          <div className="flex rounded-xl border border-slate-200 p-1 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setCircuitType("series")}
              className={`w-1/2 py-1.5 rounded-lg text-xs font-bold transition ${
                circuitType === "series"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Series
            </button>
            <button
              type="button"
              onClick={() => setCircuitType("parallel")}
              className={`w-1/2 py-1.5 rounded-lg text-xs font-bold transition ${
                circuitType === "parallel"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Parallel
            </button>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {circuitType === "series" ? "R = R₁ + R₂" : "1/R = 1/R₁ + 1/R₂"}
          </span>
        </div>
      </div>
    </div>
  );
}
