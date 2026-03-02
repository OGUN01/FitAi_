#!/usr/bin/env node
/**
 * build-sqlite.mjs
 * Queries Supabase off_products via the Management API (api.supabase.com)
 * and generates a pre-built SQLite file at data/fitai-foods.sqlite.
 *
 * Uses api.supabase.com (NOT *.supabase.co) so there is NO DNS issue.
 *
 * Prereqs: npm install better-sqlite3
 * Env:     (none required — PAT is hardcoded below)
 * Usage:   node scripts/build-sqlite.mjs
 */

import https from "https";
import Database from "better-sqlite3";
import { mkdirSync, existsSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── paths ──────────────────────────────────────────────────────────────
const __d = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__d, "..");
const OUT = resolve(ROOT, "data", "fitai-foods.sqlite");

// ── Management API credentials ─────────────────────────────────────────
// PAT lives in .mcp.json — hardcode here since it's a build script only.
const PAT = "sbp_37b87f98d57e0e4d68545b2e9818f136366cdeef";
const PROJECT_REF = "mqfrwtmkokivoxgukgsz";

// ── columns to SELECT (slim: 14 cols) ──────────────────────────────────
const COLUMNS =
  "code, product_name, brands, energy_kcal_100g, proteins_100g, " +
  "carbohydrates_100g, sugars_100g, fat_100g, saturated_fat_100g, " +
  "fiber_100g, sodium_100g, nutriscore_grade, nova_group, image_url";

const PAGE_SIZE = 2000; // safe under Management API 10MB response limit

// ── Management API helper ───────────────────────────────────────────────
function mgmtQuery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request(
      {
        hostname: "api.supabase.com",
        path: `/v1/projects/${PROJECT_REF}/database/query`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAT}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          try {
            const parsed = JSON.parse(raw);
            if (res.statusCode >= 400) {
              reject(
                new Error(
                  `Management API HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`,
                ),
              );
              return;
            }
            resolve(parsed);
          } catch (e) {
            reject(
              new Error(
                `JSON parse error: ${e.message} — body: ${raw.slice(0, 200)}`,
              ),
            );
          }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── main ───────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  console.log("build-sqlite: starting…");

  // ensure output directory
  const outDir = dirname(OUT);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
    console.log(`  created ${outDir}`);
  }

  // remove old file (and any leftover WAL/SHM) if exists
  for (const suffix of ["", "-wal", "-shm"]) {
    const p = OUT + suffix;
    if (existsSync(p)) {
      unlinkSync(p);
      console.log(`  removed old ${p.split(/[\\/]/).pop()}`);
    }
  }

  // ── create SQLite database ──────────────────────────────────────────
  const db = new Database(OUT);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -65536"); // 64 MB cache

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

  // ── count total rows first (for progress display) ───────────────────
  console.log("  counting rows…");
  const countResult = await mgmtQuery(
    "SELECT COUNT(*) AS n FROM off_products WHERE energy_kcal_100g IS NOT NULL",
  );
  const totalExpected = Number(countResult[0]?.n ?? 0);
  console.log(`  total rows to fetch: ${totalExpected.toLocaleString()}`);

  // ── paginated fetch via Management API ──────────────────────────────
  let offset = 0;
  let total = 0;
  let retries = 0;
  const MAX_RETRIES = 5;

  while (true) {
    const sql =
      `SELECT ${COLUMNS} FROM off_products ` +
      `WHERE energy_kcal_100g IS NOT NULL ` +
      `ORDER BY code ` +
      `LIMIT ${PAGE_SIZE} OFFSET ${offset}`;

    let data;
    try {
      data = await mgmtQuery(sql);
    } catch (err) {
      retries++;
      if (retries > MAX_RETRIES) {
        throw new Error(
          `Too many consecutive errors (${MAX_RETRIES}). Last: ${err.message}`,
        );
      }
      const wait = retries * 2000;
      console.warn(
        `  WARNING: fetch error at offset ${offset} (retry ${retries}/${MAX_RETRIES} in ${wait}ms): ${err.message}`,
      );
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    retries = 0; // reset on success

    if (!Array.isArray(data)) {
      throw new Error(
        `Unexpected response at offset ${offset}: ${JSON.stringify(data).slice(0, 300)}`,
      );
    }
    if (data.length === 0) break;

    insertMany(data);
    total += data.length;
    offset += data.length;

    // log every ~50K rows
    if (total % 50000 < PAGE_SIZE || total === data.length) {
      const pct = totalExpected
        ? ` (${((total / totalExpected) * 100).toFixed(1)}%)`
        : "";
      console.log(`  fetched ${total.toLocaleString()} rows${pct}…`);
    }

    if (data.length < PAGE_SIZE) break;
  }

  // ── meta table ───────────────────────────────────────────────────────
  const insertMeta = db.prepare("INSERT INTO meta VALUES (?, ?)");
  insertMeta.run("version", new Date().toISOString().slice(0, 10));
  insertMeta.run("source", "off-india");
  insertMeta.run("built_at", new Date().toISOString());
  insertMeta.run("row_count", String(total));

  // ── checkpoint WAL and close ─────────────────────────────────────────
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.pragma("journal_mode = DELETE");
  db.close();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const { statSync } = await import("fs");
  const sizeMB = (statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(
    `build-sqlite: done — ${total.toLocaleString()} rows in ${elapsed}s → ${OUT} (${sizeMB} MB)`,
  );
}

main().catch((err) => {
  console.error("build-sqlite FAILED:", err);
  process.exit(1);
});
