#!/usr/bin/env node
/**
 * Ingests the 3D exercise video library into the canonical exercise catalog
 * (Workout Engine v2, Phase 2).
 *
 * Source layout: <VIDEO_ROOT>/<men|girl>/<bodypart>/<Exercise Name>.mp4
 * The two top-level folders are GENDER VARIANTS of the same exercise
 * library (a male- and female-presenting demo model), not duplicates to
 * dedupe — every matched video from BOTH folders is uploaded and tagged
 * `gender: 'male' | 'female'` on its own CatalogMediaAsset entry.
 *
 * Pipeline:
 *   1. Walk the video folder, build a flat list of candidates.
 *   2. Tier 1 — filename normalization match against catalog name/aliases/slug.
 *      Conservative: exact or near-exact only (>=0.92 word-overlap AND a
 *      single unambiguous best candidate). Anything less confident is left
 *      for tier 2 rather than guessed — a prior pass at this in the same
 *      project found naive fuzzy matching producing real false positives.
 *   3. Tier 2 — Gemini adjudication (via the Vercel AI Gateway, same
 *      provider path as fitai-workers/src/utils/aiProvider.ts) for the
 *      unmatched remainder: sample a frame, give Gemini a shortlist of
 *      top-K candidates by word overlap, ask it to pick one or "none".
 *   4. Transcode (ffmpeg, H.264 MP4 + poster jpg) and upload to R2 under
 *      exercises/<canonicalId>/video-<gender>.mp4 + poster-<gender>.jpg
 *      for every confidently-matched video.
 *   5. Write ingest-results.json — consumed by generate-exercise-catalog.mjs
 *      to merge tagged media entries into the catalog on regeneration.
 *   6. Write a review CSV for manual spot-checking.
 *
 * Usage:
 *   node scripts/ingest-exercise-media.mjs --stage=inventory   # dry run, tier 1 only, no network/ffmpeg
 *   node scripts/ingest-exercise-media.mjs --stage=full        # tier 1 + tier 2 + transcode + upload
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const VIDEO_ROOT =
  'C:\\Users\\Harsh\\Downloads\\exercise (whitout watermark)-20260904T090820Z-1-001\\exercise (whitout watermark)';
const FFMPEG =
  'C:\\Users\\Harsh\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe';
const FFPROBE = FFMPEG.replace('ffmpeg.exe', 'ffprobe.exe');

const args = process.argv.slice(2);
const stageArg = args.find((a) => a.startsWith('--stage='));
const STAGE = stageArg ? stageArg.split('=')[1] : 'inventory';

// ── Load env (.env.local at repo root — AI_GATEWAY_API_KEY, CLOUDFLARE_*, R2_*) ──
function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const ENV = { ...loadEnv(path.join(ROOT, '.env.local')), ...process.env };

// ── Load catalog ─────────────────────────────────────────────────────────
const { EXERCISE_CATALOG } = await import(
  pathToFileURL(path.join(ROOT, 'src/data/exerciseCatalog.generated.ts')).href
);
console.log(`Loaded ${EXERCISE_CATALOG.length} catalog entries.`);

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ') // strip parenthetical qualifiers for the base compare
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bs\b/g, '') // crude plural fold ("sit ups" -> "sit up")
    .trim()
    .replace(/\s+/g, ' ');
}
function normalizeKeepParens(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9()]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Build search index: canonicalId -> Set of normalized name variants.
const catalogIndex = EXERCISE_CATALOG.map((entry) => {
  const names = new Set([entry.name, entry.slug.replace(/-/g, ' '), ...entry.aliases.map((a) => a.replace(/_/g, ' '))]);
  return {
    entry,
    normalizedNames: [...names].map(normalize).filter(Boolean),
    words: new Set(normalize(entry.name).split(' ').filter((w) => w.length > 1)),
  };
});
const exactIndex = new Map();
for (const rec of catalogIndex) {
  for (const n of rec.normalizedNames) {
    if (!exactIndex.has(n)) exactIndex.set(n, []);
    exactIndex.get(n).push(rec);
  }
}

function wordOverlapScore(aWords, bWords) {
  const inter = [...aWords].filter((w) => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union === 0 ? 0 : inter / union;
}

function findMatch(videoNameNormalized) {
  const exact = exactIndex.get(videoNameNormalized);
  if (exact && exact.length === 1) return { entry: exact[0].entry, tier: 'exact', score: 1 };
  if (exact && exact.length > 1) {
    // Ambiguous exact match (same normalized name used by >1 catalog row) —
    // do not guess which one; leave for tier 2.
    return null;
  }
  const videoWords = new Set(videoNameNormalized.split(' ').filter((w) => w.length > 1));
  if (videoWords.size === 0) return null;
  let best = null;
  let bestScore = 0;
  let secondBestScore = 0;
  for (const rec of catalogIndex) {
    const score = wordOverlapScore(videoWords, rec.words);
    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      best = rec;
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  }
  // Conservative near-exact acceptance: high absolute score AND a clear
  // margin over the runner-up (avoids accepting when two candidates are
  // both plausible).
  if (best && bestScore >= 0.92 && bestScore - secondBestScore >= 0.15) {
    return { entry: best.entry, tier: 'near_exact', score: bestScore };
  }
  return null;
}

/** Top-K candidates by word overlap, for the Gemini shortlist (tier 2). */
function topCandidates(videoNameNormalized, k = 8) {
  const videoWords = new Set(videoNameNormalized.split(' ').filter((w) => w.length > 1));
  const scored = catalogIndex
    .map((rec) => ({ rec, score: wordOverlapScore(videoWords, rec.words) }))
    .filter((s) => s.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return scored.map((s) => s.rec.entry);
}

// ── Walk the video folder ────────────────────────────────────────────────
const GENDER_DIRS = { men: 'male', girl: 'female' };
const candidates = [];
for (const [dirName, gender] of Object.entries(GENDER_DIRS)) {
  const genderPath = path.join(VIDEO_ROOT, dirName);
  if (!fs.existsSync(genderPath)) continue;
  for (const bodyPartDir of fs.readdirSync(genderPath, { withFileTypes: true })) {
    if (!bodyPartDir.isDirectory()) continue;
    const subPath = path.join(genderPath, bodyPartDir.name);
    for (const file of fs.readdirSync(subPath)) {
      if (!file.toLowerCase().endsWith('.mp4')) continue;
      const rawName = file.replace(/\.mp4$/i, '');
      candidates.push({
        absPath: path.join(subPath, file),
        gender,
        bodyPartFolder: bodyPartDir.name,
        filename: file,
        rawName,
        normalizedName: normalize(rawName),
      });
    }
  }
}
console.log(`Found ${candidates.length} video candidates across ${Object.keys(GENDER_DIRS).length} gender folders.`);

// ── Tier 1 matching ──────────────────────────────────────────────────────
const results = []; // { ...candidate, matchedId, matchedName, tier, score }
let tier1Count = 0;
for (const c of candidates) {
  const match = findMatch(c.normalizedName);
  if (match) {
    tier1Count++;
    results.push({ ...c, matchedId: match.entry.canonicalId, matchedName: match.entry.name, tier: match.tier, score: match.score.toFixed(2) });
  } else {
    results.push({ ...c, matchedId: null, matchedName: null, tier: 'unmatched', score: '' });
  }
}
console.log(`Tier 1 (filename): ${tier1Count}/${candidates.length} matched.`);
const unmatched = results.filter((r) => r.tier === 'unmatched');
console.log(`Remaining for tier 2 (Gemini): ${unmatched.length}`);

// Write intermediate inventory always (cheap, useful even for inventory-only runs).
fs.writeFileSync(
  path.join(ROOT, 'scripts/ingest-inventory.json'),
  JSON.stringify({ totalCandidates: candidates.length, tier1Matched: tier1Count, unmatchedCount: unmatched.length, results }, null, 1),
);
console.log('Wrote scripts/ingest-inventory.json');

if (STAGE === 'inventory') {
  console.log('\n--- STAGE=inventory: stopping before tier 2 / transcode / upload ---');
  const byBodyPart = {};
  for (const c of candidates) byBodyPart[`${c.gender}/${c.bodyPartFolder}`] = (byBodyPart[`${c.gender}/${c.bodyPartFolder}`] ?? 0) + 1;
  console.log(JSON.stringify(byBodyPart, null, 1));
  process.exit(0);
}

// ── Tier 2: Gemini adjudication for the unmatched remainder ────────────────
async function runTier2() {
  if (!ENV.AI_GATEWAY_API_KEY) {
    console.warn('AI_GATEWAY_API_KEY not set — skipping tier 2, leaving remainder unmatched.');
    return;
  }
  const { createGateway, generateObject } = await import('ai');
  const { z } = await import('zod');
  const gateway = createGateway({ apiKey: ENV.AI_GATEWAY_API_KEY });
  const model = gateway('google/gemini-3.5-flash-lite');

  const toProcess = results.filter((r) => r.tier === 'unmatched');
  console.log(`Tier 2: adjudicating ${toProcess.length} videos with Gemini...`);

  const CONCURRENCY = 6;
  let done = 0;
  let matched = 0;

  async function processOne(rec) {
    try {
      const candidateEntries = topCandidates(rec.normalizedName, 8);
      if (candidateEntries.length === 0) return; // nothing plausible — stays unmatched
      const framePath = path.join(ROOT, `scripts/.tmp_frames/${path.basename(rec.absPath)}.jpg`);
      fs.mkdirSync(path.dirname(framePath), { recursive: true });
      await execFileAsync(FFMPEG, ['-y', '-ss', '00:00:01.5', '-i', rec.absPath, '-frames:v', '1', '-q:v', '4', framePath]);
      const imgBuf = fs.readFileSync(framePath);
      const base64 = 'data:image/jpeg;base64,' + imgBuf.toString('base64');
      const optionIds = candidateEntries.map((e) => e.canonicalId);
      const optionLabels = candidateEntries.map((e) => `${e.canonicalId}: ${e.name}`).join('; ');
      const schema = z.object({ canonicalId: z.enum([...optionIds, 'none']) });
      const result = await generateObject({
        model,
        schema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  `This is a frame from an exercise demo video named "${rec.rawName}". ` +
                  `Which candidate exercise (by canonicalId) does it show? Candidates: ${optionLabels}. ` +
                  `Answer "none" if none plausibly match.`,
              },
              { type: 'image', image: base64 },
            ],
          },
        ],
      });
      fs.unlinkSync(framePath);
      if (result.object.canonicalId !== 'none') {
        const matchedEntry = candidateEntries.find((e) => e.canonicalId === result.object.canonicalId);
        rec.matchedId = matchedEntry.canonicalId;
        rec.matchedName = matchedEntry.name;
        rec.tier = 'gemini';
        rec.score = '';
        matched++;
      }
    } catch (err) {
      console.warn(`  tier2 failed for "${rec.rawName}": ${err.message}`);
    } finally {
      done++;
      if (done % 25 === 0) console.log(`  ...${done}/${toProcess.length} processed, ${matched} matched so far`);
    }
  }

  // Bounded concurrency pool.
  let idx = 0;
  async function worker() {
    while (idx < toProcess.length) {
      const rec = toProcess[idx++];
      await processOne(rec);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Tier 2 done: ${matched}/${toProcess.length} matched via Gemini.`);
  try {
    fs.rmSync(path.join(ROOT, 'scripts/.tmp_frames'), { recursive: true, force: true });
  } catch {}
}

// ── Transcode + upload ──────────────────────────────────────────────────────
async function transcodeAndUpload() {
  const matchedResults = results.filter((r) => r.matchedId);
  console.log(`Transcoding + uploading ${matchedResults.length} confidently-matched videos...`);

  const outDir = path.join(ROOT, 'scripts/.tmp_transcoded');
  fs.mkdirSync(outDir, { recursive: true });

  const ingestOutput = {}; // canonicalId -> [{gender, videoUrl, posterUrl}]
  const R2_PUBLIC_BASE = ENV.R2_PUBLIC_BASE_URL || null; // may not exist — see report

  const CONCURRENCY = 3; // ffmpeg + wrangler upload are heavier than tier2's API calls
  let idx = 0;
  let done = 0;
  let uploaded = 0;
  let failed = 0;

  async function processOne(rec) {
    const videoOut = path.join(outDir, `${rec.matchedId}-${rec.gender}.mp4`);
    const posterOut = path.join(outDir, `${rec.matchedId}-${rec.gender}.jpg`);
    try {
      // Re-encode to a web-friendly H.264/AAC MP4, capped at a reasonable
      // bitrate/resolution for a mobile app demo clip.
      await execFileAsync(FFMPEG, [
        '-y', '-i', rec.absPath,
        '-vf', "scale='min(720,iw)':-2",
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
        '-an', // these demo clips have no meaningful audio track
        '-movflags', '+faststart',
        videoOut,
      ]);
      await execFileAsync(FFMPEG, ['-y', '-ss', '00:00:01.0', '-i', videoOut, '-frames:v', '1', '-q:v', '4', posterOut]);

      // R2 keys use the FLAT `category/id` scheme the already-deployed
      // GET /media/:category/:id route (fitai-workers/src/handlers/
      // mediaHandler.ts) actually supports — Hono's :id param does not match
      // across "/", so a nested exercises/<id>/video.mp4 key would 404
      // through that route. This reuses the existing public (rate-limited,
      // unauthenticated GET), no-deploy-needed serving path.
      const videoId = `${rec.matchedId}-${rec.gender}.mp4`;
      const posterId = `${rec.matchedId}-${rec.gender}.jpg`;
      const videoKey = `exercise-video/${videoId}`;
      const posterKey = `exercise-poster/${posterId}`;
      const wranglerEnv = { ...process.env, CLOUDFLARE_API_TOKEN: ENV.CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID: ENV.CLOUDFLARE_ACCOUNT_ID };
      await execFileAsync('npx', ['wrangler', 'r2', 'object', 'put', `fitai-media/${videoKey}`, '--file', videoOut, '--remote'], {
        cwd: path.join(ROOT, 'fitai-workers'),
        shell: true,
        env: wranglerEnv,
      });
      await execFileAsync('npx', ['wrangler', 'r2', 'object', 'put', `fitai-media/${posterKey}`, '--file', posterOut, '--remote'], {
        cwd: path.join(ROOT, 'fitai-workers'),
        shell: true,
        env: wranglerEnv,
      });

      // NOTE: mediaHandler.ts's MEDIA_TYPES map does not include "mp4" yet
      // (gif/jpg/jpeg/png/webp/svg only) — it will serve these with
      // Content-Type: application/octet-stream until that map is extended
      // and the worker redeployed. Flagged in the ingest report; not fixed
      // here since it requires a live worker deploy, out of scope for an
      // isolated ingest run.
      const videoUrl = R2_PUBLIC_BASE ? `${R2_PUBLIC_BASE}/${videoKey}` : `${ENV.WORKER_URL}/media/${videoKey}`;
      const posterUrl = R2_PUBLIC_BASE ? `${R2_PUBLIC_BASE}/${posterKey}` : `${ENV.WORKER_URL}/media/${posterKey}`;

      if (!ingestOutput[rec.matchedId]) ingestOutput[rec.matchedId] = [];
      ingestOutput[rec.matchedId].push({ gender: rec.gender, videoUrl, posterUrl });
      uploaded++;
      rec.uploaded = true;
      rec.videoUrl = videoUrl;
      rec.posterUrl = posterUrl;
    } catch (err) {
      failed++;
      rec.uploaded = false;
      rec.uploadError = err.message?.slice(0, 300);
      console.warn(`  upload failed for "${rec.rawName}" (${rec.matchedId}): ${err.message?.slice(0, 200)}`);
    } finally {
      try { fs.rmSync(videoOut, { force: true }); } catch {}
      try { fs.rmSync(posterOut, { force: true }); } catch {}
      done++;
      if (done % 20 === 0) console.log(`  ...${done}/${matchedResults.length} processed, ${uploaded} uploaded, ${failed} failed`);
    }
  }

  async function worker() {
    while (idx < matchedResults.length) {
      const rec = matchedResults[idx++];
      await processOne(rec);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Upload done: ${uploaded} succeeded, ${failed} failed.`);
  try {
    fs.rmSync(outDir, { recursive: true, force: true });
  } catch {}
  return ingestOutput;
}

