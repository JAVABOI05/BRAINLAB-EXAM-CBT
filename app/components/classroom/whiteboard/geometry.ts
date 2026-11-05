/**
 * BrainLab Professional Liveboard - Geometry, Hit-Testing & Object Transformation Engine
 * Stage 2: Core Object-Oriented Canvas Architecture
 */

import type { WhiteboardElement, BoardAspectRatio } from "@/app/components/SmartWhiteboard";

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rot";

export interface TransformHandle {
  type: HandleType;
  x: number;
  y: number;
  cursor: string;
}

// Standard Virtual Page Resolutions
export const VIRTUAL_CANVAS_WIDTH = 1920;
export const VIRTUAL_CANVAS_HEIGHT = 1080;

export function getVirtualDimensions(aspectRatio?: BoardAspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case "4 / 3":
      return { width: 1440, height: 1080 };
    case "9 / 16":
      return { width: 1080, height: 1920 };
    case "free":
    case "16 / 9":
    default:
      return { width: 1920, height: 1080 };
  }
}

/**
 * Rotates a point (px, py) around a center (cx, cy) by angleRad radians.
 */
export function rotatePoint(px: number, py: number, cx: number, cy: number, angleRad: number): { x: number; y: number } {
  if (!angleRad) return { x: px, y: py };
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: cx + (px - cx) * cos - (py - cy) * sin,
    y: cy + (px - cx) * sin + (py - cy) * cos,
  };
}

/**
 * Normalizes screen client coordinates to virtual page coordinate space [1920x1080].
 */
export function screenToVirtualPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  zoom = 1,
  aspectRatio?: BoardAspectRatio
): { x: number; y: number } {
  const { width: vW, height: vH } = getVirtualDimensions(aspectRatio);
  const scaleX = (rect.width || 1) / vW;
  const scaleY = (rect.height || 1) / vH;
  return {
    x: (clientX - rect.left) / (scaleX * zoom),
    y: (clientY - rect.top) / (scaleY * zoom),
  };
}

/**
 * Distance from point (px, py) to line segment (x1, y1) -> (x2, y2)
 */
export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

/**
 * Computes an axis-aligned bounding box for any WhiteboardElement, with rotation support.
 */
