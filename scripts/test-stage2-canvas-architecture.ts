import {
  BoundingBox,
  getElementBoundingBox,
  getElementsBoundingBox,
  hitTestElement,
  getBoundingBoxHandles,
  hitTestHandle,
  translateElement,
  scaleElement,
  boxesIntersect,
  getVirtualDimensions,
  screenToVirtualPoint,
  rotatePoint,
  VIRTUAL_CANVAS_WIDTH,
  VIRTUAL_CANVAS_HEIGHT,
} from "../app/components/classroom/whiteboard/geometry";
import type { WhiteboardElement } from "../app/components/SmartWhiteboard";

function generateTestElements(count: number): WhiteboardElement[] {
  const elements: WhiteboardElement[] = [];
  for (let i = 0; i < count; i++) {
    const type = i % 4 === 0 ? "pen" : i % 4 === 1 ? "rect" : i % 4 === 2 ? "circle" : "line";
    const x = (i * 37) % (VIRTUAL_CANVAS_WIDTH - 200) + 50;
    const y = (i * 23) % (VIRTUAL_CANVAS_HEIGHT - 200) + 50;
    const w = 40 + (i % 60);
    const h = 30 + (i % 40);

    if (type === "pen") {
      const points = [];
      for (let p = 0; p < 8; p++) {
        points.push({ x: x + p * 5, y: y + Math.sin(p) * 10 });
      }
      elements.push({
        id: `el-pen-${i}`,
        type: "pen",
        color: "#3b82f6",
        width: 3,
        points,
      });
    } else if (type === "rect") {
      elements.push({
        id: `el-rect-${i}`,
        type: "rect",
        color: "#10b981",
        width: 2,
        startX: x,
        startY: y,
        endX: x + w,
        endY: y + h,
      });
    } else if (type === "circle") {
      elements.push({
        id: `el-circle-${i}`,
        type: "circle",
        color: "#f59e0b",
        width: 2,
        startX: x,
        startY: y,
        endX: x + w,
        endY: y + h,
      });
    } else {
      elements.push({
        id: `el-line-${i}`,
        type: "line",
        color: "#ef4444",
        width: 2,
        startX: x,
        startY: y,
        endX: x + w,
        endY: y + h,
      });
    }
  }
  return elements;
}

