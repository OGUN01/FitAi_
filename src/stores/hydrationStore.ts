import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDebouncedStorage } from "../utils/safeAsyncStorage";
import { hydrationDataService } from "../services/hydrationData";
import { getLocalDateString } from "../utils/weekUtils";

/**
 * HYDRATION STORE - SINGLE SOURCE OF TRUTH
 *
 * This store is the ONLY place water intake should be tracked.
 * All screens (HomeScreen, DietScreen, DietScreenNew) MUST use this store.
 *
 * NO FALLBACKS - If data is missing, it means onboarding is incomplete.
 */

interface HydrationState {
  // Water intake in MILLILITERS (always ML, never liters)
  waterIntakeML: number;

  // Daily goal in MILLILITERS (set from calculatedMetrics.dailyWaterML)
  dailyGoalML: number | null;

  // True when the user has explicitly set a custom goal (via notifications/reminder edit).
  // When false, the goal was auto-seeded from calculatedMetrics and should update
  // whenever the user's profile (weight, activity) changes.
  isGoalUserSet: boolean;

  // Date tracking for daily reset
  lastResetDate: string; // ISO date string (YYYY-MM-DD)

  // Actions
  addWater: (amountML: number) => void;
  setWaterIntake: (amountML: number) => void;
  // setDailyGoal: explicit user override — marks isGoalUserSet = true
  setDailyGoal: (goalML: number) => void;
  // setDailyGoalFromMetrics: auto-update from calculatedMetrics — only applies when !isGoalUserSet
  setDailyGoalFromMetrics: (goalML: number) => void;
  resetDaily: () => void;
  checkAndResetIfNewDay: () => void;

  // Getters
  getProgress: () => number; // Returns 0-100
  getRemainingML: () => number;

  // Reset store (for logout)
  reset: () => void;

  // Sync with Supabase
  syncWithSupabase: () => Promise<void>;
}

const getTodayDateString = (): string => {
  return getLocalDateString();
};

// Module-level ref to cancel any pending Supabase retry timeout
let syncRetryTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set, get) => ({
      // Initial state
      waterIntakeML: 0,
      dailyGoalML: null, // Must be set from calculatedMetrics
      isGoalUserSet: false,
      lastResetDate: getTodayDateString(),

      // Add water (main action for UI buttons)
      addWater: (amountML: number) => {
        // Check if we need to reset for a new day first
        get().checkAndResetIfNewDay();

        // Re-read after reset so today's intake is always based on today's store state.
        const state = get();

        const newIntake = state.waterIntakeML + amountML;
        // Cap at 150% of goal to prevent accidental over-logging
        const DEFAULT_DAILY_GOAL_ML = 2500;
        const maxIntake = (state.dailyGoalML ?? DEFAULT_DAILY_GOAL_ML) * 1.5;

        set({ waterIntakeML: Math.min(newIntake, maxIntake) });

        // Sync to Supabase in background (fire and forget)
        hydrationDataService.logWaterIntake(amountML).catch((err) => {
          console.error("[HydrationStore] Failed to sync water intake to Supabase:", err);
        });
      },

      // Set exact water intake (for manual adjustment)
      setWaterIntake: (amountML: number) => {
        set({ waterIntakeML: Math.max(0, amountML) });
      },

      // Set daily goal — explicit user override (e.g. from water reminder settings)
      // Marks isGoalUserSet = true so auto-updates from metrics don't overwrite it.
      setDailyGoal: (goalML: number) => {
        if (!goalML || goalML <= 0) return;
        set({ dailyGoalML: goalML, isGoalUserSet: true });
      },

      // Set daily goal from calculatedMetrics — only applies when user hasn't set a custom goal.
      // This keeps the goal in sync with profile changes (weight, activity level) automatically.
      setDailyGoalFromMetrics: (goalML: number) => {
        if (!goalML || goalML <= 0) return;
        const { isGoalUserSet } = get();
        if (!isGoalUserSet) {
          set({ dailyGoalML: goalML });
        }
      },

      // Manual reset (for testing/debugging)
      resetDaily: () => {
        // Cancel any pending retry timeout to prevent stale data overwriting the reset
        if (syncRetryTimeoutId !== null) {
          clearTimeout(syncRetryTimeoutId);
          syncRetryTimeoutId = null;
        }
        set({
          waterIntakeML: 0,
          lastResetDate: getTodayDateString(),
        });
      },

      // Auto-reset check - call this on app open or screen mount
      checkAndResetIfNewDay: () => {
        const today = getTodayDateString();
        const state = get();

        if (state.lastResetDate !== today) {
          // It's a new day - reset water intake
          set({
            waterIntakeML: 0,
            lastResetDate: today,
          });
        }
      },

      // Get progress as percentage (0-100)
      getProgress: () => {
        const state = get();
        if (!state.dailyGoalML || state.dailyGoalML === 0) {
          return 0; // No goal set = 0% progress
        }
        return Math.min(
          100,
          Math.round((state.waterIntakeML / state.dailyGoalML) * 100),
        );
      },

      // Get remaining water needed in ML
      getRemainingML: () => {
        const state = get();
        if (!state.dailyGoalML) {
          return 0;
        }
        return Math.max(0, state.dailyGoalML - state.waterIntakeML);
      },

      // Reset store to initial state (for logout)
      reset: () => {
        set({
          waterIntakeML: 0,
          dailyGoalML: null,
          isGoalUserSet: false,
          lastResetDate: getTodayDateString(),
        });
      },

      // Sync with Supabase - call on app start to reconcile local with remote
      syncWithSupabase: async () => {
        try {
          const result = await hydrationDataService.syncHydrationWithSupabase();
          if (result.success) {
            // Supabase is authoritative: always sync local to remote value
            // This prevents stale persisted values from showing incorrect data
            set({ waterIntakeML: result.total_ml });
          }
        } catch (error) {
          console.error(
            "[HydrationStore] Sync failed:",
            error instanceof Error ? error.message : error,
          );
          // Retry once after a short delay — store the timeout ID so resetDaily() can cancel it
          syncRetryTimeoutId = setTimeout(async () => {
            syncRetryTimeoutId = null;
            try {
              const retryResult =
                await hydrationDataService.syncHydrationWithSupabase();
              if (retryResult.success) {
                set({ waterIntakeML: retryResult.total_ml });
              }
            } catch (retryError) {
              console.error(
                "[HydrationStore] Sync retry also failed:",
                retryError instanceof Error ? retryError.message : retryError,
              );
            }
          }, 3000);
        }
      },
    }),
    {
      name: "fitai-hydration-storage",
      storage: createDebouncedStorage(),
      // Only persist these fields
      partialize: (state) => ({
        waterIntakeML: state.waterIntakeML,
        dailyGoalML: state.dailyGoalML,
        isGoalUserSet: state.isGoalUserSet,
        lastResetDate: state.lastResetDate,
      }),
      // After AsyncStorage rehydrates, check if it's a new day and reset if needed
      onRehydrateStorage: () => (state) => {
        state?.checkAndResetIfNewDay?.();
      },
    },
  ),
);
