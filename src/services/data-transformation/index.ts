import {
  transformOnboardingDataToProfile,
  transformUserPreferencesToProfile,
} from "./profile.transformer";
import {
  transformWorkoutSessionToSupabase,
  transformSupabaseToWorkoutSession,
} from "./workout.transformer";
import {
  transformMealLogToSupabase,
  transformSupabaseToMealLog,
} from "./meal.transformer";
import {
  transformBodyMeasurementToSupabase,
  transformSupabaseToBodyMeasurement,
} from "./progress.transformer";
import { detectConflicts, mergeConflictedData } from "./conflict.resolver";
import { transformLocalDataForMigration } from "./batch.transformer";
import { validateTransformationData } from "./validation";

export class DataTransformationService {
  private static instance: DataTransformationService;

  private constructor() {}

  static getInstance(): DataTransformationService {
    if (!DataTransformationService.instance) {
      DataTransformationService.instance = new DataTransformationService();
    }
    return DataTransformationService.instance;
  }

  transformOnboardingDataToProfile = transformOnboardingDataToProfile;
  transformUserPreferencesToProfile = transformUserPreferencesToProfile;
  transformWorkoutSessionToSupabase = transformWorkoutSessionToSupabase;
  transformSupabaseToWorkoutSession = transformSupabaseToWorkoutSession;
  transformMealLogToSupabase = transformMealLogToSupabase;
  transformSupabaseToMealLog = transformSupabaseToMealLog;
  transformBodyMeasurementToSupabase = transformBodyMeasurementToSupabase;
  transformSupabaseToBodyMeasurement = transformSupabaseToBodyMeasurement;
  detectConflicts = detectConflicts;
  mergeConflictedData = mergeConflictedData;
  transformLocalDataForMigration = transformLocalDataForMigration;
  validateTransformationData = validateTransformationData;
}

export const dataTransformation = DataTransformationService.getInstance();
export default dataTransformation;

export * from "./types";
export * from "./profile.transformer";
export * from "./workout.transformer";
export * from "./meal.transformer";
export * from "./progress.transformer";
export * from "./conflict.resolver";
export * from "./batch.transformer";
export * from "./validation";
