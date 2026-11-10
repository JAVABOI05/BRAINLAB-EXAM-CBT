process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key";

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import type { TopicMastery } from "../app/lib/adaptiveEngine";

console.log("=========================================================================");
console.log("  BRAINLAB CI: AI PERFORMANCE INTELLIGENCE & AT-RISK CANDIDATES");
console.log("=========================================================================\n");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`  ✓ ${name}`);
          passed++;
        })
        .catch((err) => {
          console.error(`  ✗ ${name}`);
          console.error(`    ${err.message}`);
          failed++;
        });
    }
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: unknown) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

async function runTests() {
  const { calculateExamReadiness } = await import("../app/lib/adaptiveEngine");

  console.log("1. TOPIC MASTERY & EXAM READINESS DIAGNOSTICS");

  await test("calculateExamReadiness computes predicted scores and extracts weakest topics dynamically", () => {
    const sampleMastery: TopicMastery[] = [
      {
        subject: "Mathematics",
        category: "Calculus & Differentiation",
        totalAttempted: 15,
        totalCorrect: 4,
        masteryScore: 0.27,
        confidenceLevel: "struggling",
        lastPracticedAt: new Date().toISOString(),
      },
      {
        subject: "Physics",
        category: "Current Electricity",
        totalAttempted: 20,
        totalCorrect: 8,
        masteryScore: 0.4,
        confidenceLevel: "learning",
        lastPracticedAt: new Date().toISOString(),
      },
      {
        subject: "Chemistry",
        category: "Periodic Trends",
        totalAttempted: 25,
        totalCorrect: 22,
        masteryScore: 0.88,
        confidenceLevel: "mastered",
        lastPracticedAt: new Date().toISOString(),
      },
    ];

    const readiness = calculateExamReadiness(sampleMastery);
    assert.ok(readiness.predictedJambScore >= 100 && readiness.predictedJambScore <= 400);
    assert.ok(readiness.predictedWaecPercent >= 20 && readiness.predictedWaecPercent <= 100);
    assert.ok(readiness.weakestTopics.length <= 3 && readiness.weakestTopics.length > 0);
    assert.strictEqual(readiness.weakestTopics[0].category, "Calculus & Differentiation");
    assert.strictEqual(readiness.strongestTopics[0].category, "Periodic Trends");
  });

  console.log("\n2. CANDIDATE CRM AT-RISK IDENTIFICATION");

  await test("Admin candidate API route handles at-risk status filter and evaluates inactivity/streak", () => {
    const apiPath = path.resolve(process.cwd(), "app/api/admin/candidates/route.ts");
    const code = fs.readFileSync(apiPath, "utf8");

    assert.ok(code.includes('statusFilter === "at-risk"'), "Supports at-risk status filter");
    assert.ok(code.includes("isAtRisk"), "Evaluates isAtRisk boolean for candidates");
    assert.ok(code.includes("streak_days"), "Checks gamification streak days");
    assert.ok(code.includes("last_sign_in_at"), "Checks candidate last sign-in timestamp");
  });

  await test("Candidate Registry UI contains At-Risk Intervention filter option and warning badge", () => {
    const uiPath = path.resolve(process.cwd(), "app/admin/candidates/page.tsx");
    const code = fs.readFileSync(uiPath, "utf8");

    assert.ok(code.includes('value="at-risk"'), "Includes at-risk select option");
    assert.ok(code.includes("At-Risk Intervention"), "Provides clear filter label");
    assert.ok(code.includes("cand.isAtRisk"), "Checks cand.isAtRisk in table rendering");
    assert.ok(code.includes("⚠️ At-Risk"), "Renders clear visual warning badge");
  });

  console.log("\n3. STUDENT DASHBOARD DIAGNOSTIC SYLLABUS INTEGRATION");

  await test("Student dashboard renders Exam Readiness Intelligence and links weak spots to self-practice", () => {
    const dashPath = path.resolve(process.cwd(), "app/dashboard/page.tsx");
    const code = fs.readFileSync(dashPath, "utf8");

    assert.ok(code.includes("Exam Readiness Intelligence"), "Renders Exam Readiness section");
    assert.ok(code.includes("readiness.weakestTopics"), "Maps weakest topics");
    assert.ok(code.includes('href="/self-practice"'), "Links weak spots to targeted self-practice");
    assert.ok(!code.includes("98% pass rate"), "Zero unverified claims (Rule S7)");
  });

  console.log("\n=========================================================================");
  console.log(`  AI PERFORMANCE & AT-RISK SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
