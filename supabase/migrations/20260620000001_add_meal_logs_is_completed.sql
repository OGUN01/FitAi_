-- P2-11: Add is_completed BOOLEAN column to meal_logs.
--
-- Previously meal completion was inferred from row existence + plan_meal_id,
-- OR signaled by appending "[COMPLETED]" to the notes text. The two
-- representations diverged (a user typing "[COMPLETED]" caused a false
-- positive; loadData inferred completion from row presence, not the string).
--
-- This migration adds a dedicated is_completed column so completion is an
-- explicit, queryable boolean. Back-fills existing rows: any meal_log with a
-- plan_meal_id (from_plan = true) is treated as completed (matching the
-- previous loadData inference).
--
-- Append-only / safe to re-run (IF NOT EXISTS).

ALTER TABLE public.meal_logs
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Back-fill: planned meal logs (from_plan = true with a plan_meal_id) were
-- treated as completed by the previous loadData logic. Mirror that here so
-- historical completions are not lost.
UPDATE public.meal_logs
SET is_completed = TRUE
WHERE from_plan = TRUE AND plan_meal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_completed
  ON public.meal_logs(user_id, is_completed)
  WHERE is_completed = TRUE;

COMMENT ON COLUMN public.meal_logs.is_completed IS
  'P2-11: Explicit completion flag. Replaces the "[COMPLETED]" notes-string convention which could be spoofed by user input.';
