// Stores Barrel Export
// This file exports all Zustand stores for easy importing

export { useUserStore } from './userStore';
export { useFitnessStore } from './fitnessStore';
export { useNutritionStore } from './nutritionStore';
export { useAuthStore } from './authStore';
export { useOfflineStore } from './offlineStore';

// NOTE: Notification stores are NOT exported here to prevent loading
// expo-notifications in Expo Go. Import them directly from './notificationStore'
// only when you have confirmed the environment supports native modules.
