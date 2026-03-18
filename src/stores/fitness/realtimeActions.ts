import {
  FitnessState,
  setWorkoutSessionsChannel,
  workoutSessionsChannel,
} from "./types";
import { supabase } from "../../services/supabase";

export const createRealtimeActions = (
  set: (
    partial:
      | Partial<FitnessState>
      | ((state: FitnessState) => Partial<FitnessState>),
  ) => void,
  get: () => FitnessState,
) => ({
  setupRealtimeSubscription: (userId: string) => {
    if (workoutSessionsChannel) {
      workoutSessionsChannel.unsubscribe();
    }

    const channel = supabase
      .channel("workout_sessions_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workout_sessions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          get().loadData();
        },
      )
      .subscribe();

    setWorkoutSessionsChannel(channel);
  },

  cleanupRealtimeSubscription: () => {
    if (workoutSessionsChannel) {
      workoutSessionsChannel.unsubscribe();
      setWorkoutSessionsChannel(null);
    }
  },

  reset: () => {
    get().cleanupRealtimeSubscription();
    set({
      weeklyWorkoutPlan: null,
      isGeneratingPlan: false,
      planError: null,
      workoutProgress: {},
      currentWorkoutSession: null,
      completedSessions: [],
      completedSessionsHydrated: false,
      activeExtraSession: null,  // clear stale resume state on logout
      // _hasHydrated intentionally NOT reset — stays true once hydrated
    });
  },
});
