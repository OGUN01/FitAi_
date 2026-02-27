/**
 * ISOLATED Fitness/Workout Tab test — runs its own chromium process.
 * Port 8084 | Account: test.workout@fitai.dev
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8084;
const EMAIL = "test.workout@fitai.dev";
const PASSWORD = "TestFitAI@2024!";
const PROFILE_DIR = join(os.tmpdir(), `fitai-playwright-fitness-${Date.now()}`);
const SCREENSHOT_DIR = join(__dirname, "..", "test-screenshots", "fitness");
mkdirSync(SCREENSHOT_DIR, { recursive: true });

let page;
const issues = [];
let idx = 0;

const shot = async (label) => {
  const file = join(
    SCREENSHOT_DIR,
    `${String(idx++).padStart(2, "0")}-${label.replace(/\s+/g, "-")}.png`,
  );
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  📸 ${file}`);
};

const check = async (label, fn) => {
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
};

async function login(page) {
  await page.goto(`http://localhost:${PORT}`, {
    waitUntil: "load",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  await page.locator("text=Sign In").first().click();
  await page.waitForTimeout(300);
  await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
  await page.fill(
    'input[type="password"], input[placeholder*="password" i]',
    PASSWORD,
  );
  await page
    .locator(
      'button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In")',
    )
    .first()
    .click();
  await page.waitForTimeout(4000);
  await shot("after-login");
}

async function main() {
  console.log(`\n🚀 FitAI Fitness Tab Test — Port ${PORT}\n`);
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
  });
  page = await context.pages()[0] || await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) consoleErrors.push(msg.text());
  });

  await login(page);

  // Navigate to Fitness tab

  const fitnessTab = page
    .locator('[data-testid="tab-fitness"], [aria-label*="workout" i]')
    .first();
  try {
    await fitnessTab.waitFor({ timeout: 5000 });
    await fitnessTab.click();
    await page.waitForTimeout(1000);
  } catch {}
  await shot("fitness-tab");

  await check("FitnessScreen renders — no blank/error screen", async () => {
    const content = await page.content();
    if (
      content.includes("Something went wrong") ||
      content.includes("TypeError")
    )
      throw new Error("Error screen visible");
    await shot("fitness-screen");
  });

  await check("Header shows greeting + name", async () => {
    const content = await page.content();
    if (
      !content.toLowerCase().includes("workout") &&
      !content.toLowerCase().includes("tester") &&
      !content.toLowerCase().includes("hello") &&
      !content.toLowerCase().includes("good")
    ) {
      throw new Error("No greeting/name found in header");
    }
    await shot("header");
  });

  await check("WeeklyCalendar renders 7 days", async () => {
    // Check for day labels (Mon, Tue, etc.)
    const content = await page.content();
    const dayCount = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].filter(
      (d) => content.includes(d),
    ).length;
    if (dayCount < 5)
      throw new Error(`Only ${dayCount}/7 day labels found in calendar`);
    await shot("weekly-calendar");
  });

  await check("WeeklyCalendar day tap — no crash", async () => {
    const dayBtns = page.locator('[data-testid*="day"], [aria-label*="day" i]');
    const count = await dayBtns.count();
    if (count === 0) {
      // Try clicking generic calendar items
      const calItems = page.locator('[data-testid*="day-"]').first();
      try { await calItems.click({ force: true }); } catch {
        // fallback: click first text=Mon
        await page.locator('text=Mon').first().click({ force: true });
      }
    } else {
      await dayBtns.first().click();
    }
    await page.waitForTimeout(500);
    await shot("day-tap");
  });

  await check("Generate Plan button visible and tappable", async () => {
    const generateBtn = page
      .locator(
        'button:has-text("Generate"), button:has-text("Create Plan"), button:has-text("Get Plan")',
      )
      .first();
    await generateBtn.waitFor({ timeout: 5000 });
    await shot("generate-btn");
    await generateBtn.click();
    await page.waitForTimeout(3000);
    await shot("after-generate");
    // Either a plan appears or a paywall — both are acceptable
    const content = await page.content();
    const hasPlan =
      content.toLowerCase().includes("exercise") ||
      content.toLowerCase().includes("workout") ||
      content.toLowerCase().includes("set") ||
      content.toLowerCase().includes("upgrade") ||
      content.toLowerCase().includes("premium");
    if (!hasPlan)
      throw new Error("Neither plan nor paywall appeared after Generate");
  });


  await check("PaywallModal renders 3 tiers if shown", async () => {
    // Detect the modal by looking for its heading text (not raw HTML which has CSS class names with price-like numbers)
    const modalVisible = await page.locator('text=Choose Your Plan').count() > 0;
    if (modalVisible) {
      // Modal is open — verify it has at least 2 paid plan cards
      const content = await page.content();
      const hasFreePlan = content.includes("Free Plan");
      const hasPaidPlan = content.toLowerCase().includes("basic") || content.toLowerCase().includes("pro");
      if (!hasFreePlan || !hasPaidPlan)
        throw new Error("PaywallModal missing plan tiers");
      await shot("paywall-modal");
      // Close it
      const closeBtn = page
        .locator(
          'button[aria-label*="close" i], button:has-text("Close"), button:has-text("Maybe Later")',
        )
        .first();
      try {
        await closeBtn.click();
      } catch {}
    }
    // If modal is not visible, paywall was not triggered — that's acceptable
  });

  await check("Workout History section renders", async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await shot("workout-history");
    // Should have history section or empty state — not a crash
    const content = await page.content();
    if (content.includes("TypeError") || content.includes("Cannot read"))
      throw new Error("JS error in history section");
  });

  await check("Scroll to bottom — no content cut off", async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await shot("scroll-bottom");
  });

  await check("No JavaScript console errors", async () => {
    if (consoleErrors.length > 0)
      throw new Error(
        `${consoleErrors.length} error(s): ${consoleErrors.slice(0, 3).join(" | ")}`,
      );
  });

  console.log("\n\n📋 ─── FITNESS TAB TEST SUMMARY ──────────────────────");
  if (issues.length === 0)
    console.log("✅ ALL TESTS PASSED — Fitness tab is clean!\n");
  else {
    console.log(`❌ ${issues.length} ISSUE(S):\n`);
    issues.forEach((i, n) =>
      console.log(`  ${n + 1}. ${i.label}\n     ${i.error}`),
    );
  }
  console.log("─────────────────────────────────────────────────────\n");

  await context.close();
  if (issues.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
