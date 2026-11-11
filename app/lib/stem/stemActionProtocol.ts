import type { CuratedMolecule } from "@/app/components/stem/Molecular3DViewer";

// =============================================================================
// STEM VIEWER ACTION PROTOCOL
// =============================================================================

export type StemViewerAction =
  | { type: "FOCUS_RESIDUE"; chain: string; residue: number; zoomLevel?: number; label?: string }
  | { type: "HIGHLIGHT_MUTATION"; chain: string; residue: number; colorHex?: string; label?: string }
  | { type: "SET_REPRESENTATION"; representation: "cartoon" | "ball-and-stick" | "spacefill" }
  | { type: "TOGGLE_SPIN"; enabled?: boolean }
  | { type: "RESET_VIEW" };

export interface ParsedStemAction {
  id: string;
  action: StemViewerAction;
  displayText: string;
  icon: string;
}

export interface StemQuickPrompt {
  id: string;
  label: string;
  prompt: string;
  presetAction?: StemViewerAction;
}

// Regex to detect explicit [ACTION:TYPE key="val" ...] tags in AI stream
const ACTION_TAG_REGEX = /\[ACTION:([A-Z_]+)([^\]]*)\]/gi;

/**
 * Parses key="value" or key=value attribute pairs from an action tag string.
 */
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /([a-zA-Z_]+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(attrString)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[key] = value;
  }
  return attrs;
}

/**
 * Parses AI Tutor response text, extracting structured StemViewerAction items
 * and returning both the cleaned markdown text and the interactive action pills.
 */
export function parseStemViewerActions(text: string): {
  cleanText: string;
  actions: ParsedStemAction[];
} {
  const actions: ParsedStemAction[] = [];
  let actionCounter = 0;

  // 1. Extract explicit action tags
  const cleanText = text.replace(ACTION_TAG_REGEX, (match, rawType, rawAttrs) => {
    actionCounter++;
    const actionType = rawType.toUpperCase().trim();
    const attrs = parseAttributes(rawAttrs);
    const actionId = `act-${actionCounter}-${Date.now()}`;

    switch (actionType) {
      case "FOCUS_RESIDUE": {
        const chain = attrs.chain || "A";
        const residue = parseInt(attrs.residue || "1", 10);
        const label = attrs.label || `Residue ${chain}:${residue}`;
        actions.push({
          id: actionId,
          action: { type: "FOCUS_RESIDUE", chain, residue, label },
          displayText: `🔍 Focus ${label}`,
          icon: "🎯",
        });
        break;
      }

      case "HIGHLIGHT_MUTATION": {
        const chain = attrs.chain || "B";
        const residue = parseInt(attrs.residue || "6", 10);
        const label = attrs.label || `Mutation ${chain}:${residue}`;
        const colorHex = attrs.color || "#F43F5E";
        actions.push({
          id: actionId,
          action: { type: "HIGHLIGHT_MUTATION", chain, residue, colorHex, label },
          displayText: `🎯 Highlight ${label}`,
          icon: "⚡",
        });
        break;
      }

      case "SET_REPRESENTATION": {
        const rep = (attrs.style || attrs.representation || "cartoon").toLowerCase();
        const validRep = rep === "ball-and-stick" || rep === "spacefill" ? rep : "cartoon";
        const display = validRep === "spacefill" ? "Van der Waals Spheres" : validRep === "ball-and-stick" ? "Ball & Stick" : "Ribbon Cartoon";
        actions.push({
          id: actionId,
          action: { type: "SET_REPRESENTATION", representation: validRep },
          displayText: `Switch to ${display}`,
          icon: "🔬",
        });
        break;
      }

      case "TOGGLE_SPIN": {
        const enabled = attrs.enabled ? attrs.enabled.toLowerCase() === "true" : undefined;
        actions.push({
          id: actionId,
          action: { type: "TOGGLE_SPIN", enabled },
          displayText: enabled === false ? "Pause 3D Rotation" : "Spin 3D Model",
          icon: "🔄",
        });
        break;
      }

      case "RESET_VIEW": {
        actions.push({
          id: actionId,
          action: { type: "RESET_VIEW" },
          displayText: "Reset 3D Camera",
          icon: "🧭",
        });
        break;
      }
    }

    // Strip the raw tag from the learner's displayed reading text
    return "";
  }).trim();

  // 2. Intelligent inference: If text discusses codon 6 or Glu35/Asp52 without explicit tags, suggest action
  if (actions.length === 0) {
    if (/(val6|val-6|codon 6|position 6|sickle mutation)/i.test(text)) {
      actions.push({
        id: `inferred-hbs-val6`,
        action: { type: "HIGHLIGHT_MUTATION", chain: "B", residue: 6, label: "Val6 Sickle Mutation" },
        displayText: "Focus Sickle Mutation (Val6)",
        icon: "🎯",
      });
    } else if (/(glu35|asp52|catalytic site|active site cleft)/i.test(text)) {
      actions.push({
        id: `inferred-lyz-active-site`,
        action: { type: "FOCUS_RESIDUE", chain: "A", residue: 35, label: "Catalytic Glu35" },
        displayText: "Focus Catalytic Active Site (Glu35)",
        icon: "🔬",
      });
    }
  }

  return { cleanText, actions };
}

