import { FitnessState, CompletedWorkoutStats, CompletedSession, ActiveExtraSession } from "./types";
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
    const todayISO = new Date().toISOString();
    const todaySessions = state.completedSessions.filter(
      s => s.completedAt.split('T')[0] === todayISO.split('T')[0]
    );
    return {
      count: todaySessions.length,
      totalCalories: todaySessions.reduce((sum, s) => sum + s.caloriesBurned, 0),
      totalDuration: todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0),
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

  // SSOT: Active extra (quick) workout session actions
  setActiveExtraSession: (session: ActiveExtraSession) => set({ activeExtraSession: session }),

  updateActiveExtraProgress: (exerciseIndex: number) =>
    set((state) =>
      state.activeExtraSession
        ? { activeExtraSession: { ...state.activeExtraSession, exerciseIndex } }
        : state,
    ),

  clearActiveExtraSession: () => set({ activeExtraSession: null }),

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

