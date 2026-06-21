-- ============================================================================
-- TABLE: HEALTH_METRICS
-- ============================================================================
-- Migration: Create health_metrics table for daily Health Connect snapshots
-- Created: 2026-06-20
-- Description: Persist daily health-metric snapshots from Health Connect so users
--              get historical charts. Previously health data (steps, HR,
--              calories, sleep, HRV, SpO2, weight, body fat, distance) was
--              store-only/ephemeral — it reset daily and was never persisted,
--              so reinstall or a device change lost all history.
--
-- Design:
--   One row per (user_id, date, metric_type) — composite UNIQUE allows safe
--   upsert via ON CONFLICT (user_id, date, metric_type) DO UPDATE so the last
--   sync of the day wins as the authoritative snapshot.
--
--   metric_type values (see service METRIC_UNITS map):
--     'steps' | 'heart_rate' | 'active_calories' | 'total_calories'
--     'distance_km' | 'weight_kg' | 'sleep_hours' | 'heart_rate_variability'
--     'oxygen_saturation' | 'body_fat' | 'resting_heart_rate'
--
-- Append-only / safe to re-run (IF NOT EXISTS on every statement).
-- RLS enforced — users can only touch their own rows.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.health_metrics (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE         NOT NULL,                       -- local date (getLocalDateString)
  metric_type TEXT         NOT NULL,                      -- see comment block above
  value       NUMERIC      NOT NULL,
  unit        TEXT,                                        -- 'count','bpm','kcal','km','kg','hours','ms','%'
  source      TEXT         NOT NULL DEFAULT 'healthconnect',  -- 'healthconnect' | 'manual'
  recorded_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT health_metrics_user_date_type_unique UNIQUE (user_id, date, metric_type)
);

COMMENT ON TABLE public.health_metrics IS
  'Wave 3: Persisted daily health-metric snapshots from Health Connect (and manual entry). One authoritative value per user/day/metric_type via upsert. Replaces ephemeral store-only health data so history survives reinstalls and device changes.';

COMMENT ON COLUMN public.health_metrics.id IS
  'Primary key — generated server-side via gen_random_uuid().';
COMMENT ON COLUMN public.health_metrics.user_id IS
  'Owner of the row. FK to auth.users with ON DELETE CASCADE so deleting a user wipes their health history. Enforced by RLS (auth.uid() = user_id).';
COMMENT ON COLUMN public.health_metrics.date IS
  'Local calendar date the snapshot applies to, formatted YYYY-MM-DD via getLocalDateString(). Stored as DATE (not timestamptz) so it is timezone-stable across devices.';
COMMENT ON COLUMN public.health_metrics.metric_type IS
  'Which metric this row holds. Allowed values: steps, heart_rate, resting_heart_rate, active_calories, total_calories, distance_km, weight_kg, sleep_hours, heart_rate_variability, oxygen_saturation, body_fat. (No DB CHECK constraint so the set can grow without a migration.)';
COMMENT ON COLUMN public.health_metrics.value IS
  'Numeric value of the metric in the unit indicated by the unit column.';
COMMENT ON COLUMN public.health_metrics.unit IS
  'Unit of measure for value: count, bpm, kcal, km, kg, hours, ms, %. Nullable because some metric_types have an implicit unit, but always set by the service for clarity.';
COMMENT ON COLUMN public.health_metrics.source IS
  'Origin of the reading: healthconnect (synced from Android Health Connect) or manual (entered by the user via the manual-entry screen). Defaults to healthconnect.';
COMMENT ON COLUMN public.health_metrics.recorded_at IS
  'Timestamp the reading was taken/synced. Defaults to now(). Updated on upsert so it reflects the latest source-of-truth write.';
COMMENT ON COLUMN public.health_metrics.created_at IS
  'Timestamp the row was first inserted. Defaults to now(). Never updated.';
COMMENT ON CONSTRAINT health_metrics_user_date_type_unique ON public.health_metrics IS
  'Ensures exactly one authoritative value per (user_id, date, metric_type). Enables safe upsert via ON CONFLICT (user_id, date, metric_type) DO UPDATE so the most recent sync overwrites the prior snapshot for that day.';

-- Fast lookup: all rows for a user, newest date first (the common chart query)
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date
  ON public.health_metrics (user_id, date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Users can only read/insert/update/delete their own health metrics.
-- Matches the per-table RLS pattern used across the rest of the schema
-- (CLAUDE.md: every table has auth.uid() = user_id policies).
-- ============================================================================
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own health metrics"
  ON public.health_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health metrics"
  ON public.health_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health metrics"
  ON public.health_metrics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own health metrics"
  ON public.health_metrics
  FOR DELETE
  USING (auth.uid() = user_id);
