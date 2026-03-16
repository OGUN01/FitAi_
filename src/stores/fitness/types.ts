import { WeeklyWorkoutPlan, DayWorkout } from "../../ai";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface WorkoutProgress {
  workoutId: string;
  progress: number; // 0-100
  completedAt?: string;
  sessionId?: string;
  // Persisted on partial exit to enable accurate resume
  exerciseIndex?: number;   // last active exercise index when user exited
  caloriesBurned?: number;  // actual calories burned up to exit point
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
  updateWorkoutProgress: (
    workoutId: string,
    progress: number,
    metadata?: { exerciseIndex?: number; caloriesBurned?: number },
  ) => void;
  completeWorkout: (workoutId: string, sessionId?: string, caloriesBurned?: number) => Promise<void>;
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

  // Completed sessions — single source of truth for all stats
  completedSessions: CompletedSession[];
  completedSessionsHydrated: boolean;   // NOT persisted — guards one-time backfill
  _hasHydrated: boolean;                 // NOT persisted — set true by onRehydrateStorage

  // New actions
  addCompletedSession: (session: CompletedSession) => void;
  markCompletedSessionsHydrated: () => void;
  setHasHydrated: () => void;
  getPlannedSessionStats: (weekStart: string) => { count: number; totalCalories: number; totalDuration: number };
  getExtraSessionStats: (weekStart: string) => { count: number; totalCalories: number; totalDuration: number };
  getAllSessionCalories: (dateStr: string) => number;
}

// Realtime subscription channel reference (outside store to persist across re-renders)
export let workoutSessionsChannel: RealtimeChannel | null = null;

export const setWorkoutSessionsChannel = (channel: RealtimeChannel | null) => {
  workoutSessionsChannel = channel;
};

export interface CompletedSession {
  sessionId: string;           // UUID, unique per completion
  type: 'planned' | 'extra';   // enum — extensible (e.g. 'recovery' later)
  workoutId: string;           // plan workout ID ('planned') or generated UUID ('extra')
  workoutSnapshot: {
    title: string;
    category: string;
    duration: number;          // planned/estimated minutes
    exercises: Array<{
      name: string;
      sets: number;
      reps: number;
      exerciseId?: string;
      duration?: number;       // seconds, for time-based exercises
      restTime?: number;       // seconds between sets
    }>;
  };
  caloriesBurned: number;      // MET-calculated at completion; 0 if weight unavailable
  durationMinutes: number;     // actual elapsed time
  completedAt: string;         // ISO timestamp
  weekStart: string;           // ISO date of Monday of that week (YYYY-MM-DD)
}

export interface ExtraWorkoutTemplate {
  id: string;
  title: string;
  category: string;            // 'hiit' | 'cardio' | 'strength' | 'flexibility'
  duration: number;            // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedCalories: number;   // display-only — never used in calculations
}
