import type { CuratedMolecule, SmallMoleculeData, MacromoleculeData } from "./Molecular3DViewer";

/**
 * Generates an educational, high-contrast SVG diagram representation
 * of any of the 12 Curated Secondary School & JAMB molecules.
 * Returns a data URL string suitable for SmartWhiteboard image elements.
 */
export function generateMoleculeSvgDataUrl(molecule: CuratedMolecule): string {
  const width = 800;
  const height = 500;

  let bodySvg = "";

  if (molecule.type === "small_molecule") {
    bodySvg = renderSmallMoleculeSvg(molecule);
  } else {
    bodySvg = renderMacromoleculeSvg(molecule);
  }

  const fullSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#070D1E"/>
      <stop offset="100%" stop-color="#0B1536"/>
    </linearGradient>
    <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0F1F4D"/>
      <stop offset="100%" stop-color="#0B1536"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" rx="20" fill="url(#bgGrad)" stroke="#1E293B" stroke-width="2"/>

  <!-- Content Layer -->
  ${bodySvg}

  <!-- BrainLab STEM Studio Stamp -->
  <text x="760" y="30" text-anchor="end" font-family="system-ui, sans-serif" font-size="10" font-weight="900" fill="#38BDF8" letter-spacing="1">BRAINLAB STEM STUDIO · 3D MOLECULAR LAB</text>
</svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
}

function renderSmallMoleculeSvg(m: SmallMoleculeData): string {
  // Center projection area: x in [40, 480], y in [70, 380]
  const centerX = 260;
  const centerY = 230;
  const scale = 1.6;

  // Render Bonds
  const bondsSvg = m.bonds
    .map((bond) => {
      const a1 = m.atoms[bond.atom1];
      const a2 = m.atoms[bond.atom2];
      if (!a1 || !a2) return "";

      const x1 = centerX + a1.x * scale;
      const y1 = centerY - a1.y * scale;
      const x2 = centerX + a2.x * scale;
      const y2 = centerY - a2.y * scale;

      if (bond.order === 2) {
        // Draw double bond lines
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const ox = (-dy / len) * 4;
        const oy = (dx / len) * 4;

        return `
        <line x1="${x1 + ox}" y1="${y1 + oy}" x2="${x2 + ox}" y2="${y2 + oy}" stroke="#94A3B8" stroke-width="4" stroke-linecap="round"/>
        <line x1="${x1 - ox}" y1="${y1 - oy}" x2="${x2 - ox}" y2="${y2 - oy}" stroke="#94A3B8" stroke-width="4" stroke-linecap="round"/>
      `;
      }

      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748B" stroke-width="5" stroke-linecap="round"/>`;
    })
    .join("");

  // Render Atoms
  const atomsSvg = m.atoms
    .map((atom) => {
      const ax = centerX + atom.x * scale;
      const ay = centerY - atom.y * scale;
      const r = Math.max(14, atom.radius * 0.9);
      const textColor = atom.element === "H" ? "#0F172A" : "#FFFFFF";

      return `
      <g>
        <circle cx="${ax}" cy="${ay}" r="${r}" fill="${atom.color}" stroke="#FFFFFF" stroke-width="1.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.4))"/>
        <text x="${ax}" y="${ay + 4}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(r * 0.75)}" font-weight="900" fill="${textColor}">
          ${atom.element}
        </text>
      </g>`;
    })
    .join("");

  return `
  <!-- Title Badge -->
  <g transform="translate(40, 30)">
    <rect width="180" height="32" rx="8" fill="#0F1F4D" stroke="#38BDF8" stroke-width="1.2"/>
    <text x="14" y="21" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#38BDF8">${escapeXml(m.formula)} · ${escapeXml(m.name)}</text>
  </g>

  <!-- 3D Graph Model -->
  <g id="molecule-canvas">
    ${bondsSvg}
    ${atomsSvg}
  </g>

  <!-- Telemetry Parameters Panel (Right Side) -->
  <g transform="translate(520, 50)">
    <rect width="240" height="300" rx="14" fill="url(#panelGrad)" stroke="#1E293B" stroke-width="1.5"/>
    <text x="18" y="32" font-family="system-ui, sans-serif" font-size="11" font-weight="900" fill="#94A3B8" letter-spacing="1">MOLECULAR PARAMETERS</text>
    
    <!-- Geometry -->
    <text x="18" y="70" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#64748B">VSEPR GEOMETRY</text>
    <text x="18" y="92" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#38BDF8">${escapeXml(m.geometry)}</text>

    <!-- Bond Angle -->
    <text x="18" y="130" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#64748B">BOND ANGLE</text>
    <text x="18" y="152" font-family="system-ui, sans-serif" font-size="15" font-weight="900" fill="#34D399">${escapeXml(m.bondAngle)}</text>

    <!-- Hybridization -->
    <text x="18" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#64748B">HYBRIDIZATION</text>
    <text x="18" y="212" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#818CF8">${escapeXml(m.hybridization)}</text>

    <!-- Molar Mass -->
    <text x="18" y="250" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#64748B">MOLAR MASS</text>
    <text x="18" y="272" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#F1F5F9">${m.molarMass} g/mol</text>
  </g>

  <!-- Bottom Syllabus Takeaway Banner -->
  <g transform="translate(40, 370)">
    <rect width="720" height="100" rx="12" fill="#0C254A" stroke="#38BDF8" stroke-width="1.2" opacity="0.95"/>
    <text x="20" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="900" fill="#38BDF8">🎯 JAMB / WAEC SYLLABUS HIGH-YIELD TAKEAWAY</text>
    <text x="20" y="52" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#E2E8F0">${escapeXml(wrapText(m.examTakeaway, 92)[0] || "")}</text>
    <text x="20" y="72" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#E2E8F0">${escapeXml(wrapText(m.examTakeaway, 92)[1] || "")}</text>
    <text x="20" y="90" font-family="system-ui, sans-serif" font-size="10" font-weight="500" fill="#94A3B8">${escapeXml(m.description)}</text>
  </g>
`;
}

function renderMacromoleculeSvg(m: MacromoleculeData): string {
  const isSickle = m.id === "hemoglobin-sickle";
  const isDna = m.id === "dna-double-helix";
  const isLysozyme = m.id === "lysozyme";

  return `
  <!-- Title Badge -->
  <g transform="translate(40, 30)">
    <rect width="320" height="34" rx="8" fill="#0F1F4D" stroke="#38BDF8" stroke-width="1.2"/>
    <text x="14" y="22" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="#38BDF8">🧬 ${escapeXml(m.name)}</text>
  </g>

  <!-- Graphic Schematic Area (Left) -->
  <g transform="translate(40, 80)">
    <rect width="450" height="270" rx="14" fill="#0B1536" stroke="#1E293B" stroke-width="1.5"/>

    ${
      isSickle
        ? `
      <!-- Sickle Hemoglobin Mutation Focus -->
      <g transform="translate(40, 40)">
        <!-- Normal Chain -->
        <rect x="0" y="0" width="160" height="70" rx="10" fill="#0284C7" opacity="0.3" stroke="#38BDF8" stroke-width="1.5"/>
        <text x="14" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="900" fill="#38BDF8">Normal HbA (Codon 6)</text>
        <text x="14" y="46" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="#34D399">Glutamic Acid (Glu)</text>
        <text x="14" y="62" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="#94A3B8">Hydrophilic · Soluble</text>

        <!-- Arrow -->
        <path d="M 175 35 L 200 35 M 195 28 L 205 35 L 195 42" stroke="#F43F5E" stroke-width="2.5" fill="none"/>

        <!-- Mutant Sickle Chain -->
        <rect x="220" y="0" width="160" height="70" rx="10" fill="#BE123C" opacity="0.35" stroke="#F43F5E" stroke-width="2" filter="url(#glow)"/>
        <text x="234" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="900" fill="#F43F5E">Sickle HbS (Codon 6)</text>
        <text x="234" y="46" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="#FBBF24">Valine (Val)</text>
        <text x="234" y="62" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="#FDA4AF">Sticky Hydrophobic Patch</text>
      </g>

      <!-- Deoxygenated Polymerisation Diagram -->
      <g transform="translate(40, 140)">
        <text x="0" y="16" font-family="system-ui, sans-serif" font-size="11" font-weight="900" fill="#E2E8F0">Under Low Oxygen (Deoxy-State):</text>
        <text x="0" y="38" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#94A3B8">Val-6 inserts into hydrophobic pocket of adjacent tetramer</text>
        <text x="0" y="56" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#F43F5E">➔ Rigid 14-strand helical fibers deform RBC into sickle shape</text>
        <rect x="0" y="70" width="370" height="24" rx="6" fill="#F43F5E" opacity="0.15"/>
        <text x="10" y="86" font-family="system-ui, sans-serif" font-size="10" font-weight="800" fill="#FDA4AF">Point Mutation: GAG (Glu) ➔ GTG (Val) on chromosome 11</text>
      </g>`
        : isDna
        ? `
      <!-- DNA Double Helix Ladder -->
      <g transform="translate(50, 30)">
        <text x="0" y="20" font-family="system-ui, sans-serif" font-size="13" font-weight="900" fill="#38BDF8">Antiparallel 5'-to-3' Strands</text>
        <line x1="40" y1="50" x2="40" y2="200" stroke="#0284C7" stroke-width="4"/>
        <line x1="280" y1="50" x2="280" y2="200" stroke="#0284C7" stroke-width="4"/>
        
        <!-- Base Pairs -->
        <g transform="translate(40, 70)">
          <line x1="0" y1="0" x2="240" y2="0" stroke="#34D399" stroke-width="3"/>
          <text x="120" y="-8" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="900" fill="#34D399">Adenine = Thymine (2 H-Bonds)</text>
        </g>
        <g transform="translate(40, 120)">
          <line x1="0" y1="0" x2="240" y2="0" stroke="#FBBF24" stroke-width="3"/>
          <text x="120" y="-8" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="900" fill="#FBBF24">Guanine ≡ Cytosine (3 H-Bonds)</text>
        </g>
        <g transform="translate(40, 170)">
          <line x1="0" y1="0" x2="240" y2="0" stroke="#34D399" stroke-width="3"/>
          <text x="120" y="-8" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="900" fill="#34D399">Thymine = Adenine (2 H-Bonds)</text>
        </g>
      </g>`
        : `
      <!-- Generic Enzyme / Protein Active Site Schematic -->
      <g transform="translate(50, 40)">
        <path d="M 40 40 Q 150 140 200 40 T 360 60" fill="none" stroke="#38BDF8" stroke-width="6"/>
        <circle cx="170" cy="85" r="24" fill="#34D399" opacity="0.3" stroke="#34D399" stroke-width="2"/>
        <text x="170" y="90" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="900" fill="#34D399">ACTIVE SITE</text>
        <text x="40" y="160" font-family="system-ui, sans-serif" font-size="12" font-weight="900" fill="#E2E8F0">Lock-and-Key Cleft Substrate Binding</text>
        <text x="40" y="184" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#94A3B8">${escapeXml(m.keyResidueFocus)}</text>
      </g>`
    }
  </g>

  <!-- Right Details Panel -->
  <g transform="translate(510, 50)">
    <rect width="250" height="300" rx="14" fill="url(#panelGrad)" stroke="#1E293B" stroke-width="1.5"/>
    <text x="18" y="32" font-family="system-ui, sans-serif" font-size="11" font-weight="900" fill="#94A3B8" letter-spacing="1">MACROMOLECULE DATA</text>
    
    <text x="18" y="70" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#64748B">RCSB PDB ID</text>
    <text x="18" y="92" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#38BDF8">${escapeXml(m.pdbId)}</text>

    <text x="18" y="130" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#64748B">STRUCTURAL CLASS</text>
    <text x="18" y="152" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#F1F5F9">${escapeXml(m.structuralClass)}</text>

    <text x="18" y="195" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#64748B">MOLECULAR WEIGHT</text>
    <text x="18" y="215" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="#34D399">${escapeXml(m.molarMassDesc)}</text>

    <text x="18" y="255" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#64748B">EXAM TARGET TOPIC</text>
    <text x="18" y="275" font-family="system-ui, sans-serif" font-size="12" font-weight="900" fill="#818CF8">${escapeXml(m.category)}</text>
  </g>

  <!-- Bottom Syllabus Takeaway Banner -->
  <g transform="translate(40, 370)">
    <rect width="720" height="100" rx="12" fill="#0C254A" stroke="#38BDF8" stroke-width="1.2" opacity="0.95"/>
    <text x="20" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="900" fill="#38BDF8">🎯 JAMB UTME / WAEC HIGH-YIELD BIOCHEMICAL TAKEAWAY</text>
    <text x="20" y="52" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#E2E8F0">${escapeXml(wrapText(m.examTakeaway, 90)[0] || "")}</text>
    <text x="20" y="72" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#E2E8F0">${escapeXml(wrapText(m.examTakeaway, 90)[1] || "")}</text>
    <text x="20" y="90" font-family="system-ui, sans-serif" font-size="10" font-weight="500" fill="#94A3B8">${escapeXml(m.description)}</text>
  </g>
`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxLen) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
