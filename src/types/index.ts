// Types Barrel Export
// Keep exports explicit to avoid name collisions across modules.

// User domain
export { PersonalInfo, FitnessGoals, DietPreferences, WorkoutPreferences, UserProfile, TimeCommitment } from './user';

// Workout domain
export { Workout, WorkoutPlan, WorkoutSession } from './workout';
export type { WorkoutPreferences as ApiWorkoutPreferences } from './api';

// Diet domain
export { DailyMealPlan, Meal, MealItem, Macronutrients, ShoppingListItem } from './diet';

// API domain (export only stable request/response types to avoid naming overlaps)
export { ApiResponse, ApiError, PaginatedResponse, ApiRequestOptions } from './api';

// AI domain
// NOTE: Keep AI exports minimal to prevent name drift; export types only if they exist
// export { AIModelConfig, AIGenerationOptions } from './ai';

// Note: localData exports are handled separately to avoid conflicts
// Import specific types from localData when needed
