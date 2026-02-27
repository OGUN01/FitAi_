import { chromium } from "@playwright/test";
import { join } from "path";
import os from "os";

const PORT = 8085;
// Use the SAME profile as the test
const PROFILE_DIR = join(os.tmpdir(), "fitai-playwright-analytics");

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
  });

  const page = context.pages()[0] || await context.newPage();
  
  console.log("Navigating to app...");
  await page.goto(`http://localhost:${PORT}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  
  // Get all elements with aria-label
  const analyticsEls = await page.evaluate(() => {
    const els = document.querySelectorAll('[aria-label]');
    return Array.from(els)
      .filter(el => el.getAttribute('aria-label')?.toLowerCase().includes('analytics'))
      .map(el => ({
        tag: el.tagName,
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        dataTestId: el.getAttribute('data-testid'),
        pointerEvents: window.getComputedStyle(el).pointerEvents,
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        outerHTML: el.outerHTML.substring(0, 300),
      }));
  });
  
  console.log("Analytics elements found:", analyticsEls.length);
  analyticsEls.forEach(el => console.log(JSON.stringify(el, null, 2)));
  
  // Also check all tab-like elements
  const tabEls = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-testid^="tab-"], [role="tab"], [aria-label]');
    return Array.from(els).slice(0, 20).map(el => ({
      tag: el.tagName,
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
      testId: el.getAttribute('data-testid'),
      text: el.textContent?.trim().substring(0, 30),
    }));
  });
  console.log("\nTab elements:");
  tabEls.forEach(el => console.log(JSON.stringify(el)));
  
  // Try click and report result
  const analyticsBtn = page.locator('[aria-label="Analytics"]').first();
  const isVisible = await analyticsBtn.isVisible({ timeout: 2000 }).catch(() => false);
  console.log("\nAnalytics button visible?", isVisible);
  
  if (isVisible) {
    const box = await analyticsBtn.boundingBox();
    console.log("Bounding box:", JSON.stringify(box));
    
    // Click using page.click at coordinates
    if (box) {
      await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
      await page.waitForTimeout(2000);
      
      const weekBtn = page.locator('text=Week').first();
      const weekVisible = await weekBtn.isVisible({ timeout: 3000 }).catch(() => false);
      console.log("Week visible after coordinate click?", weekVisible);
    }
  }
  
  await context.close();
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
