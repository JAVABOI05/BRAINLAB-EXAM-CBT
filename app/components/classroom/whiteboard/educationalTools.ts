/**
 * BrainLab Professional Liveboard - Educational Geometry Toolset Engine
 * Stage 3: Interactive Digital Ruler, 180/360 Protractor, Compass & Cartesian Graphing Grid
 */

import type { WhiteboardElement } from "@/app/components/SmartWhiteboard";
import { rotatePoint, distToSegment } from "./geometry";

// ----------------------------------------------------------------------------
// 1. DIGITAL RULER TOOL MODEL & RENDERING
// ----------------------------------------------------------------------------
export interface RulerState {
  visible: boolean;
  x: number; // Top-left anchor in virtual coordinates
  y: number;
  width: number; // Ruler length in virtual pixels (e.g. 600px = 20cm at 30px/cm)
  height: number; // Ruler thickness (e.g. 70px)
  rotation: number; // In radians
  unitScale: number; // Pixels per centimeter (default: 30)
}

export function createDefaultRuler(): RulerState {
  return {
    visible: false,
    x: 400,
    y: 350,
    width: 600,
    height: 70,
    rotation: 0,
    unitScale: 30, // 30px per cm, so 600px is 20cm
  };
}

/**
 * Projects a point onto the ruler's top drawing edge, clamping to [0, length].
 */
export function clampPointToRulerEdge(
  px: number,
  py: number,
  ruler: RulerState,
  tolerance = 30
): { clamped: boolean; point: { x: number; y: number } } {
  if (!ruler.visible) return { clamped: false, point: { x: px, y: py } };

  // Center of ruler
  const cx = ruler.x + ruler.width / 2;
  const cy = ruler.y + ruler.height / 2;

  // Unrotate point around ruler center
  const unrotated = rotatePoint(px, py, cx, cy, -ruler.rotation);

  // Check if near top edge (y ≈ ruler.y, within tolerance)
  const distToTop = Math.abs(unrotated.y - ruler.y);
  const withinX = unrotated.x >= ruler.x - 10 && unrotated.x <= ruler.x + ruler.width + 10;

  if (distToTop <= tolerance && withinX) {
    // Snap to the exact top edge line
    const clampedX = Math.max(ruler.x, Math.min(ruler.x + ruler.width, unrotated.x));
    const clampedY = ruler.y;
    // Rotate back to canvas space
    const snapped = rotatePoint(clampedX, clampedY, cx, cy, ruler.rotation);
    return { clamped: true, point: snapped };
  }

  return { clamped: false, point: { x: px, y: py } };
}

/**
 * Renders the interactive digital ruler onto a 2D canvas context.
 */
export function renderRuler(ctx: CanvasRenderingContext2D, ruler: RulerState, isHovered = false) {
  if (!ruler.visible) return;

  const { x, y, width, height, rotation, unitScale } = ruler;
  const cx = x + width / 2;
  const cy = y + height / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.translate(-cx, -cy);

  // 1. Semi-transparent glassmorphic body
  ctx.fillStyle = isHovered ? "rgba(19, 86, 232, 0.28)" : "rgba(15, 23, 42, 0.78)";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.stroke();

  // Highlight top drawing edge
  ctx.strokeStyle = "#facc15"; // Gold edge indicator
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();

  // 2. Metric Graduations (Millimeters and Centimeters)
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 10px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const totalCm = Math.floor(width / unitScale);
  for (let cm = 0; cm <= totalCm; cm++) {
    const markX = x + cm * unitScale;

    // Major Centimeter Tick
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(markX, y);
    ctx.lineTo(markX, y + 20);
    ctx.stroke();

    // Centimeter Number
    if (cm > 0 && cm < totalCm) {
      ctx.fillText(`${cm}`, markX, y + 24);
    }

    // Millimeter Sub-ticks (every 1mm = 0.1cm)
    if (cm < totalCm) {
      for (let mm = 1; mm < 10; mm++) {
        const mmX = markX + (mm * unitScale) / 10;
        const tickHeight = mm === 5 ? 14 : 8;
        ctx.strokeStyle = mm === 5 ? "rgba(248, 250, 252, 0.85)" : "rgba(226, 232, 240, 0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mmX, y);
        ctx.lineTo(mmX, y + tickHeight);
        ctx.stroke();
      }
    }
  }

  // Unit and Angle Readout in Center
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 11px font-mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const deg = Math.round(((rotation * 180) / Math.PI) % 360);
  const normalizedDeg = deg < 0 ? deg + 360 : deg;
  ctx.fillText(`📏 ${totalCm} cm • ${normalizedDeg}°`, cx, cy + 12);

  // Rotation Handle (top stem)
  const rotStemY = y - 28;
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, rotStemY);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1356E8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, rotStemY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Resize Length Handle (right edge)
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + width, cy, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Hit test the ruler. Returns 'body' | 'rotate' | 'resize' | null.
 */
