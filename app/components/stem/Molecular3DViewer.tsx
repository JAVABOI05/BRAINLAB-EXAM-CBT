"use client";

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { useLearnerTheme } from "@/app/components/LearnerThemeProvider";
import { generateMoleculeSvgDataUrl } from "./molecularSvgExport";
import StemAiCopilot from "./StemAiCopilot";
import { trackEvent } from "@/app/lib/analytics";

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
  customUrl?: string;
  fallbackUrl?: string;
  format?: "bcif" | "cif" | "pdb";
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

export type StemViewerAction =
  | { type: "FOCUS_RESIDUE"; chain: string; residue: number; zoomLevel?: number }
  | { type: "HIGHLIGHT_MUTATION"; chain: string; residue: number; colorHex?: string; label?: string }
  | { type: "SET_REPRESENTATION"; representation: "cartoon" | "ball-and-stick" | "spacefill" }
  | { type: "TOGGLE_SPIN"; enabled?: boolean }
  | { type: "RESET_VIEW" };

export interface MolecularViewerHandle {
  executeAction: (action: StemViewerAction) => void;
  selectMoleculeById: (id: string) => void;
}

export interface Molecular3DViewerProps {
  initialMoleculeId?: string;
  themeOverride?: "light" | "dark";
  onActionComplete?: (action: StemViewerAction) => void;
  className?: string;
}

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
  // 2. Carbon Dioxide
  {
    type: "small_molecule",
    id: "co2",
    name: "Carbon Dioxide",
    formula: "CO₂",
    category: "Inorganic",
    molarMass: 44.01,
    geometry: "Linear",
    hybridization: "sp",
    bondAngle: "180°",
    examTakeaway: "WAEC Favorite: Although each C=O bond is strongly polar due to electronegativity differences, the linear symmetry causes the two dipole vectors to cancel out exactly (net dipole = 0 D).",
    description: "Non-polar greenhouse gas; product of complete aerobic respiration and combustion.",
    atoms: [
      { element: "C", x: 0, y: 0, z: 0, radius: 24, color: CPK_COLORS.C },
      { element: "O", x: -90, y: 0, z: 0, radius: 22, color: CPK_COLORS.O },
      { element: "O", x: 90, y: 0, z: 0, radius: 22, color: CPK_COLORS.O },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 2 },
      { atom1: 0, atom2: 2, order: 2 },
    ],
  },
  // 3. Methane
  {
    type: "small_molecule",
    id: "ch4",
    name: "Methane",
    formula: "CH₄",
    category: "Hydrocarbon",
    molarMass: 16.04,
    geometry: "Regular Tetrahedral",
    hybridization: "sp³",
    bondAngle: "109.5°",
    examTakeaway: "JAMB Core: Simplest alkane member of the paraffin homologous series. Perfect tetrahedral geometry minimizes mutual repulsion between four bonding electron pairs according to VSEPR theory.",
    description: "Primary component of natural gas (marsh gas / firedamp) with purely non-polar covalent bonds.",
    atoms: [
      { element: "C", x: 0, y: 0, z: 0, radius: 25, color: CPK_COLORS.C },
      { element: "H", x: 0, y: 75, z: 0, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: -70, y: -25, z: 35, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: 70, y: -25, z: 35, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: 0, y: -25, z: -75, radius: 14, color: CPK_COLORS.H },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 0, atom2: 2, order: 1 },
      { atom1: 0, atom2: 3, order: 1 },
      { atom1: 0, atom2: 4, order: 1 },
    ],
  },
  // 4. Ammonia
  {
    type: "small_molecule",
    id: "nh3",
    name: "Ammonia",
    formula: "NH₃",
    category: "Inorganic",
    molarMass: 17.031,
    geometry: "Trigonal Pyramidal",
    hybridization: "sp³",
    bondAngle: "107°",
    examTakeaway: "WAEC Principle: One non-bonding lone pair repels bonding pairs more strongly than bond-bond interactions, reducing bond angle from 109.5° to 107°. Acts as a Lewis base by donating this lone pair.",
    description: "Highly alkaline and water-soluble gas produced industrially via the Haber-Bosch process.",
    atoms: [
      { element: "N", x: 0, y: 25, z: 0, radius: 24, color: CPK_COLORS.N },
      { element: "H", x: -60, y: -25, z: 35, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: 60, y: -25, z: 35, radius: 14, color: CPK_COLORS.H },
      { element: "H", x: 0, y: -25, z: -65, radius: 14, color: CPK_COLORS.H },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 0, atom2: 2, order: 1 },
      { atom1: 0, atom2: 3, order: 1 },
    ],
  },
  // 5. Ethanol
  {
    type: "small_molecule",
    id: "c2h5oh",
    name: "Ethanol",
    formula: "C₂H₅OH",
    category: "Bio-Organic",
    molarMass: 46.07,
    geometry: "Tetrahedral around C, Bent around O",
    hybridization: "sp³",
    bondAngle: "109.5° (C-C-H) / 104.5° (C-O-H)",
    examTakeaway: "JAMB Distinctions: High boiling point (78.3°C) compared to dimethyl ether (-24°C, same molar mass) due to extensive intermolecular hydrogen bonding via its terminal hydroxyl (-OH) group.",
    description: "Alkanol produced by yeast fermentation of carbohydrates; clean bio-fuel and laboratory solvent.",
    atoms: [
      { element: "C", x: -65, y: -10, z: 0, radius: 22, color: CPK_COLORS.C },
      { element: "C", x: 0, y: 15, z: 0, radius: 22, color: CPK_COLORS.C },
      { element: "O", x: 65, y: -15, z: 0, radius: 20, color: CPK_COLORS.O },
      { element: "H", x: 105, y: 15, z: 0, radius: 13, color: CPK_COLORS.H },
      { element: "H", x: -65, y: -65, z: 0, radius: 13, color: CPK_COLORS.H },
      { element: "H", x: -105, y: 15, z: 25, radius: 13, color: CPK_COLORS.H },
      { element: "H", x: -105, y: 15, z: -25, radius: 13, color: CPK_COLORS.H },
      { element: "H", x: 0, y: 70, z: 25, radius: 13, color: CPK_COLORS.H },
      { element: "H", x: 0, y: 70, z: -25, radius: 13, color: CPK_COLORS.H },
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
    molarMass: 78.11,
    geometry: "Planar Hexagonal Ring",
    hybridization: "sp²",
    bondAngle: "120°",
    examTakeaway: "WAEC Resonance: Kekulé structure fails to explain unusual stability. Delocalised pi-electron cloud across all 6 carbon atoms resists addition reactions, preferentially undergoing electrophilic substitution.",
    description: "Prototypical aromatic hydrocarbon; uniform C-C bond lengths of 1.39 Å intermediate between single and double bonds.",
    atoms: [
      { element: "C", x: 0, y: 65, z: 0, radius: 20, color: CPK_COLORS.C },
      { element: "C", x: 56, y: 32, z: 0, radius: 20, color: CPK_COLORS.C },
      { element: "C", x: 56, y: -32, z: 0, radius: 20, color: CPK_COLORS.C },
      { element: "C", x: 0, y: -65, z: 0, radius: 20, color: CPK_COLORS.C },
      { element: "C", x: -56, y: -32, z: 0, radius: 20, color: CPK_COLORS.C },
      { element: "C", x: -56, y: 32, z: 0, radius: 20, color: CPK_COLORS.C },
      { element: "H", x: 0, y: 105, z: 0, radius: 12, color: CPK_COLORS.H },
      { element: "H", x: 92, y: 52, z: 0, radius: 12, color: CPK_COLORS.H },
      { element: "H", x: 92, y: -52, z: 0, radius: 12, color: CPK_COLORS.H },
      { element: "H", x: 0, y: -105, z: 0, radius: 12, color: CPK_COLORS.H },
      { element: "H", x: -92, y: -52, z: 0, radius: 12, color: CPK_COLORS.H },
      { element: "H", x: -92, y: 52, z: 0, radius: 12, color: CPK_COLORS.H },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 2 },
      { atom1: 1, atom2: 2, order: 1 },
      { atom1: 2, atom2: 3, order: 2 },
      { atom1: 3, atom2: 4, order: 1 },
      { atom1: 4, atom2: 5, order: 2 },
      { atom1: 5, atom2: 0, order: 1 },
      { atom1: 0, atom2: 6, order: 1 },
      { atom1: 1, atom2: 7, order: 1 },
      { atom1: 2, atom2: 8, order: 1 },
      { atom1: 3, atom2: 9, order: 1 },
      { atom1: 4, atom2: 10, order: 1 },
      { atom1: 5, atom2: 11, order: 1 },
    ],
  },
  // 7. D-Glucose
  {
    type: "small_molecule",
    id: "c6h12o6",
    name: "D-Glucose (Pyranose)",
    formula: "C₆H₁₂O₆",
    category: "Bio-Organic",
    molarMass: 180.16,
    geometry: "Chair Conformation (Ring)",
    hybridization: "sp³",
    bondAngle: "109.5°",
    examTakeaway: "JAMB Biology & Chemistry: Hexose reducing sugar; reduces Fehling's solution (brick red precipitate of Cu₂O) and Tollens' reagent (silver mirror) due to mutarotation forming open-chain aldehyde.",
    description: "Primary metabolic fuel for human glycolysis and cellular respiration. Displays equatorial hydroxyl orientations.",
    atoms: [
      { element: "C", x: -45, y: -25, z: 0, radius: 18, color: CPK_COLORS.C },
      { element: "C", x: 0, y: -45, z: 15, radius: 18, color: CPK_COLORS.C },
      { element: "C", x: 45, y: -20, z: 0, radius: 18, color: CPK_COLORS.C },
      { element: "C", x: 45, y: 35, z: -15, radius: 18, color: CPK_COLORS.C },
      { element: "C", x: 0, y: 55, z: 0, radius: 18, color: CPK_COLORS.C },
      { element: "O", x: -40, y: 30, z: 15, radius: 17, color: CPK_COLORS.O },
      { element: "O", x: -75, y: -35, z: 20, radius: 16, color: CPK_COLORS.O },
      { element: "O", x: 0, y: -80, z: -15, radius: 16, color: CPK_COLORS.O },
      { element: "O", x: 75, y: -35, z: 20, radius: 16, color: CPK_COLORS.O },
      { element: "O", x: 80, y: 45, z: -20, radius: 16, color: CPK_COLORS.O },
      { element: "C", x: -10, y: 95, z: 25, radius: 17, color: CPK_COLORS.C },
      { element: "O", x: -20, y: 135, z: -10, radius: 16, color: CPK_COLORS.O },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 1, atom2: 2, order: 1 },
      { atom1: 2, atom2: 3, order: 1 },
      { atom1: 3, atom2: 4, order: 1 },
      { atom1: 4, atom2: 5, order: 1 },
      { atom1: 5, atom2: 0, order: 1 },
      { atom1: 0, atom2: 6, order: 1 },
      { atom1: 1, atom2: 7, order: 1 },
      { atom1: 2, atom2: 8, order: 1 },
      { atom1: 3, atom2: 9, order: 1 },
      { atom1: 4, atom2: 10, order: 1 },
      { atom1: 10, atom2: 11, order: 1 },
    ],
  },
  // 8. Glycine
  {
    type: "small_molecule",
    id: "glycine",
    name: "Glycine (Zwitterion)",
    formula: "NH₂CH₂COOH",
    category: "Bio-Organic",
    molarMass: 75.07,
    geometry: "Tetrahedral around C-alpha",
    hybridization: "sp³ (C-alpha) / sp² (Carbonyl)",
    bondAngle: "109.5° / 120°",
    examTakeaway: "WAEC Amino Acid Feature: The ONLY achiral proteinogenic amino acid because its side chain (R-group) is a single hydrogen atom. It does not rotate plane-polarized light.",
    description: "Simplest amino acid; acts as an inhibitory neurotransmitter in the central nervous system and building block for collagen.",
    atoms: [
      { element: "C", x: 0, y: 0, z: 0, radius: 21, color: CPK_COLORS.C },
      { element: "N", x: -65, y: 35, z: 0, radius: 20, color: CPK_COLORS.N },
      { element: "C", x: 65, y: -25, z: 0, radius: 21, color: CPK_COLORS.C },
      { element: "O", x: 65, y: -80, z: 0, radius: 19, color: CPK_COLORS.O },
      { element: "O", x: 120, y: 25, z: 0, radius: 19, color: CPK_COLORS.O },
      { element: "H", x: 0, y: -50, z: 35, radius: 13, color: CPK_COLORS.H },
      { element: "H", x: 0, y: -50, z: -35, radius: 13, color: CPK_COLORS.H },
      { element: "H", x: -105, y: 15, z: 25, radius: 13, color: CPK_COLORS.H },
      { element: "H", x: -80, y: 80, z: -15, radius: 13, color: CPK_COLORS.H },
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 0, atom2: 2, order: 1 },
      { atom1: 2, atom2: 3, order: 2 },
      { atom1: 2, atom2: 4, order: 1 },
      { atom1: 0, atom2: 5, order: 1 },
      { atom1: 0, atom2: 6, order: 1 },
      { atom1: 1, atom2: 7, order: 1 },
      { atom1: 1, atom2: 8, order: 1 },
    ],
  },
  // 9. B-DNA Double Helix (PDB 1BNA)
  {
    type: "macromolecule",
    id: "dna-double-helix",
    name: "B-DNA Dodecamer (Watson-Crick)",
    formula: "CGCGAATTCGCG",
    category: "Nucleic Acid",
    pdbId: "1BNA",
    customUrl: "/structures/1bna.bcif",
    fallbackUrl: "https://models.rcsb.org/1bna.bcif",
    format: "bcif",
    molarMassDesc: "~7.5 kDa duplex",
    structuralClass: "Right-handed Double Helix (B-Form)",
    keyResidueFocus: "Watson-Crick Base Pairing (A-T & G-C)",
    examTakeaway: "JAMB Genetics Classic: Antiparallel 5'-to-3' strands linked by phosphodiester bridges. Adenine pairs with Thymine via 2 hydrogen bonds; Guanine pairs with Cytosine via 3 hydrogen bonds.",
    description: "The Drew-Dickerson dodecamer crystal structure (1981) that definitively solved the atomic coordinate geometry of hydrated B-DNA.",
    highlightDetails: {
      label: "EcoRI Cleavage Locus (GAATTC)",
      description: "Palindromic recognition sequence targeted by restriction endonucleases during genetic recombination.",
      chain: "A",
      residueNumber: 6,
    },
  },
  // 10. Human Hemoglobin A (PDB 1A3N)
  {
    type: "macromolecule",
    id: "hemoglobin-normal",
    name: "Normal Adult Hemoglobin (HbA)",
    formula: "α₂β₂ Tetramer",
    category: "Protein / Enzyme",
    pdbId: "1A3N",
    customUrl: "/structures/1a3n.bcif",
    fallbackUrl: "https://models.rcsb.org/1a3n.bcif",
    format: "bcif",
    molarMassDesc: "~64.5 kDa",
    structuralClass: "Allosteric Quaternary Globular Protein (4 Heme Groups)",
    keyResidueFocus: "Beta-Chain Glutamic Acid at Codon 6 (Glu6)",
    examTakeaway: "WAEC Physiology Core: Allosteric oxygen transport protein. Cooperative binding of O₂ creates a sigmoidal saturation curve; exhibits the Bohr effect under high CO₂ / low pH.",
    description: "Soluble oxygen carrier containing two alpha (141 aa) and two beta (146 aa) subunits with protoporphyrin IX prosthetic groups.",
    highlightDetails: {
      label: "Wildtype Beta-6 Glutamate (Glu6)",
      description: "Charged hydrophilic side chain exposed to solvent, preventing protein aggregation in physiological solution.",
      chain: "B",
      residueNumber: 6,
    },
  },
  // 11. Sickle Cell Hemoglobin S (PDB 2HBS)
  {
    type: "macromolecule",
    id: "hemoglobin-sickle",
    name: "Sickle Cell Hemoglobin (HbS Mutant)",
    formula: "α₂βˢ₂ Mutant Tetramer",
    category: "Genetics & Pathology",
    pdbId: "2HBS",
    customUrl: "/structures/2hbs.bcif",
    fallbackUrl: "https://models.rcsb.org/2hbs.bcif",
    format: "bcif",
    molarMassDesc: "~64.5 kDa",
    structuralClass: "Pathological Polymerising Fibrous Aggregates",
    keyResidueFocus: "Beta-Chain Valine at Codon 6 (Val6 Point Mutation)",
    examTakeaway: "JAMB Genotype Question: A single point mutation (transversion GAG ➔ GTG) replaces hydrophilic Glutamic acid with non-polar hydrophobic Valine at position 6 of the beta globin chain.",
    description: "In deoxy state, Val6 inserts into the hydrophobic pocket formed by Phe85 and Leu88 of an adjacent tetramer, producing rigid 14-strand helical polymers that sickle RBCs.",
    highlightDetails: {
      label: "Mutant Sickle Valine (Val6)",
      description: "Sticky hydrophobic contact that seeds hemoglobin crystallization under deoxygenation.",
      chain: "B",
      residueNumber: 6,
    },
  },
  // 12. Hen Egg-White Lysozyme (PDB 1LYZ)
  {
    type: "macromolecule",
    id: "lysozyme",
    name: "Lysozyme (Bacteriolytic Hydrolase)",
    formula: "129 Amino Acid Monomer",
    category: "Protein / Enzyme",
    pdbId: "1LYZ",
    customUrl: "/structures/1lyz.bcif",
    fallbackUrl: "https://models.rcsb.org/1lyz.bcif",
    format: "bcif",
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

const Molecular3DViewer = forwardRef<MolecularViewerHandle, Molecular3DViewerProps>(
  function Molecular3DViewer(
    { initialMoleculeId, themeOverride, onActionComplete, className = "" },
    ref
  ) {
    // Theme resolution
    const learnerTheme = (function () {
      try {
        return useLearnerTheme();
      } catch {
        return null;
      }
    })();

    const [isDark, setIsDark] = useState<boolean>(true);

    useEffect(() => {
      if (themeOverride) {
        setIsDark(themeOverride === "dark");
        return;
      }
      if (learnerTheme?.resolvedTheme) {
        setIsDark(learnerTheme.resolvedTheme === "dark");
        return;
      }
      const checkDocTheme = () => {
        if (typeof document === "undefined") return;
        const attr = document.documentElement.getAttribute("data-theme");
        const hasDarkClass = document.documentElement.classList.contains("dark");
        setIsDark(attr === "dark" || hasDarkClass);
      };
      checkDocTheme();

      const observer = new MutationObserver(checkDocTheme);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
      return () => observer.disconnect();
    }, [themeOverride, learnerTheme?.resolvedTheme]);

    // Molecule selection
    const defaultMolecule = initialMoleculeId
      ? CURATED_MOLECULES.find((m) => m.id === initialMoleculeId) || CURATED_MOLECULES[0]
      : CURATED_MOLECULES[0];

    const [selectedMolecule, setSelectedMolecule] = useState<CuratedMolecule>(defaultMolecule);
    const [activeTab, setActiveTab] = useState<"visualizer" | "syllabus_takeaway">("visualizer");
    const [viewMode, setViewMode] = useState<"3d_webgl" | "2d_schematic">("3d_webgl");
    const [renderMode, setRenderMode] = useState<"ball_and_stick" | "space_filling">("ball_and_stick");
    const [macroStyle, setMacroStyle] = useState<"cartoon" | "ball-and-stick" | "spacefill">("cartoon");
    const [isRotating, setIsRotating] = useState(true);
    const [zoom, setZoom] = useState(1.1);
    const [showCopilot, setShowCopilot] = useState(false);

    // Canvas refs for small molecules
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const anglesRef = useRef({ yaw: 0.4, pitch: 0.3 });
    const isDraggingRef = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const touchStartRef = useRef<{ x: number; y: number; dist: number }>({ x: 0, y: 0, dist: 0 });

    // Macromolecule WebGL state
    const molstarContainerRef = useRef<HTMLDivElement>(null);
    const viewerInstanceRef = useRef<any>(null);
    const [molstarLoading, setMolstarLoading] = useState(false);
    const [molstarError, setMolstarError] = useState("");
    const [webglContextLost, setWebglContextLost] = useState(false);
    const [activeResidueHighlight, setActiveResidueHighlight] = useState(false);

    // -------------------------------------------------------------------------
    // ACTION DISPATCHER (FOR AI TUTOR / PARENT LESSON CONTROLLER)
    // -------------------------------------------------------------------------
    const executeAction = useCallback(
      (action: StemViewerAction) => {
        if (!action) return;

        switch (action.type) {
          case "FOCUS_RESIDUE":
            trackEvent("stem_3d_action_triggered", { action_type: "FOCUS_RESIDUE", molecule_id: selectedMolecule.id });
            if (viewerInstanceRef.current?.visual?.select) {
              viewerInstanceRef.current.visual.select({
                data: [
                  {
                    struct_asym_id: action.chain,
                    start_residue_number: action.residue,
                    end_residue_number: action.residue,
                    color: { r: 56, g: 189, b: 248 }, // sky-400
                    focus: true,
                  },
                ],
              });
              setActiveResidueHighlight(true);
            }
            break;

          case "HIGHLIGHT_MUTATION":
            trackEvent("stem_3d_action_triggered", { action_type: "HIGHLIGHT_MUTATION", molecule_id: selectedMolecule.id });
            if (viewerInstanceRef.current?.visual?.select) {
              viewerInstanceRef.current.visual.select({
                data: [
                  {
                    struct_asym_id: action.chain,
                    start_residue_number: action.residue,
                    end_residue_number: action.residue,
                    color: { r: 244, g: 63, b: 94 }, // rose-500
                    focus: true,
                  },
                ],
              });
              setActiveResidueHighlight(true);
            }
            break;

          case "SET_REPRESENTATION":
            setMacroStyle(action.representation);
            if (viewerInstanceRef.current?.visual?.update) {
              viewerInstanceRef.current.visual.update({ visualStyle: action.representation }, true);
            }
            break;

          case "TOGGLE_SPIN":
            setIsRotating(typeof action.enabled === "boolean" ? action.enabled : !isRotating);
            break;

          case "RESET_VIEW":
            setActiveResidueHighlight(false);
            if (viewerInstanceRef.current?.visual?.clearSelection) {
              viewerInstanceRef.current.visual.clearSelection();
            }
            if (viewerInstanceRef.current?.visual?.reset) {
              viewerInstanceRef.current.visual.reset({ camera: true, theme: true });
            }
            break;
        }

        onActionComplete?.(action);
      },
      [isRotating, onActionComplete]
    );

    useImperativeHandle(
      ref,
      () => ({
        executeAction,
        selectMoleculeById: (id: string) => {
          const found = CURATED_MOLECULES.find((m) => m.id === id);
          if (found) {
            setSelectedMolecule(found);
            setActiveResidueHighlight(false);
          }
        },
      }),
      [executeAction]
    );

    // -------------------------------------------------------------------------
    // DESKTOP MOUSE HANDLERS (SMALL MOLECULES)
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // TOUCH HANDLERS (NIGERIAN ANDROID - ROTATE + PINCH ZOOM)
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // CANVAS RENDER LOOP (SMALL MOLECULES) - WITH THEME AWARENESS
    // -------------------------------------------------------------------------
    useEffect(() => {
      if (selectedMolecule.type !== "small_molecule" || viewMode === "2d_schematic") return;

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

        // Theme-responsive background gradient
        const bgGrad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, width / 2);
        if (isDark) {
          bgGrad.addColorStop(0, "#0B1536");
          bgGrad.addColorStop(1, "#070D1E");
        } else {
          bgGrad.addColorStop(0, "#FFFFFF");
          bgGrad.addColorStop(1, "#F1F5F9");
        }
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

            ctx.strokeStyle = isDark ? "#475569" : "#94A3B8";
            ctx.lineWidth = bond.order === 2 ? 6 * zoom : 4 * zoom;
            ctx.beginPath();
            ctx.moveTo(a1.projX, a1.projY);
            ctx.lineTo(a2.projX, a2.projY);
            ctx.stroke();

            if (bond.order === 2) {
              ctx.strokeStyle = isDark ? "#94A3B8" : "#CBD5E1";
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
          grad.addColorStop(1, isDark ? "#050505" : "#1E293B");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(atom.projX, atom.projY, rad, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = atom.element === "H" ? "#0F172A" : "#FFFFFF";
          ctx.font = `bold ${Math.max(9, Math.round(rad * 0.7))}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(atom.element, atom.projX, atom.projY);
        });

        animId = requestAnimationFrame(render);
      };

      animId = requestAnimationFrame(render);
      return () => cancelAnimationFrame(animId);
    }, [selectedMolecule, renderMode, isRotating, zoom, isDark, viewMode]);

    // -------------------------------------------------------------------------
    // PDBe Mol* LOADER (MACROMOLECULES) - BINARYCIF + THEME + RECOVERY
    // -------------------------------------------------------------------------
    const initMolstar = useCallback(async () => {
      if (selectedMolecule.type !== "macromolecule" || viewMode === "2d_schematic") return;

      setMolstarLoading(true);
      setMolstarError("");
      setWebglContextLost(false);

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
            script.onerror = () =>
              reject(new Error("Unable to download Mol* WebGL engine. Check network or switch to 2D view."));
          });
        } else {
          let attempts = 0;
          while (!(window as any).PDBeMolstarPlugin && attempts < 40) {
            await new Promise((r) => setTimeout(r, 100));
            attempts++;
          }
        }

        const container = molstarContainerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const PDBeMolstarPlugin = (window as any).PDBeMolstarPlugin;
        if (!PDBeMolstarPlugin) {
          throw new Error("WebGL viewer unavailable on this device.");
        }

        const viewerInstance = new PDBeMolstarPlugin();
        viewerInstanceRef.current = viewerInstance;

        const targetBgColor = isDark ? { r: 11, g: 21, b: 54 } : { r: 248, g: 250, b: 252 };

        const options: any = {
          superposition: false,
          hideControls: true,
          loadMaps: false,
          bgColor: targetBgColor,
          lighting: "plastic",
          visualStyle: macroStyle,
        };

        // BinaryCIF optimization: load .bcif directly from RCSB if available
        if (selectedMolecule.customUrl) {
          options.customData = {
            url: selectedMolecule.customUrl,
            format: selectedMolecule.format || "bcif",
            isBinary: selectedMolecule.format === "bcif" || selectedMolecule.customUrl.endsWith(".bcif"),
          };
        } else {
          options.moleculeId = selectedMolecule.pdbId.toLowerCase();
        }

        viewerInstance.render(container, options);

        // WebGL context loss listener on container canvas
        const canvasEl = container.querySelector("canvas");
        if (canvasEl) {
          canvasEl.addEventListener("webglcontextlost", (e: Event) => {
            e.preventDefault();
            setWebglContextLost(true);
          });
          canvasEl.addEventListener("webglcontextrestored", () => {
            setWebglContextLost(false);
            initMolstar();
          });
        }

        setMolstarLoading(false);
      } catch (err: any) {
        setMolstarError(err?.message || "3D macromolecular rendering failed. Using 2D curriculum diagram.");
        setMolstarLoading(false);
      }
    }, [selectedMolecule, isDark, macroStyle, viewMode]);

    useEffect(() => {
      initMolstar();

      return () => {
        if (viewerInstanceRef.current) {
          try {
            viewerInstanceRef.current.visual?.clearSelection?.();
          } catch {}
          viewerInstanceRef.current = null;
        }
        if (molstarContainerRef.current) {
          molstarContainerRef.current.innerHTML = "";
        }
      };
    }, [initMolstar]);

    // Handle dynamic theme changes without re-rendering the whole structure
    useEffect(() => {
      if (viewerInstanceRef.current?.canvas?.setBgColor) {
        const bg = isDark ? { r: 11, g: 21, b: 54 } : { r: 248, g: 250, b: 252 };
        try {
          viewerInstanceRef.current.canvas.setBgColor(bg);
        } catch {}
      }
    }, [isDark]);

    // -------------------------------------------------------------------------
    // TOGGLE RESIDUE FOCUS / MUTATION HIGHLIGHT
    // -------------------------------------------------------------------------
    const handleToggleResidueHighlight = () => {
      if (selectedMolecule.type !== "macromolecule" || !selectedMolecule.highlightDetails) return;

      const nextState = !activeResidueHighlight;
      setActiveResidueHighlight(nextState);

      if (nextState) {
        executeAction({
          type: "HIGHLIGHT_MUTATION",
          chain: selectedMolecule.highlightDetails.chain,
          residue: selectedMolecule.highlightDetails.residueNumber,
          label: selectedMolecule.highlightDetails.label,
        });
      } else {
        executeAction({ type: "RESET_VIEW" });
      }
    };

    // -------------------------------------------------------------------------
    // CHANGE MACROMOLECULE REPRESENTATION
    // -------------------------------------------------------------------------
    const handleMacroStyleChange = (style: "cartoon" | "ball-and-stick" | "spacefill") => {
      setMacroStyle(style);
      trackEvent("stem_representation_changed", { representation: style, molecule_id: selectedMolecule.id });
      executeAction({ type: "SET_REPRESENTATION", representation: style });
    };

    return (
      <div className={`space-y-6 ${className}`}>
        {/* Workspace Container: Split View if Copilot is Open */}
        <div className={`grid gap-6 ${showCopilot ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"}`}>
          <div className={showCopilot ? "lg:col-span-7 xl:col-span-8" : "w-full"}>
            {/* 3D Visualizer Workspace */}
            <div
              className={`relative rounded-3xl border overflow-hidden shadow-2xl transition-colors duration-300 ${
                isDark
                  ? "border-white/10 bg-[#070D1E]"
                  : "border-slate-200 bg-slate-50 shadow-slate-200/50"
              }`}
            >
          {viewMode === "2d_schematic" ? (
            /* 2D High-Yield Diagram Mode */
            <div className="relative w-full h-[420px] flex items-center justify-center p-4">
              <img
                src={generateMoleculeSvgDataUrl(selectedMolecule)}
                alt={`${selectedMolecule.name} Curriculum Schematic`}
                className="max-h-full max-w-full object-contain rounded-2xl shadow-lg"
              />
            </div>
          ) : selectedMolecule.type === "small_molecule" ? (
            /* Small Molecule 3D Canvas */
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
            /* Macromolecule Mol* WebGL Container */
            <div
              className={`relative w-full h-[420px] flex items-center justify-center transition-colors duration-300 ${
                isDark ? "bg-[#0B1536]" : "bg-slate-50"
              }`}
            >
              {molstarLoading && (
                <div
                  className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 backdrop-blur-xs ${
                    isDark ? "bg-[#070D1E]/90 text-slate-300" : "bg-white/90 text-slate-700"
                  }`}
                >
                  <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold">
                    Streaming 3D Crystal Coordinates ({selectedMolecule.pdbId})…
                  </span>
                </div>
              )}

              {webglContextLost && (
                <div className="p-6 text-center max-w-md space-y-3 z-30">
                  <div className="text-amber-500 font-black text-sm">⚠️ WebGL GPU Context Lost</div>
                  <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    Your browser temporarily released 3D memory. Tap below to reload or view 2D vector mode.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => initMolstar()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-white hover:bg-cyan-600 shadow"
                    >
                      🔄 Restore 3D View
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("2d_schematic")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 text-slate-200 hover:bg-slate-600"
                    >
                      📊 View 2D Diagram
                    </button>
                  </div>
                </div>
              )}

              {molstarError ? (
                <div className="p-6 text-center max-w-md space-y-3 z-20">
                  <div className="text-amber-400 font-bold text-sm">⚠️ WebGL High-Res View Unavailable</div>
                  <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>{molstarError}</p>
                  <button
                    type="button"
                    onClick={() => setViewMode("2d_schematic")}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-cyan-600 text-white hover:bg-cyan-500 transition shadow"
                  >
                    Switch to High-Yield 2D Diagram
                  </button>
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

          {/* Floating Molecule Identification Badge */}
          <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-xl px-3 py-1.5 text-xs font-black backdrop-blur-md shadow border ${
                isDark
                  ? "bg-[#0B1536]/90 border-white/10 text-cyan-300"
                  : "bg-white/95 border-slate-200 text-cyan-700 shadow-sm"
              }`}
            >
              {selectedMolecule.formula} · {selectedMolecule.name}
            </span>
            <span
              className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold backdrop-blur-md border ${
                isDark
                  ? "bg-[#0B1536]/90 border-white/10 text-slate-300"
                  : "bg-white/95 border-slate-200 text-slate-600 shadow-sm"
              }`}
            >
              {selectedMolecule.type === "small_molecule"
                ? `${selectedMolecule.geometry} (${selectedMolecule.bondAngle})`
                : `${selectedMolecule.structuralClass}`}
            </span>
          </div>

          {/* Mode & Engine Controls Overlay */}
          <div
            className={`absolute bottom-4 right-4 z-20 flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl backdrop-blur-md border shadow-lg ${
              isDark
                ? "bg-[#0B1536]/90 border-white/10 text-slate-300"
                : "bg-white/95 border-slate-200 text-slate-700 shadow-sm"
            }`}
          >
            {/* 3D vs 2D Diagram Toggle */}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "3d_webgl" ? "2d_schematic" : "3d_webgl")}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === "2d_schematic"
                  ? "bg-cyan-500 text-white shadow"
                  : isDark
                  ? "bg-white/10 hover:bg-white/20 text-slate-200"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
              title="Toggle between 3D interactive model and 2D vector schematic"
            >
              {viewMode === "2d_schematic" ? "🧊 3D View" : "📐 2D Diagram"}
            </button>

            {/* AI Copilot Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowCopilot(!showCopilot)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                showCopilot
                  ? "bg-indigo-500 text-white shadow"
                  : isDark
                  ? "bg-indigo-950/50 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-900/50"
                  : "bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
              }`}
              title="Open or close AI Copilot Lab Assistant"
            >
              <span>🤖</span>
              <span>{showCopilot ? "Hide Copilot" : "AI Copilot"}</span>
            </button>

            {viewMode === "3d_webgl" && (
              <>
                {selectedMolecule.type === "small_molecule" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsRotating(!isRotating)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        isRotating
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : isDark
                          ? "text-slate-400 hover:text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {isRotating ? "⏸ Pause" : "▶ Spin"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRenderMode(renderMode === "ball_and_stick" ? "space_filling" : "ball_and_stick")
                      }
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                        isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`}
                    >
                      {renderMode === "ball_and_stick" ? "Space-Fill" : "Ball & Stick"}
                    </button>
                    <div className="flex items-center gap-1 pl-1 border-l border-white/10">
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
                        className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                        }`}
                        title="Zoom In"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                        className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                        }`}
                        title="Zoom Out"
                      >
                        -
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Macromolecule Style Picker */}
                    <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleMacroStyleChange("cartoon")}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                          macroStyle === "cartoon"
                            ? "bg-cyan-500 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Ribbon
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMacroStyleChange("ball-and-stick")}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                          macroStyle === "ball-and-stick"
                            ? "bg-cyan-500 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Stick
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMacroStyleChange("spacefill")}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                          macroStyle === "spacefill"
                            ? "bg-cyan-500 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Spheres
                      </button>
                    </div>

                    {/* Active Site / Mutation Focus */}
                    {selectedMolecule.highlightDetails && (
                      <button
                        type="button"
                        onClick={handleToggleResidueHighlight}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          activeResidueHighlight
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : isDark
                            ? "bg-white/10 text-slate-200 hover:bg-white/20"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {activeResidueHighlight
                          ? "🎯 Reset Camera"
                          : `🔍 Focus ${selectedMolecule.highlightDetails.label}`}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <div
            className={`absolute bottom-4 left-4 z-20 text-[10px] px-2.5 py-1 rounded-lg border backdrop-blur-xs ${
              isDark
                ? "text-slate-400 bg-slate-900/80 border-white/10"
                : "text-slate-600 bg-white/90 border-slate-200 shadow-sm"
            }`}
          >
            📱 Drag to rotate · Pinch or (+/-) to zoom · Touch-ready for Nigerian Android
          </div>
        </div>
      </div>

      {/* Stem AI Copilot Drawer */}
      {showCopilot && (
        <div className="lg:col-span-5 xl:col-span-4 h-[480px] lg:h-[420px]">
          <StemAiCopilot
            selectedMolecule={selectedMolecule}
            isDark={isDark}
            onExecuteAction={executeAction}
            onClose={() => setShowCopilot(false)}
          />
        </div>
      )}
    </div>

        {/* Navigation Tabs */}
        <div
          className={`flex border-b gap-4 text-xs font-bold ${
            isDark ? "border-white/10" : "border-slate-200"
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab("visualizer")}
            className={`pb-2 transition border-b-2 ${
              activeTab === "visualizer"
                ? "border-cyan-400 text-cyan-400 font-black"
                : isDark
                ? "border-transparent text-slate-400 hover:text-white"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Curated 12-Model Exam Bank
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("syllabus_takeaway")}
            className={`pb-2 transition border-b-2 ${
              activeTab === "syllabus_takeaway"
                ? "border-cyan-400 text-cyan-400 font-black"
                : isDark
                ? "border-transparent text-slate-400 hover:text-white"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            WAEC / JAMB High-Yield Notes
          </button>
        </div>

        {/* Model Selection Grid */}
        <div
          className={`rounded-2xl border p-5 shadow space-y-4 transition-colors duration-300 ${
            isDark ? "border-white/10 bg-[#0B1536]" : "border-slate-200 bg-white shadow-slate-200/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <h4
              className={`text-xs font-black uppercase tracking-wider ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Select Syllabus Molecule / Macromolecule
            </h4>
            <span className="text-[11px] font-mono text-cyan-500 font-bold">
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
                    trackEvent("stem_molecule_viewed", {
                      molecule_id: m.id,
                      type: m.type,
                      formula: m.formula,
                    });
                  }}
                  className={`rounded-xl p-3 text-left transition border ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/40 shadow-md ring-1 ring-cyan-400/50 text-white"
                      : isDark
                      ? "border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono font-extrabold text-xs truncate ${
                        isSelected ? "text-cyan-300" : isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {m.formula}
                    </span>
                    <span
                      className={`text-[9px] px-1 rounded uppercase ${
                        isDark ? "bg-white/10 text-slate-300" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {m.type === "small_molecule" ? "3D" : "PDB"}
                    </span>
                  </div>
                  <div
                    className={`text-[11px] mt-1 truncate ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {m.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Structural Telemetry & Educational Parameters */}
        {selectedMolecule.type === "small_molecule" ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div
              className={`rounded-2xl border p-4 ${
                isDark ? "border-white/10 bg-[#0B1536]" : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <span className="text-[10px] font-black uppercase text-slate-400">VSEPR Geometry</span>
              <div className="mt-1 text-sm font-extrabold text-cyan-400">{selectedMolecule.geometry}</div>
            </div>
            <div
              className={`rounded-2xl border p-4 ${
                isDark ? "border-white/10 bg-[#0B1536]" : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <span className="text-[10px] font-black uppercase text-slate-400">Hybridization</span>
              <div className="mt-1 text-sm font-extrabold text-indigo-400">{selectedMolecule.hybridization}</div>
            </div>
            <div
              className={`rounded-2xl border p-4 ${
                isDark ? "border-white/10 bg-[#0B1536]" : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <span className="text-[10px] font-black uppercase text-slate-400">Bond Angle</span>
              <div className="mt-1 text-sm font-extrabold text-emerald-400">{selectedMolecule.bondAngle}</div>
            </div>
            <div
              className={`rounded-2xl border p-4 ${
                isDark ? "border-white/10 bg-[#0B1536]" : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <span className="text-[10px] font-black uppercase text-slate-400">Molar Mass</span>
              <div
                className={`mt-1 text-sm font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}
              >
                {selectedMolecule.molarMass} g/mol
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div
              className={`rounded-2xl border p-4 ${
                isDark ? "border-white/10 bg-[#0B1536]" : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <span className="text-[10px] font-black uppercase text-slate-400">Macromolecular Class</span>
              <div className="mt-1 text-sm font-extrabold text-cyan-400">{selectedMolecule.structuralClass}</div>
            </div>
            <div
              className={`rounded-2xl border p-4 ${
                isDark ? "border-white/10 bg-[#0B1536]" : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <span className="text-[10px] font-black uppercase text-slate-400">Crystal ID & Mass</span>
              <div className="mt-1 text-sm font-extrabold text-indigo-400">
                {selectedMolecule.pdbId} · {selectedMolecule.molarMassDesc}
              </div>
            </div>
            <div
              className={`rounded-2xl border p-4 ${
                isDark ? "border-white/10 bg-[#0B1536]" : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <span className="text-[10px] font-black uppercase text-slate-400">Key Syllabus Focus</span>
              <div className="mt-1 text-xs font-bold text-emerald-400 leading-snug">
                {selectedMolecule.keyResidueFocus}
              </div>
            </div>
          </div>
        )}

        {/* Official Exam Takeaway Alert Box */}
        <div
          className={`rounded-2xl border p-4 text-xs space-y-1 ${
            isDark
              ? "border-cyan-500/20 bg-cyan-950/20 text-cyan-200"
              : "border-cyan-200 bg-cyan-50/80 text-cyan-900"
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-cyan-400">
            <span>🎯</span>
            <span>JAMB / WAEC Syllabus Takeaway</span>
          </div>
          <p className="leading-relaxed">{selectedMolecule.examTakeaway}</p>
          <p
            className={`text-[11px] pt-1 border-t ${
              isDark ? "text-slate-400 border-white/5" : "text-slate-500 border-cyan-100"
            }`}
          >
            {selectedMolecule.description}
          </p>
        </div>
      </div>
    );
  }
);

export default Molecular3DViewer;
