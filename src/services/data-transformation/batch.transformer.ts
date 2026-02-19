import { LocalStorageSchema } from "../../types/localData";
import {
  SupabaseProfile,
  SupabaseWorkoutSession,
  SupabaseMealLog,
  SupabaseProgressEntry,
} from "./types";
import { transformOnboardingDataToProfile } from "./profile.transformer";
import { transformWorkoutSessionToSupabase } from "./workout.transformer";
import { transformMealLogToSupabase } from "./meal.transformer";
import { transformBodyMeasurementToSupabase } from "./progress.transformer";

export function transformLocalDataForMigration(
  localSchema: LocalStorageSchema,
  userId: string,
  email: string,
): {
  profile: SupabaseProfile | null;
  workoutSessions: SupabaseWorkoutSession[];
  mealLogs: SupabaseMealLog[];
  progressEntries: SupabaseProgressEntry[];
} {
  const result = {
    profile: null as SupabaseProfile | null,
    workoutSessions: [] as SupabaseWorkoutSession[],
    mealLogs: [] as SupabaseMealLog[],
    progressEntries: [] as SupabaseProgressEntry[],
  };

  if (localSchema.user.onboardingData) {
    result.profile = transformOnboardingDataToProfile(
      localSchema.user.onboardingData,
      userId,
      email,
    );
  }

  result.workoutSessions = localSchema.fitness.sessions.map((session) =>
    transformWorkoutSessionToSupabase(session, userId),
  );

  result.mealLogs = localSchema.nutrition.logs.map((log) =>
    transformMealLogToSupabase(log, userId),
  );

  result.progressEntries = localSchema.progress.measurements.map(
    (measurement) => transformBodyMeasurementToSupabase(measurement, userId),
  );

  return result;
}
