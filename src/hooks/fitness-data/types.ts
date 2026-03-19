import {
  Exercise,
  Workout,
  UserWorkoutPreferences,
  FitnessGoals,
} from "../../services/fitnessData";

export interface UseFitnessDataReturn {
  // Exercises
  exercises: Exercise[];
  exercisesLoading: boolean;
  exercisesError: string | null;
  loadExercises: (filters?: {
    category?: string;
    difficulty?: string;
    equipment?: string[];
    search?: string;
  }) => Promise<void>;

  // User workouts
  userWorkouts: Workout[];
  userWorkoutsLoading: boolean;
  userWorkoutsError: string | null;
  loadUserWorkouts: (limit?: number) => Promise<void>;

  // User preferences
  workoutPreferences: UserWorkoutPreferences | null;
  preferencesLoading: boolean;
  preferencesError: string | null;
  loadWorkoutPreferences: () => Promise<void>;

  // Fitness goals
  fitnessGoals: FitnessGoals | null;
  goalsLoading: boolean;
  goalsError: string | null;
  loadFitnessGoals: () => Promise<void>;

  // Workout stats
  workoutStats: {
    totalWorkouts: number;
    totalDuration: number;
    totalCalories: number;
    averageDuration: number;
    workoutsByType: Record<string, number>;
  } | null;
  statsLoading: boolean;
  statsError: string | null;
  loadWorkoutStats: (timeRange?: "week" | "month" | "year") => Promise<void>;

  // Actions
  createWorkout: (workoutData: {
    name: string;
    type: string;
    duration?: number;
    total_duration_minutes?: number;
    calories_burned?: number;
    notes?: string;
  }) => Promise<boolean>;
  completeWorkout: (
    workoutId: string,
    completionData: {
      duration?: number;
      total_duration_minutes?: number;
      calories_burned?: number;
      notes?: string;
    },
  ) => Promise<boolean>;
  startWorkoutSession: (workoutData: {
    name: string;
    type: string;
    exercises: {
      exercise_id: string;
      sets?: number;
      reps?: number;
      weight_kg?: number;
      duration_seconds?: number;
      rest_seconds?: number;
    }[];
  }) => Promise<boolean>;
  getRecommendedExercises: (
    workoutType?: string,
    limit?: number,
  ) => Promise<Exercise[]>;

  // Utility
  refreshAll: () => Promise<void>;
  clearErrors: () => void;
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
  averageDuration: number;
  workoutsByType: Record<string, number>;
}

export interface ExerciseFilters {
  category?: string;
  difficulty?: string;
  equipment?: string[];
  search?: string;
}

export interface WorkoutData {
  name: string;
  type: string;
  duration?: number;
  total_duration_minutes?: number;
  calories_burned?: number;
  notes?: string;
}

export interface CompletionData {
  duration?: number;
  total_duration_minutes?: number;
  calories_burned?: number;
  notes?: string;
}

export interface WorkoutSessionData {
  name: string;
  type: string;
  exercises: {
    exercise_id: string;
    sets?: number;
    reps?: number;
    weight_kg?: number;
    duration_seconds?: number;
    rest_seconds?: number;
  }[];
}

export { Exercise, Workout, UserWorkoutPreferences, FitnessGoals };
