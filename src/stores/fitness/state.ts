import { FitnessState, ActiveExtraSession } from "./types";
import { getLocalDateString } from "../../utils/weekUtils";

export const initialFitnessState: Pick<
  FitnessState,
  | "weeklyWorkoutPlan"
  | "isGeneratingPlan"
  | "planError"
  | "workoutProgress"
  | "lastProgressDate"
  | "currentWorkoutSession"
  | "completedSessions"
  | "completedSessionsHydrated"
  | "_hasHydrated"
  | "activeExtraSession"
  | "mesocycleStartDate"
  | "restTimerEnabled"
> = {
  weeklyWorkoutPlan: null,
  isGeneratingPlan: false,
  planError: null,
  workoutProgress: {},
  lastProgressDate: "",
  currentWorkoutSession: null,
  completedSessions: [],
  completedSessionsHydrated: false,
  _hasHydrated: false,
  activeExtraSession: null,
  mesocycleStartDate: null,
  restTimerEnabled: false,
};
