-- Add missing celebration_shown column to user_achievements table
ALTER TABLE user_achievements
  ADD COLUMN IF NOT EXISTS celebration_shown BOOLEAN NOT NULL DEFAULT FALSE;
