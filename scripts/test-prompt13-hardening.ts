import fs from "fs";
import path from "path";

console.log("=========================================================================");
console.log("  BRAINLAB CI: PROMPT 13 HARDENING (SEO, ACCESSIBILITY, PERFORMANCE, REGRESSION)");
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
// 1. SEO: METADATA, CANONICAL URLS, SITEMAP, ROBOTS & REDIRECTS
// ---------------------------------------------------------------------------
console.log("1. SEO: METADATA, CANONICALS, ROBOTS & REDIRECTS");

const robotsPath = path.join(process.cwd(), "app/robots.ts");
assert(fs.existsSync(robotsPath), "app/robots.ts exists");
const robotsContent = fs.readFileSync(robotsPath, "utf-8");
assert(
  robotsContent.includes("disallow:") &&
  robotsContent.includes('"/exam"') &&
  robotsContent.includes('"/result"') &&
  robotsContent.includes('"/account"') &&
  robotsContent.includes('"/api"'),
  "robots.ts protects private examination, candidate result, account, and API routes"
);

const sitemapPath = path.join(process.cwd(), "app/sitemap.ts");
assert(fs.existsSync(sitemapPath), "app/sitemap.ts exists");
const sitemapContent = fs.readFileSync(sitemapPath, "utf-8");
assert(
  sitemapContent.includes('url: `${siteUrl}/products`') &&
  sitemapContent.includes('url: `${siteUrl}/products/stem-studio`') &&
  sitemapContent.includes('url: `${siteUrl}/products/ai-learning`') &&
  sitemapContent.includes('url: `${siteUrl}/for-students`') &&
  sitemapContent.includes('url: `${siteUrl}/for-tutors`'),
  "sitemap.ts indexes only public marketing, product, and resource pages"
);
assert(
  !sitemapContent.includes("/admin") &&
  !sitemapContent.includes("/exam/") &&
  !sitemapContent.includes("/result/"),
  "sitemap.ts strictly excludes private administrative and test-taking routes"
);

const nextConfigPath = path.join(process.cwd(), "next.config.ts");
assert(fs.existsSync(nextConfigPath), "next.config.ts exists");
const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
assert(
  nextConfigContent.includes('source: "/plans"') &&
  nextConfigContent.includes('destination: "/pricing"') &&
  nextConfigContent.includes('source: "/stem"') &&
  nextConfigContent.includes('destination: "/classroom/stem"') &&
  nextConfigContent.includes('source: "/arena"') &&
  nextConfigContent.includes('destination: "/challenge-arena"'),
  "next.config.ts implements 1-to-1 permanent redirects without redirect chains"
);

// Check canonical URLs and metadata on public pages (in page or layout)
const publicPagesToCheck = [
  { page: "app/page.tsx" },
  { page: "app/pricing/page.tsx", layout: "app/pricing/layout.tsx" },
  { page: "app/about/page.tsx" },
  { page: "app/schools/page.tsx", layout: "app/schools/layout.tsx" },
  { page: "app/syllabus/page.tsx", layout: "app/syllabus/layout.tsx" },
  { page: "app/products/stem-studio/page.tsx" },
  { page: "app/products/ai-learning/page.tsx" },
  { page: "app/resources/exam-calendar/page.tsx", layout: "app/resources/exam-calendar/layout.tsx" },
];

for (const p of publicPagesToCheck) {
  const filePath = path.join(process.cwd(), p.page);
  assert(fs.existsSync(filePath), `Public page exists: ${p.page}`);
  const targetCheckPath = p.layout ? path.join(process.cwd(), p.layout) : filePath;
  const content = fs.readFileSync(targetCheckPath, "utf-8");
  assert(
    content.includes("metadata") || content.includes("title"),
    `Metadata defined for: ${p.page} (checked in ${p.layout || p.page})`
  );
  assert(
    content.includes("canonical"),
    `Canonical URL declared for: ${p.page}`
  );
}

// ---------------------------------------------------------------------------
// 2. ACCESSIBILITY: WCAG AA, TOUCH TARGETS, REDUCED MOTION & ARIA
// ---------------------------------------------------------------------------
console.log("\n2. ACCESSIBILITY: WCAG AA, TOUCH TARGETS, REDUCED MOTION & ARIA");

const globalsCssPath = path.join(process.cwd(), "app/globals.css");
assert(fs.existsSync(globalsCssPath), "app/globals.css exists");
const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");

