/**
 * ONBOARDING PROGRESS TYPES
 *
 * Types for tracking onboarding progress and validation (onboarding_progress table)
 */

// ============================================================================
// ONBOARDING PROGRESS TYPES (onboarding_progress table)
// ============================================================================
export interface OnboardingProgressData {
  current_tab: number; // INTEGER, 1-5
  completed_tabs: number[]; // INTEGER[]
  tab_validation_status: Record<number, TabValidationResult>; // JSONB
  total_completion_percentage: number; // INTEGER, 0-100
  started_at?: string; // TIMESTAMP
  completed_at?: string; // TIMESTAMP
  last_updated?: string; // TIMESTAMP
}

export interface TabValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  completion_percentage: number;
}

// Database row type (matching database schema)
export interface OnboardingProgressRow {
  id: string;
  user_id: string;
  current_tab?: number | null;
  completed_tabs?: number[] | null;
  tab_validation_status?: Record<
    number,
    { is_valid: boolean; errors: string[]; warnings: string[] }
  >;
  total_completion_percentage?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  last_updated?: string | null;
}
