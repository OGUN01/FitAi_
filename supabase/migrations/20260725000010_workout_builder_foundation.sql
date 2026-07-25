-- Migration: Workout Builder Foundation (Phase 0)
-- PURPOSE: Extend the data model to support the premium custom workout builder.
-- Adds: superset/circuit/dropset fields, RPE 1-10 (alongside existing 1-3),
-- template categorization + community rating/forking, draft persistence,
-- and a cached insights JSONB column for weekly analytics.
--
-- All statements are append-only / IF NOT EXISTS — safe to re-run.
-- Follows CLAUDE.md §7: migrations are append-only, never edit existing.

-- =============================================================================
-- 1. exercise_sets: widen for superset/circuit/dropset/tempo/RPE-10
-- =============================================================================
-- The builder needs to represent supersets, circuits, drop sets, tempo, and
-- full 1-10 RPE (industry standard). Existing `rpe` (1-3, three-tap session UI)
-- is preserved — `rpe_10` is added alongside so the session UI is unaffected.

ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS tempo TEXT;

ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS superset_id UUID;

ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS circuit_id UUID;

ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS block_index INTEGER;

ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS drop_weight_kg DECIMAL(6,2);

ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS drop_reps INTEGER;

ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS rpe_10 SMALLINT CHECK (rpe_10 BETWEEN 1 AND 10);

-- Widen set_type CHECK to include 'superset' and 'circuit'.
-- The constraint is unnamed (inline CHECK) — drop and recreate.
-- Safe: existing rows all have set_type in the new allowed set.
ALTER TABLE exercise_sets
  DROP CONSTRAINT IF EXISTS exercise_sets_set_type_check;

ALTER TABLE exercise_sets
  ADD CONSTRAINT exercise_sets_set_type_check
  CHECK (set_type IN ('normal','warmup','failure','drop','superset','circuit'));

COMMENT ON COLUMN exercise_sets.tempo IS
  'Tempo string e.g. "3-1-2-0" (eccentric-pause-concentric-pause). NULL = unspecified.';
COMMENT ON COLUMN exercise_sets.superset_id IS
  'Groups sets into a superset. All sets sharing the same non-null superset_id are performed back-to-back with minimal rest.';
COMMENT ON COLUMN exercise_sets.circuit_id IS
  'Groups sets into a circuit. All sets sharing the same non-null circuit_id form one circuit round; circuit is repeated per workout plan.';
COMMENT ON COLUMN exercise_sets.block_index IS
  'Ordering within a superset or circuit (0-based).';
COMMENT ON COLUMN exercise_sets.drop_weight_kg IS
  'For drop sets only: weight of the drop portion. NULL for non-drop sets.';
COMMENT ON COLUMN exercise_sets.drop_reps IS
  'For drop sets only: reps of the drop portion. NULL for non-drop sets.';
COMMENT ON COLUMN exercise_sets.rpe_10 IS
  'Full 1-10 RPE (industry standard). Used by the workout builder for target RPE planning. Session UI continues to use the 1-3 `rpe` column; this is the planner-side scale.';

-- Index for fast superset/circuit lookups
CREATE INDEX IF NOT EXISTS idx_exercise_sets_superset
  ON exercise_sets(session_id, superset_id)
  WHERE superset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercise_sets_circuit
  ON exercise_sets(session_id, circuit_id)
  WHERE circuit_id IS NOT NULL;

-- =============================================================================
-- 2. workout_templates: community + categorization
-- =============================================================================
-- Enables the Apple-Photos-style template library (Phase 7): community browse,
-- ratings, forking, category/difficulty/tags filtering.

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS difficulty TEXT;

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0;

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS fork_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS author_name TEXT;

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL;

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_workout_templates_public
  ON workout_templates(is_public, fork_count DESC, rating_count DESC)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_workout_templates_category
  ON workout_templates(category)
  WHERE category IS NOT NULL;

COMMENT ON COLUMN workout_templates.category IS
  'Template category: e.g. upper_lower, ppl, bro_split, strength, fat_loss, home, travel.';
