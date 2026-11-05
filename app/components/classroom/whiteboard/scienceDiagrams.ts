/**
 * BrainLab Professional Liveboard - STEM Science Diagram Preset Engine
 * Stage 4: Circuit Components, Chemical Apparatus, Molecular Structures & Biological Cells
 */

import type { WhiteboardElement } from "@/app/components/SmartWhiteboard";

export type DiagramCategory = "physics" | "chemistry" | "biology";

export interface ScienceDiagramPreset {
  id: string;
  name: string;
  category: DiagramCategory;
  description: string;
  generate: (cx: number, cy: number, scale?: number) => WhiteboardElement[];
}

// ----------------------------------------------------------------------------
// 1. PHYSICS & ELECTRICAL CIRCUIT DIAGRAM GENERATORS
// ----------------------------------------------------------------------------

/**
 * Resistor (Standard zig-zag electrical symbol)
 */
export function generateResistor(cx: number, cy: number, scale = 1): WhiteboardElement[] {
  const gid = `diagram-resistor-${Date.now()}`;
  const w = 120 * scale;
  const h = 24 * scale;
  const left = cx - w / 2;
  const right = cx + w / 2;

  // Zig-zag points: lead-in, 6 zigs, lead-out
  const points = [
    { x: left, y: cy },
    { x: left + w * 0.2, y: cy },
    { x: left + w * 0.25, y: cy - h / 2 },
    { x: left + w * 0.35, y: cy + h / 2 },
    { x: left + w * 0.45, y: cy - h / 2 },
    { x: left + w * 0.55, y: cy + h / 2 },
    { x: left + w * 0.65, y: cy - h / 2 },
    { x: left + w * 0.75, y: cy + h / 2 },
    { x: left + w * 0.8, y: cy },
    { x: right, y: cy },
  ];

  return [
    {
      id: `${gid}-body`,
      groupId: gid,
      type: "pen",
      color: "#38bdf8",
      width: 2.5,
      points,
    },
    {
      id: `${gid}-lbl`,
      groupId: gid,
      type: "text",
      color: "#e2e8f0",
      width: 1,
      startX: cx - 8,
      startY: cy - h / 2 - 8,
      text: "R",
      fontSize: 16,
    },
  ];
}

/**
 * Capacitor (Two parallel plates with wire leads)
 */
export function generateCapacitor(cx: number, cy: number, scale = 1): WhiteboardElement[] {
  const gid = `diagram-capacitor-${Date.now()}`;
  const gap = 16 * scale;
  const plateH = 44 * scale;
  const leadLen = 40 * scale;

  return [
    // Left lead
    {
      id: `${gid}-lead1`,
      groupId: gid,
      type: "line",
      color: "#38bdf8",
      width: 2.5,
      startX: cx - gap / 2 - leadLen,
      startY: cy,
      endX: cx - gap / 2,
      endY: cy,
    },
    // Left plate
    {
      id: `${gid}-plate1`,
      groupId: gid,
      type: "line",
      color: "#38bdf8",
      width: 3,
      startX: cx - gap / 2,
      startY: cy - plateH / 2,
      endX: cx - gap / 2,
      endY: cy + plateH / 2,
    },
    // Right plate
    {
      id: `${gid}-plate2`,
      groupId: gid,
      type: "line",
      color: "#38bdf8",
      width: 3,
      startX: cx + gap / 2,
      startY: cy - plateH / 2,
      endX: cx + gap / 2,
      endY: cy + plateH / 2,
    },
    // Right lead
    {
      id: `${gid}-lead2`,
      groupId: gid,
      type: "line",
      color: "#38bdf8",
      width: 2.5,
      startX: cx + gap / 2,
      startY: cy,
      endX: cx + gap / 2 + leadLen,
      endY: cy,
    },
    {
      id: `${gid}-lbl`,
      groupId: gid,
      type: "text",
      color: "#e2e8f0",
      width: 1,
      startX: cx - 6,
      startY: cy - plateH / 2 - 8,
      text: "C",
      fontSize: 16,
    },
  ];
}

/**
 * DC Battery / Voltage Source
 */
