const { chromium } = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/playwright");

async function runCycle(cycleName) {
  const browser = await chromium.launch({ channel: "msedge" });
  const viewports = [
    { name: "375", width: 375, height: 812 },
    { name: "390", width: 390, height: 844 },
    { name: "768", width: 768, height: 1024 },
    { name: "1024", width: 1024, height: 768 },
    { name: "1440", width: 1440, height: 960 },
  ];

  const targetDir = `docs/design/evidence/hero/${cycleName}/`;

  // Standard context
  const context = await browser.newContext();
  const page = await context.newPage();

  // Clean cookie banner
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

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:3000/design-preview", { waitUntil: "networkidle" });
    await cleanPage(page);
    await page.waitForTimeout(400);

    await page.screenshot({
      path: `${targetDir}${vp.name}.png`,
      fullPage: false,
    });
    console.log(`[${cycleName}] Saved ${vp.name}px screenshot`);
  }

  // Images-blocked version
  const contextNoImages = await browser.newContext();
  const pageNoImages = await contextNoImages.newPage();
  await pageNoImages.route("**/*", (route) => {
    if (["image", "imageset", "media"].includes(route.request().resourceType())) {
      route.abort();
    } else {
      route.continue();
    }
  });
  await pageNoImages.setViewportSize({ width: 1440, height: 960 });
  await pageNoImages.goto("http://localhost:3000/design-preview", { waitUntil: "networkidle" });
  await cleanPage(pageNoImages);
  await pageNoImages.waitForTimeout(400);
  await pageNoImages.screenshot({
    path: `${targetDir}images-blocked.png`,
    fullPage: false,
  });
  console.log(`[${cycleName}] Saved images-blocked screenshot`);
  await contextNoImages.close();

  // Throttled network version
  const contextThrottled = await browser.newContext();
  const pageThrottled = await contextThrottled.newPage();
  const cdp = await contextThrottled.newCDPSession(pageThrottled);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (500 * 1024) / 8, // 500 kbps (Regular 3G)
    uploadThroughput: (500 * 1024) / 8,
    latency: 150,
  });
  await pageThrottled.setViewportSize({ width: 1440, height: 960 });
  await pageThrottled.goto("http://localhost:3000/design-preview", { waitUntil: "domcontentloaded" });
  await cleanPage(pageThrottled);
  await pageThrottled.waitForTimeout(500);
  await pageThrottled.screenshot({
    path: `${targetDir}throttled.png`,
    fullPage: false,
  });
  console.log(`[${cycleName}] Saved throttled network screenshot`);
  await contextThrottled.close();

  // A11y and interactive metrics
  const audit = await page.evaluate(() => {
    const interactive = Array.from(document.querySelectorAll("button, a")).map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        text: el.textContent.trim().slice(0, 30),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      };
    });
    const sub44px = interactive.filter((i) => i.h > 0 && i.h < 44);
    return {
      interactiveTotal: interactive.length,
      sub44pxCount: sub44px.length,
      sub44pxItems: sub44px.slice(0, 5),
    };
  });

  console.log(`[${cycleName}] Audit:`, JSON.stringify(audit, null, 2));
  await browser.close();
}

const cycle = process.argv[2] || "cycle1";
runCycle(cycle).catch((err) => {
  console.error(err);
  process.exit(1);
});
