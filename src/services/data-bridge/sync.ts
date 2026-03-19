/**
 * Sync Operations
 * Data loading and synchronization coordination
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUserStore } from "../../stores/userStore";
import { useProfileStore } from "../../stores/profileStore";
import {
  PersonalInfoService,
  DietPreferencesService,
  BodyAnalysisService,
  WorkoutPreferencesService,
  AdvancedReviewService,
} from "../onboardingService";
import {
  AllDataResult,
  ShadowModeReport,
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  PersonalInfo,
  DietPreferences,
  WorkoutPreferences,
} from "./types";
import { ONBOARDING_DATA_KEY } from "./constants";

/**
 * Load data from local storage (ProfileStore + AsyncStorage)
 */
export async function loadFromLocal(): Promise<AllDataResult> {
  try {
    // Check ProfileStore first
    const profileStore = useProfileStore.getState();
    if (profileStore.personalInfo) {
      return {
        personalInfo: profileStore.personalInfo,
        dietPreferences: profileStore.dietPreferences,
        bodyAnalysis: profileStore.bodyAnalysis,
        workoutPreferences: profileStore.workoutPreferences,
        advancedReview: profileStore.advancedReview,
        source: "new_system",
      };
    }

    // Fallback to AsyncStorage (onboarding_data key)
    const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    if (dataStr) {
      const data = JSON.parse(dataStr);
      return {
        personalInfo: data.personalInfo || null,
        dietPreferences: data.dietPreferences || null,
        bodyAnalysis: data.bodyAnalysis || null,
        workoutPreferences: data.workoutPreferences || null,
        advancedReview: data.advancedReview || null,
        source: "new_system",
      };
    }

    return {
      personalInfo: null,
      dietPreferences: null,
      bodyAnalysis: null,
      workoutPreferences: null,
      advancedReview: null,
      source: "new_system",
    };
  } catch (error) {
    console.error("[DataBridge] loadFromLocal error:", error);
    return {
      personalInfo: null,
      dietPreferences: null,
      bodyAnalysis: null,
      workoutPreferences: null,
      advancedReview: null,
      source: "new_system",
    };
  }
}

/**
 * Load data from database
 */
export async function loadFromDatabase(userId: string): Promise<AllDataResult> {
  try {
    const [
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences,
      advancedReview,
    ] = await Promise.all([
      PersonalInfoService.load(userId).catch((e) => {
        console.error("Failed to load personalInfo:", e);
        return null;
      }),
      DietPreferencesService.load(userId).catch((e) => {
        console.error("Failed to load dietPreferences:", e);
        return null;
      }),
      BodyAnalysisService.load(userId).catch((e) => {
        console.error("Failed to load bodyAnalysis:", e);
        return null;
      }),
      WorkoutPreferencesService.load(userId).catch((e) => {
        console.error("Failed to load workoutPreferences:", e);
        return null;
      }),
      AdvancedReviewService.load(userId).catch((e) => {
        console.error("Failed to load advancedReview:", e);
        return null;
      }),
    ]);

    // Update ProfileStore with loaded data (SSOT for onboarding data)
    const profileStore = useProfileStore.getState();
    if (personalInfo) profileStore.updatePersonalInfo(personalInfo);
    if (dietPreferences) profileStore.updateDietPreferences(dietPreferences);
    if (bodyAnalysis) profileStore.updateBodyAnalysis(bodyAnalysis);
    if (workoutPreferences)
      profileStore.updateWorkoutPreferences(workoutPreferences);
    if (advancedReview) profileStore.updateAdvancedReview(advancedReview);

    // NOTE: userStore is NOT updated here - profileStore is the SSOT
    // userStore.updatePersonalInfo is deprecated and should not be used
    // See: src/stores/userStore.ts for deprecation notice

    return {
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences,
      advancedReview,
      source: "new_system",
    };
  } catch (error) {
    console.error("[DataBridge] loadFromDatabase error:", error);
    return await loadFromLocal();
  }
}

/**
 * Load all data (local or database based on user state)
 */
export async function loadAllData(
  currentUserId: string | null,
  userId?: string,
): Promise<AllDataResult> {
  const targetUserId = userId || currentUserId;

  try {
    if (!targetUserId) {
      return await loadFromLocal();
    }
    return await loadFromDatabase(targetUserId);
  } catch (error) {
    console.error("[DataBridge] loadAllData error:", error);
    return await loadFromLocal();
  }
}

/**
 * Check if local data exists
 */
export async function hasLocalData(): Promise<boolean> {
  try {
    // Check ProfileStore
    const profileStore = useProfileStore.getState();
    if (profileStore.personalInfo || profileStore.dietPreferences) {
      return true;
    }

    // Check AsyncStorage
    const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    if (dataStr) {
      const data = JSON.parse(dataStr);
      return !!(data.personalInfo || data.dietPreferences || data.bodyAnalysis);
    }

    return false;
  } catch (error) {
    console.error("[DataBridge] hasLocalData error:", error);
    return false;
  }
}

/**
 * Get shadow mode report (stub - shadow mode removed)
 */
export async function getShadowModeReport(
  loadAllDataFn: () => Promise<AllDataResult>,
): Promise<ShadowModeReport> {
  // Shadow mode no longer available - return empty report
  return {
    discrepancies: [],
    oldSystemData: null,
    newSystemData: await loadAllDataFn(),
    comparisonTimestamp: new Date().toISOString(),
    isConsistent: true,
  };
}

/**
 * Clear local data
 */
export async function clearLocalData(): Promise<void> {
  try {
    // Clear ProfileStore
    const profileStore = useProfileStore.getState();
    profileStore.reset();

    // Clear AsyncStorage
    await AsyncStorage.removeItem(ONBOARDING_DATA_KEY);
  } catch (error) {
    console.error("[DataBridge] clearLocalData error:", error);
  }
}

/**
 * Get profile data summary
 */
export async function getProfileDataSummary(
  loadAllDataFn: () => Promise<AllDataResult>,
): Promise<any> {
  const data = await loadAllDataFn();
  return {
    hasPersonalInfo: !!data.personalInfo,
    hasDietPreferences: !!data.dietPreferences,
    hasBodyAnalysis: !!data.bodyAnalysis,
    hasWorkoutPreferences: !!data.workoutPreferences,
    hasAdvancedReview: !!data.advancedReview,
    source: data.source,
  };
}
