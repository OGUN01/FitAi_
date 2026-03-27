-- Add missing fit_coins_earned column to user_achievements table
ALTER TABLE user_achievements
  ADD COLUMN IF NOT EXISTS fit_coins_earned INTEGER NOT NULL DEFAULT 0;
