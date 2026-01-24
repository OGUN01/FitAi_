/**
 * useDashboardData Hook
 *
 * Centralizes all store selections for dashboard/home screen data.
 * This reduces re-renders by:
 * 1. Using proper selectors for each store
 * 2. Memoizing derived data
 * 3. Providing a single data source for dashboard components
 *
 * ARCHITECTURE FIX (ARCH-006): Reduces multi-store imports causing re-renders
 */

import { useMemo } from "react";
import { useAuthStore } from "../stores/authStore";
import { useNutritionStore } from "../stores/nutritionStore";
import { useFitnessStore } from "../stores/fitnessStore";
import { useHealthDataStore } from "../stores/healthDataStore";
import { useHydrationStore } from "../stores/hydrationStore";
import { useAchievementStore } from "../stores/achievementStore";
import { useUserStore } from "../stores/userStore";
import { useAnalyticsStore } from "../stores/analyticsStore";

// Types for dashboard data
export interface DashboardUser {
  id: string | null;
  name: string | null;
  isAuthenticated: boolean;
}

export interface DashboardNutrition {
  weeklyMealPlan: any;
  dailyMeals: any[];
  mealProgress: Record<string, any>;
  isGeneratingPlan: boolean;
}

export interface DashboardFitness {
  weeklyWorkoutPlan: any;
  workoutProgress: Record<string, any>;
  isGeneratingPlan: boolean;
}

export interface DashboardHealth {
  metrics: any;
  isHealthKitAuthorized: boolean;
  isHealthConnectAuthorized: boolean;
}

export interface DashboardHydration {
  waterIntakeML: number;
  dailyGoalML: number | null;
  addWater: (amount: number) => void;
}

export interface DashboardData {
  user: DashboardUser;
  nutrition: DashboardNutrition;
  fitness: DashboardFitness;
  health: DashboardHealth;
  hydration: DashboardHydration;
  streak: number;
  profile: any;
}

/**
 * Main hook for dashboard data
 * Uses individual selectors for each piece of data to minimize re-renders
 */
export const useDashboardData = (): DashboardData => {
  // Auth - minimal selection
  const authUser = useAuthStore((s) => s.user);

  // User profile
  const profile = useUserStore((s) => s.profile);

  // Nutrition - individual selectors
  const weeklyMealPlan = useNutritionStore((s) => s.weeklyMealPlan);
  const dailyMeals = useNutritionStore((s) => s.dailyMeals);
  const mealProgress = useNutritionStore((s) => s.mealProgress);
  const nutritionIsGenerating = useNutritionStore((s) => s.isGeneratingPlan);

  // Fitness - individual selectors
  const weeklyWorkoutPlan = useFitnessStore((s) => s.weeklyWorkoutPlan);
  const workoutProgress = useFitnessStore((s) => s.workoutProgress);
  const fitnessIsGenerating = useFitnessStore((s) => s.isGeneratingPlan);

  // Health - individual selectors
  const healthMetrics = useHealthDataStore((s) => s.metrics);
  const isHealthKitAuthorized = useHealthDataStore(
    (s) => s.isHealthKitAuthorized,
  );
  const isHealthConnectAuthorized = useHealthDataStore(
    (s) => s.isHealthConnectAuthorized,
  );

  // Hydration - individual selectors
  const waterIntakeML = useHydrationStore((s) => s.waterIntakeML);
  const dailyGoalML = useHydrationStore((s) => s.dailyGoalML);
  const addWater = useHydrationStore((s) => s.addWater);

  // Achievement streak
  const streak = useAchievementStore((s) => s.currentStreak);

  // Memoize the user object
  const user = useMemo<DashboardUser>(
    () => ({
      id: authUser?.id ?? null,
      name: profile?.personalInfo?.name ?? null,
      isAuthenticated: !!authUser,
    }),
    [authUser, profile?.personalInfo?.name],
  );

  // Memoize nutrition object
  const nutrition = useMemo<DashboardNutrition>(
    () => ({
      weeklyMealPlan,
      dailyMeals,
      mealProgress,
      isGeneratingPlan: nutritionIsGenerating,
    }),
    [weeklyMealPlan, dailyMeals, mealProgress, nutritionIsGenerating],
  );

  // Memoize fitness object
  const fitness = useMemo<DashboardFitness>(
    () => ({
      weeklyWorkoutPlan,
      workoutProgress,
      isGeneratingPlan: fitnessIsGenerating,
    }),
    [weeklyWorkoutPlan, workoutProgress, fitnessIsGenerating],
  );

  // Memoize health object
  const health = useMemo<DashboardHealth>(
    () => ({
      metrics: healthMetrics,
      isHealthKitAuthorized,
      isHealthConnectAuthorized,
    }),
    [healthMetrics, isHealthKitAuthorized, isHealthConnectAuthorized],
  );

  // Memoize hydration object
  const hydration = useMemo<DashboardHydration>(
    () => ({
      waterIntakeML,
      dailyGoalML,
      addWater,
    }),
    [waterIntakeML, dailyGoalML, addWater],
  );

  return {
    user,
    nutrition,
    fitness,
    health,
    hydration,
    streak,
    profile,
  };
};

