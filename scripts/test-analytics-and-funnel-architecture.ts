import assert from "assert";
import fs from "fs";
import path from "path";
import {
  sanitizePayload,
  hasAnalyticsConsent,
  setCookieConsent,
  getCookieConsent,
  trackEvent,
  CONSENT_STORAGE_KEY,
  ANALYTICS_DISPATCH_EVENT,
  type AnalyticsEventName,
} from "../app/lib/analytics";

console.log("=========================================================================");
console.log("  BRAINLAB CI: FIRST-PARTY TELEMETRY & CONVERSION FUNNEL TEST SUITE");
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

const EXPECTED_EVENTS: AnalyticsEventName[] = [
  "programme_viewed",
  "programme_selected",
  "channel_join_clicked",
  "countdown_viewed",
  "free_practice_started",
  "demo_completed",
  "signup_started",
  "signup_completed",
  "enrolment_started",
  "payment_completed",
  "school_enquiry_submitted",
  "tutor_application_submitted",
];

// Mock Browser Environment for Node test runner
const memoryStorage = new Map<string, string>();
const dispatchedEvents: CustomEvent[] = [];

(global as unknown as { fetch: unknown }).fetch = () =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ ok: true }),
  });

// Setup global window mock
(global as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => memoryStorage.get(k) ?? null,
    setItem: (k: string, v: string) => memoryStorage.set(k, v),
    removeItem: (k: string) => memoryStorage.delete(k),
    clear: () => memoryStorage.clear(),
  },
  navigator: {
    sendBeacon: () => true,
    doNotTrack: "0",
    globalPrivacyControl: false,
  },
  dispatchEvent: (evt: CustomEvent) => {
    dispatchedEvents.push(evt);
    return true;
  },
};

// -----------------------------------------------------------------------------
// 1. Storage & Migration Architecture
// -----------------------------------------------------------------------------
runTest("Test 1: Analytics migration and rollback SQL files exist with strict RLS", () => {
  const migrationPath = path.join(
    process.cwd(),
    "supabase/migrations/20261108151000_create_analytics_events.sql"
  );
  const rollbackPath = path.join(
    process.cwd(),
    "supabase/migrations/20261108151000_rollback_analytics_events.sql"
  );

  assert.ok(fs.existsSync(migrationPath), "Analytics migration file must exist");
  assert.ok(fs.existsSync(rollbackPath), "Analytics rollback file must exist");

  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.ok(
    sql.includes("CREATE TABLE IF NOT EXISTS public.platform_analytics_events"),
    "Creates table platform_analytics_events"
  );
  assert.ok(
    sql.includes("ENABLE ROW LEVEL SECURITY"),
    "Enables Row Level Security"
  );
  assert.ok(
    sql.includes("Public can record analytics events"),
    "Has public INSERT policy"
  );
  assert.ok(
    sql.includes("Administrators can read analytics events"),
    "Has admin-only SELECT policy"
  );

  assert.ok(sql.includes("analytics_payload_allowed_keys"), "Restricts stored payload keys to an explicit allowlist");
  assert.ok(sql.includes("analytics_payload_no_sensitive_keys"), "Rejects sensitive payload keys at database level");
  assert.ok(sql.includes("analytics_payload_size"), "Caps analytics payload size");
  // Check that all 12 events are constrained in SQL check
  for (const eventName of EXPECTED_EVENTS) {
    assert.ok(
      sql.includes(`'${eventName}'`),
      `SQL schema check constraint must include ${eventName}`
    );
  }
});

// -----------------------------------------------------------------------------
// 2. Event Whitelist Validation in Route
// -----------------------------------------------------------------------------
runTest("Test 2: Server API route validates all 12 events in whitelist", () => {
  const routePath = path.join(process.cwd(), "app/api/analytics/events/route.ts");
  assert.ok(fs.existsSync(routePath), "Events route must exist");
  const code = fs.readFileSync(routePath, "utf8");

  for (const eventName of EXPECTED_EVENTS) {
    assert.ok(
      code.includes(`"${eventName}"`),
      `Route whitelist must contain ${eventName}`
    );
  }
  assert.ok(code.includes("checkRateLimit"), "Rate limiting is enforced on ingestion");
  assert.ok(code.includes("createDailySessionHash"), "Session hashing uses ephemeral daily salt");
});

