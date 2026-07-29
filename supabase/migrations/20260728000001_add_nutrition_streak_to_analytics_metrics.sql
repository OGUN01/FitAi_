-- Diet Tab Redesign: Persist nutrition streak to Supabase.
--
-- Mirrors P2-12 workout streak pattern. Tracks consecutive calendar days
-- with at least one logged meal (meal_logs row with logged_at within that
-- day's local bounds AND is_completed = true OR logged_at present).
--
-- Columns are nullable so existing rows (and guest/no-data users) are unaffected.
-- Append-only / safe to re-run (IF NOT EXISTS).
--
-- SSOT writer: achievementStore.updateNutritionStreak (single writer — do NOT
-- re-introduce dual-writer bug that P2-12 fixed for workout streaks).

ALTER TABLE public.analytics_metrics
  ADD COLUMN IF NOT EXISTS nutrition_streak INTEGER,
  ADD COLUMN IF NOT EXISTS longest_nutrition_streak INTEGER;

COMMENT ON COLUMN public.analytics_metrics.nutrition_streak IS
  'Diet redesign: Latest computed nutrition streak (consecutive days with >=1 logged meal). Nullable until first compute.';
COMMENT ON COLUMN public.analytics_metrics.longest_nutrition_streak IS
  'Diet redesign: Longest-ever nutrition streak observed. Nullable until first compute.';
