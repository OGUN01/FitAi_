import { chromium } from "@playwright/test";
import os from "os";
import { join } from "path";

const PORT = 8085;
const PROFILE_DIR = join(os.tmpdir(), "fitai-debug-locator");

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto(`http://localhost:${PORT}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);

  // Login
  const signInBtn = page.locator("text=Sign In").first();
  const isLoginScreen = await signInBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (isLoginScreen) {
    await signInBtn.click();
    await page.waitForTimeout(300);
    await page.fill('input[type="email"], input[placeholder*="email" i]', "test.analytics@fitai.dev");
    await page.fill('input[type="password"], input[placeholder*="password" i]', "TestFitAI@2024!");
    await page.locator('button:has-text("Sign In"), button:has-text("Login")').first().click();
    await page.waitForTimeout(4000);
  }

  // Test EXACT locator from the test script
  const selector = '[aria-label*="analytics" i], [aria-label*="progress" i], text=Analytics, text=Progress';
  console.log("Testing selector:", selector);
  
  const loc = page.locator(selector).first();
  
  try {
    await loc.waitFor({ timeout: 5000 });
    console.log("waitFor SUCCEEDED");
    const tagName = await loc.evaluate(el => el.tagName);
    console.log("Element tag:", tagName);
    await loc.click();
    console.log("Click SUCCEEDED");
    await page.waitForTimeout(2000);
    const hasWeek = await page.locator('text=Week').first().isVisible({ timeout: 3000 }).catch(() => false);
    console.log("Week visible after click:", hasWeek);
  } catch(e) {
    console.error("FAILED:", e.message.substring(0, 200));
  }

  await context.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
