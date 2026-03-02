#!/usr/bin/env node
/**
 * build-sqlite-foods.mjs
 * Queries Supabase `foods` table and generates a pre-built SQLite file
 * at data/fitai-foods.sqlite for device download.
 *
 * Prereqs: npm install better-sqlite3 @supabase/supabase-js
 * Env:     SUPABASE_URL  SUPABASE_SERVICE_ROLE_KEY
 * Usage:   node --env-file=.env scripts/build-sqlite-foods.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import Database from "better-sqlite3";
import { mkdirSync, existsSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── robust .env parsing (mixed delimiters) ──────────────────────────
const envContent = readFileSync(".env", "utf8");
envContent.split("\n").forEach((line) => {
  line = line.trim();
  if (!line || line.startsWith("#")) return;
  const eqIdx = line.indexOf("=");
  const coIdx = line.indexOf(":");
  let sepIdx = -1;
  if (eqIdx > 0 && (coIdx < 0 || eqIdx < coIdx)) sepIdx = eqIdx;
  else if (coIdx > 0 && (eqIdx < 0 || coIdx < eqIdx)) sepIdx = coIdx;
  if (sepIdx > 0) {
    const key = line.substring(0, sepIdx).trim();
    const val = line.substring(sepIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
});

// ── paths ──────────────────────────────────────────────────────────────
const __d = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__d, "..");
const OUT = resolve(ROOT, "data", "fitai-foods.sqlite");

// ── env ────────────────────────────────────────────────────────────────
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ── supabase client ────────────────────────────────────────────────────
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });

const PAGE_SIZE = 1000;

// ── main ───────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  console.log("build-sqlite-foods: starting...");

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

  // ── create SQLite database ───────────────────────────────────────────
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
      fiber_100g          REAL,
      sodium_100g         REAL
    );
    CREATE INDEX idx_products_code ON products(code);
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
  `);

  // ── prepared statements ──────────────────────────────────────────────
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO products VALUES (?,?,?,?,?,?,?,?,?,?)",
  );
  const insertMany = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(
        r.barcode, // → code
        r.name, // → product_name
        r.brand, // → brands
        r.calories_per_100g, // → energy_kcal_100g
        r.protein_per_100g, // → proteins_100g
        r.carbs_per_100g, // → carbohydrates_100g
        r.sugar_per_100g, // → sugars_100g
        r.fat_per_100g, // → fat_100g
        r.fiber_per_100g, // → fiber_100g
        r.sodium_per_100g, // → sodium_100g
      );
    }
  });

  // ── paginated fetch from Supabase foods table ────────────────────────
  let offset = 0;
  let total = 0;

  while (true) {
    const { data, error } = await sb
      .from("foods")
      .select(
        "barcode,name,brand,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,fiber_per_100g,sugar_per_100g,sodium_per_100g",
      )
      .not("barcode", "is", null)
      .not("calories_per_100g", "is", null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error)
      throw new Error(`Supabase error at offset ${offset}: ${error.message}`);
    if (!data || data.length === 0) break;

    insertMany(data);
    total += data.length;
    offset += data.length;

    console.log(`  fetched ${total} rows`);

    if (data.length < PAGE_SIZE) break;
  }

  // ── meta table ───────────────────────────────────────────────────────
  const insertMeta = db.prepare("INSERT INTO meta VALUES (?, ?)");
  insertMeta.run("version", new Date().toISOString().slice(0, 10));
  insertMeta.run("source", "supabase-foods");
  insertMeta.run("built_at", new Date().toISOString());

  // ── switch journal mode for shipping ─────────────────────────────────
  db.pragma("journal_mode = DELETE");
  db.close();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `build-sqlite-foods: done — ${total} rows in ${elapsed}s → ${OUT}`,
  );
}

main().catch((err) => {
  console.error("build-sqlite-foods FAILED:", err);
  process.exit(1);
});
