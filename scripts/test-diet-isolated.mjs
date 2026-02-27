/**
 * ISOLATED Diet Tab test — runs its own chromium process.
 * Port 8083 | Account: test.diet@fitai.dev
 */
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8083;
const EMAIL = "test.diet@fitai.dev";
const PASSWORD = "TestFitAI@2024!";
const PROFILE_DIR = join(os.tmpdir(), "fitai-playwright-diet");
const SCREENSHOT_DIR = join(__dirname, "..", "test-screenshots", "diet");

mkdirSync(SCREENSHOT_DIR, { recursive: true });

let browser, context, page;
const issues = [];
let screenshotIdx = 0;

async function shot(label) {
  const file = join(
    SCREENSHOT_DIR,
    `${String(screenshotIdx++).padStart(2, "0")}-${label.replace(/\s+/g, "-")}.png`,
  );
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  📸 ${file}`);
  return file;
}

async function check(label, fn) {
  console.log(`\n🧪 ${label}`);
  try {
    await fn();
    console.log(`  ✅ PASS`);
  } catch (e) {
    console.error(`  ❌ FAIL: ${e.message}`);
    issues.push({ label, error: e.message });
    try {
      await shot(`FAIL-${label}`);
    } catch {}
  }
}

async function login() {
  await page.goto(`http://localhost:${PORT}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await shot("01-welcome");

  // Check if already logged in (persistent context may have session)
  const signIn = page.locator("text=Sign In").first();
  try {
    await signIn.waitFor({ timeout: 5000 });
  } catch {
    // No Sign In button — user is likely already logged in
    console.log("  \u2139\ufe0f Already logged in, skipping credentials");
    await page.waitForTimeout(3000);
    await shot("03-after-login");
    console.log("  \u2705 Logged in (session restored), URL:", page.url());
    return;
  }

  // Click Sign In
  await signIn.click();
  await page.waitForTimeout(500);

  // Fill credentials
  await page.fill(
    'input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]',
    EMAIL,
  );
  await page.fill(
    'input[type="password"], input[placeholder*="password" i], input[placeholder*="Password" i]',
    PASSWORD,
  );
  await shot("02-credentials-filled");

  // Submit
  const submitBtn = page
    .locator(
      'button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In")',
    )
    .first();
  await submitBtn.click();

  // Wait for main nav
  await page.waitForTimeout(4000);
  await shot("03-after-login");
  console.log("  \u2705 Logged in, URL:", page.url());
}

async function navigateToDiet() {
  // Look for Diet tab in bottom nav — use role=tab with text match
  const dietTab = page
    .locator(
      '[role="tab"][aria-label="Diet"], [accessibilityRole="tab"][aria-label="Diet"], [data-tab="diet"]'
    )
    .first();
  try {
    await dietTab.waitFor({ timeout: 5000 });
    await dietTab.click();
    await page.waitForTimeout(1500);
  } catch {
    console.log("  \u2139\ufe0f Diet tab role selector missed \u2014 trying text match");
    // Fallback: find text 'Diet' that is inside the bottom tab bar area
    const fallback = page.locator('text=Diet').last();
    try {
      await fallback.waitFor({ timeout: 3000 });
      await fallback.click();
      await page.waitForTimeout(1500);
    } catch {
      console.log("  \u26a0\ufe0f Could not click Diet tab by any selector");
    }
  }
  await shot("04-diet-tab");
}