export function generateBattery(cx: number, cy: number, scale = 1): WhiteboardElement[] {
  const gid = `diagram-battery-${Date.now()}`;
  const gap = 14 * scale;
  const longH = 48 * scale;
  const shortH = 24 * scale;
  const leadLen = 35 * scale;

  return [
    // Positive Lead
    {
      id: `${gid}-lead-pos`,
      groupId: gid,
      type: "line",
      color: "#38bdf8",
      width: 2.5,
      startX: cx - gap / 2 - leadLen,
      startY: cy,
      endX: cx - gap / 2,
      endY: cy,
    },
    // Positive Long Plate
    {
      id: `${gid}-plate-pos`,
      groupId: gid,
      type: "line",
      color: "#10b981", // Emerald positive
      width: 3,
      startX: cx - gap / 2,
      startY: cy - longH / 2,
      endX: cx - gap / 2,
      endY: cy + longH / 2,
    },
    // Negative Short Plate
    {
      id: `${gid}-plate-neg`,
      groupId: gid,
      type: "line",
      color: "#ff5238", // Coral negative
      width: 4,
      startX: cx + gap / 2,
      startY: cy - shortH / 2,
      endX: cx + gap / 2,
      endY: cy + shortH / 2,
    },
    // Negative Lead
    {
      id: `${gid}-lead-neg`,
      groupId: gid,
      type: "line",
      color: "#38bdf8",
      width: 2.5,
      startX: cx + gap / 2,
      startY: cy,
      endX: cx + gap / 2 + leadLen,
      endY: cy,
    },
    // + Sign
    {
      id: `${gid}-sign-pos`,
      groupId: gid,
      type: "text",
      color: "#10b981",
      width: 1,
      startX: cx - gap / 2 - 16,
      startY: cy - longH / 2,
      text: "+",
      fontSize: 18,
    },
    // - Sign
    {
      id: `${gid}-sign-neg`,
      groupId: gid,
      type: "text",
      color: "#ff5238",
      width: 1,
      startX: cx + gap / 2 + 10,
      startY: cy - shortH / 2,
      text: "-",
      fontSize: 18,
    },
  ];
}

/**
 * Electrical Ground Symbol
 */
export function generateGround(cx: number, cy: number, scale = 1): WhiteboardElement[] {
  const gid = `diagram-ground-${Date.now()}`;
  const stem = 30 * scale;

  return [
    // Vertical stem
    {
      id: `${gid}-stem`,
      groupId: gid,
      type: "line",
      color: "#38bdf8",
      width: 2.5,
      startX: cx,
      startY: cy,
      endX: cx,
      endY: cy + stem,
    },
    // Top bar
    {
      id: `${gid}-bar1`,
      groupId: gid,
      type: "line",
      color: "#38bdf8",
      width: 3,
      startX: cx - 22 * scale,
      startY: cy + stem,
      endX: cx + 22 * scale,
      endY: cy + stem,
    },
    // Middle bar
    {
      id: `${gid}-bar2`,
      groupId: gid,
      type: "line",
      color: "#38bdf8",
      width: 2.5,
      startX: cx - 14 * scale,
      startY: cy + stem + 7 * scale,
      endX: cx + 14 * scale,
      endY: cy + stem + 7 * scale,
    },
    // Bottom bar
    {
      id: `${gid}-bar3`,
      groupId: gid,
      type: "line",
      color: "#38bdf8",
      width: 2,
      startX: cx - 6 * scale,
      startY: cy + stem + 14 * scale,
      endX: cx + 6 * scale,
      endY: cy + stem + 14 * scale,
    },
  ];
}

// ----------------------------------------------------------------------------
// 2. CHEMISTRY APPARATUS & MOLECULAR STRUCTURES
// ----------------------------------------------------------------------------

/**
 * Chemistry Beaker with graduated markings and liquid level
 */
