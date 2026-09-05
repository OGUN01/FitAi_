#!/usr/bin/env node
/**
 * Generates the canonical exercise catalog — the single source of truth for
 * exercise identity across the app (see Workout Engine v2, Phase 1).
 *
 * Inputs:
 *   - src/data/exerciseDatabase.min.json  — 1,500 ExerciseDB (exercisedb.dev)
 *     exercises, the same file exerciseFilterService loads at runtime (so
 *     the catalog's gifUrl/equipment/muscle data matches what the app
 *     actually serves, not the separate un-minified exerciseDatabase.json,
 *     which hotlinks a different CDN subdomain for the same exercise IDs).
 *   - src/data/curatedExercises.ts        — ~69 legacy snake_case exercises
 *     used by the custom/manual builder.
 *   - src/data/exerciseClassificationVocab.json — shared keyword/mapping
 *     vocab, also consumed at runtime by src/utils/resolveExerciseMeta.ts.
 *     Edit vocab there, not in this script.
 *
 * Outputs (both written by this script — do not hand-edit either):
 *   - src/data/exerciseCatalog.generated.ts — offline TS mirror the app
 *     reads with no network round trip.
 *   - supabase/migrations/<timestamp>_seed_exercise_catalog.sql — idempotent
 *     upsert seed for the exercise_catalog table (schema created by
 *     20260904000002_create_exercise_catalog.sql), timestamped fresh each
 *     run so it lands after that schema migration and is pushed the normal
 *     way (`npx supabase db push`).
 *
 * Curated → canonical aliasing: ONLY exact (post-normalization) name matches
 * are merged into a DB canonical row's aliases[]. Fuzzy/contains/word-overlap
 * matching was tried and rejected — it produced dangerous false positives
 * (e.g. curated "squat" fuzzy-matched to DB "bodyweight squatting row (with
 * towel)", curated "crunch" to "run"). A curated exercise without a confident
 * match becomes its OWN standalone canonical row instead of being force-
 * merged — wrong identity is worse than no identity.
 *
 * Usage: node scripts/generate-exercise-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CURATED_EXERCISES } from "../src/data/curatedExercises.ts";
import vocab from "../src/data/exerciseClassificationVocab.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const dbRaw = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/exerciseDatabase.min.json"), "utf8"),
);
const DB_EXERCISES = dbRaw.exercises;

// ── Shared vocab (mirrors resolveExerciseMeta.ts exactly) ──────────────────
const LOWER_BODY_GROUPS = new Set(vocab.lowerBodyMuscleGroups);
const TIME_BASED_KEYWORDS = vocab.timeBasedNameKeywords;
const UNILATERAL_KEYWORDS = vocab.unilateralNameKeywords;
const DB_MUSCLE_TO_GROUP = vocab.dbMuscleToGroup;
const LOADING_TYPE_BY_EQUIPMENT = vocab.loadingTypeByEquipment;
const MOVEMENT_PATTERN_PRIORITY = vocab.movementPatternPriority;
const MOVEMENT_PATTERN_KEYWORDS = vocab.movementPatternKeywords;

// exerciseDatabase.min.json has 5 rows (all "sled ... press" variants) with
// a mangled degree sign — "45В°"/"45в°" (U+0432, Cyrillic 've') instead of
// "45°" (U+00B0) — a mojibake artifact baked into the upstream ExerciseDB
// source data itself, not introduced by this generator. Fixed here (not by
// hand-editing the source JSON) so it self-heals if that file is ever
// re-downloaded from upstream. Confirmed narrow in scope (exactly these 5
// rows, this exact character) before adding — do not widen this into a
// general mojibake-repair heuristic without re-auditing the full 1,500-row
// name set, which risks over-correcting genuinely non-ASCII exercise names.
function sanitizeName(name) {
  return name.replace(/в°/g, "°");
}

function normalize(s) {
  return s.trim().toLowerCase();
}

function slugify(name) {
  return normalize(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapMuscles(muscles) {
  const groups = new Set();
  for (const m of muscles) {
    const group = DB_MUSCLE_TO_GROUP[normalize(m)];
    if (group && group !== "cardio") groups.add(group);
  }
  return [...groups];
}

function detectMovementPattern(name) {
  const n = normalize(name);
  for (const pattern of MOVEMENT_PATTERN_PRIORITY) {
    const keywords = MOVEMENT_PATTERN_KEYWORDS[pattern] ?? [];
    if (keywords.some((k) => n.includes(k))) return pattern;
  }
  return "isolation";
}

function detectLoadingType(equipment) {
  const primary = normalize(equipment[0] ?? "body weight");
  return LOADING_TYPE_BY_EQUIPMENT[primary] ?? "bodyweight";
}

function detectSkillLevel(name, equipment) {
  // Mirrors exerciseFilterService.categorizeExercises — keep both in sync.
  const n = normalize(name);
  const primary = normalize(equipment[0] ?? "body weight");
  if (
    primary === "body weight" &&
    !n.includes("advanced") &&
    !n.includes("weighted") &&
    !n.includes("one arm") &&
    !n.includes("single") &&
    !n.includes("pistol")
  ) {
    return "beginner";
  }
  if (
    primary.includes("barbell") ||
    primary.includes("olympic") ||
    n.includes("advanced") ||
    n.includes("weighted") ||
    n.includes("pistol") ||
    n.includes("muscle up") ||
    n.includes("handstand")
  ) {
    return "advanced";
  }
  return "intermediate";
}

function detectFatigueCost(movementPattern) {
  if (["squat", "hinge", "lunge", "carry"].includes(movementPattern)) return "high";
  if (
    ["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull"].includes(
      movementPattern,
    )
  ) {
    return "medium";
  }
  return "low"; // isolation, rotation
}

function detectContraindications(movementPattern, loadingType, skillLevel) {
  // Heuristic starting point for Phase 6 substitution logic, not a clinical
  // claim — derived from movement pattern + loading only, not per-exercise
  // expert review (not feasible to hand-review 1,500+ records).
  const flags = [];
  if (movementPattern === "hinge" && ["barbell", "machine"].includes(loadingType)) {
    flags.push("lower_back");
  }
  if (movementPattern === "vertical_push" && loadingType === "barbell") {
    flags.push("shoulder");
  }
  if (["squat", "lunge"].includes(movementPattern) && skillLevel === "advanced") {
    flags.push("knee");
  }
  return flags;
}

function detectDefaultRepRange(movementPattern, isTimeBased) {
  if (isTimeBased) return [null, null];
  if (["isolation", "rotation"].includes(movementPattern)) return [10, 15];
  return [8, 12];
}

function detectIncrement(isBodyweight, isTimeBased, isLowerBody) {
  if (isBodyweight || isTimeBased) return 0;
  return isLowerBody ? 5.0 : 2.5;
}

// ── Pass 1: build canonical rows from the 1,500-exercise DB ────────────────
const catalog = new Map(); // canonical_id -> entry

for (const rawEx of DB_EXERCISES) {
  const ex = { ...rawEx, name: sanitizeName(rawEx.name) };
  const primaryMuscles = mapMuscles(ex.targetMuscles);
  const secondaryMuscles = mapMuscles(ex.secondaryMuscles).filter(
    (m) => !primaryMuscles.includes(m),
  );
  const isBodyweight = ex.equipments.some((e) => normalize(e) === "body weight");
  const isTimeBased = TIME_BASED_KEYWORDS.some((k) => normalize(ex.name).includes(k));
  const isUnilateral = UNILATERAL_KEYWORDS.some((k) => normalize(ex.name).includes(k));
  const isLowerBody = [...primaryMuscles, ...secondaryMuscles].some((m) =>
    LOWER_BODY_GROUPS.has(m),
  );
  const movementPattern = detectMovementPattern(ex.name);
  const loadingType = detectLoadingType(ex.equipments);
  const skillLevel = detectSkillLevel(ex.name, ex.equipments);
  const fatigueCost = detectFatigueCost(movementPattern);

  catalog.set(ex.exerciseId, {
    canonicalId: ex.exerciseId,
    slug: slugify(ex.name),
    name: ex.name,
    aliases: [],
    primaryMuscles,
    secondaryMuscles,
    bodyPart: ex.bodyParts[0] ?? null,
    equipment: ex.equipments,
    movementPattern,
    loadingType,
    isBodyweight,
    isTimeBased,
    isUnilateral,
    defaultIncrementKg: detectIncrement(isBodyweight, isTimeBased, isLowerBody),
    defaultRepRange: detectDefaultRepRange(movementPattern, isTimeBased),
    skillLevel,
    contraindications: detectContraindications(movementPattern, loadingType, skillLevel),
    fatigueCost,
    media: [{ type: "exercisedb_gif", url: ex.gifUrl }],
    alternativeCanonicalId: null,
  });
}

// ── Pass 2: curated legacy exercises — exact-match alias or standalone row ─
const dbByExactName = new Map();
for (const ex of DB_EXERCISES) {
  dbByExactName.set(normalize(ex.name), ex.exerciseId);
}

let aliasedCount = 0;
let standaloneCount = 0;

for (const c of CURATED_EXERCISES) {
  const exactMatchId = dbByExactName.get(normalize(c.name));
  if (exactMatchId && catalog.has(exactMatchId)) {
    catalog.get(exactMatchId).aliases.push(c.id);
    aliasedCount++;
    continue;
  }

  // No confident DB match — stand alone, carrying over the curated record's
  // own (human-authored, trustworthy) classification as-is rather than
  // re-deriving it.
  standaloneCount++;
  const isLowerBody = c.muscleGroups.some((m) => LOWER_BODY_GROUPS.has(m));
  const movementPattern = detectMovementPattern(c.name);
  const loadingType = detectLoadingType(c.equipment);
  const fatigueCost = detectFatigueCost(movementPattern);

  catalog.set(c.id, {
    canonicalId: c.id,
    slug: slugify(c.name),
    name: c.name,
    aliases: [],
    primaryMuscles: c.muscleGroups,
    secondaryMuscles: [],
    bodyPart: c.category,
    equipment: c.equipment,
    movementPattern,
    loadingType,
    isBodyweight: c.isBodyweight,
    isTimeBased: c.isTimeBased,
    isUnilateral: UNILATERAL_KEYWORDS.some((k) => normalize(c.name).includes(k)),
    defaultIncrementKg: detectIncrement(c.isBodyweight, c.isTimeBased, isLowerBody),
    defaultRepRange: detectDefaultRepRange(movementPattern, c.isTimeBased),
    skillLevel: c.difficulty,
    contraindications: detectContraindications(movementPattern, loadingType, c.difficulty),
    fatigueCost,
    media: [],
    alternativeCanonicalId: null,
  });
}

const entries = [...catalog.values()].sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));

console.log(
  `Catalog: ${DB_EXERCISES.length} DB exercises + ${standaloneCount} standalone curated ` +
    `+ ${aliasedCount} aliased-into-DB curated = ${entries.length} canonical rows.`,
);

// ── Merge in 3D video ingest results (Phase 2), if present ─────────────────
// scripts/ingest-exercise-media.mjs writes scripts/ingest-results.json:
// { [canonicalId]: [{ gender: 'male'|'female', videoUrl, posterUrl }, ...] }
// Without this merge, re-running this generator (e.g. after the source
// exercise DB updates) would silently wipe out every uploaded video —
// entries would revert to gifUrl-only media[]. Video entries are prepended
// (tiered fallback: 3d_video > exercisedb_gif > poster_frame) and re-merged
// idempotently on every run.
const ingestResultsPath = path.join(ROOT, "scripts/ingest-results.json");
if (fs.existsSync(ingestResultsPath)) {
  const ingestResults = JSON.parse(fs.readFileSync(ingestResultsPath, "utf8"));
  let mergedCount = 0;
  for (const [canonicalId, assets] of Object.entries(ingestResults)) {
    const entry = catalog.get(canonicalId);
    if (!entry) continue; // stale id from a prior catalog generation — skip, don't fabricate a row
    const videoEntries = assets.flatMap((a) => [
      { type: "3d_video", url: a.videoUrl, gender: a.gender },
      { type: "poster_frame", url: a.posterUrl, gender: a.gender },
    ]);
    // Strip any previously-merged video/poster entries for this exercise
    // before re-adding (idempotent — a second run doesn't duplicate).
    entry.media = [...videoEntries, ...entry.media.filter((m) => m.type === "exercisedb_gif")];
    mergedCount++;
  }
  console.log(`Merged 3D video ingest results for ${mergedCount} exercises from ${ingestResultsPath}.`);
} else {
  console.log("No scripts/ingest-results.json found — skipping video media merge (run ingest-exercise-media.mjs first).");
}

// ── Write offline TS mirror ─────────────────────────────────────────────────
const tsPath = path.join(ROOT, "src/data/exerciseCatalog.generated.ts");
const tsHeader = `/**
 * GENERATED FILE — do not hand-edit.
 * Run \`node scripts/generate-exercise-catalog.mjs\` to regenerate.
 * Generated: ${new Date().toISOString()}
 * Source rows: ${entries.length} (${DB_EXERCISES.length} ExerciseDB + ${standaloneCount} standalone curated, ${aliasedCount} curated merged as aliases)
 *
 * The canonical exercise catalog — single source of truth for exercise
 * identity, classification (movement pattern, loading type, bodyweight/
 * time-based/unilateral flags) and media resolution. See
 * supabase/migrations/20260904000002_create_exercise_catalog.sql for the
 * matching remote schema and scripts/generate-exercise-catalog.mjs for how
 * these rows are derived.
 */