export function hitTestRuler(
  px: number,
  py: number,
  ruler: RulerState,
  tolerance = 12
): "body" | "rotate" | "resize" | null {
  if (!ruler.visible) return null;

  const { x, y, width, height, rotation } = ruler;
  const cx = x + width / 2;
  const cy = y + height / 2;

  const unrotated = rotatePoint(px, py, cx, cy, -rotation);

  // Check rotation handle at (cx, y - 28)
  const rotDist = Math.hypot(unrotated.x - cx, unrotated.y - (y - 28));
  if (rotDist <= tolerance) return "rotate";

  // Check resize handle at (x + width, cy)
  const resizeDist = Math.hypot(unrotated.x - (x + width), unrotated.y - cy);
  if (resizeDist <= tolerance) return "resize";

  // Check ruler body
  if (
    unrotated.x >= x - 4 &&
    unrotated.x <= x + width + 4 &&
    unrotated.y >= y - 4 &&
    unrotated.y <= y + height + 4
  ) {
    return "body";
  }

  return null;
}

// ----------------------------------------------------------------------------
// 2. INTERACTIVE 180° / 360° PROTRACTOR MODEL & RENDERING
// ----------------------------------------------------------------------------
export interface ProtractorState {
  visible: boolean;
  cx: number; // Origin / crosshair center in virtual coordinates
  cy: number;
  radius: number; // Default: 200px
  rotation: number; // Base orientation in radians
  mode: "180" | "360";
  measuringAngle: number; // Active measurement arm in radians (e.g. 45 degrees)
}

export function createDefaultProtractor(): ProtractorState {
  return {
    visible: false,
    cx: 800,
    cy: 500,
    radius: 200,
    rotation: 0,
    mode: "180",
    measuringAngle: Math.PI / 4, // 45 degrees
  };
}

/**
 * Renders the interactive protractor on canvas.
 */
