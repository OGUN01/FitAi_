-- Add original_weekly_rate to workout_preferences.
-- Write-once field: stores the user's original intended weekly weight-loss rate
-- before any pace-card selection. Lets useReviewValidation restore originalRateRef
-- correctly after tab remounts without drifting toward a previously-selected card's rate.
ALTER TABLE workout_preferences
  ADD COLUMN IF NOT EXISTS original_weekly_rate DECIMAL(3,2);
