import { chromium } from 'playwright';
import fs from 'fs';

const SHOTS = 'D:/FitAi/FitAI/.playwright-cli';
const url = 'http://localhost:8081';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Load pre-authenticated session
const session = JSON.parse(fs.readFileSync(`${SHOTS}/session.json`, 'utf8'));
const SUPA_KEY = 'sb-mqfrwtmkokivoxgukgsz-auth-token';
const sessionValue = JSON.stringify({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now()/1000) + 3600,
  user: session.user,
});

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });

// Inject session into localStorage before any page script runs
await ctx.addInitScript(([k, v]) => {
  try { window.localStorage.setItem(k, v); } catch (e) {}
}, [SUPA_KEY, sessionValue]);

const page = await ctx.newPage();
const consoleLogs = [];
page.on('console', m => consoleLogs.push(`[${m.type()}] ${m.text()}`));

const log = (s) => { console.log('[step]', s); };

// Helper: find first matching locator from a list of selector strings
async function firstVisible(selectors) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if (await loc.count() && await loc.isVisible().catch(() => false)) {
      return loc;
    }
  }
  return null;
}

const bodyText = () => page.evaluate(() => document.body.innerText.slice(0, 2500));

try {
  log('navigating to app (with injected session)');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(9000);
  await page.screenshot({ path: `${SHOTS}/step4_01_initial.png`, fullPage: true });
  let bt = (await bodyText()).replace(/\s+/g, ' ');
  log('body: ' + bt.slice(0, 500));

  // If onboarding still appears, skip via Continue as Guest / Skip
  if (bt.includes('Continue as Guest') || bt.includes('Get Started')) {
    log('still on landing — session may not have hydrated. Trying guest path as fallback.');
    // Verify session was injected
    const lsKeys = await page.evaluate(() => Object.keys(window.localStorage));
    log('localStorage keys: ' + JSON.stringify(lsKeys));
    const guest = await firstVisible(['text=Continue as Guest']);
    if (guest) { await guest.click({ timeout: 4000 }).catch(()=>{}); await sleep(5000); }
    // Skip onboarding
    for (let i = 0; i < 8; i++) {
      const skip = await firstVisible(['text=Skip', 'text=Get Started', 'text=Next', 'text=Done', 'text=Great']);
      if (skip) { await skip.click({ timeout: 3000 }).catch(()=>{}); await sleep(1500); }
      else break;
    }
    bt = (await bodyText()).replace(/\s+/g, ' ');
    log('after skip: ' + bt.slice(0, 400));
  }

  // Find Diet tab — may be bottom nav
  const dietTab = await firstVisible(['text=Diet', 'text=DIET', '[aria-label="Diet"]']);
  if (dietTab) {
    await dietTab.click({ timeout: 5000 }).catch(() => {});
    log('clicked Diet tab');
    await sleep(3500);
  }
  await page.screenshot({ path: `${SHOTS}/step4_10_diet_tab.png`, fullPage: true });
  bt = (await bodyText()).replace(/\s+/g, ' ');
  log('diet screen: ' + bt.slice(0, 600));

  // Look for Barcode quick action
  const barcodeAction = await firstVisible([
    '[aria-label="Barcode"]', '[aria-label="Scan Barcode"]', 'text=Barcode',
    '[aria-label="barcode"]', 'text=Scan Barcode',
  ]);
  if (barcodeAction) {
    await barcodeAction.click({ timeout: 5000 }).catch(() => {});
    log('clicked barcode quick action');
    await sleep(2500);
    await page.screenshot({ path: `${SHOTS}/step4_11_after_barcode.png`, fullPage: true });
  } else {
    log('no Barcode quick action found');
  }

  // Look for Manual Barcode Entry option
  const manual = await firstVisible([
    'text=Manual Barcode Entry', 'text=Enter Manually',
    'text=Enter Barcode', 'text=Type Barcode',
  ]);
  if (manual) {
    await manual.click({ timeout: 5000 }).catch(() => {});
    log('clicked manual entry');
    await sleep(2000);
    await page.screenshot({ path: `${SHOTS}/step4_12_manual_entry.png`, fullPage: true });
  }

  // Find barcode input
  const barcodeInput = await firstVisible(['[aria-label="Barcode input"]', 'input[type="text"]', 'input']);
  if (!barcodeInput) {
    log('no input found');
    const inputs = await page.locator('input').all();
    log(`total inputs: ${inputs.length}`);
  } else {
    await barcodeInput.fill('5555555555555');
    log('filled barcode 5555555555555');
    await sleep(500);
    await page.screenshot({ path: `${SHOTS}/step4_13_barcode_filled.png`, fullPage: true });

    const lookUp = await firstVisible(['[aria-label="Look up product"]', 'text=Look Up']);
    if (lookUp) {
      await lookUp.click({ timeout: 5000 });
      log('clicked Look Up');
      // Wait for full lookup chain (Supabase + OFF + India OFF)
      await sleep(12000);
      await page.screenshot({ path: `${SHOTS}/step4_14_after_lookup.png`, fullPage: true });
      bt = (await bodyText()).replace(/\s+/g, ' ');
      log('after lookup: ' + bt.slice(0, 700));

      const scanLabel = await firstVisible(['text=Scan Label']);
      const contribute = await firstVisible(['text=Contribute Product']);
      log(`Scan Label visible: ${!!scanLabel}, Contribute visible: ${!!contribute}`);

      if (scanLabel) {
        await scanLabel.click({ timeout: 5000 });
        log('clicked Scan Label (in fallback actions)');
        await sleep(3000);
        await page.screenshot({ path: `${SHOTS}/step4_15_after_scan_label.png`, fullPage: true });
        bt = (await bodyText()).replace(/\s+/g, ' ');
        log('after scan label: ' + bt.slice(0, 700));

        // Check for prep modal "Scan Nutrition Label"
        const prepModal = await firstVisible(['text=Scan Nutrition Label']);
        log(`prep modal visible: ${!!prepModal}`);

        if (prepModal) {
          // Click the inner Scan Label button inside prep modal
          const innerScan = await firstVisible(['text=Scan Label']);
          if (innerScan) {
            await innerScan.click({ timeout: 5000 }).catch(() => {});
            log('clicked inner Scan Label (in prep modal)');
            await sleep(5000);
            await page.screenshot({ path: `${SHOTS}/step4_16_camera_attempt.png`, fullPage: true });
            bt = (await bodyText()).replace(/\s+/g, ' ');
            log('camera attempt: ' + bt.slice(0, 700));

            // Check for file inputs (web upload fallback)
            const fileInputs = await page.locator('input[type="file"]').count();
            log(`file inputs: ${fileInputs}`);
          }
        } else {
          // Maybe went straight to camera
          const fileInputs = await page.locator('input[type="file"]').count();
          log(`(no prep modal) file inputs: ${fileInputs}`);
          // Look for camera permission UI
          const permText = await firstVisible(['text=No access to camera', 'text=Requesting camera permission']);
          log(`permission UI: ${permText ? 'YES' : 'no'}`);
        }
      }
    } else {
      log('Look Up button not found');
    }
  }

  await page.screenshot({ path: `${SHOTS}/step4_99_final.png`, fullPage: true });
  log('done');
} catch (err) {
  log('ERROR: ' + err.message + '\n' + err.stack);
  await page.screenshot({ path: `${SHOTS}/step4_error.png`, fullPage: true }).catch(()=>{});
} finally {
  fs.writeFileSync(`${SHOTS}/step4_console.log`, consoleLogs.join('\n'));
  await browser.close();
}
