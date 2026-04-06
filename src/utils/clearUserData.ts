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
import { useUserStore } from "../stores/userStore";
import { useHydrationStore } from "../stores/hydrationStore";
import { useAnalyticsStore } from "../stores/analyticsStore";
import { useAchievementStore } from "../stores/achievementStore";
import { useHealthDataStore } from "../stores/healthDataStore";
import { useAppStateStore } from "../stores/appStateStore";
import { useSubscriptionStore } from "../stores/subscriptionStore";
import { useProfileStore } from "../stores/profileStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearNutritionCache } from "../stores/nutrition/selectors";
import { invalidateMetricsCache } from "../hooks/useCalculatedMetrics";
import { userMetricsService } from "../services/userMetricsService";
import { offlineService } from "../services/offline";
import { syncEngine } from "../services/SyncEngine";

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
      console.error(`[clearUserData] Failed to reset ${storeName}:`, e);
      errors.push(storeName);
    }
  };

  // Clear each store's state individually
  // Using getState() to access the store methods outside of React components

  // Fitness store
  const fitnessState = useFitnessStore.getState();
  const fitnessResetFn = fitnessState.reset || fitnessState.clearData;
  if (fitnessResetFn) {
    safeReset("Fitness store", fitnessResetFn);
  } else {
    console.warn('[clearUserData] No reset method found on store:', 'fitnessStore');
  }

  // Nutrition store
  const nutritionState = useNutritionStore.getState();
  const nutritionResetFn = nutritionState.reset || nutritionState.clearData;
  if (nutritionResetFn) {
    safeReset("Nutrition store", nutritionResetFn);
  } else {
    console.warn('[clearUserData] No reset method found on store:', 'nutritionStore');
  }

  // Clear module-level nutrition selector caches (prevents stale data across user sessions)
  clearNutritionCache();

  // Clear singleton service caches (user-specific data keyed without userId)
  try {
    userMetricsService.clearCache();
  } catch (e) {
    console.error("Failed to clear userMetricsService cache:", e);
  }
  try {
    invalidateMetricsCache();
  } catch (e) {
    console.error("Failed to invalidate metrics cache:", e);
  }

  // Hydration store
  const hydrationState = useHydrationStore.getState();
  const hydrationResetFn = hydrationState.reset || hydrationState.resetDaily;
  if (hydrationResetFn) {
    safeReset("Hydration store", hydrationResetFn);
  } else {
    console.warn('[clearUserData] No reset method found on store:', 'hydrationStore');
  }

  // Analytics store
  const analyticsState = useAnalyticsStore.getState();
  if (analyticsState.reset) safeReset("Analytics store", analyticsState.reset);

  // Achievement store
  const achievementState = useAchievementStore.getState();
  if (achievementState.reset)
    safeReset("Achievement store", achievementState.reset);

  // Health data store
  const healthDataState = useHealthDataStore.getState();
  const healthDataResetFn = healthDataState.reset || healthDataState.resetHealthData;
  if (healthDataResetFn) {
    safeReset("Health data store", healthDataResetFn);
  } else {
    console.warn('[clearUserData] No reset method found on store:', 'healthDataStore');
  }

  // Subscription store
  const subscriptionState = useSubscriptionStore.getState();
  safeReset("Subscription store", () => subscriptionState.clearSubscription());

  // App state store
  const appState = useAppStateStore.getState();
  const appStateResetFn = appState.reset || appState.resetToToday;
  if (appStateResetFn) {
    safeReset("App state store", appStateResetFn);
  } else {
    console.warn('[clearUserData] No reset method found on store:', 'appStateStore');
  }

  // Profile store
  const profileState = useProfileStore.getState();
  if (profileState.reset) {
    safeReset("Profile store", profileState.reset);
  } else {
    console.warn('[clearUserData] No reset method found on store:', 'profileStore');
  }

  // User store (profile + isProfileComplete — must clear to prevent cross-user data leak)
  const userState = useUserStore.getState();
  safeReset("User store", userState.reset);

  // Also clear persisted storage for these stores and any auth-scoped queues
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
    "profile-storage-v2",
    "user-storage",
    "enhanced-offline-storage",
    "auth_session",
    "offline_sync_queue",
    "offline_data",
    "@fitai_sync_queue",
    "@fitai_last_sync",
    "onboarding_data",
    "onboarding_completed",
    "profileEditIntent",
    // DataBridge CRUD cache — must clear to prevent stale data leaking across user sessions
    "workout_sessions",
    "meal_logs",
    "body_analysis",
    "body_measurements",
    // Notification preferences and store
    "notification-store",
    "notification_preferences",
  ];

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    for (const key of allKeys) {
      if (
        key.startsWith("onboarding_") ||
        key.startsWith("onboarding_partial_")
      ) {
        storageKeysToRemove.push(key);
      }
    }
  } catch (e) {
    console.error("Failed to enumerate AsyncStorage keys for cleanup:", e);
  }

  try {
    await offlineService.clearOfflineData();
  } catch (e) {
    console.error("Failed to clear offline service data:", e);
  }

  try {
    await syncEngine.resetForLogout();
  } catch (e) {
    console.error("Failed to reset sync engine state:", e);
  }

  await Promise.all(
    Array.from(new Set(storageKeysToRemove)).map((key) =>
      AsyncStorage.removeItem(key).catch((e) => {
        console.error(`Failed to remove AsyncStorage key "${key}":`, e);
      }),
    ),
  );

  try {
    const Notifications = require('expo-notifications');
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.error("[clearUserData] Failed to cancel notifications:", e);
  }

  if (errors.length > 0) {
    console.error(
      "[clearUserData] Some stores failed to reset, user data may persist:",
      errors,
    );
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
