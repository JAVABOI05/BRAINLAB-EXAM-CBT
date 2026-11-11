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

const PAGES = [
  { id: "homepage", url: "http://localhost:3000/", name: "Homepage" },
  { id: "cbt_simulator", url: "http://localhost:3000/cbt", name: "CBT Simulator" },
  { id: "exam_history", url: "http://localhost:3000/student/exams", name: "Exam History & Certificates" },
];

const OUTPUT_DIR = path.resolve("C:/Users/hp/.gemini/antigravity/brain/f51b4798-2c4e-43c5-8f04-3dc65ea181c8/ui_baseline_screenshots");

async function runAudit() {
  console.log("================================================================================");
  console.log("  BRAINLAB CI: STAGE 3 UI SYSTEM BASELINE & AXE-CORE AUDIT");
  console.log("================================================================================\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const report: any[] = [];

  for (const pageConfig of PAGES) {
    console.log(`\n▶ Auditing Page: ${pageConfig.name} (${pageConfig.url})`);

    for (const vp of VIEWPORTS) {
      console.log(`  Checking viewport: ${vp.label}...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      const page = await context.newPage();

      try {
        await page.goto(pageConfig.url, { waitUntil: "domcontentloaded", timeout: 25000 });
        // Allow brief settling for client hydration
        await page.waitForTimeout(1500);

        // 1. Check Horizontal Overflow
        const overflow = await page.evaluate(() => {
          const scrollWidth = document.documentElement.scrollWidth;
          const clientWidth = document.documentElement.clientWidth;
          const innerWidth = window.innerWidth;
          const hasOverflow = scrollWidth > innerWidth + 1; // 1px threshold for sub-pixel rounding
          return {
            hasOverflow,
            scrollWidth,
            clientWidth,
            innerWidth,
            delta: Math.max(0, scrollWidth - innerWidth),
          };
        });

        // 2. Measure Touch Targets on mobile viewports (< 768px)
        const touchTargets = await page.evaluate((isMobile: boolean) => {
          if (!isMobile) return { smallCount: 0, sampleElements: [] };
          const interactive = Array.from(
            document.querySelectorAll("button, a[role='button'], input[type='submit'], .bl-interactive-hover")
          );
          const smallTargets: any[] = [];

          for (const el of interactive) {
            const rect = el.getBoundingClientRect();
            // Ignore hidden or non-rendered elements
            if (rect.width === 0 || rect.height === 0) continue;
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

            if (rect.width < 44 || rect.height < 44) {
              const text = (el.textContent || el.getAttribute("aria-label") || el.className).trim().slice(0, 30);
              smallTargets.push({
                text,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                tagName: el.tagName,
              });
            }
          }

          return {
            smallCount: smallTargets.length,
            sampleElements: smallTargets.slice(0, 5),
          };
        }, vp.width < 768);

        // 3. Check Sticky Clearance (Sticky headers/timers covering text)
        const stickyClearance = await page.evaluate(() => {
          const stickyHeaders = Array.from(document.querySelectorAll(".exam-topbar, header, .bl-sticky-banner"));
          const issues: string[] = [];

          for (const header of stickyHeaders) {
            const rect = header.getBoundingClientRect();
            if (rect.height > 120 && window.innerWidth <= 390) {
              issues.push(`Sticky element height ${Math.round(rect.height)}px may constrain viewport on mobile`);
            }
          }
          return { issues };
        });

        // 4. Run axe-core Accessibility Scan
        await page.evaluate(axe.source);
        const axeResults = await page.evaluate(async () => {
          return await (window as any).axe.run({
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
            },
          });
        });

        // 5. Capture Screenshot
        const screenshotFilename = `${pageConfig.id}_${vp.name}.png`;
        const screenshotPath = path.join(OUTPUT_DIR, screenshotFilename);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const violationsSummary = {
          critical: axeResults.violations.filter((v: any) => v.impact === "critical").length,
          serious: axeResults.violations.filter((v: any) => v.impact === "serious").length,
          moderate: axeResults.violations.filter((v: any) => v.impact === "moderate").length,
          minor: axeResults.violations.filter((v: any) => v.impact === "minor").length,
          total: axeResults.violations.length,
          topViolations: axeResults.violations.slice(0, 3).map((v: any) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodesCount: v.nodes.length,
          })),
        };

        const resultEntry = {
          page: pageConfig.name,
          url: pageConfig.url,
          viewport: vp.label,
          width: vp.width,
          overflow,
          touchTargets,
          stickyClearance,
          violationsSummary,
          screenshotPath,
        };

        report.push(resultEntry);

        console.log(`    - Overflow: ${overflow.hasOverflow ? `❌ ${overflow.delta}px overflow` : "✅ None"}`);
        console.log(`    - Touch Targets <44px: ${touchTargets.smallCount} detected`);
        console.log(`    - Axe Violations: ${violationsSummary.total} (Critical: ${violationsSummary.critical}, Serious: ${violationsSummary.serious})`);
        console.log(`    - Screenshot: ${screenshotFilename}`);
      } catch (err: any) {
        console.error(`    ❌ Error on ${pageConfig.name} at ${vp.label}:`, err.message);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();

  const reportPath = path.join(OUTPUT_DIR, "ui_baseline_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n================================================================================`);
  console.log(`  AUDIT COMPLETE: Report saved to ${reportPath}`);
  console.log(`================================================================================\n`);
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
