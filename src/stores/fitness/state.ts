import { FitnessState, ActiveExtraSession } from "./types";

export const initialFitnessState: Pick<
  FitnessState,
  | "weeklyWorkoutPlan"
  | "isGeneratingPlan"
  | "planError"
  | "workoutProgress"
  | "currentWorkoutSession"
  | "completedSessions"
  | "completedSessionsHydrated"
  | "_hasHydrated"
  | "activeExtraSession"
> = {
  weeklyWorkoutPlan: null,
  isGeneratingPlan: false,
  planError: null,
  workoutProgress: {},
  currentWorkoutSession: null,
  completedSessions: [],
  completedSessionsHydrated: false,
  _hasHydrated: false,
  // SSOT: active quick workout session (persists resume state)
  activeExtraSession: null,
};
