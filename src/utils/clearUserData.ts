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
import { useSubscriptionStore } from "../stores/subscriptionStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearNutritionCache } from "../stores/nutrition/selectors";

/**
 * Clears all user data from all stores.
 * Call this function on logout AFTER calling the auth logout.
 */
export const clearAllUserData = async (): Promise<void> => {

  const errors: string[] = [];

  // Helper: safely reset a store without letting one failure block others
  const safeReset = (storeName: string, resetFn: () => void) => {
    try {
      resetFn();
    } catch (e) {
      errors.push(storeName);
    }
  };

  // Clear each store's state individually
  // Using getState() to access the store methods outside of React components

  // Fitness store
  const fitnessState = useFitnessStore.getState();
  safeReset("Fitness store", fitnessState.reset || fitnessState.clearData || (() => {}));

  // Nutrition store
  const nutritionState = useNutritionStore.getState();
  safeReset("Nutrition store", nutritionState.reset || nutritionState.clearData || (() => {}));

  // Clear module-level nutrition selector caches (prevents stale data across user sessions)
  clearNutritionCache();

  // Hydration store
  const hydrationState = useHydrationStore.getState();
  safeReset("Hydration store", hydrationState.reset || hydrationState.resetDaily || (() => {}));

  // Analytics store
  const analyticsState = useAnalyticsStore.getState();
  if (analyticsState.reset) safeReset("Analytics store", analyticsState.reset);

  // Achievement store
  const achievementState = useAchievementStore.getState();
  if (achievementState.reset) safeReset("Achievement store", achievementState.reset);

  // Health data store
  const healthDataState = useHealthDataStore.getState();
  safeReset("Health data store", healthDataState.reset || healthDataState.resetHealthData || (() => {}));

  // Subscription store
  const subscriptionState = useSubscriptionStore.getState();
  safeReset("Subscription store", () => subscriptionState.clearSubscription());

  // App state store
  const appState = useAppStateStore.getState();
  safeReset("App state store", appState.reset || appState.resetToToday || (() => {}));

  // Also clear persisted storage for these stores
  const storageKeysToRemove = [
    "fitness-storage",
    "nutrition-storage",
    "fitai-hydration-storage",
    "analytics-storage",
    "achievement-storage",
    "fitai-health-data-store",
    "fitai-app-state-storage",
    "subscription-storage",
    "auth-storage",
  ];

  await Promise.all(
    storageKeysToRemove.map((key) =>
      AsyncStorage.removeItem(key).catch(() => {}),
    ),
  );

  if (errors.length > 0) {
    // errors occurred but we don't throw - best effort cleanup
  }

};

/**
 * Clears only the plan data (workouts and meals) without affecting other stores.
 * Useful for regenerating plans.
 */
export const clearPlanData = (): void => {

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

};

export default clearAllUserData;
