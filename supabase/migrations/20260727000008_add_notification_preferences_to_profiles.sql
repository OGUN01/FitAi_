-- Add notification_preferences JSONB column to profiles table.
-- Closes schema/code mismatch: notificationService.ts reads/writes
-- profiles.notification_preferences, and supabase-types.generated.ts
-- declares it, but no migration previously added the column.
-- Safe to re-run: all statements use IF NOT EXISTS (append-only per
-- CLAUDE.md rule 7).

-- ============================================================
-- 1. profiles — notification_preferences JSONB column
--    (sole cloud source of truth for user notification toggles;
--     Zustand persist is the local source — see notificationService.ts)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.notification_preferences IS
  'User notification preferences (toggles, reminder times). JSONB. Sole cloud source of truth; Zustand store (key "notification-store") is the local source.';
