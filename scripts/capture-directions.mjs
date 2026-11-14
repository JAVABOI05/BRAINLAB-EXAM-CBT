import { chromium } from "C:/Users/hp/Downloads/vitalsync-updated/node_modules/playwright/index.mjs";

async function main() {
  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Accept cookies so consent banner does not obstruct view
  await page.addInitScript(() => {
    localStorage.setItem("bl_cookie_consent", "accepted");
    document.cookie = "bl_cookie_consent=accepted; path=/";
  });

  const directions = [
    { id: "1", name: "direction-1", text: "Direction 1: Precision Cockpit" },
    { id: "2", name: "direction-2", text: "Direction 2: Academic Masterclass" },
    { id: "3", name: "direction-3", text: "Direction 3: Problem Arena" },
  ];

  for (const dir of directions) {
    // Desktop 1440px
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("http://localhost:3000/design-preview", { waitUntil: "networkidle" });
    
    // Click the specific direction button
    await page.getByRole("button", { name: dir.text }).click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: "docs/design/evidence/phase1/directions/" + dir.name + "-desktop.png",
      fullPage: false,
    });

    // Mobile 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: "docs/design/evidence/phase1/directions/" + dir.name + "-mobile.png",
      fullPage: false,
    });

    console.log("Saved screenshots for " + dir.name);
  }

  await browser.close();
  console.log("All direction screenshots captured successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
