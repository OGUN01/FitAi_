import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { hydrationDataService } from "../services/hydrationData";

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

  // Date tracking for daily reset
  lastResetDate: string; // ISO date string (YYYY-MM-DD)

  // Actions
  addWater: (amountML: number) => void;
  setWaterIntake: (amountML: number) => void;
  setDailyGoal: (goalML: number) => void;
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
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
};

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set, get) => ({
      // Initial state
      waterIntakeML: 0,
      dailyGoalML: null, // Must be set from calculatedMetrics
      lastResetDate: getTodayDateString(),

      // Add water (main action for UI buttons)
      addWater: (amountML: number) => {
        const state = get();

        // Check if we need to reset for a new day first
        state.checkAndResetIfNewDay();

        const newIntake = state.waterIntakeML + amountML;
        // Cap at 150% of goal to prevent accidental over-logging
        const maxIntake = state.dailyGoalML
          ? state.dailyGoalML * 1.5
          : newIntake;

        set({ waterIntakeML: Math.min(newIntake, maxIntake) });

        // Sync to Supabase in background (fire and forget)
        hydrationDataService.logWaterIntake(amountML).catch((err) => {
          console.warn(
            "[HydrationStore] Failed to sync water to Supabase:",
            err,
          );
        });
      },

      // Set exact water intake (for manual adjustment)
      setWaterIntake: (amountML: number) => {
        set({ waterIntakeML: Math.max(0, amountML) });
      },

      // Set daily goal (called when calculatedMetrics loads)
      setDailyGoal: (goalML: number) => {
        set({ dailyGoalML: goalML });
      },

      // Manual reset (for testing/debugging)
      resetDaily: () => {
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
          console.log(
            "[HydrationStore] Daily reset triggered for new day:",
            today,
          );
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
          lastResetDate: getTodayDateString(),
        });
      },

      // Sync with Supabase - call on app start to reconcile local with remote
      syncWithSupabase: async () => {
        try {
          const result = await hydrationDataService.syncHydrationWithSupabase();
          if (result.success && result.total_ml > 0) {
            // If remote has more water than local, use remote as source of truth
            const state = get();
            if (result.total_ml > state.waterIntakeML) {
              set({ waterIntakeML: result.total_ml });
              console.log(
                "[HydrationStore] Synced from Supabase:",
                result.total_ml,
                "ml",
              );
            }
          }
        } catch (error) {
          console.warn("[HydrationStore] Sync failed:", error);
        }
      },
    }),
    {
      name: "fitai-hydration-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields
      partialize: (state) => ({
        waterIntakeML: state.waterIntakeML,
        dailyGoalML: state.dailyGoalML,
        lastResetDate: state.lastResetDate,
      }),
    },
  ),
);
