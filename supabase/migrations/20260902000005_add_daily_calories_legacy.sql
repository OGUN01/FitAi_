-- ============================================================================
-- advanced_review.daily_calories_legacy
-- ============================================================================
-- Goal Engine Phase A.2: Snapshot column holding the pre-fix daily calorie
-- value so support can explain any user's before/after when the unified energy
-- engine recomputes advanced_review.daily_calories on next app open and clamps
-- to the food floor.
--
-- DEVIATION NOTE (flagged for the orchestrator):
--   The task scope summary listed this as "profiles.daily_calories_legacy",
--   but the approved plan body (the designated spec, Phase A "Existing-user
--   migration") explicitly states: "Keep the prior value in advanced_review
--   (new daily_calories_legacy column)". daily_calories itself lives on
--   advanced_review (20250119000000_create_onboarding_tables.sql:238) and is
--   what useCalculatedMetrics reads, so the before/after snapshot belongs on
--   the same row. This migration follows the plan body (advanced_review).
--
-- Type is NUMERIC (per the plan/scope) rather than INTEGER to match the
-- explicit request; NUMERIC is a superset of the existing INTEGER column and
-- holds the legacy integer value without loss.
--
-- Append-only / safe to re-run (ADD COLUMN IF NOT EXISTS).
-- ============================================================================

ALTER TABLE advanced_review
  ADD COLUMN IF NOT EXISTS daily_calories_legacy NUMERIC;

COMMENT ON COLUMN advanced_review.daily_calories_legacy IS
  'Goal Engine Phase A.2: Pre-fix snapshot of daily_calories captured before the unified energy engine recomputes it, so support can explain a user''s before/after. NULL until the one-time recompute runs.';
