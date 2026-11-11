"use client";

import React, { useEffect, useRef, useState } from "react";

// =============================================================================
// TYPES & DATA STRUCTURES
// =============================================================================

export interface Atom3D {
  element: "H" | "C" | "N" | "O" | "P" | "S" | "Cl";
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
}

export interface Bond3D {
  atom1: number;
  atom2: number;
  order: 1 | 2 | 3;
}

export interface SmallMoleculeData {
  type: "small_molecule";
  id: string;
  name: string;
  formula: string;
  category: "Inorganic" | "Hydrocarbon" | "Bio-Organic";
  molarMass: number;
  geometry: string;
  hybridization: string;
  bondAngle: string;
  examTakeaway: string;
  description: string;
  atoms: Atom3D[];
  bonds: Bond3D[];
}

export interface MacromoleculeData {
  type: "macromolecule";
  id: string;
  name: string;
  formula: string;
  category: "Nucleic Acid" | "Protein / Enzyme" | "Genetics & Pathology";
  pdbId: string;
  molarMassDesc: string;
  structuralClass: string;
  keyResidueFocus: string;
  examTakeaway: string;
  description: string;
  highlightDetails?: {
    label: string;
    description: string;
    chain: string;
    residueNumber: number;
  };
}

export type CuratedMolecule = SmallMoleculeData | MacromoleculeData;

// CPK Color Palette (Core WAEC/JAMB Elements)
const CPK_COLORS = {
  H: "#FFFFFF",
  C: "#374151",
  N: "#2563EB",
  O: "#DC2626",
  P: "#EA580C",
  S: "#EAB308",
  Cl: "#16A34A",
};

// =============================================================================
// CURATED 12-MODEL SECONDARY SCHOOL & JAMB COLLECTION
// =============================================================================

