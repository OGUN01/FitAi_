import { WeeklyWorkoutPlan, DayWorkout } from "../../ai";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface WorkoutProgress {
  workoutId: string;
  progress: number; // 0-100
  completedAt?: string;
  sessionId?: string;
}

// Completed workout stats computed from workoutProgress - SINGLE SOURCE OF TRUTH
export interface CompletedWorkoutStats {
  count: number;
  totalCalories: number;
  totalDuration: number;
}

export interface CurrentWorkoutSession {
  workoutId: string;
  sessionId: string;
  startedAt: string;
  exercises: Array<{
    exerciseId: string;
    completed: boolean;
    sets: Array<{
      reps: number;
      weight: number;
      completed: boolean;
    }>;
  }>;
}

export interface FitnessState {
  // Weekly workout plan state
  weeklyWorkoutPlan: WeeklyWorkoutPlan | null;
  isGeneratingPlan: boolean;
  planError: string | null;

  // Workout progress tracking
  workoutProgress: Record<string, WorkoutProgress>;

  // Current workout session
  currentWorkoutSession: CurrentWorkoutSession | null;

  // Actions
  setWeeklyWorkoutPlan: (plan: WeeklyWorkoutPlan | null) => void;
  saveWeeklyWorkoutPlan: (plan: WeeklyWorkoutPlan) => Promise<void>;
  loadWeeklyWorkoutPlan: () => Promise<WeeklyWorkoutPlan | null>;
  setGeneratingPlan: (isGenerating: boolean) => void;
  setPlanError: (error: string | null) => void;

  // Workout progress actions
  updateWorkoutProgress: (workoutId: string, progress: number) => void;
  completeWorkout: (workoutId: string, sessionId?: string) => Promise<void>;
  getWorkoutProgress: (workoutId: string) => WorkoutProgress | null;

  // Computed selectors - SINGLE SOURCE OF TRUTH
  getCompletedWorkoutStats: () => CompletedWorkoutStats;
  getTodaysCompletedWorkoutStats: () => CompletedWorkoutStats;

  // Workout session actions
  startWorkoutSession: (workout: DayWorkout) => Promise<string>;
  endWorkoutSession: (sessionId: string) => Promise<void>;
  updateExerciseProgress: (
    exerciseId: string,
    setIndex: number,
    reps: number,
    weight: number,
  ) => void;

  // Data persistence
  persistData: () => Promise<void>;
  loadData: () => Promise<void>;
  clearData: () => void;
  clearOldWorkoutData: () => Promise<void>;
  forceWorkoutRegeneration: () => void;

  // Realtime subscriptions
  setupRealtimeSubscription: (userId: string) => void;
  cleanupRealtimeSubscription: () => void;

  // Reset store (for logout)
  reset: () => void;
}

// Realtime subscription channel reference (outside store to persist across re-renders)
export let workoutSessionsChannel: RealtimeChannel | null = null;

export const setWorkoutSessionsChannel = (channel: RealtimeChannel | null) => {
  workoutSessionsChannel = channel;
};