export type MovementPattern =
  | "squat" | "hinge" | "horizontal_push" | "vertical_push"
  | "horizontal_pull" | "vertical_pull" | "lunge" | "carry"
  | "rotation" | "isolation";

export type LoadingType =
  | "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "banded" | "time";

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface CatalogMediaAsset {
  type: "3d_video" | "exercisedb_gif" | "poster_frame";
  url: string;
  /** Present only on ingested 3D video/poster assets — the library has a
   * separate male- and female-presenting demo model for the same exercise.
   * Absent = gender-neutral fallback (every exercisedb_gif entry, and any
   * exercise the video library didn't cover for one/both genders). Consumers
   * filter by the viewer's stored gender, then fall back to an untagged
   * entry — see exerciseVisualService.ts. */
  gender?: "male" | "female";
}

export interface CatalogEntry {
  canonicalId: string;
  slug: string;
  name: string;
  /** Legacy curated snake_case IDs confirmed (exact name match) to be this same exercise. */
  aliases: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  bodyPart: string | null;
  equipment: string[];
  movementPattern: MovementPattern;
  loadingType: LoadingType;
  isBodyweight: boolean;
  isTimeBased: boolean;
  isUnilateral: boolean;
  defaultIncrementKg: number;
  /** [min, max] reps, or [null, null] for time-based exercises. */
  defaultRepRange: [number | null, number | null];
  skillLevel: SkillLevel;
  /** Heuristic starting point (movement pattern + loading), not a clinical claim. */
  contraindications: string[];
  fatigueCost: "low" | "medium" | "high";
  /** Ordered — prefer earlier entries (3d_video > exercisedb_gif > poster_frame). */
  media: CatalogMediaAsset[];
  alternativeCanonicalId: string | null;
}

