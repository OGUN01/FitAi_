#!/usr/bin/env node
/**
 * build-sqlite-via-api.mjs
 * Queries off_products via Supabase Management API (bypassing broken DNS)
 * and generates a pre-built SQLite file at data/fitai-foods.sqlite.
 *
 * Usage:
 *   node --env-file=.env scripts/build-sqlite-via-api.mjs
 */

import Database from "better-sqlite3";
import { mkdirSync, existsSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── paths ──────────────────────────────────────────────────────────────
const __d = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__d, "..");
const OUT = resolve(ROOT, "data", "fitai-foods.sqlite");

// ── Management API helper ─────────────────────────────────────────────
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

// ── columns (slim 14-col schema matching build-sqlite.mjs) ───────────
const COLUMNS = [
  "code",
  "product_name",
  "brands",
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
];

const PAGE_SIZE = 1000;

// ── main ──────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  console.log("build-sqlite-api: starting...");

  // ensure output directory
  const outDir = dirname(OUT);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
    console.log(`  created ${outDir}`);
  }

  // remove old file if exists
  if (existsSync(OUT)) {
    unlinkSync(OUT);
    console.log("  removed old fitai-foods.sqlite");
  }

  // ── create SQLite database ──────────────────────────────────────────
  const db = new Database(OUT);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE products (
      code                TEXT PRIMARY KEY,
      product_name        TEXT,
      brands              TEXT,
      energy_kcal_100g    REAL,
      proteins_100g       REAL,
      carbohydrates_100g  REAL,
      sugars_100g         REAL,
      fat_100g            REAL,
      saturated_fat_100g  REAL,
      fiber_100g          REAL,
      sodium_100g         REAL,
      nutriscore_grade    TEXT,
      nova_group          INTEGER,
      image_url           TEXT
    );
    CREATE INDEX idx_products_code ON products(code);
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
  `);

  // ── prepared statements ─────────────────────────────────────────────
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  );
  const insertMany = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(
        r.code,
        r.product_name,
        r.brands,
        r.energy_kcal_100g,
        r.proteins_100g,
        r.carbohydrates_100g,
        r.sugars_100g,
        r.fat_100g,
        r.saturated_fat_100g,
        r.fiber_100g,
        r.sodium_100g,
        r.nutriscore_grade,
        r.nova_group,
        r.image_url,
      );
    }
  });

  // ── paginated fetch via Management API ──────────────────────────────
  const colList = COLUMNS.join(", ");
  let offset = 0;
  let total = 0;

  while (true) {
    const sql = `
      SELECT ${colList}
      FROM off_products
      WHERE energy_kcal_100g IS NOT NULL
      ORDER BY code
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `;
    const rows = await mgmtQuery(sql);

    if (!rows || rows.length === 0) break;

    insertMany(rows);
    total += rows.length;
    offset += rows.length;

    console.log(`  fetched ${total.toLocaleString()} rows...`);

    if (rows.length < PAGE_SIZE) break;
  }

  // ── meta table ──────────────────────────────────────────────────────
  const insertMeta = db.prepare("INSERT INTO meta VALUES (?, ?)");
  insertMeta.run("version", new Date().toISOString().slice(0, 10));
  insertMeta.run("source", "off-api-live-via-mgmt");
  insertMeta.run("built_at", new Date().toISOString());

  // ── switch journal mode for shipping ────────────────────────────────
  db.pragma("journal_mode = DELETE");
  db.close();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `build-sqlite-api: done — ${total.toLocaleString()} rows in ${elapsed}s → ${OUT}`,
  );
}

main().catch((err) => {
  console.error("build-sqlite-api FAILED:", err);
  process.exit(1);
});
