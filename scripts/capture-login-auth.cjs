const fs = require('fs');
const path = require('path');
const { chromium } = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/playwright");

async function capture() {
  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const targetDir = path.join(__dirname, "../docs/design/evidence/upgraded");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  try {
    // 1. Visit Login page (signin mode)
    await page.goto("http://localhost:3000/login?mode=signin", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(targetDir, "login-signin-password.png"), fullPage: true });
    console.log("Captured: login-signin-password.png");

    // 2. Click "6-Digit Code / Magic Link"
    const otpTab = page.locator("button:has-text('6-Digit Code')");
    if (await otpTab.count() > 0) {
      await otpTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(targetDir, "login-otp-request.png"), fullPage: true });
      console.log("Captured: login-otp-request.png");
    }

    // 3. Switch back to Password, click "Resend activation?"
    const pwdTab = page.locator("button:has-text('Password')").first();
    if (await pwdTab.count() > 0) {
      await pwdTab.click();
      await page.waitForTimeout(300);
    }

    const resendBtn = page.locator("button:has-text('Resend activation?')");
    if (await resendBtn.count() > 0) {
      await resendBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(targetDir, "login-resend-modal.png"), fullPage: true });
      console.log("Captured: login-resend-modal.png");
    }

  } catch (err) {
    console.error("Capture error:", err);
  } finally {
    await browser.close();
  }
}

capture();
