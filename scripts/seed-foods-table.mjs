#!/usr/bin/env node
/**
 * seed-foods-table.mjs
 * Fetches ~84 common Indian food product barcodes from Open Food Facts API
 * and upserts them into the Supabase `foods` table.
 *
 * Usage:
 *   node --env-file=.env scripts/seed-foods-table.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

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

// ── env ──────────────────────────────────────────────────────────────
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });

// ── helpers ──────────────────────────────────────────────────────────
function toNum(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  // Clamp to 4 decimal places and cap at 9999 to avoid numeric overflow in Supabase
  return Math.round(Math.min(Math.abs(n), 9999) * 10000) / 10000;
}
function ne(v) {
  return v === "" || v === undefined || v === null ? null : v;
}

function cleanProduct(p, code) {
  const n = p.nutriments ?? {};
  const name = ne(p.product_name_en) || ne(p.product_name);
  const brand = ne(p.brands);
  const calories = toNum(n["energy-kcal_100g"]);
  const protein = toNum(n["proteins_100g"]);
  const carbs = toNum(n["carbohydrates_100g"]);
  const fat = toNum(n["fat_100g"]);
  const fiber = toNum(n["fiber_100g"]);
  const sugar = toNum(n["sugars_100g"]);
  const sodium = toNum(n["sodium_100g"]);

  // Derive category from first categories_tags entry
  let category = "packaged-food";
  if (Array.isArray(p.categories_tags) && p.categories_tags.length > 0) {
    category = p.categories_tags[0].replace(/^en:/, "");
  }

  return {
    barcode: ne(code),
    name: name || brand || `Product ${code}`,
    brand: brand || 'Unknown',
    calories_per_100g: calories ?? 0,
    protein_per_100g: protein ?? 0,
    carbs_per_100g: carbs ?? 0,
    fat_per_100g: fat ?? 0,
    fiber_per_100g: fiber ?? 0,
    sugar_per_100g: sugar ?? 0,
    sodium_per_100g: sodium ?? 0,
    category,
    verified: false,
  };
}

// ── barcode list (~84 common Indian packaged foods) ─────────────────
const BARCODES = [
  // Parle biscuits
  "8901719134845",
  "8901719134852",
  "8901719129988",
  "8901719135248",
  "8901719135118",
  "8901719105913",
  "8901719121630",
  "8901719130014",
  "8901719123870",
  "8901725016258",
  // Britannia biscuits & snacks
  "8901063139329",
  "8901063093522",
  "8901063162914",
  "8901063092853",
  "8901063029255",
  "8901063023901",
  "8901063162532",
  // Balaji snacks
  "8906010500764",
  "8906010500559",
  "8906010502232",
  "8906010500900",
  "8906010500023",
  "8906010500627",
  "8906010500337",
  "8906010502119",
  "8906010501570",
  "8906010500863",
  "8906010500214",
  "8906010500016",
  "8906010502294",
  "8906010500481",
  "8906010500078",
  // Coca-Cola India (Thums Up, Sprite, Maaza, Kinley, Coke)
  "8901764042911",
  "8901764032912",
  "8901764042904",
  "8901764032707",
  "8901764032905",
  "8901764042706",
  "8901764362804",
  "8901764092206",
  "8901764092305",
  "8901764082405",
  "8901764061257",
  "8901764042300",
  "8901764032301",
  // Nestlé / Maggi
  "8901058017687",
  "8901058000290",
  "8901058005233",
  // PepsiCo India (Kurkure, Lays, Pepsi)
  "8901491100519",
  "8901491366052",
  "8901491361026",
  "8901491001168",
  "8901491101844",
  "8902080000227",
  "8902080104581",
  // Kissan / HUL
  "8901030921667",
  "8901030897542",
  "8901030921797",
  "8901030831690",
  "8901030535895",
  // Amul dairy
  "8901262010016",
  "8901262200196",
  "8901262260121",
  // Tata, Bisleri, Patanjali, Haldirams, Ching's, others
  "8904043901015",
  "8906017290040",
  "8906032018513",
  "8906032018520",
  "8904004402636",
  "8904004400731",
  "8904004400236",
  "8904004403718",
  "8901595862962",
  "8901571006854",
  "8904272600291",
  "8901725118938",
  // International brands sold in India
  "5449000000996",
  "3017620422003",
  "3017620425035",
  "7622202225512",
  "7622202334009",
  "8000500003787",
  "8801043150620",
  "8996001312506",
  "5999884034469",
];

// ── main ─────────────────────────────────────────────────────────────
const FETCH_TIMEOUT = 5_000;
const DELAY_MS = 200;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchProduct(barcode) {
  const fields = [
    "code",
    "product_name",
    "product_name_en",
    "brands",
    "categories_tags",
    "nutriments",
  ].join(",");
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "FitAI-SeedScript/1.0 (fitai-dev)" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const code = String(data.code ?? data.product.code ?? barcode);
    return cleanProduct(data.product, code);
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function upsertRows(rows) {
  // Try upsert with onConflict first
  const { error } = await sb
    .from("foods")
    .upsert(rows, { onConflict: "barcode", ignoreDuplicates: false });

  if (error) {
    // If no unique constraint on barcode, fall back
    if (error.code === "42P10" || error.message?.includes("unique")) {
      console.log(
        "[seed] No unique constraint on barcode — falling back to insert with ignoreDuplicates",
      );
      const { error: insertErr } = await sb
        .from("foods")
        .insert(rows, { ignoreDuplicates: true });
      if (insertErr) {
        // Last resort: plain insert, skip duplicates manually
        console.log("[seed] ignoreDuplicates failed — trying plain insert");
        const { error: plainErr } = await sb.from("foods").insert(rows);
        if (plainErr) {
          console.error(
            "[seed] Insert error:",
            plainErr.message,
            plainErr.code,
          );
          throw new Error("Insert failed: " + plainErr.message);
        }
      }
    } else {
      console.error("[seed] Upsert error:", error.message, error.code);
      throw new Error("Upsert failed: " + error.message);
    }
  }
}

async function main() {
  console.log(
    `[seed] Fetching ${BARCODES.length} barcodes from Open Food Facts...`,
  );
  const t0 = Date.now();

  const rows = [];
  let fetched = 0;
  let withNutrition = 0;
  let failed = 0;

  for (let i = 0; i < BARCODES.length; i++) {
    const barcode = BARCODES[i];
    process.stdout.write(
      `\r[seed] ${i + 1}/${BARCODES.length} — fetching ${barcode}...`,
    );

    const product = await fetchProduct(barcode);
    if (product) {
      fetched++;
      if (product.calories_per_100g !== null) {
        withNutrition++;
        rows.push(product);
      }
    } else {
      failed++;
    }

    // Rate-limit: wait between requests
    if (i < BARCODES.length - 1) await sleep(DELAY_MS);
  }

  console.log(
    `\n[seed] Fetch complete: ${fetched} found, ${withNutrition} with nutrition, ${failed} failed/not-found`,
  );

  // Upsert in batches of 500
  if (rows.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await upsertRows(batch);
      console.log(`[seed] Upserted batch: ${batch.length} rows`);
    }
  }

  // Verify count
  const { count, error } = await sb
    .from("foods")
    .select("barcode", { count: "exact", head: true })
    .not("barcode", "is", null);

  if (error) {
    console.error("[seed] Count query error:", error.message);
  } else {
    console.log(`[seed] Total foods in table: ${count}`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[seed] Done in ${elapsed}s`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] Fatal error:", err);
  process.exit(1);
});