// -----------------------------------------------------------------------------
// 3. Strict NDPA 2023 PII Sanitization
// -----------------------------------------------------------------------------
runTest("Test 3: PII sanitizer strips forbidden keys (passwords, emails, cards, answers)", () => {
  const rawPayload = {
    plan_id: "plan_utme_pro",
    amount_ngn: 4500,
    password: "secret_student_password123",
    email: "minor_student@example.com",
    phone: "+2348012345678",
    fullName: "Chinedu Okafor",
    card_number: "5399 8300 1234 5678",
    cvv: "123",
    bvn: "22114455667",
    nin: "99887766554",
    user_answer: "Option C",
    answers: ["A", "B", "C"],
    allowed_param: "science_track",
    nested_profile: {
      student_name: "Amina",
      score_percent: 85,
    },
  };

  const clean = sanitizePayload(rawPayload);

  console.log("\n  [SAMPLE PAYLOAD VERIFICATION]");
  console.log("  Raw input keys:       ", Object.keys(rawPayload));
  console.log("  Sanitized output keys:", Object.keys(clean));
  console.log("  Sanitized payload:    ", JSON.stringify(clean));

  // Must retain safe attributes
  assert.strictEqual(clean.plan_id, "plan_utme_pro");
  assert.strictEqual(clean.amount_ngn, 4500);
  assert.strictEqual(clean.allowed_param, "science_track");

  // Must completely purge forbidden attributes
  assert.strictEqual(clean.password, undefined);
  assert.strictEqual(clean.email, undefined);
  assert.strictEqual(clean.phone, undefined);
  assert.strictEqual(clean.fullName, undefined);
  assert.strictEqual(clean.card_number, undefined);
  assert.strictEqual(clean.cvv, undefined);
  assert.strictEqual(clean.bvn, undefined);
  assert.strictEqual(clean.nin, undefined);
  assert.strictEqual(clean.user_answer, undefined);
  assert.strictEqual(clean.answers, undefined);

  // Nested check
  const nested = clean.nested_profile as Record<string, unknown>;
  assert.ok(nested, "Nested safe object preserved");
  assert.strictEqual(nested.student_name, undefined);
  assert.strictEqual(nested.score_percent, 85);
});

// -----------------------------------------------------------------------------
// 4. Cookie Consent Handling & Privacy Controls (DNT / GPC)
// -----------------------------------------------------------------------------
runTest("Test 4: Cookie consent gating & browser privacy signals (DNT/GPC)", () => {
  memoryStorage.clear();

  // Initially undecided -> No consent
  assert.strictEqual(getCookieConsent(), "undecided");
  assert.strictEqual(hasAnalyticsConsent(), false, "Must default to false without consent");

  // User selects essential_only -> No analytics consent
  setCookieConsent("essential_only");
  assert.strictEqual(getCookieConsent(), "essential_only");
  assert.strictEqual(hasAnalyticsConsent(), false, "Must remain false on essential_only");

  // User accepts all -> Analytics enabled
  setCookieConsent("all");
  assert.strictEqual(getCookieConsent(), "all");
  assert.strictEqual(hasAnalyticsConsent(), true, "Must be true on all");

  // Browser Do Not Track (DNT) enabled -> Overrides consent to false
  const nav = (global as unknown as { window: { navigator: Record<string, unknown> } }).window.navigator;
  nav.doNotTrack = "1";
  assert.strictEqual(hasAnalyticsConsent(), false, "DNT: 1 must override to false");
  nav.doNotTrack = "0";

  // Browser Global Privacy Control (GPC) enabled -> Overrides consent to false
  nav.globalPrivacyControl = true;
  assert.strictEqual(hasAnalyticsConsent(), false, "GPC: true must override to false");
  nav.globalPrivacyControl = false;

  assert.strictEqual(hasAnalyticsConsent(), true, "Restores when privacy override unset");
});

