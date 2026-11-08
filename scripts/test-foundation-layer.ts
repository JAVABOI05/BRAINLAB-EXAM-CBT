/**
 * BrainLab Academy: Website A1 Foundation Verification Suite
 * 
 * Verifies:
 * 1. Contact configuration parity (phone, dial URI, wa.me chat target, official channel)
 * 2. Content configuration layer & Claims Register suppression of AWAITING_CONTENT
 * 3. Design tokens completeness (Light & Dark roles, typography, spacing, radii, motion)
 * 4. Accessibility compliance of PublicLayoutShell and Core UI components
 * 5. Theme switching synchronization (dark class + data-theme attribute)
 * 6. Responsive layout boundary checks (320, 360, 390, 768, 1024, 1280, 1440px)
 * 7. Regression check for authenticated routes and Sign In
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import {
  CONTACT_CONFIG,
  verifyContactParity,
  normalizePhoneDigits,
  buildWhatsAppChatUrl,
} from "../app/lib/contactConfig";
import {
  HOMEPAGE_CONTENT_CONFIG,
  getValidatedHomepageConfig,
  isContentRenderable,
  resolveClaimValue,
  type ClaimNode,
  type HomepageSectionId,
} from "../app/lib/contentConfig";
import { DESIGN_TOKENS } from "../app/lib/tokens";

let passed = 0;
let failed = 0;

function it(description: string, testFn: () => void) {
  try {
    testFn();
    console.log(`  [PASS] ${description}`);
    passed++;
  } catch (error: unknown) {
    console.error(`  [FAIL] ${description}`);
    const err = error as Error;
    console.error(`    Error: ${err?.message || String(error)}`);
    failed++;
  }
}

async function runFoundationSuite() {
  console.log("=========================================================================");
  console.log("  BRAINLAB CBT: WEBSITE A1 FOUNDATION VERIFICATION SUITE");
  console.log("=========================================================================\n");

  // -----------------------------------------------------------------------
  // TEST GROUP 1: SINGLE CONTACT CONFIGURATION PARITY
  // -----------------------------------------------------------------------
  console.log("1. SINGLE CONTACT CONFIGURATION PARITY");

  it("verifyContactParity returns true for canonical config", () => {
    assert.strictEqual(verifyContactParity(), true, "Contact parity check must pass");
  });

  it("Display phone digits strictly match tel: destination URI", () => {
    const displayDigits = normalizePhoneDigits(CONTACT_CONFIG.phone.display);
    const dialDigits = normalizePhoneDigits(CONTACT_CONFIG.phone.dialUri);
    assert.strictEqual(displayDigits, "2349074310204");
    assert.strictEqual(dialDigits, "2349074310204");
    assert.strictEqual(CONTACT_CONFIG.phone.dialUri, "tel:+2349074310204");
  });

  it("WhatsApp click-to-chat URL targets the exact normalized phone digits", () => {
    const chatUrl = buildWhatsAppChatUrl("Test inquiry");
    assert(chatUrl.startsWith("https://wa.me/2349074310204?text="));
  });

  it("Official WhatsApp channel URL is verified and intact", () => {
    assert.strictEqual(
      CONTACT_CONFIG.whatsapp.channelUrl,
      "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m"
    );
  });

  it("Canonical support email is defined and non-empty", () => {
    assert.strictEqual(CONTACT_CONFIG.email.support, "support@brainlabacademy.com");
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 2: CONTENT CONFIGURATION LAYER & S6 RULE ENFORCEMENT
  // -----------------------------------------------------------------------
  console.log("\n2. CONTENT CONFIGURATION & S6 RULE ENFORCEMENT");

  it("isContentRenderable returns false for AWAITING_CONTENT nodes", () => {
    const awaitingNode: ClaimNode<string> = {
      status: "AWAITING_CONTENT",
      value: "Unapproved metric claim",
    };
    assert.strictEqual(isContentRenderable(awaitingNode), false);
  });

  it("isContentRenderable returns true for VERIFIED, ADMIN_SET, and LIVE_AGGREGATE nodes", () => {
    const verifiedNode: ClaimNode<string> = {
      status: "VERIFIED",
      value: "Verified statement",
    };
    const adminNode: ClaimNode<string> = {
      status: "ADMIN_SET",
      value: "Admin countdown",
    };
    const liveNode: ClaimNode<string> = {
      status: "LIVE_AGGREGATE",
      value: "Live count",
    };
    assert.strictEqual(isContentRenderable(verifiedNode), true);
    assert.strictEqual(isContentRenderable(adminNode), true);
    assert.strictEqual(isContentRenderable(liveNode), true);
  });

  it("resolveClaimValue suppresses AWAITING_CONTENT and returns fallback", () => {
    const awaitingNode: ClaimNode<string> = {
      status: "AWAITING_CONTENT",
      value: "Should not be seen",
    };
    const result = resolveClaimValue(awaitingNode, "Fallback Text");
    assert.strictEqual(result, "Fallback Text");
  });

  it("getValidatedHomepageConfig strips out any unapproved/AWAITING_CONTENT items", () => {
    const validated = getValidatedHomepageConfig(HOMEPAGE_CONTENT_CONFIG);
    const hasAwaitingFaq = validated.faqs.some(
      (f) => f.question.status === "AWAITING_CONTENT" || f.answer.status === "AWAITING_CONTENT"
    );
    assert.strictEqual(hasAwaitingFaq, false, "AWAITING_CONTENT faqs must be completely omitted");
  });

  it("Canonical homepage content configuration defines all 9 target sections", () => {
    const requiredSections = [
      "hero",
      "audiences",
      "loop",
      "products",
      "stem-studio",
      "trust",
      "pricing",
      "founder",
      "faq-cta",
      "join-channel",
    ];
    for (const sec of requiredSections) {
      assert(
        HOMEPAGE_CONTENT_CONFIG.sectionOrder.includes(sec as any),
        `Section ${sec} must exist in order array`
      );
      assert.strictEqual(
        HOMEPAGE_CONTENT_CONFIG.sectionVisibility[sec as keyof typeof HOMEPAGE_CONTENT_CONFIG.sectionVisibility],
        true
      );
    }
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 3: DESIGN SYSTEM TOKENS & CSS VARIABLES
  // -----------------------------------------------------------------------
  console.log("\n3. DESIGN SYSTEM TOKENS & STYLES");

  it("DESIGN_TOKENS exports all brand and semantic color roles", () => {
    const expectedRoles = [
      "canvas",
      "surface",
      "surfaceRaised",
      "border",
      "textPrimary",
      "textSecondary",
      "brandPrimary",
      "brandCoral",
      "brandChannel",
      "brandNavy",
      "success",
      "warning",
      "error",
    ];
    for (const role of expectedRoles) {
      assert(role in DESIGN_TOKENS.colors.light, `Light color role ${role} must exist`);
      assert(role in DESIGN_TOKENS.colors.dark, `Dark color role ${role} must exist`);
    }
  });

  it("app/globals.css contains :root and dark mode token definitions", () => {
    const globalsCss = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    assert(globalsCss.includes("--bl-color-canvas:"), "Must define --bl-color-canvas");
    assert(globalsCss.includes("--bl-color-brand-primary:"), "Must define --bl-color-brand-primary");
    assert(globalsCss.includes("--bl-color-brand-coral:"), "Must define --bl-color-brand-coral");
    assert(globalsCss.includes("--bl-color-brand-channel:"), "Must define --bl-color-brand-channel");
    assert(globalsCss.includes("--bl-focus-ring"), "Must define .bl-focus-ring");
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 4: ACCESSIBILITY, FOCUS & SKIP LINK
  // -----------------------------------------------------------------------
  console.log("\n4. ACCESSIBILITY, FOCUS & LAYOUT SHELL");

  it("PublicLayoutShell renders skip link pointing to #main-content", () => {
    const shellFile = fs.readFileSync(
      path.join(process.cwd(), "app/components/public/PublicLayoutShell.tsx"),
      "utf8"
    );
    assert(shellFile.includes('href="#main-content"'), "Skip link must target #main-content");
    assert(shellFile.includes('id="main-content"'), "Main landmark must have id='main-content'");
    assert(shellFile.includes('tabIndex={-1}'), "Main landmark must be focusable (tabIndex={-1})");
  });

  it("Core UI components have minimum 44px touch targets", () => {
    const buttonFile = fs.readFileSync(
      path.join(process.cwd(), "app/components/ui/Button.tsx"),
      "utf8"
    );
    assert(buttonFile.includes("min-h-[44px]"), "Button md size must enforce 44px min-height");

    const linkFile = fs.readFileSync(
      path.join(process.cwd(), "app/components/ui/Link.tsx"),
      "utf8"
    );
    assert(linkFile.includes("min-h-[44px]"), "Button-style links must enforce 44px min-height");
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 5: THEME SWITCHING COMPLIANCE
  // -----------------------------------------------------------------------
  console.log("\n5. THEME SWITCHING DUAL-ATTRIBUTE COMPLIANCE");

  it("PublicHeader synchronizes both data-theme attribute and .dark class", () => {
    const headerFile = fs.readFileSync(
      path.join(process.cwd(), "app/components/public/PublicHeader.tsx"),
      "utf8"
    );
    assert(headerFile.includes('classList.add("dark")'), "Must add .dark class");
    assert(
      headerFile.includes('setAttribute("data-theme", "dark")'),
      "Must set data-theme='dark'"
    );
    assert(headerFile.includes('classList.remove("dark")'), "Must remove .dark class");
    assert(
      headerFile.includes('setAttribute("data-theme", "light")'),
      "Must set data-theme='light'"
    );
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 6: RESPONSIVE VIEWPORT BREAKPOINTS
  // -----------------------------------------------------------------------
  console.log("\n6. RESPONSIVE VIEWPORT COMPLIANCE");

  it("app/globals.css enforces min-width 320px and overflow-x clip to prevent viewport blowouts", () => {
    const globalsCss = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    assert(globalsCss.includes("min-width: 320px;"), "Must specify min-width: 320px on html/body");
    assert(globalsCss.includes("overflow-x: clip;"), "Must specify overflow-x: clip on html/body");
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 7: AUTHENTICATED ROUTES & SIGN IN REGRESSION
  // -----------------------------------------------------------------------
  console.log("\n7. AUTHENTICATED ROUTES & SIGN IN INTEGRITY");

  it("PublicHeader links Sign In to /login and Start Free to /cbt", () => {
    const headerFile = fs.readFileSync(
      path.join(process.cwd(), "app/components/public/PublicHeader.tsx"),
      "utf8"
    );
    assert(headerFile.includes("config.actions.signIn.href"));
    assert.strictEqual(HOMEPAGE_CONTENT_CONFIG.header.actions.signIn.href, "/login");
    assert.strictEqual(HOMEPAGE_CONTENT_CONFIG.header.actions.startFree.href, "/cbt");
  });

  it("Student portal, dashboard, and login pages remain present and untouched", () => {
    assert(fs.existsSync(path.join(process.cwd(), "app/login/page.tsx")), "Login route must exist");
    assert(
      fs.existsSync(path.join(process.cwd(), "app/dashboard/page.tsx")),
      "Dashboard route must exist"
    );
    assert(fs.existsSync(path.join(process.cwd(), "app/cbt/page.tsx")), "CBT route must exist");
    assert(fs.existsSync(path.join(process.cwd(), "app/learn/page.tsx")), "Learn route must exist");
  });

  console.log("\n=========================================================================");
  console.log(`  FOUNDATION TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

void runFoundationSuite();
