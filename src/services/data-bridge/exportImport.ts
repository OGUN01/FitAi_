/**
 * Export/Import Operations
 * Data export and import functionality
 */

import { AllDataResult } from "./types";
import {
  getWorkoutSessions,
  getMealLogs,
  getBodyMeasurements,
  storeWorkoutSession,
  storeMealLog,
  storeBodyMeasurement,
} from "./storage";

/**
 * Export all user data
 */
export async function exportAllData(
  loadAllDataFn: () => Promise<AllDataResult>,
): Promise<any> {
  try {
    const allData = await loadAllDataFn();
    const workoutSessions = await getWorkoutSessions(100);
    const mealLogs = await getMealLogs(undefined, 500);
    const bodyMeasurements = await getBodyMeasurements(100);

    return {
      user: {
        personalInfo: allData.personalInfo,
        dietPreferences: allData.dietPreferences,
        workoutPreferences: allData.workoutPreferences,
      },
      fitness: {
        bodyAnalysis: allData.bodyAnalysis,
        workoutSessions,
      },
      nutrition: {
        mealLogs,
      },
      progress: {
        bodyMeasurements,
        advancedReview: allData.advancedReview,
      },
      exportedAt: new Date().toISOString(),
      version: "2.0",
    };
  } catch (error) {
    console.error("[DataBridge] exportAllData error:", error);
    return null;
  }
}

/**
 * Get data statistics
 */
export async function getDataStatistics(
  loadPersonalInfoFn: () => Promise<any>,
  loadDietPreferencesFn: () => Promise<any>,
  loadWorkoutPreferencesFn: () => Promise<any>,
): Promise<any> {
  try {
    const workoutSessions = await getWorkoutSessions(100);
    const mealLogs = await getMealLogs(undefined, 500);
    const bodyMeasurements = await getBodyMeasurements(100);

    return {
      workoutSessionsCount: workoutSessions.length,
      mealLogsCount: mealLogs.length,
      bodyMeasurementsCount: bodyMeasurements.length,
      hasPersonalInfo: !!(await loadPersonalInfoFn()),
      hasDietPreferences: !!(await loadDietPreferencesFn()),
      hasWorkoutPreferences: !!(await loadWorkoutPreferencesFn()),
    };
  } catch (error) {
    console.error("[DataBridge] getDataStatistics error:", error);
    return {};
  }
}

/**
 * Import all data
 */
export async function importData(
  data: any,
  savePersonalInfoFn: (data: any) => Promise<any>,
  saveDietPreferencesFn: (data: any) => Promise<any>,
  saveWorkoutPreferencesFn: (data: any) => Promise<any>,
  saveBodyAnalysisFn: (data: any) => Promise<any>,
  saveAdvancedReviewFn: (data: any) => Promise<any>,
): Promise<boolean> {
  try {
    if (data.user) {
      if (data.user.personalInfo)
        await savePersonalInfoFn(data.user.personalInfo);
      if (data.user.dietPreferences)
        await saveDietPreferencesFn(data.user.dietPreferences);
      if (data.user.workoutPreferences)
        await saveWorkoutPreferencesFn(data.user.workoutPreferences);
    }
    if (data.fitness?.bodyAnalysis)
      await saveBodyAnalysisFn(data.fitness.bodyAnalysis);
    if (data.progress?.advancedReview)
      await saveAdvancedReviewFn(data.progress.advancedReview);
    return true;
  } catch (error) {
    console.error("[DataBridge] importData error:", error);
    return false;
  }
}

/**
 * Import user data only
 */
export async function importUserData(
  data: any,
  savePersonalInfoFn: (data: any) => Promise<any>,
  saveDietPreferencesFn: (data: any) => Promise<any>,
  saveWorkoutPreferencesFn: (data: any) => Promise<any>,
): Promise<boolean> {
  try {
    if (data.personalInfo) await savePersonalInfoFn(data.personalInfo);
    if (data.dietPreferences) await saveDietPreferencesFn(data.dietPreferences);
    if (data.workoutPreferences)
      await saveWorkoutPreferencesFn(data.workoutPreferences);
    return true;
  } catch (error) {
    console.error("[DataBridge] importUserData error:", error);
    return false;
  }
}

/**
 * Import fitness data
 */
export async function importFitnessData(
  data: any,
  saveBodyAnalysisFn: (data: any) => Promise<any>,
): Promise<boolean> {
  try {
    if (data.bodyAnalysis) await saveBodyAnalysisFn(data.bodyAnalysis);
    if (data.workoutSessions) {
      for (const session of data.workoutSessions) {
        await storeWorkoutSession(session);
      }
    }
    return true;
  } catch (error) {
    console.error("[DataBridge] importFitnessData error:", error);
    return false;
  }
}

/**
 * Import nutrition data
 */
export async function importNutritionData(data: any): Promise<boolean> {
  try {
    if (data.mealLogs) {
      for (const log of data.mealLogs) {
        await storeMealLog(log);
      }
    }
    return true;
  } catch (error) {
    console.error("[DataBridge] importNutritionData error:", error);
    return false;
  }
}

/**
 * Import progress data
 */
export async function importProgressData(
  data: any,
  saveAdvancedReviewFn: (data: any) => Promise<any>,
): Promise<boolean> {
  try {
    if (data.bodyMeasurements) {
      for (const measurement of data.bodyMeasurements) {
        await storeBodyMeasurement(measurement);
      }
    }
    if (data.advancedReview) await saveAdvancedReviewFn(data.advancedReview);
    return true;
  } catch (error) {
    console.error("[DataBridge] importProgressData error:", error);
    return false;
  }
}
