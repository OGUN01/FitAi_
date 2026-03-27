-- Add notes column to meal_logs if missing.
-- The original migration (20250129000002) included this column, but the live
-- schema may have diverged. Safe to re-run due to IF NOT EXISTS.
ALTER TABLE public.meal_logs
  ADD COLUMN IF NOT EXISTS notes TEXT;
