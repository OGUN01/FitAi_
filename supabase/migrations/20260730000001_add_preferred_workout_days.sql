-- Add preferred_workout_days TEXT[] column to workout_preferences.
-- New onboarding field (WorkoutPreferencesTab day-of-week chips): stores WHICH
-- days the user trains ('monday'..'sunday', monday-first). The count stays in
-- workout_frequency_per_week; invariant held by the app:
--   preferred_workout_days.length = workout_frequency_per_week
-- NULL means "no explicit choice" → the generator derives an even spread from
-- workout_frequency_per_week (legacy rows keep current behavior).
-- Consumed by: aiRequestTransformers.getWorkoutDaysFromPreferences →
-- weeklyPlan.preferredDays → fitai-workers rule-based generator (dayOfWeek).
-- Safe to re-run: IF NOT EXISTS (append-only per CLAUDE.md rule 7).

ALTER TABLE public.workout_preferences
  ADD COLUMN IF NOT EXISTS preferred_workout_days TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.workout_preferences.preferred_workout_days IS
  'User-chosen training days (monday..sunday, monday-first). Length matches workout_frequency_per_week. NULL → even spread derived from the count. Feeds weeklyPlan.preferredDays in workout generation.';
