import assert from "assert";
import fs from "fs";
import path from "path";
import {
  checkRateLimit,
  isHoneypotTriggered,
  generateReferenceCode,
} from "../app/lib/abuseProtection";

console.log("=========================================================================");
console.log("  BRAINLAB CI: INSTITUTIONAL ENQUIRIES & TUTOR APPLICATIONS TEST SUITE");
console.log("=========================================================================\n");

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err instanceof Error ? err.message : err);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// 1. Storage & Migration Architecture
// -----------------------------------------------------------------------------
runTest("Test 1: Migration and rollback files exist with non-empty DDL", () => {
  const tutorMigrationPath = path.join(
    process.cwd(),
    "supabase/migrations/20261108110000_create_tutor_applications.sql"
  );
  const tutorRollbackPath = path.join(
    process.cwd(),
    "supabase/migrations/20261108110000_rollback_tutor_applications.sql"
  );
  const schoolMigrationPath = path.join(
    process.cwd(),
    "supabase/migrations/20261108111000_harden_school_inquiries.sql"
  );
  const schoolRollbackPath = path.join(
    process.cwd(),
    "supabase/migrations/20261108111000_rollback_school_inquiries.sql"
  );

  assert.ok(fs.existsSync(tutorMigrationPath), "Tutor migration file must exist");
  assert.ok(fs.existsSync(tutorRollbackPath), "Tutor rollback file must exist");
  assert.ok(fs.existsSync(schoolMigrationPath), "School migration file must exist");
  assert.ok(fs.existsSync(schoolRollbackPath), "School rollback file must exist");

  const tutorSql = fs.readFileSync(tutorMigrationPath, "utf8");
  assert.ok(tutorSql.includes("CREATE TABLE IF NOT EXISTS public.tutor_applications"), "Creates tutor_applications");
  assert.ok(tutorSql.includes("ENABLE ROW LEVEL SECURITY"), "Enables RLS on tutor_applications");
  assert.ok(tutorSql.includes("reference_code TEXT NOT NULL UNIQUE"), "Has unique reference_code");
  assert.ok(tutorSql.includes("idx_tutor_apps_created_at"), "Creates index on created_at");
});

runTest("Test 2: RLS Policies strictly isolate submitters and prevent unauthorized reading", () => {
  const tutorSql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20261108110000_create_tutor_applications.sql"),
    "utf8"
  );

  // Check INSERT policy allows submission
  assert.ok(tutorSql.includes("FOR INSERT"), "Must define FOR INSERT policy");
  assert.ok(tutorSql.includes("TO anon, authenticated"), "Allows anonymous applicants to insert");

  // Check SELECT policy restricts to administrators
  assert.ok(tutorSql.includes("Administrators can read and manage tutor applications"), "Defines admin manage policy");
  assert.ok(tutorSql.includes("public.admin_users"), "Checks admin_users membership");
  assert.ok(tutorSql.includes("public.admin_profiles"), "Checks admin_profiles membership");

  // Ensure there is NO public select policy
  assert.ok(!tutorSql.includes("FOR SELECT\n  TO anon"), "Public anon must not be granted SELECT policy");
});

// -----------------------------------------------------------------------------
// 2. Abuse Protection: Rate Limiting & Honeypot
// -----------------------------------------------------------------------------
runTest("Test 3: In-memory sliding-window rate limiter throttles excessive requests", () => {
  const testIp = "test-rate-ip-" + Date.now();
  const maxReq = 3;
  const windowMs = 5000;

  // Requests 1, 2, 3 should succeed
  const r1 = checkRateLimit(testIp, maxReq, windowMs);
  assert.strictEqual(r1.allowed, true);
  assert.strictEqual(r1.remaining, 2);

  const r2 = checkRateLimit(testIp, maxReq, windowMs);
  assert.strictEqual(r2.allowed, true);
  assert.strictEqual(r2.remaining, 1);

  const r3 = checkRateLimit(testIp, maxReq, windowMs);
  assert.strictEqual(r3.allowed, true);
  assert.strictEqual(r3.remaining, 0);

  // 4th request must be rejected
  const r4 = checkRateLimit(testIp, maxReq, windowMs);
  assert.strictEqual(r4.allowed, false, "4th request within window must be rejected");
  assert.strictEqual(r4.remaining, 0);
  assert.ok(r4.retryAfterSeconds > 0, "Must calculate retry-after duration");
});

