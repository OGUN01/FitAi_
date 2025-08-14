// Navigation Types
// This file contains TypeScript definitions for navigation

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
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
  Plus: undefined;
  Diet: undefined;
  Profile: undefined;
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
  CookingSession: { meal: any };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  Progress: undefined;
  BodyAnalysisHistory: undefined;
};