export function generateBeaker(cx: number, cy: number, scale = 1): WhiteboardElement[] {
  const gid = `diagram-beaker-${Date.now()}`;
  const w = 110 * scale;
  const h = 140 * scale;
  const left = cx - w / 2;
  const right = cx + w / 2;
  const top = cy - h / 2;
  const bottom = cy + h / 2;

  // Lip / rim points
  const beakerPoints = [
    { x: left - 10 * scale, y: top }, // Spout
    { x: left, y: top },
    { x: left, y: bottom - 10 * scale },
    { x: left + 10 * scale, y: bottom },
    { x: right - 10 * scale, y: bottom },
    { x: right, y: bottom - 10 * scale },
    { x: right, y: top },
    { x: right + 6 * scale, y: top },
  ];

  const elements: WhiteboardElement[] = [
    // Beaker Contour
    {
      id: `${gid}-contour`,
      groupId: gid,
      type: "pen",
      color: "#f8fafc",
      width: 2.5,
      points: beakerPoints,
    },
    // Liquid Fill (translucent blue)
    {
      id: `${gid}-liquid`,
      groupId: gid,
      type: "rect",
      color: "transparent",
      fillColor: "rgba(56, 189, 248, 0.28)",
      width: 0,
      startX: left + 2,
      startY: top + h * 0.45,
      endX: right - 2,
      endY: bottom - 2,
    },
    // Meniscus Line
    {
      id: `${gid}-meniscus`,
      groupId: gid,
      type: "line",
      color: "#38bdf8",
      width: 2,
      startX: left + 3,
      startY: top + h * 0.45,
      endX: right - 3,
      endY: top + h * 0.45,
    },
  ];

  // Graduated measurement tick lines
  for (let i = 1; i <= 4; i++) {
    const tickY = bottom - i * (h / 6);
    elements.push({
      id: `${gid}-tick-${i}`,
      groupId: gid,
      type: "line",
      color: "rgba(248, 250, 252, 0.75)",
      width: 1.5,
      startX: left,
      startY: tickY,
      endX: left + 18 * scale,
      endY: tickY,
    });
  }

  // Label: e.g. 250 mL
  elements.push({
    id: `${gid}-lbl`,
    groupId: gid,
    type: "text",
    color: "#f8fafc",
    width: 1,
    startX: cx - 22,
    startY: top + h * 0.35,
    text: "250 mL",
    fontSize: 13,
  });

  return elements;
}

/**
 * Organic Chemistry Benzene Ring ($C_6H_6$ with alternating or resonant double bonds)
 */
export function generateBenzeneRing(cx: number, cy: number, scale = 1): WhiteboardElement[] {
  const gid = `diagram-benzene-${Date.now()}`;
  const r = 55 * scale;
  const elements: WhiteboardElement[] = [];

  // 6 vertices of hexagon
  const vertices: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 - Math.PI / 6;
    vertices.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  // Outer Hexagon Perimeter
  elements.push({
    id: `${gid}-outer`,
    groupId: gid,
    type: "pen",
    color: "#e2e8f0",
    width: 2.5,
    points: [...vertices, vertices[0]],
  });

  // Inner Resonant Delocalization Circle
  const innerR = r * 0.58;
  elements.push({
    id: `${gid}-inner-circle`,
    groupId: gid,
    type: "circle",
    color: "#e2e8f0",
    width: 2,
    startX: cx - innerR,
    startY: cy - innerR,
    endX: cx + innerR,
    endY: cy + innerR,
  });

  return elements;
}

// ----------------------------------------------------------------------------
// 3. BIOLOGY & CELL STRUCTURES
// ----------------------------------------------------------------------------

/**
 * Eukaryotic Animal Cell Template with Nucleus and Organelles
 */
export function generateAnimalCell(cx: number, cy: number, scale = 1): WhiteboardElement[] {
  const gid = `diagram-cell-${Date.now()}`;
  const rx = 120 * scale;
  const ry = 90 * scale;

  return [
    // Outer Plasma Membrane (Ellipse)
    {
      id: `${gid}-membrane`,
      groupId: gid,
      type: "circle",
      color: "#10b981",
      fillColor: "rgba(16, 185, 129, 0.12)",
      width: 2.5,
      startX: cx - rx,
      startY: cy - ry,
      endX: cx + rx,
      endY: cy + ry,
    },
    // Cell Membrane Label
    {
      id: `${gid}-lbl-membrane`,
      groupId: gid,
      type: "text",
      color: "#10b981",
      width: 1,
      startX: cx + rx - 20,
      startY: cy - ry + 10,
      text: "Cell Membrane",
      fontSize: 12,
    },
    // Nucleus (Inner Ellipse)
    {
      id: `${gid}-nucleus`,
      groupId: gid,
      type: "circle",
      color: "#a855f7",
      fillColor: "rgba(168, 85, 247, 0.35)",
      width: 2,
      startX: cx - 40 * scale,
      startY: cy - 35 * scale,
      endX: cx + 40 * scale,
      endY: cy + 35 * scale,
    },
    // Nucleolus (Dense Core)
    {
      id: `${gid}-nucleolus`,
      groupId: gid,
      type: "circle",
      color: "#9333ea",
      fillColor: "#9333ea",
      width: 2,
      startX: cx - 12 * scale,
      startY: cy - 12 * scale,
      endX: cx + 12 * scale,
      endY: cy + 12 * scale,
    },
    // Nucleus Label
    {
      id: `${gid}-lbl-nucleus`,
      groupId: gid,
      type: "text",
      color: "#c084fc",
      width: 1,
      startX: cx - 24,
      startY: cy + 45 * scale,
      text: "Nucleus",
      fontSize: 13,
    },
    // Mitochondrion 1 (Bean shape)
    {
      id: `${gid}-mito1`,
      groupId: gid,
      type: "circle",
      color: "#f59e0b",
      fillColor: "rgba(245, 158, 11, 0.45)",
      width: 1.5,
      startX: cx - rx * 0.65,
      startY: cy - ry * 0.4,
      endX: cx - rx * 0.35,
      endY: cy - ry * 0.1,
    },
    // Mitochondria Label
    {
      id: `${gid}-lbl-mito`,
      groupId: gid,
      type: "text",
      color: "#fbbf24",
      width: 1,
      startX: cx - rx * 0.8,
      startY: cy - ry * 0.5,
      text: "Mitochondria",
      fontSize: 11,
    },
  ];
}

