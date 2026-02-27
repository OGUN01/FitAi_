import { chromium } from "@playwright/test";
import { join } from "path";
import os from "os";

const PORT = 8085;
const PROFILE_DIR = join(os.tmpdir(), "fitai-playwright-analytics-debug");

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
  });

  const page = context.pages()[0] || await context.newPage();
  
  console.log("Navigating to app...");
  await page.goto(`http://localhost:${PORT}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  
  // Check if logged in
  const signInBtn = page.locator("text=Sign In").first();
  const isLoginScreen = await signInBtn.isVisible({ timeout: 3000 }).catch(() => false);
  console.log("Login screen?", isLoginScreen);
  
  // Get all buttons
  const buttons = await page.evaluate(() => {
    const btns = document.querySelectorAll('[role="button"], button');
    return Array.from(btns).slice(0, 30).map(b => ({
      text: b.textContent?.trim().substring(0, 50),
      ariaLabel: b.getAttribute('aria-label'),
      role: b.getAttribute('role'),
      tagName: b.tagName,
      dataTestId: b.getAttribute('data-testid'),
    }));
  });
  
  console.log("\nAll buttons/roles:");
  buttons.forEach(b => console.log(JSON.stringify(b)));
  
  // Try clicking analytics
  console.log("\nLooking for analytics button...");
  const analyticsEls = await page.evaluate(() => {
    const els = document.querySelectorAll('[aria-label*="Analytics"], [aria-label*="analytics"]');
    return Array.from(els).map(el => ({
      tag: el.tagName,
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
      dataTestId: el.getAttribute('data-testid'),
      outerHTML: el.outerHTML.substring(0, 200),
    }));
  });
  console.log("Analytics elements:", JSON.stringify(analyticsEls, null, 2));
  
  // Try clicking
  const analyticsBtn = page.locator('[aria-label="Analytics"]').first();
  const isVisible = await analyticsBtn.isVisible({ timeout: 2000 }).catch(() => false);
  console.log("\nAnalytics button visible?", isVisible);
  
  if (isVisible) {
    await analyticsBtn.click();
    await page.waitForTimeout(2000);
    
    const weekBtn = page.locator('text=Week').first();
    const weekVisible = await weekBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log("Week button visible after click?", weekVisible);
    
    const buttonsAfter = await page.evaluate(() => {
      const btns = document.querySelectorAll('[role="button"], button');
      return Array.from(btns).slice(0, 10).map(b => ({
        text: b.textContent?.trim().substring(0, 50),
        ariaLabel: b.getAttribute('aria-label'),
      }));
    });
    console.log("\nButtons after analytics click:");
    buttonsAfter.forEach(b => console.log(JSON.stringify(b)));
  } else {
    console.log("Analytics button not visible - dumping page content:");
    const content = await page.content();
    console.log("Page has 'Analytics':", content.includes('Analytics'));
    console.log("Page has 'Home':", content.includes('Home'));
  }
  
  await context.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
