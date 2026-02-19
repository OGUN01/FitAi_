/**
 * Type definitions for AI Request Transformers
 *
 * Re-exports types from related modules and defines transformer-specific types.
 */

export type {
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  BodyMetrics,
} from "../../types/user";

export type {
  DietGenerationRequest,
  WorkoutGenerationRequest,
  WorkersResponse,
  DietPlan,
  WorkoutPlan,
} from "../fitaiWorkersClient";

export type {
  WeeklyMealPlan,
  WeeklyWorkoutPlan,
  Meal,
  DayMeal,
  Workout,
} from "../../types/ai";
