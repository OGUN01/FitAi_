/**
 * Stores Barrel Export
 * This file exports all Zustand stores for easy importing
 *
 * ============================================================================
 * SINGLE SOURCE OF TRUTH (SSOT) DOCUMENTATION
 * ============================================================================
 *
 * Each store is responsible for specific data domains. DO NOT duplicate data
 * across stores - use the designated SSOT store for each data type.
 *
 * STORE RESPONSIBILITIES:
 *
 * profileStore (SSOT for Onboarding Profile Data)
 *   - personalInfo: Name, age, gender, location, sleep schedule, occupation
 *   - dietPreferences: Diet type, allergies, restrictions, health habits
 *   - bodyAnalysis: Height, weight, body composition, medical info
 *   - workoutPreferences: Location, equipment, goals, activity level
 *   - advancedReview: Calculated metrics (BMI, TDEE, macros, etc.)
 *   - syncStatus: Tracks local vs remote sync state
 *
 * userStore (Supabase User Operations - NOT for onboarding data)
 *   - profile: Supabase auth user profile (email, id, verification status)
 *   - isProfileComplete: Whether user has completed onboarding
 *   - Supabase CRUD operations (getProfile, updateProfile, etc.)
 *   - NOTE: Does NOT duplicate onboarding data - that's in profileStore
 *
 * authStore (Authentication State)
 *   - user: Current authenticated user
 *   - isAuthenticated: Auth status
 *   - login/logout/register operations
 *
 * fitnessStore (Workout & Exercise Data)
 *   - workoutPlans, exercises, workout history
 *   - NOT for user preferences (use profileStore.workoutPreferences)
 *
 * nutritionStore (Meal & Nutrition Data)
 *   - mealPlans, recipes, food logs
 *   - NOT for diet preferences (use profileStore.dietPreferences)
 *
 * hydrationStore (Water Tracking - SSOT)
 *   - Daily water intake tracking
 *   - Hydration goals and history
 *
 * appStateStore (Shared UI State - SSOT)
 *   - selectedDay, activeTab, UI preferences
 *   - Cross-component shared state
 *
 * healthDataStore (Health Device Data)
 *   - Health Connect / Apple Health data
 *   - Steps, heart rate, sleep data from devices
 *
 * offlineStore (Offline Queue)
 *   - Pending operations for sync
 *   - Network status tracking
 *
 * ============================================================================
 * IMPORTANT: When adding new data, check existing stores first!
 * ============================================================================
 */

export { useUserStore } from "./userStore";
export { useFitnessStore } from "./fitnessStore";
export { useNutritionStore } from "./nutritionStore";
export { useAuthStore } from "./authStore";
export { useOfflineStore } from "./offlineStore";

// NEW: Hydration store - SINGLE SOURCE OF TRUTH for water tracking
export { useHydrationStore } from "./hydrationStore";

// NEW: App State store - SINGLE SOURCE OF TRUTH for shared UI state (selectedDay, etc.)
export { useAppStateStore } from "./appStateStore";
export type { DayName } from "./appStateStore";

// Stores that were missing from barrel export
export { useHealthDataStore } from "./healthDataStore";
export { useAchievementStore } from "./achievementStore";
export { useProfileStore } from "./profileStore";
export { useSubscriptionStore } from "./subscriptionStore";
export { useAnalyticsStore } from "./analyticsStore";

// NOTE: Notification stores are NOT exported here to prevent loading
// expo-notifications in Expo Go. Import them directly from './notificationStore'
// only when you have confirmed the environment supports native modules.