async function runStage2Tests() {
  console.log("=================================================================");
  console.log("BRAINLAB LIVEBOARD STAGE 2 - BENCHMARK & VERIFICATION SUITE");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: unknown, name: string, detail?: string) {
    if (Boolean(condition)) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}${detail ? ` -> ${detail}` : ""}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // 1. BENCHMARK: 1,000 Elements Bounding Box & Transformation Speed
  // -----------------------------------------------------------------
  console.log("1. BENCHMARK: 1,000 VECTOR ELEMENTS PROCESSING");
  const thousandElements = generateTestElements(1000);
  assert(thousandElements.length === 1000, "Generated 1,000 vector elements");

  const startBoxTime = performance.now();
  for (let f = 0; f < 30; f++) {
    const unionBox = getElementsBoundingBox(thousandElements);
    if (!unionBox) throw new Error("Union box failed");
  }
  const endBoxTime = performance.now();
  const avgBoxMs = (endBoxTime - startBoxTime) / 30;
  console.log(`   30-frame bounding box calculation: ${avgBoxMs.toFixed(3)} ms/frame`);
  assert(avgBoxMs < 5.0, "Bounding box calculation over 1,000 items is sub-5ms (target < 5ms)", `${avgBoxMs.toFixed(2)}ms`);

  // -----------------------------------------------------------------
  // 2. BENCHMARK: Hit-Testing Latency over 1,000 Elements
  // -----------------------------------------------------------------
  console.log("\n2. BENCHMARK: HIT-TESTING LATENCY OVER 1,000 ELEMENTS");
  const hitQueries = Array.from({ length: 200 }, (_, i) => ({
    x: (i * 73) % VIRTUAL_CANVAS_WIDTH,
    y: (i * 59) % VIRTUAL_CANVAS_HEIGHT,
  }));

  const startHitTime = performance.now();
  let hitsFound = 0;
  for (const q of hitQueries) {
    // Reverse hit test (topmost element first)
    for (let j = thousandElements.length - 1; j >= 0; j--) {
      if (hitTestElement(thousandElements[j], q.x, q.y, 8)) {
        hitsFound++;
        break;
      }
    }
  }
  const endHitTime = performance.now();
  const avgHitMs = (endHitTime - startHitTime) / hitQueries.length;
  console.log(`   Hit-test query over 1,000 elements: ${avgHitMs.toFixed(4)} ms/query (hits found: ${hitsFound})`);
  assert(avgHitMs < 2.0, "Hit-testing latency is sub-2ms (target < 2ms)", `${avgHitMs.toFixed(3)}ms`);

  // -----------------------------------------------------------------
  // 3. TEST: Transform Handles & Bounding Box Computation
  // -----------------------------------------------------------------
  console.log("\n3. SELECTION HANDLES & BOUNDING BOX INTEGRITY");
  const sampleRect: WhiteboardElement = {
    id: "test-rect-1",
    type: "rect",
    color: "#3b82f6",
    width: 2,
    startX: 200,
    startY: 150,
    endX: 400,
    endY: 300,
  };

  const box1 = getElementBoundingBox(sampleRect);
  assert(box1.width >= 200 && box1.height >= 150, "Bounding box correctly encloses rectangle dimensions");
  assert(Math.abs(box1.centerX - 300) <= 2, "Bounding box center X is accurate (300)");
  assert(Math.abs(box1.centerY - 225) <= 2, "Bounding box center Y is accurate (225)");

  const handles = getBoundingBoxHandles(box1);
  assert(handles.length === 9, "Generates exactly 9 handles (8 resize + 1 rotation stem)");

  const rotHandle = handles.find((h) => h.type === "rot");
  assert(Boolean(rotHandle && rotHandle.y < box1.minY), "Rotation handle is placed above top edge");

  const hitHandleResult = hitTestHandle(handles, rotHandle!.x, rotHandle!.y, 5);
  assert(hitHandleResult?.type === "rot", "Hit-testing detects rotation handle accurately");

  // -----------------------------------------------------------------
  // 4. TEST: Transformation Engine (Translation, Scale, Rotation)
  // -----------------------------------------------------------------
  console.log("\n4. TRANSFORMATION OPERATIONS (MOVE, SCALE, ROTATE)");
  // A. Translation
  const moved = translateElement(sampleRect, 50, -30);
  assert(moved.startX === 250 && moved.startY === 120, "Translation shifts start coordinates by (+50, -30)");
  assert(moved.endX === 450 && moved.endY === 270, "Translation shifts end coordinates by (+50, -30)");

  // B. Scaling
  const newBox: BoundingBox = {
    minX: 200,
    minY: 150,
    maxX: 600,
    maxY: 450,
    width: 400,
    height: 300,
    centerX: 400,
    centerY: 300,
  };
  const scaled = scaleElement(sampleRect, box1, newBox);
  const scaledBox = getElementBoundingBox(scaled);
  assert(scaledBox.width >= 390, "Scaling doubles rectangle width (400px)");
  assert(scaledBox.height >= 290, "Scaling doubles rectangle height (300px)");

  // C. Rotation & Rotated Hit Testing
  const rotatedRect: WhiteboardElement = {
    ...sampleRect,
    rotation: Math.PI / 2, // 90 degrees
  };
  const rotatedBox = getElementBoundingBox(rotatedRect);
  assert(rotatedBox.width > 0 && rotatedBox.height > 0, "Rotated element computes valid axis-aligned envelope");

  // Point at center of rectangle must hit rotated element
  const centerHit = hitTestElement(rotatedRect, box1.centerX, box1.centerY, 5);
  assert(centerHit === true, "Hit test succeeds at center of rotated element");

  // -----------------------------------------------------------------
  // 5. TEST: Cross-Device Virtual Page Coordinate Normalization
  // -----------------------------------------------------------------
  console.log("\n5. CROSS-DEVICE VIRTUAL PAGE COORDINATE NORMALIZATION");
  const viewports = [
    { name: "Desktop (1920x1080 container)", rect: { left: 0, top: 0, width: 1920, height: 1080 } },
    { name: "Tablet (1024x768 container)", rect: { left: 50, top: 20, width: 924, height: 520 } },
    { name: "Mobile (375x667 container)", rect: { left: 0, top: 100, width: 375, height: 211 } },
  ];

  for (const vp of viewports) {
    // Click at the exact geometric center of each container
    const clientX = vp.rect.left + vp.rect.width / 2;
    const clientY = vp.rect.top + vp.rect.height / 2;
    const vPoint = screenToVirtualPoint(clientX, clientY, vp.rect, 1, "16 / 9");

    console.log(`   ${vp.name} center (${clientX.toFixed(1)}, ${clientY.toFixed(1)}) -> Virtual (${vPoint.x.toFixed(1)}, ${vPoint.y.toFixed(1)})`);
    assert(
      Math.abs(vPoint.x - 960) < 1.0 && Math.abs(vPoint.y - 540) < 1.0,
      `${vp.name} normalizes center click to virtual (960, 540)`
    );
  }

  // -----------------------------------------------------------------
  // 6. TEST: Marquee Intersection & Multi-Select
  // -----------------------------------------------------------------
  console.log("\n6. MARQUEE SELECTION & GROUP INTERSECTION");
  const marquee = { minX: 180, minY: 130, maxX: 420, maxY: 320 };
  assert(boxesIntersect(box1, marquee) === true, "Marquee box enclosing sampleRect intersects correctly");

  const outsideMarquee = { minX: 800, minY: 800, maxX: 900, maxY: 900 };
  assert(boxesIntersect(box1, outsideMarquee) === false, "Marquee outside element does not trigger false intersection");

  console.log("\n-----------------------------------------------------------------");
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("-----------------------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  }
}

runStage2Tests().catch((err) => {
  console.error("Stage 2 test failure:", err);
  process.exit(1);
});
