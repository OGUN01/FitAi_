export const STORAGE_KEYS = {
  ONBOARDING_DATA: "onboarding_data",
  ONBOARDING_PROGRESS: "onboarding_progress",
  PERSONAL_INFO: "onboarding_personal_info",
  DIET_PREFERENCES: "onboarding_diet_preferences",
  BODY_ANALYSIS: "onboarding_body_analysis",
  WORKOUT_PREFERENCES: "onboarding_workout_preferences",
  ADVANCED_REVIEW: "onboarding_advanced_review",
} as const;

// User-scoped key generators — prevents cross-user data bleed on shared devices
export const getOnboardingDataKey = (userId: string) =>
  `onboarding_data_${userId}`;
export const getOnboardingCompletedKey = (userId: string) =>
  `onboarding_completed_${userId}`;