export function getElementBoundingBox(el: WhiteboardElement): BoundingBox {
  const pad = Math.max(4, ((el.width || 2) * (el.type === "highlighter" ? 2.8 : 1)) / 2);

  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;

  if (el.points && el.points.length > 0) {
    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;

    for (const p of el.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
  } else if (el.type === "text" && el.startX !== undefined && el.startY !== undefined) {
    const fontSize = el.fontSize || 22;
    const textLen = el.text ? el.text.length : 1;
    const estWidth = Math.max(30, textLen * fontSize * 0.62);
    minX = el.startX - 4;
    minY = el.startY - fontSize - 2;
    maxX = el.startX + estWidth + 4;
    maxY = el.startY + 8;
  } else {
    const sx = el.startX ?? 0;
    const sy = el.startY ?? 0;
    const ex = el.endX ?? sx;
    const ey = el.endY ?? sy;

    minX = Math.min(sx, ex) - pad;
    maxX = Math.max(sx, ex) + pad;
    minY = Math.min(sy, ey) - pad;
    maxY = Math.max(sy, ey) + pad;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  if (!el.rotation) {
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(10, maxX - minX),
      height: Math.max(10, maxY - minY),
      centerX: cx,
      centerY: cy,
    };
  }

  // Calculate 4 rotated corners for accurate oriented bounding envelope
  const corners = [
    rotatePoint(minX, minY, cx, cy, el.rotation),
    rotatePoint(maxX, minY, cx, cy, el.rotation),
    rotatePoint(maxX, maxY, cx, cy, el.rotation),
    rotatePoint(minX, maxY, cx, cy, el.rotation),
  ];

  let rMinX = Infinity;
  let rMinY = Infinity;
  let rMaxX = -Infinity;
  let rMaxY = -Infinity;

  for (const c of corners) {
    if (c.x < rMinX) rMinX = c.x;
    if (c.x > rMaxX) rMaxX = c.x;
    if (c.y < rMinY) rMinY = c.y;
    if (c.y > rMaxY) rMaxY = c.y;
  }

  return {
    minX: rMinX,
    minY: rMinY,
    maxX: rMaxX,
    maxY: rMaxY,
    width: Math.max(10, rMaxX - rMinX),
    height: Math.max(10, rMaxY - rMinY),
    centerX: cx,
    centerY: cy,
  };
}

/**
 * Computes the union bounding box enclosing a collection of WhiteboardElements.
 */
export function getElementsBoundingBox(elements: WhiteboardElement[]): BoundingBox | null {
  if (!elements || elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const box = getElementBoundingBox(el);
    if (box.minX < minX) minX = box.minX;
    if (box.minY < minY) minY = box.minY;
    if (box.maxX > maxX) maxX = box.maxX;
    if (box.maxY > maxY) maxY = box.maxY;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/**
 * Tests whether a point (px, py) intersects a WhiteboardElement, with inverse rotation.
 */
export function hitTestElement(el: WhiteboardElement, px: number, py: number, tolerance = 10): boolean {
  let testX = px;
  let testY = py;

  if (el.rotation) {
    const unrotatedBox = getElementBoundingBox({ ...el, rotation: undefined });
    const unrotated = rotatePoint(px, py, unrotatedBox.centerX, unrotatedBox.centerY, -el.rotation);
    testX = unrotated.x;
    testY = unrotated.y;
  }

  if (el.points && el.points.length > 0) {
    const strokeTol = tolerance + (((el.width || 2) * (el.type === "highlighter" ? 2.5 : 1)) / 2);
    for (let i = 0; i < el.points.length - 1; i++) {
      const p1 = el.points[i];
      const p2 = el.points[i + 1];
      if (distToSegment(testX, testY, p1.x, p1.y, p2.x, p2.y) <= strokeTol) {
        return true;
      }
    }
    return false;
  }

  if (el.type === "text") {
    const box = getElementBoundingBox({ ...el, rotation: undefined });
    return testX >= box.minX && testX <= box.maxX && testY >= box.minY && testY <= box.maxY;
  }

  const sx = el.startX ?? 0;
  const sy = el.startY ?? 0;
  const ex = el.endX ?? sx;
  const ey = el.endY ?? sy;

  if (el.type === "line" || el.type === "arrow") {
    return distToSegment(testX, testY, sx, sy, ex, ey) <= tolerance + (el.width || 2) / 2;
  }

  if (el.type === "rect") {
    const x = Math.min(sx, ex);
    const y = Math.min(sy, ey);
    const w = Math.abs(ex - sx);
    const h = Math.abs(ey - sy);

    return testX >= x - tolerance && testX <= x + w + tolerance && testY >= y - tolerance && testY <= y + h + tolerance;
  }

  if (el.type === "circle") {
    const rx = Math.abs(ex - sx) / 2;
    const ry = Math.abs(ey - sy) / 2;
    const cx = Math.min(sx, ex) + rx;
    const cy = Math.min(sy, ey) + ry;

    if (rx === 0 || ry === 0) return false;
    const normDist = ((testX - cx) / (rx + tolerance)) ** 2 + ((testY - cy) / (ry + tolerance)) ** 2;
    return normDist <= 1;
  }

  return false;
}

/**
 * Generates the 8 resize handles and 1 rotation handle for a bounding box.
 */
export function getBoundingBoxHandles(box: BoundingBox): TransformHandle[] {
  const { minX, minY, maxX, maxY, centerX, centerY } = box;
  const rotDist = 26;

  return [
    { type: "nw", x: minX, y: minY, cursor: "nwse-resize" },
    { type: "n", x: centerX, y: minY, cursor: "ns-resize" },
    { type: "ne", x: maxX, y: minY, cursor: "nesw-resize" },
    { type: "e", x: maxX, y: centerY, cursor: "ew-resize" },
    { type: "se", x: maxX, y: maxY, cursor: "nwse-resize" },
    { type: "s", x: centerX, y: maxY, cursor: "ns-resize" },
    { type: "sw", x: minX, y: maxY, cursor: "nesw-resize" },
    { type: "w", x: minX, y: centerY, cursor: "ew-resize" },
    { type: "rot", x: centerX, y: minY - rotDist, cursor: "grab" },
  ];
}

/**
 * Hit tests a point against the handles of a bounding box.
 */
export function hitTestHandle(
  handles: TransformHandle[],
  px: number,
  py: number,
  radius = 9
): TransformHandle | null {
  for (const h of handles) {
    if (Math.hypot(px - h.x, py - h.y) <= radius) {
      return h;
    }
  }
  return null;
}

/**
 * Translates an element by (dx, dy).
 */
export function translateElement(el: WhiteboardElement, dx: number, dy: number): WhiteboardElement {
  const cloned = JSON.parse(JSON.stringify(el)) as WhiteboardElement;

  if (cloned.points && cloned.points.length > 0) {
    cloned.points = cloned.points.map((p: { x: number; y: number }) => ({ x: p.x + dx, y: p.y + dy }));
  }
  if (cloned.startX !== undefined) cloned.startX += dx;
  if (cloned.startY !== undefined) cloned.startY += dy;
  if (cloned.endX !== undefined) cloned.endX += dx;
  if (cloned.endY !== undefined) cloned.endY += dy;

  return cloned;
}

/**
 * Resizes an element from an initial bounding box to a new bounding box.
 */
export function scaleElement(
  el: WhiteboardElement,
  origBox: BoundingBox,
  newBox: BoundingBox
): WhiteboardElement {
  const cloned = JSON.parse(JSON.stringify(el)) as WhiteboardElement;
  const origW = origBox.width || 1;
  const origH = origBox.height || 1;

  const mapX = (x: number) => newBox.minX + ((x - origBox.minX) / origW) * newBox.width;
  const mapY = (y: number) => newBox.minY + ((y - origBox.minY) / origH) * newBox.height;

  if (cloned.points && cloned.points.length > 0) {
    cloned.points = cloned.points.map((p: { x: number; y: number }) => ({ x: mapX(p.x), y: mapY(p.y) }));
  }
  if (cloned.startX !== undefined) cloned.startX = mapX(cloned.startX);
  if (cloned.startY !== undefined) cloned.startY = mapY(cloned.startY);
  if (cloned.endX !== undefined) cloned.endX = mapX(cloned.endX);
  if (cloned.endY !== undefined) cloned.endY = mapY(cloned.endY);

  if (cloned.fontSize) {
    const scaleFactor = Math.hypot(newBox.width, newBox.height) / Math.hypot(origW, origH);
    cloned.fontSize = Math.max(10, Math.round(cloned.fontSize * scaleFactor));
  }

  return cloned;
}

/**
 * Checks if two bounding boxes intersect (used for marquee selection).
 */
export function boxesIntersect(b1: BoundingBox, b2: { minX: number; minY: number; maxX: number; maxY: number }): boolean {
  return !(
    b1.maxX < b2.minX ||
    b1.minX > b2.maxX ||
    b1.maxY < b2.minY ||
    b1.minY > b2.maxY
  );
}
