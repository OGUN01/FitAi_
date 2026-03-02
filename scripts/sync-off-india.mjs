#!/usr/bin/env node
/**
 * sync-off-india.mjs
 * Imports data/off-india.csv into Supabase off_products.
 * Also handles weekly delta sync from OFF delta files.
 * Prereqs: npm install @supabase/supabase-js csv-parse
 * Env: SUPABASE_URL  SUPABASE_SERVICE_ROLE_KEY  [CSV_PATH]
 * Usage:
 *   node scripts/sync-off-india.mjs --import   # bulk import CSV
 *   node scripts/sync-off-india.mjs --delta    # weekly delta sync
 *   node scripts/sync-off-india.mjs --import --delta
 */

import { createClient } from '@supabase/supabase-js';
import { createReadStream, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as csvParse } from 'csv-parse';
import https from 'https';

const __d = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__d, "..");
const CSV  = process.env.CSV_PATH ?? resolve(ROOT, "data", "off-india.csv");
const URL_ = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb   = createClient(URL_, KEY, { auth: { persistSession: false } });
const BATCH = 500;

function toNum(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
function toInt(v) { const n = parseInt(v, 10); return isNaN(n) ? null : n; }
function ne(v) { return (v === "" || v === undefined || v === null) ? null : v; }

function clean(row) {
  return {
    code:               ne(row.code),
    product_name:       ne(row.product_name),
    product_name_en:    ne(row.product_name_en),
    brands:             ne(row.brands),
    quantity:           ne(row.quantity),
    categories:         ne(row.categories),
    countries_tags:     ne(row.countries_tags),
    ingredients_text:   ne(row.ingredients_text),
    allergens_tags:     ne(row.allergens_tags),
    energy_kcal_100g:   toNum(row.energy_kcal_100g),
    proteins_100g:      toNum(row.proteins_100g),
    carbohydrates_100g: toNum(row.carbohydrates_100g),
    sugars_100g:        toNum(row.sugars_100g),
    fat_100g:           toNum(row.fat_100g),
    saturated_fat_100g: toNum(row.saturated_fat_100g),
    fiber_100g:         toNum(row.fiber_100g),
    sodium_100g:        toNum(row.sodium_100g),
    nutriscore_grade:   ne(row.nutriscore_grade),
    nova_group:         toInt(row.nova_group),
    image_url:          ne(row.image_url),
    image_small_url:    ne(row.image_small_url),
    last_modified_t:    toInt(row.last_modified_t),
    off_source:         "off-parquet-india",
  };
}

async function upsertBatch(rows) {
  const { error } = await sb.from("off_products").upsert(rows, { onConflict: "code", ignoreDuplicates: false });
  if (error) throw new Error("Upsert error: " + error.message);
}

async function runImport() {
  if (!existsSync(CSV)) { console.error("CSV not found:", CSV); process.exit(1); }
  console.log("[import] Reading:", CSV);
  let total = 0, errs = 0, batch = [];
  const t0 = Date.now();
  const parser = createReadStream(CSV).pipe(csvParse({ columns: true, skip_empty_lines: true, trim: true }));
  for await (const row of parser) {
    const r = clean(row);
    if (!r.code) continue;
    batch.push(r);
    if (batch.length >= BATCH) {
      try { await upsertBatch(batch); total += batch.length; process.stdout.write("[import] Rows: " + total + ""); }
      catch(e) { errs++; console.error("
Batch error:", e.message); }
      batch = [];
    }
  }
  if (batch.length) { await upsertBatch(batch); total += batch.length; }
  console.log("
[import] Done:", total, "rows,", errs, "errors,", ((Date.now()-t0)/1000).toFixed(1)+"s");
}

function fetchText(url) {
  return new Promise((res, rej) => {
    https.get(url, (r) => { let d=""; r.on("data",(c)=>d+=c); r.on("end",()=>res(d)); }).on("error",rej);
  });
}

async function runDelta() {
  console.log("[delta] Fetching OFF delta index...");
  const idx = await fetchText("https://static.openfoodfacts.org/data/delta/index.txt");
  const files = idx.trim().split("
").filter(Boolean).reverse();
  console.log("[delta] Delta files:", files.length);
  const cutoff = Date.now()/1000 - 7*86400;
  let total = 0;
  for (const file of files) {
    const ts = parseInt((file.split("_")[0] ?? "0"), 10);
    if (ts < cutoff) break;
    console.log("[delta] Processing:", file);
    const jsonl = await fetchText("https://static.openfoodfacts.org/data/delta/" + file);
    let batch = [];
    for (const line of jsonl.trim().split("
")) {
      try {
        const p = JSON.parse(line);
        const code = String(p.code ?? "");
        const tags = p.countries_tags ?? [];
        if (!tags.includes("en:india") && !code.startsWith("890")) continue;
        const n = p.nutriments ?? {};
        batch.push({
          code, product_name: p.product_name??null, product_name_en: p.product_name_en??null,
          brands: p.brands??null, quantity: p.quantity??null,
          categories: (p.categories_tags??[]).join(",")||null,
          countries_tags: tags.join(",")||null,
          ingredients_text: p.ingredients_text??null,
          allergens_tags: (p.allergens_tags??[]).join(",")||null,
          energy_kcal_100g:   n["energy-kcal_100g"]??null,
          proteins_100g:      n["proteins_100g"]??null,
          carbohydrates_100g: n["carbohydrates_100g"]??null,
          sugars_100g:        n["sugars_100g"]??null,
          fat_100g:           n["fat_100g"]??null,
          saturated_fat_100g: n["saturated-fat_100g"]??null,
          fiber_100g:         n["fiber_100g"]??null,
          sodium_100g:        n["sodium_100g"]??null,
          nutriscore_grade: p.nutrition_grades??null,
          nova_group: p.nova_group ? parseInt(p.nova_group,10) : null,
          image_url: p.image_front_url??null, image_small_url: p.image_front_small_url??null,
          last_modified_t: p.last_modified_t??null, off_source: "off-delta",
        });
        if (batch.length >= BATCH) { await upsertBatch(batch); total += batch.length; batch = []; }
      } catch(_) {}
    }
    if (batch.length) { await upsertBatch(batch); total += batch.length; }
  }
  console.log("[delta] India products upserted:", total);
}

const args = process.argv.slice(2);
if (!args.length) { console.log("Usage: node scripts/sync-off-india.mjs [--import] [--delta]"); process.exit(0); }
if (args.includes("--import")) await runImport();
if (args.includes("--delta"))  await runDelta();
console.log("[sync] All done.");