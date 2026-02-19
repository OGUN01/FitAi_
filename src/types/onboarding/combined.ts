/**
 * COMBINED ONBOARDING DATA TYPES
 *
 * Complete onboarding data structure combining all tabs
 */

import type { PersonalInfoData } from "./personal-info";
import type { DietPreferencesData } from "./diet-preferences";
import type { BodyAnalysisData } from "./body-analysis";
import type { WorkoutPreferencesData } from "./workout-preferences";
import type { AdvancedReviewData } from "./advanced-review";
import type { OnboardingProgressData } from "./progress";

// ============================================================================
// COMPLETE ONBOARDING DATA TYPE
// ============================================================================
export interface CompleteOnboardingData {
  // Tab data
  personal_info: PersonalInfoData;
  diet_preferences: DietPreferencesData;
  body_analysis: BodyAnalysisData;
  workout_preferences: WorkoutPreferencesData;
  advanced_review: AdvancedReviewData;

  // Progress tracking
  onboarding_progress: OnboardingProgressData;

  // Metadata
  user_id: string;
  created_at?: string;
  updated_at?: string;
}
