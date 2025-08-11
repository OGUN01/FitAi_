// AI Schemas Index - Export all schemas for structured generation

// Enhanced workout schemas for day-wise generation
export {
  DAILY_WORKOUT_SCHEMA,
  WEEKLY_PLAN_SCHEMA,
  EXERCISE_GENERATION_SCHEMA,
} from './workoutSchema';

// Food recognition and meal schemas
export {
  FOOD_RECOGNITION_SCHEMA,
  MEAL_GENERATION_SCHEMA,
  RECIPE_CREATION_SCHEMA,
} from './foodRecognitionSchema';

// Legacy schemas (re-exported for backward compatibility)
export {
  WORKOUT_SCHEMA,
  NUTRITION_SCHEMA,
  WEEKLY_MEAL_PLAN_SCHEMA,
  MOTIVATIONAL_CONTENT_SCHEMA,
  FOOD_ANALYSIS_SCHEMA,
  PROGRESS_ANALYSIS_SCHEMA,
} from '../schemas';

// Re-export for convenience
export * from './workoutSchema';
export * from './foodRecognitionSchema';
