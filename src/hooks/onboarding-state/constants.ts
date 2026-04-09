// User-scoped key generators — prevents cross-user data bleed on shared devices
export const getOnboardingDataKey = (userId: string) =>
  `onboarding_data_${userId}`;
export const getOnboardingCompletedKey = (userId: string) =>
  `onboarding_completed_${userId}`;
