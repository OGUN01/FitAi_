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

  // Click analytics tab
  await page.locator('[aria-label="Analytics"], [data-testid="tab-analytics"]').first().click();
  await page.waitForTimeout(2000);
  console.log("Navigated to Analytics");

  // Test the period selector locator
  const selectors = [
    'text=Week, [data-period="week"]',
    'text=Week',
    '[data-period="week"]',
    ':text("Week")',
    'button:has-text("Week")',
    '*:has-text("Week")',
  ];

  for (const sel of selectors) {
    try {
      const count = await page.locator(sel).count();
      console.log(`✅ "${sel}" → ${count} elements`);
      if (count > 0) {
        const el = await page.locator(sel).first().evaluate(e => ({
          tag: e.tagName,
          text: e.textContent?.trim(),
          bounds: e.getBoundingClientRect().toJSON(),
          visible: e.getBoundingClientRect().width > 0,
        }));
        console.log("  First el:", JSON.stringify(el));
      }
    } catch(e) {
      console.log(`❌ "${sel}" → ERROR: ${e.message.substring(0, 150)}`);
    }
  }

  await context.close();
}

main().catch(e => { console.error("Fatal:", e.message); });
