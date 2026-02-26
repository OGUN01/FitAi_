/**
 * Migration Operations
 * Guest-to-user data migration
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncEngine } from "../SyncEngine";
import { MigrationResult, AllDataResult, SaveResult } from "./types";
import { ONBOARDING_DATA_KEY } from "./constants";
import { savePersonalInfo } from "./personalInfo";
import { saveDietPreferences } from "./dietPreferences";
import { saveBodyAnalysis, transformBodyAnalysisForDB } from "./bodyAnalysis";
import {
  saveWorkoutPreferences,
  transformWorkoutPreferencesForDB,
} from "./workoutPreferences";
import { saveAdvancedReview } from "./advancedReview";
import { loadFromLocal } from "./sync";

/**
 * Migrate guest data to authenticated user
 */
export async function migrateGuestToUser(
  userId: string,
  setUserId: (id: string) => void,
): Promise<MigrationResult> {

  const result: MigrationResult = {
    success: true,
    migratedKeys: [],
    errors: [],
    localSyncKeys: [],
    remoteSyncKeys: [],
  };

  try {
    // Step 1: Load all local guest data
    const localData = await loadFromLocal();
    const foundKeys = Object.keys(localData).filter(
      (k) => localData[k as keyof AllDataResult] && k !== "source",
    );

    if (foundKeys.length === 0) {
      return result;
    }

    // Step 2: Set the user ID
    setUserId(userId);
    syncEngine.setUserId(userId);

    // Helper function to migrate a data type
    const migrateDataType = async (
      key: string,
      data: any,
      saveFn: (data: any, userId: string) => Promise<SaveResult>,
      transform?: (data: any) => any,
    ) => {
      const dataToSave = transform ? transform(data) : data;
      const saveResult = await saveFn(dataToSave, userId);

      // ALWAYS add to migratedKeys if local sync worked (ProfileStore updated)
      // Local sync is considered successful if the method didn't throw
      result.migratedKeys.push(key);
      result.localSyncKeys!.push(key);

      // Track remote sync separately
      if (saveResult.newSystemSuccess === true) {
        result.remoteSyncKeys!.push(key);
      } else {
        // Don't add to errors - it's queued for retry, not a failure
      }
    };

    // Step 3: Migrate personalInfo
    if (localData.personalInfo) {
      await migrateDataType(
        "personalInfo",
        localData.personalInfo,
        savePersonalInfo,
      );
    }

    // Step 4: Migrate dietPreferences
    if (localData.dietPreferences) {
      await migrateDataType(
        "dietPreferences",
        localData.dietPreferences,
        saveDietPreferences,
      );
    }

    // Step 5: Migrate bodyAnalysis
    if (localData.bodyAnalysis) {
      await migrateDataType(
        "bodyAnalysis",
        localData.bodyAnalysis,
        saveBodyAnalysis,
        transformBodyAnalysisForDB,
      );
    }

    // Step 6: Migrate workoutPreferences
    if (localData.workoutPreferences) {
      await migrateDataType(
        "workoutPreferences",
        localData.workoutPreferences,
        saveWorkoutPreferences,
        transformWorkoutPreferencesForDB,
      );
    }

    // Step 7: Migrate advancedReview
    if (localData.advancedReview) {
      await migrateDataType(
        "advancedReview",
        localData.advancedReview,
        saveAdvancedReview,
      );
    }

    // Only clear guest data if ALL remote syncs succeeded
    const allRemoteSynced =
      result.remoteSyncKeys!.length === result.localSyncKeys!.length;
    if (allRemoteSynced) {
      await AsyncStorage.removeItem(ONBOARDING_DATA_KEY);
    } else {
    }

    // Migration is successful if local sync worked (data available in app)
    // Remote sync failures are handled by retry mechanism
    result.success = result.localSyncKeys!.length > 0;

    return result;
  } catch (error) {
    console.error("[MIGRATION] Critical error:", error);
    return {
      success: false,
      migratedKeys: result.migratedKeys,
      errors: [`Critical error: ${error}`],
      localSyncKeys: result.localSyncKeys,
      remoteSyncKeys: result.remoteSyncKeys,
    };
  }
}
