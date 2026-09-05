-- Workout Engine v2, Phase 4: exercise_sets.superset_id / circuit_id column
-- type mismatch.
--
-- These columns were added as UUID by 20260725000010_workout_builder_
-- foundation.sql, but the workout builder (ExerciseEditorSheet.tsx
-- handleGroupMode/handleGroupWithSibling) has always generated their actual
-- values as plain strings — `ss_${Date.now().toString(36)}` and
-- `circuit_${Date.now().toString(36)}` (e.g. "ss_lz3k9x2") — never UUIDs.
-- No session-completion code path wrote to these columns yet (Phase 4 is
-- the first), so this is caught before any insert could fail with
-- "invalid input syntax for type uuid", not a live incident.
--
-- Per CLAUDE.md #4 (Schema + Code Must Match): the code's ID format is
-- correct and shipped in the builder UI already — the schema is what's
-- wrong, so the schema is what changes. No existing rows have non-NULL
-- values in these columns (nothing ever wrote to them), so this ALTER is
-- lossless regardless.

ALTER TABLE exercise_sets
  ALTER COLUMN superset_id TYPE TEXT USING superset_id::text;

ALTER TABLE exercise_sets
  ALTER COLUMN circuit_id TYPE TEXT USING circuit_id::text;
