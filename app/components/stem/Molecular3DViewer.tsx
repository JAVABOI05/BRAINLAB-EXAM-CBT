"use client";

import React, { useEffect, useRef, useState } from "react";

interface Atom3D {
  element: "H" | "C" | "N" | "O" | "Cl";
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
}

interface Bond3D {
  atom1: number;
  atom2: number;
  order: 1 | 2 | 3;
}

interface MoleculeData {
  id: string;
  name: string;
  formula: string;
  molarMass: number;
  geometry: string;
  hybridization: string;
  bondAngle: string;
  description: string;
  atoms: Atom3D[];
  bonds: Bond3D[];
}

const CPK_COLORS = {
  H: "#FFFFFF",
  C: "#4A4A4A",
  N: "#2563EB",
  O: "#DC2626",
  Cl: "#16A34A",
};

const MOLECULES: MoleculeData[] = [
  {
    id: "h2o",
    name: "Water",
    formula: "H₂O",
    molarMass: 18.015,
    geometry: "Bent (V-shaped)",
    hybridization: "sp³",
    bondAngle: "104.5°",
    description: "Two bonding pairs and two lone pairs on oxygen compress the bond angle from 109.5° to 104.5°.",
    atoms: [
      { element: "O", x: 0, y: 15, z: 0, radius: 26, color: CPK_COLORS.O },
      { element: "H", x: -65, y: -45, z: 0, radius: 15, color: CPK_COLORS.H },
      { element: "H", x: 65, y: -45, z: 0, radius: 15, color: CPK_COLORS.H },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 0, atom2: 2, order: 1 },
    ],
  },
  {
    id: "ch4",
    name: "Methane",
    formula: "CH₄",
    molarMass: 16.043,
    geometry: "Tetrahedral",
    hybridization: "sp³",
    bondAngle: "109.5°",
    description: "Symmetric tetrahedral arrangement with four equivalent covalent C-H single bonds.",
    atoms: [
      { element: "C", x: 0, y: 0, z: 0, radius: 28, color: CPK_COLORS.C },
      { element: "H", x: 0, y: 80, z: 0, radius: 15, color: CPK_COLORS.H },
      { element: "H", x: 75, y: -27, z: 0, radius: 15, color: CPK_COLORS.H },
      { element: "H", x: -38, y: -27, z: 65, radius: 15, color: CPK_COLORS.H },
      { element: "H", x: -38, y: -27, z: -65, radius: 15, color: CPK_COLORS.H },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 0, atom2: 2, order: 1 },
      { atom1: 0, atom2: 3, order: 1 },
      { atom1: 0, atom2: 4, order: 1 },
    ],
  },
  {
    id: "nh3",
    name: "Ammonia",
    formula: "NH₃",
    molarMass: 17.031,
    geometry: "Trigonal Pyramidal",
    hybridization: "sp³",
    bondAngle: "107.0°",
    description: "One lone pair on nitrogen repels the three N-H single bonds into a triangular pyramid.",
    atoms: [
      { element: "N", x: 0, y: 25, z: 0, radius: 27, color: CPK_COLORS.N },
      { element: "H", x: 0, y: -45, z: 70, radius: 15, color: CPK_COLORS.H },
      { element: "H", x: 61, y: -45, z: -35, radius: 15, color: CPK_COLORS.H },
      { element: "H", x: -61, y: -45, z: -35, radius: 15, color: CPK_COLORS.H },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 0, atom2: 2, order: 1 },
      { atom1: 0, atom2: 3, order: 1 },
    ],
  },
  {
    id: "co2",
    name: "Carbon Dioxide",
    formula: "CO₂",
    molarMass: 44.01,
    geometry: "Linear",
    hybridization: "sp",
    bondAngle: "180.0°",
    description: "Linear orientation of two double bonds with zero net molecular dipole moment.",
    atoms: [
      { element: "C", x: 0, y: 0, z: 0, radius: 28, color: CPK_COLORS.C },
      { element: "O", x: -95, y: 0, z: 0, radius: 26, color: CPK_COLORS.O },
      { element: "O", x: 95, y: 0, z: 0, radius: 26, color: CPK_COLORS.O },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 2 },
      { atom1: 0, atom2: 2, order: 2 },
    ],
  },
  {
    id: "c6h6",
    name: "Benzene",
    formula: "C₆H₆",
    molarMass: 78.114,
    geometry: "Planar Hexagonal",
    hybridization: "sp²",
    bondAngle: "120.0°",
    description: "Delocalized aromatic π-electron ring with uniform carbon-carbon bond lengths of 1.39 Å.",
    atoms: [
      // 6 Carbons
      { element: "C", x: 60, y: 0, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: 30, y: 52, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: -30, y: 52, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: -60, y: 0, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: -30, y: -52, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: 30, y: -52, z: 0, radius: 24, color: CPK_COLORS.C },
      // 6 Hydrogens
      { element: "H", x: 105, y: 0, z: 0, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: 52, y: 91, z: 0, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: -52, y: 91, z: 0, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: -105, y: 0, z: 0, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: -52, y: -91, z: 0, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: 52, y: -91, z: 0, radius: 14, color: CPK_COLORS.H },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 1, atom2: 2, order: 2 },
      { atom1: 2, atom2: 3, order: 1 },
      { atom1: 3, atom2: 4, order: 2 },
      { atom1: 4, atom2: 5, order: 1 },
      { atom1: 5, atom2: 0, order: 2 },
      { atom1: 0, atom2: 6, order: 1 },
      { atom1: 1, atom2: 7, order: 1 },
      { atom1: 2, atom2: 8, order: 1 },
      { atom1: 3, atom2: 9, order: 1 },
      { atom1: 4, atom2: 10, order: 1 },
      { atom1: 5, atom2: 11, order: 1 },
    ],
  },
];

