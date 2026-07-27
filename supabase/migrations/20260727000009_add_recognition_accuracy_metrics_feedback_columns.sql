-- ============================================================================
-- Migration: 20260727000009_add_recognition_accuracy_metrics_feedback_columns.sql
-- ============================================================================
-- Purpose: Add 6 feedback-derived columns to recognition_accuracy_metrics so
-- that foodRecognitionFeedbackService.updateAccuracyMetrics can insert its
-- full payload. The table (created in 20260124000001) currently defines only
-- id, date, total_recognitions, correct_recognitions, corrected_recognitions,
-- average_confidence, created_at — none of the feedback_breakdown columns
-- that the service writes. Without these columns every insert fails with a
-- PostgrestError ("Could not find the column ..."), silently dropping the
-- day's accuracy metrics (the error is logged, not surfaced).
--
-- Why append-only: rule 7 — never edit an existing migration. Adds new
-- columns here instead of patching 20260124000001.
--
-- Safe to re-run: every ADD COLUMN uses IF NOT EXISTS; COMMENT ON COLUMN is
-- idempotent. UNIQUE(date) constraint from 20260124000001 is untouched.
-- ============================================================================

ALTER TABLE public.recognition_accuracy_metrics
  ADD COLUMN IF NOT EXISTS feedback_count INTEGER;
COMMENT ON COLUMN public.recognition_accuracy_metrics.feedback_count IS
  'Total number of recognition feedback entries aggregated for the day (from stats.totalCount).';

ALTER TABLE public.recognition_accuracy_metrics
  ADD COLUMN IF NOT EXISTS correct_count INTEGER;
COMMENT ON COLUMN public.recognition_accuracy_metrics.correct_count IS
  'Number of feedback entries where the recognition was correct (from stats.correctCount).';

ALTER TABLE public.recognition_accuracy_metrics
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(4,2);
COMMENT ON COLUMN public.recognition_accuracy_metrics.average_rating IS
  'Average user rating of recognition quality for the day (from stats.averageRating, 0.00-5.00 scale).';

ALTER TABLE public.recognition_accuracy_metrics
  ADD COLUMN IF NOT EXISTS accuracy_percentage NUMERIC(5,2);
COMMENT ON COLUMN public.recognition_accuracy_metrics.accuracy_percentage IS
  'Percentage of correct recognitions for the day (from stats.accuracyPercentage, 0.00-100.00).';

ALTER TABLE public.recognition_accuracy_metrics
  ADD COLUMN IF NOT EXISTS cuisine_breakdown JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.recognition_accuracy_metrics.cuisine_breakdown IS
  'Per-cuisine accuracy breakdown object (from stats.cuisineAccuracy). Empty object when no data.';

ALTER TABLE public.recognition_accuracy_metrics
  ADD COLUMN IF NOT EXISTS enhancement_breakdown JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.recognition_accuracy_metrics.enhancement_breakdown IS
  'Per-enhancement-source accuracy breakdown object (from stats.enhancementSourceAccuracy). Empty object when no data.';
