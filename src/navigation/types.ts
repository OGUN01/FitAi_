// Navigation Types
// This file contains TypeScript definitions for navigation

import { DayWorkout, DayMeal } from "../types/ai";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  WorkoutSession: { workout: DayWorkout; sessionId?: string; resumeExerciseIndex?: number; isExtra?: boolean };
  CookingSession: { meal: DayMeal };
  /**
   * Auth deep-link target for Supabase password-reset (`type=recovery`) links.
   * `token` is optional: in the PKCE flow the session is established by the
   * time the screen mounts (Supabase exchanges the `code` automatically), so
   * the screen re-derives its state from `supabase.auth.getSession()` rather
   * than the token. The token is surfaced for diagnostic/fallback use only.
   */
  PasswordReset: { token?: string };
};

/**
 * Auth deep-link target screens. These are rendered as conditional overlays
 * from App.tsx (the app does not use React Navigation for the auth stack —
 * auth screens are conditionally rendered above the Welcome/Onboarding/Main
 * flow). This param list is consumed by `useAuthDeepLinks` + App.tsx state.
 */
export type AuthStackParamList = {
  PasswordReset: { token?: string };
};

export type OnboardingStackParamList = {
  PersonalInfo: undefined;
  WorkoutPreferences: undefined;
  DietPreferences: undefined;
  BodyAnalysis: undefined;
  Review: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Workout: undefined;
  Analytics: undefined;
  Diet: undefined;
  Profile: undefined;
};

export type AnalyticsStackParamList = {
  AnalyticsMain: undefined;
  PredictiveInsights: undefined;
  ProgressTrends: undefined;
  BodyTransformation: undefined;
  PerformanceMetrics: undefined;
  AchievementDetails: { category?: string };
};

export type WorkoutStackParamList = {
  WorkoutMain: undefined;
  WorkoutDetails: { workoutId: string };
  Exercise: { exerciseId: string };
  WorkoutHistory: undefined;
};

export type DietStackParamList = {
  DietMain: undefined;
  MealLog: { mealType?: string };
  FoodDetails: { foodId: string };
  Nutrition: undefined;
  CookingSession: { meal: DayMeal };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: { screen?: string };
  Progress: undefined;
  BodyAnalysisHistory: undefined;
  HealthKitSettings: undefined;
  ManualHealthEntry: undefined;
};

// Main tab names for type-safe navigation
export type MainTabName = "Home" | "Workout" | "Analytics" | "Diet" | "Profile";
