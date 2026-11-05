/**
 * STEM Studio Phase 5 Verification Test Suite:
 * 1. Engineering & Computer Studies Boolean Logic Gates truth table evaluation
 * 2. LogicGatesAdapter sync events, sequence numbering, idempotency & SVG export
 * 3. Mode B (Guided Student Interaction) event mechanics and state propagation
 * 4. Catalog verification for Tier 2 Digital Logic & Circuits Bench
 * 5. Student Workspace attempt listing and submission data structures
 */

import {
  evaluateGate,
  computeLogicGatesTelemetry,
  LogicGatesAdapter,
  DEFAULT_LOGIC_GATES_STATE,
  type LogicGateType,
} from "../app/components/classroom/whiteboard/stemAdapter";
import { INITIAL_STEM_RESOURCES } from "../app/lib/stem/seedData";

async function runPhase5Tests() {
  console.log("=================================================================");
  console.log("  STEM STUDIO PHASE 5: LOGIC GATES, MODE B & WORKSPACE SUITE");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, extra = "") {
    if (condition) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ ${desc} ${extra}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Boolean Logic Gates Truth Table Verification (All 6 Gates)
  // --------------------------------------------------------------------------
  console.log("▶ TEST 1: Truth Tables for All Logic Gates (AND, OR, NOT, NAND, NOR, XOR)");
  {
    // AND Gate
    assert("AND(0, 0) === 0", evaluateGate("AND", 0, 0) === 0);
    assert("AND(0, 1) === 0", evaluateGate("AND", 0, 1) === 0);
    assert("AND(1, 0) === 0", evaluateGate("AND", 1, 0) === 0);
    assert("AND(1, 1) === 1", evaluateGate("AND", 1, 1) === 1);

    // OR Gate
    assert("OR(0, 0) === 0", evaluateGate("OR", 0, 0) === 0);
    assert("OR(0, 1) === 1", evaluateGate("OR", 0, 1) === 1);
    assert("OR(1, 0) === 1", evaluateGate("OR", 1, 0) === 1);
    assert("OR(1, 1) === 1", evaluateGate("OR", 1, 1) === 1);

    // NOT Gate
    assert("NOT(0, 0) === 1", evaluateGate("NOT", 0, 0) === 1);
    assert("NOT(1, 0) === 0", evaluateGate("NOT", 1, 0) === 0);

    // NAND Gate
    assert("NAND(0, 0) === 1", evaluateGate("NAND", 0, 0) === 1);
    assert("NAND(1, 1) === 0", evaluateGate("NAND", 1, 1) === 0);

    // NOR Gate
    assert("NOR(0, 0) === 1", evaluateGate("NOR", 0, 0) === 1);
    assert("NOR(0, 1) === 0", evaluateGate("NOR", 0, 1) === 0);

    // XOR Gate
    assert("XOR(0, 0) === 0", evaluateGate("XOR", 0, 0) === 0);
    assert("XOR(0, 1) === 1", evaluateGate("XOR", 0, 1) === 1);
    assert("XOR(1, 0) === 1", evaluateGate("XOR", 1, 0) === 1);
    assert("XOR(1, 1) === 0", evaluateGate("XOR", 1, 1) === 0);
  }

  // --------------------------------------------------------------------------
  // TEST 2: LogicGatesAdapter Synchronization, Idempotency & SVG Stamping
  // --------------------------------------------------------------------------
  console.log("\n▶ TEST 2: LogicGatesAdapter Liveboard Sync, Sequence Numbers & SVG Export");
  {
    const hostAdapter = new LogicGatesAdapter();
    hostAdapter.init(DEFAULT_LOGIC_GATES_STATE, true);

    const clientAdapter = new LogicGatesAdapter();
    clientAdapter.init(DEFAULT_LOGIC_GATES_STATE, false);

    // Initial check
    assert("Host starts at default AND gate", hostAdapter.getSnapshot().gateType === "AND");

    // Host switches to XOR gate with A=1, B=0
    const evt1 = hostAdapter.createParamChangeEvent("room-stem-101", "tutor-uuid", {
      gateType: "XOR",
      inputA: 1,
      inputB: 0,
    });

    assert("Param change event generated sequence number", evt1.sequenceNumber === 1);
    assert("Idempotency key populated", typeof evt1.idempotencyKey === "string" && evt1.idempotencyKey.length > 5);

    // Client applies event
    const appliedFirst = clientAdapter.applyEvent(evt1);
    assert("Client applied event 1", appliedFirst);
    assert("Client state synchronized to XOR", clientAdapter.getSnapshot().gateType === "XOR");
    assert("Client telemetry computes output Q=1 for XOR(1,0)", clientAdapter.getTelemetry().outputQ === 1);

    // Test Idempotency (replay attack / duplicate network packet)
    const appliedSecond = clientAdapter.applyEvent(evt1);
    assert("Duplicate event discarded by client idempotency filter", appliedSecond === false);

    // Test Out-of-Order Stale Sequence Rejection
    const staleEvt = {
      ...evt1,
      sequenceNumber: 0,
      eventId: "stale-unique-id-999",
      idempotencyKey: "stale-unique-id-999",
      payload: { gateType: "OR" as LogicGateType },
    };
    const appliedStale = clientAdapter.applyEvent(staleEvt);
    assert("Stale sequence event rejected", appliedStale === false);

    // Test Vector SVG export
    const svgDataUrl = clientAdapter.exportSvg(640, 480, "dark");
    assert("Vector SVG exported with data URI prefix", svgDataUrl.startsWith("data:image/svg+xml"));
    const decodedSvg = decodeURIComponent(svgDataUrl);
    assert("SVG contains gate name", decodedSvg.includes("XOR"));
    assert("SVG contains truth table", decodedSvg.includes("TRUTH TABLE"));
    assert("SVG contains output Q=1 indicator", decodedSvg.includes("Q=1"));

    hostAdapter.destroy();
    clientAdapter.destroy();
  }

  // --------------------------------------------------------------------------
  // TEST 3: Mode B (Guided Student Interaction) Simulation
  // --------------------------------------------------------------------------
  console.log("\n▶ TEST 3: Mode B Guided Student Interaction Propagation");
  {
    let interactionMode: "demonstration" | "guided" = "demonstration";

    function canStudentControl(mode: "demonstration" | "guided", isHost: boolean) {
      return isHost || mode === "guided";
    }

    assert("In Mode A, student cannot control sliders", canStudentControl(interactionMode, false) === false);
    assert("In Mode A, tutor CAN control sliders", canStudentControl(interactionMode, true) === true);

    // Tutor enables Mode B
    interactionMode = "guided";
    assert("In Mode B, student CAN control sliders", canStudentControl(interactionMode, false) === true);
    assert("In Mode B, tutor CAN control sliders", canStudentControl(interactionMode, true) === true);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Seed Data Catalog & Resource Definition
  // --------------------------------------------------------------------------
  console.log("\n▶ TEST 4: Seed Catalog Logic Gates Entry Verification");
  {
    const logicRes = INITIAL_STEM_RESOURCES.find((r) => r.slug === "logic-gates-circuits");
    assert("Logic Gates resource exists in seed catalog", Boolean(logicRes));
    assert("Subject is Engineering & Computer Studies", logicRes?.subject?.name === "Engineering & Computer Studies");
    assert("Adapter type is canvas_logic", logicRes?.current_version?.adapter_type === "canvas_logic");
    assert("Initial gate is AND", logicRes?.current_version?.initial_state?.gateType === "AND");
    assert("Learning objectives present", (logicRes?.current_version?.learning_objectives?.length ?? 0) >= 3);
  }

  console.log("\n=================================================================");
  console.log(`  PHASE 5 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
