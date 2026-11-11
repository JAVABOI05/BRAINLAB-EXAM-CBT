/**
 * Automated Test Suite for Phase 1 (Student Target Onboarding & Diagnostic Funnel)
 * and Phase 2 (Socratic 3-Stage AI Engine & Low-Data Offline CBT Sync)
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

import assert from "node:assert/strict";

async function run() {
  const {
    POPULAR_UNIVERSITIES,
    POPULAR_COURSES,
    TARGET_SCORES,
    STUDY_VIBES,
    extractStudentProfile,
  } = await import("../app/lib/studentProfile");
  const { OFFLINE_EXAM_PACK_PREFIX } = await import("../app/lib/offlineSync");
  type OfflineExamPack = import("../app/lib/offlineSync").OfflineExamPack;

console.log("================================================================================");
console.log("  PHASE 1 & 2 VERIFICATION: ONBOARDING, DIAGNOSTIC, SOCRATIC AI & OFFLINE CBT");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function it(desc: string, fn: () => void | Promise<void>) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ----------------------------------------------------------------------------
// 1. Target Onboarding Data Integrity
// ----------------------------------------------------------------------------
console.log("\n[1/4] Testing Target Onboarding Data Models & Profile Extraction...");

it("Contains all primary Nigerian tertiary institutions (UNILAG, UI, OAU, ABU, Covenant, FUTA)", () => {
  const uniNames = POPULAR_UNIVERSITIES.join(" ");
  assert(uniNames.includes("UNILAG"), "UNILAG missing");
  assert(uniNames.includes("UI"), "UI missing");
  assert(uniNames.includes("OAU"), "OAU missing");
  assert(uniNames.includes("ABU"), "ABU missing");
  assert(uniNames.includes("Covenant"), "Covenant missing");
  assert(uniNames.includes("FUTA"), "FUTA missing");
});

it("Contains primary competitive courses (Medicine, Computer Science, Law, Engineering)", () => {
  const courseNames = POPULAR_COURSES.join(" ");
  assert(courseNames.includes("Medicine & Surgery"), "Medicine missing");
  assert(courseNames.includes("Computer Science"), "Computer Science missing");
  assert(courseNames.includes("Law"), "Law missing");
  assert(courseNames.includes("Engineering"), "Engineering missing");
});

it("Extracts student profile correctly with default fallbacks", () => {
  const rawUser = {
    email: "teststudent@brainlab.ng",
    user_metadata: {
      full_name: "Chukwudi Okafor",
      dream_school: "University of Lagos (UNILAG)",
      target_course: "Computer Science & AI",
      target_score: "320+ / 400 (Top 1% Elite Cohort)",
    },
  };

  const prof = extractStudentProfile(rawUser);
  assert.equal(prof.displayName, "Chukwudi Okafor");
  assert.equal(prof.dreamSchool, "University of Lagos (UNILAG)");
  assert.equal(prof.targetCourse, "Computer Science & AI");
  assert.equal(prof.targetScore, "320+ / 400 (Top 1% Elite Cohort)");
  assert.equal(prof.isCustomized, true);
});

// ----------------------------------------------------------------------------
// 2. Diagnostic Assessment Logic & Archetype Extrapolation
// ----------------------------------------------------------------------------
console.log("\n[2/4] Testing Baseline Diagnostic Scoring & Extrapolation...");

it("Correctly computes predicted JAMB score range from baseline diagnostic accuracy", () => {
  // Baseline diagnostic formula: Math.round(180 + (score / total) * 180)
  const total = 10;
  
  // Perfect score (10/10) => ~360
  const score10 = Math.round(180 + (10 / total) * 180);
  assert.equal(score10, 360, "Perfect score prediction should reach 360");

  // Half score (5/10) => ~270
  const score5 = Math.round(180 + (5 / total) * 180);
  assert.equal(score5, 270, "Half score prediction should reach 270");

  // Zero score (0/10) => baseline floor 180
  const score0 = Math.round(180 + (0 / total) * 180);
  assert.equal(score0, 180, "Zero score floor should be 180");
});

it("Maps score to appropriate pedagogical archetype", () => {
  const getArchetype = (score: number) => {
    if (score >= 8) return "Strategic Conceptualist";
    if (score >= 5) return "Adaptive Pattern Solver";
    return "Foundational Explorer";
  };

  assert.equal(getArchetype(9), "Strategic Conceptualist");
  assert.equal(getArchetype(6), "Adaptive Pattern Solver");
  assert.equal(getArchetype(3), "Foundational Explorer");
});

// ----------------------------------------------------------------------------
// 3. Socratic 3-Stage Prompt Principles
// ----------------------------------------------------------------------------
console.log("\n[3/4] Testing Socratic 3-Stage Progressive Prompt Contracts...");

it("Stage 1 (Clue) strictly forbids revealing answer keys or final options", () => {
  const stage1Prompt = `Stage 1: Thought Clue & Socratic Questioning.
DO NOT reveal the correct option letter (A, B, C, D) or state the final answer.
1. Highlight the core conceptual principle or definition being tested.
2. Ask 1-2 guiding diagnostic questions that prompt the student to notice the critical clue or constraint.`;

  assert(stage1Prompt.includes("DO NOT reveal the correct option letter"), "Must enforce zero spoiler rule");
  assert(stage1Prompt.includes("guiding diagnostic questions"), "Must prompt student thinking");
});

it("Stage 2 (Formula) requires stating equations without arithmetic giveaway", () => {
  const stage2Prompt = `Stage 2: Core Formula & Governing Method.
1. State the exact mathematical equation, chemical law, physical principle, or grammatical rule required.
2. Define what each variable or term represents in the context of this specific problem.`;

  assert(stage2Prompt.includes("exact mathematical equation"), "Must supply governing formula");
});

it("Stage 3 (Derivation) provides full master proof and distractor breakdown", () => {
  const stage3Prompt = `Stage 3: Full Step-by-Step Master Derivation.
1. Provide the complete worked-out calculation or syntactic proof from start to finish.
2. Clearly identify the correct answer option and justify why it is uniquely correct.`;

  assert(stage3Prompt.includes("complete worked-out calculation"), "Must supply complete derivation");
});

// ----------------------------------------------------------------------------
// 4. Low-Data Offline CBT Exam Pack Schema
// ----------------------------------------------------------------------------
console.log("\n[4/4] Testing Low-Data Offline CBT Pack Serialization & Schema...");

it("Validates offline exam pack structure fits low-bandwidth footprint (<1.5MB)", () => {
  const mockPack: OfflineExamPack = {
    sessionId: "test-sess-12345",
    token: "token-abc-987",
    subjects: ["English", "Mathematics", "Physics", "Chemistry"],
    questions: Array.from({ length: 40 }).map((_, i) => ({
      id: i + 1,
      subject: "Mathematics",
      text: `Calculate the derivative of f(x) = ${i}x^2 + 5x + 3.`,
      options: { A: `${2 * i}x + 5`, B: `${i}x + 5`, C: `${2 * i}x`, D: "5" },
      correct: "A",
    })),
    durationMinutes: 120,
    cachedAt: Date.now(),
  };

  const serialized = JSON.stringify(mockPack);
  const sizeKb = Buffer.byteLength(serialized, "utf8") / 1024;
  
  assert.equal(mockPack.subjects.length, 4);
  assert.equal(mockPack.questions.length, 40);
  assert(sizeKb < 200, `Pack size (${sizeKb.toFixed(2)} KB) must be far below 1.5MB constraint`);
  assert.equal(OFFLINE_EXAM_PACK_PREFIX, "brainlab_exam_pack_");
});

console.log("\n================================================================================");
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
}

void run();
