const fs = require('fs');
const path = require('path');
const { chromium } = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/playwright");

async function main() {
  const browser = await chromium.launch({ channel: "msedge" });
  const targetDir = path.join(__dirname, "../docs/design/evidence/upgraded");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const viewports = [
    { name: "desktop-1440", width: 1440, height: 1000 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "mobile-390", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      localStorage.setItem("bl_cookie_consent", "accepted");
      localStorage.setItem("brainlab-cookie-consent", "all");
    });

    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Scroll smoothly down the page to trigger all scroll-reveal animations
    await page.evaluate(async () => {
      const distance = 400;
      const delay = 100;
      while (document.scrollingElement.scrollTop + window.innerHeight < document.scrollingElement.scrollHeight) {
        document.scrollingElement.scrollBy(0, distance);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      // Scroll back up to hero
      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    await page.waitForTimeout(1000);

    // Capture initial hero viewport
    await page.screenshot({
      path: path.join(targetDir, `${vp.name}-hero.png`),
      fullPage: false,
    });

    // Capture full page
    await page.screenshot({
      path: path.join(targetDir, `${vp.name}-full.png`),
      fullPage: true,
    });

    console.log(`Captured upgraded screenshots for ${vp.name}`);
    await context.close();
  }

  await browser.close();
  console.log("Upgraded screenshots capture complete.");
}

main().catch((err) => {
  console.error("Error capturing upgraded screenshots:", err);
  process.exit(1);
});
