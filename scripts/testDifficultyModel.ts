import {
  calculateTargetProportions,
  calculateWholeQuestionCounts,
  calculateDifficultyScore,
  calculateTargetDifficultyScoreFromProportions,
  resolveDifficultyDistribution,
  validateManualDifficultyInput,
  selectQuestionsWithDifficultyModel,
  buildDifficultyAuditPayload,
  DEFAULT_REFERENCE_DISTRIBUTIONS,
  GenericEngineQuestion,
} from "../app/lib/difficultyEngine";
import {
  calculateFacilityIndex,
  deriveEmpiricalBand,
  computeItemPsychometrics,
  summarizeSubjectPsychometrics,
} from "../app/lib/psychometrics";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`FAIL: ${testName} - ${details || ""}`);
    failCount++;
  }
}

function assertClose(actual: number, expected: number, testName: string, tol = 0.001) {
  const diff = Math.abs(actual - expected);
  assert(diff <= tol, testName, `Expected ${expected}, got ${actual} (diff: ${diff})`);
}

console.log("=== RUNNING BRAINLAB CBT DIFFICULTY MODEL TEST SUITE ===\n");

// 1. Check Section 2 Default Reference Distributions
assertClose(DEFAULT_REFERENCE_DISTRIBUTIONS.low.easy, 0.70, "Low Easy = 70%");
assertClose(DEFAULT_REFERENCE_DISTRIBUTIONS.low.medium, 0.25, "Low Medium = 25%");
assertClose(DEFAULT_REFERENCE_DISTRIBUTIONS.low.hard, 0.05, "Low Hard = 5%");

assertClose(DEFAULT_REFERENCE_DISTRIBUTIONS.medium.easy, 0.30, "Medium Easy = 30%");
assertClose(DEFAULT_REFERENCE_DISTRIBUTIONS.medium.medium, 0.40, "Medium Medium = 40%");
assertClose(DEFAULT_REFERENCE_DISTRIBUTIONS.medium.hard, 0.30, "Medium Hard = 30%");

assertClose(DEFAULT_REFERENCE_DISTRIBUTIONS.high.easy, 0.10, "High Easy = 10%");
assertClose(DEFAULT_REFERENCE_DISTRIBUTIONS.high.medium, 0.25, "High Medium = 25%");
assertClose(DEFAULT_REFERENCE_DISTRIBUTIONS.high.hard, 0.65, "High Hard = 65%");

// 2. Continuous Slider Interpolation at boundary points
const at0 = calculateTargetProportions(0);
assertClose(at0.easy, 0.70, "S=0 Easy proportion");
assertClose(at0.medium, 0.25, "S=0 Medium proportion");
assertClose(at0.hard, 0.05, "S=0 Hard proportion");

const at50 = calculateTargetProportions(50);
assertClose(at50.easy, 0.30, "S=50 Easy proportion");
assertClose(at50.medium, 0.40, "S=50 Medium proportion");
assertClose(at50.hard, 0.30, "S=50 Hard proportion");

const at100 = calculateTargetProportions(100);
assertClose(at100.easy, 0.10, "S=100 Easy proportion");
assertClose(at100.medium, 0.25, "S=100 Medium proportion");
assertClose(at100.hard, 0.65, "S=100 Hard proportion");

// 3. Section 6 Worked Example:
// Slider position S = 75, Total questions N = 40
// Expected: Easy = 20% (8), Medium = 32.5% (13), Hard = 47.5% (19)
// Expected target score: 63.75
const at75 = calculateTargetProportions(75);
assertClose(at75.easy, 0.20, "S=75 Easy target is 20%");
assertClose(at75.medium, 0.325, "S=75 Medium target is 32.5%");
assertClose(at75.hard, 0.475, "S=75 Hard target is 47.5%");

const counts75 = calculateWholeQuestionCounts(40, at75);
assert(counts75.easy === 8, "S=75, N=40 Easy count is exactly 8", `Got ${counts75.easy}`);
assert(counts75.medium === 13, "S=75, N=40 Medium count is exactly 13", `Got ${counts75.medium}`);
assert(counts75.hard === 19, "S=75, N=40 Hard count is exactly 19", `Got ${counts75.hard}`);
assert(counts75.easy + counts75.medium + counts75.hard === 40, "Counts sum to exactly 40");

