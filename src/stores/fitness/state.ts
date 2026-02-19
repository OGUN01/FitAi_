import { FitnessState } from "./types";

export const initialFitnessState: Pick<
  FitnessState,
  | "weeklyWorkoutPlan"
  | "isGeneratingPlan"
  | "planError"
  | "workoutProgress"
  | "currentWorkoutSession"
> = {
  weeklyWorkoutPlan: null,
  isGeneratingPlan: false,
  planError: null,
  workoutProgress: {},
  currentWorkoutSession: null,
};
