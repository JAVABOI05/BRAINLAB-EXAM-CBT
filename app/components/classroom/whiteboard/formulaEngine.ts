/**
 * BrainLab Professional Liveboard - Mathematical Formula & KaTeX Engine
 * Stage 4: STEM Equations, LaTeX Render Cache, and Science Formula Presets
 */

import type { WhiteboardElement } from "@/app/components/SmartWhiteboard";
import katex from "katex";

export interface MathFormulaPreset {
  id: string;
  name: string;
  category: "math" | "physics" | "chemistry";
  latex: string;
  description: string;
}

/**
 * Safely renders a LaTeX equation string to KaTeX HTML markup.
 */
export function renderLatexToHtml(latex: string, displayMode = true): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
    });
  } catch {
    return latex;
  }
}

export const STEM_FORMULA_PRESETS: MathFormulaPreset[] = [
  // Mathematics
  {
    id: "quadratic",
    name: "Quadratic Formula",
    category: "math",
    latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    description: "Roots of general quadratic equation ax² + bx + c = 0",
  },
  {
    id: "pythagoras",
    name: "Pythagorean Theorem",
    category: "math",
    latex: "a^2 + b^2 = c^2",
    description: "Relationship between sides of a right triangle",
  },
  {
    id: "euler-identity",
    name: "Euler's Identity",
    category: "math",
    latex: "e^{i\\pi} + 1 = 0",
    description: "Fundamental link between e, i, pi, 1, and 0",
  },
  {
    id: "calculus-derivative",
    name: "Derivative Definition",
    category: "math",
    latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
    description: "First-principles definition of derivative limit",
  },
  {
    id: "calculus-integral",
    name: "Fundamental Theorem of Calculus",
    category: "math",
    latex: "\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)",
    description: "Definite integral evaluation via antiderivative",
  },
  // Physics
  {
    id: "newton-second",
    name: "Newton's Second Law",
    category: "physics",
    latex: "\\sum \\vec{F} = m \\vec{a}",
    description: "Net force equals mass times acceleration vector",
  },
  {
    id: "kinetic-energy",
    name: "Kinetic Energy",
    category: "physics",
    latex: "E_k = \\frac{1}{2} m v^2",
    description: "Energy possessed by an object due to its motion",
  },
  {
    id: "einstein-energy",
    name: "Mass-Energy Equivalence",
    category: "physics",
    latex: "E = m c^2",
    description: "Rest energy of mass in relativistic mechanics",
  },
  {
    id: "gravitation",
    name: "Universal Gravitation",
    category: "physics",
    latex: "F_g = G \\frac{m_1 m_2}{r^2}",
    description: "Newtonian gravitational attraction between two masses",
  },
  {
    id: "wave-speed",
    name: "Wave Velocity",
    category: "physics",
    latex: "v = f \\lambda",
    description: "Wave speed as product of frequency and wavelength",
  },
  // Chemistry
  {
    id: "ideal-gas",
    name: "Ideal Gas Law",
    category: "chemistry",
    latex: "P V = n R T",
    description: "State equation for ideal gas pressure and volume",
  },
  {
    id: "ph-henderson",
    name: "Henderson-Hasselbalch",
    category: "chemistry",
    latex: "\\text{pH} = \\text{pK}_a + \\log\\left(\\frac{[\\text{A}^-]}{[\\text{HA}]}\\right)",
    description: "Buffer solution pH calculation",
  },
  {
    id: "arrhenius",
    name: "Arrhenius Rate Equation",
    category: "chemistry",
    latex: "k = A e^{-\\frac{E_a}{RT}}",
    description: "Chemical reaction rate dependence on activation energy",
  },
];

/**
 * Image Cache for rasterized LaTeX formulas
 */
const formulaImageCache = new Map<string, { img: HTMLImageElement; width: number; height: number; loaded: boolean }>();

/**
 * Creates an image URL from SVG containing KaTeX or fallback formatted math text
 */
export function buildLatexSvgDataUrl(latex: string, color: string, fontSize = 24): string {
  const html = renderLatexToHtml(latex, false);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-size: ${fontSize}px; color: ${color}; display: flex; align-items: center; height: 100%;">
        ${html}
      </div>
    </foreignObject>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Creates a persistent WhiteboardElement representing a mathematical formula
 */
export function createFormulaElement(
  latex: string,
  startX: number,
  startY: number,
  color = "#38bdf8",
  fontSize = 24
): WhiteboardElement {
  return {
    id: `formula-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "text",
    color,
    width: 2,
    startX,
    startY,
    text: latex,
    fontSize,
    fontFamily: "'Times New Roman', 'Cambria Math', serif",
  };
}

/**
 * Render cached formula onto 2D canvas context
 */
export function renderFormulaElement(
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement,
  onImageLoad?: () => void
) {
  if (!element.text || element.startX === undefined || element.startY === undefined) return;

  const cacheKey = `${element.text}_${element.color}_${element.fontSize || 24}`;
  let cached = formulaImageCache.get(cacheKey);

  if (typeof window !== "undefined" && !cached) {
    const img = new Image();
    const dataUrl = buildLatexSvgDataUrl(element.text, element.color, element.fontSize || 24);
    cached = { img, width: 400, height: 80, loaded: false };
    formulaImageCache.set(cacheKey, cached);

    img.onload = () => {
      if (cached) {
        cached.loaded = true;
        cached.width = img.naturalWidth || 400;
        cached.height = img.naturalHeight || 80;
        onImageLoad?.();
      }
    };
    img.src = dataUrl;
  }

  if (cached && cached.loaded) {
    ctx.drawImage(cached.img, element.startX, element.startY - 40);
  } else {
    // Fallback direct text render while SVG image rasterizes
    ctx.save();
    ctx.fillStyle = element.color || "#38bdf8";
    ctx.font = `italic ${element.fontSize || 24}px 'Times New Roman', serif`;
    ctx.fillText(element.text, element.startX, element.startY);
    ctx.restore();
  }
}
