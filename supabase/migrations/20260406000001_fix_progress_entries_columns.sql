-- ============================================================================
-- FIX PROGRESS_ENTRIES COLUMNS
-- ============================================================================
-- Migration: Add missing columns to progress_entries and enforce unique constraint
-- Created: 2026-04-06
-- Fixes F4-1 + F4-2:
--   - Code writes weight_kg, entry_date, progress_photos but base migration
--     only has weight, date, photo_url.
--   - Trigger in 20260325133000 references weight_kg and entry_date already,
--     so these columns must exist.
--   - upsert in entries.ts uses onConflict: "user_id,entry_date" so a UNIQUE
--     constraint on (user_id, entry_date) is required.

-- Add missing columns
ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);
ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS entry_date DATE;
ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS progress_photos JSONB DEFAULT '[]';
ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS muscle_mass_kg NUMERIC(5,2);
ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '{}';

-- Backfill entry_date from the existing `date` column where entry_date is null
UPDATE progress_entries SET entry_date = date WHERE entry_date IS NULL AND date IS NOT NULL;

-- Backfill weight_kg from the existing `weight` column where weight_kg is null
UPDATE progress_entries SET weight_kg = weight WHERE weight_kg IS NULL AND weight IS NOT NULL;

-- Add UNIQUE constraint on (user_id, entry_date) required by upsert onConflict
ALTER TABLE progress_entries DROP CONSTRAINT IF EXISTS progress_entries_user_id_entry_date_key;
ALTER TABLE progress_entries ADD CONSTRAINT progress_entries_user_id_entry_date_key UNIQUE (user_id, entry_date);
