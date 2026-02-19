import { dataBridge } from "../DataBridge";
import { enhancedLocalStorage } from "../localStorage";
import { MigrationAttempt, MigrationResult } from "./types";

export async function hasLocalDataToMigrate(): Promise<boolean> {
  try {
    const localData = await dataBridge.exportAllData();
    if (!localData) return false;

    const hasUserData =
      localData.user && Object.keys(localData.user).length > 0;
    const hasFitnessData =
      localData.fitness &&
      ((localData.fitness.workouts?.length || 0) > 0 ||
        (localData.fitness.sessions?.length || 0) > 0);
    const hasNutritionData =
      localData.nutrition &&
      ((localData.nutrition.meals?.length || 0) > 0 ||
        (localData.nutrition.logs?.length || 0) > 0);
    const hasProgressData =
      localData.progress &&
      ((localData.progress.measurements?.length || 0) > 0 ||
        (localData.progress.achievements?.length || 0) > 0);

    return hasUserData || hasFitnessData || hasNutritionData || hasProgressData;
  } catch (error) {
    console.error("Failed to check local data:", error);
    return false;
  }
}

export async function getMigrationHistory(): Promise<MigrationAttempt[]> {
  try {
    const history =
      await enhancedLocalStorage.getData<MigrationAttempt[]>(
        "migration_history",
      );
    return history || [];
  } catch (error) {
    console.error("Failed to get migration history:", error);
    return [];
  }
}

export async function saveMigrationAttemptToHistory(
  result: MigrationResult,
): Promise<void> {
  try {
    const history = await getMigrationHistory();
    const attempt: MigrationAttempt = {
      id: result.migrationId || "",
      startTime: result.progress?.startTime || new Date(),
      endTime: result.progress?.endTime,
      success: result.success,
      error: result.success ? undefined : result.errors?.[0]?.message,
      dataCount: {
        workouts: result.migratedData?.workoutSessions?.length ?? 0,
        meals: result.migratedData?.mealLogs?.length ?? 0,
        measurements: result.migratedData?.bodyMeasurements?.length ?? 0,
      },
    };

    history.unshift(attempt);
    if (history.length > 10) {
      history.splice(10);
    }

    await enhancedLocalStorage.storeData("migration_history", history);
  } catch (error) {
    console.error("Failed to save migration attempt:", error);
  }
}
