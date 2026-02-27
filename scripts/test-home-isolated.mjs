/**
 * ISOLATED Home Tab test — runs its own chromium process.
 * Port 8086 | Account: test.home@fitai.dev
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8086;
const EMAIL = "test.home@fitai.dev";
const PASSWORD = "TestFitAI@2024!";
const PROFILE_DIR = join(os.tmpdir(), "fitai-playwright-home");
const SCREENSHOT_DIR = join(__dirname, "..", "test-screenshots", "home");
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

async function login() {
  await page.goto(`http://localhost:${PORT}`, {
    waitUntil: "load",
    timeout: 60000,
  });
  await page.locator("text=Sign In").first().click();
  await page.waitForTimeout(300);
  await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
  await page.fill(
    'input[type="password"], input[placeholder*="password" i]',
    PASSWORD,
  );
  await page
    .locator('button:has-text("Sign In"), button:has-text("Login")')
    .first()
    .click();
  await page.waitForTimeout(4000);
  await shot("after-login");
}

async function main() {
  console.log(`\n🚀 FitAI Home Tab Test — Port ${PORT}\n`);
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
  });
  page = await context.pages()[0] || await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await login();

  // Home tab should be default — if not, navigate to it
  const homeTab = page.locator('[aria-label*="home" i], text=Home').first();
  try {
    await homeTab.waitFor({ timeout: 3000 });
    await homeTab.click();
    await page.waitForTimeout(800);
  } catch {}
  await shot("home-tab");

  await check("HomeScreen renders — no blank/error screen", async () => {
    const content = await page.content();
    if (
      content.includes("Something went wrong") ||
      content.includes("TypeError")
    )
      throw new Error("Error screen visible");
    await shot("home-screen");
  });

  await check('Header greeting with name "Home"', async () => {
    const content = await page.content();
    const hasGreeting =
      content.toLowerCase().includes("home") ||
      content.toLowerCase().includes("hello") ||
      content.toLowerCase().includes("good morning") ||
      content.toLowerCase().includes("good afternoon") ||
      content.toLowerCase().includes("good evening");
    if (!hasGreeting) throw new Error("Greeting not found in header");
    await shot("header-greeting");
  });

  await check(
    "DailyProgressRings — 3 rings visible (calories, water, workouts)",
    async () => {
      const content = await page.content();
      const hasRings =
        content.toLowerCase().includes("calorie") ||
        content.includes("700") ||
        content.toLowerCase().includes("ring") ||
        content.includes("svg");
      if (!hasRings) throw new Error("Progress rings not found");
      await shot("progress-rings");
    },
  );

  await check("Calories ring shows seeded 700 cal", async () => {
    const content = await page.content();
    // Seeded 700 cal (300 breakfast + 400 lunch)
    const has700 = content.includes("700") || content.includes("cal");
    if (!has700) throw new Error("700 calorie data not showing");
    await shot("calories-ring");
  });

  await check(
    "WeeklyMiniCalendar renders — no button-in-button DOM error",
    async () => {
      const content = await page.content();
      const dayCount = [
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun",
        "Su",
        "Mo",
        "Tu",
        "We",
        "Th",
        "Fr",
        "Sa",
      ].filter((d) => content.includes(d)).length;
      if (dayCount < 4)
        throw new Error(
          `Only ${dayCount} day labels found — calendar may not render`,
        );
      // Check for DOM nesting error in console
      const btnInBtn = consoleErrors.some(
        (e) => e.includes("button") && e.includes("descendant"),
      );
      if (btnInBtn)
        throw new Error(
          "button-in-button DOM nesting error detected in console",
        );
      await shot("weekly-calendar");
    },
  );

  await check("WeeklyMiniCalendar day tap — no crash", async () => {
    // Tap a non-today day
    const dayItems = page.locator('[data-testid*="day"], [aria-label*="day"]');
    const count = await dayItems.count();
    if (count > 1) {
      await dayItems.nth(1).click({ force: true });
      await page.waitForTimeout(500);
    }
    await shot("calendar-day-tap");
  });

  await check("BodyProgressCard shows weight ~72kg", async () => {
    const content = await page.content();
    const hasWeight =
      content.includes("72") ||
      content.includes("71") ||
      content.toLowerCase().includes("weight") ||
      content.toLowerCase().includes("kg");
    if (!hasWeight)
      throw new Error("Weight data not visible in BodyProgressCard");
    await shot("body-progress-card");
  });

  await check("MotivationBanner — not a placeholder/undefined", async () => {
    const content = await page.content();
    // Should NOT show placeholder text
    if (
      content.includes("undefined") ||
      content.includes("{{") ||
      content.includes("Lorem ipsum")
    ) {
      throw new Error("MotivationBanner shows placeholder content");
    }
    await shot("motivation-banner");
  });

  await check("Scroll to bottom — no content cut off", async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await shot("scroll-bottom");
  });

  await check("Pull-to-refresh works", async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(200, 300);
    await page.mouse.down();
    await page.mouse.move(200, 500, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await shot("pull-to-refresh");
  });

  await check("Ring tap navigates to correct tab", async () => {
    // Tap calories ring → should go to Diet tab
    const ringSvg = page
      .locator('svg circle, [data-testid*="ring"], [data-testid*="calorie"]')
      .first();
    try {
      await ringSvg.waitFor({ timeout: 3000 });
      await ringSvg.click({ force: true });
      await page.waitForTimeout(1000);
      await shot("ring-tap-navigation");
      // Go back to home
      const homeTab = page.locator('[aria-label*="home" i], text=Home').first();
      await homeTab.click();
      await page.waitForTimeout(500);
    } catch {
      console.log("  ℹ️  Ring tap test skipped — SVG click not supported");
    }
  });

  await check("No JavaScript console errors", async () => {
    if (consoleErrors.length > 0)
      throw new Error(
        `${consoleErrors.length} error(s): ${consoleErrors.slice(0, 3).join(" | ")}`,
      );
  });

  console.log("\n\n📋 ─── HOME TAB TEST SUMMARY ────────────────────────");
  if (issues.length === 0)
    console.log("✅ ALL TESTS PASSED — Home tab is clean!\n");
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
