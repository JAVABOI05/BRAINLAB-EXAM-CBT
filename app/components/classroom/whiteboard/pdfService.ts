/**
 * BrainLab Professional Liveboard - Multi-Page PDF Service & Document Importer Engine
 * Stage 5: Multi-Page PDF Lecture Notes Export, Aspect-Ratio Preserving Importer, and Version Tracking
 */

import { jsPDF } from "jspdf";
import type { WhiteboardPage, WhiteboardElement } from "@/app/components/SmartWhiteboard";
import { getElementBoundingBox } from "./geometry";

export interface PageExportOptions {
  title?: string;
  author?: string;
  watermarkText?: string;
  dpiMultiplier?: number;
}

/**
 * Calculates correct non-distorting aspect ratio category from natural dimensions.
 */
export function detectDocumentAspectRatio(width: number, height: number): "16 / 9" | "4 / 3" | "9 / 16" | "free" {
  if (!width || !height) return "free";
  const ratio = width / height;

  // 16:9 widescreen (~1.777)
  if (Math.abs(ratio - 16 / 9) < 0.12) return "16 / 9";

  // 4:3 standard slides (~1.333)
  if (Math.abs(ratio - 4 / 3) < 0.12) return "4 / 3";

  // 9:16 vertical/mobile (~0.562) or portrait document
  if (Math.abs(ratio - 9 / 16) < 0.12 || ratio < 0.75) return "9 / 16";

  return "free";
}

/**
 * Renders a single WhiteboardPage onto an offscreen canvas at standard 1920x1080 page space.
 */
export function renderPageToCanvas(page: WhiteboardPage, width = 1920, height = 1080): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1. Draw Background surface
  const mode = page.backgroundMode || "blackboard";
  if (mode === "whiteboard") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  } else if (mode === "grid") {
    ctx.fillStyle = "#0b1536";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(19, 86, 232, 0.22)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (mode === "lines") {
    ctx.fillStyle = "#0b1536";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1.2;
    for (let y = 50; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else {
    // Blackboard
    ctx.fillStyle = "#070d1e";
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Draw Elements
  for (const el of page.elements) {
    ctx.save();
    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.color;
    ctx.lineWidth = el.width || 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (el.opacity !== undefined) {
      ctx.globalAlpha = el.opacity;
    }

    if (el.rotation) {
      const box = getElementBoundingBox(el);
      ctx.translate(box.centerX, box.centerY);
      ctx.rotate(el.rotation);
      ctx.translate(-box.centerX, -box.centerY);
    }

    if (el.type === "highlighter") {
      ctx.globalAlpha = (el.opacity ?? 1) * 0.38;
      ctx.lineWidth = (el.width || 2) * 2.8;
    }

    if ((el.type === "pen" || el.type === "highlighter") && el.points && el.points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
    } else if (el.type === "line" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
      ctx.beginPath();
      ctx.moveTo(el.startX, el.startY);
      ctx.lineTo(el.endX, el.endY);
      ctx.stroke();
    } else if (el.type === "arrow" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
      ctx.beginPath();
      ctx.moveTo(el.startX, el.startY);
      ctx.lineTo(el.endX, el.endY);
      ctx.stroke();

      const angle = Math.atan2(el.endY - el.startY, el.endX - el.startX);
      const headLength = Math.max(12, el.width * 3.5);
      ctx.beginPath();
      ctx.moveTo(el.endX, el.endY);
      ctx.lineTo(el.endX - headLength * Math.cos(angle - Math.PI / 6), el.endY - headLength * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(el.endX - headLength * Math.cos(angle + Math.PI / 6), el.endY - headLength * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    } else if (el.type === "rect" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
      const rx = Math.min(el.startX, el.endX);
      const ry = Math.min(el.startY, el.endY);
      const rw = Math.abs(el.endX - el.startX);
      const rh = Math.abs(el.endY - el.startY);
      if (el.fillColor && el.fillColor !== "transparent") {
        ctx.fillStyle = el.fillColor;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.fillStyle = el.color;
      }
      if (el.width > 0) ctx.strokeRect(rx, ry, rw, rh);
    } else if (el.type === "circle" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
      const radiusX = Math.abs(el.endX - el.startX) / 2;
      const radiusY = Math.abs(el.endY - el.startY) / 2;
      const centerX = Math.min(el.startX, el.endX) + radiusX;
      const centerY = Math.min(el.startY, el.endY) + radiusY;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      if (el.fillColor && el.fillColor !== "transparent") {
        ctx.fillStyle = el.fillColor;
        ctx.fill();
        ctx.fillStyle = el.color;
      }
      if (el.width > 0) ctx.stroke();
    } else if (el.type === "text" && el.startX !== undefined && el.startY !== undefined && el.text) {
      ctx.font = `600 ${el.fontSize || 22}px ${el.fontFamily || "Inter, sans-serif"}`;
      ctx.fillText(el.text, el.startX, el.startY);
    }

    ctx.restore();
  }

  // 3. Watermark
  ctx.save();
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.textAlign = "right";
  ctx.fillText("BrainLab Academy • Liveboard Notes", width - 24, height - 20);
  ctx.restore();

  return canvas;
}

/**
 * Exports all pages in a whiteboard session into a consolidated multi-page PDF document.
 */
export async function exportWhiteboardToPdf(
  pages: WhiteboardPage[],
  options: PageExportOptions = {}
): Promise<Blob | null> {
  if (pages.length === 0) return null;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [1920, 1080],
    hotfixes: ["px_scaling"],
  });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (i > 0) {
      pdf.addPage([1920, 1080], "landscape");
    }

    const canvas = renderPageToCanvas(page, 1920, 1080);
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(dataUrl, "JPEG", 0, 0, 1920, 1080);
    }

    // Page number footer
    pdf.setFontSize(14);
    pdf.setTextColor(200, 200, 200);
    pdf.text(`Page ${i + 1} of ${pages.length} • ${page.title}`, 40, 1060);
  }

  return pdf.output("blob");
}

/**
 * Downloads the exported multi-page PDF directly to the user's browser.
 */
export async function downloadWhiteboardPdf(
  pages: WhiteboardPage[],
  filename = "BrainLab_Lecture_Notes.pdf",
  options?: PageExportOptions
): Promise<boolean> {
  try {
    const blob = await exportWhiteboardToPdf(pages, options);
    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("PDF generation error:", err);
    return false;
  }
}