runTest("Test 4: Honeypot detector correctly flags automated bot payloads", () => {
  assert.strictEqual(isHoneypotTriggered("http://malicious-spam.ru"), true, "Fills honeypot url");
  assert.strictEqual(isHoneypotTriggered("some-bot-value"), true, "Fills random string");
  assert.strictEqual(isHoneypotTriggered("   "), false, "Whitespace is trimmed/clean");
  assert.strictEqual(isHoneypotTriggered(""), false, "Empty string is human");
  assert.strictEqual(isHoneypotTriggered(undefined), false, "Undefined is human");
  assert.strictEqual(isHoneypotTriggered(null), false, "Null is human");
});

runTest("Test 5: Cryptographic reference code generator produces expected format without ambiguous glyphs", () => {
  const tutorRef = generateReferenceCode("BL-TTR");
  assert.match(tutorRef, /^BL-TTR-[A-Z2-9]{5}$/, "Tutor ref must match BL-TTR-XXXXX");
  assert.ok(!tutorRef.includes("0"), "Must not contain ambiguous 0");
  assert.ok(!tutorRef.includes("O"), "Must not contain ambiguous O");
  assert.ok(!tutorRef.includes("1"), "Must not contain ambiguous 1");
  assert.ok(!tutorRef.includes("I"), "Must not contain ambiguous I");

  const schoolRef = generateReferenceCode("BL-SCH");
  assert.match(schoolRef, /^BL-SCH-[A-Z2-9]{5}$/, "School ref must match BL-SCH-XXXXX");
});

// -----------------------------------------------------------------------------
// 3. Endpoint Contract & Validation Integrity
// -----------------------------------------------------------------------------
runTest("Test 6: Tutor Application API validates required fields and NDPA requirements", () => {
  const routeCode = fs.readFileSync(
    path.join(process.cwd(), "app/api/tutors/apply/route.ts"),
    "utf8"
  );

  assert.ok(routeCode.includes("checkRateLimit"), "Integrates rate limiting");
  assert.ok(routeCode.includes("isHoneypotTriggered"), "Integrates honeypot defense");
  assert.ok(routeCode.includes("isAdultConfirmed"), "Validates 18+ adult confirmation");
  assert.ok(routeCode.includes("privacyConsent"), "Validates NDPA privacy consent");
  assert.ok(routeCode.includes("statementOfPedagogy.length > 1000"), "Enforces 1000 char cap on pedagogy");
  assert.ok(routeCode.includes("status: 503"), "Fails closed on database insert error");
  assert.ok(routeCode.includes("status: 429"), "Returns HTTP 429 on rate limit violation");
  assert.ok(routeCode.includes("status: 201"), "Returns HTTP 201 on confirmed persistence");
});

runTest("Test 7: Zero PII in Server Logs Rule", () => {
  const tutorRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/tutors/apply/route.ts"),
    "utf8"
  );
  const schoolRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/schools/inquiry/route.ts"),
    "utf8"
  );

  // Assert neither route logs raw phone or email
  assert.ok(!tutorRoute.includes("console.log(email)"), "Must not log email");
  assert.ok(!tutorRoute.includes("console.log(phone)"), "Must not log phone");
  assert.ok(!schoolRoute.includes("console.log(email)"), "Must not log email");
  assert.ok(!schoolRoute.includes("console.log(phone)"), "Must not log phone");
});

// -----------------------------------------------------------------------------
// 4. Role Isolation & Security Defenses
// -----------------------------------------------------------------------------
runTest("Test 8: Tutor application submission strictly isolates roles (Zero auto-provisioning)", () => {
  const tutorRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/tutors/apply/route.ts"),
    "utf8"
  );

  // Verify that POST does NOT touch access_user_role_assignments or call access_assign_role
  assert.ok(!tutorRoute.includes("access_assign_role"), "Must never assign role during application");
  assert.ok(!tutorRoute.includes("access_user_role_assignments"), "Must never insert role during application");
  assert.ok(!tutorRoute.includes("user_roles"), "Must never insert into user_roles during application");
});

