import { FitnessState } from "./types";

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
> = {
  weeklyWorkoutPlan: null,
  isGeneratingPlan: false,
  planError: null,
  workoutProgress: {},
  currentWorkoutSession: null,
  completedSessions: [],
  completedSessionsHydrated: false,
  _hasHydrated: false,
};
