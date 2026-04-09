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
  subscribeWithSelector,
} from "zustand/middleware";
import { createDebouncedStorage } from "../utils/safeAsyncStorage";

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

type SyncStatus = "idle" | "syncing" | "synced" | "error" | "pending";

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface ProfileState {
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

interface ProfileActions {
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

type ProfileStore = ProfileState & ProfileActions;

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
          set(initialState);
        },
      }),
      {
        name: "profile-storage-v2", // v2 to avoid conflicts with existing storage
        storage: createDebouncedStorage(),
        // Persist data fields, sync status, and sync error for recovery after app restart
        partialize: (state) => ({
          personalInfo: state.personalInfo,
          dietPreferences: state.dietPreferences,
          bodyAnalysis: state.bodyAnalysis,
          workoutPreferences: state.workoutPreferences,
          advancedReview: state.advancedReview,
          lastSyncedAt: state.lastSyncedAt,
          syncStatus: state.syncStatus,
          syncError: state.syncError,
          isHydrated: state.isHydrated,
        }),
        // Handle rehydration from storage
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.isHydrated = true;
          }
        },
      },
    ),
  ),
);

export default useProfileStore;
