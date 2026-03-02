#!/usr/bin/env node
/**
 * test-barcode-lookup.mjs
 * Verifies the ETL pipeline by looking up known barcodes in the SQLite database.
 *
 * Usage: node scripts/test-barcode-lookup.mjs
 */

import Database from "better-sqlite3";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __d = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__d, "..");
const DB_PATH = resolve(ROOT, "data", "fitai-foods.sqlite");

const TEST_BARCODES = [
  { code: "8901719134845", label: "Parle-G" },
  { code: "8901063139329", label: "Britannia Bourbon" },
  { code: "8901058000290", label: "Maggi" },
  { code: "8901491101844", label: "Lay's" },
  { code: "8901764042706", label: "Thums Up" },
];

const db = new Database(DB_PATH, { readonly: true });
const stmt = db.prepare("SELECT * FROM products WHERE code = ?");

let found = 0;
const total = TEST_BARCODES.length;

console.log("Testing barcode lookups...\n");

for (const { code, label } of TEST_BARCODES) {
  const row = stmt.get(code);
  if (row && row.energy_kcal_100g != null) {
    found++;
    console.log(
      `\u2705 ${code} \u2192 ${row.product_name} | ${row.energy_kcal_100g} kcal`,
    );
  } else {
    console.log(`\u274C ${code} (${label}) \u2192 not found in SQLite`);
  }
}

db.close();

console.log("");
if (found >= 3) {
  console.log(
    `\u2705 ETL PIPELINE VERIFIED (${found}/${total} barcodes found)`,
  );
  process.exit(0);
} else {
  console.log(
    `\u274C Too few results \u2014 check seed script (${found}/${total} barcodes found)`,
  );
  process.exit(1);
}
