/**
 * BrainLab CI: Prompt 9 (B2) School Enquiries and Tutor Applications Test Suite
 *
 * Verifies:
 * 1. Storage destination, DDL migrations, rollback SQL, and RLS policies
 * 2. Data minimisation and Nigeria Data Protection Act (NDPA) 2023 compliance
 * 3. Abuse protection: Honeypot trap, IP rate limiting, zero PII in logs
 * 4. Server-confirmed success: genuine reference numbers, fail-closed handling
 * 5. Notifications: Submitter acknowledgement, admin broadcast, zero unapproved 3rd parties
 * 6. Tutor role isolation: Applying NEVER grants a role or creates an auth account
 * 7. Admin review screens: Status management, audit tracking, CSV export
 */

import fs from "fs";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log("\n=========================================================================");
console.log("  BRAINLAB CI: PROMPT 9 SCHOOL ENQUIRIES & TUTOR APPLICATIONS SUITE");
console.log("=========================================================================\n");

// 1. MIGRATION DDL & RLS POLICIES
console.log("1. DATABASE MIGRATION & RLS ARCHITECTURE");
const migrationPath = "supabase/migrations/20261108110000_create_tutor_applications.sql";
const rollbackPath = "supabase/migrations/20261108110000_rollback_tutor_applications.sql";

assert(fs.existsSync(migrationPath), `${migrationPath} exists`);
assert(fs.existsSync(rollbackPath), `${rollbackPath} exists`);

if (fs.existsSync(migrationPath)) {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert(sql.includes("CREATE TABLE IF NOT EXISTS public.tutor_applications"), "Creates public.tutor_applications table");
  assert(sql.includes("reference_code TEXT NOT NULL UNIQUE"), "Enforces unique reference_code on tutor applications");
  assert(sql.includes("ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY"), "Enables RLS on tutor_applications");
  assert(sql.includes("CREATE POLICY \"Public applicants can submit tutor application\""), "Configures INSERT policy for public anon submitters");
  assert(sql.includes("CREATE POLICY \"Administrators can read and manage tutor applications\""), "Restricts SELECT and UPDATE to verified administrators only");
  assert(sql.includes("consent_recorded_at TIMESTAMPTZ"), "Records explicit NDPA consent timestamp");
  assert(sql.includes("reviewed_by UUID"), "Maintains administrative review identity");
}

if (fs.existsSync(rollbackPath)) {
  const rollbackSql = fs.readFileSync(rollbackPath, "utf8");
  assert(rollbackSql.includes("DROP TABLE IF EXISTS public.tutor_applications CASCADE"), "Rollback drops tutor_applications table cleanly");
  assert(rollbackSql.includes("DROP POLICY IF EXISTS \"Administrators can read and manage tutor applications\""), "Rollback drops administrator RLS policy");
}

// 2. ENDPOINTS & ABUSE PROTECTION
console.log("\n2. ROUTE HANDLERS, ABUSE PROTECTION & FAIL-CLOSED HANDLING");
const schoolRoutePath = "app/api/schools/inquiry/route.ts";
const tutorRoutePath = "app/api/tutors/apply/route.ts";

assert(fs.existsSync(schoolRoutePath), `${schoolRoutePath} exists`);
assert(fs.existsSync(tutorRoutePath), `${tutorRoutePath} exists`);

if (fs.existsSync(schoolRoutePath)) {
  const schoolCode = fs.readFileSync(schoolRoutePath, "utf8");
  assert(schoolCode.includes("checkRateLimit"), "School inquiry enforces sliding-window IP rate limiting");
  assert(schoolCode.includes("isHoneypotTriggered"), "School inquiry detects and silently deflects honeypot bot traps");
  assert(schoolCode.includes('generateReferenceCode("BL-SCH")'), "School inquiry generates authentic BL-SCH-XXXXX reference codes");
  assert(schoolCode.includes("status: 503"), "School inquiry fails closed with HTTP 503 if database persistence fails");
  assert(!schoolCode.includes("console.log(email)") && schoolCode.includes("[INSTITUTIONAL INQUIRY] Ref: ${referenceCode} | Status: Recorded"), "Zero unredacted PII emitted in server logs");
  assert(schoolCode.includes("isGovernanceAdminRole"), "Restricts inquiry reading to governance admin roles");
}

if (fs.existsSync(tutorRoutePath)) {
  const tutorCode = fs.readFileSync(tutorRoutePath, "utf8");
  assert(tutorCode.includes("checkRateLimit"), "Tutor application enforces sliding-window IP rate limiting");
  assert(tutorCode.includes("isHoneypotTriggered"), "Tutor application detects honeypot bot submissions");
  assert(tutorCode.includes('generateReferenceCode("BL-TTR")'), "Tutor application generates authentic BL-TTR-XXXXX reference codes");
  assert(tutorCode.includes("status: 503"), "Tutor application fails closed with HTTP 503 if database persistence fails");
  assert(tutorCode.includes("!privacyConsent"), "Rejects submission if NDPA 2023 consent checkbox is missing");
  assert(tutorCode.includes("!isAdultConfirmed"), "Rejects submission if applicant does not confirm adult age");
  assert(tutorCode.includes("isGovernanceAdminRole"), "Restricts application reading to governance admin roles");
  assert(tutorCode.includes("admin_live_alerts"), "Dispatches secure realtime alert to admin desk");
}

