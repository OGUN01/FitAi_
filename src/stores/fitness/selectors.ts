import { FitnessState, CompletedWorkoutStats, CompletedSession } from "./types";
import { getCurrentWeekStart } from "../../utils/weekUtils";

export const createSelectors = (
  get: () => FitnessState,
  set: (partial: Partial<FitnessState> | ((state: FitnessState) => Partial<FitnessState>)) => void,
) => ({
  getCompletedWorkoutStats: (): CompletedWorkoutStats => {
    const state = get();
    const weekStart = getCurrentWeekStart();
    const planned = state.completedSessions.filter(
      (s) => s.type === 'planned' && s.weekStart === weekStart
    );
    return {
      count: planned.length,
      totalCalories: planned.reduce((sum, s) => sum + s.caloriesBurned, 0),
      totalDuration: planned.reduce((sum, s) => sum + s.durationMinutes, 0),
    };
  },

  getTodaysCompletedWorkoutStats: (): CompletedWorkoutStats => {
    const state = get();
    const today = new Date();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayName = dayNames[today.getDay()];

    const completedWorkoutIds = Object.values(state.workoutProgress)
      .filter((p) => p.progress === 100)
      .map((p) => p.workoutId);

    const todaysCompletedWorkouts =
      state.weeklyWorkoutPlan?.workouts.filter(
        (workout) =>
          completedWorkoutIds.includes(workout.id) &&
          workout.dayOfWeek === todayName,
      ) || [];

    return {
      count: todaysCompletedWorkouts.length,
      totalCalories: todaysCompletedWorkouts.reduce(
        (sum, w) => sum + (w.estimatedCalories || 0),
        0,
      ),
      totalDuration: todaysCompletedWorkouts.reduce(
        (sum, w) => sum + (w.duration || 0),
        0,
      ),
    };
  },

  addCompletedSession: (session: CompletedSession) => {
    set((state) => {
      if (state.completedSessions.some((s) => s.sessionId === session.sessionId)) {
        return state;
      }
      return { completedSessions: [...state.completedSessions, session] };
    });
  },

  markCompletedSessionsHydrated: () => set({ completedSessionsHydrated: true }),

  setHasHydrated: () => set({ _hasHydrated: true }),

  getPlannedSessionStats: (weekStart: string) => {
    const sessions = get().completedSessions.filter(
      (s) => s.type === 'planned' && s.weekStart === weekStart
    );
    return {
      count: sessions.length,
      totalCalories: sessions.reduce((sum, s) => sum + s.caloriesBurned, 0),
      totalDuration: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    };
  },

  getExtraSessionStats: (weekStart: string) => {
    const sessions = get().completedSessions.filter(
      (s) => s.type === 'extra' && s.weekStart === weekStart
    );
    return {
      count: sessions.length,
      totalCalories: sessions.reduce((sum, s) => sum + s.caloriesBurned, 0),
      totalDuration: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    };
  },

  getAllSessionCalories: (dateStr: string) => {
    return get().completedSessions
      .filter((s) => s.completedAt.startsWith(dateStr))
      .reduce((sum, s) => sum + s.caloriesBurned, 0);
  },
});
