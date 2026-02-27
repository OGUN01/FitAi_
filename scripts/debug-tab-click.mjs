import { chromium } from "@playwright/test";
import os from "os";
import { join } from "path";

const PORT = 8085;
const EMAIL = "test.analytics@fitai.dev";
const PASSWORD = "TestFitAI@2024!";
const PROFILE_DIR = join(os.tmpdir(), "fitai-debug-tab-click");

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
  });

  const page = context.pages()[0] || await context.newPage();

  await page.goto(`http://localhost:${PORT}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);

  // Login if needed
  const signInBtn = page.locator("text=Sign In").first();
  const isLoginScreen = await signInBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (isLoginScreen) {
    await signInBtn.click();
    await page.waitForTimeout(300);
    await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
    await page.fill('input[type="password"], input[placeholder*="password" i]', PASSWORD);
    await page.locator('button:has-text("Sign In"), button:has-text("Login")').first().click();
    await page.waitForTimeout(4000);
    console.log("Logged in");
  } else {
    console.log("Already logged in");
  }

  // Dump all buttons with "analytics" in aria-label or text
  const analyticsElements = await page.evaluate(() => {
    const allButtons = Array.from(document.querySelectorAll('button, [role="button"], [aria-label]'));
    return allButtons
      .filter(el => {
        const label = el.getAttribute('aria-label') || '';
        const text = el.textContent || '';
        return label.toLowerCase().includes('analytics') || text.toLowerCase().includes('analytics');
      })
      .map(el => ({
        tag: el.tagName,
        ariaLabel: el.getAttribute('aria-label'),
        testId: el.getAttribute('data-testid'),
        text: el.textContent?.trim().substring(0, 50),
        role: el.getAttribute('role'),
        pointerEvents: getComputedStyle(el).pointerEvents,
        bounds: el.getBoundingClientRect().toJSON(),
        zIndex: getComputedStyle(el).zIndex,
        overflow: getComputedStyle(el).overflow,
      }));
  });

  console.log("\n=== Analytics Tab Elements ===");
  console.log(JSON.stringify(analyticsElements, null, 2));

  // Try the exact locator the test uses
  const testLocator = page.locator('[aria-label*="analytics" i], [aria-label*="progress" i], text=Analytics, text=Progress').first();
  const count = await page.locator('[aria-label*="analytics" i], [aria-label*="progress" i], text=Analytics, text=Progress').count();
  console.log(`\n=== Test locator matches: ${count} elements ===`);

  const firstEl = await testLocator.evaluate(el => ({
    tag: el.tagName,
    ariaLabel: el.getAttribute('aria-label'),
    text: el.textContent?.trim().substring(0, 50),
    role: el.getAttribute('role'),
    pointerEvents: getComputedStyle(el).pointerEvents,
    bounds: el.getBoundingClientRect().toJSON(),
  })).catch(e => `ERROR: ${e.message}`);
  console.log("First matched element:", JSON.stringify(firstEl, null, 2));

  // Try clicking it
  console.log("\nAttempting click...");
  try {
    await testLocator.waitFor({ timeout: 3000 });
    await testLocator.click();
    console.log("Click succeeded!");
    await page.waitForTimeout(2000);

    // Check if we navigated
    const hasWeek = await page.locator('text=Week').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasAnalytics = await page.locator('[data-testid="tab-analytics"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`After click - Week visible: ${hasWeek}`);
    console.log(`Analytics tab testid visible: ${hasAnalytics}`);

    // Current active tab indicator
    const activeTab = await page.evaluate(() => {
      const allText = Array.from(document.querySelectorAll('*')).filter(e => e.textContent?.trim() === 'Week').map(e => ({
        tag: e.tagName,
        visible: e.getBoundingClientRect().width > 0,
        bounds: e.getBoundingClientRect().toJSON(),
      }));
      return allText;
    });
    console.log("'Week' text elements:", JSON.stringify(activeTab, null, 2));
  } catch (e) {
    console.error("Click failed:", e.message);
  }

  await page.screenshot({ path: '/d/FitAi/FitAI/test-screenshots/analytics/debug-tab-click.png', fullPage: true });
  console.log("\nScreenshot saved");
  await context.close();
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