// ── Run tier 2 + upload, write outputs ──────────────────────────────────────
await runTier2();

const tier2MatchedCount = results.filter((r) => r.tier === 'gemini').length;
console.log(`\nCombined match rate: ${results.filter((r) => r.matchedId).length}/${results.length} (tier1=${tier1Count}, tier2=${tier2MatchedCount})`);

const ingestOutput = await transcodeAndUpload();

fs.writeFileSync(path.join(ROOT, 'scripts/ingest-results.json'), JSON.stringify(ingestOutput, null, 1));
console.log(`Wrote scripts/ingest-results.json (${Object.keys(ingestOutput).length} canonical exercises with new media)`);

// Review CSV
const csvHeader = 'filename,gender,bodyPartFolder,matchedId,matchedName,tier,score,uploaded,uploadError\n';
const csvRows = results
  .map((r) =>
    [r.filename, r.gender, r.bodyPartFolder, r.matchedId ?? '', r.matchedName ?? '', r.tier, r.score, r.uploaded ?? '', (r.uploadError ?? '').replace(/[\n,]/g, ' ')]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )
  .join('\n');
fs.writeFileSync(path.join(ROOT, 'scripts/ingest-review.csv'), csvHeader + csvRows);
console.log('Wrote scripts/ingest-review.csv');

export { results, unmatched, topCandidates, ENV, FFMPEG, FFPROBE, ROOT, GENDER_DIRS };
