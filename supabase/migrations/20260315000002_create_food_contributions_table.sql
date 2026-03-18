-- Migration: Create user_food_contributions table
-- Created: 2026-03-15
-- Description: Stores food items submitted by users for admin review/approval

CREATE TABLE IF NOT EXISTS user_food_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Food details submitted by the user
  name            TEXT NOT NULL,
  brand           TEXT,
  category        TEXT,
  serving_size_g  NUMERIC,
  calories        NUMERIC,
  protein_g       NUMERIC,
  carbs_g         NUMERIC,
  fat_g           NUMERIC,
  fiber_g         NUMERIC,
  extra_data      JSONB DEFAULT '{}',

  -- Admin review fields
  is_approved     BOOLEAN,                              -- NULL=pending, TRUE=approved, FALSE=rejected
  approved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_contributions_user_id   ON user_food_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_food_contributions_is_approved ON user_food_contributions(is_approved);
CREATE INDEX IF NOT EXISTS idx_food_contributions_created_at  ON user_food_contributions(created_at DESC);

ALTER TABLE user_food_contributions ENABLE ROW LEVEL SECURITY;

-- Users can insert and read their own contributions
CREATE POLICY "users_insert_own_contributions" ON user_food_contributions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_contributions" ON user_food_contributions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "service_role_all_contributions" ON user_food_contributions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admin full access (policy may already exist from admin migration — use IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_food_contributions'
      AND policyname = 'admin_all_contributions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "admin_all_contributions" ON user_food_contributions
        FOR ALL
        USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
        WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin')
    $policy$;
  END IF;
END;
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_food_contributions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_food_contributions_updated_at
  BEFORE UPDATE ON user_food_contributions
  FOR EACH ROW EXECUTE FUNCTION update_food_contributions_updated_at();
