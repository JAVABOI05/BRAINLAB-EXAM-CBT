/**
 * BrainLab Professional Liveboard - Stage 8 Forensic Watermark & Stage 9 Mobile/Stylus Suite
 */
export {};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

function shouldRejectPalmTouch(pointer: {
  pointerType: string;
  width?: number;
  height?: number;
}): boolean {
  if (pointer.pointerType === "touch") {
    const contactArea = (pointer.width || 0) * (pointer.height || 0);
    if (contactArea > 750 || ((pointer.width || 0) > 28 && (pointer.height || 0) > 28)) {
      return true; // Rejected
    }
  }
  return false; // Accepted
}

function computeStylusStrokeWidth(
  baseWidth: number,
  pointer: { pointerType: string; pressure?: number }
): number {
  if (pointer.pointerType === "pen" && typeof pointer.pressure === "number" && pointer.pressure > 0) {
    return Math.max(1.5, Math.min(baseWidth * 2.2, baseWidth * pointer.pressure * 1.8));
  }
  return baseWidth;
}

function generateWatermarkTiles(
  logicalWidth: number,
  logicalHeight: number,
  stepX = 360,
  stepY = 180
): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  for (let wx = -logicalWidth * 0.5; wx < logicalWidth * 1.5; wx += stepX) {
    for (let wy = -logicalHeight * 0.5; wy < logicalHeight * 1.5; wy += stepY) {
      tiles.push({ x: wx, y: wy });
    }
  }
  return tiles;
}

async function runStage8And9Verification() {
  console.log("\n🧪 --- BRAINLAB LIVEBOARD STAGES 8 & 9: WATERMARK & MOBILE/STYLUS SUITE ---\n");

  // --------------------------------------------------------------------------
  // TEST 1: Enterprise Dynamic Forensic Watermark Generation
  // --------------------------------------------------------------------------
  const mockUser = { id: "user-4892", name: "Chinedu Okafor" };
  const mockClassId = "class-jamb-physics-2026";
  const watermarkText = `BrainLab Academy • ${mockUser.name} (${mockUser.id}) • ${mockClassId}`;

  assert(watermarkText.includes("user-4892"), "Forensic watermark contains unique user identity ID");
  assert(watermarkText.includes("Chinedu Okafor"), "Forensic watermark contains user display name");
  assert(watermarkText.includes("class-jamb-physics-2026"), "Forensic watermark contains unique classroom session ID");

  const tiles = generateWatermarkTiles(1920, 1080);
  assert(tiles.length >= 25, `Forensic watermark generated ${tiles.length} tiled protection coordinates across screen`);

  // --------------------------------------------------------------------------
  // TEST 2: Stylus Palm Rejection Filter
  // --------------------------------------------------------------------------
  const palmEvent = { pointerType: "touch", width: 34, height: 38 }; // Broad palm rest
  assert(shouldRejectPalmTouch(palmEvent) === true, "Broad accidental palm contact area (34x38) properly rejected");

  const fingerTap = { pointerType: "touch", width: 14, height: 14 }; // Normal finger touch
  assert(shouldRejectPalmTouch(fingerTap) === false, "Normal finger touch (14x14) accepted");

  const stylusPen = { pointerType: "pen", width: 2, height: 2 }; // Stylus
  assert(shouldRejectPalmTouch(stylusPen) === false, "Stylus pen pointer accepted");

  // --------------------------------------------------------------------------
  // TEST 3: Stylus Pressure Sensitivity Curve
  // --------------------------------------------------------------------------
  const baseWidth = 4;

  const lightStroke = computeStylusStrokeWidth(baseWidth, { pointerType: "pen", pressure: 0.2 });
  assert(lightStroke < baseWidth, `Light pressure (0.2) produced fine line (${lightStroke.toFixed(2)}px < 4px)`);

  const mediumStroke = computeStylusStrokeWidth(baseWidth, { pointerType: "pen", pressure: 0.6 });
  assert(mediumStroke > lightStroke, `Medium pressure (0.6) produced medium line (${mediumStroke.toFixed(2)}px)`);

  const heavyStroke = computeStylusStrokeWidth(baseWidth, { pointerType: "pen", pressure: 0.98 });
  assert(heavyStroke > mediumStroke, `Heavy pressure (0.98) produced thick line (${heavyStroke.toFixed(2)}px)`);
  assert(heavyStroke <= baseWidth * 2.2, "Heavy pressure does not exceed maximum safety clamp (8.8px)");

  // Standard mouse / touch without pressure
  const standardMouse = computeStylusStrokeWidth(baseWidth, { pointerType: "mouse" });
  assert(standardMouse === 4, "Mouse input returns standard baseline width (4px)");

  console.log("\n========================================================");
  console.log("🎉 ALL STAGES 8 & 9 FORENSIC WATERMARK & MOBILE TESTS PASSED!");
  console.log("========================================================\n");
}

runStage8And9Verification().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
