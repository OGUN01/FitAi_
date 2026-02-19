export type {
  ExerciseData,
  ExerciseAPIResponse,
  ExerciseMatchResult,
  CacheStats,
} from "./types";

export { exerciseVisualService, default } from "./ExerciseVisualService";

export { cacheService, ExerciseCacheService } from "./cacheService";

export {
  fixBrokenCdnUrl,
  normalizeFallbackExerciseName,
  getFallbackGifUrl,
  getWorkingGifUrl,
  inferTargetMuscles,
} from "./urlUtils";

export {
  LOCAL_EXERCISE_MAPPING,
  findLocalExerciseMapping,
} from "./localMappings";

export {
  calculateSimilarity,
  levenshteinDistance,
  findPartialMatchInCache,
  createEmergencyFallback,
} from "./matchingService";

export {
  fetchExercisePage,
  fetchExerciseById,
  fetchExercisesByBodyPart,
  fetchExercisesByEquipment,
  fetchBodyParts,
  fetchEquipments,
  BASE_URL,
} from "./apiService";

export {
  preloadPopularExercises,
  preloadWorkoutVisuals,
  preloadWorkoutPlanVisuals,
} from "./preloadService";
