// Hooks Barrel Export
// This file exports all custom React hooks

// TODO: Implement these custom hooks when needed
// export { useCamera } from './useCamera';
// export { useOfflineSync } from './useOfflineSync';
// export { usePerformance } from './usePerformance';
export { useResponsiveTheme } from "./useResponsiveTheme";

// User Metrics - Load and access calculated health metrics
export {
  useUserMetrics,
  useDietGenerationParams,
  useWorkoutGenerationParams,
  type UseUserMetricsResult,
} from "./useUserMetrics";

// Async Meal Generation - Handle long-running meal plan generation
export {
  useAsyncMealGeneration,
  type AsyncMealJob,
  type JobStatus,
  type UseAsyncMealGenerationResult,
} from "./useAsyncMealGeneration";

// Dashboard Data - Centralized store access for dashboard components
// ARCH-006 FIX: Reduces multi-store imports causing re-renders
export {
  useDashboardData,
  useTodaysWorkout,
  useTodaysNutrition,
  useAnalyticsSummary,
  type DashboardUser,
  type DashboardNutrition,
  type DashboardFitness,
  type DashboardHealth,
  type DashboardHydration,
  type DashboardData,
} from "./useDashboardData";
