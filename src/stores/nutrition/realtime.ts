import { supabase } from "../../services/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { NutritionState } from "./types";

let mealLogsChannel: RealtimeChannel | null = null;

export const createRealtimeActions = (set: any, get: () => NutritionState) => ({
  setupRealtimeSubscription: (userId: string) => {
    if (mealLogsChannel) {
      mealLogsChannel.unsubscribe();
    }

    mealLogsChannel = supabase
      .channel("meal_logs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meal_logs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          get().loadData();
        },
      )
      .subscribe();
  },

  cleanupRealtimeSubscription: () => {
    if (mealLogsChannel) {
      mealLogsChannel.unsubscribe();
      mealLogsChannel = null;
    }
  },

  reset: () => {
    get().cleanupRealtimeSubscription();
    set({
      weeklyMealPlan: null,
      isGeneratingPlan: false,
      planError: null,
      mealProgress: {},
      dailyMeals: [],
      isGeneratingMeal: false,
      mealError: null,
      currentMealSession: null,
    });
  },
});
