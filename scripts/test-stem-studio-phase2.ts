import {
  QuadraticGraphAdapter,
  DEFAULT_QUADRATIC_STATE,
  computeQuadraticTelemetry,
  type StemSynchronizedEvent,
} from "../app/components/classroom/whiteboard/stemAdapter";

async function runPhase2VerificationSuite() {
  console.log("==================================================================");
  console.log("🔬 BRAINLAB STEM STUDIO — PHASE 2 VERIFICATION TEST SUITE");
  console.log("Target: Walking Skeleton, Document C Liveboard Sync & Mode A");
  console.log("Specification: BRAINLAB STEM STUDIO Blueprint v3.0 (BL-STEM-002)");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------------------
  // TEST 1: Adapter Initialization & Version Pinning
  // -------------------------------------------------------------------------
  try {
    console.log("▶ TEST 1: Adapter Initialization & Version Pinning");
    const adapter = new QuadraticGraphAdapter();
    adapter.init(DEFAULT_QUADRATIC_STATE, true);

    const snapshot = adapter.getSnapshot();
    if (
      snapshot.a === 1 &&
      snapshot.b === -2 &&
      snapshot.c === -3 &&
      adapter.getVersion() === "1.0.0" &&
      adapter.getSimulationId() === "math-quadratic-explorer"
    ) {
      console.log("  [PASS] Adapter initialized with correct pinned version 1.0.0 and defaults.");
      passed++;
    } else {
      throw new Error(`Unexpected initial state: ${JSON.stringify(snapshot)}`);
    }
  } catch (err: any) {
    console.error("  [FAIL] Test 1 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 2: Mathematical Telemetry Accuracy (Positive, Zero, Negative Discriminants)
  // -------------------------------------------------------------------------
  try {
    console.log("\n▶ TEST 2: Mathematical Telemetry Accuracy Across Discriminants");

    // Case A: 2 real roots (a=1, b=0, c=-4 => Delta = 16, roots = -2, 2, vertex = 0, -4)
    const telA = computeQuadraticTelemetry({ a: 1, b: 0, c: -4 });
    if (
      telA.discriminant === 16 &&
      telA.natureOfRoots === "real_distinct" &&
      telA.roots.r1 === -2 &&
      telA.roots.r2 === 2 &&
      telA.vertex.x === 0 &&
      telA.vertex.y === -4 &&
      telA.curvature === "concave_up"
    ) {
      console.log("  [PASS] Case A (Delta > 0, 2 real roots) verified exactly.");
    } else {
      throw new Error(`Case A failed: ${JSON.stringify(telA)}`);
    }

    // Case B: 1 coincident root (a=1, b=-4, c=4 => Delta = 0, root = 2, vertex = 2, 0)
    const telB = computeQuadraticTelemetry({ a: 1, b: -4, c: 4 });
    if (
      telB.discriminant === 0 &&
      telB.natureOfRoots === "coincident" &&
      telB.roots.r1 === 2 &&
      telB.roots.r2 === 2 &&
      telB.vertex.x === 2 &&
      telB.vertex.y === 0
    ) {
      console.log("  [PASS] Case B (Delta = 0, coincident root) verified exactly.");
    } else {
      throw new Error(`Case B failed: ${JSON.stringify(telB)}`);
    }

    // Case C: 0 real roots (a=1, b=0, c=4 => Delta = -16, roots = null, vertex = 0, 4)
    const telC = computeQuadraticTelemetry({ a: 1, b: 0, c: 4 });
    if (
      telC.discriminant === -16 &&
      telC.natureOfRoots === "complex" &&
      telC.roots.r1 === null &&
      telC.roots.r2 === null &&
      telC.vertex.x === 0 &&
      telC.vertex.y === 4
    ) {
      console.log("  [PASS] Case C (Delta < 0, complex roots) verified exactly.");
      passed++;
    } else {
      throw new Error(`Case C failed: ${JSON.stringify(telC)}`);
    }
  } catch (err: any) {
    console.error("  [FAIL] Test 2 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 3: Monotonic Sequence Numbers & Idempotency UUID Generation
  // -------------------------------------------------------------------------
  try {
    console.log("\n▶ TEST 3: Monotonic Sequence Numbers & Idempotency Generation");
    const tutorAdapter = new QuadraticGraphAdapter();
    tutorAdapter.init(DEFAULT_QUADRATIC_STATE, true);

    const event1 = tutorAdapter.createParamChangeEvent("room-123", "tutor-1", { a: 2 });
    const event2 = tutorAdapter.createParamChangeEvent("room-123", "tutor-1", { b: -3 });
    const event3 = tutorAdapter.createParamChangeEvent("room-123", "tutor-1", { c: 1 });

    const key1 = event1.idempotencyKey || event1.eventId;
    const key2 = event2.idempotencyKey || event2.eventId;
    const key3 = event3.idempotencyKey || event3.eventId;

    if (
      event1.sequenceNumber === 1 &&
      event2.sequenceNumber === 2 &&
      event3.sequenceNumber === 3 &&
      key1 !== key2 &&
      key2 !== key3 &&
      event1.version === "1.0.0"
    ) {
      console.log(`  [PASS] Monotonic sequences [1, 2, 3] and distinct UUID idempotency keys generated.`);
      passed++;
    } else {
      throw new Error(`Sequence error: ${event1.sequenceNumber}, ${event2.sequenceNumber}, ${event3.sequenceNumber}`);
    }
  } catch (err: any) {
    console.error("  [FAIL] Test 3 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 4: Mode A Event Application & Drift Prevention
  // -------------------------------------------------------------------------
  try {
    console.log("\n▶ TEST 4: Mode A Tutor Authoritative Sync & Student Ingestion");
    const tutor = new QuadraticGraphAdapter();
    tutor.init(DEFAULT_QUADRATIC_STATE, true);

    const student = new QuadraticGraphAdapter();
    student.init(DEFAULT_QUADRATIC_STATE, false);

    // Tutor changes parameters
    const ev1 = tutor.createParamChangeEvent("room-123", "tutor-1", { a: -0.5, b: 2, c: 3 });
    const applied1 = student.applyEvent(ev1);

    const studentState = student.getSnapshot();
    if (
      applied1 &&
      studentState.a === -0.5 &&
      studentState.b === 2 &&
      studentState.c === 3
    ) {
      console.log("  [PASS] Event 1 successfully applied on student adapter with zero drift.");
    } else {
      throw new Error("Student failed to apply event 1 correctly.");
    }

    // Deduplication check: Student receiving duplicate idempotency key must safely ignore it
    const appliedDuplicate = student.applyEvent(ev1);
    if (!appliedDuplicate) {
      console.log("  [PASS] Duplicate event idempotency key cleanly detected and ignored.");
    } else {
      throw new Error("Duplicate event was mistakenly re-applied!");
    }

    // Out-of-order sequence check
    const staleEv = {
      ...ev1,
      eventId: "stale-key-999",
      idempotencyKey: "stale-key-999",
      sequenceNumber: 0,
      timestamp: Date.now() - 5000,
    };
    const appliedStale = student.applyEvent(staleEv);
    if (!appliedStale) {
      console.log("  [PASS] Stale sequence number rejected by student adapter.");
      passed++;
    } else {
      throw new Error("Stale sequence was accepted!");
    }
  } catch (err: any) {
    console.error("  [FAIL] Test 4 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 5: Late-Joiner Reconnect & Snapshot Hydration Recovery
  // -------------------------------------------------------------------------
  try {
    console.log("\n▶ TEST 5: Late-Joiner Reconnect & Snapshot Hydration (<10ms)");
    const activeTutor = new QuadraticGraphAdapter();
    activeTutor.init({ a: 3, b: -6, c: 2 }, true);

    // Run 5 parameter change cycles on tutor
    for (let i = 0; i < 5; i++) {
      activeTutor.createParamChangeEvent("room-123", "tutor-1", { c: i * 2 });
    }

    const tutorSnapshot = activeTutor.getSnapshot();

    // Late joiner arrives
    const t0 = performance.now();
    const lateJoiner = new QuadraticGraphAdapter();
    lateJoiner.init(tutorSnapshot, false);
    const durationMs = performance.now() - t0;

    const restoredState = lateJoiner.getSnapshot();
    if (
      restoredState.a === 3 &&
      restoredState.b === -6 &&
      restoredState.c === 8 &&
      durationMs < 10
    ) {
      console.log(`  [PASS] Late-joiner hydrated in ${durationMs.toFixed(3)}ms (< 10ms target) with full fidelity.`);
      passed++;
    } else {
      throw new Error(`Hydration mismatch or slow: took ${durationMs}ms, state: ${JSON.stringify(restoredState)}`);
    }
  } catch (err: any) {
    console.error("  [FAIL] Test 5 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 6: Whiteboard Snapshot Stamping Format
  // -------------------------------------------------------------------------
  try {
    console.log("\n▶ TEST 6: Whiteboard SVG Snapshot Generation");
    const adapter = new QuadraticGraphAdapter();
    adapter.init({ a: 1, b: 0, c: -4 }, false);

    const svgSnapshot = adapter.exportSvg(640, 480, "dark");
    const decodedSvg = decodeURIComponent(svgSnapshot);
    if (
      svgSnapshot.startsWith("data:image/svg+xml;utf8,") &&
      decodedSvg.includes("<svg") &&
      decodedSvg.includes("path") &&
      decodedSvg.includes("y = 1x²") &&
      decodedSvg.includes("Roots: -2, 2")
    ) {
      console.log("  [PASS] SVG snapshot generated with embedded telemetry labels and valid SVG payload.");
      passed++;
    } else {
      throw new Error(`Invalid SVG snapshot: ${svgSnapshot.slice(0, 100)}...`);
    }
  } catch (err: any) {
    console.error("  [FAIL] Test 6 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2VerificationSuite().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
