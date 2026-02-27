// Test if Playwright 1.58.2 handles comma-separated mixed selectors via .or()
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
  await page.goto(`http://localhost:${PORT}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Simulate how Playwright 1.58.2 resolves the mixed locator
  // Check if it actually evaluates lazily and short-circuits on first match
  
  // What happens when we directly do waitFor on the broken locator?
  const broken = page.locator('[aria-label*="analytics" i], [aria-label*="progress" i], text=Analytics, text=Progress').first();
  
  // Does Playwright 1.58.2 have a different behavior?
  console.log("Playwright version: 1.58.2");
  console.log("Testing broken locator with isVisible (not waitFor)...");
  try {
    const visible = await broken.isVisible({ timeout: 3000 });
    console.log("isVisible result:", visible);
  } catch(e) {
    console.log("isVisible FAILED:", e.message.substring(0, 150));
  }

  console.log("\nTesting broken locator with count...");  
  try {
    const count = await broken.count();
    console.log("count result:", count);
  } catch(e) {
    console.log("count FAILED:", e.message.substring(0, 150));
  }

  await context.close();
}

main().catch(e => { console.error("Fatal:", e.message); });
