import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=========================================================================");
console.log("  BRAINLAB CI: WEBSITE A3 PAGES & ARCHITECTURAL VERIFICATION SUITE");
console.log("=========================================================================\n");

let passed = 0;
let failed = 0;

function test(description: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${msg}`);
    failed++;
  }
}

const rootDir = process.cwd();

// 1. PROGRAMME TEMPLATE & ACTIVE CURRICULUM PAGES
console.log("1. PROGRAMME PAGE TEMPLATE & CURRICULUM PAGES");

test("ProgrammePageTemplate component exists with required fields", () => {
  const tplPath = path.join(rootDir, "app/components/public/ProgrammePageTemplate.tsx");
  assert(fs.existsSync(tplPath), "ProgrammePageTemplate.tsx must exist");
  const content = fs.readFileSync(tplPath, "utf8");
  assert(content.includes("whoItIsFor"), "Template must display who it is for");
  assert(content.includes("objectives"), "Template must display objectives");
  assert(content.includes("subjects"), "Template must display subject coverage");
  assert(content.includes("includedProducts"), "Template must display included products");
  assert(content.includes("teachingFormat"), "Template must display teaching format");
  assert(content.includes("schedule"), "Template must display schedule");
  assert(content.includes("duration"), "Template must display duration");
  assert(content.includes("enrolmentSteps"), "Template must display 3-step enrolment");
  assert(content.includes("faqs"), "Template must display FAQs");
  assert(content.includes("isPlanned"), "Template must handle planned/in-development status");
});

test("Programmes index page exists and links all active & planned curricula", () => {
  const indexPath = path.join(rootDir, "app/programmes/page.tsx");
  assert(fs.existsSync(indexPath), "app/programmes/page.tsx must exist");
  const content = fs.readFileSync(indexPath, "utf8");
  assert(content.includes("/programmes/utme"), "Must link to UTME");
  assert(content.includes("/programmes/post-utme"), "Must link to Post-UTME");
  assert(content.includes("/programmes/waec"), "Must link to WAEC");
  assert(content.includes("/programmes/neco"), "Must link to NECO");
  assert(content.includes("/programmes/stem"), "Must link to STEM");
  assert(content.includes("/programmes/schools"), "Must link to Schools");
  assert(content.includes("/programmes/nursing"), "Must link to Nursing");
});

const PROGRAMME_SLUGS = ["utme", "post-utme", "waec", "neco", "stem", "schools", "nursing"];

for (const slug of PROGRAMME_SLUGS) {
  test(`Programme page exists: /programmes/${slug}`, () => {
    const pPath = path.join(rootDir, `app/programmes/${slug}/page.tsx`);
    assert(fs.existsSync(pPath), `app/programmes/${slug}/page.tsx must exist`);
    const content = fs.readFileSync(pPath, "utf8");
    assert(content.includes("ProgrammePageTemplate"), `Must render via ProgrammePageTemplate`);
    assert(content.includes("metadata"), `Must declare Next.js metadata`);
  });
}

test("Nursing programme is honestly labeled as planned / in active development", () => {
  const nursingPath = path.join(rootDir, "app/programmes/nursing/page.tsx");
  const content = fs.readFileSync(nursingPath, "utf8");
  assert(content.includes('status: "planned"'), "Nursing programme must declare planned status");
  assert(
    content.includes("Curriculum Availability Notice") || content.includes("in curriculum design"),
    "Nursing programme must show curriculum development disclaimer"
  );
  assert(
    content.includes("/contact?subject=Nursing+Programme+Waitlist"),
    "Nursing programme CTA must direct to waitlist inquiry instead of broken checkout"
  );
});

// 2. PLATFORM PAGES & BRAINLAB LOOP
console.log("\n2. PLATFORM PAGES & THE BRAINLAB LOOP");

test("Platform overview page exists and showcases the 8 core engines", () => {
  const platformPath = path.join(rootDir, "app/platform/page.tsx");
  assert(fs.existsSync(platformPath), "app/platform/page.tsx must exist");
  const content = fs.readFileSync(platformPath, "utf8");
  assert(content.includes("/platform/loop"), "Must link to BrainLab Loop");
  assert(content.includes("/platform/progress"), "Must link to Progress");
  assert(content.includes("/platform/ai-tutor"), "Must link to AI Tutor");
});

test("The BrainLab Loop overview exists with all 7 sequential learning stages", () => {
  const loopPath = path.join(rootDir, "app/platform/loop/page.tsx");
  assert(fs.existsSync(loopPath), "app/platform/loop/page.tsx must exist");
  const content = fs.readFileSync(loopPath, "utf8");
  assert(content.includes("Diagnostic Baseline Assessment"), "Must include Stage 1 Diagnostic");
  assert(content.includes("Misconception & Error Diagnosis"), "Must include Stage 2 Error Diagnosis");
  assert(content.includes("Targeted Concept & Syllabus Lessons"), "Must include Stage 3 Lessons");
  assert(content.includes("SM-2 Spaced Repetition"), "Must include Stage 4 Spaced Repetition");
  assert(content.includes("Interactive Masterclasses"), "Must include Stage 5 Masterclasses");
  assert(content.includes("Reinforcement Drills"), "Must include Stage 6 Drills");
  assert(content.includes("Full CBT Simulation"), "Must include Stage 7 Simulation");
});

test("Performance & Progress telemetry page exists", () => {
  const progPath = path.join(rootDir, "app/platform/progress/page.tsx");
  assert(fs.existsSync(progPath), "app/platform/progress/page.tsx must exist");
  const content = fs.readFileSync(progPath, "utf8");
  assert(content.includes("Score Trajectory"), "Must cover score trajectory");
  assert(content.includes("Topic Mastery Heatmaps"), "Must cover topic mastery");
  assert(content.includes("Time-per-Question"), "Must cover pacing telemetry");
  assert(content.includes("Psychometric"), "Must cover psychometrics");
});

// 3. AI TUTOR PAGE: WHAT IT DOES & WHAT IT DOES NOT DO
console.log("\n3. AI TUTOR CAPABILITIES, LIMITATIONS & INTEGRITY");

test("AI Tutor page prominently specifies both capabilities and pedagogical limitations", () => {
  const aiTutorPath = path.join(rootDir, "app/platform/ai-tutor/page.tsx");
  assert(fs.existsSync(aiTutorPath), "app/platform/ai-tutor/page.tsx must exist");
  const content = fs.readFileSync(aiTutorPath, "utf8");

  // Capabilities
  assert(content.includes("Socratic Step-by-Step Guidance"), "Must describe Socratic guidance");
  assert(content.includes("Distractor & Examiner Trap Analysis"), "Must describe distractor analysis");
  assert(content.includes("5-Question Weakness Reinforcement"), "Must describe 5-question drills");

  // Non-capabilities & Limitations (Mandated by user prompt)
  assert(
    content.includes("It is NOT Always Correct") || content.includes("Verification Required"),
    "Must state AI is not always correct and requires textbook verification"
  );
  assert(
    content.includes("NOT a Replacement for Human Teachers") || content.includes("not a replacement for human teachers"),
    "Must state AI is not a teacher replacement"
  );
  assert(
    content.includes("LOCKED During Live Mock Examinations") || content.includes("locked during live"),
    "Must state AI is strictly locked during live exams"
  );
  assert(
    content.includes("Will NOT Solve School Homework to Facilitate Cheating"),
    "Must state AI refuses cheating / homework dumps"
  );
  assert(content.includes("<PublicAiTutorDemo />"), "Must embed interactive PublicAiTutorDemo");
});

// 4. PRICING PAGE AUDIT & FREE ENTITLEMENT VERIFICATION
console.log("\n4. PRICING PAGE DATA SOURCE & REVIEW LABELS");

test("Pricing page reads plans dynamically from platformConfig / getSubscriptionPlans", () => {
  const pricingPath = path.join(rootDir, "app/pricing/page.tsx");
  const content = fs.readFileSync(pricingPath, "utf8");
  assert(content.includes("getSubscriptionPlans"), "Must fetch plans from getSubscriptionPlans()");
  assert(content.includes("DEFAULT_PLANS"), "Must import DEFAULT_PLANS fallback");
  assert(
    content.includes("[PENDING FORMAL APPROVAL]"),
    "Refund and cancellation claims must be marked for formal approval review"
  );
});

// 5. ABOUT SECTION & TRUST CENTRE
console.log("\n5. TRUST CENTRE & COMPLIANCE REVIEW");

test("Trust Centre exists with all 5 governance sections marked for formal review", () => {
  const trustPath = path.join(rootDir, "app/about/trust-centre/page.tsx");
  assert(fs.existsSync(trustPath), "app/about/trust-centre/page.tsx must exist");
  const content = fs.readFileSync(trustPath, "utf8");
  assert(content.includes("Content Quality"), "Must cover content quality");
  assert(content.includes("Tutor Quality & Educator Vetting"), "Must cover tutor standards");
  assert(content.includes("Data Protection & Row-Level Security"), "Must cover data protection");
  assert(content.includes("Child Safety & Youth Protection"), "Must cover child safety");
  assert(content.includes("Payment Verification"), "Must cover payment verification");
  assert(content.includes("PENDING_FORMAL_APPROVAL"), "Must mark assurances for formal review");
});

test("About page links to Trust Centre", () => {
  const aboutPath = path.join(rootDir, "app/about/page.tsx");
  const content = fs.readFileSync(aboutPath, "utf8");
  assert(content.includes("/about/trust-centre"), "About page must link to /about/trust-centre");
});

// 6. INFORMATIONAL PAGES & HONEST FALLBACKS
console.log("\n6. AUDIENCE PAGES & CONTACT FALLBACK INTEGRITY");

test("For Tutors and For Schools pages have honest contact links and no unbacked forms", () => {
  const tutorsPath = path.join(rootDir, "app/for-tutors/page.tsx");
  const tutorsContent = fs.readFileSync(tutorsPath, "utf8");
  assert(
    tutorsContent.includes('/contact?subject=Tutor+Application') || tutorsContent.includes('/contact'),
    "Tutor CTA must route to honest contact desk"
  );

  const schoolsPath = path.join(rootDir, "app/schools/page.tsx");
  const schoolsContent = fs.readFileSync(schoolsPath, "utf8");
  assert(
    schoolsContent.includes("support@brainlabacademy.com.ng") && schoolsContent.includes("/contact"),
    "Schools page must route to official support desk and contact directory"
  );
});

// 7. BREADCRUMBS & SCHEMA.ORG JSON-LD
console.log("\n7. BREADCRUMBS & SCHEMA.ORG JSON-LD");

test("Breadcrumbs component exists and injects BreadcrumbList JSON-LD", () => {
  const bcPath = path.join(rootDir, "app/components/public/Breadcrumbs.tsx");
  assert(fs.existsSync(bcPath), "Breadcrumbs.tsx must exist");
  const content = fs.readFileSync(bcPath, "utf8");
  assert(content.includes('aria-label="Breadcrumb"'), "Must be accessible with aria-label");
  assert(content.includes('"@type": "BreadcrumbList"'), "Must inject schema.org BreadcrumbList");
});

// 8. S7 & ANTI-HARDCODED NUMBERS SCAN
console.log("\n8. S7 ANTI-HARDCODED MARKETING FIGURES AUDIT");

test("Zero private student credentials or unverified marketing figures in new files", () => {
  const newFiles = [
    "app/components/public/Breadcrumbs.tsx",
    "app/components/public/ProgrammePageTemplate.tsx",
    "app/programmes/page.tsx",
    "app/programmes/utme/page.tsx",
    "app/programmes/post-utme/page.tsx",
    "app/programmes/waec/page.tsx",
    "app/programmes/neco/page.tsx",
    "app/programmes/stem/page.tsx",
    "app/programmes/schools/page.tsx",
    "app/programmes/nursing/page.tsx",
    "app/platform/page.tsx",
    "app/platform/loop/page.tsx",
    "app/platform/ai-tutor/page.tsx",
    "app/platform/progress/page.tsx",
    "app/about/trust-centre/page.tsx",
  ];

  for (const f of newFiles) {
    const fPath = path.join(rootDir, f);
    assert(fs.existsSync(fPath), `${f} must exist`);
    const c = fs.readFileSync(fPath, "utf8");
    assert(!c.includes("100,000+ Students"), `${f} must not contain invented student counts`);
    assert(!c.includes("99.9% Pass Rate"), `${f} must not contain invented pass rates`);
    assert(!c.includes("student_password"), `${f} must not contain credentials`);
  }
});

console.log("\n=========================================================================");
console.log(`  WEBSITE A3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=========================================================================");

if (failed > 0) {
  process.exit(1);
}
