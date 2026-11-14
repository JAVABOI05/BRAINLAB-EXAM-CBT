import * as fs from "fs";
import * as path from "path";

// Load Playwright from vitalsync-updated node_modules
const { chromium } = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/playwright");
const axe = require("axe-core");

const VIEWPORTS = [
  { name: "mobile_375", width: 375, height: 812, label: "375px (Compact Mobile)" },
  { name: "mobile_390", width: 390, height: 844, label: "390px (Modern Mobile)" },
  { name: "tablet_768", width: 768, height: 1024, label: "768px (Tablet)" },
  { name: "desktop_1440", width: 1440, height: 900, label: "1440px (Desktop)" },
];

const OUTPUT_DIR = path.resolve("C:/Users/hp/.gemini/antigravity/brain/f51b4798-2c4e-43c5-8f04-3dc65ea181c8/brand_v2_screenshots");

async function runAudit() {
  console.log("================================================================================");
  console.log("  BRAINLAB CI: BRAND IDENTITY V2 HOMEPAGE AUDIT (ALL VIEWPORTS)");
  console.log("================================================================================\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const results: any[] = [];

  for (const vp of VIEWPORTS) {
    console.log(`▶ Auditing Viewport: ${vp.label}...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      console.log(`  Horizontal overflow: ${overflow ? "DETECTED (FAIL)" : "NONE (PASS)"}`);

      // Capture screenshot
      const shotPath = path.join(OUTPUT_DIR, `homepage_${vp.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`  Captured screenshot: ${shotPath}`);

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

      const criticalViolations = axeResults.violations.filter((v: any) => v.impact === "critical");
      const seriousViolations = axeResults.violations.filter((v: any) => v.impact === "serious");

      console.log(`  Axe-core: Critical = ${criticalViolations.length}, Serious = ${seriousViolations.length}`);
      for (const sv of seriousViolations) {
        console.log(`    [SERIOUS] ${sv.id}: ${sv.help}`);
        for (const n of sv.nodes) {
          console.log(`      Node: ${n.target.join(' ')}`);
          console.log(`      Failure summary: ${n.failureSummary}`);
        }
      }

      results.push({
        viewport: vp.label,
        width: vp.width,
        overflow,
        criticalViolations: criticalViolations.length,
        seriousViolations: seriousViolations.length,
        seriousDetails: seriousViolations.map((sv: any) => ({
          id: sv.id,
          help: sv.help,
          nodes: sv.nodes.map((n: any) => n.target.join(' ')),
        })),
        screenshot: shotPath,
      });

    } catch (err: any) {
      console.error(`  Error auditing ${vp.label}:`, err.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  const reportPath = path.join(OUTPUT_DIR, "brand_v2_audit_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nAudit Report written to: ${reportPath}`);
}

runAudit();
