// Navigation Types
// This file contains TypeScript definitions for navigation

import { DayWorkout, DayMeal } from "../types/ai";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  WorkoutSession: { workout: DayWorkout; sessionId?: string; resumeExerciseIndex?: number; isExtra?: boolean };
  CookingSession: { meal: DayMeal };
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
};

// Main tab names for type-safe navigation
export type MainTabName = "Home" | "Workout" | "Analytics" | "Diet" | "Profile";
