-- ============================================================================
-- profiles.goal_targets_mode
-- ============================================================================
-- Goal Engine Phase A.2: Persist the shared target-source toggle.
--
-- A single field on profiles (NOT one per plan table) that records whether the
-- app's daily calorie/macro targets should follow the onboarding-goal-derived
-- number ('goal') or the active custom plan's number ('plan'). The decision in
-- the approved plan was explicit: "applies to BOTH diet and workout" — one
-- shared toggle, not two per-domain columns that can silently diverge.
--
-- Mirrors the existing active_diet_source / active_plan_source pattern on
-- profiles (see 20260901000001 and 20260331000001).
--
-- Reset rule (enforced in code, not here): flips back to 'goal' automatically
-- whenever setActiveDietSource('ai') or setActivePlanSource('ai') fires —
-- 'plan' mode was a decision about a *specific* custom plan and must not keep
-- governing targets once that plan is no longer active.
--
-- Append-only / safe to re-run (IF NOT EXISTS + DO $$ guard on the CHECK).
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS goal_targets_mode TEXT NOT NULL DEFAULT 'goal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_goal_targets_mode_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_goal_targets_mode_check
      CHECK (goal_targets_mode IN ('goal', 'plan'));
  END IF;
END $$;
