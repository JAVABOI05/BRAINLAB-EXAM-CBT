import {
  RulerState,
  ProtractorState,
  CartesianPlaneConfig,
  createDefaultRuler,
  createDefaultProtractor,
  createDefaultCartesianPlane,
  clampPointToRulerEdge,
  hitTestRuler,
  hitTestProtractor,
  generateCartesianElements,
  eraseElementsAlongPath,
} from "../app/components/classroom/whiteboard/educationalTools";
import type { WhiteboardElement } from "../app/components/SmartWhiteboard";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runStage3Verification() {
  console.log("\n🧪 --- BRAINLAB LIVEBOARD STAGE 3: EDUCATIONAL GEOMETRY TOOLS TEST SUITE ---\n");

  // --------------------------------------------------------------------------
  // TEST 1: Ruler edge clamping (Horizontal at 0 deg)
  // --------------------------------------------------------------------------
  const ruler: RulerState = {
    visible: true,
    x: 200,
    y: 300,
    width: 500,
    height: 60,
    rotation: 0,
    unitScale: 30,
  };

  // Near top edge (y = 300, test at y = 305, within tolerance 25)
  const snap1 = clampPointToRulerEdge(350, 305, ruler, 25);
  assert(snap1.clamped === true, "Point within tolerance snaps to ruler edge");
  assert(Math.abs(snap1.point.y - 300) < 0.001, "Clamped point Y matches ruler top edge exactly (300)");
  assert(Math.abs(snap1.point.x - 350) < 0.001, "Clamped point X matches original cursor X (350)");

  // Outside ruler X range
  const snapOutside = clampPointToRulerEdge(100, 305, ruler, 25);
  assert(snapOutside.clamped === false, "Point outside ruler X bounds does not clamp");

  // Outside tolerance Y range
  const snapTooFar = clampPointToRulerEdge(350, 360, ruler, 25);
  assert(snapTooFar.clamped === false, "Point far from ruler edge does not clamp");

  // --------------------------------------------------------------------------
  // TEST 2: Ruler edge clamping (Rotated at 90 deg / Vertical)
  // --------------------------------------------------------------------------
  const rulerRot90: RulerState = {
    ...ruler,
    rotation: Math.PI / 2, // 90 deg
  };
  // Center is (450, 330)
  // At 90 deg rotation, ruler top edge is rotated vertically
  const testRotPoint = { x: 450 + 30, y: 330 }; // Near rotated edge
  const snapRot = clampPointToRulerEdge(testRotPoint.x, testRotPoint.y, rulerRot90, 35);
  assert(snapRot.clamped === true, "Point snaps to rotated ruler top edge at 90°");

  // --------------------------------------------------------------------------
  // TEST 3: Ruler Hit-testing
  // --------------------------------------------------------------------------
  const hitBody = hitTestRuler(300, 330, ruler);
  assert(hitBody === "body", "Cursor inside ruler body returns 'body'");

  const cx = ruler.x + ruler.width / 2; // 450
  const hitRot = hitTestRuler(cx, ruler.y - 28, ruler);
  assert(hitRot === "rotate", "Cursor on rotation stem returns 'rotate'");

  const hitResize = hitTestRuler(ruler.x + ruler.width, ruler.y + ruler.height / 2, ruler);
  assert(hitResize === "resize", "Cursor on right resize handle returns 'resize'");

  const hitMiss = hitTestRuler(50, 50, ruler);
  assert(hitMiss === null, "Cursor outside ruler returns null");

  // --------------------------------------------------------------------------
  // TEST 4: Protractor Model & Needle Angle Precision
  // --------------------------------------------------------------------------
  const protractor: ProtractorState = {
    visible: true,
    cx: 500,
    cy: 400,
    radius: 180,
    rotation: 0,
    mode: "180",
    measuringAngle: Math.PI / 3, // 60 degrees
  };

  // Check 60 degree angle conversion
  const angleDeg = (protractor.measuringAngle * 180) / Math.PI;
  assert(Math.abs(angleDeg - 60) < 0.0001, "Protractor angle matches 60.0° precisely");

  // Hit test protractor body
  const hitProtBody = hitTestProtractor(500, 350, protractor);
  assert(hitProtBody === "body", "Hit center of 180° protractor returns 'body'");

  // Hit test measuring needle arm handle:
  // At measuringAngle = 60° (Math.PI / 3), needle end is at (cx + cos(-60°)*180, cy + sin(-60°)*180)
  const needleX = 500 + Math.cos(-Math.PI / 3) * 180;
  const needleY = 400 + Math.sin(-Math.PI / 3) * 180;
  const hitProtNeedle = hitTestProtractor(needleX, needleY, protractor);
  assert(hitProtNeedle === "needle", "Hit on needle arm tip returns 'needle'");

  // --------------------------------------------------------------------------
  // TEST 5: Smart Stroke-Crossing Vector Eraser
  // --------------------------------------------------------------------------
  const sampleElements: WhiteboardElement[] = [
    // 1. Freehand stroke between (100, 100) and (200, 200)
    {
      id: "stroke-1",
      type: "pen",
      color: "#06b6d4",
      width: 4,
      points: [
        { x: 100, y: 100 },
        { x: 150, y: 150 },
        { x: 200, y: 200 },
      ],
    },
    // 2. Straight line from (300, 100) to (300, 500)
    {
      id: "line-1",
      type: "line",
      color: "#3b82f6",
      width: 4,
      startX: 300,
      startY: 100,
      endX: 300,
      endY: 500,
    },
    // 3. Rectangle from (400, 100) to (600, 300)
    {
      id: "rect-1",
      type: "rect",
      color: "#10b981",
      width: 3,
      startX: 400,
      startY: 100,
      endX: 600,
      endY: 300,
    },
    // 4. Locked element from (700, 100) to (700, 500)
    {
      id: "line-locked",
      type: "line",
      color: "#f59e0b",
      width: 4,
      startX: 700,
      startY: 100,
      endX: 700,
      endY: 500,
      locked: true,
    },
  ];

  // Test 5a: Erase crossing midpoint of freehand stroke (at 125, 125)
  const eraseStroke = eraseElementsAlongPath(sampleElements, 125, 125, 20);
  assert(eraseStroke.erasedCount === 1, "Eraser crossed freehand segment and erased exactly 1 element");
  assert(!eraseStroke.remaining.some((e) => e.id === "stroke-1"), "stroke-1 was deleted");

  // Test 5b: Erase crossing middle of vertical line (at 300, 300 - far from endpoints)
  const eraseLine = eraseElementsAlongPath(sampleElements, 300, 300, 20);
  assert(eraseLine.erasedCount === 1, "Eraser crossed middle of straight line and erased it");
  assert(!eraseLine.remaining.some((e) => e.id === "line-1"), "line-1 was deleted");

  // Test 5c: Erase crossing top perimeter of rectangle (at 500, 100)
  const eraseRect = eraseElementsAlongPath(sampleElements, 500, 100, 15);
  assert(eraseRect.erasedCount === 1, "Eraser crossed top perimeter of rectangle and erased it");
  assert(!eraseRect.remaining.some((e) => e.id === "rect-1"), "rect-1 was deleted");

  // Test 5d: Eraser crossing locked element (at 700, 300)
  const eraseLocked = eraseElementsAlongPath(sampleElements, 700, 300, 25);
  assert(eraseLocked.erasedCount === 0, "Eraser does NOT delete locked elements");
  assert(eraseLocked.remaining.some((e) => e.id === "line-locked"), "line-locked is preserved");

  // --------------------------------------------------------------------------
  // TEST 6: Cartesian Coordinate Grid Vector Generator
  // --------------------------------------------------------------------------
  const cartConfig: CartesianPlaneConfig = {
    ...createDefaultCartesianPlane(),
    xMin: -5,
    xMax: 5,
    yMin: -5,
    yMax: 5,
    step: 1,
    width: 400,
    height: 400,
    centerX: 960,
    centerY: 540,
  };

  const gridElements = generateCartesianElements(cartConfig);
  assert(gridElements.length > 10, `Cartesian grid generated ${gridElements.length} vector elements`);

  const hasXAxis = gridElements.some((e) => e.id.includes("cart-axis-x"));
  const hasYAxis = gridElements.some((e) => e.id.includes("cart-axis-y"));
  const hasOrigin = gridElements.some((e) => e.id.includes("cart-origin"));
  const hasXLabel = gridElements.some((e) => e.id.includes("cart-lbl-x"));
  const hasYLabel = gridElements.some((e) => e.id.includes("cart-lbl-y"));

  assert(hasXAxis, "Cartesian plane includes primary X-Axis vector");
  assert(hasYAxis, "Cartesian plane includes primary Y-Axis vector");
  assert(hasOrigin, "Cartesian plane includes origin '0' label");
  assert(hasXLabel && hasYLabel, "Cartesian plane includes 'x' and 'y' axis labels");

  console.log("\n========================================================");
  console.log("🎉 ALL STAGE 3 EDUCATIONAL TOOLSET VERIFICATIONS PASSED!");
  console.log("========================================================\n");
}

runStage3Verification().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
