-- ============================================================================
-- DEVICE TOKENS TABLE
-- ============================================================================
-- Migration: Create device_tokens table for multi-device push notification routing.
-- Created: 2026-06-20
-- Description: Stores Expo push tokens per user, one row per device. A user may
--              have multiple rows (phone + tablet). The backend (Cloudflare
--              Workers / Supabase Edge) reads this table to send remote push
--              notifications — e.g. server-driven reminders when the app is
--              killed beyond the 7-day local schedule window.
--
-- SSOT: This table is the cloud source of truth for "which devices belong to a
-- user". The runtime source is pushTokenService's in-memory cache + Supabase.
--
-- RLS: auth.uid() = user_id on all operations. No anon/public access.
-- Unique constraint on token prevents duplicate registration on re-fetch.
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT NOT NULL DEFAULT 'expo' CHECK (platform IN ('expo', 'ios', 'android', 'web')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per unique token (a token uniquely identifies a single app install).
CREATE UNIQUE INDEX IF NOT EXISTS uq_device_tokens_token
  ON device_tokens (token);

-- Fast lookup of all tokens for a user (the query the backend runs to fan out).
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id
  ON device_tokens (user_id);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'device_tokens' AND policyname = 'Users can manage own device tokens') THEN
    CREATE POLICY "Users can manage own device tokens"
      ON device_tokens FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
