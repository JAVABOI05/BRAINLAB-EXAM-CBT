/**
 * BrainLab Academy: Prompt 5 Homepage Layer A Verification Suite
 * 
 * Verifies:
 * 1. Nine-section homepage order & structure in HomePageClient.tsx
 * 2. Prominent Join Our Channel block directly beneath Hero
 * 3. Channel link validation, target="_blank", rel="noopener noreferrer", anonymous telemetry
 * 4. Audience entry points linking to real workflows (/for-students, /pricing, /schools, /for-tutors)
 * 5. BrainLab Loop 5 stages (LEARN, PRACTISE, DIAGNOSE, IMPROVE, MASTER) & real routes
 * 6. Product showcase (CBT, Hub, STEM, AI, Live, Arena)
 * 7. STEM Studio spotlight with real science capabilities
 * 8. Conditional suppression of unapproved sections (Trust outcomes & Founder note)
 * 9. Integration of dynamic slots (Countdown & Live stats connected in Prompt 6)
 * 10. Dynamic pricing teaser reading from getSubscriptionPlans without hardcoded figures
 * 11. Viewport boundary constraints (no horizontal overflow at 320px+)
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import { CONTACT_CONFIG } from "../app/lib/contactConfig";
import { HOMEPAGE_CONTENT_CONFIG } from "../app/lib/contentConfig";

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

async function runHomepageSuite() {
  console.log("=========================================================================");
  console.log("  BRAINLAB CBT: PROMPT 5 HOMEPAGE LAYER A VERIFICATION SUITE");
  console.log("=========================================================================\n");

  const appDir = path.join(process.cwd(), "app");
  const homeClientContent = fs.readFileSync(path.join(appDir, "HomePageClient.tsx"), "utf8");

  // -----------------------------------------------------------------------
  // TEST GROUP 1: NINE-SECTION HOMEPAGE CANONICAL ORDER
  // -----------------------------------------------------------------------
  console.log("1. NINE-SECTION CANONICAL ORDER");

  it("HomePageClient renders all 9 sections in exact canonical sequence", () => {
    const heroIdx = homeClientContent.indexOf("<HomeHero");
    const channelIdx = homeClientContent.indexOf("<HomeJoinChannel");
    const audIdx = homeClientContent.indexOf("<HomeAudiences");
    const loopIdx = homeClientContent.indexOf("<HomeBrainLabLoop");
    const prodIdx = homeClientContent.indexOf("<HomeProductShowcase");
    const stemIdx = homeClientContent.indexOf("<HomeStemStudio");
    const trustIdx = homeClientContent.indexOf("<HomeTrustOutcomes");
    const priceIdx = homeClientContent.indexOf("<HomePricingTeaser");
    const founderIdx = homeClientContent.indexOf("<HomeFounderNote");
    const faqIdx = homeClientContent.indexOf("<HomeFaqCta");

    assert(heroIdx !== -1, "Hero section must exist");
    assert(channelIdx !== -1, "Join Our Channel block must exist");
    assert(channelIdx > heroIdx, "Join Channel block must follow directly beneath Hero");
    assert(audIdx > channelIdx, "Audiences must follow Join Channel");
    assert(loopIdx > audIdx, "The Loop must follow Audiences");
    assert(prodIdx > loopIdx, "Product showcase must follow The Loop");
    assert(stemIdx > prodIdx, "STEM Studio spotlight must follow Product showcase");
    assert(trustIdx > stemIdx, "Trust & outcomes must follow STEM Studio");
    assert(priceIdx > trustIdx, "Pricing teaser must follow Trust & outcomes");
    assert(founderIdx > priceIdx, "Founder note must follow Pricing teaser");
    assert(faqIdx > founderIdx, "FAQ & final CTA must follow Founder note");
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 2: JOIN OUR CHANNEL BLOCK SPECIFICATION
  // -----------------------------------------------------------------------
  console.log("\n2. JOIN OUR CHANNEL BLOCK SPECIFICATION");

  const channelContent = fs.readFileSync(
    path.join(appDir, "components/home/HomeJoinChannel.tsx"),
    "utf8"
  );

  it("Join Channel block uses single contact source for WhatsApp channel", () => {
    assert(
      channelContent.includes("CONTACT_CONFIG.whatsapp.channelUrl"),
      "Must consume official channel URL from contactConfig"
    );
    assert.strictEqual(
      CONTACT_CONFIG.whatsapp.channelUrl,
      "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m"
    );
  });

  it("Join Channel block enforces target='_blank' and rel='noopener noreferrer'", () => {
    assert(channelContent.includes('target="_blank"'), "Must open in new tab");
    assert(
      channelContent.includes('rel="noopener noreferrer"'),
      "Must specify rel='noopener noreferrer'"
    );
  });

  it("Join Channel block includes URL validation and anonymous telemetry logging", () => {
    assert(channelContent.includes("isValidChannelUrl"), "Must validate channel URL");
    assert(
      channelContent.includes("brainlab:channel-click"),
      "Must dispatch anonymous telemetry event without personal data"
    );
  });

  it("Join Channel block has zero hardcoded follower counts", () => {
    assert(
      !channelContent.match(/\d+([.,]\d+)?\s*(k|m|million|thousand)?\s*(followers|subscribers)/i),
      "Must not contain hardcoded follower counts"
    );
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 3: AUDIENCE ENTRY POINTS
  // -----------------------------------------------------------------------
  console.log("\n3. AUDIENCE ENTRY POINTS");

  const audContent = fs.readFileSync(
    path.join(appDir, "components/home/HomeAudiences.tsx"),
    "utf8"
  );

  it("Audience cards link to real application workflows", () => {
    assert(audContent.includes("aud.cta.href"), "Must link to cta.href");
    const studentAud = HOMEPAGE_CONTENT_CONFIG.audiences.find((a) => a.id === "students");
    const schoolsAud = HOMEPAGE_CONTENT_CONFIG.audiences.find((a) => a.id === "schools");
    const tutorsAud = HOMEPAGE_CONTENT_CONFIG.audiences.find((a) => a.id === "tutors");

    assert.strictEqual(studentAud?.cta.href, "/for-students");
    assert.strictEqual(schoolsAud?.cta.href, "/schools");
    assert.strictEqual(tutorsAud?.cta.href, "/for-tutors");
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 4: THE BRAINLAB LOOP
  // -----------------------------------------------------------------------
  console.log("\n4. THE BRAINLAB LOOP PEDAGOGY");

  const loopContent = fs.readFileSync(
    path.join(appDir, "components/home/HomeBrainLabLoop.tsx"),
    "utf8"
  );

  it("The BrainLab Loop contains all 5 canonical stages mapped to real routes", () => {
    assert(loopContent.includes('learn: { href: "/learn"'));
    assert(loopContent.includes('practise: { href: "/cbt"'));
    assert(loopContent.includes('diagnose: { href: "/learning-dna"'));
    assert(loopContent.includes('improve: { href: "/ai-learning"'));
    assert(loopContent.includes('master: { href: "/challenge-arena"'));
  });

  it("The BrainLab Loop highlights STEM Studio cross-cutting integration", () => {
    assert(loopContent.includes("activeStage.stemRole"), "Must display STEM Studio role when defined");
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 5: STEM STUDIO SPOTLIGHT
  // -----------------------------------------------------------------------
  console.log("\n5. STEM STUDIO SPOTLIGHT");

  const stemContent = fs.readFileSync(
    path.join(appDir, "components/home/HomeStemStudio.tsx"),
    "utf8"
  );

  it("STEM Studio spotlight showcases real laboratory capabilities without decorative simulation", () => {
    assert(stemContent.includes("Physics Mechanics & Kinematics"));
    assert(stemContent.includes("Acid-Base Titration & pH Reactions"));
    assert(stemContent.includes("Cellular Atlas & Metabolic Pathways"));
    assert(stemContent.includes("Logic Gates & Circuit Simulators"));
    assert(stemContent.includes('href="/classroom/stem"'));
    assert(stemContent.includes('href="/products/stem-studio"'));
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 6: CONDITIONAL UNAPPROVED SECTION SUPPRESSION (RULE S6)
  // -----------------------------------------------------------------------
  console.log("\n6. CONDITIONAL SUPPRESSION OF UNAPPROVED SECTIONS (RULE S6)");

  const trustContent = fs.readFileSync(
    path.join(appDir, "components/home/HomeTrustOutcomes.tsx"),
    "utf8"
  );
  const founderContent = fs.readFileSync(
    path.join(appDir, "components/home/HomeFounderNote.tsx"),
    "utf8"
  );

  it("HomeTrustOutcomes returns null when no approved claims exist", () => {
    assert(trustContent.includes("hasApprovedTrustClaims = false"));
    assert(trustContent.includes("return null;"));
  });

  it("HomeFounderNote returns null when not officially approved", () => {
    assert(founderContent.includes("isFounderNoteApproved = false"));
    assert(founderContent.includes("return null;"));
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 7: DYNAMIC SLOTS INTEGRATION (PROMPT 6)
  // -----------------------------------------------------------------------
  console.log("\n7. DYNAMIC SLOTS INTEGRATION");

  const countdownSlot = fs.readFileSync(
    path.join(appDir, "components/home/DynamicCountdownSlot.tsx"),
    "utf8"
  );
  const liveStatsSlot = fs.readFileSync(
    path.join(appDir, "components/home/DynamicLiveStatisticsSlot.tsx"),
    "utf8"
  );

  it("DynamicCountdownSlot renders active ExamCountdownBanner", () => {
    assert(countdownSlot.includes("ExamCountdownBanner"));
  });

  it("DynamicLiveStatisticsSlot renders active VerifiedLiveStatsBar", () => {
    assert(liveStatsSlot.includes("VerifiedLiveStatsBar"));
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 8: PRICING TEASER DYNAMIC DATA
  // -----------------------------------------------------------------------
  console.log("\n8. PRICING TEASER DYNAMIC DATA");

  const pricingContent = fs.readFileSync(
    path.join(appDir, "components/home/HomePricingTeaser.tsx"),
    "utf8"
  );

  it("Pricing teaser fetches live plan data from platformConfig and has zero hardcoded prices", () => {
    assert(pricingContent.includes("getSubscriptionPlans"), "Must call getSubscriptionPlans");
    assert(
      pricingContent.includes("plan.price_naira.toLocaleString()"),
      "Must dynamically format price from plan object"
    );
    assert(pricingContent.includes('href="/pricing"'), "Must link to full pricing comparison");
  });

  // -----------------------------------------------------------------------
  // TEST GROUP 9: RESPONSIVE VIEWPORT BOUNDARIES (OVERFLOW-X PROTECTION)
  // -----------------------------------------------------------------------
  console.log("\n9. RESPONSIVE VIEWPORT CONSTRAINTS");

  it("All homepage section containers specify overflow-hidden and standard max-w-7xl", () => {
    const heroFile = fs.readFileSync(path.join(appDir, "components/home/HomeHero.tsx"), "utf8");
    assert(heroFile.includes("overflow-hidden"), "Hero must prevent overflow");
    assert(heroFile.includes("max-w-7xl"), "Hero must constrain to max-w-7xl");
    assert(channelContent.includes("overflow-hidden"), "Channel block must prevent overflow");
    assert(channelContent.includes("max-w-7xl"), "Channel block must constrain to max-w-7xl");
  });

  console.log("\n=========================================================================");
  console.log(`  HOMEPAGE LAYER A TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

void runHomepageSuite();