export const CURATED_MOLECULES: CuratedMolecule[] = [
  // 1. Water
  {
    type: "small_molecule",
    id: "h2o",
    name: "Water",
    formula: "H₂O",
    category: "Inorganic",
    molarMass: 18.015,
    geometry: "Bent (V-shaped)",
    hybridization: "sp³",
    bondAngle: "104.5°",
    examTakeaway: "JAMB Classic: Two non-bonding lone pairs exert greater electrostatic repulsion than bond pairs, compressing the tetrahedral angle from 109.5° down to 104.5°.",
    description: "Polar universal solvent with significant permanent dipole moment and extensive intermolecular hydrogen bonding.",
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

  // 2. Methane
  {
    type: "small_molecule",
    id: "ch4",
    name: "Methane",
    formula: "CH₄",
    category: "Hydrocarbon",
    molarMass: 16.043,
    geometry: "Tetrahedral",
    hybridization: "sp³",
    bondAngle: "109.5°",
    examTakeaway: "WAEC Core: Symmetrical non-polar alkane. The four C-H single bonds experience equal valence shell repulsion, producing the ideal 109.5° angle.",
    description: "Simplest aliphatic alkane; primary constituent of natural gas.",
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

  // 3. Ammonia
  {
    type: "small_molecule",
    id: "nh3",
    name: "Ammonia",
    formula: "NH₃",
    category: "Inorganic",
    molarMass: 17.031,
    geometry: "Trigonal Pyramidal",
    hybridization: "sp³",
    bondAngle: "107.0°",
    examTakeaway: "UTME Rule: One lone pair on nitrogen repels the three N-H bonding pairs, reducing the angle from 109.5° to 107.0°.",
    description: "Basic alkaline gas that dissolves readily in water to form aqueous ammonium hydroxide.",
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

  // 4. Carbon Dioxide
  {
    type: "small_molecule",
    id: "co2",
    name: "Carbon Dioxide",
    formula: "CO₂",
    category: "Inorganic",
    molarMass: 44.01,
    geometry: "Linear",
    hybridization: "sp",
    bondAngle: "180.0°",
    examTakeaway: "WAEC Exam Question: Although each C=O bond is strongly polar, the linear 180° symmetry results in equal and opposite dipole cancellation (net dipole = 0).",
    description: "Greenhouse gas product of complete hydrocarbon combustion and cellular aerobic respiration.",
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

  // 5. Ethanol
  {
    type: "small_molecule",
    id: "c2h5oh",
    name: "Ethanol",
    formula: "C₂H₅OH",
    category: "Hydrocarbon",
    molarMass: 46.069,
    geometry: "Tetrahedral at Carbon, Bent at Oxygen",
    hybridization: "sp³",
    bondAngle: "109.5° / 104.5°",
    examTakeaway: "Organic Chemistry Core: Belongs to the primary alkanol homologous series. Undergoes acid-catalysed esterification with ethanoic acid to produce sweet-smelling ethyl ethanoate.",
    description: "Produced via yeast fermentation of glucose; forms intermolecular hydrogen bonds leading to high boiling point relative to ethane.",
    atoms: [
      { element: "C", x: -45, y: 0, z: 0, radius: 26, color: CPK_COLORS.C },
      { element: "C", x: 30, y: 0, z: 0, radius: 26, color: CPK_COLORS.C },
      { element: "O", x: 80, y: 55, z: 0, radius: 25, color: CPK_COLORS.O },
      { element: "H", x: 140, y: 45, z: 0, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: -80, y: 50, z: 40, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: -80, y: -50, z: 40, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: -60, y: 0, z: -60, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: 45, y: -50, z: 40, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: 45, y: -20, z: -60, radius: 14, color: CPK_COLORS.H },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 1, atom2: 2, order: 1 },
      { atom1: 2, atom2: 3, order: 1 },
      { atom1: 0, atom2: 4, order: 1 },
      { atom1: 0, atom2: 5, order: 1 },
      { atom1: 0, atom2: 6, order: 1 },
      { atom1: 1, atom2: 7, order: 1 },
      { atom1: 1, atom2: 8, order: 1 },
    ],
  },

  // 6. Benzene
  {
    type: "small_molecule",
    id: "c6h6",
    name: "Benzene",
    formula: "C₆H₆",
    category: "Hydrocarbon",
    molarMass: 78.114,
    geometry: "Planar Hexagonal",
    hybridization: "sp²",
    bondAngle: "120.0°",
    examTakeaway: "Aromaticity Rule: Delocalised π-electron ring creates resonance stabilization, undergoing electrophilic substitution rather than alkene addition reactions.",
    description: "Classic planar aromatic hydrocarbon with equal carbon-carbon bond lengths of 1.39 Å.",
    atoms: [
      { element: "C", x: 60, y: 0, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: 30, y: 52, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: -30, y: 52, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: -60, y: 0, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: -30, y: -52, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: 30, y: -52, z: 0, radius: 24, color: CPK_COLORS.C },
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

  // 7. Glucose
  {
    type: "small_molecule",
    id: "glucose",
    name: "α-D-Glucose",
    formula: "C₆H₁₂O₆",
    category: "Bio-Organic",
    molarMass: 180.16,
    geometry: "Pyranose Ring (Chair Conformation)",
    hybridization: "sp³",
    bondAngle: "109.5°",
    examTakeaway: "Biology & Chemistry: Reducing hexose sugar that reduces Benedict's and Fehling's solutions from blue copper(II) to brick-red copper(I) oxide precipitate.",
    description: "Fundamental substrate for cellular glycolysis and primary energy carrier in human bloodstream.",
    atoms: [
      { element: "C", x: -40, y: 35, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: 25, y: 55, z: 15, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: 65, y: 0, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: 30, y: -50, z: -15, radius: 24, color: CPK_COLORS.C },
      { element: "C", x: -35, y: -45, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "O", x: -65, y: 0, z: 15, radius: 23, color: CPK_COLORS.O },
      { element: "O", x: 120, y: 15, z: -10, radius: 23, color: CPK_COLORS.O },
      { element: "O", x: 50, y: -95, z: 0, radius: 23, color: CPK_COLORS.O },
      { element: "H", x: 145, y: -15, z: 0, radius: 13, color: CPK_COLORS.H },
      { element: "H", x: 80, y: -120, z: 0, radius: 13, color: CPK_COLORS.H },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 1, atom2: 2, order: 1 },
      { atom1: 2, atom2: 3, order: 1 },
      { atom1: 3, atom2: 4, order: 1 },
      { atom1: 4, atom2: 5, order: 1 },
      { atom1: 5, atom2: 0, order: 1 },
      { atom1: 2, atom2: 6, order: 1 },
      { atom1: 3, atom2: 7, order: 1 },
      { atom1: 6, atom2: 8, order: 1 },
      { atom1: 7, atom2: 9, order: 1 },
    ],
  },

  // 8. Glycine
  {
    type: "small_molecule",
    id: "glycine",
    name: "Glycine (Amino Acid)",
    formula: "C₂H₅NO₂",
    category: "Bio-Organic",
    molarMass: 75.07,
    geometry: "Trigonal at Carbonyl, Tetrahedral at Alpha-C",
    hybridization: "sp² / sp³",
    bondAngle: "120° / 109.5°",
    examTakeaway: "WAEC Biochemistry: Simplest amino acid; the only standard proteinogenic amino acid lacking a chiral centre (achiral because R-group is a single hydrogen).",
    description: "Building block of proteins; exists as an internal dipolar zwitterion (+H3N-CH2-COO-) at physiological pH.",
    atoms: [
      { element: "C", x: 0, y: 0, z: 0, radius: 26, color: CPK_COLORS.C },
      { element: "N", x: -65, y: -30, z: 0, radius: 25, color: CPK_COLORS.N },
      { element: "C", x: 50, y: 50, z: 0, radius: 26, color: CPK_COLORS.C },
      { element: "O", x: 40, y: 110, z: 0, radius: 24, color: CPK_COLORS.O },
      { element: "O", x: 115, y: 20, z: 0, radius: 24, color: CPK_COLORS.O },
      { element: "H", x: -95, y: 0, z: 30, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: -80, y: -75, z: 0, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: 0, y: -45, z: -40, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: 0, y: -45, z: 40, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: 145, y: 60, z: 0, radius: 14, color: CPK_COLORS.H },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 0, atom2: 2, order: 1 },
      { atom1: 2, atom2: 3, order: 2 },
      { atom1: 2, atom2: 4, order: 1 },
      { atom1: 1, atom2: 5, order: 1 },
      { atom1: 1, atom2: 6, order: 1 },
      { atom1: 0, atom2: 7, order: 1 },
      { atom1: 0, atom2: 8, order: 1 },
      { atom1: 4, atom2: 9, order: 1 },
    ],
  },

  // 9. B-DNA Double Helix (Macromolecule)
  {
    type: "macromolecule",
    id: "dna-double-helix",
    name: "B-DNA Double Helix",
    formula: "Deoxyribonucleic Acid",
    category: "Nucleic Acid",
    pdbId: "1BNA",
    molarMassDesc: "~7.2 kDa (Dodecamer crystal)",
    structuralClass: "Right-handed antiparallel double helix",
    keyResidueFocus: "Adenine-Thymine (2 H-bonds) & Guanine-Cytosine (3 H-bonds)",
    examTakeaway: "JAMB Genetics Classic: Antiparallel 5'-to-3' strands linked by purine-pyrimidine complementary hydrogen bonding. G-C pairs have 3 hydrogen bonds; A-T pairs have 2.",
    description: "The universal molecular repository of genetic instructions. Features distinct major and minor grooves crucial for transcription factor recognition.",
  },

  // 10. Normal Hemoglobin A (Macromolecule)
  {
    type: "macromolecule",
    id: "hemoglobin-normal",
    name: "Hemoglobin A (Normal Adult HbA)",
    formula: "α₂β₂ Tetramer",
    category: "Protein / Enzyme",
    pdbId: "1A3N",
    molarMassDesc: "~64.5 kDa",
    structuralClass: "Allosteric Globular Tetramer (4 Heme Groups)",
    keyResidueFocus: "Chain B Residue 6: Glutamic Acid (Glu-6)",
    examTakeaway: "UTME Gas Transport: Normal adult hemoglobin (HbA) contains polar, negatively charged Glutamic Acid at position 6 of the β-globin chain, keeping the tetramer completely soluble.",
    description: "Quaternary red blood cell transport protein with positive cooperativity (Hill coefficient ~2.8) in oxygen binding.",
    highlightDetails: {
      label: "Normal Codon 6 (Glutamic Acid)",
      description: "Hydrophilic negative charge on the outer aqueous surface of HbA ensures high solubility in blood capillaries.",
      chain: "B",
      residueNumber: 6,
    },
  },

  // 11. Sickle Hemoglobin S (Macromolecule)
  {
    type: "macromolecule",
    id: "hemoglobin-sickle",
    name: "Hemoglobin S (Sickle Cell HbS)",
    formula: "α₂β₂ Mutant (Glu6Val)",
    category: "Genetics & Pathology",
    pdbId: "2HBS",
    molarMassDesc: "~64.5 kDa",
    structuralClass: "Polymerising Sickle Fibers (Deoxy-HbS)",
    keyResidueFocus: "Chain B Residue 6: Valine (Val-6)",
    examTakeaway: "JAMB High-Yield Question: A point mutation (GAG to GTG; rs334) replaces hydrophilic Glutamic acid with non-polar Valine at position 6 of the β-chain. Under low pO₂, the sticky Valine patch polymerises into rigid sickle fibres.",
    description: "Causes cell distortion, microvascular occlusion, haemolytic anaemia, and confers balanced heterozygote protection against Plasmodium falciparum malaria.",
    highlightDetails: {
      label: "Sickle Mutation Site (Valine-6)",
      description: "Hydrophobic valine residue binds into a complementary pocket on adjacent deoxygenated HbS molecules, causing pathological polymerisation.",
      chain: "B",
      residueNumber: 6,
    },
  },

  // 12. Lysozyme (Enzyme)
  {
    type: "macromolecule",
    id: "lysozyme",
    name: "Lysozyme (Antibacterial Enzyme)",
    formula: "129 Amino Acids",
    category: "Protein / Enzyme",
    pdbId: "1LYZ",
    molarMassDesc: "~14.3 kDa",
    structuralClass: "Single-domain Globular Hydrolase (4 Disulfide Bridges)",
    keyResidueFocus: "Active Site Cleft: Glu35 & Asp52",
    examTakeaway: "WAEC Enzyme Specificity: Demonstrates the 'lock-and-key' active site hypothesis. Hydrolyses the beta-(1,4)-glycosidic bonds in bacterial peptidoglycan cell walls (NAM-NAG).",
    description: "Found in tears, saliva, and egg white. One of the earliest solved crystal structures proving the enzymatic cleft mechanism.",
    highlightDetails: {
      label: "Catalytic Active Site (Glu35 / Asp52)",
      description: "Carboxylic acid side chains coordinate the hydrolysis of bacterial cell wall polysaccharide chains.",
      chain: "A",
      residueNumber: 35,
    },
  },
];

// =============================================================================
// COMPONENT IMPLEMENTATION
// =============================================================================

export default function Molecular3DViewer() {
  const [selectedMolecule, setSelectedMolecule] = useState<CuratedMolecule>(CURATED_MOLECULES[0]);
  const [activeTab, setActiveTab] = useState<"visualizer" | "syllabus_takeaway">("visualizer");
  const [renderMode, setRenderMode] = useState<"ball_and_stick" | "space_filling">("ball_and_stick");
  const [isRotating, setIsRotating] = useState(true);
  const [zoom, setZoom] = useState(1.1);

  // Canvas refs for small molecules
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const anglesRef = useRef({ yaw: 0.4, pitch: 0.3 });
  const isDraggingRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Android Touch gesture refs
  const touchStartRef = useRef<{ x: number; y: number; dist: number }>({ x: 0, y: 0, dist: 0 });

  // Macromolecule WebGL state
  const molstarContainerRef = useRef<HTMLDivElement>(null);
  const [molstarLoading, setMolstarLoading] = useState(false);
  const [molstarError, setMolstarError] = useState("");
  const [activeResidueHighlight, setActiveResidueHighlight] = useState(false);

  // ---------------------------------------------------------------------------
  // DESKTOP MOUSE HANDLERS
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // NIGERIAN ANDROID TOUCH HANDLERS (Rotate + 2-Finger Pinch Zoom)
  // ---------------------------------------------------------------------------
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        dist: 0,
      };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current.dist = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
      anglesRef.current.yaw += deltaX * 0.015;
      anglesRef.current.pitch += deltaY * 0.015;
      touchStartRef.current.x = e.touches[0].clientX;
      touchStartRef.current.y = e.touches[0].clientY;
    } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const pinchDelta = (newDist - touchStartRef.current.dist) * 0.005;
      setZoom((z) => Math.min(2.5, Math.max(0.5, z + pinchDelta)));
      touchStartRef.current.dist = newDist;
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchStartRef.current.dist = 0;
  };

  // ---------------------------------------------------------------------------
  // CANVAS RENDER LOOP (FOR SMALL MOLECULES)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (selectedMolecule.type !== "small_molecule") return;

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

      ctx.clearRect(0, 0, width, height);

      // Dark radial gradient
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, width / 2);
      bgGrad.addColorStop(0, "#0B1536");
      bgGrad.addColorStop(1, "#070D1E");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const projectedAtoms = selectedMolecule.atoms.map((atom) => {
        const x1 = atom.x * cosY + atom.z * sinY;
        const z1 = -atom.x * sinY + atom.z * cosY;
        const y2 = atom.y * cosP - z1 * sinP;
        const z2 = atom.y * sinP + z1 * cosP;

        const fov = 400;
        const scale = (fov / (fov + z2)) * zoom;
        const projX = centerX + x1 * scale;
        const projY = centerY - y2 * scale;

        return {
          ...atom,
          projX,
          projY,
          depth: z2,
          renderRadius: atom.radius * (renderMode === "space_filling" ? 1.7 : 1) * scale,
        };
      });

      // Draw Bonds
      if (renderMode === "ball_and_stick") {
        selectedMolecule.bonds.forEach((bond) => {
          const a1 = projectedAtoms[bond.atom1];
          const a2 = projectedAtoms[bond.atom2];
          if (!a1 || !a2) return;

          ctx.strokeStyle = "#475569";
          ctx.lineWidth = bond.order === 2 ? 6 * zoom : 4 * zoom;
          ctx.beginPath();
          ctx.moveTo(a1.projX, a1.projY);
          ctx.lineTo(a2.projX, a2.projY);
          ctx.stroke();

          if (bond.order === 2) {
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 2 * zoom;
            ctx.beginPath();
            ctx.moveTo(a1.projX, a1.projY);
            ctx.lineTo(a2.projX, a2.projY);
            ctx.stroke();
          }
        });
      }

      // Draw Atoms sorted by depth
      const sortedAtoms = [...projectedAtoms].sort((a, b) => b.depth - a.depth);
      sortedAtoms.forEach((atom) => {
        const rad = Math.max(4, atom.renderRadius);
        const grad = ctx.createRadialGradient(
          atom.projX - rad * 0.3,
          atom.projY - rad * 0.3,
          rad * 0.1,
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

  // ---------------------------------------------------------------------------
  // PDBe Mol* DYNAMIC LOADER FOR MACROMOLECULES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (selectedMolecule.type !== "macromolecule") return;

    let isMounted = true;
    setMolstarLoading(true);
    setMolstarError("");

    // Dynamically inject Mol* CSS & Script if not already loaded in document
    const loadMolstar = async () => {
      try {
        if (!document.getElementById("pdbe-molstar-css")) {
          const link = document.createElement("link");
          link.id = "pdbe-molstar-css";
          link.rel = "stylesheet";
          link.type = "text/css";
          link.href = "https://cdn.jsdelivr.net/npm/pdbe-molstar@3.12.0/build/pdbe-molstar.css";
          document.head.appendChild(link);
        }

        if (!document.getElementById("pdbe-molstar-js")) {
          const script = document.createElement("script");
          script.id = "pdbe-molstar-js";
          script.src = "https://cdn.jsdelivr.net/npm/pdbe-molstar@3.12.0/build/pdbe-molstar-plugin.js";
          script.async = true;
          document.head.appendChild(script);
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error("Failed to load PDBe Mol* 3D engine. Check internet connection."));
          });
        } else {
          // If already inserted, wait for window.PDBeMolstarPlugin
          let attempts = 0;
          while (!(window as any).PDBeMolstarPlugin && attempts < 40) {
            await new Promise((r) => setTimeout(r, 100));
            attempts++;
          }
        }

        if (!isMounted) return;

        const container = molstarContainerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const PDBeMolstarPlugin = (window as any).PDBeMolstarPlugin;
        if (!PDBeMolstarPlugin) {
          throw new Error("WebGL viewer unavailable on this device.");
        }

        const viewerInstance = new PDBeMolstarPlugin();
        const options = {
          moleculeId: selectedMolecule.pdbId.toLowerCase(),
          superposition: false,
          hideControls: true,
          loadMaps: false,
          bgColor: { r: 11, g: 21, b: 54 },
          lighting: "plastic",
          visualStyle: "cartoon",
        };

        viewerInstance.render(container, options);
        if (isMounted) setMolstarLoading(false);
      } catch (err: any) {
        if (isMounted) {
          setMolstarError(err?.message || "3D macromolecular rendering failed. Using 2D curriculum diagram.");
          setMolstarLoading(false);
        }
      }
    };

    loadMolstar();

    return () => {
      isMounted = false;
      if (molstarContainerRef.current) {
        molstarContainerRef.current.innerHTML = "";
      }
    };
  }, [selectedMolecule]);

  return (
    <div className="space-y-6">
      {/* 3D Visualizer Workspace */}
      <div className="relative rounded-3xl border border-white/10 bg-[#070D1E] overflow-hidden shadow-2xl">
        {selectedMolecule.type === "small_molecule" ? (
          <canvas
            ref={canvasRef}
            width={760}
            height={420}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-full h-[420px] cursor-grab active:cursor-grabbing block touch-none"
          />
        ) : (
          <div className="relative w-full h-[420px] flex items-center justify-center bg-[#0B1536]">
            {molstarLoading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#070D1E]/90 gap-3">
                <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-300">
                  Streaming 3D Crystal Coordinates ({selectedMolecule.pdbId})…
                </span>
              </div>
            )}

            {molstarError ? (
              <div className="p-6 text-center max-w-md space-y-3 z-20">
                <div className="text-amber-400 font-bold text-sm">⚠️ WebGL High-Res View Unavailable</div>
                <p className="text-xs text-slate-300">{molstarError}</p>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-left text-xs">
                  <div className="font-bold text-cyan-300">{selectedMolecule.name} ({selectedMolecule.pdbId})</div>
                  <div className="text-slate-400 mt-1">{selectedMolecule.structuralClass}</div>
                  <div className="text-emerald-400 mt-1 font-mono text-[11px]">{selectedMolecule.keyResidueFocus}</div>
                </div>
              </div>
            ) : (
              <div
                ref={molstarContainerRef}
                className="w-full h-full relative"
                style={{ minHeight: "420px" }}
              />
            )}
          </div>
        )}

        {/* Floating Molecule Badge */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
          <span className="rounded-xl bg-[#0B1536]/90 border border-white/10 px-3 py-1.5 text-xs font-black text-cyan-300 backdrop-blur-md shadow">
            {selectedMolecule.formula} · {selectedMolecule.name}
          </span>
          <span className="rounded-xl bg-[#0B1536]/90 border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 backdrop-blur-md">
            {selectedMolecule.type === "small_molecule"
              ? `${selectedMolecule.geometry} (${selectedMolecule.bondAngle})`
              : `${selectedMolecule.structuralClass}`}
          </span>
        </div>

        {/* Interactive Controls Overlay */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-[#0B1536]/90 border border-white/10 p-1.5 rounded-2xl backdrop-blur-md">
          {selectedMolecule.type === "small_molecule" ? (
            <>
              <button
                type="button"
                onClick={() => setIsRotating(!isRotating)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isRotating ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
                }`}
              >
                {isRotating ? "⏸ Pause" : "▶ Spin"}
              </button>
              <button
                type="button"
                onClick={() => setRenderMode(renderMode === "ball_and_stick" ? "space_filling" : "ball_and_stick")}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition"
              >
                {renderMode === "ball_and_stick" ? "Space-Fill" : "Ball & Stick"}
              </button>
              <div className="flex items-center gap-1 pl-1 border-l border-white/10">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
                  className="h-7 w-7 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center font-bold text-xs"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                  className="h-7 w-7 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center font-bold text-xs"
                  title="Zoom Out"
                >
                  -
                </button>
              </div>
            </>
          ) : (
            selectedMolecule.highlightDetails && (
              <button
                type="button"
                onClick={() => setActiveResidueHighlight(!activeResidueHighlight)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeResidueHighlight
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                {activeResidueHighlight ? "🎯 Reset Camera" : `🔍 Focus ${selectedMolecule.highlightDetails.label}`}
              </button>
            )
          )}
        </div>

        <div className="absolute bottom-4 left-4 z-20 text-[10px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/10 backdrop-blur-xs">
          📱 Drag to rotate · Pinch or (+/-) to zoom · Touch-ready for Android
        </div>
      </div>

      {/* Tabs: Navigation Between Presets & Syllabus Takeaways */}
      <div className="flex border-b border-white/10 gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("visualizer")}
          className={`pb-2 transition border-b-2 ${
            activeTab === "visualizer"
              ? "border-cyan-400 text-cyan-300 font-black"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Curated 12-Model Exam Bank
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("syllabus_takeaway")}
          className={`pb-2 transition border-b-2 ${
            activeTab === "syllabus_takeaway"
              ? "border-cyan-400 text-cyan-300 font-black"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          WAEC / JAMB High-Yield Notes
        </button>
      </div>

      {/* Category Filter & Model Selection Grid */}
      <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-5 shadow space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Select Syllabus Molecule / Macromolecule
          </h4>
          <span className="text-[11px] font-mono text-cyan-400 font-bold">
            {CURATED_MOLECULES.length} Curated Models
          </span>
        </div>

        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          {CURATED_MOLECULES.map((m) => {
            const isSelected = m.id === selectedMolecule.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedMolecule(m);
                  setActiveResidueHighlight(false);
                }}
                className={`rounded-xl p-3 text-left transition border ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-950/50 shadow-md ring-1 ring-cyan-400/50"
                    : "border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-extrabold text-xs text-white truncate">{m.formula}</span>
                  <span className="text-[9px] px-1 rounded bg-white/10 text-slate-300 uppercase">
                    {m.type === "small_molecule" ? "3D" : "PDB"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">{m.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Structural Telemetry & Educational Parameters */}
      {selectedMolecule.type === "small_molecule" ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-4">
            <span className="text-[10px] font-black uppercase text-slate-400">VSEPR Geometry</span>
            <div className="mt-1 text-sm font-extrabold text-cyan-300">{selectedMolecule.geometry}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-4">
            <span className="text-[10px] font-black uppercase text-slate-400">Hybridization</span>
            <div className="mt-1 text-sm font-extrabold text-indigo-300">{selectedMolecule.hybridization}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-4">
            <span className="text-[10px] font-black uppercase text-slate-400">Bond Angle</span>
            <div className="mt-1 text-sm font-extrabold text-emerald-300">{selectedMolecule.bondAngle}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-4">
            <span className="text-[10px] font-black uppercase text-slate-400">Molar Mass</span>
            <div className="mt-1 text-sm font-extrabold text-white">{selectedMolecule.molarMass} g/mol</div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-4">
            <span className="text-[10px] font-black uppercase text-slate-400">Macromolecular Class</span>
            <div className="mt-1 text-sm font-extrabold text-cyan-300">{selectedMolecule.structuralClass}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-4">
            <span className="text-[10px] font-black uppercase text-slate-400">Crystal ID & Mass</span>
            <div className="mt-1 text-sm font-extrabold text-indigo-300">
              {selectedMolecule.pdbId} · {selectedMolecule.molarMassDesc}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0B1536] p-4">
            <span className="text-[10px] font-black uppercase text-slate-400">Key Syllabus Focus</span>
            <div className="mt-1 text-xs font-bold text-emerald-300 leading-snug">{selectedMolecule.keyResidueFocus}</div>
          </div>
        </div>
      )}

      {/* Official Exam Takeaway Alert Box */}
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-xs text-cyan-200 space-y-1">
        <div className="flex items-center gap-2 font-bold text-cyan-300">
          <span>🎯</span>
          <span>JAMB / WAEC Syllabus Takeaway</span>
        </div>
        <p className="leading-relaxed">{selectedMolecule.examTakeaway}</p>
        <p className="text-[11px] text-slate-400 pt-1 border-t border-white/5">{selectedMolecule.description}</p>
      </div>
    </div>
  );
}
