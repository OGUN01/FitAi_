-- Workout Engine v2, Phase 1: canonical exercise catalog.
--
-- Single source of truth for exercise identity. Before this table, exercise
-- identity was split across two disjoint, mostly-unbridged ID spaces:
--   - ~1,500 ExerciseDB (exercisedb.dev) hash IDs (e.g. "VPPtusI") — used by
--     AI-generated plans, sourced from src/data/exerciseDatabase.json
--   - ~69 legacy curated snake_case IDs (e.g. "push_up") — used by the
--     custom/manual workout builder, sourced from src/data/curatedExercises.ts
-- bridged by exactly 5 hand-written rows in src/data/exerciseIdMap.ts (which
-- had zero importers — dead code, now removed). Every exercise-classifying
-- consumer (progressionService weight increments, warmupService warm-up
-- protocol selection, muscle-heatmap analytics) either only recognized the
-- curated IDs or silently defaulted for anything else.
--
-- This table is generated (not hand-authored) — see
-- scripts/generate-exercise-catalog.mjs — and mirrored offline at
-- src/data/exerciseCatalog.generated.ts so the app works without a network
-- round trip. Re-running the generator and re-applying its seed migration is
-- how the catalog is updated; do not hand-edit rows here.
--
-- aliases[] carries curated snake_case IDs that were confirmed (by exact
-- name match, not fuzzy matching — see the generator's matching notes) to be
-- the same movement as a canonical ExerciseDB hash-ID row. Curated exercises
-- that don't have a confident DB match remain their own canonical rows
-- (canonical_id = the curated snake_case ID) rather than being force-merged.

CREATE TABLE IF NOT EXISTS exercise_catalog (
  canonical_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',

  primary_muscles TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  body_part TEXT,
  equipment TEXT[] NOT NULL DEFAULT '{}',

  movement_pattern TEXT NOT NULL DEFAULT 'isolation'
    CHECK (movement_pattern IN (
      'squat', 'hinge', 'horizontal_push', 'vertical_push',
      'horizontal_pull', 'vertical_pull', 'lunge', 'carry',
      'rotation', 'isolation'
    )),
  loading_type TEXT NOT NULL DEFAULT 'bodyweight'
    CHECK (loading_type IN (
      'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'banded', 'time'
    )),

  is_bodyweight BOOLEAN NOT NULL DEFAULT false,
  is_time_based BOOLEAN NOT NULL DEFAULT false,
  is_unilateral BOOLEAN NOT NULL DEFAULT false,

  default_increment_kg NUMERIC(4,1) NOT NULL DEFAULT 0,
  default_rep_range_min INTEGER,
  default_rep_range_max INTEGER,

  skill_level TEXT NOT NULL DEFAULT 'intermediate'
    CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),

  -- Heuristic starting point for Phase 6 substitution logic, not a clinical
  -- claim — derived from movement pattern + loading, not per-exercise review.
  contraindications TEXT[] NOT NULL DEFAULT '{}',

  fatigue_cost TEXT NOT NULL DEFAULT 'medium'
    CHECK (fatigue_cost IN ('low', 'medium', 'high')),

  -- Ordered [{type: '3d_video'|'exercisedb_gif'|'poster_frame', url, ...}].
  -- Empty until Phase 2's ingest pipeline populates 3d_video entries; the
  -- generator seeds exercisedb_gif from the existing hotlinked CDN URL so
  -- resolution never regresses in the meantime.
  media JSONB NOT NULL DEFAULT '[]',

  -- Runtime-declared alternative for equipment/pain/movement-pattern swaps
  -- (Phase 4). Not populated by the generator — no producer yet.
  alternative_canonical_id TEXT REFERENCES exercise_catalog(canonical_id),

  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_catalog_movement_pattern
  ON exercise_catalog (movement_pattern);
CREATE INDEX IF NOT EXISTS idx_exercise_catalog_loading_type
  ON exercise_catalog (loading_type);
CREATE INDEX IF NOT EXISTS idx_exercise_catalog_aliases
  ON exercise_catalog USING GIN (aliases);
CREATE INDEX IF NOT EXISTS idx_exercise_catalog_primary_muscles
  ON exercise_catalog USING GIN (primary_muscles);

-- Read-only reference data, world-readable (not user-owned) — same pattern
-- as any other global lookup table. No write policy: only the generator's
-- seed migration writes to this table, never client code.
ALTER TABLE exercise_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercise_catalog_select_all" ON exercise_catalog;
CREATE POLICY "exercise_catalog_select_all" ON exercise_catalog
  FOR SELECT USING (true);
