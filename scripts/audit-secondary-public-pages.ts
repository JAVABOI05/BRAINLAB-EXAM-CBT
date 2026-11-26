import * as fs from "fs";
import * as path from "path";

// Load Playwright from vitalsync-updated node_modules
const { chromium } = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/playwright");
const axe = require("axe-core");

const PAGES_TO_AUDIT = [
  { route: "/products", name: "products", title: "Products Hub" },
  { route: "/about", name: "about", title: "About Academy" },
  { route: "/syllabus", name: "syllabus", title: "National Syllabus Explorer" },
  { route: "/schools", name: "schools", title: "Institutional CBT Suite" },
];

const VIEWPORTS = [
  { name: "mobile_375", width: 375, height: 812, label: "375px (Compact Mobile)" },
  { name: "desktop_1440", width: 1440, height: 900, label: "1440px (Desktop)" },
];

const OUTPUT_DIR = path.resolve("C:/Users/hp/.gemini/antigravity/brain/f51b4798-2c4e-43c5-8f04-3dc65ea181c8/brand_v2_screenshots/secondary_pages");

async function runSecondaryPagesAudit() {
  console.log("================================================================================");
  console.log("  BRAINLAB CI: SECONDARY PUBLIC PAGES AUDIT (PRODUCTS, ABOUT, SYLLABUS, SCHOOLS)");
  console.log("================================================================================\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

        // Capture screenshot
        const shotPath = path.join(OUTPUT_DIR, `${pageInfo.name}_${vp.name}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`  ✓ Captured screenshot: ${path.basename(shotPath)}`);

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

void runSecondaryPagesAudit();
