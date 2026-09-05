-- ============================================================================
-- TABLE: plan_acknowledgments
-- ============================================================================
-- Goal Engine Phase A.2: Audit trail of plan warnings the user explicitly
-- accepted ("logged overrides"). When a Save & Activate carries a
-- targets_mode toggle and a plan that trips warnings (training-load, rate
-- band, etc.), a row is written here recording exactly which warning codes
-- were shown and the payload that was displayed, so support can see what the
-- user agreed to and so the app can suppress re-prompting for acknowledged
-- warnings (except the always-on <1000 kcal safety check-in, which ignores
-- any acknowledgment).
--
-- plan_id is a plain UUID with NO foreign key, by design: diet plans and
-- workout plans live in different tables (weekly_meal_plans vs.
-- weekly_workout_plans — and the legacy user_meal_plans / user_workout_plans).
-- A single column cannot cleanly FK to two tables, and a conditional FK is not
-- supported in Postgres. plan_kind records which kind of plan the id refers
-- to; the application layer resolves the id against the right table. Leaving
-- plan_id nullable also covers acknowledgments raised against a draft plan
-- that was never persisted as a row.
--
-- plan_kind has no CHECK constraint (deliberately, mirroring health_metrics'
-- metric_type): the set of plan kinds can grow without a migration. Current
-- values: 'diet' | 'workout'.
--
-- Append-only / safe to re-run (IF NOT EXISTS + DO $$ guards).
-- RLS enforced — auth.uid() = user_id.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plan_acknowledgments (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id         UUID,        -- see header: no FK, resolved by plan_kind in app code
  plan_kind       TEXT,        -- 'diet' | 'workout' (no CHECK so the set can grow)
  warning_codes   TEXT[]       DEFAULT '{}',
  shown_payload   JSONB,
  acknowledged_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.plan_acknowledgments IS
  'Goal Engine Phase A.2: Logged overrides — records which plan warnings a user accepted at Save & Activate, with the exact warning codes and payload shown. The always-on <1000 kcal safety check-in ignores any acknowledgment.';

COMMENT ON COLUMN public.plan_acknowledgments.plan_id IS
  'UUID of the plan the acknowledgment concerns. NO foreign key: diet and workout plans live in different tables (weekly_meal_plans vs. weekly_workout_plans), which a single column cannot FK to both. plan_kind records which table to resolve against. Nullable to cover draft-plan acknowledgments.';

COMMENT ON COLUMN public.plan_acknowledgments.plan_kind IS
  'Which kind of plan plan_id refers to: diet or workout. No CHECK constraint (deliberately, like health_metrics.metric_type) so the set can grow without a migration.';

-- Index for the common query: all acknowledgments for a user, newest first.
CREATE INDEX IF NOT EXISTS idx_plan_acknowledgments_user
  ON public.plan_acknowledgments (user_id, acknowledged_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Users can only read/insert/update/delete their own acknowledgments.
-- Four-policy style with WITH CHECK on INSERT/UPDATE, guarded with DO $$ for
-- re-run safety.
-- ============================================================================
ALTER TABLE public.plan_acknowledgments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'plan_acknowledgments'
      AND policyname = 'Users can read own plan acknowledgments'
  ) THEN
    CREATE POLICY "Users can read own plan acknowledgments"
      ON public.plan_acknowledgments
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'plan_acknowledgments'
      AND policyname = 'Users can insert own plan acknowledgments'
  ) THEN
    CREATE POLICY "Users can insert own plan acknowledgments"
      ON public.plan_acknowledgments
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'plan_acknowledgments'
      AND policyname = 'Users can update own plan acknowledgments'
  ) THEN
    CREATE POLICY "Users can update own plan acknowledgments"
      ON public.plan_acknowledgments
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'plan_acknowledgments'
      AND policyname = 'Users can delete own plan acknowledgments'
  ) THEN
    CREATE POLICY "Users can delete own plan acknowledgments"
      ON public.plan_acknowledgments
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