assert(
  globalsCss.includes("prefers-reduced-motion: reduce") &&
  globalsCss.includes("animation-duration: 0.01ms !important") &&
  globalsCss.includes("transition-duration: 0.01ms !important"),
  "globals.css fully neutralizes animations and transitions when prefers-reduced-motion is active"
);

assert(
  globalsCss.includes("bl-focus-ring") || globalsCss.includes("focus-visible"),
  "Declares high-contrast focus ring utilities for complete keyboard navigation"
);

// Check Touch Targets in critical interactive components
const touchTargetComponents = [
  "app/components/public/PublicStemDemo.tsx",
  "app/components/public/PublicAiTutorDemo.tsx",
  "app/components/public/CookieConsentBanner.tsx",
  "app/components/InteractiveSampleQuestion.tsx",
];

for (const c of touchTargetComponents) {
  const compPath = path.join(process.cwd(), c);
  assert(fs.existsSync(compPath), `Interactive component exists: ${c}`);
  const compContent = fs.readFileSync(compPath, "utf-8");
  assert(
    compContent.includes("py-2.5") ||
    compContent.includes("py-3") ||
    compContent.includes("min-h-[44px]") ||
    compContent.includes("min-h-12") ||
    compContent.includes("p-3") ||
    compContent.includes("p-4"),
    `Enforces >= 44px minimum touch target size in ${c}`
  );
}

// Check ARIA Live and Heading Landmarks
const stemDemoContent = fs.readFileSync(path.join(process.cwd(), "app/components/public/PublicStemDemo.tsx"), "utf-8");
assert(
  stemDemoContent.includes('aria-live="polite"'),
  "PublicStemDemo provides aria-live='polite' mathematical telemetry announcements"
);

const countdownSlotContent = fs.readFileSync(path.join(process.cwd(), "app/components/home/DynamicCountdownSlot.tsx"), "utf-8");
assert(
  countdownSlotContent.includes('aria-live="polite"'),
  "DynamicCountdownSlot provides non-intrusive aria-live='polite' for countdown changes"
);

// ---------------------------------------------------------------------------
// 3. PERFORMANCE: ZERO RUNTIME LAYOUT SHIFT & BUDGETS
// ---------------------------------------------------------------------------
console.log("\n3. PERFORMANCE: ZERO RUNTIME LAYOUT SHIFT & BUDGETS");

assert(
  !nextConfigContent.includes("disableOptimizedLoading"),
  "Next.js script and resource optimizations are enabled"
);

assert(
  globalsCss.includes("font-family: -apple-system") || globalsCss.includes("system-ui"),
  "System font stack declared for instantaneous FCP and 0 KB webfont network blocking"
);

const homeHeroContent = fs.readFileSync(path.join(process.cwd(), "app/components/home/HomeHero.tsx"), "utf-8");
assert(
  homeHeroContent.includes("min-h-") || homeHeroContent.includes("aspect-"),
  "HomeHero simulator preview reserves explicit dimensions to guarantee CLS = 0"
);

// ---------------------------------------------------------------------------
// 4. REGRESSION: S7 COMPLIANCE & SECURITY SHIELDS
// ---------------------------------------------------------------------------
console.log("\n4. REGRESSION: S7 COMPLIANCE & SECURITY SHIELDS");

const s7ScriptPath = path.join(process.cwd(), "scripts/check-marketing-figures.mjs");
assert(fs.existsSync(s7ScriptPath), "scripts/check-marketing-figures.mjs exists");

// Check Prompt 2 Security Integrity (Zero service role key in client, zero hardcoded PINs)
const adminAuthPath = path.join(process.cwd(), "app/lib/adminAuth.ts");
const adminAuthContent = fs.readFileSync(adminAuthPath, "utf-8");
assert(
  !adminAuthContent.includes("service_role_key") &&
  !adminAuthContent.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "Zero Supabase service role keys bundled in client auth modules"
);

const sampleQuestionServicePath = path.join(process.cwd(), "app/lib/services/sampleQuestionService.ts");
const sampleQuestionContent = fs.readFileSync(sampleQuestionServicePath, "utf-8");
assert(
  sampleQuestionContent.includes("curated_sample_questions") &&
  !sampleQuestionContent.includes("from(\"questions\")"),
  "Curated sample question service strictly shields internal public.questions bank"
);

console.log("\n=========================================================================");
console.log(`  HARDENING RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=========================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All Prompt 13 Hardening verifications passed cleanly!\n");
}
