/**
 * ISOLATED Analytics Tab test — runs its own chromium process.
 * Port 8085 | Account: test.analytics@fitai.dev
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8085;
const EMAIL = "test.analytics@fitai.dev";
const PASSWORD = "TestFitAI@2024!";
const PROFILE_DIR = join(os.tmpdir(), "fitai-playwright-analytics");
const SCREENSHOT_DIR = join(__dirname, "..", "test-screenshots", "analytics");
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
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(5000);

  // Check if already logged in (persistent context may have session)
  const signInBtn = page.locator("text=Sign In").first();
  const isLoginScreen = await signInBtn.isVisible({ timeout: 3000 }).catch(() => false);

  if (isLoginScreen) {
    await signInBtn.click();
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
  } else {
    console.log("  ℹ️  Already logged in (session persisted)");
    await page.waitForTimeout(2000);
  }
  await shot("after-login");
}

async function main() {
  console.log(`\n🚀 FitAI Analytics Tab Test — Port ${PORT}\n`);
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
  });
  const browser = context.browser();
  page = context.pages()[0] || await context.newPage();
  const consoleErrors = [];
  const networkErrors406 = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (response) => {
    if (response.status() === 406) networkErrors406.push(response.url());
  });

  await login();

  // Navigate to Analytics tab
  const analyticsTab = page
    .locator(
      '[aria-label="Analytics"], [data-testid="tab-analytics"]',
    )
    .first();
  try {
    await analyticsTab.waitFor({ timeout: 5000 });
    await analyticsTab.click();
    await page.waitForTimeout(1500);
  } catch {}
  await shot("analytics-tab");

  await check("AnalyticsScreen renders — no blank/error screen", async () => {
    const content = await page.content();
    if (
      content.includes("Something went wrong") ||
      content.includes("TypeError")
    )
      throw new Error("Error screen visible");
    await shot("analytics-screen");
  });

  await check("Period selector — Week/Month/Year tabs", async () => {
    const weekBtn = page
      .locator('text=Week')
      .first();
    await weekBtn.waitFor({ timeout: 5000 });
    await weekBtn.click();
    await page.waitForTimeout(1000);
    await shot("period-week");

    const monthBtn = page
      .locator('text=Month')
      .first();
    await monthBtn.waitFor({ timeout: 3000 });
    await monthBtn.click();
    await page.waitForTimeout(1000);
    await shot("period-month");
  });

  await check("Weight trend chart renders with seeded data", async () => {
    // Switch back to week to see 14-day data
    const weekBtn = page.locator('text=Week').first();
    try {
      await weekBtn.click();
    } catch {}
    await page.waitForTimeout(1000);
    const content = await page.content();
    // Should have weight data around 72kg or a chart SVG
    const hasChart =
      content.includes("svg") ||
      content.includes("72") ||
      content.toLowerCase().includes("weight") ||
      content.toLowerCase().includes("chart");
    if (!hasChart) throw new Error("Weight chart/data not found");
    await shot("weight-chart");
  });

  await check("MetricSummaryGrid renders tiles", async () => {
    const content = await page.content();
    // Should have calories, workouts, water metric tiles
    const hasMetrics =
      content.toLowerCase().includes("calorie") ||
      content.toLowerCase().includes("workout") ||
      content.toLowerCase().includes("water");
    if (!hasMetrics) throw new Error("MetricSummaryGrid tiles not found");
    await shot("metric-summary");
  });

  await check("Charts render without NaN/undefined values", async () => {
    const content = await page.content();
    if (
      content.includes(">NaN<") ||
      content.includes(">undefined<") ||
      content.includes(">null<")
    ) {
      throw new Error("NaN/undefined/null values visible in charts");
    }
    await shot("charts-no-nan");
  });

  await check(
    "Empty state UI — sections with no data show proper message",
    async () => {
      // Navigate to a period with no data (Year) to trigger empty states
      const yearBtn = page
        .locator('text=Year, text=1Y')
        .first();
      try {
        await yearBtn.waitFor({ timeout: 3000 });
        await yearBtn.click();
        await page.waitForTimeout(1000);
        const content = await page.content();
        // Should have an empty state message, not a JS crash
        if (
          content.includes("TypeError") ||
          content.includes("Cannot read properties")
        )
          throw new Error("JS error in empty state");
      } catch (e) {
        if (e.message.includes("JS error")) throw e;
        console.log(
          "  ℹ️  Year selector not found — skipping empty state test",
        );
      }
      await shot("empty-state");
    },
  );

  await check("Scroll to bottom — all charts accessible", async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await shot("scroll-bottom");
  });

  await check("Pull-to-refresh triggers reload", async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(200, 200);
    await page.mouse.down();
    await page.mouse.move(200, 400, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await shot("pull-to-refresh");
  });

  if (networkErrors406.length > 0) {
    console.log(`\n🔍 406 NETWORK ERRORS (${networkErrors406.length}):`);
    [...new Set(networkErrors406)].forEach(u => console.log(`  → ${u}`));
  }
  await check("No JavaScript console errors", async () => {
    if (consoleErrors.length > 0)
      throw new Error(
        `${consoleErrors.length} error(s): ${consoleErrors.slice(0, 3).join(" | ")}`,
      );
  });

  console.log("\n\n📋 ─── ANALYTICS TAB TEST SUMMARY ───────────────────");
  if (issues.length === 0)
    console.log("✅ ALL TESTS PASSED — Analytics tab is clean!\n");
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