export default function Molecular3DViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedMolecule, setSelectedMolecule] = useState<MoleculeData>(MOLECULES[0]);
  const [renderMode, setRenderMode] = useState<"ball_and_stick" | "space_filling">("ball_and_stick");
  const [isRotating, setIsRotating] = useState(true);
  const [zoom, setZoom] = useState(1.1);

  // 3D rotation angles in radians
  const anglesRef = useRef({ yaw: 0.4, pitch: 0.3 });
  const isDraggingRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Handle Mouse Drag for 3D rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    anglesRef.current.yaw += deltaX * 0.01;
    anglesRef.current.pitch += deltaY * 0.01;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Render Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (isRotating && !isDraggingRef.current) {
        anglesRef.current.yaw += 0.01;
      }

      const { yaw, pitch } = anglesRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Dark background gradient
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, width / 2);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(1, "#020617");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Transform Atoms (3D Rotation around Yaw and Pitch)
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const projectedAtoms = selectedMolecule.atoms.map((atom) => {
        // Rotate around Y-axis (Yaw)
        const x1 = atom.x * cosY + atom.z * sinY;
        const z1 = -atom.x * sinY + atom.z * cosY;
        // Rotate around X-axis (Pitch)
        const y2 = atom.y * cosP - z1 * sinP;
        const z2 = atom.y * sinP + z1 * cosP;

        // Perspective projection
        const fov = 400;
        const scale = (fov / (fov + z2)) * zoom;
        const projX = centerX + x1 * scale;
        const projY = centerY - y2 * scale; // invert Y for standard screen coordinates

        return {
          ...atom,
          projX,
          projY,
          depth: z2,
          renderRadius: atom.radius * (renderMode === "space_filling" ? 1.7 : 1) * scale,
        };
      });

      // Draw Bonds (if ball and stick)
      if (renderMode === "ball_and_stick") {
        selectedMolecule.bonds.forEach((bond) => {
          const a1 = projectedAtoms[bond.atom1];
          const a2 = projectedAtoms[bond.atom2];
          if (!a1 || !a2) return;

          ctx.lineWidth = bond.order === 2 ? 8 : bond.order === 3 ? 12 : 5;
          ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
          ctx.lineCap = "round";

          ctx.beginPath();
          ctx.moveTo(a1.projX, a1.projY);
          ctx.lineTo(a2.projX, a2.projY);
          ctx.stroke();

          // Double bond secondary stripe
          if (bond.order === 2) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.beginPath();
            ctx.moveTo(a1.projX, a1.projY);
            ctx.lineTo(a2.projX, a2.projY);
            ctx.stroke();
          }
        });
      }

      // Sort atoms by depth (Painter's algorithm: draw farthest first)
      const sortedAtoms = [...projectedAtoms].sort((a, b) => b.depth - a.depth);

      // Draw Spherical Atoms with 3D Shading
      sortedAtoms.forEach((atom) => {
        const rad = Math.max(4, atom.renderRadius);

        // 3D Spherical Radial Gradient
        const grad = ctx.createRadialGradient(
          atom.projX - rad * 0.35,
          atom.projY - rad * 0.35,
          rad * 0.05,
          atom.projX,
          atom.projY,
          rad
        );
        grad.addColorStop(0, "#FFFFFF");
        grad.addColorStop(0.3, atom.color);
        grad.addColorStop(1, "#050505");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(atom.projX, atom.projY, rad, 0, Math.PI * 2);
        ctx.fill();

        // Atom Symbol Label
        ctx.fillStyle = atom.element === "H" ? "#0f172a" : "#FFFFFF";
        ctx.font = `bold ${Math.max(9, Math.round(rad * 0.7))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(atom.element, atom.projX, atom.projY);
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [selectedMolecule, renderMode, isRotating, zoom]);

  return (
    <div className="space-y-6">
      {/* 3D Canvas Workspace */}
      <div className="relative rounded-3xl border border-slate-200 bg-slate-950 overflow-hidden shadow-2xl dark:border-slate-800">
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-[480px] cursor-grab active:cursor-grabbing block"
        />

        {/* Floating 3D Control Pill */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <span className="rounded-xl bg-slate-900/90 border border-white/10 px-3 py-1.5 text-xs font-black text-cyan-400 backdrop-blur-md">
            {selectedMolecule.formula} · {selectedMolecule.name}
          </span>
          <span className="rounded-xl bg-slate-900/90 border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 backdrop-blur-md">
            Geometry: {selectedMolecule.geometry} ({selectedMolecule.bondAngle})
          </span>
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-slate-900/90 border border-white/10 p-1.5 rounded-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isRotating ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
            }`}
          >
            {isRotating ? "⏸ Pause Spin" : "▶ Auto Spin"}
          </button>
          <button
            type="button"
            onClick={() => setRenderMode(renderMode === "ball_and_stick" ? "space_filling" : "ball_and_stick")}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition"
          >
            {renderMode === "ball_and_stick" ? "Space-Filling View" : "Ball & Stick View"}
          </button>
          <div className="flex items-center gap-1 pl-2 border-l border-white/10">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
              className="h-7 w-7 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center font-bold text-xs"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="h-7 w-7 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center font-bold text-xs"
            >
              -
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-20 text-[10px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/10 backdrop-blur-xs">
          💡 Click and drag with mouse or touch to rotate in 3D
        </div>
      </div>

      {/* Preset Molecules Selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
          Select Standard Chemical Structure
        </h4>
        <div className="grid gap-2 sm:grid-cols-5">
          {MOLECULES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMolecule(m)}
              className={`rounded-xl p-3 text-left transition border ${
                m.id === selectedMolecule.id
                  ? "border-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/40"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950"
              }`}
            >
              <div className="font-extrabold text-sm text-slate-900 dark:text-white">{m.formula}</div>
              <div className="text-[11px] text-slate-500 truncate">{m.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Molecular Telemetry Details */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-black uppercase text-slate-400">VSEPR Geometry</span>
          <div className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
            {selectedMolecule.geometry}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-black uppercase text-slate-400">Central Atom Hybridization</span>
          <div className="mt-1 text-base font-extrabold text-indigo-600 dark:text-indigo-400">
            {selectedMolecule.hybridization}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-black uppercase text-slate-400">Bond Angle</span>
          <div className="mt-1 text-base font-extrabold text-emerald-600 dark:text-emerald-400">
            {selectedMolecule.bondAngle}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[10px] font-black uppercase text-slate-400">Molar Mass</span>
          <div className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
            {selectedMolecule.molarMass} g/mol
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-900 dark:border-indigo-950/60 dark:bg-indigo-950/20 dark:text-indigo-300">
        <strong>🧪 Pedagogical Note:</strong> {selectedMolecule.description}
      </div>
    </div>
  );
}
