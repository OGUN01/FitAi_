#!/usr/bin/env node
/**
 * import-ifct.mjs
 * =====================================================================
 * Imports IFCT 2017 (Indian Food Composition Tables) data into
 * the Supabase ifct_foods table using the ifct2017 npm package.
 *
 * Prereqs:
 *   npm install @supabase/supabase-js ifct2017
 *   Set env: SUPABASE_URL  SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/import-ifct.mjs
 *
 * The ifct2017 package provides:
 *   - compositions(food_code)  - returns nutrition per 100g
 *   - foods()                  - returns all food entries
 *   - columns()                - returns column (nutrient) definitions
 * =====================================================================
 */

import { createClient } from '@supabase/supabase-js';
// ifct2017 is a CommonJS package
import { createRequire } from 'module';
const require2 = createRequire(import.meta.url);
const ifct = require2("ifct2017");

const URL_ = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// IFCT column mappings
// Key: IFCT nutrient column name -> our DB column
// ---------------------------------------------------------------------------
const NUTRIENT_MAP = {
  // Energy
  "Energy":                "energy_kcal_100g",
  // Macros
  "Protein":               "protein_100g",
  "Fat":                   "fat_100g",
  "Carbohydrate":          "carbohydrate_100g",
  "Totaldietary fibre":    "fiber_100g",
  "Freesugar":             "sugar_100g",
  // Minerals
  "Sodium":                "sodium_mg_100g",
  "Calcium":               "calcium_mg_100g",
  "Iron":                  "iron_mg_100g",
  "Vitaminc":              "vitamin_c_mg_100g",
  "Betacarotene":          "beta_carotene_mcg_100g",
  // Other
  "Moisture":              "moisture_100g",
};

function toNum(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
function ne(v)    { return (v === "" || v === undefined || v === null) ? null : v; }

// ---------------------------------------------------------------------------
// Build rows from IFCT data
// ---------------------------------------------------------------------------
function buildRows() {
  const allFoods = ifct.foods();
  if (!allFoods || !allFoods.length) {
    console.error("ifct2017: foods() returned empty. Check package installation.");
    process.exit(1);
  }
  console.log("[ifct] Total IFCT foods:", allFoods.length);

  const rows = [];
  for (const food of allFoods) {
    // food object shape: { code, name, scie, lang, grup, ... }
    const comp = ifct.compositions(food.code);
    const nutriRow = {};
    if (comp && typeof comp === "object") {
      for (const [ifctKey, dbCol] of Object.entries(NUTRIENT_MAP)) {
        nutriRow[dbCol] = toNum(comp[ifctKey]);
      }
    }
    rows.push({
      food_code:         ne(food.code),
      name:              ne(food.name) ?? ne(food.scie) ?? food.code,
      scientific_name:   ne(food.scie),
      local_names:       ne(food.lang),
      food_group:        ne(food.grup),
      subgroup:          ne(food.subg ?? food.subgroup),
      region:            ne(food.regn ?? food.region),
      preparation_method: ne(food.prep ?? food.preparation),
      ...nutriRow,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Upsert in batches
// ---------------------------------------------------------------------------
async function runImport() {
  const rows = buildRows();
  console.log("[ifct] Built", rows.length, "rows. Upserting to Supabase...");

  const BATCH = 100;
  let total = 0, errors = 0;
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await sb
      .from("ifct_foods")
      .upsert(slice, { onConflict: "food_code", ignoreDuplicates: false });
    if (error) {
      errors++;
      console.error("Batch error at row", i, ":", error.message);
    } else {
      total += slice.length;
      process.stdout.write("[ifct] Upserted: " + total + "/" + rows.length + "");
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("
[ifct] Done:", total, "rows,", errors, "errors,", elapsed + "s");
}

await runImport();