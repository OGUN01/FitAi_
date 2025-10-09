-- ============================================================================
-- VALIDATION SYSTEM: Add pregnancy and breastfeeding fields to body_analysis
-- Phase 1, Task 1.2
-- ============================================================================

-- Add pregnancy and breastfeeding columns to body_analysis table
ALTER TABLE body_analysis
ADD COLUMN pregnancy_status BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN pregnancy_trimester INTEGER CHECK (pregnancy_trimester IN (1, 2, 3)),
ADD COLUMN breastfeeding_status BOOLEAN DEFAULT false NOT NULL;

-- Add comments
COMMENT ON COLUMN body_analysis.pregnancy_status IS 'Whether user is currently pregnant (blocks calorie deficit)';
COMMENT ON COLUMN body_analysis.pregnancy_trimester IS 'Trimester if pregnant (1, 2, or 3) for calorie adjustments';
COMMENT ON COLUMN body_analysis.breastfeeding_status IS 'Whether user is breastfeeding (requires +500 cal)';

