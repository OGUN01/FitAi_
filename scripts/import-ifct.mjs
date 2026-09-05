#!/usr/bin/env node
/**
 * import-ifct.mjs
 * =====================================================================
 * Imports IFCT 2017 (Indian Food Composition Tables, ICMR-NIN) data into
 * the Supabase `ifct_foods` table using the `ifct2017` npm package.
 *
 * Prereqs:
 *   npm install ifct2017   (devDependency — only used by this script)
 *   Set env: SUPABASE_URL  SUPABASE_SERVICE_ROLE_KEY  (read from .env.local)
 *
 * Usage:
 *   node scripts/import-ifct.mjs
 *
 * NOTE on the real ifct2017 API (this rewrite fixes an earlier version of
 * this script that was written against an imagined API — `.foods()` doesn't
 * exist, and nutrient values aren't keyed by human names like "Protein" —
 * verified against the actual installed package before writing this):
 *
 *   await ifct2017.compositions.load()   // must load the corpus first
 *   ifct2017.compositions('')            // '' as query returns ALL 542 rows
 *
 * Each row is keyed by cryptic INFOODS-style tagnames, not readable names.
 * The ones this script maps (confirmed via `ifct2017.representations(code)`,
 * which reports the {factor, unit} needed to convert the raw stored value):
 *
 *   enerc     Energy            — raw unit is kJ (factor 1)  → divide by 4.184 for kcal
 *   protcnt   Protein           — g, factor 1 (no conversion)
 *   fatce     Total Fat         — g, factor 1
 *   choavldf  Carbohydrate      — g, factor 1
 *   fibtg     Dietary Fiber     — g, factor 1
 *   fsugar    Free Sugars       — g, factor 1
 *   na        Sodium            — raw × 1000 → mg
 *   ca        Calcium           — raw × 1000 → mg
 *   fe        Iron              — raw × 1000 → mg
 *   vitc      Ascorbic acid (C) — raw × 1000 → mg
 *   cartbeq   β-Carotene eq.    — raw × 1,000,000 → mcg
 *   water     Moisture          — g, factor 1
 *
 * Sanity-checked against real values: rice (A015) enerc=1491 kJ → 356 kcal
 * (real ~345-360 kcal/100g); pineapple (E053) enerc=180 kJ → 43 kcal (real
 * ~50 kcal/100g). Confirms the kJ→kcal conversion, not a passthrough.
 * =====================================================================
 */

import { createClient } from '@supabase/supabase-js';
// ifct2017 is a CommonJS package
import { createRequire } from 'module';
const require2 = createRequire(import.meta.url);
const ifct = require2('ifct2017');

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.local)');
  process.exit(1);
}
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });

const KJ_PER_KCAL = 4.184;

function toNum(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function ne(v) {
  return v === '' || v === undefined || v === null ? null : v;
}
function scaled(v, factor) {
  const n = toNum(v);
  return n === null ? null : n * factor;
}

/**
 * Round to a sane number of decimal places for the target NUMERIC column
 * (matches the migration's precision: macros NUMERIC(6,3), mg fields
 * NUMERIC(8,2)/(6,3), energy NUMERIC(8,2)).
 */
function round(n, places) {
  if (n === null) return null;
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function buildRows() {
  const allFoods = ifct.compositions('');
  if (!allFoods || !allFoods.length) {
    console.error('ifct2017: compositions("") returned empty. Check package installation.');
    process.exit(1);
  }
  console.log('[ifct] Total IFCT foods:', allFoods.length);

  return allFoods.map((f) => ({
    food_code: ne(f.code),
    name: ne(f.name) ?? ne(f.scie) ?? f.code,
    scientific_name: ne(f.scie),
    local_names: ne(f.lang),
    food_group: ne(f.grup),
    subgroup: null, // not exposed by ifct2017's compositions() rows
    region: f.regn != null ? String(f.regn) : null,
    preparation_method: null, // not exposed by ifct2017's compositions() rows
    energy_kcal_100g: round(scaled(f.enerc, 1) !== null ? f.enerc / KJ_PER_KCAL : null, 2),
    protein_100g: round(scaled(f.protcnt, 1), 3),
    fat_100g: round(scaled(f.fatce, 1), 3),
    carbohydrate_100g: round(scaled(f.choavldf, 1), 3),
    fiber_100g: round(scaled(f.fibtg, 1), 3),
    sugar_100g: round(scaled(f.fsugar, 1), 3),
    sodium_mg_100g: round(scaled(f.na, 1000), 2),
    calcium_mg_100g: round(scaled(f.ca, 1000), 2),
    iron_mg_100g: round(scaled(f.fe, 1000), 3),
    vitamin_c_mg_100g: round(scaled(f.vitc, 1000), 3),
    beta_carotene_mcg_100g: round(scaled(f.cartbeq, 1000000), 2),
    moisture_100g: round(scaled(f.water, 1), 3),
    edible_portion: null, // not exposed by ifct2017's compositions() rows
  }));
}

async function runImport() {
  await ifct.compositions.load();
  const rows = buildRows();
  console.log('[ifct] Built', rows.length, 'rows. Upserting to Supabase...');

  const BATCH = 100;
  let total = 0;
  let errors = 0;
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await sb
      .from('ifct_foods')
      .upsert(slice, { onConflict: 'food_code', ignoreDuplicates: false });
    if (error) {
      errors++;
      console.error('Batch error at row', i, ':', error.message);
    } else {
      total += slice.length;
      console.log('[ifct] Upserted:', total + '/' + rows.length);
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n[ifct] Done: ${total} rows, ${errors} errors, ${elapsed}s`);
  if (errors > 0) process.exitCode = 1;
}

await runImport();
