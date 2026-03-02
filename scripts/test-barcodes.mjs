/**
 * Verify real barcode lookups against the local SQLite database.
 *
 * Run from project root:
 *   node scripts/test-barcodes.mjs
 *
 * Requires: data/fitai-foods.sqlite (133.9 MB, built by build-sqlite.mjs)
 */

import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "fitai-foods.sqlite");

console.log(`Opening database: ${DB_PATH}\n`);

let db;
try {
  db = new Database(DB_PATH, { readonly: true });
} catch (err) {
  console.error(`ERROR: Could not open database: ${err.message}`);
  console.error(
    "Make sure data/fitai-foods.sqlite exists (run scripts/build-sqlite.mjs first).",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
const totalRow = db.prepare("SELECT COUNT(*) as cnt FROM products").get();
const indiaRow = db
  .prepare("SELECT COUNT(*) as cnt FROM products WHERE code LIKE '890%'")
  .get();
const ean13Row = db
  .prepare("SELECT COUNT(*) as cnt FROM products WHERE length(code) = 13")
  .get();

console.log("=== Database Stats ===");
console.log(`Total products : ${totalRow.cnt.toLocaleString()}`);
console.log(`India (890xxx) : ${indiaRow.cnt.toLocaleString()}`);
console.log(`EAN-13 (13 dig): ${ean13Row.cnt.toLocaleString()}`);
console.log();

// ---------------------------------------------------------------------------
// Known barcode lookups
// ---------------------------------------------------------------------------
const testCodes = [
  { code: "8901058003329", label: "Maggi 2-Minute Noodles" },
  { code: "8901058851015", label: "Amul Butter (expected)" },
  { code: "8901719114336", label: "Parle-G Biscuits (expected)" },
  { code: "8901063021228", label: "Britannia Good Day (expected)" },
  { code: "8901072036501", label: "KitKat India (expected)" },
  { code: "8901030868139", label: "Lay's Classic (IN)" },
  { code: "8901719113568", label: "Hide & Seek (Parle)" },
  { code: "5449000131805", label: "Coca-Cola Classic (EU)" },
  { code: "0037000524458", label: "Tide Laundry (US — expect NOT FOUND)" },
];

const stmt = db.prepare(
  "SELECT code, product_name, brands, energy_kcal_100g, proteins_100g, carbohydrates_100g, fat_100g FROM products WHERE code = ?",
);

console.log("=== Barcode Lookups ===");
let found = 0;
let notFound = 0;
for (const { code, label } of testCodes) {
  const row = stmt.get(code);
  if (row) {
    found++;
    console.log(`✅ ${code}  [${label}]`);
    console.log(
      `   Name   : ${row.product_name ?? "(null)"}  |  Brand: ${row.brands ?? "(null)"}`,
    );
    console.log(
      `   Kcal   : ${row.energy_kcal_100g ?? "—"}  |  P: ${row.proteins_100g ?? "—"}g  C: ${row.carbohydrates_100g ?? "—"}g  F: ${row.fat_100g ?? "—"}g`,
    );
  } else {
    notFound++;
    console.log(`❌ ${code}  [${label}]  → NOT FOUND`);
  }
}

console.log(
  `\nResult: ${found} found, ${notFound} not found out of ${testCodes.length} tested`,
);

// ---------------------------------------------------------------------------
// Sample India-prefix products
// ---------------------------------------------------------------------------
console.log("\n=== Sample India (890xxx) Products ===");
const indiaSample = db
  .prepare(
    "SELECT code, product_name, brands, energy_kcal_100g FROM products WHERE code LIKE '890%' ORDER BY code LIMIT 20",
  )
  .all();

if (indiaSample.length === 0) {
  console.log("(none found)");
} else {
  for (const row of indiaSample) {
    console.log(
      `  ${row.code}  ${(row.product_name ?? "(no name)").padEnd(40)}  ${row.brands ?? ""}  [${row.energy_kcal_100g ?? "—"} kcal]`,
    );
  }
}

db.close();
console.log("\nDone.");
