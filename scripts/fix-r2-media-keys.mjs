#!/usr/bin/env node
/**
 * One-off remediation: the initial ingest run (ingest-exercise-media.mjs)
 * uploaded objects under `exercise-video/<id>.mp4` / `exercise-poster/<id>.jpg`
 * keys, using a `category` value ("exercise-video"/"exercise-poster") that
 * the DEPLOYED media-serving worker's category validation actually rejects
 * (it only accepts exactly "exercise", "diet", or "user" — confirmed against
 * the live https://fitai-workers.fitai-prod.workers.dev/media/:category/:id
 * endpoint, which 400s on anything else). None of the 563 uploaded videos
 * were actually servable through the public route.
 *
 * This re-keys every object to category="exercise", folding video/poster
 * into the id: exercise/<canonicalId>-<gender>-video.mp4 and
 * exercise/<canonicalId>-<gender>-poster.jpg. R2 has no rename/copy — this
 * downloads each object's bytes and re-uploads under the corrected key
 * (no re-transcoding), then deletes the old key. Updates
 * scripts/ingest-results.json's URLs to match.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const ENV = { ...loadEnv(path.join(ROOT, ".env.local")), ...process.env };
const WRANGLER_ENV = { ...process.env, CLOUDFLARE_API_TOKEN: ENV.CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID: ENV.CLOUDFLARE_ACCOUNT_ID };
const WORKERS_CWD = path.join(ROOT, "fitai-workers");

const resultsPath = path.join(ROOT, "scripts/ingest-results.json");
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));

const tmpDir = path.join(ROOT, "scripts/.tmp_rekey");
fs.mkdirSync(tmpDir, { recursive: true });

function oldKeyFromUrl(url, kind) {
  // https://.../media/exercise-video/<id>.mp4  or  exercise-poster/<id>.jpg
  const m = url.match(/\/media\/(exercise-video|exercise-poster)\/(.+)$/);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

// Build the flat list of {canonicalId, gender, kind, oldKey, newKey, newUrl, resultIndexRef}
const jobs = [];
for (const [canonicalId, assets] of Object.entries(results)) {
  for (const asset of assets) {
    const oldVideoKey = oldKeyFromUrl(asset.videoUrl);
    const oldPosterKey = oldKeyFromUrl(asset.posterUrl);
    const newVideoKey = `exercise/${canonicalId}-${asset.gender}-video.mp4`;
    const newPosterKey = `exercise/${canonicalId}-${asset.gender}-poster.jpg`;
    if (oldVideoKey) {
      jobs.push({ kind: "video", oldKey: oldVideoKey, newKey: newVideoKey, asset, field: "videoUrl" });
    }
    if (oldPosterKey) {
      jobs.push({ kind: "poster", oldKey: oldPosterKey, newKey: newPosterKey, asset, field: "posterUrl" });
    }
  }
}
console.log(`Re-keying ${jobs.length} R2 objects (video + poster pairs)...`);

const WORKER_URL = ENV.WORKER_URL;
let done = 0, ok = 0, failed = 0;
const CONCURRENCY = 6;
let idx = 0;

async function processOne(job) {
  const tmpFile = path.join(tmpDir, `${done}_${path.basename(job.newKey)}`);
  try {
    await execFileAsync("npx", ["wrangler", "r2", "object", "get", `fitai-media/${job.oldKey}`, "--file", tmpFile, "--remote"], {
      cwd: WORKERS_CWD, shell: true, env: WRANGLER_ENV,
    });
    await execFileAsync("npx", ["wrangler", "r2", "object", "put", `fitai-media/${job.newKey}`, "--file", tmpFile, "--remote"], {
      cwd: WORKERS_CWD, shell: true, env: WRANGLER_ENV,
    });
    await execFileAsync("npx", ["wrangler", "r2", "object", "delete", `fitai-media/${job.oldKey}`, "--remote"], {
      cwd: WORKERS_CWD, shell: true, env: WRANGLER_ENV,
    });
    job.asset[job.field] = `${WORKER_URL}/media/${job.newKey}`;
    ok++;
  } catch (err) {
    failed++;
    console.warn(`  rekey failed for ${job.oldKey}: ${err.message?.slice(0, 200)}`);
  } finally {
    try { fs.rmSync(tmpFile, { force: true }); } catch {}
    done++;
    if (done % 40 === 0) console.log(`  ...${done}/${jobs.length}, ${ok} ok, ${failed} failed`);
  }
}

async function worker() {
  while (idx < jobs.length) {
    await processOne(jobs[idx++]);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`Re-key done: ${ok}/${jobs.length} succeeded, ${failed} failed.`);
fs.writeFileSync(resultsPath, JSON.stringify(results, null, 1));
console.log(`Updated ${resultsPath} with corrected URLs.`);
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
