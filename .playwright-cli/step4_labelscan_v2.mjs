import { chromium } from 'playwright';
import fs from 'fs';

const SHOTS = 'D:/FitAi/FitAI/.playwright-cli';
const url = 'http://localhost:8081';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
await ctx.addInitScript(([k, v]) => {
  try { window.localStorage.setItem(k, v); } catch (e) {}
}, [SUPA_KEY, sessionValue]);

const page = await ctx.newPage();
const consoleLogs = [];
page.on('console', m => consoleLogs.push(`[${m.type()}] ${m.text()}`));
const log = (s) => { console.log('[step]', s); };

async function firstVisible(selectors) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if (await loc.count() && await loc.isVisible().catch(() => false)) return loc;
  }
  return null;
}
const bodyText = () => page.evaluate(() => document.body.innerText.slice(0, 3000));

try {
  log('navigating (with session)');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(9000);

  // Go to Diet tab
  const dietTab = await firstVisible(['text=Diet']);
  if (dietTab) { await dietTab.click({ timeout: 5000 }).catch(()=>{}); await sleep(3000); }
  await page.screenshot({ path: `${SHOTS}/step4_v2_01_diet.png`, fullPage: true });
  log('on diet tab');

  // --- TEST A: Direct "Scan Label" quick action (no barcode lookup needed) ---
  // The Diet screen has a "Scan Label" quick action button directly.
  const directScanLabel = await firstVisible(['text=Scan Label']);
  log(`direct Scan Label quick action present: ${!!directScanLabel}`);
  if (directScanLabel) {
    await directScanLabel.click({ timeout: 5000 });
    log('clicked direct Scan Label quick action');
    await sleep(3000);
    await page.screenshot({ path: `${SHOTS}/step4_v2_02_direct_scan_label.png`, fullPage: true });
    const bt = (await bodyText()).replace(/\s+/g, ' ');
    log('after direct scan label: ' + bt.slice(0, 600));

    // Look for prep modal "Scan Nutrition Label"
    const prepModal = await firstVisible(['text=Scan Nutrition Label']);
    log(`prep modal (Scan Nutrition Label) visible: ${!!prepModal}`);

    if (prepModal) {
      // Tap inner Scan Label button to launch camera
      const innerScan = await firstVisible(['text=Scan Label']);
      if (innerScan) {
        await innerScan.click({ timeout: 5000 }).catch(()=>{});
        log('clicked inner Scan Label in prep modal');
        await sleep(5000);
        await page.screenshot({ path: `${SHOTS}/step4_v2_03_camera_attempt.png`, fullPage: true });
        const camText = (await bodyText()).replace(/\s+/g, ' ');
        log('camera attempt text: ' + camText.slice(0, 700));

        // Check for file inputs (web upload fallback)
        const fileInputs = await page.locator('input[type="file"]').count();
        log(`file inputs present: ${fileInputs}`);

        // Check for camera permission UI
        const permUI = await firstVisible(['text=No access to camera', 'text=Requesting camera permission']);
        log(`camera permission UI visible: ${!!permUI}`);

        // Check for ContributionPromptModal
        const contribModal = await firstVisible(['text=Help All FitAI Users']);
        log(`ContributionPromptModal visible: ${!!contribModal}`);
      }
    } else {
      // Maybe went straight to camera
      const fileInputs = await page.locator('input[type="file"]').count();
      log(`(no prep modal) file inputs: ${fileInputs}`);
    }
  }

  // --- TEST B: Barcode 9999999999999 lookup (guaranteed not found) ---
  log('--- TEST B: barcode 9999999999999 ---');
  // Close any open modal first
  const closeBtn = await firstVisible(['text=Cancel', 'text=Close', '[aria-label="Close camera"]']);
  if (closeBtn) { await closeBtn.click({ timeout: 2000 }).catch(()=>{}); await sleep(1500); }

  // Go back to Diet tab
  const dietTab2 = await firstVisible(['text=Diet']);
  if (dietTab2) { await dietTab2.click({ timeout: 5000 }).catch(()=>{}); await sleep(2000); }

  // Open Barcode quick action
  const barcodeAction = await firstVisible(['[aria-label="Barcode"]', 'text=Barcode']);
  if (barcodeAction) {
    await barcodeAction.click({ timeout: 5000 }).catch(()=>{});
    await sleep(2000);
  }
  const manual = await firstVisible(['text=Manual Barcode Entry', 'text=Enter Barcode']);
  if (manual) { await manual.click({ timeout: 5000 }).catch(()=>{}); await sleep(2000); }

  const barcodeInput = await firstVisible(['[aria-label="Barcode input"]']);
  if (barcodeInput) {
    await barcodeInput.fill('9999999999999');
    log('filled barcode 9999999999999');
    await sleep(500);
    const lookUp = await firstVisible(['[aria-label="Look up product"]', 'text=Look Up']);
    if (lookUp) {
      await lookUp.click({ timeout: 5000 });
      log('clicked Look Up');
      await sleep(12000);
      await page.screenshot({ path: `${SHOTS}/step4_v2_04_after_lookup_9999.png`, fullPage: true });
      const bt = (await bodyText()).replace(/\s+/g, ' ');
      log('after lookup 9999: ' + bt.slice(0, 700));

      const scanLabel = await firstVisible(['text=Scan Label']);
      const contribute = await firstVisible(['text=Contribute Product']);
      log(`Scan Label visible: ${!!scanLabel}, Contribute visible: ${!!contribute}`);

      if (scanLabel) {
        await scanLabel.click({ timeout: 5000 });
        log('clicked Scan Label (fallback)');
        await sleep(3000);
        await page.screenshot({ path: `${SHOTS}/step4_v2_05_after_scan_label_9999.png`, fullPage: true });
        const afterText = (await bodyText()).replace(/\s+/g, ' ');
        log('after scan label (9999): ' + afterText.slice(0, 700));

        const prepModal = await firstVisible(['text=Scan Nutrition Label']);
        log(`prep modal visible: ${!!prepModal}`);
        if (prepModal) {
          const innerScan = await firstVisible(['text=Scan Label']);
          if (innerScan) {
            await innerScan.click({ timeout: 5000 }).catch(()=>{});
            log('clicked inner Scan Label');
            await sleep(5000);
            await page.screenshot({ path: `${SHOTS}/step4_v2_06_camera_9999.png`, fullPage: true });
            const camText = (await bodyText()).replace(/\s+/g, ' ');
            log('camera text: ' + camText.slice(0, 700));
            const fileInputs = await page.locator('input[type="file"]').count();
            log(`file inputs: ${fileInputs}`);
            const permUI = await firstVisible(['text=No access to camera', 'text=Requesting camera permission']);
            log(`permission UI: ${!!permUI}`);
            const contrib = await firstVisible(['text=Help All FitAI Users']);
            log(`contribution modal: ${!!contrib}`);
          }
        }
      }
    }
  }

  await page.screenshot({ path: `${SHOTS}/step4_v2_99_final.png`, fullPage: true });
  log('done');
} catch (err) {
  log('ERROR: ' + err.message + '\n' + err.stack);
  await page.screenshot({ path: `${SHOTS}/step4_v2_error.png`, fullPage: true }).catch(()=>{});
} finally {
  fs.writeFileSync(`${SHOTS}/step4_v2_console.log`, consoleLogs.join('\n'));
  await browser.close();
}
