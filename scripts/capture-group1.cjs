const fs = require('fs');
const path = require('path');
const { chromium } = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/playwright");

async function captureGroup1() {
  const browser = await chromium.launch({ channel: "msedge" });
  const targetDir = path.join(__dirname, "../docs/design/evidence/group1/");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const cleanPage = async (p) => {
    await p.evaluate(() => {
      localStorage.setItem("brainlab-cookie-consent", "all");
      const banner = document.querySelector('section[aria-label*="Privacy"], div[aria-label*="Privacy"]');
      if (banner) banner.remove();
      document.querySelectorAll('div, section').forEach(el => {
        if (el.textContent && el.textContent.includes('Privacy Choices & First-Party Measurement') && el.querySelector('button')) {
          el.remove();
        }
      });
    });
  };

  const viewports = [
    { name: "desktop-1440", width: 1440, height: 1100, isDark: false },
    { name: "tablet-768", width: 768, height: 1024, isDark: false },
    { name: "mobile-390", width: 390, height: 950, isDark: false },
    { name: "mobile-375", width: 375, height: 900, isDark: false },
    { name: "dark-desktop-1440", width: 1440, height: 1100, isDark: true },
    { name: "dark-mobile-390", width: 390, height: 950, isDark: true },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:3000/design-preview", { waitUntil: "networkidle" });
    await cleanPage(page);

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

    await page.waitForTimeout(400);

    // Locate the university target section and scroll into view
    const targetSection = page.locator('section[aria-label*="Cut-off Targets"]').first();
    if (await targetSection.count() > 0) {
      await targetSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }

    // Capture Group 1 in view
    await page.screenshot({
      path: path.join(targetDir, `${vp.name}.png`),
      fullPage: false,
    });
    console.log(`Saved ${vp.name}.png`);

    await context.close();
  }

  // Also capture the standalone Join Channel section specifically
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("http://localhost:3000/design-preview", { waitUntil: "networkidle" });
  await cleanPage(page);
  const channelSection = page.locator('section[aria-label="Join Official BrainLab Channel"]').first();
  if (await channelSection.count() > 0) {
    await channelSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await channelSection.screenshot({
      path: path.join(targetDir, "join-channel-card-1440.png"),
    });
    console.log("Saved join-channel-card-1440.png");
  }
  await context.close();

  await browser.close();
  console.log("All Group 1 screenshots captured successfully.");
}

captureGroup1().catch(console.error);
