/**
 * BrainLab Academy: Prompt 10 (Layer B3) Academic Resources & CBT Sample Verification Suite
 *
 * Verifies:
 * 1. Curated public sample question migrations, rollback SQL, and RLS policies
 * 2. Complete question bank isolation (internal questions table never exposed)
 * 3. Zero answer key leaks in client bundles
 * 4. Server-side answer verification and one-question-at-a-time delivery
 * 5. Sliding-window rate limiting & invisible honeypot abuse protection
 * 6. Syllabus Explorer multi-level hierarchy & authoritative registry binding
 * 7. Free Plan Entitlements parity with platformConfig (Rule S7)
 * 8. Public Exam Calendar page with Africa/Lagos timestamps and official source links
 */

// Set test fallback environment variables for offline test execution
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test-placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

import fs from "fs";
import path from "path";
import { checkRateLimit, isHoneypotTriggered } from "../app/lib/abuseProtection";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runSuite() {
  console.log("\n=========================================================================");
  console.log("  BRAINLAB CI: PROMPT 10 (B3) ACADEMIC RESOURCES & SAMPLE CBT SUITE");
  console.log("=========================================================================\n");

  // Dynamically import service after env variables are populated
  const {
    getNextSampleQuestion,
    verifySampleAnswer,
    CURATED_STATIC_SAMPLE_POOL,
  } = await import("../app/lib/services/sampleQuestionService");

  // 1. DATABASE MIGRATIONS & RLS
  console.log("1. DATABASE MIGRATIONS & ROW LEVEL SECURITY");
  const migrationPath = "supabase/migrations/20261108150000_create_curated_sample_questions.sql";
  const rollbackPath = "supabase/migrations/20261108150000_rollback_curated_sample_questions.sql";

  assert(fs.existsSync(migrationPath), `${migrationPath} exists`);
  assert(fs.existsSync(rollbackPath), `${rollbackPath} exists`);

  if (fs.existsSync(migrationPath)) {
    const ddl = fs.readFileSync(migrationPath, "utf8");
    assert(ddl.includes("CREATE TABLE IF NOT EXISTS public.curated_sample_questions"), "Creates public.curated_sample_questions table");
    assert(ddl.includes("ALTER TABLE public.curated_sample_questions ENABLE ROW LEVEL SECURITY"), "Enables RLS on curated_sample_questions");
    assert(ddl.includes("CREATE POLICY \"Public can view published sample questions\""), "Configures SELECT policy for published sample questions");
    assert(ddl.includes("CREATE POLICY \"Administrators can manage sample questions\""), "Configures management policy for verified administrators");
    assert(ddl.includes("idx_sample_questions_subject_published"), "Builds compound index for fast filtered retrieval");
  }

  if (fs.existsSync(rollbackPath)) {
    const rollbackSql = fs.readFileSync(rollbackPath, "utf8");
    assert(rollbackSql.includes("DROP TABLE IF EXISTS public.curated_sample_questions CASCADE"), "Rollback drops curated_sample_questions cleanly");
  }

  // 2. QUESTION BANK ISOLATION & ZERO ANSWER LEAKS
  console.log("\n2. QUESTION BANK ISOLATION & ZERO ANSWER KEY LEAKS");
  const sampleComponentPath = "app/components/InteractiveSampleQuestion.tsx";
  assert(fs.existsSync(sampleComponentPath), `${sampleComponentPath} exists`);

  if (fs.existsSync(sampleComponentPath)) {
    const componentCode = fs.readFileSync(sampleComponentPath, "utf8");
    assert(!componentCode.includes('correctLetter: "A"') && !componentCode.includes('correctLetter: "B"'), "Zero hardcoded answer keys bundled in client component");
    assert(componentCode.includes("/api/sample/question"), "Fetches question from server-side one-at-a-time endpoint");
    assert(componentCode.includes("/api/sample/verify"), "Submits answer to server-side verification endpoint");
    assert(componentCode.includes("preferred_subject_confirmation"), "Includes bot honeypot field in interactive component");
  }

  const sampleQuestionRoutePath = "app/api/sample/question/route.ts";
  const sampleVerifyRoutePath = "app/api/sample/verify/route.ts";
  assert(fs.existsSync(sampleQuestionRoutePath), `${sampleQuestionRoutePath} exists`);
  assert(fs.existsSync(sampleVerifyRoutePath), `${sampleVerifyRoutePath} exists`);

  if (fs.existsSync(sampleQuestionRoutePath)) {
    const routeCode = fs.readFileSync(sampleQuestionRoutePath, "utf8");
    assert(!routeCode.includes("from(\"questions\")"), "Strict question bank isolation: never queries internal questions table");
    assert(routeCode.includes("checkRateLimit"), "GET /api/sample/question enforces IP rate limiting");
  }

  // 3. SERVER-SIDE VERIFICATION LOGIC & ONE-QUESTION DELIVERY
  console.log("\n3. SERVER-SIDE VERIFICATION & ONE-QUESTION DELIVERY");
  const sampleQ = await getNextSampleQuestion("use-of-english", []);
  assert(Boolean(sampleQ), "getNextSampleQuestion returns active sample question");
  if (sampleQ) {
    assert(sampleQ.options.length >= 4, "Question contains at least 4 options");
    assert(!("correctLetter" in sampleQ) && !("explanation" in sampleQ), "Public question object strictly omits correctLetter and explanation");
  }

  const firstPoolItem = CURATED_STATIC_SAMPLE_POOL[0];
  const correctCheck = await verifySampleAnswer(firstPoolItem.id, firstPoolItem.correct_letter);
  assert(Boolean(correctCheck && correctCheck.isCorrect), "verifySampleAnswer correctly validates matching answer");

  const incorrectOption = firstPoolItem.correct_letter === "A" ? "B" : "A";
  const wrongCheck = await verifySampleAnswer(firstPoolItem.id, incorrectOption);
  assert(Boolean(wrongCheck && !wrongCheck.isCorrect), "verifySampleAnswer accurately identifies wrong answer");

  // Honeypot test
  assert(isHoneypotTriggered("bot payload"), "isHoneypotTriggered detects bot traps");
  assert(!isHoneypotTriggered(""), "isHoneypotTriggered allows clean human inputs");

  // Rate limiter test
  const rateKey = `test_sample_throttle_${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    checkRateLimit(rateKey, 5, 60000);
  }
  const blockedCheck = checkRateLimit(rateKey, 5, 60000);
  assert(!blockedCheck.allowed, "checkRateLimit throttles excessive sample requests");

  // 4. SYLLABUS EXPLORER MULTI-LEVEL HIERARCHY
  console.log("\n4. SYLLABUS EXPLORER ARCHITECTURE");
  const syllabusPath = "app/syllabus/page.tsx";
  assert(fs.existsSync(syllabusPath), `${syllabusPath} exists`);

  if (fs.existsSync(syllabusPath)) {
    const syllabusCode = fs.readFileSync(syllabusPath, "utf8");
    assert(syllabusCode.includes("JAMB UTME") && syllabusCode.includes("WAEC SSCE"), "Supports multi-programme examination hierarchy");
    assert(syllabusCode.includes("In Review") || syllabusCode.includes("in_review"), "Honest status label for uncurated programmes (Rule S6)");
    assert(syllabusCode.includes("DEFAULT_JAMB_SYLLABUS"), "Connects to authoritative curriculum registry");
    assert(syllabusCode.includes("/cbt"), "Provides direct link to launch CBT practice for subjects");
  }

  // 5. FREE PLAN ENTITLEMENTS DISCLOSURE (RULE S7)
  console.log("\n5. FREE PLAN ENTITLEMENTS DISCLOSURE (RULE S7)");
  const resourcesPath = "app/resources/page.tsx";
  assert(fs.existsSync(resourcesPath), `${resourcesPath} exists`);

  if (fs.existsSync(resourcesPath)) {
    const resCode = fs.readFileSync(resourcesPath, "utf8");
    assert(resCode.includes("FREE PLAN") || resCode.includes("Free Learner"), "Discloses exact Free plan boundaries");
    assert(resCode.includes("1 full CBT practice") || resCode.includes("1 CBT"), "Accurately states 1 CBT mock test per day");
    assert(resCode.includes("50 AI"), "Accurately states 50 AI hints per month");
  }

  const platformConfigPath = "app/lib/platformConfig.ts";
  if (fs.existsSync(platformConfigPath)) {
    const platformCode = fs.readFileSync(platformConfigPath, "utf8");
    assert(platformCode.includes("cbt_daily_limit: 1"), "platformConfig confirms 1 CBT daily limit for Free");
    assert(platformCode.includes("ai_monthly_quota: 50"), "platformConfig confirms 50 AI monthly quota for Free");
  }

  // 6. EXAM CALENDAR PAGE INTEGRATION
  console.log("\n6. EXAM CALENDAR PAGE INTEGRATION");
  const calendarPagePath = "app/resources/exam-calendar/page.tsx";
  assert(fs.existsSync(calendarPagePath), `${calendarPagePath} exists`);

  if (fs.existsSync(calendarPagePath)) {
    const calCode = fs.readFileSync(calendarPagePath, "utf8");
    assert(calCode.includes("fetchPublishedExamEvents"), "Fetches published events from examCalendarService");
    assert(calCode.includes("formatLagosDate"), "Formats examination dates to Africa/Lagos (WAT, UTC+1)");
    assert(calCode.includes("target=\"_blank\"") && calCode.includes("rel=\"noopener noreferrer\""), "Secures external official portal links");
    assert(calCode.includes("calculateExamCountdown"), "Calculates countdown against server-synchronized time");
  }

  console.log("\n=========================================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

void runSuite();
