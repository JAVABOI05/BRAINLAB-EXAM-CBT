import {
  QuadraticGraphAdapter,
  ProjectileMotionAdapter,
  computeProjectileTelemetry,
  OhmsLawCircuitAdapter,
  computeCircuitTelemetry,
  AcidBaseTitrationAdapter,
  computeTitrationTelemetry,
  GeneticsPunnettAdapter,
  computeGeneticsTelemetry,
} from "../app/components/classroom/whiteboard/stemAdapter";

async function runPhase3VerificationSuite() {
  console.log("==================================================================");
  console.log("🔬 BRAINLAB STEM STUDIO — PHASE 3 MULTI-DISCIPLINARY SUITE");
  console.log("Target: Physics, Chemistry, Biology & Multi-Lab Liveboard Sync");
  console.log("Specification: BRAINLAB STEM STUDIO Blueprint v3.0 (BL-STEM-002)");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------------------
  // TEST 1: Physics — Projectile Motion Kinematic Accuracy & Gravity Presets
  // -------------------------------------------------------------------------
  try {
    console.log("▶ TEST 1: Physics — Projectile Motion Kinematics (Earth & Moon)");
    const projEarth = computeProjectileTelemetry({
      v0: 25,
      angleDeg: 45,
      gravity: 9.8,
      h0: 0,
    });

    // Verification of theoretical kinematics:
    // H = (25*sin(45))^2 / (2*9.8) = 312.5 / 19.6 = 15.94 m
    // T = 2 * (25*sin(45)) / 9.8 = 3.61 s
    // R = 25*cos(45) * 3.61 = 63.78 m
    if (
      Math.abs(projEarth.maxHeight - 15.94) <= 0.05 &&
      Math.abs(projEarth.timeOfFlight - 3.61) <= 0.05 &&
      Math.abs(projEarth.totalRange - 63.78) <= 0.1
    ) {
      console.log(`  [PASS] Earth Kinematics Verified: H_max=${projEarth.maxHeight}m, T_flight=${projEarth.timeOfFlight}s, Range=${projEarth.totalRange}m`);
    } else {
      throw new Error(`Earth kinematics deviation: ${JSON.stringify(projEarth)}`);
    }

    // Moon Kinematics (g = 1.62 m/s^2)
    const projMoon = computeProjectileTelemetry({
      v0: 25,
      angleDeg: 45,
      gravity: 1.62,
      h0: 0,
    });

    if (projMoon.maxHeight > projEarth.maxHeight * 5 && projMoon.totalRange > projEarth.totalRange * 5) {
      console.log(`  [PASS] Moon Kinematics Verified: Range increased 6x to ${projMoon.totalRange}m under 1.62 m/s² gravity.`);
      passed++;
    } else {
      throw new Error(`Moon kinematics mismatch: ${JSON.stringify(projMoon)}`);
    }
  } catch (err: any) {
    console.error("  [FAIL] Test 1 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 2: Physics — Ohm's Law & DC Circuit Analysis (Single, Series, Parallel)
  // -------------------------------------------------------------------------
  try {
    console.log("\n▶ TEST 2: Physics — Ohm's Law & DC Circuit Analysis");

    // Case A: Single 6-ohm resistor at 12V => I = 2A, P = 24W
    const circSingle = computeCircuitTelemetry({
      voltage: 12,
      resistance: 6,
      circuitType: "single",
      r2: 6,
    });

    if (circSingle.equivalentResistance === 6 && circSingle.currentAmps === 2 && circSingle.powerWatts === 24) {
      console.log("  [PASS] Single Resistor Verified: 12V / 6Ω = 2.0A, 24.0W.");
    } else {
      throw new Error(`Single circuit failed: ${JSON.stringify(circSingle)}`);
    }

    // Case B: Series resistors (6Ω + 6Ω = 12Ω) => I = 1A, P = 12W
    const circSeries = computeCircuitTelemetry({
      voltage: 12,
      resistance: 6,
      circuitType: "series",
      r2: 6,
    });

    if (circSeries.equivalentResistance === 12 && circSeries.currentAmps === 1 && circSeries.powerWatts === 12) {
      console.log("  [PASS] Series Resistors Verified: Req=12Ω, I=1.0A, P=12.0W.");
    } else {
      throw new Error(`Series circuit failed: ${JSON.stringify(circSeries)}`);
    }

    // Case C: Parallel resistors (6Ω || 6Ω = 3Ω) => I = 4A, P = 48W
    const circParallel = computeCircuitTelemetry({
      voltage: 12,
      resistance: 6,
      circuitType: "parallel",
      r2: 6,
    });

    if (circParallel.equivalentResistance === 3 && circParallel.currentAmps === 4 && circParallel.powerWatts === 48) {
      console.log("  [PASS] Parallel Resistors Verified: Req=3Ω, I=4.0A, P=48.0W (Thermal Overload detected).");
      passed++;
    } else {
      throw new Error(`Parallel circuit failed: ${JSON.stringify(circParallel)}`);
    }
  } catch (err: any) {
    console.error("  [FAIL] Test 2 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 3: Chemistry — Acid-Base Neutralization & Indicator Color Shifts
  // -------------------------------------------------------------------------
  try {
    console.log("\n▶ TEST 3: Chemistry — Acid-Base Titration & Phenolphthalein Transition");

    // Initial acidic condition (0 mL NaOH)
    const titrInitial = computeTitrationTelemetry({
      analyte: "HCl",
      analyteVolumeMl: 25,
      analyteMolarity: 0.1,
      titrantMolarity: 0.1,
      titrantAddedMl: 0,
      indicator: "phenolphthalein",
    });

    if (titrInitial.equivalenceVolumeMl === 25 && titrInitial.currentPh === 1 && titrInitial.solutionColorName === "Colorless") {
      console.log(`  [PASS] Initial Acidic Verified: pH=${titrInitial.currentPh}, Indicator=Colorless.`);
    } else {
      throw new Error(`Initial titration failed: ${JSON.stringify(titrInitial)}`);
    }

    // Equivalence point (25 mL NaOH)
    const titrEquiv = computeTitrationTelemetry({
      analyte: "HCl",
      analyteVolumeMl: 25,
      analyteMolarity: 0.1,
      titrantMolarity: 0.1,
      titrantAddedMl: 25,
      indicator: "phenolphthalein",
    });

    if (titrEquiv.currentPh === 7 && titrEquiv.status === "neutral") {
      console.log(`  [PASS] Equivalence Point Verified: Exactly pH=7.00, Neutral.`);
    } else {
      throw new Error(`Equivalence point failed: ${JSON.stringify(titrEquiv)}`);
    }

    // Basic excess (30 mL NaOH) -> Phenolphthalein turns Vibrant Pink
    const titrExcess = computeTitrationTelemetry({
      analyte: "HCl",
      analyteVolumeMl: 25,
      analyteMolarity: 0.1,
      titrantMolarity: 0.1,
      titrantAddedMl: 30,
      indicator: "phenolphthalein",
    });

    if (titrExcess.currentPh > 11 && titrExcess.solutionColorName === "Vibrant Pink" && titrExcess.status === "basic") {
      console.log(`  [PASS] Basic Excess Verified: pH=${titrExcess.currentPh}, Indicator=Vibrant Pink.`);
      passed++;
    } else {
      throw new Error(`Basic excess failed: ${JSON.stringify(titrExcess)}`);
    }
  } catch (err: any) {
    console.error("  [FAIL] Test 3 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 4: Biology — Mendelian Punnett Square Monohybrid & Test Crosses
  // -------------------------------------------------------------------------
  try {
    console.log("\n▶ TEST 4: Biology — Mendelian Genetics Monohybrid Cross (Bb x Bb)");

    // Heterozygous Cross (Bb x Bb)
    const genHetero = computeGeneticsTelemetry({
      maternalAlleles: ["B", "b"],
      paternalAlleles: ["B", "b"],
    });

    if (
      genHetero.homozygousDominantCount === 1 &&
      genHetero.heterozygousCount === 2 &&
      genHetero.homozygousRecessiveCount === 1 &&
      genHetero.dominantPhenotypePct === 75 &&
      genHetero.recessivePhenotypePct === 25
    ) {
      console.log("  [PASS] Heterozygous Cross Verified: 1 BB : 2 Bb : 1 bb (75% Dominant : 25% Recessive).");
    } else {
      throw new Error(`Heterozygous cross failed: ${JSON.stringify(genHetero)}`);
    }

    // Test Cross (Bb x bb)
    const genTest = computeGeneticsTelemetry({
      maternalAlleles: ["B", "b"],
      paternalAlleles: ["b", "b"],
    });

    if (
      genTest.heterozygousCount === 2 &&
      genTest.homozygousRecessiveCount === 2 &&
      genTest.dominantPhenotypePct === 50 &&
      genTest.recessivePhenotypePct === 50
    ) {
      console.log("  [PASS] Test Cross Verified: 50% Dominant : 50% Recessive.");
      passed++;
    } else {
      throw new Error(`Test cross failed: ${JSON.stringify(genTest)}`);
    }
  } catch (err: any) {
    console.error("  [FAIL] Test 4 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 5: Vector SVG Snapshot Export across All 5 STEM Adapters
  // -------------------------------------------------------------------------
  try {
    console.log("\n▶ TEST 5: Vector SVG Snapshot Stamping Across All 5 Adapters");

    const adapters = [
      { name: "Quadratic Parabola", adapter: new QuadraticGraphAdapter() },
      { name: "Projectile Motion", adapter: new ProjectileMotionAdapter() },
      { name: "Ohm's Law Circuit", adapter: new OhmsLawCircuitAdapter() },
      { name: "Acid-Base Titration", adapter: new AcidBaseTitrationAdapter() },
      { name: "Genetics Punnett", adapter: new GeneticsPunnettAdapter() },
    ];

    for (const item of adapters) {
      item.adapter.init();
      const svg = item.adapter.exportSvg(640, 480, "dark");
      const decoded = decodeURIComponent(svg);
      if (
        svg.startsWith("data:image/svg+xml;utf8,") &&
        decoded.includes("<svg") &&
        decoded.includes("</svg>")
      ) {
        console.log(`  [PASS] ${item.name} exported valid vector SVG diagram (${svg.length} chars).`);
      } else {
        throw new Error(`${item.name} failed to generate valid SVG.`);
      }
    }
    passed++;
  } catch (err: any) {
    console.error("  [FAIL] Test 5 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // TEST 6: Multi-Simulation Document C Mode A Authoritative Event Sync
  // -------------------------------------------------------------------------
  try {
    console.log("\n▶ TEST 6: Document C Multi-Simulation Event Protocol & Deduplication");

    const tutor = new ProjectileMotionAdapter();
    tutor.init({ v0: 20, angleDeg: 30, gravity: 9.8, h0: 5 }, true);

    const student = new ProjectileMotionAdapter();
    student.init({ v0: 20, angleDeg: 30, gravity: 9.8, h0: 5 }, false);

    // Tutor adjusts velocity and angle
    const evt1 = tutor.createParamChangeEvent("room-alpha", "tutor-1", { v0: 45, angleDeg: 60 });
    const applied = student.applyEvent(evt1);

    const studentState = student.getSnapshot();
    if (applied && studentState.v0 === 45 && studentState.angleDeg === 60) {
      console.log("  [PASS] Realtime tutor event synchronized to student with zero numerical drift.");
    } else {
      throw new Error("Student failed to synchronize event 1.");
    }

    // Duplicate event must be rejected
    const dup = student.applyEvent(evt1);
    if (!dup) {
      console.log("  [PASS] Duplicate idempotency key rejected.");
      passed++;
    } else {
      throw new Error("Duplicate event was applied!");
    }
  } catch (err: any) {
    console.error("  [FAIL] Test 6 failed:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`PHASE 3 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3VerificationSuite().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