/**
 * DNA Double Helix Strand Segment
 */
export function generateDNAStrand(cx: number, cy: number, scale = 1): WhiteboardElement[] {
  const gid = `diagram-dna-${Date.now()}`;
  const length = 260 * scale;
  const amplitude = 32 * scale;
  const startX = cx - length / 2;
  const elements: WhiteboardElement[] = [];

  const strand1Points: { x: number; y: number }[] = [];
  const strand2Points: { x: number; y: number }[] = [];

  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const px = startX + (i / steps) * length;
    const phase = (i / steps) * Math.PI * 4; // 2 complete waves
    const y1 = cy + Math.sin(phase) * amplitude;
    const y2 = cy - Math.sin(phase) * amplitude;
    strand1Points.push({ x: px, y: y1 });
    strand2Points.push({ x: px, y: y2 });

    // Base pair crossbars at regular intervals
    if (i % 3 === 0 && i > 0 && i < steps) {
      const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b"]; // A, T, C, G
      const barColor = colors[(i / 3) % colors.length];
      elements.push({
        id: `${gid}-base-${i}`,
        groupId: gid,
        type: "line",
        color: barColor,
        width: 2,
        startX: px,
        startY: y1,
        endX: px,
        endY: y2,
      });
    }
  }

  // Strand 1 (Sugar-phosphate backbone)
  elements.push({
    id: `${gid}-strand1`,
    groupId: gid,
    type: "pen",
    color: "#38bdf8",
    width: 2.5,
    points: strand1Points,
  });

  // Strand 2 (Antiparallel backbone)
  elements.push({
    id: `${gid}-strand2`,
    groupId: gid,
    type: "pen",
    color: "#818cf8",
    width: 2.5,
    points: strand2Points,
  });

  // Label
  elements.push({
    id: `${gid}-lbl`,
    groupId: gid,
    type: "text",
    color: "#e2e8f0",
    width: 1,
    startX: cx - 55,
    startY: cy + amplitude + 16,
    text: "DNA Double Helix (A-T, C-G)",
    fontSize: 12,
  });

  return elements;
}

// ----------------------------------------------------------------------------
// 4. PRESET REGISTRY
// ----------------------------------------------------------------------------
export const SCIENCE_DIAGRAM_PRESETS: ScienceDiagramPreset[] = [
  // Physics
  {
    id: "resistor",
    name: "Resistor (R)",
    category: "physics",
    description: "Standard zig-zag electrical resistor component",
    generate: generateResistor,
  },
  {
    id: "capacitor",
    name: "Capacitor (C)",
    category: "physics",
    description: "Parallel plate electrostatic capacitor",
    generate: generateCapacitor,
  },
  {
    id: "battery",
    name: "DC Battery (V)",
    category: "physics",
    description: "DC voltage supply with positive and negative polarities",
    generate: generateBattery,
  },
  {
    id: "ground",
    name: "Earth Ground",
    category: "physics",
    description: "Common electrical earth reference",
    generate: generateGround,
  },
  // Chemistry
  {
    id: "beaker",
    name: "Graduated Beaker",
    category: "chemistry",
    description: "Glass laboratory beaker with graduations and liquid meniscus",
    generate: generateBeaker,
  },
  {
    id: "benzene",
    name: "Benzene Ring",
    category: "chemistry",
    description: "Resonant aromatic hexagon (C6H6)",
    generate: generateBenzeneRing,
  },
  // Biology
  {
    id: "animal-cell",
    name: "Animal Cell",
    category: "biology",
    description: "Eukaryotic cell with membrane, nucleus, and mitochondria",
    generate: generateAnimalCell,
  },
  {
    id: "dna-strand",
    name: "DNA Double Helix",
    category: "biology",
    description: "Antiparallel double helix with base-pair rungs",
    generate: generateDNAStrand,
  },
];
