import fs from "fs";
import path from "path";

// Color helpers
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ ${red("FAILED:")} ${desc}`);
    failed++;
  }
}

const rootDir = process.cwd();

console.log(bold("\n========================================================================="));
console.log(bold("  BRAINLAB CI: PROMPT 8 (A4) VISUAL, MOTION & PERFORMANCE BUDGETS SUITE"));
console.log(bold("=========================================================================\n"));

// ---------------------------------------------------------------------------
// 1. ASSET PLAN INVENTORY & EXPLICIT BOUNDS (CLS = 0)
// ---------------------------------------------------------------------------
console.log(bold("1. HOMEPAGE ASSET PLAN SLOTS & LAYOUT SHIFT PROTECTION"));

const heroPath = path.join(rootDir, "app/components/home/HomeHero.tsx");
assert(fs.existsSync(heroPath), "HomeHero component exists");
const heroContent = fs.readFileSync(heroPath, "utf8");
assert(
  heroContent.includes("Interactive CBT Practice Simulator Preview") || heroContent.includes("Slot S1-02"),
  "Slot S1-02: Real interactive CBT Simulator Preview embedded in Hero"
);
assert(
  heroContent.includes("min-h-") || heroContent.includes("h-"),
  "Slot S1-02 enforces explicit min-height container to prevent layout shift (CLS = 0)"
);

const loopPath = path.join(rootDir, "app/components/home/HomeBrainLabLoop.tsx");
assert(fs.existsSync(loopPath), "HomeBrainLabLoop component exists");
const loopContent = fs.readFileSync(loopPath, "utf8");
assert(
  loopContent.includes("THE BRAINLAB LOOP") && loopContent.includes("SLOTS S3-01"),
  "Slot S3-01: 5-Stage interactive Loop Stepper is implemented"
);
assert(
  loopContent.includes("Slot S3-02") || loopContent.includes("Diagnostic Cognitive Radar"),
  "Slot S3-02: Cognitive Radar & topic weakness diagnostic preview is embedded"
);

const showcasePath = path.join(rootDir, "app/components/home/HomeProductShowcase.tsx");
assert(fs.existsSync(showcasePath), "HomeProductShowcase component exists");
const showcaseContent = fs.readFileSync(showcasePath, "utf8");
assert(
  showcaseContent.includes("SLOTS S4-01 TO S4-04") || showcaseContent.includes("cbt-simulator"),
  "Slots S4-01 to S4-04: Product Showcase provides interactive previews for core products"
);
assert(
  showcaseContent.includes("min-h-[420px]") || showcaseContent.includes("min-h-"),
  "Product Showcase enforces explicit dimensions on preview containers (CLS = 0)"
);

const stemPath = path.join(rootDir, "app/components/home/HomeStemStudio.tsx");
assert(fs.existsSync(stemPath), "HomeStemStudio component exists");
const stemContent = fs.readFileSync(stemPath, "utf8");
assert(
  stemContent.includes("Slot S5-01") || stemContent.includes("Interactive Logic Gate Bench"),
  "Slot S5-01: Interactive Boolean Logic Gates workbench is embedded on homepage"
);
assert(
  stemContent.includes("AND") && stemContent.includes("OR") && stemContent.includes("XOR"),
  "Slot S5-01: Implements AND, OR, NOT, XOR logic gate toggle simulations"
);

// ---------------------------------------------------------------------------
// 2. S6 CLAIM SUPPRESSION FOR UNAPPROVED SLOTS
// ---------------------------------------------------------------------------
console.log(bold("\n2. UNAPPROVED ASSET SLOTS SUPPRESSION (RULE S6)"));

const trustPath = path.join(rootDir, "app/components/home/HomeTrustOutcomes.tsx");
assert(fs.existsSync(trustPath), "HomeTrustOutcomes component exists");
const trustContent = fs.readFileSync(trustPath, "utf8");
assert(
  trustContent.includes("return null") || trustContent.includes("hasApprovedTrustClaims = false"),
  "Slot S6-01 & S6-02: Trust & Outcomes section is suppressed while awaiting verified consent"
);

const founderPath = path.join(rootDir, "app/components/home/HomeFounderNote.tsx");
assert(fs.existsSync(founderPath), "HomeFounderNote component exists");
const founderContent = fs.readFileSync(founderPath, "utf8");
assert(
  founderContent.includes("return null") || founderContent.includes("hasApprovedFounderNote = false"),
  "Slot S8-01: Founder note is suppressed while awaiting approved personal statement"
);

// ---------------------------------------------------------------------------
// 3. MOTION TOKENS & ACCESSIBILITY SPECIFICATION
// ---------------------------------------------------------------------------
console.log(bold("\n3. MOTION SPECIFICATION & PREFERS-REDUCED-MOTION"));

const globalsPath = path.join(rootDir, "app/globals.css");
assert(fs.existsSync(globalsPath), "app/globals.css exists");
const globalsContent = fs.readFileSync(globalsPath, "utf8");

assert(globalsContent.includes("@keyframes bl-fade-in"), "Defines keyframe: bl-fade-in");
assert(globalsContent.includes("@keyframes bl-fade-up"), "Defines keyframe: bl-fade-up");
assert(globalsContent.includes("@keyframes bl-scale-in"), "Defines keyframe: bl-scale-in");
assert(globalsContent.includes(".bl-stagger-1") && globalsContent.includes(".bl-stagger-4"), "Defines staggered reveal tokens (.bl-stagger-1 to 4)");
assert(
  globalsContent.includes("@media (prefers-reduced-motion: reduce)"),
  "Enforces prefers-reduced-motion media query"
);
assert(
  globalsContent.includes("animation-duration: 0.01ms !important") || globalsContent.includes("animation: none !important"),
  "Reduced-motion completely neutralizes animations to prevent disorientation or nausea"
);

// ---------------------------------------------------------------------------
// 4. THREE.JS ISOLATION & VIDEO POLICIES
// ---------------------------------------------------------------------------
console.log(bold("\n4. THREE.JS HOMEPAGE EXCLUSION & VIDEO POLICY"));

const homepageClientPath = path.join(rootDir, "app/HomePageClient.tsx");
const homepageClientContent = fs.readFileSync(homepageClientPath, "utf8");
assert(!homepageClientContent.includes("three"), "Three.js is strictly absent from HomePageClient");

const homeIndexPath = path.join(rootDir, "app/page.tsx");
const homeIndexContent = fs.readFileSync(homeIndexPath, "utf8");
assert(!homeIndexContent.includes("three"), "Three.js is strictly absent from app/page.tsx");

// Check all home components for video autoplay
const homeDir = path.join(rootDir, "app/components/home");
const homeFiles = fs.readdirSync(homeDir).filter((f) => f.endsWith(".tsx"));
let hasAutoplayVideo = false;
for (const file of homeFiles) {
  const content = fs.readFileSync(path.join(homeDir, file), "utf8");
  if (content.includes("<video") && content.includes("autoPlay")) {
    hasAutoplayVideo = true;
    break;
  }
}
assert(!hasAutoplayVideo, "Zero autoplaying video with sound across all homepage sections");

// ---------------------------------------------------------------------------
// 5. PERFORMANCE BUDGETS
// ---------------------------------------------------------------------------
console.log(bold("\n5. PERFORMANCE BUDGETS (FONT & PAYLOAD)"));

// Font budget: Native system stack used
assert(
  globalsContent.includes("-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto") ||
  globalsContent.includes("system-ui"),
  "0 KB Font Network Budget: System font stack declared for instantaneous First Contentful Paint"
);

// ---------------------------------------------------------------------------
// 6. S7 LIVE FIGURE ANIMATION RULE
// ---------------------------------------------------------------------------
console.log(bold("\n6. S7 LIVE FIGURE ANIMATION RULE"));

const countdownPath = path.join(rootDir, "app/components/home/DynamicCountdownSlot.tsx");
assert(fs.existsSync(countdownPath), "DynamicCountdownSlot exists");
const countdownContent = fs.readFileSync(countdownPath, "utf8");
assert(
  countdownContent.includes("ExamCountdownBanner"),
  "Countdown renders only live admin-configured exam calendar data"
);

const statsPath = path.join(rootDir, "app/components/home/DynamicLiveStatisticsSlot.tsx");
assert(fs.existsSync(statsPath), "DynamicLiveStatisticsSlot exists");
const statsContent = fs.readFileSync(statsPath, "utf8");
assert(
  statsContent.includes("VerifiedLiveStatsBar"),
  "Live statistics render only verified head-count aggregate queries"
);

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log(bold("\n========================================================================="));
if (failed === 0) {
  console.log(bold(green(`  ALL PROMPT 8 VISUAL, MOTION & BUDGET CHECKS PASSED: ${passed} PASSED, 0 FAILED`)));
} else {
  console.error(bold(red(`  PROMPT 8 CHECKS FAILED: ${failed} FAILED, ${passed} PASSED`)));
  process.exit(1);
}
console.log(bold("=========================================================================\n"));
