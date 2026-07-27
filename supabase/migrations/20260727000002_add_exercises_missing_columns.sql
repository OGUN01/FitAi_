-- ============================================================================
-- Migration: 20260727000002_add_exercises_missing_columns.sql
-- ============================================================================
-- Purpose: Capture two exercises columns that exist in the live DB but were
-- never declared in any migration.
--
-- Background:
--   - src/services/fitnessData.ts:9 declares the Exercise type with
--     `muscle_groups: string[]`, and :103 / :602 query
--     `exercises.difficulty_level`. The generated types
--     (src/services/supabase-types.generated.ts) confirm both columns exist
--     on the live DB.
--   - The original exercises table (20260124000001) created `difficulty`
--     (with an enum CHECK) and `target_muscle_groups` / `secondary_muscles`
--     — but NOT `difficulty_level` or `muscle_groups`.
--   - On the live DB these columns were added out-of-band (likely via a
--     manual ALTER or a now-deleted migration). They are therefore a no-op
--     on `supabase db push` against live, but this statement ensures a
--     fresh deploy also has them so fitnessData.ts queries don't fail.
--
-- Note: We intentionally do NOT add a CHECK constraint to difficulty_level
-- here, because the live column's constraint (if any) is unknown and a
-- mismatched CHECK would cause the ALTER to fail. Code filters by an exact
-- string match (eq), so a plain TEXT column is sufficient and safe.
--
-- Safe to re-run: IF NOT EXISTS is a no-op when columns already exist.
-- ============================================================================

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS difficulty_level TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS muscle_groups TEXT[];
