-- The user_achievements.progress column stores raw counts (e.g. calories burned,
-- days active, workout count) — NOT percentages. The original CHECK constraint of
-- progress <= 100 silently blocks upserts for any in-progress achievement whose
-- raw count exceeds 100 (e.g. "Burn 1000 calories" at 150 cal in, "365 days" at
-- 150 days in). Drop it and replace with a simple non-negative guard.
-- The application enforces progress <= max_progress at the store layer.

ALTER TABLE public.user_achievements
  DROP CONSTRAINT IF EXISTS user_achievements_progress_check;

ALTER TABLE public.user_achievements
  ADD CONSTRAINT user_achievements_progress_check CHECK (progress >= 0);
