#!/usr/bin/env node
/**
 * sync-off-india-via-api.mjs
 *
 * Bulk-upserts all ~27K Indian products from data/off-india.csv
 * into Supabase off_products table via the Management API.
 * (Bypasses DNS-blocked Supabase JS client)
 */

import { parse as csvParse } from "csv-parse";
import { createReadStream } from "fs";
import { resolve } from "path";

// ── Management API config ──────────────────────────────────────
const PAT = "sbp_9f369f3cbb52d4df76f87850fe7526d5dad91c06";
const PROJECT_REF = "mqfrwtmkokivoxgukgsz";
const MGMT_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function mgmtQuery(sql) {
  const res = await fetch(MGMT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error("SQL error: " + JSON.stringify(result));
  return result;
}

// ── Value helpers ──────────────────────────────────────────────
function toNum(v) { const n = parseFloat(v); return isNaN(n) ? null : n; }
function toInt(v) { const n = parseInt(v, 10); return isNaN(n) ? null : n; }
function ne(v) { return (v === '' || v === undefined || v === null) ? null : v; }

// Clamp numeric values to column precision, return null if out of range (bad data)
// NUMERIC(p,s) => max absolute value is 10^(p-s) - epsilon
function clampNum(v, maxAbs) {
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  if (n < 0 || n > maxAbs) return null; // per-100g values should never be negative or huge
  return n;
}

// nutriscore_grade: only a,b,c,d,e allowed; 'unknown','not-applicable' => null
const VALID_NUTRI = new Set(['a','b','c','d','e']);
function cleanNutri(v) {
  const s = (v || '').trim().toLowerCase();
  return VALID_NUTRI.has(s) ? s : null;
}

function clean(row) {
  return {
    code:               ne(row.code),
    product_name:       ne(row.product_name),
    product_name_en:    null,  // not in this parquet version
    brands:             ne(row.brands),
    quantity:           ne(row.quantity),
    categories:         ne(row.categories),
    countries_tags:     ne(row.countries_tags),
    ingredients_text:   ne(row.ingredients_text),
    allergens_tags:     ne(row.allergens_tags),
    energy_kcal_100g:   clampNum(row.energy_kcal_100g, 999999.99),  // NUMERIC(8,2)
    proteins_100g:      clampNum(row.proteins_100g, 999.999),       // NUMERIC(6,3)
    carbohydrates_100g: clampNum(row.carbohydrates_100g, 999.999),  // NUMERIC(6,3)
    sugars_100g:        clampNum(row.sugars_100g, 999.999),         // NUMERIC(6,3)
    fat_100g:           clampNum(row.fat_100g, 999.999),            // NUMERIC(6,3)
    saturated_fat_100g: clampNum(row.saturated_fat_100g, 999.999),  // NUMERIC(6,3)
    fiber_100g:         clampNum(row.fiber_100g, 999.999),          // NUMERIC(6,3)
    sodium_100g:        clampNum(row.sodium_100g, 99.9999),         // NUMERIC(6,4)
    nutriscore_grade:   cleanNutri(row.nutriscore_grade),
    nova_group:         toInt(row.nova_group),
    image_url:          ne(row.image_url),
    image_small_url:    ne(row.image_small_url),
    last_modified_t:    toInt(row.last_modified_t),
    off_source:         'off-parquet-india',
  };
}

// ── SQL builder ────────────────────────────────────────────────
function esc(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return isNaN(v) ? "NULL" : String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

const COLS = [
  "code",
  "product_name",
  "product_name_en",
  "brands",
  "quantity",
  "categories",
  "countries_tags",
  "ingredients_text",
  "allergens_tags",
  "energy_kcal_100g",
  "proteins_100g",
  "carbohydrates_100g",
  "sugars_100g",
  "fat_100g",
  "saturated_fat_100g",
  "fiber_100g",
  "sodium_100g",
  "nutriscore_grade",
  "nova_group",
  "image_url",
  "image_small_url",
  "last_modified_t",
  "off_source",
];

function buildUpsertSql(rows) {
  const values = rows
    .map((r) => "(" + COLS.map((c) => esc(r[c])).join(",") + ")")
    .join(",\n");

  const updates = COLS.filter((c) => c !== "code")
    .map((c) => `${c}=EXCLUDED.${c}`)
    .join(",");

  return `INSERT INTO off_products (${COLS.join(",")})
VALUES ${values}
ON CONFLICT (code) DO UPDATE SET ${updates};`;
}

// ── Main ───────────────────────────────────────────────────────
const BATCH_SIZE = 200;

async function main() {
  const csvPath = resolve("data/off-india.csv");
  console.log(`Reading CSV: ${csvPath}`);

  // Collect all rows first via streaming parser
  const rows = [];
  const parser = createReadStream(csvPath).pipe(
    csvParse({ columns: true, skip_empty_lines: true, trim: true }),
  );

  for await (const row of parser) {
    const r = clean(row);
    if (!r.code) continue; // skip rows without barcode
    rows.push(r);
  }

  console.log(`Parsed ${rows.length} valid rows from CSV`);

  let upserted = 0;
  let batchNum = 0;
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
  const startTime = Date.now();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    batchNum++;

    const sql = buildUpsertSql(batch);

    try {
      await mgmtQuery(sql);
      upserted += batch.length;
    } catch (err) {
      console.error(
        `ERROR batch ${batchNum}/${totalBatches} (rows ${i}-${i + batch.length - 1}): ${err.message}`,
      );
      // Log first row code for debugging
      console.error(`  First code in failed batch: ${batch[0]?.code}`);
      // Continue with next batch instead of crashing
    }

    // Progress logging every 1000 rows
    if (upserted % 1000 < BATCH_SIZE && upserted > 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `  Progress: ${upserted}/${rows.length} rows upserted (${elapsed}s elapsed, batch ${batchNum}/${totalBatches})`,
      );
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 50));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone! Upserted ${upserted} rows in ${totalTime}s`);

  // Verify final count
  const countResult = await mgmtQuery("SELECT COUNT(*) AS n FROM off_products");
  console.log("Total off_products rows:", countResult[0].n);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
