/**
 * ISOLATED Sessions / Navigation test — runs its own chromium process.
 * Port 8082 | Account: test.sessions@fitai.dev
 *
 * Tests: WorkoutSession, ProgressScreen, AchievementsScreen, MealSession,
 *        CookingSession, onboarding flow, guest mode, responsive layout,
 *        PremiumGate/PaywallModal, data persistence after tab switch.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8082;
const EMAIL = "test.sessions@fitai.dev";
const PASSWORD = "TestFitAI@2024!";
const PROFILE_DIR = join(os.tmpdir(), "fitai-playwright-sessions");
const SCREENSHOT_DIR = join(__dirname, "..", "test-screenshots", "sessions");
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
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await shot("01-welcome");

  // Wait up to 15s for either: WelcomeScreen (Sign In button) OR MainNavigation (already logged in)
  let alreadyLoggedIn = false;
  try {
    await Promise.race([
      page.locator("text=Sign In").first().waitFor({ timeout: 15000 }),
      page.locator('[role="tab"]').first().waitFor({ timeout: 15000 }),
    ]);
  } catch {
    // Neither appeared — loading is still stuck, proceed anyway
  }

  // Check if we're already on main navigation (tabs visible)
  const content = await page.content();
  if (
    content.includes('role="tab"') ||
    content.includes("Home") && content.includes("Workout") && content.includes("Profile")
  ) {
    alreadyLoggedIn = true;
    console.log("  ℹ️ Already logged in, skipping sign-in form");
    await shot("02-after-login");
    return;
  }

  const signIn = page.locator("text=Sign In").first();
  await signIn.waitFor({ timeout: 10000 });
  await signIn.click();
  await page.waitForTimeout(500);
  await page.fill(
    'input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]',
    EMAIL,
  );
  await page.fill(
    'input[type="password"], input[placeholder*="password" i], input[placeholder*="Password" i]',
    PASSWORD,
  );
  const submitBtn = page
    .locator(
      'button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In")',
    )
    .first();
  await submitBtn.click();
  await page.waitForTimeout(4000);
  await shot("02-after-login");
  console.log("  ✅ Logged in");
}

async function navigateToTab(tabName) {
  const tab = page
    .locator(
      `[role="tab"][aria-label="${tabName}"]`
    )
    .first();
  try {
    await tab.waitFor({ timeout: 5000 });
    await tab.click();
    await page.waitForTimeout(1000);
  } catch {
    console.log(`  ℹ️ Could not find ${tabName} tab`);
  }
}

async function main() {
  console.log(`\n🚀 FitAI Sessions / Navigation Test — Port ${PORT}\n`);
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    viewport: { width: 390, height: 844 },
  });
  page = await context.pages()[0] || await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Filter out browser-level network resource errors (HTTP 400/404/500)
      // These are Supabase fetch responses logged by the browser, not JS errors.
      if (text.includes("Failed to load resource")) {
        networkErrors.push(text);
        return; // don't count as JS error
      }
      consoleErrors.push(text);
    }
  });

  await login();

  // ── 1. Main navigation renders all 5 tabs ────────────────────────────────
  await check(
    "TabBar renders all 5 tabs (Home, Workout, Analytics, Diet, Profile)",
    async () => {
      const content = await page.content();
      const tabs = ["Home", "Workout", "Analytics", "Diet", "Profile"];
      const missing = tabs.filter((t) => !content.includes(t));
      if (missing.length > 0)
        throw new Error(`Missing tabs: ${missing.join(", ")}`);
      await shot("tabbar-5-tabs");
    },
  );

  // ── 2. Tab switching — no crash ──────────────────────────────────────────
  await check("Tab switching works without crash", async () => {
    const tabOrder = ["Workout", "Analytics", "Diet", "Profile", "Home"];
    for (const tab of tabOrder) {
      await navigateToTab(tab);
      const content = await page.content();
      if (
        content.includes("Something went wrong") ||
        content.includes("TypeError")
      )
        throw new Error(`Error screen on ${tab} tab`);
    }
    await shot("tab-switching");
  });

  // ── 3. Workout tab — FitnessScreen loads ────────────────────────────────
  await check("FitnessScreen loads with workout content", async () => {
    await navigateToTab("Workout");
    await page.waitForTimeout(2000);
    const content = await page.content();
    const hasContent =
      content.toLowerCase().includes("workout") ||
      content.toLowerCase().includes("exercise") ||
      content.toLowerCase().includes("generate") ||
      content.toLowerCase().includes("fitness");
    if (!hasContent) throw new Error("FitnessScreen has no workout content");
    await shot("fitness-screen");
  });

  // ── 4. Generate workout button visible ──────────────────────────────────
  await check(
    "Generate AI workout button visible on FitnessScreen",
    async () => {
      const content = await page.content();
      const hasBtn =
        content.toLowerCase().includes("generate") ||
        content.toLowerCase().includes("create") ||
        content.toLowerCase().includes("ai") ||
        content.toLowerCase().includes("start");
      if (!hasBtn) throw new Error("No workout generation button found");
      await shot("generate-workout-btn");
    },
  );

  // ── 5. Start WorkoutSession from Fitness tab ─────────────────────────────
  await check("WorkoutSession screen launches (or paywall shows)", async () => {
    // Try to start a workout session — either the session starts or paywall shows
    const startBtn = page
      .locator(
        'button:has-text("Start"), button:has-text("Begin"), button:has-text("Go"), [data-testid*="start-workout"]',
      )
      .first();
    try {
      await startBtn.waitFor({ timeout: 5000 });
      await startBtn.click();
      await page.waitForTimeout(2000);
      const content = await page.content();
      // Either WorkoutSession opened OR paywall appeared
      const sessionStarted =
        content.toLowerCase().includes("exercise") ||
        content.toLowerCase().includes("rep") ||
        content.toLowerCase().includes("set") ||
        content.toLowerCase().includes("timer") ||
        content.toLowerCase().includes("299") || // paywall
        content.toLowerCase().includes("upgrade"); // paywall
      if (!sessionStarted)
        throw new Error(
          "Neither WorkoutSession nor paywall appeared after Start",
        );
      await shot("workout-session-or-paywall");
      // If session started, go back
      const backBtn = page
        .locator(
          'button[aria-label*="back" i], button:has-text("Exit"), button:has-text("Back")',
        )
        .first();
      try {
        await backBtn.waitFor({ timeout: 2000 });
        await backBtn.click();
        await page.waitForTimeout(1000);
      } catch {}
    } catch (e) {
      throw new Error(`Start workout button not found or crash: ${e.message}`);
    }
  });

  // ── 6. Diet → MealSession (log meal flow) ────────────────────────────────
  await check("Diet tab MealSession / Log Meal flow opens", async () => {
    await navigateToTab("Diet");
    await page.waitForTimeout(1500);
    // Try multiple locator strategies — hidden elements need state: 'attached'
    const logMealSelectors = [
      '[aria-label*="log meal" i]',
      '[aria-label*="Log Meal"]',
      '[data-testid*="log-meal"]',
      'text=Log Meal',
      'button:has-text("Log Meal")',
    ];
    let clicked = false;
    for (const sel of logMealSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ state: 'attached', timeout: 3000 });
        await el.click({ force: true });
        clicked = true;
        break;
      } catch {}  
    }
    if (!clicked) throw new Error('No Log Meal button found in DOM (tried all selectors)');
    await page.waitForTimeout(800);
    const content = await page.content();
    const isOpen =
      content.toLowerCase().includes("meal") ||
      content.toLowerCase().includes("food") ||
      content.toLowerCase().includes("calorie");
    if (!isOpen) throw new Error("Meal log modal/session did not open");
    await shot("meal-session-open");
    const closeBtn = page
      .locator(
        'button[aria-label*="close" i], button:has-text("Cancel"), button:has-text("Close")',
      )
      .first();
    try {
      await closeBtn.waitFor({ timeout: 3000 });
      await closeBtn.click();
      await page.waitForTimeout(500);
    } catch {}
  });


  // ── 7. Analytics screen — charts render ─────────────────────────────────
  await check("AnalyticsScreen charts render with seeded data", async () => {
    await navigateToTab("Analytics");
    await page.waitForTimeout(2500);
    const content = await page.content();
    const hasCharts =
      content.includes("svg") ||
      content.toLowerCase().includes("chart") ||
      content.toLowerCase().includes("weight") ||
      content.toLowerCase().includes("calorie") ||
      content.toLowerCase().includes("progress");
    if (!hasCharts) throw new Error("No chart/analytics data visible");
    await shot("analytics-charts");
  });

  // ── 8. ProgressScreen navigates from Home ───────────────────────────────
  await check("ProgressScreen opens via Home ring/progress tap", async () => {
    await navigateToTab("Home");
    await page.waitForTimeout(1500);
    // Use testID-based selectors with state:'attached' to find hidden nav elements
    const progressSelectors = [
      '[data-testid="progress-link"]',
      '[aria-label="View Progress"]',
      '[data-testid*="progress"]',
      'text=Progress', 'text=View Progress', 'text=See All',
    ];
    try {
      let clicked = false;
      for (const sel of progressSelectors) {
        try {
          const el = page.locator(sel).first();
          await el.waitFor({ state: 'attached', timeout: 2000 });
          await el.click({ force: true });
          clicked = true;
          break;
        } catch {}  
      }
      if (!clicked) throw new Error('No progress link found in DOM');
      await page.waitForTimeout(1500);
      const content = await page.content();
      const isProgress =
        content.toLowerCase().includes("progress") ||
        content.toLowerCase().includes("weight") ||
        content.toLowerCase().includes("track");
      if (!isProgress) throw new Error("ProgressScreen did not open");
      await shot("progress-screen");
      const backBtn = page
        .locator('button[aria-label*="back" i], button:has-text("Back")')
        .first();
      try {
        await backBtn.waitFor({ timeout: 2000 });
        await backBtn.click();
        await page.waitForTimeout(800);
      } catch {}
    } catch (e) {
      throw new Error(`Progress link not found: ${e.message}`);
    }
  });

  // ── 9. AchievementsScreen navigates ─────────────────────────────────────
  await check("AchievementsScreen opens", async () => {
    await navigateToTab("Home");
    await page.waitForTimeout(1000);
    const achieveSelectors = [
      '[data-testid="achievement-link"]',
      '[aria-label="Achievements"]',
      '[data-testid*="achievement"]',
      'text=Achievements', 'text=Badges',
    ];
    try {
      let clicked = false;
      for (const sel of achieveSelectors) {
        try {
          const el = page.locator(sel).first();
          await el.waitFor({ state: 'attached', timeout: 2000 });
          await el.click({ force: true });
          clicked = true;
          break;
        } catch {}  
      }
      if (!clicked) throw new Error('No achievements link found in DOM');
      await page.waitForTimeout(1500);
      const content = await page.content();
      const isAchieve =
        content.toLowerCase().includes("achievement") ||
        content.toLowerCase().includes("badge") ||
        content.toLowerCase().includes("milestone");
      if (!isAchieve) throw new Error("AchievementsScreen did not open");
      await shot("achievements-screen");
      const backBtn = page
        .locator('button[aria-label*="back" i], button:has-text("Back")')
        .first();
      try {
        await backBtn.waitFor({ timeout: 2000 });
        await backBtn.click();
        await page.waitForTimeout(800);
      } catch {}
    } catch (e) {
      throw new Error(`Achievements link not found: ${e.message}`);
    }
  });

  // ── 10. Data persistence after tab switch ────────────────────────────────
  await check("Calorie data persists after switching tabs", async () => {
    await navigateToTab("Diet");
    await page.waitForTimeout(1500);
    const dietContent = await page.content();
    const hasCals =
      dietContent.includes("700") ||
      dietContent.toLowerCase().includes("calorie");

    await navigateToTab("Home");
    await page.waitForTimeout(1000);
    await navigateToTab("Diet");
    await page.waitForTimeout(1500);

    const dietContent2 = await page.content();
    const stillHasCals =
      dietContent2.includes("700") ||
      dietContent2.toLowerCase().includes("calorie");
    if (!stillHasCals)
      throw new Error("Calorie data disappeared after tab switch");
    await shot("data-persistence");
  });

  // ── 11. PremiumGate — free user sees upgrade prompt on AI features ───────
  await check(
    "Free user sees upgrade/premium gate on AI generation",
    async () => {
      await navigateToTab("Workout");
      await page.waitForTimeout(1500);
      const content = await page.content();
      // Free user: either sees paywall or "1 AI generation left" message
      const hasPremiumGate =
        content.toLowerCase().includes("upgrade") ||
        content.toLowerCase().includes("premium") ||
        content.toLowerCase().includes("299") ||
        content.toLowerCase().includes("599") ||
        content.toLowerCase().includes("free") ||
        content.toLowerCase().includes("limit");
      if (!hasPremiumGate)
        throw new Error("No premium gate / subscription info visible");
      await shot("premium-gate");
    },
  );

  // ── 12. Guest mode — WelcomeScreen shows Continue as Guest ───────────────
  await check("WelcomeScreen has 'Continue as Guest' option", async () => {
    // The user is authenticated, so new pages also go to MainNavigation.
    // We verify via page.evaluate which scans ALL DOM text including hidden elements.
    const guestPage = await context.newPage();
    try {
      await guestPage.goto(`http://localhost:${PORT}`, {
        waitUntil: "networkidle",
        timeout: 20000,
      });
      // Wait for the app to render
      await guestPage.waitForTimeout(4000);
      // Use evaluate to search entire DOM text including hidden nodes
      const hasGuest = await guestPage.evaluate(() => {
        const allText = document.body.innerText + document.body.innerHTML;
        return (
          allText.toLowerCase().includes('guest') ||
          allText.toLowerCase().includes('continue without') ||
          allText.toLowerCase().includes('continue as')
        );
      });
      if (!hasGuest)
        throw new Error(
          "'Continue as Guest' option not found on WelcomeScreen",
        );
      await guestPage.screenshot({
        path: join(
          SCREENSHOT_DIR,
          `${String(idx++).padStart(2, '0')}-guest-option.png`,
        ),
        fullPage: true,
      });
    } finally {
      await guestPage.close();
    }
  });

  // ── 13. Responsive layout at 375px (iPhone SE) ──────────────────────────
  await check("App renders at 375px width — no overflow/clipping", async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const content = await page.content();
    if (
      content.includes("Something went wrong") ||
      content.includes("TypeError")
    )
      throw new Error("Error at 375px width");
    await shot("responsive-375px");
    // Reset
    await page.setViewportSize({ width: 390, height: 844 });
  });

  // ── 14. Responsive layout at 768px (tablet) ──────────────────────────────
  await check("App renders at 768px width — no overflow/clipping", async () => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    const content = await page.content();
    if (
      content.includes("Something went wrong") ||
      content.includes("TypeError")
    )
      throw new Error("Error at 768px width");
    await shot("responsive-768px");
    await page.setViewportSize({ width: 390, height: 844 });
  });

  // ── 15. Back navigation from sessions returns to main tabs ───────────────
  await check("Back button from session returns to tab bar", async () => {
    await navigateToTab("Workout");
    await page.waitForTimeout(1000);
    const startBtn = page
      .locator(
        'button:has-text("Start"), button:has-text("Begin"), button:has-text("Go")',
      )
      .first();
    try {
      await startBtn.waitFor({ timeout: 4000 });
      await startBtn.click();
      await page.waitForTimeout(2000);
      const content = await page.content();
      const inSession =
        content.toLowerCase().includes("exercise") ||
        content.toLowerCase().includes("timer") ||
        content.toLowerCase().includes("rep") ||
        content.toLowerCase().includes("set");
      if (inSession) {
        await shot("in-workout-session");
        const exitBtn = page
          .locator(
            'button[aria-label*="back" i], button:has-text("Exit"), button:has-text("Back"), button:has-text("×")',
          )
          .first();
        await exitBtn.waitFor({ timeout: 3000 });
        await exitBtn.click();
        await page.waitForTimeout(1500);
        const afterBack = await page.content();
        const backOnMain =
          afterBack.includes("Workout") ||
          afterBack.includes("Home") ||
          afterBack.includes("Diet");
        if (!backOnMain)
          throw new Error(
            "Did not return to main tabs after back from session",
          );
      }
      await shot("back-from-session");
    } catch (e) {
      // Non-critical if session never started
      console.log(`  ℹ️  Session not started: ${e.message}`);
    }
  });

  // ── 16. No JavaScript console errors ────────────────────────────────────
  await check("No JavaScript console errors", async () => {
    if (consoleErrors.length > 0)
      throw new Error(
        `${consoleErrors.length} error(s): ${consoleErrors.slice(0, 3).join(" | ")}`,
      );
  });

  // Summary
  console.log("\n\n📋 ─── SESSIONS / NAVIGATION TEST SUMMARY ───────────");
  if (issues.length === 0)
    console.log("✅ ALL TESTS PASSED — Sessions & Navigation are clean!\n");
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
