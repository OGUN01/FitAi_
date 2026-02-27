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
  await page.waitForTimeout(3000);

  // Try individual parts of the locator
  const parts = [
    '[aria-label*="analytics" i]',
    '[aria-label*="progress" i]',
    'text=Analytics',
    'text=Progress',
    '[data-testid="tab-analytics"]',
    '[aria-label="Analytics"]',
  ];

  for (const part of parts) {
    try {
      const count = await page.locator(part).count();
      console.log(`✅ "${part}" → ${count} elements`);
    } catch(e) {
      console.log(`❌ "${part}" → ERROR: ${e.message.substring(0, 100)}`);
    }
  }

  await context.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
