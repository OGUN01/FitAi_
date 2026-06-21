-- P2-12: Persist workout streaks to Supabase.
--
-- Previously streaks were computed only from AsyncStorage metricsHistory and
-- never persisted to the cloud. On app reinstall / device change the streak
-- history was lost. With P1-8 the engine now reads metrics from
-- analytics_metrics (Supabase canonical), so reinstall no longer loses the
-- underlying history — but persisting the computed streak values gives a fast
-- read path and survives even if analytics_metrics rows are pruned over time.
--
-- Columns are nullable so existing rows (and guest/no-data users) are unaffected.
-- Append-only / safe to re-run (IF NOT EXISTS).

ALTER TABLE public.analytics_metrics
  ADD COLUMN IF NOT EXISTS current_streak INTEGER,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER;

COMMENT ON COLUMN public.analytics_metrics.current_streak IS
  'P2-12: Latest computed workout streak (consecutive days with a workout). Nullable until first compute.';
COMMENT ON COLUMN public.analytics_metrics.longest_streak IS
  'P2-12: Longest-ever workout streak observed. Nullable until first compute.';
