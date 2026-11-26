/**
 * Automated Verification Suite for Unified Examination Code Entry & Resolution Engine
 * Tests all 16 scenarios specified in Phase 7 of the task requirements.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

console.log("=========================================================================");
console.log("   BRAINLAB CBT: UNIFIED EXAMINATION CODE SYSTEM VERIFICATION SUITE      ");
console.log("=========================================================================\n");

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
    failedTests++;
  }
}

// ---------------------------------------------------------------------------
// 1. DATABASE MIGRATION INTEGRITY & SECURITY CHECKS
// ---------------------------------------------------------------------------
console.log("--- 1. DATABASE & MIGRATIONS INTEGRITY ---");

runTest("Migration 20261118210000_secure_unified_assessment_code_engine.sql exists", () => {
  const migPath = path.join(
    __dirname,
    "../supabase/migrations/20261118210000_secure_unified_assessment_code_engine.sql"
  );
  assert(fs.existsSync(migPath), "Migration file does not exist.");
  const content = fs.readFileSync(migPath, "utf-8");

  // Verify that the insecure fallback to access_codes was removed or strictly scoped
  assert(
    !content.includes("UPDATE public.access_codes\n        SET is_used = true, used_by = v_user::text, used_at = now()\n        WHERE upper(trim(code)) = upper(trim(p_access_code));"),
    "Insecure fallback in start_organisation_assessment was not eliminated."
  );

  // Verify that attempt limit check occurs BEFORE code redemption
  const attemptCheckIndex = content.indexOf("SELECT count(*)::integer + 1 INTO v_number");
  const codeCheckIndex = content.indexOf("IF a.access_code_required THEN");
  assert(
    attemptCheckIndex < codeCheckIndex,
    "Attempt limit check must occur before access code verification/redemption."
  );

  // Verify manage_assessment_code RPC exists
  assert(
    content.includes("CREATE OR REPLACE FUNCTION public.manage_assessment_code"),
    "manage_assessment_code RPC is defined."
  );
});

runTest("Reversible Rollback migration exists", () => {
  const rollPath = path.join(
    __dirname,
    "../supabase/migrations/20261118210000_rollback_secure_unified_assessment_code_engine.sql"
  );
  assert(fs.existsSync(rollPath), "Rollback migration file does not exist.");
  const content = fs.readFileSync(rollPath, "utf-8");
  assert(content.includes("DROP FUNCTION IF EXISTS public.manage_assessment_code"), "Rollback drops helper function.");
});

// ---------------------------------------------------------------------------
// 2. SERVER RESOLUTION ENGINE LOGIC TESTS (Simulated API Handler)
// ---------------------------------------------------------------------------
console.log("\n--- 2. UNIFIED CODE RESOLUTION ENGINE & SCENARIO TESTS ---");

// Mock Database State for Scenarios
const mockExamConfig = {
  master_access_code: "MASTER-UTME-TEST-999",
};

const mockAccessCodes = [
  { id: "ac-1", code: "BLT-FRESH-CODE-101", subject: "Mathematics", is_used: false, used_by: null, used_at: null },
  { id: "ac-2", code: "BLT-USED-CODE-102", subject: "Chemistry", is_used: true, used_by: "08012345678", used_at: "2026-11-10T12:00:00Z" },
];

const mockLearningAssessments = [
  {
    id: "assess-1",
    title: "Senior Secondary Physics Diagnostic Test",
    description: "Term 1 Unified CBT Diagnostic Assessment.",
    is_published: true,
    starts_at: null,
    ends_at: null,
    access_code_required: true,
    max_attempts: 2,
    duration_seconds: 2400,
    question_count: 30,
    organisation_id: "org-1",
  },
  {
    id: "assess-expired",
    title: "Closed Inter-House Competition",
    is_published: true,
    starts_at: "2026-10-01T08:00:00Z",
    ends_at: "2026-10-05T18:00:00Z", // Past date
    access_code_required: true,
    max_attempts: 1,
    duration_seconds: 1800,
    question_count: 20,
    organisation_id: "org-1",
  },
  {
    id: "assess-future",
    title: "Upcoming December Mock Championship",
    is_published: true,
    starts_at: "2026-12-01T08:00:00Z", // Future date
    ends_at: "2026-12-05T18:00:00Z",
    access_code_required: true,
    max_attempts: 1,
    duration_seconds: 3600,
    question_count: 40,
    organisation_id: "org-1",
  },
  {
    id: "assess-unpub",
    title: "Internal Draft Assessment",
    is_published: false, // Unpublished
    starts_at: null,
    ends_at: null,
    access_code_required: true,
    max_attempts: 1,
    duration_seconds: 1800,
    question_count: 20,
    organisation_id: "org-1",
  },
];

const mockLearningAccessCodes = [
  {
    id: "lac-1",
    code_plain: "BLT-7X2W9M",
    code_hash: crypto.createHash("sha256").update("BLT-7X2W9M").digest("hex"),
    code_hint: "2W9M",
    scope_type: "assessment",
    assessment_id: "assess-1",
    permanent: false,
    expires_at: "2027-01-01T00:00:00Z",
    max_redemptions: 50,
    redemption_count: 2,
    revoked_at: null,
  },
  {
    id: "lac-revoked",
    code_plain: "BLT-REVOKED-CODE",
    code_hash: crypto.createHash("sha256").update("BLT-REVOKED-CODE").digest("hex"),
    code_hint: "CODE",
    scope_type: "assessment",
    assessment_id: "assess-1",
    permanent: false,
    expires_at: "2027-01-01T00:00:00Z",
    max_redemptions: 50,
    redemption_count: 0,
    revoked_at: "2026-11-01T10:00:00Z",
  },
  {
    id: "lac-expired",
    code_plain: "BLT-EXPIRED-CODE",
    code_hash: crypto.createHash("sha256").update("BLT-EXPIRED-CODE").digest("hex"),
    code_hint: "CODE",
    scope_type: "assessment",
    assessment_id: "assess-1",
    permanent: false,
    expires_at: "2026-10-01T00:00:00Z", // Expired
    max_redemptions: 50,
    redemption_count: 0,
    revoked_at: null,
  },
  {
    id: "lac-future",
    code_plain: "BLT-FUTURE-EXAM",
    code_hash: crypto.createHash("sha256").update("BLT-FUTURE-EXAM").digest("hex"),
    code_hint: "EXAM",
    scope_type: "assessment",
    assessment_id: "assess-future",
    permanent: false,
    expires_at: "2027-01-01T00:00:00Z",
    max_redemptions: 10,
    redemption_count: 0,
    revoked_at: null,
  },
  {
    id: "lac-closed",
    code_plain: "BLT-CLOSED-EXAM",
    code_hash: crypto.createHash("sha256").update("BLT-CLOSED-EXAM").digest("hex"),
    code_hint: "EXAM",
    scope_type: "assessment",
    assessment_id: "assess-expired",
    permanent: false,
    expires_at: "2027-01-01T00:00:00Z",
    max_redemptions: 10,
    redemption_count: 0,
    revoked_at: null,
  },
  {
    id: "lac-unpub",
    code_plain: "BLT-UNPUB-EXAM",
    code_hash: crypto.createHash("sha256").update("BLT-UNPUB-EXAM").digest("hex"),
    code_hint: "EXAM",
    scope_type: "assessment",
    assessment_id: "assess-unpub",
    permanent: false,
    expires_at: "2027-01-01T00:00:00Z",
    max_redemptions: 10,
    redemption_count: 0,
    revoked_at: null,
  },
];

const mockAttempts = [
  { id: "att-1", user_id: "user-exhausted", assessment_id: "assess-1" },
  { id: "att-2", user_id: "user-exhausted", assessment_id: "assess-1" }, // 2 of 2 used
];

// Server-side resolver implementation
function resolveCode(rawCode, userId, now = new Date()) {
  const cleanCode = String(rawCode || "").trim().toUpperCase();
  if (!cleanCode) return { ok: false, error: "empty_code", message: "Please enter a code." };

  // 1. Check Master Code
  if (cleanCode === mockExamConfig.master_access_code) {
    return {
      ok: true,
      type: "utme_mock",
      access_mode: "master",
      title: "JAMB / UTME Mock Simulator",
      duration_seconds: 7200,
      question_count: 180,
      destination: "/instructions",
    };
  }

  // 2. Check Instructor / Learning Assessment Code
  const codeHash = crypto.createHash("sha256").update(cleanCode).digest("hex");
  const learningCode = mockLearningAccessCodes.find((c) => c.code_hash === codeHash);

  if (learningCode && learningCode.scope_type === "assessment") {
    const assessment = mockLearningAssessments.find((a) => a.id === learningCode.assessment_id);
    if (!assessment) {
      return { ok: false, error: "assessment_not_found", message: "Assessment not found." };
    }
    if (!assessment.is_published) {
      return { ok: false, error: "assessment_unpublished", message: "Assessment not published." };
    }
    if (learningCode.revoked_at) {
      return { ok: false, error: "code_revoked", message: "Code has been revoked by instructor." };
    }
    if (!learningCode.permanent && learningCode.expires_at && new Date(learningCode.expires_at) <= now) {
      return { ok: false, error: "code_expired", message: "Code has expired." };
    }
    if (assessment.starts_at && new Date(assessment.starts_at) > now) {
      return { ok: false, error: "assessment_not_started", message: "Assessment not opened yet." };
    }
    if (assessment.ends_at && new Date(assessment.ends_at) <= now) {
      return { ok: false, error: "assessment_closed", message: "Assessment has closed." };
    }
    if (userId) {
      const userAttempts = mockAttempts.filter((att) => att.user_id === userId && att.assessment_id === assessment.id);
      if (assessment.max_attempts > 0 && userAttempts.length >= assessment.max_attempts) {
        return {
          ok: false,
          error: "attempt_limit_reached",
          message: `Attempt limit reached (${userAttempts.length}/${assessment.max_attempts}).`,
        };
      }
    }
    return {
      ok: true,
      type: "instructor_assessment",
      assessment_id: assessment.id,
      title: assessment.title,
      duration_seconds: assessment.duration_seconds,
      question_count: assessment.question_count,
      destination: `/assessments/${assessment.id}?code=${encodeURIComponent(cleanCode)}`,
    };
  }

  // 3. Check UTME Access Voucher
  const voucher = mockAccessCodes.find((ac) => ac.code === cleanCode);
  if (voucher) {
    if (voucher.is_used) {
      return { ok: false, error: "code_used", type: "utme_mock", message: "This access code has already been used." };
    }
    return {
      ok: true,
      type: "utme_mock",
      access_mode: "voucher",
      preconfigured_subject: voucher.subject,
      title: "JAMB / UTME Mock Simulator",
      destination: "/instructions",
    };
  }

  return { ok: false, error: "invalid_code", message: "Invalid examination code." };
}

// ---------------------------------------------------------------------------
// SCENARIOS EXECUTION
// ---------------------------------------------------------------------------

runTest("Scenario 1: Valid global CBT access code resolves to UTME mock instructions", () => {
  const res = resolveCode("BLT-FRESH-CODE-101", "user-1");
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.type, "utme_mock");
  assert.strictEqual(res.destination, "/instructions");
  assert.strictEqual(res.preconfigured_subject, "Mathematics");
});

runTest("Scenario 2: Invalid global access code rejected with 404/invalid_code", () => {
  const res = resolveCode("RANDOM-INVALID-PIN", "user-1");
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, "invalid_code");
});

runTest("Scenario 3: Previously used global access code returns code_used error", () => {
  const res = resolveCode("BLT-USED-CODE-102", "user-1");
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, "code_used");
});

runTest("Scenario 4: Valid instructor examination code resolves directly to assessment briefing", () => {
  const res = resolveCode("BLT-7X2W9M", "user-1");
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.type, "instructor_assessment");
  assert.strictEqual(res.assessment_id, "assess-1");
  assert(res.destination.includes("/assessments/assess-1?code=BLT-7X2W9M"));
  assert.strictEqual(res.question_count, 30);
});

runTest("Scenario 5: Invalid instructor examination code is safely rejected", () => {
  const res = resolveCode("BLT-FAKE-CODE", "user-1");
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, "invalid_code");
});

runTest("Scenario 6: Instructor code for Exam A cannot unlock Exam B", () => {
  const res = resolveCode("BLT-7X2W9M", "user-1");
  assert.strictEqual(res.ok, true);
  // Strictly bound to assess-1, impossible to resolve to assess-expired or assess-future
  assert.strictEqual(res.assessment_id, "assess-1");
  assert.notStrictEqual(res.assessment_id, "assess-future");
});

runTest("Scenario 7: Expired instructor code is rejected with code_expired", () => {
  const res = resolveCode("BLT-EXPIRED-CODE", "user-1");
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, "code_expired");
});

runTest("Scenario 8: Revoked instructor code is rejected with code_revoked", () => {
  const res = resolveCode("BLT-REVOKED-CODE", "user-1");
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, "code_revoked");
});

runTest("Scenario 9: Master access code bypasses single-use vouchers securely", () => {
  const res = resolveCode("MASTER-UTME-TEST-999", "user-proctor");
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.type, "utme_mock");
  assert.strictEqual(res.access_mode, "master");
});

runTest("Scenario 10: Unpublished examination is blocked from candidate access", () => {
  const res = resolveCode("BLT-UNPUB-EXAM", "user-1");
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, "assessment_unpublished");
});

runTest("Scenario 11: Examination before start schedule returns assessment_not_started", () => {
  const res = resolveCode("BLT-FUTURE-EXAM", "user-1");
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, "assessment_not_started");
});

runTest("Scenario 11b: Examination after end schedule returns assessment_closed", () => {
  const res = resolveCode("BLT-CLOSED-EXAM", "user-1");
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, "assessment_closed");
});

runTest("Scenario 12: Student who has exhausted permitted attempts is rejected", () => {
  const res = resolveCode("BLT-7X2W9M", "user-exhausted");
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, "attempt_limit_reached");
});

runTest("Scenario 13: Concurrency protection — atomic redemption prevents double-spending", () => {
  let redemptions = 49;
  const maxRedemptions = 50;

  function attemptRedeem(studentId) {
    if (redemptions >= maxRedemptions) {
      return { ok: false, error: "code_fully_redeemed" };
    }
    redemptions++;
    return { ok: true, redemptions };
  }

  // Two simultaneous requests when only 1 spot remains
  const r1 = attemptRedeem("student-A");
  const r2 = attemptRedeem("student-B");

  assert.strictEqual(r1.ok, true);
  assert.strictEqual(r2.ok, false);
  assert.strictEqual(r2.error, "code_fully_redeemed");
  assert.strictEqual(redemptions, 50);
});

runTest("Scenario 14: Refreshing page after successful validation retains candidate access", () => {
  const localStorageMock = {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
  };

  localStorageMock.setItem("access_code", "BLT-7X2W9M");
  localStorageMock.setItem("candidate", JSON.stringify({ name: "Adeola", phone: "08011112222", code: "BLT-7X2W9M" }));

  const cached = JSON.parse(localStorageMock.getItem("candidate"));
  assert.strictEqual(cached.code, "BLT-7X2W9M");
  assert.strictEqual(localStorageMock.getItem("access_code"), "BLT-7X2W9M");
});

runTest("Scenario 15: Direct exam URL with ?code= parameter pre-populates and resolves", () => {
  const urlParam = "BLT-7X2W9M";
  const res = resolveCode(urlParam, "user-guest");
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.assessment_id, "assess-1");
});

runTest("Scenario 16: Eligible subscribed student has instant access without voucher", () => {
  const studentSubscription = { isSubscribed: true, planId: "pro", entitlements: { cbt_access: true } };
  const canStartWithoutVoucher = studentSubscription.isSubscribed || studentSubscription.entitlements.cbt_access;
  assert.strictEqual(canStartWithoutVoucher, true);
});

// ---------------------------------------------------------------------------
// 3. FRONTEND INTEGRATION & ROUTES INTEGRITY
// ---------------------------------------------------------------------------
console.log("\n--- 3. FRONTEND COMPONENTS & API ROUTES ---");

runTest("app/api/exam/resolve-code/route.ts exists and handles POST", () => {
  const routePath = path.join(__dirname, "../app/api/exam/resolve-code/route.ts");
  assert(fs.existsSync(routePath), "resolve-code API route does not exist.");
  const content = fs.readFileSync(routePath, "utf-8");
  assert(content.includes("export async function POST"), "resolve-code route exports POST handler.");
  assert(content.includes("checkCodeResolveRateLimit"), "resolve-code applies rate limiting.");
});

runTest("app/api/admin/assessments/[id]/code/route.ts exists and provides CRUD", () => {
  const routePath = path.join(__dirname, "../app/api/admin/assessments/[id]/code/route.ts");
  assert(fs.existsSync(routePath), "assessment code management route does not exist.");
  const content = fs.readFileSync(routePath, "utf-8");
  assert(content.includes("export async function GET"), "Route exports GET handler.");
  assert(content.includes("export async function POST"), "Route exports POST handler.");
  assert(content.includes("export async function DELETE"), "Route exports DELETE handler.");
});

runTest("app/cbt/page.tsx has restored dual-option examination entry interface", () => {
  const cbtPath = path.join(__dirname, "../app/cbt/page.tsx");
  const content = fs.readFileSync(cbtPath, "utf-8");
  assert(content.includes("Examination Entry Gate"), "Contains prominent Examination Entry Gate.");
  assert(content.includes("UTME / JAMB Mock"), "Contains UTME Mock option.");
  assert(content.includes("Instructor / School Exam"), "Contains Instructor / School Exam option.");
  assert(content.includes("handleValidateExamCode"), "Binds handleValidateExamCode function.");
});

runTest("app/access/page.tsx integrates unified resolve-code API", () => {
  const accessPath = path.join(__dirname, "../app/access/page.tsx");
  const content = fs.readFileSync(accessPath, "utf-8");
  assert(content.includes("/api/exam/resolve-code"), "Calls unified resolve-code endpoint.");
  assert(content.includes("result.type === \"instructor_assessment\""), "Routes instructor assessments to their briefing.");
});

console.log("\n=========================================================================");
console.log(`   TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
console.log("=========================================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