COMMENT ON COLUMN workout_templates.difficulty IS
  'beginner | intermediate | advanced. NULL = uncategorized.';
COMMENT ON COLUMN workout_templates.author_name IS
  'Denormalized author display name for community browse (avoids JOIN to profiles).';
COMMENT ON COLUMN workout_templates.parent_template_id IS
  'If this template was forked from another, points to the source. NULL = original.';
COMMENT ON COLUMN workout_templates.fork_count IS
  'Number of times this template has been forked by other users. Drives "Trending" sort.';

-- =============================================================================
-- 3. template_ratings: per-user ratings on public templates
-- =============================================================================
-- One rating per (template_id, user_id). UNIQUE constraint enforces this.
-- rating_avg and rating_count on workout_templates are denormalized caches
-- kept in sync by triggers (or by application code in v1).

CREATE TABLE IF NOT EXISTS template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_ratings_template
  ON template_ratings(template_id);

ALTER TABLE template_ratings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_ratings' AND policyname = 'Users can rate templates') THEN
    CREATE POLICY "Users can rate templates" ON template_ratings
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_ratings' AND policyname = 'Anyone can read ratings') THEN
    CREATE POLICY "Anyone can read ratings" ON template_ratings
      FOR SELECT USING (true);
  END IF;
END $$;

-- =============================================================================
-- 4. weekly_workout_plans: draft persistence + insights cache
-- =============================================================================
-- is_draft: marks an in-progress builder draft (crash-safe). The builder
--   autosaves drafts here; on save(), the draft row is updated to is_draft=false.
-- insights_jsonb: cached WeeklyInsights (radar/push-pull/recovery). Computed
--   client-side by workoutInsightsService, persisted here for cross-device sync.

ALTER TABLE weekly_workout_plans
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE weekly_workout_plans
  ADD COLUMN IF NOT EXISTS insights_jsonb JSONB;

COMMENT ON COLUMN weekly_workout_plans.is_draft IS
  'TRUE = in-progress builder draft (not yet saved as the active plan). Builder autosaves here for crash recovery; on save() the row is flipped to is_draft=false.';
COMMENT ON COLUMN weekly_workout_plans.insights_jsonb IS
  'Cached WeeklyInsights (push/pull ratio, muscle coverage, recovery score, volume, calorie estimate). Computed client-side by workoutInsightsService.';

CREATE INDEX IF NOT EXISTS idx_weekly_workout_plans_draft
  ON weekly_workout_plans(user_id, plan_source, is_draft, updated_at DESC)
  WHERE is_draft = true;

-- =============================================================================
-- 5. Atomic fork counter RPC (avoids read-then-write race)
-- =============================================================================
-- Mirrors the existing increment_template_usage_count pattern.

CREATE OR REPLACE FUNCTION increment_template_fork_count(template_row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE workout_templates
  SET fork_count = fork_count + 1,
      updated_at = now()
  WHERE id = template_row_id;
END;
$$;

COMMENT ON FUNCTION increment_template_fork_count IS
  'Atomically increments fork_count on a workout template. Called when a user forks a community template.';

-- =============================================================================
-- 6. Recalculate rating_avg / rating_count RPC (called after rating insert)
-- =============================================================================
-- Keeps the denormalized rating aggregates in sync without triggers (v1 choice;
-- triggers can be added later if drift is observed).

CREATE OR REPLACE FUNCTION recalc_template_rating(template_row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE workout_templates t
  SET rating_avg = COALESCE(sub.avg_rating, 0),
      rating_count = COALESCE(sub.rating_count, 0)
  FROM (
    SELECT
      AVG(rating)::DECIMAL(3,2) AS avg_rating,
      COUNT(*)::INTEGER AS rating_count
    FROM template_ratings
    WHERE template_id = template_row_id
  ) sub
  WHERE t.id = template_row_id;
END;
$$;

COMMENT ON FUNCTION recalc_template_rating IS
  'Recalculates rating_avg and rating_count on workout_templates from template_ratings. Call after inserting/updating/deleting a rating.';