const score75 = calculateDifficultyScore(counts75);
assertClose(score75, 63.75, "Section 6 worked example score = 63.75");

const scoreFromProp75 = calculateTargetDifficultyScoreFromProportions(at75);
assertClose(scoreFromProp75, 63.75, "Target score from proportions = 63.75");

// 4. Largest-Remainder Rounding (Hamilton/Hare-Niemeyer) across arbitrary assessment sizes
const testSizes = [1, 7, 10, 13, 20, 25, 33, 40, 50, 60, 85, 100, 180];
for (const N of testSizes) {
  for (let s = 0; s <= 100; s += 12.5) {
    const prop = calculateTargetProportions(s);
    const c = calculateWholeQuestionCounts(N, prop);
    const sum = c.easy + c.medium + c.hard;
    if (sum !== N) {
      assert(false, `Largest remainder sum test for N=${N}, S=${s}`, `Sum was ${sum}, expected ${N}`);
    }
  }
}
assert(true, "All test sizes (N=1..180) across all slider positions sum strictly to N");

// 5. Difficulty Score calculation interpretation
assertClose(calculateDifficultyScore({ easy: 40, medium: 0, hard: 0 }), 0, "100% Easy = score 0");
assertClose(calculateDifficultyScore({ easy: 0, medium: 40, hard: 0 }), 50, "100% Medium = score 50");
assertClose(calculateDifficultyScore({ easy: 0, medium: 0, hard: 40 }), 100, "100% Hard = score 100");
assertClose(calculateDifficultyScore({ easy: 10, medium: 20, hard: 10 }), 50, "Balanced 10E/20M/10H = score 50");

// 6. Section 8 Shortage Handling - Policy A (Strict)
const strictDeficitResult = resolveDifficultyDistribution({
  targetCounts: { easy: 8, medium: 13, hard: 19 },
  availablePool: { easy: 10, medium: 15, hard: 10, total: 35 }, // Hard is 10 vs required 19
  policy: "strict",
  allocationMode: "slider",
  sliderPosition: 75,
  targetProportions: at75,
});
assert(strictDeficitResult.ok === false, "Policy A (Strict) rejects when Hard has shortage");
assert(strictDeficitResult.shortageDetails?.length === 1, "Identifies 1 category deficit (Hard)");
assert(strictDeficitResult.shortageDetails?.[0].category === "hard", "Deficit category is Hard");
assert(strictDeficitResult.shortageDetails?.[0].deficit === 9, "Deficit is 9");

// 7. Section 8 Shortage Handling - Policy B (Best-effort)
const bestEffortResult = resolveDifficultyDistribution({
  targetCounts: { easy: 8, medium: 13, hard: 19 },
  availablePool: { easy: 20, medium: 30, hard: 10, total: 60 }, // Hard has only 10, but enough overall
  policy: "best_effort",
  allocationMode: "slider",
  sliderPosition: 75,
  targetProportions: at75,
});
assert(bestEffortResult.ok === true, "Policy B (Best-effort) succeeds when total questions sufficient");
assert(
  bestEffortResult.actualCounts.easy + bestEffortResult.actualCounts.medium + bestEffortResult.actualCounts.hard === 40,
  "Best-effort preserves requested total 40 questions"
);
assert(bestEffortResult.actualCounts.hard === 10, "Best-effort took all 10 available Hard questions");
assert(bestEffortResult.deviations.hasShortage === true, "Best-effort reports hasShortage = true");
assert(bestEffortResult.deviations.hardDelta === -9, "Hard delta is -9");
assert(bestEffortResult.actualScore !== bestEffortResult.targetScore, "Target and actual scores differ");

// 8. Section 10 Manual Difficulty Configuration Validation
const validManual = validateManualDifficultyInput({
  manualCounts: { easy: 10, medium: 15, hard: 15 },
  totalRequested: 40,
  availablePool: { easy: 20, medium: 20, hard: 20, total: 60 },
});
assert(validManual.isValid === true, "Valid manual input (10+15+15=40) succeeds");
assertClose(validManual.score, 56.25, "Manual 10/15/15 score is 56.25 (100*(0.5*15+15)/40)");

