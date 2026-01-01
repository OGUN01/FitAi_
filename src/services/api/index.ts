// API Services Barrel Export
// This file exports all API service functions

// Workers API Client
export {
  FitAIWorkersClient,
  fitaiWorkersClient,
  WorkersAPIError,
  NetworkError,
  AuthenticationError,
  type WorkersClientConfig,
  type WorkersResponse,
  type DietGenerationRequest,
  type WorkoutGenerationRequest,
} from '../fitaiWorkersClient';

// Data Transformers
export {
  transformDietResponse,
  transformWorkoutResponse,
  transformValidationErrors,
  transformExerciseWarnings,
  generatePlanId,
  generateMealId,
  generateExerciseId,
  type TransformedDietPlan,
  type TransformedWorkoutPlan,
  type ValidationError,
} from '../dataTransformers';

// TODO: Implement these API services when needed
// export { authService } from './authService';
// export { bodyAnalysisService } from './bodyAnalysisService';
// export { storageService } from './storageService';
