#!/usr/bin/env node
/**
 * extract-off-global.mjs
 * =====================================================================
 * One-time (re-runnable) extraction of global products from the
 * Open Food Facts Parquet dataset using DuckDB Node API.
 *
 * Default mode:  products WITH nutrition data → data/off-global-nutrition.csv
 * --all flag:    ALL products regardless      → data/off-global.csv
 *
 * Prereqs:
 *   npm install @duckdb/node-api
 *
 * Usage:
 *   1. Download the Parquet (~1.5 GB):
 *        curl -L -o data/food.parquet "https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet?download=true"
 *   2. node scripts/extract-off-global.mjs              # --with-nutrition (default)
 *   3. node scripts/extract-off-global.mjs --all        # all products
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

const allMode = process.argv.includes("--all");
const defaultOut = allMode
  ? resolve(ROOT, "data", "off-global.csv")
  : resolve(ROOT, "data", "off-global-nutrition.csv");
const OUT = process.env.OUTPUT_CSV ?? defaultOut;

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
console.log(
  "[extract] Mode   :",
  allMode
    ? "--all (no filter)"
    : "--with-nutrition (energy_kcal_100g IS NOT NULL)",
);
console.log("[extract] Output :", OUT);

// Count products
const q = JSON.stringify; // shorthand for quoting string literals in SQL

// Helper: extract 100g value from nutriments array by nutrient name
// nutriments is STRUCT(name, 100g, ...)[] — use list_filter + struct_extract
const nut100g = (name) =>
  `TRY_CAST(struct_extract(list_filter(nutriments, x -> x.name = '${name}')[1], '100g') AS DOUBLE)`;

// Helper: extract plain text from product_name struct array
const nameExpr = (col) =>
  `COALESCE((list_filter(${col}, x -> x.lang = 'en')[1]).text, (list_filter(${col}, x -> x.lang = 'main')[1]).text, ${col}[1].text)`;

// WHERE filter: products that have energy-kcal nutrition data
const whereClause = allMode
  ? ""
  : ` WHERE ${nut100g("energy-kcal")} IS NOT NULL`;
const countSql = [
  "SELECT COUNT(*) AS n",
  "FROM read_parquet(" + JSON.stringify(PQF) + ")",
  whereClause,
].join(" ");
const cr = await conn.runAndReadAll(countSql);
const total = Number(cr.getRowObjectsJson()[0].n);
console.log("[extract] Total products to extract:", total.toLocaleString());

// Build COPY statement
const extractSql = [
  "COPY (",
  "  SELECT",
  "    CAST(code AS VARCHAR) AS code,",
  `    ${nameExpr('product_name')} AS product_name,`,
  `    ${nameExpr('product_name')} AS product_name_en,`,
  "    brands, quantity,",
  "    array_to_string(categories_tags, ',') AS categories,",
  "    array_to_string(countries_tags,  ',') AS countries_tags,",
  "    ingredients_text,",
  "    array_to_string(allergens_tags,  ',') AS allergens_tags,",
  `    ${nut100g('energy-kcal')} AS energy_kcal_100g,`,
  `    ${nut100g('proteins')} AS proteins_100g,`,
  `    ${nut100g('carbohydrates')} AS carbohydrates_100g,`,
  `    ${nut100g('sugars')} AS sugars_100g,`,
  `    ${nut100g('fat')} AS fat_100g,`,
  `    ${nut100g('saturated-fat')} AS saturated_fat_100g,`,
  `    ${nut100g('fiber')} AS fiber_100g,`,
  `    ${nut100g('sodium')} AS sodium_100g,`,
  "    CASE WHEN nutriscore_grade IN ('a','b','c','d','e') THEN nutriscore_grade ELSE NULL END AS nutriscore_grade,",
  "    TRY_CAST(nova_group AS SMALLINT) AS nova_group,",
  "    NULL AS image_url, NULL AS image_small_url, last_modified_t,",
  "    'off-parquet-global' AS off_source",
  "  FROM read_parquet(" + q(PQF) + ")",
  allMode
    ? ""
    : `  WHERE ${nut100g("energy-kcal")} IS NOT NULL`,
  "  ORDER BY code",
  ") TO " + q(OUTF) + " (FORMAT CSV, HEADER TRUE, NULL '');"
].join("\n");

console.log("[extract] Extracting to CSV...");
const t0 = Date.now();
await conn.run(extractSql);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log("[extract] Done in", elapsed + "s");
console.log("[extract] Rows extracted:", total.toLocaleString());
console.log("[extract] Output:", OUT);
await conn.close();
await db.close();
