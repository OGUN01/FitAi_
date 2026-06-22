-- ============================================================================
-- TIGHTEN CACHE RLS — close cross-user read of NULL user_id entries
-- ============================================================================
-- Migration: 20260622000001_tighten_cache_rls
-- Created: 2026-06-22
-- Security-1 (VERIFIED-FINDINGS): the SELECT policies on workout_cache and
-- meal_cache were `USING (auth.uid() = user_id OR user_id IS NULL)`. The
-- worker writes `user_id: userId || null` (fitai-workers/src/utils/cache.ts),
-- so any cache entry written without a userId (guest users, legacy rows)
-- became readable by EVERY authenticated user via the anon key. Those rows
-- contain personal health data (weight, goals, medical conditions, diet).
--
-- Root cause confirmed: no app path relies on the shared/NULL branch.
--   - Worker reads via the service role key, which bypasses RLS entirely,
--     AND it adds `.eq('user_id', userId)` on every read (cache.ts:155-156)
--     — so it never reads NULL rows.
--   - The `OR user_id IS NULL` clause was only reachable via client-side
--     reads (anon key), which is exactly the attack surface. Dropping it
--     breaks nothing legitimate and closes the hole immediately.
--
-- Fix: replace both SELECT policies with strict `auth.uid() = user_id`.
-- Existing NULL rows are now invisible to clients (exposure neutralized)
-- and age out via the existing 7/30-day expiry + cleanup_expired_cache job.
-- The worker should additionally stop writing NULL user_id (guests) so no
-- new orphan rows accumulate — see app-side change in cache.ts.
--
-- Pattern: DROP POLICY IF EXISTS + CREATE (append-only; never edit the
-- original 20250129000003 migration per CLAUDE.md principle 7).

-- --- workout_cache: strict per-user SELECT ---
DROP POLICY IF EXISTS "Users can view own workout cache" ON workout_cache;

CREATE POLICY "Users can view own workout cache"
  ON workout_cache FOR SELECT
  USING (auth.uid() = user_id);

-- --- meal_cache: strict per-user SELECT ---
DROP POLICY IF EXISTS "Users can view own meal cache" ON meal_cache;

CREATE POLICY "Users can view own meal cache"
  ON meal_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Note: INSERT (WITH CHECK true) and DELETE (expires_at < NOW()) policies
-- are unchanged — both are service-key-gated paths and remain correct.

COMMENT ON POLICY "Users can view own workout cache" ON workout_cache IS
  'Strict per-user read. NULL user_id rows (legacy/guest) are NOT readable by any client — only by the service role. See migration 20260622000001.';
COMMENT ON POLICY "Users can view own meal cache" ON meal_cache IS
  'Strict per-user read. NULL user_id rows (legacy/guest) are NOT readable by any client — only by the service role. See migration 20260622000001.';
