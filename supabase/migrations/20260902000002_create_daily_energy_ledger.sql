-- ============================================================================
-- TABLE: daily_energy_ledger
-- ============================================================================
-- Goal Engine Phase A.2: Per-user, per-day energy ledger.
--
-- One row per (user_id, date) reconciling intake vs. burn against the plan so
-- the app can project an honest goal date and report adherence. Written by a
-- client-side catch-up on app open (energyLedgerService.catchUpLedger) that
-- backfills intake_kcal from meal_logs and burn_kcal from workout_sessions —
-- both already durably persisted, so this is a pure derivation with no new
-- real-time capture path.
--
-- had_logged_data (Phase D): a day with zero meal_logs rows is false and is
-- EXCLUDED from adherence math — never scored as a 0-kcal / 1000+ kcal deficit
-- the user never actually hit.
--
-- neat_tdee recomputes from CURRENT weight each day (not onboarding weight) so
-- the projection doesn't drift optimistic as the user loses weight.
--
-- Append-only / safe to re-run (IF NOT EXISTS + DO $$ guards).
-- RLS enforced — users can only touch their own rows (auth.uid() = user_id).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_energy_ledger (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date            DATE         NOT NULL,

  -- Reconciled actuals (backfilled from meal_logs / workout_sessions)
  intake_kcal     NUMERIC,
  burn_kcal       NUMERIC,

  -- Energy-model context for the day
  neat_tdee       NUMERIC,    -- NEAT_TDEE recomputed from current weight
  plan_burn       NUMERIC,    -- daily-average burn from the active workout plan
  net_deficit     NUMERIC,    -- intake_kcal - (neat_tdee + plan_burn)  [actual]
  planned_deficit NUMERIC,    -- target deficit the plan aimed for that day
  weight_kg       NUMERIC,    -- weight used for the BMR/NEAT recompute

  -- Phase D adherence gate: false when the day had no logged meals, so it is
  -- excluded from adherence percentages rather than treated as a giant deficit.
  had_logged_data BOOLEAN     NOT NULL DEFAULT false,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ,

  CONSTRAINT daily_energy_ledger_user_date_unique UNIQUE (user_id, date)
);

COMMENT ON TABLE public.daily_energy_ledger IS
  'Goal Engine Phase A.2: Per-user daily energy ledger reconciling intake vs. burn against the active plan. Backfilled client-side on app open from meal_logs + workout_sessions. had_logged_data=false days are excluded from adherence math.';

COMMENT ON COLUMN public.daily_energy_ledger.had_logged_data IS
  'Whether the day had any logged meals. false days are excluded from adherence percentages (Phase D) — never scored as a 0-kcal day.';

COMMENT ON CONSTRAINT daily_energy_ledger_user_date_unique ON public.daily_energy_ledger IS
  'One ledger row per user per local date. Enables upsert via ON CONFLICT (user_id, date) DO UPDATE so catch-up re-runs are idempotent.';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Users can only read/insert/update/delete their own ledger rows.
-- Four-policy style with WITH CHECK on INSERT/UPDATE, matching the convention
-- used by health_metrics (20260620000003) and user_workout_plans.
-- Each policy is guarded with a DO $$ block so the migration is safe to re-run.
-- ============================================================================
ALTER TABLE public.daily_energy_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_energy_ledger'
      AND policyname = 'Users can read own daily energy ledger'
  ) THEN
    CREATE POLICY "Users can read own daily energy ledger"
      ON public.daily_energy_ledger
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_energy_ledger'
      AND policyname = 'Users can insert own daily energy ledger'
  ) THEN
    CREATE POLICY "Users can insert own daily energy ledger"
      ON public.daily_energy_ledger
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_energy_ledger'
      AND policyname = 'Users can update own daily energy ledger'
  ) THEN
    CREATE POLICY "Users can update own daily energy ledger"
      ON public.daily_energy_ledger
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_energy_ledger'
      AND policyname = 'Users can delete own daily energy ledger'
  ) THEN
    CREATE POLICY "Users can delete own daily energy ledger"
      ON public.daily_energy_ledger
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