/**
 * Returns tailored high-yield syllabus quick prompts for any curated molecule.
 */
export function getCuratedQuickPrompts(molecule: CuratedMolecule): StemQuickPrompt[] {
  if (molecule.type === "small_molecule") {
    switch (molecule.id) {
      case "h2o":
        return [
          {
            id: "h2o-angle",
            label: "Why is bond angle 104.5°?",
            prompt: "Explain why water has a bent shape with a 104.5° bond angle instead of a 109.5° tetrahedral angle according to VSEPR theory.",
          },
          {
            id: "h2o-dipole",
            label: "Explain polar dipole moment",
            prompt: "Why is water a polar solvent with a permanent dipole moment, whereas carbon dioxide is non-polar?",
          },
        ];

      case "co2":
        return [
          {
            id: "co2-linear",
            label: "Why is CO₂ non-polar?",
            prompt: "Explain why CO₂ has polar C=O bonds yet has zero net dipole moment according to VSEPR geometry.",
          },
        ];

      case "c6h6":
        return [
          {
            id: "c6h6-resonance",
            label: "Explain aromatic delocalisation",
            prompt: "Why is benzene resistant to addition reactions, and how does its planar 120° ring prove resonance stability?",
          },
        ];

      case "glycine":
        return [
          {
            id: "gly-achiral",
            label: "Why is glycine achiral?",
            prompt: "Why is glycine the only achiral amino acid, and what is its zwitterion structure at physiological pH?",
          },
        ];

      default:
        return [
          {
            id: "small-mol-vsepr",
            label: `Explain ${molecule.name} geometry`,
            prompt: `Explain the VSEPR geometry, hybridization (${molecule.hybridization}), and bond angle (${molecule.bondAngle}) of ${molecule.name}.`,
          },
        ];
    }
  }

  // Macromolecules
  switch (molecule.id) {
    case "hemoglobin-sickle":
      return [
        {
          id: "hbs-sickle-mechanism",
          label: "How does Val6 cause sickling?",
          prompt: "Explain how the single point mutation GAG to GTG replacing Glutamate with Valine at position 6 of the beta globin chain causes sickling under deoxygenation.",
          presetAction: { type: "HIGHLIGHT_MUTATION", chain: "B", residue: 6, label: "Val6 Sickle Mutation" },
        },
        {
          id: "hbs-focus-val6",
          label: "Focus Val6 in 3D",
          prompt: "Focus on codon 6 of the beta chain in 3D and explain why a non-polar side chain creates a sticky hydrophobic patch.",
          presetAction: { type: "FOCUS_RESIDUE", chain: "B", residue: 6, label: "Codon 6 Beta Chain" },
        },
        {
          id: "hbs-spacefill",
          label: "View van der Waals packing",
          prompt: "Switch to spheres view and explain how Val6 inserts into the hydrophobic pocket of Phe85 and Leu88 of an adjacent tetramer.",
          presetAction: { type: "SET_REPRESENTATION", representation: "spacefill" },
        },
      ];

    case "hemoglobin-normal":
      return [
        {
          id: "hba-glu6",
          label: "Inspect wildtype Glu6",
          prompt: "Show Glu6 on Chain B of normal hemoglobin and explain why its negative charge keeps normal hemoglobin soluble in blood.",
          presetAction: { type: "FOCUS_RESIDUE", chain: "B", residue: 6, label: "Glu6 Hydrophilic Side Chain" },
        },
        {
          id: "hba-allostery",
          label: "Explain allosteric O₂ binding",
          prompt: "Explain the sigmoidal oxygen saturation curve of HbA and the physiological significance of the Bohr effect.",
        },
      ];

    case "lysozyme":
      return [
        {
          id: "lyz-active-site",
          label: "Focus catalytic cleft (Glu35 / Asp52)",
          prompt: "Focus on the catalytic active site cleft of lysozyme. How do Glu35 and Asp52 work together to hydrolyse the bacterial cell wall?",
          presetAction: { type: "FOCUS_RESIDUE", chain: "A", residue: 35, label: "Catalytic Glu35" },
        },
        {
          id: "lyz-disulfide",
          label: "Role of 4 disulfide bonds",
          prompt: "Explain the role of lysozyme's 4 disulfide bridges in stabilizing its tertiary globular structure against enzymatic degradation.",
        },
      ];

    case "dna-double-helix":
      return [
        {
          id: "dna-base-pairing",
          label: "Watson-Crick base pairing",
          prompt: "Explain how hydrogen bonding between Adenine-Thymine (2 H-bonds) and Guanine-Cytosine (3 H-bonds) stabilizes the B-DNA double helix.",
        },
        {
          id: "dna-ecori",
          label: "EcoRI restriction site",
          prompt: "Point out the palindromic GAATTC sequence on this B-DNA dodecamer and explain how restriction endonucleases make sticky cuts.",
          presetAction: { type: "FOCUS_RESIDUE", chain: "A", residue: 6, label: "EcoRI Locus" },
        },
      ];

    default:
      return [
        {
          id: "macro-overview",
          label: `Analyze ${molecule.name}`,
          prompt: `Give a detailed WAEC and JAMB examination breakdown of the structure, biological function, and key residues of ${molecule.name}.`,
        },
      ];
  }
}
