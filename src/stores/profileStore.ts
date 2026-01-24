/**
 * Unified Profile Store for FitAI
 *
 * ============================================================================
 * SINGLE SOURCE OF TRUTH (SSOT) FOR ONBOARDING PROFILE DATA
 * ============================================================================
 *
 * This store is the AUTHORITATIVE source for all onboarding-related data:
 *   - personalInfo (name, age, gender, height, weight, etc.)
 *   - dietPreferences (dietary restrictions, allergies, cuisine preferences)
 *   - bodyAnalysis (measurements, body composition goals)
 *   - workoutPreferences (exercise preferences, schedule, experience level)
 *   - advancedReview (health conditions, medications, special notes)
 *
 * DATA FORMAT: All fields use snake_case to match database schema
 *   - first_name (not firstName)
 *   - primary_goals (not primaryGoals)
 *   - See src/types/onboarding.ts for complete type definitions
 *
 * IMPORTANT ARCHITECTURAL NOTES:
 *   - DataBridge reads/writes through this store (not userStore)
 *   - OnboardingContainer uses this store for UI state
 *   - userStore is ONLY for Supabase auth operations (not onboarding data)
 *   - For snake_case/camelCase conversion, see src/utils/typeTransformers.ts
 *
 * Storage key: 'profile-storage-v2' (v2 to avoid conflicts with existing stores)
 *
 * @see src/services/DataBridge.ts - Data sync layer
 * @see src/screens/onboarding/OnboardingContainer.tsx - UI consumer
 * @see src/types/onboarding.ts - Type definitions
 */

import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  subscribeWithSelector,
} from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import types from onboarding (which are the actual data structures used)
import type {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../types/onboarding";

// ============================================================================
// SYNC STATUS TYPES
// ============================================================================

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "pending";

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

export interface ProfileState {
  // Profile data sections (matching onboarding tabs)
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  advancedReview: AdvancedReviewData | null;

  // Sync management
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;

  // Hydration tracking (for legacy data migration)
  isHydrated: boolean;
}

// ============================================================================
// STORE ACTIONS INTERFACE
// ============================================================================

export interface ProfileActions {
  // Data update actions (each marks state as pending)
  updatePersonalInfo: (data: Partial<PersonalInfoData>) => void;
  updateDietPreferences: (data: Partial<DietPreferencesData>) => void;
  updateBodyAnalysis: (data: Partial<BodyAnalysisData>) => void;
  updateWorkoutPreferences: (data: Partial<WorkoutPreferencesData>) => void;
  updateAdvancedReview: (data: Partial<AdvancedReviewData>) => void;

  // Sync status management
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;

  // Legacy data migration
  hydrateFromLegacy: (data: Partial<ProfileState>) => void;

  // Reset store
  reset: () => void;
}

// ============================================================================
// COMBINED STORE TYPE
// ============================================================================

export type ProfileStore = ProfileState & ProfileActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: ProfileState = {
  // Profile data
  personalInfo: null,
  dietPreferences: null,
  bodyAnalysis: null,
  workoutPreferences: null,
  advancedReview: null,

  // Sync management
  syncStatus: "idle",
  lastSyncedAt: null,
  syncError: null,

  // Hydration tracking
  isHydrated: false,
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useProfileStore = create<ProfileStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state spread
        ...initialState,

        // ========================================================================
        // DATA UPDATE ACTIONS
        // ========================================================================

        /**
         * Update personal info and mark sync status as pending
         */
        updatePersonalInfo: (data: Partial<PersonalInfoData>) => {
          console.log(
            "[ProfileStore] updatePersonalInfo called with:",
            Object.keys(data),
          );
          set((state) => ({
            personalInfo: state.personalInfo
              ? { ...state.personalInfo, ...data }
              : (data as PersonalInfoData),
            syncStatus: "pending",
          }));
        },

        /**
         * Update diet preferences and mark sync status as pending
         */
        updateDietPreferences: (data: Partial<DietPreferencesData>) => {
          console.log(
            "[ProfileStore] updateDietPreferences called with:",
            Object.keys(data),
          );
          set((state) => ({
            dietPreferences: state.dietPreferences
              ? { ...state.dietPreferences, ...data }
              : (data as DietPreferencesData),
            syncStatus: "pending",
          }));
        },

        /**
         * Update body analysis and mark sync status as pending
         */
        updateBodyAnalysis: (data: Partial<BodyAnalysisData>) => {
          console.log(
            "[ProfileStore] updateBodyAnalysis called with:",
            Object.keys(data),
          );
          set((state) => ({
            bodyAnalysis: state.bodyAnalysis
              ? { ...state.bodyAnalysis, ...data }
              : (data as BodyAnalysisData),
            syncStatus: "pending",
          }));
        },

        /**
         * Update workout preferences and mark sync status as pending
         */
        updateWorkoutPreferences: (data: Partial<WorkoutPreferencesData>) => {
          console.log(
            "[ProfileStore] updateWorkoutPreferences called with:",
            Object.keys(data),
          );
          set((state) => ({
            workoutPreferences: state.workoutPreferences
              ? { ...state.workoutPreferences, ...data }
              : (data as WorkoutPreferencesData),
            syncStatus: "pending",
          }));
        },

        /**
         * Update advanced review and mark sync status as pending
         */
        updateAdvancedReview: (data: Partial<AdvancedReviewData>) => {
          console.log(
            "[ProfileStore] updateAdvancedReview called with:",
            Object.keys(data),
          );
          set((state) => ({
            advancedReview: state.advancedReview
              ? { ...state.advancedReview, ...data }
              : (data as AdvancedReviewData),
            syncStatus: "pending",
          }));
        },

        // ========================================================================
        // SYNC STATUS MANAGEMENT
        // ========================================================================

        /**
         * Update sync status and optionally set an error message
         * Also updates lastSyncedAt when status is 'synced'
         */
        setSyncStatus: (status: SyncStatus, error?: string | null) => {
          console.log(
            "[ProfileStore] setSyncStatus:",
            status,
            error ? `(error: ${error})` : "",
          );
          set({
            syncStatus: status,
            syncError: error ?? null,
            lastSyncedAt:
              status === "synced"
                ? new Date().toISOString()
                : get().lastSyncedAt,
          });
        },

        // ========================================================================
        // LEGACY DATA MIGRATION
        // ========================================================================

        /**
         * Hydrate store from legacy data sources (old AsyncStorage keys, old stores, etc.)
         * This is used during migration to consolidate data from the old system
         */
        hydrateFromLegacy: (data: Partial<ProfileState>) => {
          console.log(
            "[ProfileStore] hydrateFromLegacy called with sections:",
            Object.keys(data),
          );
          set((state) => ({
            personalInfo: data.personalInfo ?? state.personalInfo,
            dietPreferences: data.dietPreferences ?? state.dietPreferences,
            bodyAnalysis: data.bodyAnalysis ?? state.bodyAnalysis,
            workoutPreferences:
              data.workoutPreferences ?? state.workoutPreferences,
            advancedReview: data.advancedReview ?? state.advancedReview,
            isHydrated: true,
            syncStatus: "pending", // Mark as pending to trigger sync
          }));
        },

        // ========================================================================
        // RESET
        // ========================================================================

        /**
         * Reset all profile data to initial state
         * Useful for logout or account deletion
         */
        reset: () => {
          console.log(
            "[ProfileStore] reset called - clearing all profile data",
          );
          set(initialState);
        },
      }),
      {
        name: "profile-storage-v2", // v2 to avoid conflicts with existing storage
        storage: createJSONStorage(() => AsyncStorage),
        // Only persist the data fields, not the sync status or hydration flag
        partialize: (state) => ({
          personalInfo: state.personalInfo,
          dietPreferences: state.dietPreferences,
          bodyAnalysis: state.bodyAnalysis,
          workoutPreferences: state.workoutPreferences,
          advancedReview: state.advancedReview,
          lastSyncedAt: state.lastSyncedAt,
          isHydrated: state.isHydrated,
        }),
        // Handle rehydration from storage
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log(
              "[ProfileStore] Rehydrated from storage, sections present:",
              {
                personalInfo: !!state.personalInfo,
                dietPreferences: !!state.dietPreferences,
                bodyAnalysis: !!state.bodyAnalysis,
                workoutPreferences: !!state.workoutPreferences,
                advancedReview: !!state.advancedReview,
              },
            );
          }
        },
      },
    ),
  ),
);

