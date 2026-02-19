/**
 * LEGACY ONBOARDING TYPES
 *
 * Legacy types for backwards compatibility with existing components
 * Used by App.tsx and OnboardingContainer
 */

// ============================================================================
// LEGACY ONBOARDING REVIEW DATA TYPE
// ============================================================================

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
  };
}
