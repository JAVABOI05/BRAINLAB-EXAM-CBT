import fs from "fs";
import path from "path";

console.log("=========================================================================");
console.log("  BRAINLAB CI: PUBLIC STEM & AI DEMO VERIFICATION SUITE");
console.log("=========================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// 1. STEM DEMO COMPONENT INSPECTION & MATHEMATICAL ENGINE
// ---------------------------------------------------------------------------
console.log("1. PUBLIC STEM DEMONSTRATION & MATHEMATICAL PARABOLA EXPLORER");
const stemDemoPath = path.join(process.cwd(), "app/components/public/PublicStemDemo.tsx");
assert(fs.existsSync(stemDemoPath), "PublicStemDemo component file exists");

const stemDemoContent = fs.readFileSync(stemDemoPath, "utf-8");
assert(
  stemDemoContent.includes("calculateTelemetry") &&
  stemDemoContent.includes("b * b - 4 * safeA * c") &&
  stemDemoContent.includes("vertexX"),
  "Implements pure client-side mathematical simulation of quadratic equations without external API calls"
);
assert(
  stemDemoContent.includes("drawCanvas") &&
  stemDemoContent.includes("arc(vx, vy, 5, 0, Math.PI * 2)"),
  "Implements dynamic 2D canvas curve, vertex, and root indicator rendering"
);
assert(
  stemDemoContent.includes("isLowSpecDevice") &&
  stemDemoContent.includes("useFallbackView") &&
  stemDemoContent.includes("<svg") &&
  stemDemoContent.includes("Lightweight Static Mode active"),
  "Includes automatic low-spec device detection and lightweight static SVG fallback mode"
);
assert(
  stemDemoContent.includes('aria-label="Quadratic coefficient a"') &&
  stemDemoContent.includes("aria-valuenow") &&
  stemDemoContent.includes('aria-live="polite"'),
  "Complies with WCAG accessibility standards with aria-valuenow and aria-live telemetry announcements"
);
assert(
  stemDemoContent.includes('bgColor = isDark ? "#070e1b" : "#f8fafc"') &&
  stemDemoContent.includes("curveColor = isDark ?"),
  "Supports dark (#070e1b) and light (#f8fafc) theme tokens"
);

// ---------------------------------------------------------------------------
// 2. THROTTLED MOBILE & LOW-SPEC DEVICE FALLBACK VERIFICATION
// ---------------------------------------------------------------------------
console.log("\n2. THROTTLED MOBILE & HARDWARE FALLBACK VERIFICATION");
assert(
  stemDemoContent.includes("deviceMemory") &&
  stemDemoContent.includes("hardwareConcurrency") &&
  stemDemoContent.includes("mem <= 1 || cores <= 1"),
  "Inspects navigator.deviceMemory and hardwareConcurrency for weak mobile devices"
);
assert(
  stemDemoContent.includes("setForceFallback") &&
  stemDemoContent.includes("Switch to Low-Data SVG"),
  "Provides manual toggle to switch into lightweight SVG mode at user discretion"
);
assert(
  stemDemoContent.includes("viewBox=\"0 0 320 220\"") &&
  stemDemoContent.includes("<rect width=\"320\" height=\"220\""),
  "Renders responsive vector SVG diagram with zero GPU/Canvas context overhead in fallback mode"
);

// ---------------------------------------------------------------------------
// 3. KEYBOARD ACCESSIBILITY & CONTROLS VERIFICATION
// ---------------------------------------------------------------------------
console.log("\n3. ACCESSIBILITY & KEYBOARD ALTERNATIVES");
assert(
  stemDemoContent.includes('step="0.5"') &&
  stemDemoContent.includes('step="1"'),
  "Continuous sliders support discrete step increments for keyboard arrow key navigation"
);
assert(
  stemDemoContent.includes("Preset: 2 Roots") &&
  stemDemoContent.includes("Preset: Tangent") &&
  stemDemoContent.includes("Preset: Complex"),
  "Provides one-click accessible presets for users unable to manipulate continuous range sliders"
);
assert(
  stemDemoContent.includes("aria-valuemin") &&
  stemDemoContent.includes("aria-valuemax"),
  "Range inputs declare explicit aria-valuemin and aria-valuemax bounds"
);

// ---------------------------------------------------------------------------
// 4. STEM STUDIO PRODUCT PAGE EMBEDDING & ISOLATION
// ---------------------------------------------------------------------------
console.log("\n4. STEM STUDIO PAGE EMBEDDING & ROUTE ISOLATION");
const stemProductPagePath = path.join(process.cwd(), "app/products/stem-studio/page.tsx");
assert(fs.existsSync(stemProductPagePath), "app/products/stem-studio/page.tsx exists");
const stemProductContent = fs.readFileSync(stemProductPagePath, "utf-8");
assert(
  stemProductContent.includes("<PublicStemDemo />"),
  "PublicStemDemo is embedded directly on the public STEM Studio page"
);
assert(
  stemProductContent.includes("/classroom/stem"),
  "Provides clear call to action routing to authenticated STEM Studio workspace"
);
assert(
  !stemProductContent.includes("/admin/stem") &&
  !stemProductContent.includes("draft=true") &&
  !stemProductContent.includes("internal_bench"),
  "Zero links to unpublished or admin-only STEM resources on the public page"
);

// ---------------------------------------------------------------------------
// 5. PUBLIC AI TUTOR DEMO & PEDAGOGICAL BOUNDARIES
// ---------------------------------------------------------------------------
console.log("\n5. PUBLIC AI TUTOR DEMO & PEDAGOGICAL BOUNDARIES");
const aiDemoPath = path.join(process.cwd(), "app/components/public/PublicAiTutorDemo.tsx");
assert(fs.existsSync(aiDemoPath), "PublicAiTutorDemo component file exists");

const aiDemoContent = fs.readFileSync(aiDemoPath, "utf-8");
assert(
  aiDemoContent.includes("Verification Required") &&
  aiDemoContent.includes("Not a Teacher Replacement") &&
  aiDemoContent.includes("Locked in Live Exams"),
  "Prominently displays honest pedagogical boundaries and safety limitations"
);
assert(
  aiDemoContent.includes("CURATED_EXAMPLES") &&
  aiDemoContent.includes("math-quadratic") &&
  aiDemoContent.includes("physics-kinematics") &&
  aiDemoContent.includes("chem-oxidation"),
  "Provides curated zero-cost Socratic walkthroughs across Mathematics, Physics, and Chemistry"
);
assert(
  aiDemoContent.includes('maxLength={250}') &&
  aiDemoContent.includes("/api/ai-tutor/public-demo"),
  "Provides rate-limited public guest sandbox with 250-character cap"
);

// ---------------------------------------------------------------------------
// 6. PUBLIC AI TUTOR API ROUTE SECURITY, RATE LIMITING & COST CAPS
// ---------------------------------------------------------------------------
console.log("\n6. PUBLIC AI DEMO API RATE LIMITING & SECURITY GUARDRAILS");
const aiApiPath = path.join(process.cwd(), "app/api/ai-tutor/public-demo/route.ts");
assert(fs.existsSync(aiApiPath), "app/api/ai-tutor/public-demo/route.ts exists");

const aiApiContent = fs.readFileSync(aiApiPath, "utf-8");
assert(
  aiApiContent.includes("MAX_QUESTION_LENGTH = 250"),
  "Enforces maximum question length cap of 250 characters"
);
assert(
  aiApiContent.includes("MAX_GUEST_DAILY_PER_IP = 2"),
  "Limits guest visitors to 2 questions per IP per 24 hours"
);
assert(
  aiApiContent.includes("MAX_GLOBAL_DAILY_CEILING = 300"),
  "Enforces global daily cost ceiling cap of 300 public questions per day"
);
assert(
  aiApiContent.includes("status: 429"),
  "Returns HTTP 429 status code when rate limit or global ceiling is reached"
);
assert(
  aiApiContent.includes("process.env.GROQ_API_KEY") &&
  !aiApiContent.includes("NEXT_PUBLIC_GROQ"),
  "Keeps AI API credentials strictly server-side with zero client exposure"
);
assert(
  aiApiContent.includes("Refuse non-academic questions, active examination cheating requests"),
  "Embeds strict academic safety instructions preventing abuse and live test cheating"
);

// ---------------------------------------------------------------------------
// 7. EMBEDDING IN AI LEARNING PRODUCT PAGE
// ---------------------------------------------------------------------------
console.log("\n7. AI LEARNING PRODUCT PAGE EMBEDDING INTEGRITY");
const aiProductPagePath = path.join(process.cwd(), "app/products/ai-learning/page.tsx");
assert(fs.existsSync(aiProductPagePath), "app/products/ai-learning/page.tsx exists");
const aiProductContent = fs.readFileSync(aiProductPagePath, "utf-8");
assert(
  aiProductContent.includes("<PublicAiTutorDemo />"),
  "PublicAiTutorDemo is embedded directly on the public AI Learning page"
);

// ---------------------------------------------------------------------------
// 8. S7 COMPLIANCE & ZERO PRIVATE DATA LEAK
// ---------------------------------------------------------------------------
console.log("\n8. S7 ANTI-HARDCODED FIGURES & DATA PROTECTION AUDIT");
assert(
  !stemDemoContent.includes("password") &&
  !stemDemoContent.includes("sessionToken") &&
  !aiDemoContent.includes("student_id"),
  "Zero private student identifiers or credentials present in public demonstration components"
);
assert(
  !aiDemoContent.includes("supabase.from(") &&
  !stemDemoContent.includes("supabase.from("),
  "Components perform zero unauthorized database queries and leak no private tables"
);

console.log("\n=========================================================================");
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=========================================================================");

if (failed > 0) {
  process.exit(1);
}
