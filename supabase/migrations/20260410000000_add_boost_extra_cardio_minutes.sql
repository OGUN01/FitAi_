-- Add boost_extra_cardio_minutes to workout_preferences.
-- Stores the extra cardio minutes selected via the CARDIO BOOST pace card.
-- When > 0, ValidationEngine adds exercise burn to the weekly rate calculation
-- (diet + cardio = combined rate). 0 means diet-only pace card selected.
ALTER TABLE workout_preferences
  ADD COLUMN IF NOT EXISTS boost_extra_cardio_minutes INTEGER DEFAULT 0;
