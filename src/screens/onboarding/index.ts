// Onboarding Screens Barrel Export
// This file exports all onboarding screens for easy importing

// Main container
export { OnboardingContainer } from "./OnboardingContainer";

// Tabs
export { default as PersonalInfoTab } from "./tabs/PersonalInfoTab";
export { default as DietPreferencesTab } from "./tabs/DietPreferencesTab";
export { default as BodyAnalysisTab } from "./tabs/BodyAnalysisTab";
export { default as WorkoutPreferencesTab } from "./tabs/WorkoutPreferencesTab";
export { default as AdvancedReviewTab } from "./tabs/AdvancedReviewTab";

// Types (re-export from types file)
export type { OnboardingReviewData } from "../../types/onboarding";
