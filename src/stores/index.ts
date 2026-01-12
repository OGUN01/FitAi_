// Stores Barrel Export
// This file exports all Zustand stores for easy importing

export { useUserStore } from './userStore';
export { useFitnessStore } from './fitnessStore';
export { useNutritionStore } from './nutritionStore';
export { useAuthStore } from './authStore';
export { useOfflineStore } from './offlineStore';

// NEW: Hydration store - SINGLE SOURCE OF TRUTH for water tracking
export { useHydrationStore } from './hydrationStore';

// NEW: App State store - SINGLE SOURCE OF TRUTH for shared UI state (selectedDay, etc.)
export { useAppStateStore } from './appStateStore';
export type { DayName } from './appStateStore';

// Stores that were missing from barrel export
export { useHealthDataStore } from './healthDataStore';
export { useAchievementStore } from './achievementStore';
export { useProfileStore } from './profileStore';
export { useSubscriptionStore } from './subscriptionStore';
export { useAnalyticsStore } from './analyticsStore';

// NOTE: Notification stores are NOT exported here to prevent loading
// expo-notifications in Expo Go. Import them directly from './notificationStore'
// only when you have confirmed the environment supports native modules.
