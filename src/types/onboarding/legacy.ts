/**
 * LEGACY ONBOARDING TYPES
 *
 * OnboardingReviewData - Legacy type for backwards compatibility
 * This type is used by App.tsx and OnboardingContainer to pass data
 * after onboarding completion. It maps the new tab-based data to a
 * structure expected by the app's main flow.
 */

import type { AdvancedReviewData } from "./advanced-review";

export interface OnboardingReviewData {
  personalInfo: {
    first_name: string;
    last_name: string;
    name?: string;
    email?: string;
    age: number;
    gender: "male" | "female" | "other" | "prefer_not_to_say";
    height?: number;
    weight?: number;
    occupation_type?: string;
    country?: string;
    state?: string;
    wake_time?: string;
    sleep_time?: string;
  };
  fitnessGoals: {
    primary_goals: string[];
    time_commitment: string;
    experience: "beginner" | "intermediate" | "advanced";
    experience_level: "beginner" | "intermediate" | "advanced";
    preferred_equipment?: string[];
    target_areas?: string[];
  };
  dietPreferences: {
    dietType: "vegetarian" | "vegan" | "non-veg" | "pescatarian";
    allergies: string[];
    restrictions: string[];
    calorieTarget: number;
  };
  workoutPreferences: {
    location: "home" | "gym" | "both";
    equipment: string[];
    workoutTypes: string[];
    timePreference: number;
    intensity: "beginner" | "intermediate" | "advanced";
    // Extended fields from onboarding Tab 4
    primary_goals?: string[];
    activity_level?: string;
    workout_frequency_per_week?: number;
    workout_experience_years?: number;
    can_do_pushups?: number;
    can_run_minutes?: number;
    flexibility_level?: string;
    weekly_weight_loss_goal?: number;
    preferred_workout_times?: string[];
    enjoys_cardio?: boolean;
    enjoys_strength_training?: boolean;
    enjoys_group_classes?: boolean;
    prefers_outdoor_activities?: boolean;
    needs_motivation?: boolean;
    prefers_variety?: boolean;
  };
  bodyAnalysis: {
    photos: Record<string, string>;
    analysis?: {
      bodyType: string;
      muscleMass: string;
      bodyFat: string;
      fitnessLevel: string;
      recommendations: string[];
    };
    // Extended fields from onboarding Tab 3
    height_cm?: number;
    current_weight_kg?: number;
    target_weight_kg?: number;
    target_timeline_weeks?: number;
    body_fat_percentage?: number;
    waist_cm?: number;
    hip_cm?: number;
    chest_cm?: number;
    medical_conditions?: string[];
    medications?: string[];
    physical_limitations?: string[];
    pregnancy_status?: boolean;
    breastfeeding_status?: boolean;
    stress_level?: string;
    bmi?: number;
    bmr?: number;
    ideal_weight_min?: number;
    ideal_weight_max?: number;
    ai_body_type?: string;
    ai_estimated_body_fat?: number;
    ai_confidence_score?: number;
  };
  /** Calculated metrics from Tab 5 (advanced review). Optional so existing
   *  callers that don't populate it aren't broken. */
  advancedReview?: AdvancedReviewData;
}