const invalidSumManual = validateManualDifficultyInput({
  manualCounts: { easy: 10, medium: 15, hard: 10 },
  totalRequested: 40,
});
assert(invalidSumManual.isValid === false, "Invalid manual sum (10+15+10=35 != 40) is rejected");

// 9. Section 9 Multi-Constraint Solver (Difficulty + Topics + High-Yield + Duplicates)
const mockPool: GenericEngineQuestion[] = [];
// Generate 60 questions: 20 Easy, 20 Medium, 20 Hard across topics A, B, C with distinct hashes
const topics = ["Algebra", "Calculus", "Geometry"];
for (let i = 1; i <= 60; i++) {
  const cat = i <= 20 ? "easy" : i <= 40 ? "medium" : "hard";
  const topic = topics[(i - 1) % 3];
  mockPool.push({
    id: `q_${i}`,
    subject: "Mathematics",
    topic,
    difficulty: cat,
    group_hash: `hash_${i}`, // 60 unique questions
    is_active: true,
    is_archived: false,
    status: "approved",
  });
}

const multiRes = selectQuestionsWithDifficultyModel(mockPool, {
  totalCount: 30,
  allocationMode: "slider",
  sliderPosition: 50, // 30% Easy (9), 40% Medium (12), 30% Hard (9)
  shortagePolicy: "best_effort",
  highYieldTopics: [{ topic: "Algebra", quota: 6 }],
  requiredTopics: ["Geometry"],
  randomize: false,
});

assert(multiRes.ok === true, "Multi-constraint selection succeeds");
assert(multiRes.selectedQuestions.length === 30, "Selected exactly 30 questions");
assert(multiRes.topicsCovered.includes("Algebra"), "Covers high-yield topic Algebra");
assert(multiRes.topicsCovered.includes("Geometry"), "Covers required topic Geometry");
assert(
  multiRes.allocationResult.actualCounts.easy +
    multiRes.allocationResult.actualCounts.medium +
    multiRes.allocationResult.actualCounts.hard ===
    30,
  "Category counts sum to 30"
);

// 10. Section 12 Audit Payload Builder
const audit = buildDifficultyAuditPayload({
  allocationResult: multiRes.allocationResult,
  configVersion: 1,
  selectedQuestionIds: multiRes.selectedQuestions.map((q) => q.id),
});
assert(audit.configuration_version === 1, "Audit contains config version");
assert(audit.slider_position === 50, "Audit contains slider position");
assert(audit.target_counts.easy === 9, "Audit contains target Easy count 9");
assert(audit.selected_question_ids.length === 30, "Audit contains selected question IDs");

// 11. Section 14 Roadmap: Empirical Psychometric Difficulty
const pEasy = calculateFacilityIndex(85, 100);
assert(pEasy === 0.85, "p = 85/100 is 0.85");
assert(deriveEmpiricalBand(pEasy) === "easy", "p=0.85 is empirically easy");

const pHard = calculateFacilityIndex(20, 100);
assert(pHard === 0.20, "p = 20/100 is 0.20");
assert(deriveEmpiricalBand(pHard) === "hard", "p=0.20 is empirically hard");

const pMed = calculateFacilityIndex(50, 100);
assert(deriveEmpiricalBand(pMed) === "medium", "p=0.50 is empirically medium");

// Test decoupled psychometrics record & drift detection
const psychItem = computeItemPsychometrics({
  questionId: 101,
  subject: "Physics",
  bankClassification: "easy", // Author classified as easy
  totalAttempts: 120,
  correctAttempts: 30, // But only 25% passed -> empirically hard!
  highScorersCorrect: 20,
  lowScorersCorrect: 5,
  cohortSampleSize: 32,
});
assert(psychItem.bank_classification === "easy", "Static bank classification remains preserved");
assert(psychItem.empirical_band === "hard", "Empirical band derived from p=0.25");
assert(psychItem.drift_detected === true, "Difficulty drift detected between bank and empirical reality");
assert(psychItem.sample_size_confidence === "high", "Sample size confidence is high (120 attempts)");
assert(psychItem.discrimination_index !== undefined && psychItem.discrimination_index > 0, "Discrimination index calculated");

console.log(`\n=== TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED ===`);
if (failCount > 0) {
  process.exit(1);
}
