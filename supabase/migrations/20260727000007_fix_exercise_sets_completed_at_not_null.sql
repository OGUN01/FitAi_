-- ============================================================================
-- Migration: 20260727000007_fix_exercise_sets_completed_at_not_null.sql
-- ============================================================================
-- Purpose: Force exercise_sets.completed_at to NOT NULL.
--
-- Background: The column was created nullable in 20260326000001
-- (`completed_at TIMESTAMPTZ DEFAULT now()`). Migration 20260328191108 then
-- attempted `ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NOT NULL
-- DEFAULT NOW()` — but `ADD COLUMN IF NOT EXISTS` is a NO-OP when the column
-- already exists, so the NOT NULL was never applied. The column remains
-- nullable on the live DB, so completionTracking / workout-engine queries
-- that assume a non-null completed_at can produce NULLs.
--
-- This migration backfills any NULLs (using created_at as the sensible
-- fallback) and then explicitly sets NOT NULL. Safe on empty tables and
-- safe to re-run (UPDATE is a no-op once no NULLs remain; SET NOT NULL is
-- idempotent).
-- ============================================================================

UPDATE exercise_sets
SET completed_at = created_at
WHERE completed_at IS NULL;

ALTER TABLE exercise_sets ALTER COLUMN completed_at SET NOT NULL;
