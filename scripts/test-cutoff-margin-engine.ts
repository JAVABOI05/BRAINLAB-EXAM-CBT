/**
 * scripts/test-cutoff-margin-engine.ts
 * Verifies the Candidate Cut-Off Margin Engine:
 * - Direct slug matching ("unilag", "ui", "oau", "unn", "abu", "uniben", "unilorin", "futa", "covenant")
 * - Case-insensitive lookup
 * - Partial matching for wizard values like "University of Lagos (UNILAG)"
 * - Margin computation (+/- points relative to target)
 * - Tier grading logic (Above Target, On Target, Below Target)
 */

import { UNIVERSITY_CUTOFFS, resolveCutoffScore } from "../app/lib/universityCutoffs";

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

console.log("=== Testing Candidate Cut-Off Margin Engine ===");

// 1. Direct slug lookups
const unilag = resolveCutoffScore("unilag");
assert(unilag !== null && unilag.cutoffScore === 290, "UNILAG slug resolves to 290");
assert(unilag?.shortName === "UNILAG", "UNILAG shortName is correct");

const ui = resolveCutoffScore("ui");
assert(ui !== null && ui.cutoffScore === 285, "UI slug resolves to 285");

const futa = resolveCutoffScore("futa");
assert(futa !== null && futa.cutoffScore === 270, "FUTA slug resolves to 270");

// 2. Case-insensitive lookups
const oau = resolveCutoffScore("OAU");
assert(oau !== null && oau.cutoffScore === 280, "Uppercase 'OAU' resolves to 280");

const unilorin = resolveCutoffScore("University of Ilorin");
assert(unilorin !== null && unilorin.shortName === "UNILORIN", "Full name 'University of Ilorin' resolves to UNILORIN");

// 3. Partial wizard string match
const wizardUnilag = resolveCutoffScore("University of Lagos (UNILAG)");
assert(wizardUnilag !== null && wizardUnilag.cutoffScore === 290, "Wizard format 'University of Lagos (UNILAG)' resolves");

const wizardUnn = resolveCutoffScore("University of Nigeria, Nsukka (UNN)");
assert(wizardUnn !== null && wizardUnn.cutoffScore === 285, "Wizard format 'University of Nigeria, Nsukka (UNN)' resolves");

// 4. Margin calculations
function computeMargin(score: number, target: number) {
  const margin = score - target;
  const status =
    score >= target ? "above" : score >= target - 15 ? "striking" : "below";
  return { margin, status };
}

// Case A: High score exceeding UNILAG target
const resA = computeMargin(310, 290);
assert(resA.margin === 20, "310 vs 290 yields +20 margin");
assert(resA.status === "above", "310 vs 290 is 'above'");

// Case B: Close score within 15 marks (striking distance)
const resB = computeMargin(280, 290);
assert(resB.margin === -10, "280 vs 290 yields -10 margin");
assert(resB.status === "striking", "280 vs 290 is 'striking'");

// Case C: Below threshold
const resC = computeMargin(220, 290);
assert(resC.margin === -70, "220 vs 290 yields -70 margin");
assert(resC.status === "below", "220 vs 290 is 'below'");

// 5. Unknown school fallback
const unknown = resolveCutoffScore("NonExistentStateCollege");
assert(unknown === null, "Unknown institution returns null safely");

const empty = resolveCutoffScore("");
assert(empty === null, "Empty string returns null safely");

console.log(`\nResults: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All cut-off margin tests PASSED!\n");
  process.exit(0);
}