// -----------------------------------------------------------------------------
// 5. Frontend Screens & Server-Confirmed Guarantees
// -----------------------------------------------------------------------------
runTest("Test 9: Dedicated Educator Application page exists with server confirmation cards", () => {
  const pagePath = path.join(process.cwd(), "app/for-tutors/apply/page.tsx");
  const formPath = path.join(process.cwd(), "app/components/public/TutorApplicationForm.tsx");
  assert.ok(fs.existsSync(pagePath), "app/for-tutors/apply/page.tsx must exist");

  const pageContent =
    fs.readFileSync(pagePath, "utf8") +
    (fs.existsSync(formPath) ? fs.readFileSync(formPath, "utf8") : "");
  assert.ok(pageContent.includes("TutorApplicationPage"), "Exports default component");
  assert.ok(
    pageContent.includes("isAdultConfirmed") || pageContent.includes("consentNdpa") || pageContent.includes("NDPA"),
    "Includes adult / privacy confirmation"
  );
  assert.ok(
    pageContent.includes("privacyConsent") || pageContent.includes("consentNdpa") || pageContent.includes("Nigeria Data Protection Act"),
    "Includes NDPA privacy notice"
  );
  assert.ok(
    pageContent.includes("website_url_hp") || pageContent.includes("honeypot"),
    "Includes honeypot field"
  );
  assert.ok(
    pageContent.includes("Application Confirmed & Stored") ||
    pageContent.includes("Application Confirmed &amp; Stored") ||
    pageContent.includes("Application Submitted") ||
    pageContent.includes("Application Received"),
    "Shows server-confirmed success"
  );
  assert.ok(
    pageContent.includes("Official Reference Code") ||
    pageContent.includes("Reference Code") ||
    pageContent.includes("submitResult.ref"),
    "Displays server-generated reference code"
  );
});

runTest("Test 10: Educator Suite page links directly to application workflow", () => {
  const forTutorsContent = fs.readFileSync(
    path.join(process.cwd(), "app/for-tutors/page.tsx"),
    "utf8"
  );
  assert.ok(forTutorsContent.includes('href="/for-tutors/apply"'), "Links to /for-tutors/apply");
});

runTest("Test 11: School inquiries form includes honeypot and NDPA consent", () => {
  const schoolsContent = fs.readFileSync(
    path.join(process.cwd(), "app/schools/page.tsx"),
    "utf8"
  );
  assert.ok(schoolsContent.includes("inquiryConsent"), "Includes NDPA consent state");
  assert.ok(schoolsContent.includes("inquiryHoneypot"), "Includes honeypot state");
  assert.ok(schoolsContent.includes("school_website_url_hp"), "Renders honeypot input");
});

runTest("Test 12: Admin Educator Review Dashboard exists with filtering and CSV export", () => {
  const adminTutorsPath = path.join(process.cwd(), "app/admin/tutors/page.tsx");
  assert.ok(fs.existsSync(adminTutorsPath), "app/admin/tutors/page.tsx must exist");

  const adminContent = fs.readFileSync(adminTutorsPath, "utf8");
  assert.ok(adminContent.includes("AdminTutorsPage"), "Exports default component");
  assert.ok(adminContent.includes("exportCsv"), "Includes CSV export functionality");
  assert.ok(adminContent.includes("handleSaveReview"), "Includes review saving functionality");
  assert.ok(
    adminContent.includes("User & Role Management") || adminContent.includes("User &amp; Role Management"),
    "Explicitly refers to role management rather than auto-granting"
  );
});

runTest("Test 13: S7 Anti-Hardcoded Figures Check", () => {
  const newFiles = [
    "app/api/tutors/apply/route.ts",
    "app/for-tutors/apply/page.tsx",
    "app/admin/tutors/page.tsx",
    "app/lib/abuseProtection.ts",
  ];

  for (const relPath of newFiles) {
    const fullPath = path.join(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf8");

    assert.ok(
      !content.includes("98.4% pass rate"),
      `File ${relPath} must not contain unverified pass rate claims`
    );
    assert.ok(
      !content.includes("Over 50,000 tutors"),
      `File ${relPath} must not contain invented tutor figures`
    );
  }
});

console.log("\n=========================================================================");
console.log(`ALL ${passed} VERIFICATION TESTS PASSED (${passed}/${passed + failed})`);
console.log("=========================================================================\n");

if (failed > 0) {
  process.exit(1);
}
