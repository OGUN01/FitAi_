-- ============================================================================
-- ADD MISSING COLUMNS: advanced_review + diet_preferences
-- ============================================================================
-- Migration: 20260402000000_add_missing_columns.sql
-- Created: 2026-04-02
-- Description: Adds columns that code writes to but don't exist in the DB,
--              causing silent data loss on every upsert.
-- All statements use IF NOT EXISTS so the migration is safe to re-run.

-- ============================================================================
-- 1. advanced_review — columns written by AdvancedReviewService.save()
-- ============================================================================

-- Fix H1: bmi_category is written by AdvancedReviewService.save()
-- (onboardingService.ts line ~740) but no DB column exists — value is silently dropped.
ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS bmi_category TEXT;

-- Fix H2: health_grade is written by AdvancedReviewService.save()
-- (onboardingService.ts line ~742) but no DB column exists — value is silently dropped.
ALTER TABLE public.advanced_review ADD COLUMN IF NOT EXISTS health_grade TEXT;

-- ============================================================================
-- 2. diet_preferences — columns defined in DietPreferencesData type but
--    missing from the DB schema
-- ============================================================================

-- Fix H4: cuisine_preferences is defined in the DietPreferencesData TypeScript type
-- but has no corresponding DB column. Stores user's preferred cuisine styles
-- (e.g. ['mediterranean', 'asian', 'mexican']) for meal plan generation.
ALTER TABLE public.diet_preferences ADD COLUMN IF NOT EXISTS cuisine_preferences TEXT[] DEFAULT '{}';

-- Fix H5: snacks_count is defined in the DietPreferencesData TypeScript type
-- but has no corresponding DB column. Stores the desired number of daily snacks
-- (default 2) for meal plan generation.
ALTER TABLE public.diet_preferences ADD COLUMN IF NOT EXISTS snacks_count INTEGER DEFAULT 2;
