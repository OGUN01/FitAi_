import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * APP STATE STORE - SINGLE SOURCE OF TRUTH FOR SHARED UI STATE
 *
 * This store manages UI state that needs to be shared across multiple screens.
 * Currently handles:
 * - selectedDay: The currently selected day in calendar/planning views
 *
 * This ensures that when a user selects Monday on the Fitness tab,
 * switching to Diet tab also shows Monday's data.
 */

// Day name type for type safety
type DayName =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

interface AppStateState {
  // Currently selected day across all screens
  selectedDay: DayName;

  // Actions
  setSelectedDay: (day: DayName) => void;
  resetToToday: () => void;

  // Getters
  isSelectedDayToday: () => boolean;

  // Reset store (for logout)
  reset: () => void;
}

const DAY_NAMES: DayName[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const getTodayDayName = (): DayName => {
  return DAY_NAMES[new Date().getDay()];
};

export const useAppStateStore = create<AppStateState>()(
  persist(
    (set, get) => ({
      // Initialize to today
      selectedDay: getTodayDayName(),

      // Set selected day
      setSelectedDay: (day: DayName) => {
        set({ selectedDay: day });
      },

      // Reset to today
      resetToToday: () => {
        set({ selectedDay: getTodayDayName() });
      },

      // Check if selected day is today
      isSelectedDayToday: () => {
        const today = getTodayDayName();
        return get().selectedDay === today;
      },

      // Reset store to initial state (for logout)
      reset: () => {
        set({
          selectedDay: getTodayDayName(),
        });
      },
    }),
    {
      name: "fitai-app-state-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist selectedDay
      partialize: (state) => ({
        selectedDay: state.selectedDay,
      }),
    },
  ),
);

// Export type for use in components
export type { DayName };
