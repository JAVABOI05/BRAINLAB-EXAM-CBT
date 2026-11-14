import * as fs from "fs";
import * as path from "path";

const { chromium } = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/playwright");
const axe = require("axe-core");

const OUTPUT_DIR = path.resolve("C:/Users/hp/.gemini/antigravity/brain/f51b4798-2c4e-43c5-8f04-3dc65ea181c8/brand_v2_screenshots/auth");

const VIEWPORTS = [
  { name: "mobile_375", width: 375, height: 812, label: "375px (Compact Mobile)" },
  { name: "mobile_390", width: 390, height: 844, label: "390px (Modern Mobile)" },
  { name: "tablet_768", width: 768, height: 1024, label: "768px (Tablet)" },
  { name: "desktop_1440", width: 1440, height: 900, label: "1440px (Desktop)" },
];

async function runAuthAudit() {
  console.log("================================================================================");
  console.log("  BRAINLAB CI: AUTHENTICATION PORTAL (SIGN IN & SIGN UP) VISUAL AUDIT");
  console.log("================================================================================\n");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const auditResults: any[] = [];

  for (const vp of VIEWPORTS) {
    console.log(`▶ Auditing Viewport: ${vp.label}...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    try {
      // 1. Audit Create Account (Start Free landing mode)
      await page.goto("http://localhost:3000/login?mode=signup", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);

      const overflowSignup = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      console.log(`  [Create Account] Horizontal overflow: ${overflowSignup ? "DETECTED (FAIL)" : "NONE (PASS)"}`);

      const signupShotPath = path.join(OUTPUT_DIR, `auth_signup_${vp.name}.png`);
      await page.screenshot({ path: signupShotPath, fullPage: false });
      console.log(`  [Create Account] Captured screenshot: ${signupShotPath}`);

      // Run axe on signup
      const signupAxe = await page.evaluate((axeSource: string) => {
        eval(axeSource);
        return (window as any).axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
        });
      }, axe.source);

      const critSignup = signupAxe.violations.filter((v: any) => v.impact === "critical");
      const serSignup = signupAxe.violations.filter((v: any) => v.impact === "serious");
      console.log(`  [Create Account] Axe-core: Critical = ${critSignup.length}, Serious = ${serSignup.length}`);

      // 2. Click "Sign In" tab and audit Sign In mode
      await page.click("button:has-text('Sign In')");
      await page.waitForTimeout(500);

      const signinShotPath = path.join(OUTPUT_DIR, `auth_signin_${vp.name}.png`);
      await page.screenshot({ path: signinShotPath, fullPage: false });
      console.log(`  [Sign In] Captured screenshot: ${signinShotPath}`);

      const signinAxe = await page.evaluate((axeSource: string) => {
        eval(axeSource);
        return (window as any).axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
        });
      }, axe.source);

      const critSignin = signinAxe.violations.filter((v: any) => v.impact === "critical");
      const serSignin = signinAxe.violations.filter((v: any) => v.impact === "serious");
      console.log(`  [Sign In] Axe-core: Critical = ${critSignin.length}, Serious = ${serSignin.length}`);

      auditResults.push({
        viewport: vp.label,
        width: vp.width,
        signup: {
          overflow: overflowSignup,
          criticalViolations: critSignup.length,
          seriousViolations: serSignup.length,
          screenshot: signupShotPath,
        },
        signin: {
          criticalViolations: critSignin.length,
          seriousViolations: serSignin.length,
          screenshot: signinShotPath,
        },
      });

    } catch (err: any) {
      console.error(`  Error auditing ${vp.label}:`, err.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  const reportPath = path.join(OUTPUT_DIR, "auth_audit_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`\nAudit Report written to: ${reportPath}`);
}

runAuthAudit();
