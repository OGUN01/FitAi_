import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDebouncedStorage } from "../../utils/safeAsyncStorage";
import { NutritionState } from "./types";
import { getConsumedNutrition, getTodaysConsumedNutrition } from "./selectors";
import * as sessionHandlers from "./sessions";
import { createMealPlanActions, createMealProgressActions } from "./actions";
import { createPersistenceActions } from "./persistence";
import { createRealtimeActions } from "./realtime";
import { getLocalDateString } from "../../utils/weekUtils";

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => {
      const mealPlanActions = createMealPlanActions(set, get);
      const mealProgressActions = createMealProgressActions(set, get);
      const persistenceActions = createPersistenceActions(set, get);
      const realtimeActions = createRealtimeActions(set, get);

      return {
        // Initial state
        weeklyMealPlan: null,
        isGeneratingPlan: false,
        planError: null,
        mealProgress: {},
        lastMealResetDate: "",
        dailyMeals: [],
        isGeneratingMeal: false,
        mealError: null,
        currentMealSession: null,

        // Meal plan actions
        ...mealPlanActions,

        // Meal progress actions
        ...mealProgressActions,

        // Selectors
        getConsumedNutrition: () => {
          return getConsumedNutrition(get());
        },

        getTodaysConsumedNutrition: () => {
          return getTodaysConsumedNutrition(get());
        },

        // Session handlers
        startMealSession: async (meal) => {
          return sessionHandlers.startMealSession(
            meal,
            get().updateMealProgress,
            (session) => set({ currentMealSession: session }),
          );
        },

        endMealSession: async (logId) => {
          return sessionHandlers.endMealSession(
            logId,
            get().currentMealSession,
            get().completeMeal,
            (session) => set({ currentMealSession: session }),
          );
        },

        updateIngredientProgress: (ingredientId, quantity) => {
          set((state) => {
            const updatedSession = sessionHandlers.updateIngredientProgress(
              ingredientId,
              quantity,
              state.currentMealSession,
              get().updateMealProgress,
              (session) => set({ currentMealSession: session }),
            );
            return updatedSession
              ? { currentMealSession: updatedSession }
              : state;
          });
        },

        // Day-boundary cleanup — clear stale mealProgress from previous days
        checkAndResetMealProgressIfNewDay: () => {
          const today = getLocalDateString();
          const state = get();
          if (state.lastMealResetDate === today) return;

          // Keep only meal progress entries from today
          const cleaned: Record<string, typeof state.mealProgress[string]> = {};
          for (const [id, entry] of Object.entries(state.mealProgress)) {
            if (entry.progress >= 100 && entry.completedAt) {
              if (getLocalDateString(entry.completedAt) === today) {
                cleaned[id] = entry;
              }
            }
          }

          set({
            mealProgress: cleaned,
            dailyMeals: [],
            currentMealSession: null,
            lastMealResetDate: today,
          });
        },

        // Persistence actions
        ...persistenceActions,

        // Realtime actions
        ...realtimeActions,
      };
    },
    {
      name: "nutrition-storage",
      storage: createDebouncedStorage(),
      partialize: (state) => ({
        weeklyMealPlan: state.weeklyMealPlan,
        mealProgress: state.mealProgress,
        lastMealResetDate: state.lastMealResetDate,
        dailyMeals: state.dailyMeals,
      }),
      onRehydrateStorage: () => (state) => {
        state?.checkAndResetMealProgressIfNewDay?.();
      },
    },
  ),
);
