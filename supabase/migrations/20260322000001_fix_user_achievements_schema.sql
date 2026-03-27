-- Fix user_achievements schema to match application code expectations:
-- 1. Rename is_unlocked -> is_completed (code uses is_completed, is_unlocked was never read by code)
-- 2. Add missing max_progress column used in upsert payloads

ALTER TABLE user_achievements RENAME COLUMN is_unlocked TO is_completed;

ALTER TABLE user_achievements
  ADD COLUMN IF NOT EXISTS max_progress INTEGER NOT NULL DEFAULT 1;
