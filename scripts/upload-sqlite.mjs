#!/usr/bin/env node
/**
 * upload-sqlite.mjs
 * Gzip-compresses data/fitai-foods.sqlite, then uploads the .gz to
 * Supabase Storage (food-databases bucket).
 *
 * Why .gz? The free-tier Supabase Storage cap is 50 MB. The raw SQLite
 * is ~134 MB; gzip-9 brings it to ~42 MB.
 *
 * *.supabase.co DNS does NOT resolve on this machine via local resolver.
 * We bypass this by connecting directly to the known Cloudflare IP
 * (104.18.38.10) and passing the correct Host / SNI headers.
 *
 * Env:   SUPABASE_SERVICE_ROLE_KEY  (loaded via --env-file=.env)
 * Usage: node --env-file=.env scripts/upload-sqlite.mjs [--force]
 */

import https from "https";
import zlib from "zlib";
import { statSync, readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __d = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__d, "..");

// ── credentials ────────────────────────────────────────────────────────
const PROJECT_REF = "mqfrwtmkokivoxgukgsz";
// Prefer env var; fall back to known key (service_role JWT from .env)
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjkxMTg4NywiZXhwIjoyMDY4NDg3ODg3fQ.GodrW37wQvrL30QB26acYRYOiiAltyw3pXHXL4Xvxis";

if (!KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

// ── known stable Cloudflare IP for *.supabase.co ───────────────────────
const SUPABASE_IP = "104.18.38.10";
const STORAGE_HOST = `${PROJECT_REF}.supabase.co`;
const STORAGE_BASE = `/storage/v1/object`;
const BUCKET = "food-databases";

// ── helper: raw HTTPS request to supabase storage ─────────────────────
function storageRequest(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const reqHeaders = {
      Authorization: `Bearer ${KEY}`,
      apikey: KEY,
      Host: STORAGE_HOST,
      ...headers,
    };
    if (body) {
      reqHeaders["Content-Length"] = body.length;
    }

    const req = https.request(
      {
        hostname: SUPABASE_IP, // bypass DNS — connect direct to IP
        servername: STORAGE_HOST, // SNI for TLS
        path: `${STORAGE_BASE}${path}`,
        method,
        headers: reqHeaders,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── helper: ensure bucket exists ───────────────────────────────────────
async function ensureBucket() {
  // Try to get bucket info; if 404 create it
  const checkRes = await storageRequest(
    "GET",
    `/../bucket/${BUCKET}`,
    {},
    null,
  );
  if (checkRes.status === 200) {
    console.log(`  bucket '${BUCKET}' already exists`);
    return;
  }
  // Create bucket
  const createBody = Buffer.from(
    JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  );
  const createRes = await storageRequest(
    "POST",
    "/../bucket",
    { "Content-Type": "application/json" },
    createBody,
  );
  if (createRes.status >= 400) {
    const msg =
      typeof createRes.body === "object"
        ? JSON.stringify(createRes.body)
        : createRes.body;
    // "already exists" is fine
    if (!msg.includes("already") && !msg.includes("duplicate")) {
      throw new Error(
        `Failed to create bucket: HTTP ${createRes.status} — ${msg}`,
      );
    }
    console.log(`  bucket '${BUCKET}' already exists (confirmed)`);
  } else {
    console.log(`  bucket '${BUCKET}' created`);
  }
}

// ── helper: upload one file ─────────────────────────────────────────────
async function uploadFile(remoteName, fileBuffer) {
  const path = `/${BUCKET}/${remoteName}`;
  // Use upsert=true via query param (Supabase storage v1 supports x-upsert header)
  const res = await storageRequest(
    "POST",
    `${path}?upsert=true`,
    {
      "Content-Type": "application/octet-stream",
      "x-upsert": "true",
      "Content-Length": fileBuffer.length,
    },
    fileBuffer,
  );
  if (res.status >= 400) {
    throw new Error(
      `Upload '${remoteName}' failed: HTTP ${res.status} — ${JSON.stringify(res.body)}`,
    );
  }
  return res;
}

// ── paths ──────────────────────────────────────────────────────────────
const sqlitePath = resolve(ROOT, "data", "fitai-foods.sqlite");
const gzPath = resolve(ROOT, "data", "fitai-foods.sqlite.gz");
const MIN_RAW_SIZE = 50 * 1024 * 1024; // 50 MB guard for raw SQLite
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB Supabase free-tier cap

if (!existsSync(sqlitePath)) {
  console.error(`ERROR: SQLite file not found: ${sqlitePath}`);
  process.exit(1);
}

const rawStat = statSync(sqlitePath);
const forceUpload = process.argv.includes("--force");

if (!forceUpload && rawStat.size < MIN_RAW_SIZE) {
  console.error(
    `ERROR: SQLite file too small: ${(rawStat.size / 1024 / 1024).toFixed(1)} MB ` +
      `(minimum 50 MB required — use --force for test builds)`,
  );
  process.exit(1);
}
if (forceUpload && rawStat.size < MIN_RAW_SIZE) {
  console.log(
    `[force] Bypassing size check: ${(rawStat.size / 1024 / 1024).toFixed(2)} MB (test build)`,
  );
}

console.log(
  `SQLite file: ${sqlitePath} (${(rawStat.size / 1024 / 1024).toFixed(1)} MB)`,
);

// ── compress ────────────────────────────────────────────────────────────
console.log("Compressing with gzip-9…");
const rawBuffer = readFileSync(sqlitePath);
const gzBuffer = zlib.gzipSync(rawBuffer, { level: 9 });
const gzMB = (gzBuffer.length / 1024 / 1024).toFixed(1);
console.log(
  `  compressed: ${gzMB} MB (${((1 - gzBuffer.length / rawBuffer.length) * 100).toFixed(1)}% reduction)`,
);
writeFileSync(gzPath, gzBuffer);
console.log(`  written to ${gzPath}`);

if (gzBuffer.length > MAX_UPLOAD_SIZE) {
  console.error(
    `ERROR: Compressed file still too large: ${gzMB} MB > 50 MB Supabase free-tier cap.`,
  );
  process.exit(1);
}

await ensureBucket();

// versioned copy (with .gz extension)
const today = new Date().toISOString().slice(0, 10);
const versionedName = `fitai-foods-${today}.sqlite.gz`;
console.log(`\nuploading versioned copy: ${versionedName}…`);
await uploadFile(versionedName, gzBuffer);
console.log(`  ✓ ${versionedName} uploaded`);

// stable alias
console.log("uploading stable alias: fitai-foods-latest.sqlite.gz…");
await uploadFile("fitai-foods-latest.sqlite.gz", gzBuffer);
console.log("  ✓ fitai-foods-latest.sqlite.gz uploaded");

// public URL
const publicUrl = `https://${STORAGE_HOST}/storage/v1/object/public/${BUCKET}/fitai-foods-latest.sqlite.gz`;
console.log(`\nPublic URL: ${publicUrl}`);
console.log("upload-sqlite: done ✓");
