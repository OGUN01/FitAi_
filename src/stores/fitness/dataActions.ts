import { FitnessState, WorkoutProgress } from "./types";
import { crudOperations } from "../../services/crudOperations";
import { supabase } from "../../services/supabase";

export const createDataActions = (
  set: (
    partial:
      | Partial<FitnessState>
      | ((state: FitnessState) => Partial<FitnessState>),
  ) => void,
  get: () => FitnessState,
) => ({
  persistData: async () => {
    try {
      const state = get();
      await crudOperations.clearAllData();

      if (state.weeklyWorkoutPlan) {
        await get().saveWeeklyWorkoutPlan(state.weeklyWorkoutPlan);
      }

      console.log("💾 Fitness data persisted");
    } catch (error) {
      console.error("❌ Failed to persist fitness data:", error);
    }
  },

  loadData: async () => {
    try {
      const plan = await get().loadWeeklyWorkoutPlan();
      if (plan) {
        set({ weeklyWorkoutPlan: plan });
      }

      // Hydrate workoutProgress from Supabase
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user?.user?.id) {
          const { data: completedSessions } = await supabase
            .from("workout_sessions")
            .select("workout_id, completed_at, id, is_completed")
            .eq("user_id", user.user.id)
            .eq("is_completed", true);

          if (completedSessions && completedSessions.length > 0) {
            const restoredProgress: Record<string, WorkoutProgress> = {};
            completedSessions.forEach((session) => {
              restoredProgress[session.workout_id] = {
                workoutId: session.workout_id,
                progress: 100,
                completedAt: session.completed_at,
                sessionId: session.id,
              };
            });
            set({ workoutProgress: restoredProgress });
          }
        }
      } catch (error) {
        console.warn(
          "[fitnessStore] Failed to hydrate workoutProgress:",
          error,
        );
        // Silent fallback - AsyncStorage via persist middleware
      }

      console.log("📂 Fitness data loaded");
    } catch (error) {
      console.error("❌ Failed to load fitness data:", error);
    }
  },

  clearData: () => {
    set({
      weeklyWorkoutPlan: null,
      workoutProgress: {},
      currentWorkoutSession: null,
      planError: null,
    });
  },

  clearOldWorkoutData: async () => {
    try {
      console.log(
        "🧹 Clearing old workout data with descriptive exercise names...",
      );

      get().clearData();

      await crudOperations.clearAllData();

      const AsyncStorage = (
        await import("@react-native-async-storage/async-storage")
      ).default;
      await AsyncStorage.removeItem("fitness-storage");

      console.log("✅ Old workout data cleared successfully");

      get().forceWorkoutRegeneration();
    } catch (error) {
      console.error("❌ Failed to clear old workout data:", error);
      throw error;
    }
  },

  forceWorkoutRegeneration: () => {
    console.log(
      "🔄 Forcing workout regeneration with new constraint system...",
    );
    set({
      weeklyWorkoutPlan: null,
      planError: null,
      isGeneratingPlan: false,
    });
    console.log("✅ Ready for fresh workout generation with database IDs");
  },
});
