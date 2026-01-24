/**
 * Clear All User Data Utility
 *
 * CRITICAL: This utility must be called on logout to prevent
 * previous user's data from being visible to new users.
 *
 * All stores must expose a reset() function that clears their state
 * back to initial values.
 */

import { useFitnessStore } from "../stores/fitnessStore";
import { useNutritionStore } from "../stores/nutritionStore";
import { useHydrationStore } from "../stores/hydrationStore";
import { useAnalyticsStore } from "../stores/analyticsStore";
import { useAchievementStore } from "../stores/achievementStore";
import { useHealthDataStore } from "../stores/healthDataStore";
import { useAppStateStore } from "../stores/appStateStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Clears all user data from all stores.
 * Call this function on logout AFTER calling the auth logout.
 */
export const clearAllUserData = async (): Promise<void> => {
  console.log("🧹 Clearing all user data from stores...");

  try {
    // Clear each store's state
    // Using getState() to access the store methods outside of React components

    // Fitness store
    const fitnessReset = useFitnessStore.getState().reset;
    if (fitnessReset) {
      fitnessReset();
      console.log("  ✅ Fitness store cleared");
    } else {
      useFitnessStore.getState().clearData();
      console.log("  ✅ Fitness store cleared (via clearData)");
    }

    // Nutrition store
    const nutritionReset = useNutritionStore.getState().reset;
    if (nutritionReset) {
      nutritionReset();
      console.log("  ✅ Nutrition store cleared");
    } else {
      useNutritionStore.getState().clearData();
      console.log("  ✅ Nutrition store cleared (via clearData)");
    }

    // Hydration store
    const hydrationReset = useHydrationStore.getState().reset;
    if (hydrationReset) {
      hydrationReset();
      console.log("  ✅ Hydration store cleared");
    } else {
      useHydrationStore.getState().resetDaily();
      console.log("  ✅ Hydration store cleared (via resetDaily)");
    }

    // Analytics store
    const analyticsReset = useAnalyticsStore.getState().reset;
    if (analyticsReset) {
      analyticsReset();
      console.log("  ✅ Analytics store cleared");
    }

    // Achievement store
    const achievementReset = useAchievementStore.getState().reset;
    if (achievementReset) {
      achievementReset();
      console.log("  ✅ Achievement store cleared");
    }

    // Health data store
    const healthDataReset = useHealthDataStore.getState().reset;
    if (healthDataReset) {
      healthDataReset();
      console.log("  ✅ Health data store cleared");
    } else {
      useHealthDataStore.getState().resetHealthData();
      console.log("  ✅ Health data store cleared (via resetHealthData)");
    }

    // App state store
    const appStateReset = useAppStateStore.getState().reset;
    if (appStateReset) {
      appStateReset();
      console.log("  ✅ App state store cleared");
    } else {
      useAppStateStore.getState().resetToToday();
      console.log("  ✅ App state store cleared (via resetToToday)");
    }

    // Also clear persisted storage for these stores
    const storageKeysToRemove = [
      "fitness-storage",
      "nutrition-storage",
      "fitai-hydration-storage",
      "analytics-storage",
      "achievement-storage",
      "fitai-health-data-store",
      "fitai-app-state-storage",
    ];

    await Promise.all(
      storageKeysToRemove.map((key) =>
        AsyncStorage.removeItem(key).catch((e) =>
          console.warn(`  ⚠️ Failed to remove ${key}:`, e),
        ),
      ),
    );
    console.log("  ✅ Persisted storage cleared");

    console.log("✅ All user data cleared successfully");
  } catch (error) {
    console.error("❌ Error clearing user data:", error);
    throw error;
  }
};

/**
 * Clears only the plan data (workouts and meals) without affecting other stores.
 * Useful for regenerating plans.
 */
export const clearPlanData = (): void => {
  console.log("🧹 Clearing plan data...");

  // Clear fitness plan
  const fitnessReset = useFitnessStore.getState().clearData;
  if (fitnessReset) {
    fitnessReset();
  }

  // Clear nutrition plan
  const nutritionReset = useNutritionStore.getState().clearData;
  if (nutritionReset) {
    nutritionReset();
  }

  console.log("✅ Plan data cleared");
};

export default clearAllUserData;
