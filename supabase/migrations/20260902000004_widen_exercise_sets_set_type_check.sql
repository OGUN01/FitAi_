-- ============================================================================
-- Widen exercise_sets.set_type CHECK constraint
-- ============================================================================
-- Goal Engine Phase A.2: Ensure exercise_sets.set_type accepts 'superset' and
-- 'circuit' in addition to 'normal','warmup','failure','drop', matching
-- PlannedSet.setType in src/types/workout.ts. Without this, logging a custom
-- plan that contains a superset or circuit set violates the CHECK constraint.
--
-- NOTE: This constraint was ALREADY widened by 20260725000010_workout_builder_foundation.sql
-- (lines 41-46), which drops exercise_sets_set_type_check and re-adds it with
-- the expanded set. This migration is a defensive re-assertion of the same
-- state — fully idempotent (DROP IF EXISTS then ADD) so it is safe whether or
-- not 20260725000010 applied cleanly. It guarantees the constraint is in the
-- desired state on every database this migration runs against, independent of
-- the ordering/success of prior migrations.
--
-- Constraint name confirmed from 20260326000001_create_exercise_sets.sql: the
-- inline CHECK auto-generates the name exercise_sets_set_type_check.
--
-- Safe to re-run: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT is idempotent.
-- ============================================================================

ALTER TABLE exercise_sets
  DROP CONSTRAINT IF EXISTS exercise_sets_set_type_check;

ALTER TABLE exercise_sets
  ADD CONSTRAINT exercise_sets_set_type_check
  CHECK (set_type IN ('normal', 'warmup', 'failure', 'drop', 'superset', 'circuit'));
