// One-off backfill: resolve real food photos for every meal in the stored
// weekly_meal_plans plan_data JSONB, using the SAME hardened logic as the worker
// resolver (filetype:bitmap search + reject PDF/DJVU page-thumbs).
//
// Why: the worker's LLM generation step is currently blocked by exhausted
// Vercel AI credits, so the hardened resolver never runs. The stored plan still
// carries patchy imageUrl values (some missing, some PDF page-thumbs). This
// script fixes them in-place without an LLM call.
//
// Run: node scripts/backfill-meal-images.mjs
// Requires .env.local: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
const envText = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, '')];
    }),
);

const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = '5d0079fb-cd2e-4740-8ee9-1e8c7c36868b';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'FitAI/1.0 (production; contact@fitai.app)';

// Mirror of fitai-workers/src/utils/mealImageResolver.ts isPhotoUrl (hardened).
function isPhotoUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (/\.(svg|pdf|djvu|ogg|mp3|mp4|webm|ogv|oga|tif|tiff|gif)(\/|\?|$)/.test(lower)) return false;
  if (lower.includes('.pdf/') || lower.includes('.djvu/')) return false;
  if (/\.(jpg|jpeg|png|webp)(\?|$)/.test(lower)) return true;
  return false;
}

async function searchWikimediaCommons(dishName) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${dishName}`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|mimetype',
    iiurlwidth: '500',
    format: 'json',
    formatversion: '2',
  });
  const res = await fetch(`${WIKIMEDIA_API}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) {
    console.warn(`  Wikimedia ${res.status} for "${dishName}"`);
    return undefined;
  }
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!Array.isArray(pages) || pages.length === 0) return undefined;
  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    if (!info) continue;
    if (info.thumburl && isPhotoUrl(info.thumburl)) return info.thumburl;
    if (info.url && isPhotoUrl(info.url)) return info.url;
  }
  return undefined;
}

function deriveSearchCandidates(dishName) {
  const base = dishName.trim();
  if (!base) return [];
  const candidates = [base];
  const stripped = base.replace(/\s+(with|and|&|in|on)\s+.*$/i, '').trim();
  if (stripped && stripped !== base) candidates.push(stripped);
  const words = stripped.split(/\s+/);
  if (words.length > 1) {
    const shorter = words.slice(0, -1).join(' ');
    if (shorter && !candidates.includes(shorter)) candidates.push(shorter);
  }
  return candidates;
}

async function resolveDish(name) {
  for (const candidate of deriveSearchCandidates(name)) {
    const url = await searchWikimediaCommons(candidate);
    if (url) return url;
  }
  return undefined;
}

async function main() {
  // 1. Fetch the stored plan row.
  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/weekly_meal_plans?select=id,plan_data&user_id=eq.${USER_ID}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  const rows = await listRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('No plan row found for user.');
    process.exit(1);
  }
  const { id, plan_data } = rows[0];
  const meals = plan_data.meals;
  console.log(`Plan ${id}: ${meals.length} meals.`);

  // 2. Resolve unique dish names.
  const uniqueNames = [...new Set(meals.map((m) => m.name).filter(Boolean))];
  console.log(`Resolving ${uniqueNames.length} unique dish names...`);
  const urlByName = new Map();
  let real = 0;
  let miss = 0;
  for (const name of uniqueNames) {
    const url = await resolveDish(name);
    urlByName.set(name, url);
    if (url) {
      real++;
      console.log(`  ✓ ${name}`);
    } else {
      miss++;
      console.log(`  ✗ ${name} (no photo / rejected)`);
    }
    // Be polite to Wikimedia.
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`\nResolved ${real}/${uniqueNames.length} (${miss} misses).`);

  // 3. Apply resolved URLs (overwrite garbage PDF-thumbs with undefined on miss).
  let updated = 0;
  for (const meal of meals) {
    const url = urlByName.get(meal.name);
    if (url) {
      meal.imageUrl = url;
      updated++;
    } else if (meal.imageUrl) {
      // Existing value was garbage (PDF thumb) and fresh lookup found nothing
      // usable → clear it so the client shows the gradient placeholder
      // instead of a document scan.
      meal.imageUrl = undefined;
    }
  }
  console.log(`Applied real URLs to ${updated} meals; cleared garbage on the rest.`);

  // 4. Persist back.
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/weekly_meal_plans?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ plan_data }),
  });
  if (!patchRes.ok) {
    console.error(`PATCH failed: ${patchRes.status} ${await patchRes.text()}`);
    process.exit(1);
  }
  console.log(`Patched plan_data back to Supabase (${patchRes.status}). Done.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