// ============================================================================
// SELECTORS (for optimized component subscriptions)
// ============================================================================

/**
 * Select only personal info to avoid unnecessary re-renders
 */
export const selectPersonalInfo = (state: ProfileStore) => state.personalInfo;

/**
 * Select only diet preferences
 */
export const selectDietPreferences = (state: ProfileStore) =>
  state.dietPreferences;

/**
 * Select only body analysis
 */
export const selectBodyAnalysis = (state: ProfileStore) => state.bodyAnalysis;

/**
 * Select only workout preferences
 */
export const selectWorkoutPreferences = (state: ProfileStore) =>
  state.workoutPreferences;

/**
 * Select only advanced review
 */
export const selectAdvancedReview = (state: ProfileStore) =>
  state.advancedReview;

/**
 * Select sync status information
 */
export const selectSyncInfo = (state: ProfileStore) => ({
  syncStatus: state.syncStatus,
  lastSyncedAt: state.lastSyncedAt,
  syncError: state.syncError,
});

/**
 * Check if profile has complete data (all 5 sections populated)
 */
export const selectIsProfileComplete = (state: ProfileStore) => {
  return !!(
    state.personalInfo &&
    state.dietPreferences &&
    state.bodyAnalysis &&
    state.workoutPreferences &&
    state.advancedReview
  );
};

/**
 * Get profile completion percentage (0-100)
 */
export const selectProfileCompleteness = (state: ProfileStore) => {
  let completed = 0;
  const total = 5;

  if (state.personalInfo) completed++;
  if (state.dietPreferences) completed++;
  if (state.bodyAnalysis) completed++;
  if (state.workoutPreferences) completed++;
  if (state.advancedReview) completed++;

  return Math.round((completed / total) * 100);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the current profile store state (for use outside of React components)
 */
export const getProfileStoreState = () => useProfileStore.getState();

/**
 * Subscribe to profile store changes (for use outside of React components)
 */
export const subscribeToProfileStore = useProfileStore.subscribe;

export default useProfileStore;
