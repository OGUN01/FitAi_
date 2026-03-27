import {
  FitnessState,
  setWorkoutSessionsChannel,
  workoutSessionsChannel,
} from "./types";
import { supabase } from "../../services/supabase";
import { getLocalDateString } from "../../utils/weekUtils";

let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
        () => {
          // Debounce realtime updates to avoid rapid-fire loadData() calls
          if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
          realtimeDebounceTimer = setTimeout(() => {
            get().loadData();
          }, 2000);
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
      lastProgressDate: getLocalDateString(),
      currentWorkoutSession: null,
      completedSessions: [],
      completedSessionsHydrated: false,
      activeExtraSession: null,  // clear stale resume state on logout
      // _hasHydrated intentionally NOT reset — stays true once hydrated
    });
  },
});
