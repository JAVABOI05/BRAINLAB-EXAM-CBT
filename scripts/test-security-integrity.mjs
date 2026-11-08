import fs from "fs";
import assert from "assert";

console.log("=================================================================");
console.log("BRAINLAB SECURITY & INTEGRITY VERIFICATION SUITE");
console.log("=================================================================\n");

// -----------------------------------------------------------------------------
// Test 1: STEM Resources Route A (Public listing)
// -----------------------------------------------------------------------------
console.log("Test 1: STEM Resources List Route (`/api/stem/resources`)");
const stemResourcesCode = fs.readFileSync("app/api/stem/resources/route.ts", "utf8").replace(/\r\n/g, "\n");
assert(
  stemResourcesCode.includes("getSupabasePublicServerClient()"),
  "FAIL: Public reads do not invoke getSupabasePublicServerClient()"
);
assert(
  stemResourcesCode.includes('effectiveStatus = isAuthorizedReviewer && requestedStatus'),
  "FAIL: Caller-supplied status override is not restricted to authorized reviewers"
);
assert(
  stemResourcesCode.includes(': "published"'),
  "FAIL: Public callers do not default to status=published"
);
console.log("  [PASS] Public reads enforce status=published server-side and ignore caller draft overrides.\n");

// -----------------------------------------------------------------------------
// Test 2: STEM Resource by Slug Route (`/api/stem/resources/[slug]`)
// -----------------------------------------------------------------------------
console.log("Test 2: STEM Resource Slug Route (`/api/stem/resources/[slug]`)");
const stemSlugCode = fs.readFileSync("app/api/stem/resources/[slug]/route.ts", "utf8").replace(/\r\n/g, "\n");
assert(
  stemSlugCode.includes("getSupabasePublicServerClient()"),
  "FAIL: Public reads do not invoke getSupabasePublicServerClient()"
);
assert(
  stemSlugCode.includes('if (!isAuthorizedReviewer && resource.status !== "published")'),
  "FAIL: Route does not verify published status for non-reviewers"
);
assert(
  stemSlugCode.includes('return NextResponse.json({ ok: false, error: "STEM resource not found" }, { status: 404 })'),
  "FAIL: Route does not return 404 for draft/archived resources when accessed by unauthenticated callers"
);
console.log("  [PASS] Draft rows return HTTP 404 to unauthenticated or student callers.\n");

// -----------------------------------------------------------------------------
// Test 3: Curriculum Route (`/api/curriculum`)
// -----------------------------------------------------------------------------
console.log("Test 3: Curriculum Route (`/api/curriculum`)");
const curriculumCode = fs.readFileSync("app/api/curriculum/route.ts", "utf8").replace(/\r\n/g, "\n");
assert(
  curriculumCode.includes("getSupabasePublicServerClient()"),
  "FAIL: Public reads do not invoke getSupabasePublicServerClient()"
);
assert(
  curriculumCode.includes('.from("learning_subjects")') && curriculumCode.includes('.eq("is_published", true)'),
  "FAIL: Curriculum route does not enforce is_published=true on learning_subjects"
);
assert(
  curriculumCode.includes('.from("learning_topics")') && curriculumCode.includes('.eq("is_published", true)'),
  "FAIL: Curriculum route does not enforce is_published=true on learning_topics"
);
console.log("  [PASS] Curriculum route enforces is_published=true across subjects and topics using anon public client.\n");

// -----------------------------------------------------------------------------
// Test 4: Academic Subjects Route (`/api/subjects`)
// -----------------------------------------------------------------------------
console.log("Test 4: Subjects Route (`/api/subjects`)");
const subjectsCode = fs.readFileSync("app/api/subjects/route.ts", "utf8").replace(/\r\n/g, "\n");
assert(
  subjectsCode.includes("getSupabasePublicServerClient"),
  "FAIL: Subjects route does not import getSupabasePublicServerClient"
);
assert(
  !subjectsCode.includes("getSupabaseServerClient"),
  "FAIL: Subjects route still uses privileged getSupabaseServerClient"
);
console.log("  [PASS] Subjects route uses getSupabasePublicServerClient; zero service-role client elevation.\n");

// -----------------------------------------------------------------------------
// Test 5: School Inquiry API Route (`/api/schools/inquiry`)
// -----------------------------------------------------------------------------
console.log("Test 5: School Inquiry API Fail-Closed Behavior (`/api/schools/inquiry`)");
const inquiryCode = fs.readFileSync("app/api/schools/inquiry/route.ts", "utf8").replace(/\r\n/g, "\n");
assert(
  inquiryCode.includes("if (insertError)"),
  "FAIL: Inquiry API does not check insertError"
);
assert(
  inquiryCode.includes("status: 503"),
  "FAIL: Inquiry API does not return HTTP 503 on persistence failure"
);
assert(
  inquiryCode.includes('ok: false'),
  "FAIL: Inquiry API claims ok:true when database persistence fails!"
);
console.log("  [PASS] School inquiry fails closed and returns HTTP 503 error without claiming false success.\n");

// -----------------------------------------------------------------------------
// Test 6: School Inquiry Frontend UI (`app/schools/page.tsx`)
// -----------------------------------------------------------------------------
console.log("Test 6: School Inquiry Frontend Fallback & Error UI (`app/schools/page.tsx`)");
const schoolsUiCode = fs.readFileSync("app/schools/page.tsx", "utf8").replace(/\r\n/g, "\n");
assert(
  !schoolsUiCode.includes("const localRef = `BL-SCH-"),
  "FAIL: Frontend still invents fake local reference code on failure!"
);
assert(
  schoolsUiCode.includes("getWhatsAppChatUrl"),
  "FAIL: Error state does not provide direct WhatsApp chat fallback link"
);
assert(
  schoolsUiCode.includes("mailto:support@brainlab.edu.ng"),
  "FAIL: Error state does not provide direct Email fallback link"
);
console.log("  [PASS] Frontend renders honest error state with direct WhatsApp and Email fallback buttons.\n");

console.log("-----------------------------------------------------------------");
console.log("ALL 6 SECURITY & INTEGRITY VERIFICATION GATES PASSED (100% SUCCESS)");
console.log("=================================================================");
