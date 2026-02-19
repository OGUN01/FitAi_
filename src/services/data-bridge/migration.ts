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
  console.log("[MIGRATION] ====== STARTING GUEST-TO-USER MIGRATION ======");
  console.log("[MIGRATION] User ID:", userId);

  const result: MigrationResult = {
    success: true,
    migratedKeys: [],
    errors: [],
    localSyncKeys: [],
    remoteSyncKeys: [],
  };

  try {
    // Step 1: Load all local guest data
    console.log(
      "[MIGRATION] Step 1/6: Loading guest data from AsyncStorage...",
    );
    const localData = await loadFromLocal();
    const foundKeys = Object.keys(localData).filter(
      (k) => localData[k as keyof AllDataResult] && k !== "source",
    );
    console.log("[MIGRATION] Found data keys:", foundKeys);

    if (foundKeys.length === 0) {
      console.log("[MIGRATION] No guest data found to migrate");
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
      console.log(`[MIGRATION] Migrating ${key}...`);
      const dataToSave = transform ? transform(data) : data;
      const saveResult = await saveFn(dataToSave, userId);

      // ALWAYS add to migratedKeys if local sync worked (ProfileStore updated)
      // Local sync is considered successful if the method didn't throw
      result.migratedKeys.push(key);
      result.localSyncKeys!.push(key);
      console.log(`[MIGRATION] ✅ ${key} LOCAL sync successful`);

      // Track remote sync separately
      if (saveResult.newSystemSuccess === true) {
        result.remoteSyncKeys!.push(key);
        console.log(`[MIGRATION] ✅ ${key} REMOTE sync successful`);
      } else {
        console.warn(
          `[MIGRATION] ⚠️ ${key} REMOTE sync pending - will retry automatically`,
        );
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
      console.log(
        "[MIGRATION] ✅ Guest data cleared - all data synced to database",
      );
    } else {
      console.log(
        "[MIGRATION] ⚠️ Keeping guest data - some items pending remote sync",
      );
      console.log(
        "[MIGRATION] Pending:",
        result.localSyncKeys!.filter(
          (k) => !result.remoteSyncKeys!.includes(k),
        ),
      );
    }

    // Migration is successful if local sync worked (data available in app)
    // Remote sync failures are handled by retry mechanism
    result.success = result.localSyncKeys!.length > 0;

    console.log("[MIGRATION] ====== MIGRATION COMPLETE ======");
    console.log("[MIGRATION] Summary:", {
      localSyncKeys: result.localSyncKeys,
      remoteSyncKeys: result.remoteSyncKeys,
      pendingRemoteSync: result.localSyncKeys!.filter(
        (k) => !result.remoteSyncKeys!.includes(k),
      ),
    });

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
