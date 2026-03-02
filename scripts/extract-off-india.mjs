#!/usr/bin/env node
/**
 * extract-off-india.mjs
 * =====================================================================
 * One-time (re-runnable) extraction of Indian products from the
 * Open Food Facts Parquet dataset using DuckDB Node API.
 *
 * Outputs: data/off-india.csv  (~27K rows)
 *
 * Prereqs:
 *   npm install @duckdb/node-api
 *
 * Usage:
 *   1. Download the Parquet (~4.2 GB):
 *        curl -L -o data/food.parquet "https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet?download=true"
 *   2. node scripts/extract-off-india.mjs
 *   Env overrides: PARQUET_PATH  OUTPUT_CSV
 * =====================================================================
 */

import { DuckDBInstance } from "@duckdb/node-api";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const __d = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__d, "..");
const PQ = process.env.PARQUET_PATH ?? resolve(ROOT, "data", "food.parquet");
const OUT = process.env.OUTPUT_CSV ?? resolve(ROOT, "data", "off-india.csv");
const PQF = PQ.replace(/\\/g, "/");
const OUTF = OUT.replace(/\\/g, "/");

if (!existsSync(PQ)) {
  console.error("ERROR: Parquet not found:", PQ);
  console.error(
    "Download: curl -L -o data/food.parquet https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet?download=true",
  );
  process.exit(1);
}
mkdirSync(dirname(OUT), { recursive: true });

const db = await DuckDBInstance.create(":memory:");
const conn = await db.connect();
console.log("[extract] Connected. Source:", PQ);
console.log("[extract] Output :", OUT);

// Count India+890 products
const countSql = `
  SELECT COUNT(*) AS n
  FROM read_parquet('${PQF}')
  WHERE list_contains(countries_tags, 'en:india')
     OR starts_with(code, '890')
`;
const cr = await conn.runAndReadAll(countSql);
const total = Number(cr.getRowObjectsJson()[0].n);
console.log("[extract] India+890 products:", total.toLocaleString());

// Build COPY statement — uses confirmed-working schema for OFF parquet
const extractSql = `
COPY (
  SELECT
    code,
    COALESCE(
      list_filter(product_name, x -> x.lang = 'en')[1].text,
      list_filter(product_name, x -> x.lang IS NOT NULL)[1].text
    ) AS product_name,
    brands,
    quantity,
    array_to_string(categories_tags, ',') AS categories,
    array_to_string(countries_tags, ',') AS countries_tags,
    COALESCE(
      list_filter(ingredients_text, x -> x.lang = 'en')[1].text,
      list_filter(ingredients_text, x -> x.lang IS NOT NULL)[1].text
    ) AS ingredients_text,
    array_to_string(allergens_tags, ',') AS allergens_tags,
    TRY_CAST(struct_extract(list_filter(nutriments, x -> x.name = 'energy-kcal')[1], '100g') AS DOUBLE) AS energy_kcal_100g,
    TRY_CAST(struct_extract(list_filter(nutriments, x -> x.name = 'proteins')[1], '100g') AS DOUBLE) AS proteins_100g,
    TRY_CAST(struct_extract(list_filter(nutriments, x -> x.name = 'carbohydrates')[1], '100g') AS DOUBLE) AS carbohydrates_100g,
    TRY_CAST(struct_extract(list_filter(nutriments, x -> x.name = 'sugars')[1], '100g') AS DOUBLE) AS sugars_100g,
    TRY_CAST(struct_extract(list_filter(nutriments, x -> x.name = 'fat')[1], '100g') AS DOUBLE) AS fat_100g,
    TRY_CAST(struct_extract(list_filter(nutriments, x -> x.name = 'saturated-fat')[1], '100g') AS DOUBLE) AS saturated_fat_100g,
    TRY_CAST(struct_extract(list_filter(nutriments, x -> x.name = 'fiber')[1], '100g') AS DOUBLE) AS fiber_100g,
    TRY_CAST(struct_extract(list_filter(nutriments, x -> x.name = 'sodium')[1], '100g') AS DOUBLE) AS sodium_100g,
    nutriscore_grade,
    TRY_CAST(nova_group AS SMALLINT) AS nova_group,
    'https://images.openfoodfacts.org/images/products/' || code || '/front_en.400.jpg' AS image_url,
    'https://images.openfoodfacts.org/images/products/' || code || '/front_en.200.jpg' AS image_small_url,
    last_modified_t
  FROM read_parquet('${PQF}')
  WHERE list_contains(countries_tags, 'en:india')
     OR starts_with(code, '890')
  ORDER BY code
) TO '${OUTF}' (FORMAT CSV, HEADER TRUE, NULL '');
`;

console.log("[extract] Extracting to CSV...");
const t0 = Date.now();
await conn.run(extractSql);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log("[extract] Done in", elapsed + "s");
console.log("[extract] Output:", OUT);
console.log("[extract] Next: node scripts/sync-off-india.mjs --import");