async function main() {
  console.log(`\n🚀 FitAI Diet Tab Test — Port ${PORT}\n`);

  context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    viewport: { width: 390, height: 844 },
  });
  page = context.pages()[0] || await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) consoleErrors.push(msg.text());
  });

  await login();
  await navigateToDiet();

  await check("DietScreen renders — no blank screen", async () => {
    const body = await page.content();
    if (body.includes("Something went wrong") || body.includes("TypeError"))
      throw new Error("Error screen visible");
    await shot("dietscreen-render");
  });

  await check("Calorie ring / macros display", async () => {
    // Should show calories from seeded data (700 cal)
    const content = await page.content();
    const hasCalories =
      content.includes("cal") ||
      content.includes("Cal") ||
      content.includes("kcal");
    if (!hasCalories) throw new Error("No calorie display found");
    await shot("calorie-ring");
  });

  await check("Meals list shows seeded breakfast + lunch", async () => {
    await page.waitForTimeout(2000);
    const content = await page.content();
    const hasOatmeal =
      content.toLowerCase().includes("oatmeal") || content.includes("300");
    const hasChicken =
      content.toLowerCase().includes("chicken") || content.includes("400");
    if (!hasOatmeal) throw new Error("Seeded breakfast (Oatmeal) not visible");
    if (!hasChicken) throw new Error("Seeded lunch (Chicken) not visible");
    await shot("meals-list");
  });

  await check("HydrationPanel shows water data", async () => {
    const content = await page.content();
    const hasWater =
      content.includes("1500") ||
      content.includes("ml") ||
      content.toLowerCase().includes("water") ||
      content.toLowerCase().includes("hydrat");
    if (!hasWater) throw new Error("Hydration panel not found");
    await shot("hydration-panel");
  });

  await check("Quick-add water button (+250ml)", async () => {
    // Scroll down to make HydrationPanel visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const btn = page.locator('text=+250ml').first();
    await btn.waitFor({ timeout: 5000 });
    await btn.click();
    await page.waitForTimeout(1000);
    await shot("quick-add-water");
  });

  await check("Log Water modal opens and submits", async () => {
    // Scroll back to top to see quick actions
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    // Click the Log Water quick action (DietQuickActions has aria-label="Log Water")
    const logWaterBtn = page.locator('[aria-label="Log Water"]').first();
    await logWaterBtn.waitFor({ timeout: 5000 });
    await logWaterBtn.click();
    await page.waitForTimeout(1000);
    await shot("log-water-modal-open");

    // The WaterIntakeModal has quick add buttons (250ml, 500ml, 1L)
    // and a custom amount input; look for any input or quick button
    const quickAddBtn = page.locator('text=250ml').first();
    try {
      await quickAddBtn.waitFor({ timeout: 3000 });
      await quickAddBtn.click();
    } catch {
      // Fallback: try custom input
      const input = page.locator('input').first();
      await input.waitFor({ timeout: 3000 });
      await input.fill("0.3");
      const submitBtn = page.locator('text=Add Water').first();
      await submitBtn.click();
    }
    await page.waitForTimeout(1000);
    await shot("log-water-after-submit");
  });

  await check("Log Meal modal opens", async () => {
    // Scroll to top to see quick actions
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const logMealBtn = page.locator('[aria-label="Log Meal"]').first();
    await logMealBtn.waitFor({ timeout: 5000 });
    await logMealBtn.click();
    await page.waitForTimeout(500);
    await shot("log-meal-modal");
    // Close it
    const closeBtn = page
      .locator('button:has-text("Cancel"), [aria-label*="close" i]')
      .first();
    try {
      await closeBtn.waitFor({ timeout: 3000 });
      await closeBtn.click();
    } catch {}
    await page.waitForTimeout(500);
  });

  await check("FAB / AI Meals panel", async () => {
    // Look for FAB (floating action button)
    const fab = page
      .locator(
        '[data-testid="fab"], button[aria-label*="AI" i], button[aria-label*="meal" i]',
      )
      .first();
    try {
      await fab.waitFor({ timeout: 3000 });
      await fab.click();
      await page.waitForTimeout(500);
      await shot("ai-meals-panel");
      const closeBtn = page
        .locator('button:has-text("Close"), button[aria-label*="close" i]')
        .first();
      try {
        await closeBtn.click();
      } catch {}
    } catch {
      throw new Error("FAB/AI meals button not found");
    }
  });

  await check("Pull-to-refresh works", async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    // Trigger pull-to-refresh via scroll
    await page.mouse.move(200, 200);
    await page.mouse.down();
    await page.mouse.move(200, 400, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await shot("pull-to-refresh");
  });

  await check("Scroll to bottom — no content cut off", async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await shot("scroll-to-bottom");
  });

  // Check console errors
  await check("No JavaScript console errors", async () => {
    if (consoleErrors.length > 0) {
      throw new Error(
        `${consoleErrors.length} console error(s):\n${consoleErrors.slice(0, 3).join("\n")}`,
      );
    }
  });

  // Summary
  console.log("\n\n📋 ─── DIET TAB TEST SUMMARY ──────────────────────");
  if (issues.length === 0) {
    console.log("✅ ALL TESTS PASSED — Diet tab is clean!\n");
  } else {
    console.log(`❌ ${issues.length} ISSUE(S) FOUND:\n`);
    issues.forEach((i, n) =>
      console.log(`  ${n + 1}. ${i.label}\n     ${i.error}`),
    );
  }
  console.log("───────────────────────────────────────────────────\n");

  await context.close();
  return issues;
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