export function renderProtractor(ctx: CanvasRenderingContext2D, protractor: ProtractorState) {
  if (!protractor.visible) return;

  const { cx, cy, radius, rotation, mode, measuringAngle } = protractor;
  const is360 = mode === "360";

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // 1. Semi-transparent body
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;

  ctx.beginPath();
  if (is360) {
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
  } else {
    // Semicircle: from PI (180deg left) to 0 (0deg right) through negative Y (top)
    ctx.arc(0, 0, radius, Math.PI, 0, false);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  // 2. Center Crosshair Anchor
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.moveTo(0, -18);
  ctx.lineTo(0, is360 ? 18 : 6);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Degree Marks
  const maxDeg = is360 ? 360 : 180;
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 9px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let d = 0; d <= maxDeg; d += 1) {
    // 0 deg starts at right (+X axis) and sweeps counter-clockwise (towards -Y on screen)
    const rad = (-d * Math.PI) / 180;
    const is10 = d % 10 === 0;
    const is5 = d % 5 === 0;

    const tickLen = is10 ? 16 : is5 ? 10 : 5;
    const outerX = Math.cos(rad) * radius;
    const outerY = Math.sin(rad) * radius;
    const innerX = Math.cos(rad) * (radius - tickLen);
    const innerY = Math.sin(rad) * (radius - tickLen);

    ctx.strokeStyle = is10 ? "#ffffff" : is5 ? "rgba(248, 250, 252, 0.75)" : "rgba(226, 232, 240, 0.35)";
    ctx.lineWidth = is10 ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(outerX, outerY);
    ctx.lineTo(innerX, innerY);
    ctx.stroke();

    // Degree text labels every 10 degrees
    if (is10 && d > 0 && d < maxDeg) {
      const textRadius = radius - 26;
      const tx = Math.cos(rad) * textRadius;
      const ty = Math.sin(rad) * textRadius;
      ctx.fillText(`${d}°`, tx, ty);
    }
  }

  // 4. Measuring Needle Arm with Accurate Angle Readout
  const needleRad = -measuringAngle;
  const needleX = Math.cos(needleRad) * radius;
  const needleY = Math.sin(needleRad) * radius;

  ctx.strokeStyle = "#f43f5e"; // Rose pink arm
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(needleX, needleY);
  ctx.stroke();

  // Measuring Handle Circle
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(needleX, needleY, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Measurement Badge
  const measuredDeg = (((measuringAngle * 180) / Math.PI) % 360).toFixed(1);
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 12px font-mono, monospace";
  ctx.fillText(`∠ ${measuredDeg}°`, 0, -radius * 0.45);

  ctx.restore();
}

/**
 * Hit test the protractor. Returns 'body' | 'needle' | 'rotate' | null.
 */
export function hitTestProtractor(
  px: number,
  py: number,
  protractor: ProtractorState,
  tolerance = 14
): "body" | "needle" | "rotate" | null {
  if (!protractor.visible) return null;

  const { cx, cy, radius, rotation, mode, measuringAngle } = protractor;
  const unrotated = rotatePoint(px, py, cx, cy, -rotation);

  // dx, dy relative to protractor origin
  const dx = unrotated.x - cx;
  const dy = unrotated.y - cy;
  const dist = Math.hypot(dx, dy);

  // 1. Check needle handle at endpoint of measuring angle
  const needleX = Math.cos(-measuringAngle) * radius;
  const needleY = Math.sin(-measuringAngle) * radius;
  if (Math.hypot(dx - needleX, dy - needleY) <= tolerance + 4) {
    return "needle";
  }

  // 2. Check top rotation anchor at (0, -radius - 16)
  if (Math.hypot(dx, dy - (-radius - 16)) <= tolerance) {
    return "rotate";
  }

  // 3. Check protractor body
  if (mode === "360") {
    if (dist <= radius + tolerance) return "body";
  } else {
    // 180 degree semicircle is on negative Y side (from -PI to 0)
    if (dist <= radius + tolerance && dy <= tolerance + 4) return "body";
  }

  return null;
}

// ----------------------------------------------------------------------------
// 3. CARTESIAN GRAPHING GRID ENGINE
// ----------------------------------------------------------------------------
export interface CartesianPlaneConfig {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  step: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  label: string;
}

export function createDefaultCartesianPlane(): CartesianPlaneConfig {
  return {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    step: 1,
    width: 600,
    height: 450,
    centerX: 960,
    centerY: 540,
    label: "Cartesian Coordinate Plane (x, y)",
  };
}

/**
 * Converts a Cartesian coordinate plane into persistent WhiteboardElement vectors.
 */
export function generateCartesianElements(config: CartesianPlaneConfig): WhiteboardElement[] {
  const elements: WhiteboardElement[] = [];
  const { xMin, xMax, yMin, yMax, step, width, height, centerX, centerY } = config;

  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;

  const scaleX = width / (xMax - xMin);
  const scaleY = height / (yMax - yMin);
  const originX = left + -xMin * scaleX;
  const originY = bottom - -yMin * scaleY;

  // 1. Grid lines
  for (let xVal = xMin; xVal <= xMax; xVal += step) {
    if (xVal === 0) continue;
    const px = left + (xVal - xMin) * scaleX;
    elements.push({
      id: `cart-grid-v-${xVal}-${Date.now()}`,
      type: "line",
      color: "rgba(56, 189, 248, 0.18)",
      width: 1,
      startX: px,
      startY: top,
      endX: px,
      endY: bottom,
    });
  }

  for (let yVal = yMin; yVal <= yMax; yVal += step) {
    if (yVal === 0) continue;
    const py = bottom - (yVal - yMin) * scaleY;
    elements.push({
      id: `cart-grid-h-${yVal}-${Date.now()}`,
      type: "line",
      color: "rgba(56, 189, 248, 0.18)",
      width: 1,
      startX: left,
      startY: py,
      endX: right,
      endY: py,
    });
  }

  // 2. Primary X-Axis (Arrowed vector)
  elements.push({
    id: `cart-axis-x-${Date.now()}`,
    type: "arrow",
    color: "#38bdf8",
    width: 2.5,
    startX: left - 10,
    startY: originY,
    endX: right + 20,
    endY: originY,
  });

  // 3. Primary Y-Axis (Arrowed vector)
  elements.push({
    id: `cart-axis-y-${Date.now()}`,
    type: "arrow",
    color: "#38bdf8",
    width: 2.5,
    startX: originX,
    startY: bottom + 10,
    endX: originX,
    endY: top - 20,
  });

  // 4. Axis Labels
  elements.push({
    id: `cart-lbl-x-${Date.now()}`,
    type: "text",
    color: "#38bdf8",
    width: 2,
    startX: right + 26,
    startY: originY + 5,
    text: "x",
    fontSize: 18,
  });

  elements.push({
    id: `cart-lbl-y-${Date.now()}`,
    type: "text",
    color: "#38bdf8",
    width: 2,
    startX: originX - 6,
    startY: top - 26,
    text: "y",
    fontSize: 18,
  });

  // 5. Origin label '0'
  elements.push({
    id: `cart-origin-${Date.now()}`,
    type: "text",
    color: "rgba(226, 232, 240, 0.8)",
    width: 1,
    startX: originX - 16,
    startY: originY + 16,
    text: "0",
    fontSize: 13,
  });

  return elements;
}

// ----------------------------------------------------------------------------
// 4. SMART STROKE-CROSSING VECTOR ERASER
// ----------------------------------------------------------------------------
/**
 * Performs stroke-crossing vector erasure.
 * Removes any element whose line/segment/points or bounding box intersects the eraser point.
 */
export function eraseElementsAlongPath(
  elements: WhiteboardElement[],
  eraserX: number,
  eraserY: number,
  radius = 24
): { remaining: WhiteboardElement[]; erasedCount: number } {
  let erasedCount = 0;
  const remaining = elements.filter((el) => {
    // If element is locked, it cannot be erased
    if (el.locked) return true;

    // Freehand strokes & highlighters
    if (el.points && el.points.length > 0) {
      for (let i = 0; i < el.points.length - 1; i++) {
        const p1 = el.points[i];
        const p2 = el.points[i + 1];
        if (distToSegment(eraserX, eraserY, p1.x, p1.y, p2.x, p2.y) <= radius + (el.width || 2) / 2) {
          erasedCount++;
          return false;
        }
      }
      return true;
    }

    // Straight Lines & Arrows
    if ((el.type === "line" || el.type === "arrow") && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
      if (distToSegment(eraserX, eraserY, el.startX, el.startY, el.endX, el.endY) <= radius + (el.width || 2) / 2) {
        erasedCount++;
        return false;
      }
      return true;
    }

    // Rectangles (intersect any of 4 perimeter segments)
    if (el.type === "rect" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
      const minX = Math.min(el.startX, el.endX);
      const maxX = Math.max(el.startX, el.endX);
      const minY = Math.min(el.startY, el.endY);
      const maxY = Math.max(el.startY, el.endY);

      if (
        distToSegment(eraserX, eraserY, minX, minY, maxX, minY) <= radius ||
        distToSegment(eraserX, eraserY, maxX, minY, maxX, maxY) <= radius ||
        distToSegment(eraserX, eraserY, maxX, maxY, minX, maxY) <= radius ||
        distToSegment(eraserX, eraserY, minX, maxY, minX, minY) <= radius
      ) {
        erasedCount++;
        return false;
      }
      return true;
    }

    // Circles (distance to circular perimeter)
    if (el.type === "circle" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
      const rx = Math.abs(el.endX - el.startX) / 2;
      const ry = Math.abs(el.endY - el.startY) / 2;
      const cx = Math.min(el.startX, el.endX) + rx;
      const cy = Math.min(el.startY, el.endY) + ry;
      const distToCenter = Math.hypot(eraserX - cx, eraserY - cy);
      const avgR = (rx + ry) / 2;

      if (Math.abs(distToCenter - avgR) <= radius) {
        erasedCount++;
        return false;
      }
      return true;
    }

    // Text elements (bounding box hit)
    if (el.type === "text" && el.startX !== undefined && el.startY !== undefined) {
      const fontSize = el.fontSize || 22;
      const textLen = el.text ? el.text.length : 1;
      const estWidth = Math.max(30, textLen * fontSize * 0.62);
      if (
        eraserX >= el.startX - radius &&
        eraserX <= el.startX + estWidth + radius &&
        eraserY >= el.startY - fontSize - radius &&
        eraserY <= el.startY + radius
      ) {
        erasedCount++;
        return false;
      }
      return true;
    }

    return true;
  });

  return { remaining, erasedCount };
}
