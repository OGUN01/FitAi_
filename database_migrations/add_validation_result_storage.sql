-- ============================================================================
-- VALIDATION SYSTEM: Add validation results storage to advanced_review
-- Database Task 1.3
-- ============================================================================

-- Add validation results storage columns to advanced_review table
ALTER TABLE advanced_review
ADD COLUMN validation_status TEXT CHECK (validation_status IN ('passed', 'warnings', 'blocked')),
ADD COLUMN validation_errors JSONB,
ADD COLUMN validation_warnings JSONB,
ADD COLUMN refeed_schedule JSONB,
ADD COLUMN medical_adjustments TEXT[];

-- Add comments
COMMENT ON COLUMN advanced_review.validation_status IS 'Result of validation: passed, warnings, or blocked';
COMMENT ON COLUMN advanced_review.validation_errors IS 'Array of blocking errors if any';
COMMENT ON COLUMN advanced_review.validation_warnings IS 'Array of warnings if any';
COMMENT ON COLUMN advanced_review.refeed_schedule IS 'Refeed and diet break schedule if applicable';
COMMENT ON COLUMN advanced_review.medical_adjustments IS 'Notes about medical condition adjustments';