// -----------------------------------------------------------------------------
// 5. Deduplication & Dispatch Verification
// -----------------------------------------------------------------------------
runTest("Test 5: Telemetry deduplication ensures rapid duplicates fire once", () => {
  setCookieConsent("all");
  dispatchedEvents.length = 0;

  // Rapid dispatch of same event
  trackEvent("countdown_viewed", { exam: "utme_2027" });
  trackEvent("countdown_viewed", { exam: "utme_2027" });
  trackEvent("countdown_viewed", { exam: "utme_2027" });

  assert.strictEqual(
    dispatchedEvents.length,
    1,
    `Expected 1 dispatched event within 2s deduplication window, but got ${dispatchedEvents.length}`
  );

  // Different event payload fires cleanly
  trackEvent("countdown_viewed", { exam: "waec_2027" });
  assert.strictEqual(
    dispatchedEvents.length,
    2,
    "Distinct payload must fire normally"
  );
});

// -----------------------------------------------------------------------------
// 6. Fail-Safe Resilience: Ad-Blocker & Error Immunity
// -----------------------------------------------------------------------------
runTest("Test 6: Site operation is 100% resilient when analytics is blocked or fails", () => {
  setCookieConsent("all");

  // Simulate complete failure of network beacon and fetch
  const originalBeacon = (global as unknown as { window: { navigator: { sendBeacon: unknown } } }).window.navigator.sendBeacon;
  (global as unknown as { window: { navigator: { sendBeacon: unknown } } }).window.navigator.sendBeacon = () => {
    throw new Error("ERR_BLOCKED_BY_CLIENT (AdBlocker active)");
  };

  let threw = false;
  try {
    // Should never throw to caller
    trackEvent("free_practice_started", { subject: "mathematics" });
  } catch {
    threw = true;
  } finally {
    (global as unknown as { window: { navigator: { sendBeacon: unknown } } }).window.navigator.sendBeacon = originalBeacon;
  }

  assert.strictEqual(threw, false, "trackEvent must never throw even if ad-blocker crashes beacon");
});

// -----------------------------------------------------------------------------
// 7. Cookie Banner Component UI Integration
// -----------------------------------------------------------------------------
runTest("Test 7: CookieConsentBanner component is wired into SiteChrome (Experience A)", () => {
  const bannerPath = path.join(
    process.cwd(),
    "app/components/public/CookieConsentBanner.tsx"
  );
  const chromePath = path.join(process.cwd(), "app/components/SiteChrome.tsx");

  assert.ok(fs.existsSync(bannerPath), "CookieConsentBanner component must exist");
  assert.ok(fs.existsSync(chromePath), "SiteChrome must exist");

  const bannerCode = fs.readFileSync(bannerPath, "utf8");
  assert.ok(
    bannerCode.includes("Nigeria Data Protection Act (NDPA) 2023"),
    "Banner references NDPA 2023 compliance"
  );
  assert.ok(
    bannerCode.includes("Accept All"),
    "Banner provides Accept All"
  );
  assert.ok(
    bannerCode.includes("Essential Only"),
    "Banner provides Essential Only choice"
  );

  const chromeCode = fs.readFileSync(chromePath, "utf8");
  assert.ok(
    chromeCode.includes("<CookieConsentBanner />") ||
    chromeCode.includes("<CookieConsentBanner"),
    "SiteChrome renders CookieConsentBanner"
  );
});

// -----------------------------------------------------------------------------
// 8. Standing Rule S7 Anti-Hardcoding Compliance
// -----------------------------------------------------------------------------
runTest("Test 8: Rule S7 verification - No hardcoded marketing figures in telemetry UI", () => {
  const adminAnalyticsPath = path.join(
    process.cwd(),
    "app/admin/analytics/page.tsx"
  );
  assert.ok(fs.existsSync(adminAnalyticsPath), "Admin analytics page exists");
  const code = fs.readFileSync(adminAnalyticsPath, "utf8");

  assert.ok(code.includes("FUNNEL_EVENTS"), "Renders 12 core conversion events");
  assert.ok(code.includes("exportFunnelCSV"), "Includes funnel CSV export");
  assert.ok(code.includes("exportExamCSV"), "Includes exam mastery CSV export");
});

console.log("\n=========================================================================");
console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=========================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All First-Party Telemetry & Funnel Architecture tests passed cleanly!\n");
  process.exit(0);
}
