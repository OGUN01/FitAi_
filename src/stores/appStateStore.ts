import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDebouncedStorage } from "../utils/safeAsyncStorage";
import { getLocalDateString, getLocalDayName } from "../utils/weekUtils";

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
  selectedDate: string;

  // Actions
  setSelectedDay: (day: DayName) => void;
  setSelectedDate: (date: Date | string) => void;
  shiftSelectedDate: (days: number) => void;
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

const getTodayDateString = (): string => getLocalDateString();

const getDayNameForDate = (date: Date | string): DayName =>
  getLocalDayName(date) as DayName;

const createSelectionState = (date: Date | string) => {
  const selectedDate = getLocalDateString(date);
  return {
    selectedDate,
    selectedDay: getDayNameForDate(selectedDate),
  };
};

export const useAppStateStore = create<AppStateState>()(
  persist(
    (set, get) => ({
      // Initialize to today
      ...createSelectionState(getTodayDateString()),

      // Set selected day
      setSelectedDay: (day: DayName) => {
        set((state) => {
          const currentDate = new Date(`${state.selectedDate}T12:00:00`);
          const currentDayIndex = currentDate.getDay();
          const nextDayIndex = DAY_NAMES.indexOf(day);
          const shiftedDate = new Date(currentDate);
          shiftedDate.setDate(currentDate.getDate() + (nextDayIndex - currentDayIndex));
          return createSelectionState(shiftedDate);
        });
      },

      setSelectedDate: (date: Date | string) => {
        set(createSelectionState(date));
      },

      shiftSelectedDate: (days: number) => {
        set((state) => {
          const nextDate = new Date(`${state.selectedDate}T12:00:00`);
          nextDate.setDate(nextDate.getDate() + days);
          return createSelectionState(nextDate);
        });
      },

      // Reset to today
      resetToToday: () => {
        set(createSelectionState(getTodayDateString()));
      },

      // Check if selected day is today
      isSelectedDayToday: () => {
        return get().selectedDate === getTodayDateString();
      },

      // Reset store to initial state (for logout)
      reset: () => {
        set(createSelectionState(getTodayDateString()));
      },
    }),
    {
      name: "fitai-app-state-storage",
      storage: createDebouncedStorage(),
      // selectedDay is intentionally NOT persisted - always resets to today on app load
      partialize: (_state) => ({
      }),
    },
  ),
);

// Export type for use in components
export type { DayName };
