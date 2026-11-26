const fs = require('fs');
const path = require('path');
const { chromium } = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/playwright");

async function captureGroup2() {
  const browser = await chromium.launch({ channel: "msedge" });
  const targetDir = path.join(__dirname, "../docs/design/evidence/group2/");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const viewports = [
    { name: "desktop-1440", width: 1440, height: 1100, isDark: false },
    { name: "tablet-768", width: 768, height: 1024, isDark: false },
    { name: "mobile-390", width: 390, height: 850, isDark: false },
    { name: "mobile-375", width: 375, height: 812, isDark: false },
    { name: "dark-desktop-1440", width: 1440, height: 1100, isDark: true },
    { name: "dark-mobile-390", width: 390, height: 850, isDark: true },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      try {
        localStorage.setItem("brainlab_cookie_consent_v1", "all");
        localStorage.setItem("brainlab-cookie-consent", "all");
      } catch (e) {}
    });

    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:3000/design-preview", { waitUntil: "networkidle", timeout: 60000 });

    // Wait until loading screen finishes
    await page.waitForFunction(() => !document.body.innerText.includes('Preparing your learning space'), { timeout: 30000 });

    await page.evaluate(() => {
      document.querySelector('aside[aria-label*="Privacy"]')?.remove();
    });

    if (vp.isDark) {
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      });
    } else {
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      });
    }

    await page.waitForTimeout(300);

    // 1. Audiences section
    try {
      const audSection = page.locator('#audiences');
      await audSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await page.screenshot({
        path: path.join(targetDir, `audiences-${vp.name}.png`),
        fullPage: false,
      });
      console.log(`Saved audiences-${vp.name}.png`);
    } catch (e) {
      console.warn(`Could not capture audiences-${vp.name}: ${e.message}`);
    }

    // 2. Mini-Mock section
    try {
      const mockSection = page.locator('#instant-mini-mock');
      await mockSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await page.screenshot({
        path: path.join(targetDir, `mini-mock-${vp.name}.png`),
        fullPage: false,
      });
      console.log(`Saved mini-mock-${vp.name}.png`);
    } catch (e) {
      console.warn(`Could not capture mini-mock-${vp.name}: ${e.message}`);
    }

    // 3. Loop section
    try {
      const loopSection = page.locator('#the-loop');
      await loopSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await page.screenshot({
        path: path.join(targetDir, `loop-${vp.name}.png`),
        fullPage: false,
      });
      console.log(`Saved loop-${vp.name}.png`);
    } catch (e) {
      console.warn(`Could not capture loop-${vp.name}: ${e.message}`);
    }

    await context.close();
  }

  // Interactive interaction capture on Loop (Click Step 3 Diagnose)
  const context = await browser.newContext();
  await context.addInitScript(() => {
    try {
      localStorage.setItem("brainlab_cookie_consent_v1", "all");
    } catch (e) {}
  });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/design-preview", { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.body.innerText.includes('Preparing your learning space'), { timeout: 30000 });
  await page.evaluate(() => {
    document.querySelector('aside[aria-label*="Privacy"]')?.remove();
  });

  const loopSection = page.locator('#the-loop');
  await loopSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  const tabDiagnose = page.locator('button#tab-diagnose');
  if (await tabDiagnose.count() > 0) {
    await tabDiagnose.click();
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(targetDir, `loop-tab-diagnose-1440.png`),
      fullPage: false,
    });
    console.log("Saved loop-tab-diagnose-1440.png");
  }

  await context.close();
  await browser.close();
  console.log("All Group 2 screenshots captured successfully.");
}

captureGroup2().catch(console.error);
