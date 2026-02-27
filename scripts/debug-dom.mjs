import { chromium } from "@playwright/test";
import { join } from "path";
import os from "os";

const PORT = 8085;
const PROFILE_DIR = join(os.tmpdir(), "fitai-playwright-analytics");

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ["--no-sandbox"],
    viewport: { width: 390, height: 844 },
  });

  const page = context.pages()[0] || await context.newPage();
  
  await page.goto(`http://localhost:${PORT}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  
  // Dump all elements with aria-label
  const info = await page.evaluate(() => {
    const result = {
      analyticsElements: [],
      allAriaLabels: [],
      tabBar: null,
    };
    
    // Find all elements with aria-label
    document.querySelectorAll('[aria-label]').forEach(el => {
      result.allAriaLabels.push({
        tag: el.tagName,
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        text: el.textContent?.trim().substring(0, 30),
        pointerEvents: window.getComputedStyle(el).pointerEvents,
      });
    });
    
    // Specifically check analytics
    document.querySelectorAll('[aria-label="Analytics"]').forEach(el => {
      result.analyticsElements.push({
        tag: el.tagName,
        outerHTML: el.outerHTML.substring(0, 300),
        pointerEvents: window.getComputedStyle(el).pointerEvents,
        bounds: el.getBoundingClientRect(),
      });
    });
    
    return result;
  });
  
  console.log("All aria-label elements:", JSON.stringify(info.allAriaLabels, null, 2));
  console.log("\nAnalytics elements:", JSON.stringify(info.analyticsElements, null, 2));
  
  // Try to click
  const btn = page.locator('[aria-label="Analytics"]').first();
  const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
  console.log("\nAnalytics button visible:", visible);
  
  if (visible) {
    // Check if it's really the tab button by looking at bounding box
    const box = await btn.boundingBox();
    console.log("Bounding box:", box);
    
    // Click
    await btn.click();
    await page.waitForTimeout(2000);
    
    // Check if we navigated
    const weekVisible = await page.locator('text=Week').first().isVisible({ timeout: 2000 }).catch(() => false);
    console.log("After click - Week visible?", weekVisible);
    
    // Dump current buttons
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[aria-label]')).map(el => ({
        ariaLabel: el.getAttribute('aria-label'),
        tag: el.tagName,
        role: el.getAttribute('role'),
      }));
    });
    console.log("Current aria-labels:", JSON.stringify(buttons, null, 2));
  }
  
  await context.close();
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