export const EXERCISE_CATALOG: CatalogEntry[] = ${JSON.stringify(entries, null, 2)};

const BY_CANONICAL_ID = new Map<string, CatalogEntry>(
  EXERCISE_CATALOG.map((e) => [e.canonicalId, e]),
);
const BY_ALIAS = new Map<string, CatalogEntry>();
for (const entry of EXERCISE_CATALOG) {
  for (const alias of entry.aliases) BY_ALIAS.set(alias, entry);
}

/**
 * Resolve any known exerciseId (canonical ExerciseDB hash ID or legacy
 * curated alias) to its catalog entry. Returns null if unresolved — callers
 * must not fabricate defaults on a null result, per FitAI's no-hardcoded-
 * fallbacks-for-user-data rule; surface it as unresolved instead.
 */
export function getCatalogEntry(exerciseId: string | undefined): CatalogEntry | null {
  if (!exerciseId) return null;
  return BY_CANONICAL_ID.get(exerciseId) ?? BY_ALIAS.get(exerciseId) ?? null;
}
`;

fs.writeFileSync(tsPath, tsHeader, "utf8");
console.log(`Wrote ${tsPath}`);

// ── Write seed SQL migration ────────────────────────────────────────────────
function sqlString(s) {
  if (s === null || s === undefined) return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}
function sqlStringArray(arr) {
  if (!arr || arr.length === 0) return "'{}'";
  return `ARRAY[${arr.map((s) => sqlString(s)).join(",")}]::TEXT[]`;
}
function sqlIntOrNull(n) {
  return n === null || n === undefined ? "NULL" : String(n);
}
function sqlJsonb(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

const valuesRows = entries.map((e) => {
  return `(${sqlString(e.canonicalId)}, ${sqlString(e.slug)}, ${sqlString(e.name)}, ` +
    `${sqlStringArray(e.aliases)}, ${sqlStringArray(e.primaryMuscles)}, ${sqlStringArray(e.secondaryMuscles)}, ` +
    `${sqlString(e.bodyPart)}, ${sqlStringArray(e.equipment)}, ${sqlString(e.movementPattern)}, ` +
    `${sqlString(e.loadingType)}, ${e.isBodyweight}, ${e.isTimeBased}, ${e.isUnilateral}, ` +
    `${e.defaultIncrementKg}, ${sqlIntOrNull(e.defaultRepRange[0])}, ${sqlIntOrNull(e.defaultRepRange[1])}, ` +
    `${sqlString(e.skillLevel)}, ${sqlStringArray(e.contraindications)}, ${sqlString(e.fatigueCost)}, ` +
    `${sqlJsonb(e.media)})`;
});

const timestamp = new Date()
  .toISOString()
  .replace(/[-:T]/g, "")
  .slice(0, 14);
const sqlPath = path.join(
  ROOT,
  `supabase/migrations/${timestamp}_seed_exercise_catalog.sql`,
);

// Batch INSERTs (500 rows/statement) — a single 1,500+ row VALUES list is
// unwieldy to review as a diff; batching keeps each statement legible.
const BATCH_SIZE = 500;
const batches = [];
for (let i = 0; i < valuesRows.length; i += BATCH_SIZE) {
  batches.push(valuesRows.slice(i, i + BATCH_SIZE));
}

const sqlContent = `-- GENERATED FILE — do not hand-edit.
-- Run \`node scripts/generate-exercise-catalog.mjs\` to regenerate (it will
-- write a new timestamped seed file each run; do not edit this one in place).
-- Seeds exercise_catalog (schema: 20260904000002_create_exercise_catalog.sql)
-- with ${entries.length} rows. Idempotent — safe to re-run: ON CONFLICT
-- updates every column so re-running after a generator change fully refreshes
-- the table rather than leaving stale rows.

${batches
  .map(
    (batch, i) => `INSERT INTO exercise_catalog (
  canonical_id, slug, name, aliases, primary_muscles, secondary_muscles,
  body_part, equipment, movement_pattern, loading_type, is_bodyweight,
  is_time_based, is_unilateral, default_increment_kg, default_rep_range_min,
  default_rep_range_max, skill_level, contraindications, fatigue_cost, media
) VALUES
${batch.join(",\n")}
ON CONFLICT (canonical_id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  aliases = EXCLUDED.aliases,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  body_part = EXCLUDED.body_part,
  equipment = EXCLUDED.equipment,
  movement_pattern = EXCLUDED.movement_pattern,
  loading_type = EXCLUDED.loading_type,
  is_bodyweight = EXCLUDED.is_bodyweight,
  is_time_based = EXCLUDED.is_time_based,
  is_unilateral = EXCLUDED.is_unilateral,
  default_increment_kg = EXCLUDED.default_increment_kg,
  default_rep_range_min = EXCLUDED.default_rep_range_min,
  default_rep_range_max = EXCLUDED.default_rep_range_max,
  skill_level = EXCLUDED.skill_level,
  contraindications = EXCLUDED.contraindications,
  fatigue_cost = EXCLUDED.fatigue_cost,
  media = EXCLUDED.media,
  generated_at = now();
-- batch ${i + 1}/${batches.length}
`,
  )
  .join("\n")}
`;

fs.writeFileSync(sqlPath, sqlContent, "utf8");
console.log(`Wrote ${sqlPath} (${batches.length} batch${batches.length === 1 ? "" : "es"})`);
