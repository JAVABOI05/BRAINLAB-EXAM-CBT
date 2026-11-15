import * as fs from "fs";
import * as path from "path";

// Load Playwright from vitalsync-updated node_modules
const { chromium } = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/playwright");
const axe = require("axe-core");

const PAGES_TO_AUDIT = [
  { route: "/login?mode=signup", name: "auth_signup", title: "Candidate Registration & Goal Picker" },
  { route: "/login?mode=signin", name: "auth_signin", title: "Candidate Sign In" },
  { route: "/for-students", name: "for_students", title: "For Students Blueprint & Target Pacing" },
  { route: "/for-tutors", name: "for_tutors", title: "For Educators & Whiteboard Studio" },
  { route: "/pricing", name: "pricing", title: "Pricing & Access Categories" },
];

const VIEWPORTS = [
  { name: "mobile_375", width: 375, height: 812, label: "375px (Compact Mobile)" },
  { name: "desktop_1440", width: 1440, height: 900, label: "1440px (Desktop)" },
];

const ARTIFACT_OUTPUT_DIR = path.resolve("C:/Users/hp/.gemini/antigravity/brain/f51b4798-2c4e-43c5-8f04-3dc65ea181c8/brand_v2_screenshots/audience_and_auth");
const DOCS_OUTPUT_DIR = path.resolve("docs/design/evidence/audience_and_auth");

async function runAudienceAndAuthAudit() {
  console.log("================================================================================");
  console.log("  BRAINLAB CI: AUDIENCE & AUTH PAGES AUDIT (LOGIN, STUDENTS, TUTORS, PRICING)");
  console.log("================================================================================\n");

  if (!fs.existsSync(ARTIFACT_OUTPUT_DIR)) {
    fs.mkdirSync(ARTIFACT_OUTPUT_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOCS_OUTPUT_DIR)) {
    fs.mkdirSync(DOCS_OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  let totalViolations = 0;
  let totalOverflows = 0;

  for (const pageInfo of PAGES_TO_AUDIT) {
    console.log(`\n=======================================================`);
    console.log(`  PAGE: ${pageInfo.title} (${pageInfo.route})`);
    console.log(`=======================================================`);

    for (const vp of VIEWPORTS) {
      console.log(`▶ Viewport: ${vp.label}...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      const page = await context.newPage();

      try {
        await page.goto(`http://localhost:3000${pageInfo.route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(2500);

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        if (overflow) {
          console.error(`  ❌ Horizontal overflow DETECTED!`);
          totalOverflows++;
        } else {
          console.log(`  ✓ Horizontal overflow: 0px (PASS)`);
        }

        // Capture screenshot to artifact dir and docs dir
        const shotName = `${pageInfo.name}_${vp.name}.png`;
        const artifactShot = path.join(ARTIFACT_OUTPUT_DIR, shotName);
        const docsShot = path.join(DOCS_OUTPUT_DIR, shotName);

        await page.screenshot({ path: artifactShot, fullPage: false });
        fs.copyFileSync(artifactShot, docsShot);
        console.log(`  ✓ Captured screenshot: ${shotName}`);

        // Run axe-core accessibility check
        const axeResults = await page.evaluate((axeSource: string) => {
          eval(axeSource);
          return (window as any).axe.run(document, {
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa"],
            },
          });
        }, axe.source);

        const serious = axeResults.violations.filter((v: any) => v.impact === "critical" || v.impact === "serious");
        if (serious.length > 0) {
          console.warn(`  ⚠️ Axe violations: ${serious.length} critical/serious`);
          for (const s of serious) {
            console.warn(`     - [${s.impact}] ${s.id}: ${s.help}`);
            for (const node of s.nodes.slice(0, 3)) {
              console.warn(`       Target: ${node.target.join(" ")}`);
              console.warn(`       HTML: ${node.html}`);
            }
          }
          totalViolations += serious.length;
        } else {
          console.log(`  ✓ Axe-core: 0 critical/serious violations (PASS)`);
        }
      } catch (err: any) {
        console.error(`  ❌ Error auditing ${pageInfo.route} at ${vp.label}:`, err.message);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();

  console.log("\n================================================================================");
  console.log(`  AUDIT COMPLETE: ${totalOverflows} OVERFLOWS, ${totalViolations} SERIOUS AXE VIOLATIONS`);
  console.log("================================================================================\n");

  if (totalOverflows > 0 || totalViolations > 0) {
    process.exit(1);
  }
}

void runAudienceAndAuthAudit();