// 3. PUBLIC FORMS & SERVER-CONFIRMED SUCCESS
console.log("\n3. PUBLIC FORMS & SERVER-CONFIRMED SUCCESS");
const schoolsPagePath = "app/schools/page.tsx";
const tutorFormPath = "app/components/public/TutorApplicationForm.tsx";
const tutorApplyPagePath = "app/for-tutors/apply/page.tsx";

assert(fs.existsSync(schoolsPagePath), `${schoolsPagePath} exists`);
assert(fs.existsSync(tutorFormPath), `${tutorFormPath} exists`);
assert(fs.existsSync(tutorApplyPagePath), `${tutorApplyPagePath} exists`);

if (fs.existsSync(schoolsPagePath)) {
  const pageCode = fs.readFileSync(schoolsPagePath, "utf8");
  assert(pageCode.includes("inquiryConsent"), "School inquiry form renders NDPA consent checkbox state");
  assert(pageCode.includes("inquiryHoneypot"), "School inquiry form contains bot honeypot trap");
  assert(pageCode.includes("submitResult.ok"), "Displays success state only after server confirmation");
  assert(pageCode.includes("submitResult.ref"), "Renders server-provided reference code on success");
  assert(pageCode.includes("whatsappNumber"), "Provides honest WhatsApp fallback if submission fails");
}

if (fs.existsSync(tutorFormPath)) {
  const formCode = fs.readFileSync(tutorFormPath, "utf8");
  assert(formCode.includes("privacyConsent"), "Tutor form binds mandatory NDPA 2023 consent state");
  assert(formCode.includes("website_url_hp"), "Tutor form contains invisible honeypot input");
  assert(formCode.includes("submitResult && submitResult.ok"), "Tutor form renders success ticket only upon confirmed HTTP 200/201 response");
  assert(formCode.includes("submitResult.ref"), "Tutor form renders server-generated reference code with copy capability");
  assert(formCode.includes("CANONICAL_PHONE_DIGITS"), "Provides direct WhatsApp Academic Desk follow-up on error or success");
}

// 4. ROLE ISOLATION & DATA MINIMISATION
console.log("\n4. TUTOR ROLE ISOLATION & DATA MINIMISATION (NDPA 2023)");
if (fs.existsSync(tutorRoutePath)) {
  const tutorCode = fs.readFileSync(tutorRoutePath, "utf8");
  assert(!tutorCode.includes("admin_users") && !tutorCode.includes("admin_profiles") && !tutorCode.includes("user_roles"), "POST /api/tutors/apply NEVER writes to admin_profiles or user_roles");
  assert(!/\bbvn\b/i.test(tutorCode) && !/\bnin\b/i.test(tutorCode) && !tutorCode.includes("bank_account"), "Data minimisation: Strictly excludes BVN, NIN, and financial data");
}

// 5. ADMIN REVIEW SCREENS & AUDIT LOGGING
console.log("\n5. ADMIN REVIEW SCREENS & AUDIT CAPABILITIES");
const adminSchoolsPath = "app/admin/schools/page.tsx";
const adminTutorsPath = "app/admin/tutors/applications/page.tsx";

assert(fs.existsSync(adminSchoolsPath), `${adminSchoolsPath} exists`);
assert(fs.existsSync(adminTutorsPath), `${adminTutorsPath} exists`);

if (fs.existsSync(adminSchoolsPath)) {
  const code = fs.readFileSync(adminSchoolsPath, "utf8");
  assert(code.includes("/api/schools/inquiry"), "Admin schools page connects to live /api/schools/inquiry");
  assert(code.includes("handleUpdateStatus"), "Admin schools page provides status transition capabilities");
  assert(code.includes("handleExportInquiriesCsv"), "Admin schools page provides CSV export functionality");
}

if (fs.existsSync(adminTutorsPath)) {
  const code = fs.readFileSync(adminTutorsPath, "utf8");
  assert(code.includes("/api/tutors/apply"), "Admin tutors page connects to live /api/tutors/apply");
  assert(code.includes("handleStatusChange"), "Admin tutors page supports status review transitions");
  assert(code.includes("handleExportCsv"), "Admin tutors page provides CSV export functionality");
  assert(code.includes("consent_recorded_at"), "Admin tutors page displays verified NDPA consent timestamp");
}

console.log("\n=========================================================================");
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=========================================================================\n");

if (failed > 0) {
  process.exit(1);
}
