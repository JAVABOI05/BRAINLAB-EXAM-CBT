const { chromium } = require("C:/Users/hp/Downloads/vitalsync-updated/node_modules/playwright");

async function main() {
  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext();
  const page = await context.newPage();

  const directions = [
    { id: "A", name: "direction-a", text: "Direction A: Living Archive & Tactile OMR" },
    { id: "B", name: "direction-b", text: "Direction B: 320+ Flight Simulator" },
    { id: "C", name: "direction-c", text: "Direction C: Cognitive Topology" },
  ];

  for (const dir of directions) {
    // Desktop 1440px
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("http://localhost:3000/design-preview", { waitUntil: "networkidle" });
    
    // Ensure cookie banner is removed
    await page.evaluate(() => {
      localStorage.setItem("brainlab-cookie-consent", "all");
      const banner = document.querySelector('section[aria-label*="Privacy"], div[aria-label*="Privacy"]');
      if (banner) banner.remove();
      document.querySelectorAll('div, section').forEach(el => {
        if (el.textContent && el.textContent.includes('Privacy Choices & First-Party Measurement') && el.querySelector('button')) {
          el.remove();
        }
      });
    });

    // Click the specific direction button
    await page.getByRole("button", { name: dir.text }).click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: "docs/design/evidence/phase1/directions/" + dir.name + "-desktop.png",
      fullPage: false,
    });

    // Mobile 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: "docs/design/evidence/phase1/directions/" + dir.name + "-mobile.png",
      fullPage: false,
    });

    console.log("Saved clean screenshots for " + dir.name);
  }

  await browser.close();
  console.log("All radical direction screenshots captured successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