/**
 * Lightweight hook for just today's workout info
 */
export const useTodaysWorkout = () => {
  const weeklyWorkoutPlan = useFitnessStore((s) => s.weeklyWorkoutPlan);
  const workoutProgress = useFitnessStore((s) => s.workoutProgress);

  return useMemo(() => {
    if (!weeklyWorkoutPlan?.workouts) {
      return { workout: null, isCompleted: false, progress: 0 };
    }

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayName = dayNames[new Date().getDay()];

    const todaysWorkout = weeklyWorkoutPlan.workouts.find(
      (w: any) => w.dayOfWeek?.toLowerCase() === todayName,
    );

    if (!todaysWorkout) {
      return { workout: null, isCompleted: false, progress: 0 };
    }

    const progress = workoutProgress[todaysWorkout.id];

    return {
      workout: todaysWorkout,
      isCompleted: progress?.progress === 100,
      progress: progress?.progress ?? 0,
    };
  }, [weeklyWorkoutPlan, workoutProgress]);
};

/**
 * Lightweight hook for just today's nutrition info
 */
export const useTodaysNutrition = () => {
  const weeklyMealPlan = useNutritionStore((s) => s.weeklyMealPlan);
  const mealProgress = useNutritionStore((s) => s.mealProgress);
  const getTodaysConsumedNutrition = useNutritionStore(
    (s) => s.getTodaysConsumedNutrition,
  );

  return useMemo(() => {
    if (!weeklyMealPlan?.meals) {
      return {
        meals: [],
        consumedNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        mealsCompleted: 0,
      };
    }

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayName = dayNames[new Date().getDay()];

    const todaysMeals = weeklyMealPlan.meals.filter(
      (m: any) => m.dayOfWeek?.toLowerCase() === todayName,
    );

    const mealsCompleted = todaysMeals.filter(
      (m: any) => mealProgress[m.id]?.progress === 100,
    ).length;

    return {
      meals: todaysMeals,
      consumedNutrition: getTodaysConsumedNutrition(),
      mealsCompleted,
    };
  }, [weeklyMealPlan, mealProgress, getTodaysConsumedNutrition]);
};

/**
 * Lightweight hook for analytics summary
 */
export const useAnalyticsSummary = () => {
  const isInitialized = useAnalyticsStore((s) => s.isInitialized);
  const isLoading = useAnalyticsStore((s) => s.isLoading);
  const summary = useAnalyticsStore((s) => s.analyticsSummary);
  const currentAnalytics = useAnalyticsStore((s) => s.currentAnalytics);

  return useMemo(
    () => ({
      isInitialized,
      isLoading,
      summary,
      currentAnalytics,
    }),
    [isInitialized, isLoading, summary, currentAnalytics],
  );
};

export default useDashboardData;
