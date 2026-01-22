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
