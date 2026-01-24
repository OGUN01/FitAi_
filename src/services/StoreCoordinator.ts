/**
 * StoreCoordinator - Centralized Cross-Store Coordination
 *
 * This service handles all cross-store operations to eliminate direct store dependencies.
 * Instead of stores calling getState() on other stores, they should accept data as parameters
 * and this coordinator handles the orchestration.
 *
 * ARCHITECTURE FIX (ARCH-001): Removes direct cross-store dependencies
 */

import { useAuthStore } from "../stores/authStore";
import { useNutritionStore } from "../stores/nutritionStore";
import { useFitnessStore } from "../stores/fitnessStore";
import { useHealthDataStore } from "../stores/healthDataStore";
import { useHydrationStore } from "../stores/hydrationStore";
import { useAnalyticsStore } from "../stores/analyticsStore";

// Type for operation results
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: Error | string;
}

/**
 * Get the current authenticated user ID
 * Single point of access for user authentication state
 */
export const getCurrentUserId = (): string | null => {
  const authState = useAuthStore.getState();
  return authState.user?.id ?? null;
};

/**
 * Get the current user or throw if not authenticated
 */
export const requireUserId = (): string => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User must be authenticated for this operation");
  }
  return userId;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getCurrentUserId() !== null;
};

/**
 * Get user ID with fallback for guest mode
 */
export const getUserIdOrGuest = (): string => {
  return getCurrentUserId() ?? "guest";
};

// ===========================================
// NUTRITION STORE COORDINATION
// ===========================================

/**
 * Save weekly meal plan with proper user context
 * Coordinates between nutrition store and auth store
 */
export const saveWeeklyMealPlanWithUser = async (
  plan: Parameters<
    ReturnType<typeof useNutritionStore.getState>["saveWeeklyMealPlan"]
  >[0],
): Promise<OperationResult> => {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User must be authenticated to save meal plans",
      };
    }

    await useNutritionStore.getState().saveWeeklyMealPlan(plan);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

/**
 * Complete a meal with proper user context for offline sync
 */
export const completeMealWithUser = async (
  mealId: string,
  logId?: string,
): Promise<OperationResult> => {
  try {
    await useNutritionStore.getState().completeMeal(mealId, logId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

// ===========================================
// FITNESS STORE COORDINATION
// ===========================================

/**
 * Save weekly workout plan with proper user context
 */
export const saveWeeklyWorkoutPlanWithUser = async (
  plan: Parameters<
    ReturnType<typeof useFitnessStore.getState>["saveWeeklyWorkoutPlan"]
  >[0],
): Promise<OperationResult> => {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        error: "User must be authenticated to save workout plans",
      };
    }

    await useFitnessStore.getState().saveWeeklyWorkoutPlan(plan);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

/**
 * Complete a workout with proper user context
 */
export const completeWorkoutWithUser = async (
  workoutId: string,
  sessionId?: string,
): Promise<OperationResult> => {
  try {
    await useFitnessStore.getState().completeWorkout(workoutId, sessionId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

// ===========================================
// ANALYTICS STORE COORDINATION
// ===========================================

/**
 * Calculate performance score with data from multiple stores
 * This moves the cross-store logic out of analyticsStore
 */
export const calculatePerformanceScore = (metrics: {
  waterIntake?: number;
  steps?: number;
  sleepHours?: number;
  workoutCount?: number;
  mood?: number;
  energyLevel?: number;
}): number => {
  let score = 50; // Base score

  // Workout contribution (0-30 points)
  score += Math.min(30, (metrics.workoutCount ?? 0) * 10);

  // Sleep contribution (0-25 points)
  const sleepOptimal = 8;
  const sleepHours = metrics.sleepHours ?? 0;
  const sleepScore = Math.max(0, 25 - Math.abs(sleepHours - sleepOptimal) * 5);
  score += sleepScore;

  // Water intake contribution (0-15 points)
  const hydrationState = useHydrationStore.getState();
  const waterGoalML = hydrationState.dailyGoalML;
  if (waterGoalML && metrics.waterIntake) {
    const waterScore = Math.min(15, (metrics.waterIntake / waterGoalML) * 15);
    score += waterScore;
  }

  // Steps contribution (0-15 points)
  const healthMetrics = useHealthDataStore.getState().metrics;
  if (healthMetrics?.stepsGoal && metrics.steps) {
    const stepsScore = Math.min(
      15,
      (metrics.steps / healthMetrics.stepsGoal) * 15,
    );
    score += stepsScore;
  }

  // Mood/energy contribution (0-15 points)
  if (metrics.mood && metrics.energyLevel) {
    score += ((metrics.mood + metrics.energyLevel) / 2 - 5) * 3;
  }

  return Math.round(Math.min(100, Math.max(0, score)));
};

/**
 * Get hydration goal for analytics calculations
 */
export const getHydrationGoal = (): number | null => {
  return useHydrationStore.getState().dailyGoalML;
};

/**
 * Get health metrics for analytics calculations
 */
export const getHealthMetrics = () => {
  return useHealthDataStore.getState().metrics;
};

// ===========================================
// DASHBOARD DATA AGGREGATION
// ===========================================

/**
 * Get aggregated dashboard data from multiple stores
 * Used by useDashboardData hook
 */
export const getDashboardData = () => {
  const authState = useAuthStore.getState();
  const nutritionState = useNutritionStore.getState();
  const fitnessState = useFitnessStore.getState();
  const healthState = useHealthDataStore.getState();
  const hydrationState = useHydrationStore.getState();
  const analyticsState = useAnalyticsStore.getState();

  return {
    // Auth
    user: authState.user,
    isAuthenticated: !!authState.user,

    // Nutrition
    weeklyMealPlan: nutritionState.weeklyMealPlan,
    dailyMeals: nutritionState.dailyMeals,
    mealProgress: nutritionState.mealProgress,
    consumedNutrition: nutritionState.getConsumedNutrition(),
    todaysConsumedNutrition: nutritionState.getTodaysConsumedNutrition(),

    // Fitness
    weeklyWorkoutPlan: fitnessState.weeklyWorkoutPlan,
    workoutProgress: fitnessState.workoutProgress,
    completedWorkoutStats: fitnessState.getCompletedWorkoutStats(),
    todaysCompletedWorkoutStats: fitnessState.getTodaysCompletedWorkoutStats(),

    // Health
    healthMetrics: healthState.metrics,
    isHealthKitAuthorized: healthState.isHealthKitAuthorized,
    isHealthConnectAuthorized: healthState.isHealthConnectAuthorized,

    // Hydration
    waterIntakeML: hydrationState.waterIntakeML,
    waterGoalML: hydrationState.dailyGoalML,

    // Analytics
    currentAnalytics: analyticsState.currentAnalytics,
    analyticsSummary: analyticsState.analyticsSummary,
  };
};

// Export as default for convenience
const StoreCoordinator = {
  getCurrentUserId,
  requireUserId,
  isAuthenticated,
  getUserIdOrGuest,
  saveWeeklyMealPlanWithUser,
  completeMealWithUser,
  saveWeeklyWorkoutPlanWithUser,
  completeWorkoutWithUser,
  calculatePerformanceScore,
  getHydrationGoal,
  getHealthMetrics,
  getDashboardData,
};

export default StoreCoordinator;
