import { useState, useEffect, useCallback } from "react";
import {
  fitnessDataService,
  Exercise,
  Workout,
  UserWorkoutPreferences,
  FitnessGoals,
} from "../services/fitnessData";
import { useAuth } from "./useAuth";
import { fitnessRefreshService } from "../services/fitnessRefreshService";

interface UseFitnessDataReturn {
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
    duration_minutes?: number;
    calories_burned?: number;
    notes?: string;
  }) => Promise<boolean>;
  completeWorkout: (
    workoutId: string,
    completionData: {
      duration_minutes?: number;
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

export const useFitnessData = (): UseFitnessDataReturn => {
  const { user, isAuthenticated } = useAuth();

  // Exercises state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [exercisesError, setExercisesError] = useState<string | null>(null);

  // User workouts state
  const [userWorkouts, setUserWorkouts] = useState<Workout[]>([]);
  const [userWorkoutsLoading, setUserWorkoutsLoading] = useState(false);
  const [userWorkoutsError, setUserWorkoutsError] = useState<string | null>(
    null,
  );

  // Workout preferences state
  const [workoutPreferences, setWorkoutPreferences] =
    useState<UserWorkoutPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  // Fitness goals state
  const [fitnessGoals, setFitnessGoals] = useState<FitnessGoals | null>(null);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);

  // Workout stats state
  const [workoutStats, setWorkoutStats] = useState<{
    totalWorkouts: number;
    totalDuration: number;
    totalCalories: number;
    averageDuration: number;
    workoutsByType: Record<string, number>;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Load exercises
  const loadExercises = useCallback(
    async (filters?: {
      category?: string;
      difficulty?: string;
      equipment?: string[];
      search?: string;
    }) => {
      setExercisesLoading(true);
      setExercisesError(null);

      try {
        const response = await fitnessDataService.getExercises(filters);

        if (response.success && response.data) {
          setExercises(response.data);
        } else {
          setExercisesError(response.error || "Failed to load exercises");
        }
      } catch (error) {
        setExercisesError(
          error instanceof Error ? error.message : "Failed to load exercises",
        );
      } finally {
        setExercisesLoading(false);
      }
    },
    [],
  );

  // Load user workouts
  const loadUserWorkouts = useCallback(
    async (limit?: number) => {
      if (!user?.id) return;

      setUserWorkoutsLoading(true);
      setUserWorkoutsError(null);

      try {
        const response = await fitnessDataService.getUserWorkouts(
          user.id,
          limit,
        );

        if (response.success && response.data) {
          setUserWorkouts(response.data);
        } else {
          setUserWorkoutsError(response.error || "Failed to load workouts");
        }
      } catch (error) {
        setUserWorkoutsError(
          error instanceof Error ? error.message : "Failed to load workouts",
        );
      } finally {
        setUserWorkoutsLoading(false);
      }
    },
    [user?.id],
  );

  // Load workout preferences
  const loadWorkoutPreferences = useCallback(async () => {
    if (!user?.id) return;

    setPreferencesLoading(true);
    setPreferencesError(null);

    try {
      const response = await fitnessDataService.getUserWorkoutPreferences(
        user.id,
      );

      if (response.success && response.data) {
        setWorkoutPreferences(response.data);
      } else {
        setPreferencesError(response.error || "Failed to load preferences");
      }
    } catch (error) {
      setPreferencesError(
        error instanceof Error ? error.message : "Failed to load preferences",
      );
    } finally {
      setPreferencesLoading(false);
    }
  }, [user?.id]);

  // Load fitness goals
  const loadFitnessGoals = useCallback(async () => {
    if (!user?.id) return;

    setGoalsLoading(true);
    setGoalsError(null);

    try {
      const response = await fitnessDataService.getUserFitnessGoals(user.id);

      if (response.success && response.data) {
        setFitnessGoals(response.data);
      } else {
        setGoalsError(response.error || "Failed to load fitness goals");
      }
    } catch (error) {
      setGoalsError(
        error instanceof Error ? error.message : "Failed to load fitness goals",
      );
    } finally {
      setGoalsLoading(false);
    }
  }, [user?.id]);

  // Load workout stats
  const loadWorkoutStats = useCallback(
    async (timeRange?: "week" | "month" | "year") => {
      if (!user?.id) return;

      setStatsLoading(true);
      setStatsError(null);

      try {
        const response = await fitnessDataService.getWorkoutStats(
          user.id,
          timeRange,
        );

        if (response.success && response.data) {
          setWorkoutStats(response.data);
        } else {
          setStatsError(response.error || "Failed to load stats");
        }
      } catch (error) {
        setStatsError(
          error instanceof Error ? error.message : "Failed to load stats",
        );
      } finally {
        setStatsLoading(false);
      }
    },
    [user?.id],
  );

  // Create workout
  const createWorkout = useCallback(
    async (workoutData: {
      name: string;
      type: string;
      duration_minutes?: number;
      calories_burned?: number;
      notes?: string;
    }): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const response = await fitnessDataService.createWorkout({
          ...workoutData,
          user_id: user.id,
        });

        if (response.success) {
          // Refresh user workouts
          await loadUserWorkouts();
          return true;
        } else {
          setUserWorkoutsError(response.error || "Failed to create workout");
          return false;
        }
      } catch (error) {
        setUserWorkoutsError(
          error instanceof Error ? error.message : "Failed to create workout",
        );
        return false;
      }
    },
    [user?.id, loadUserWorkouts],
  );

  // Complete workout
  const completeWorkout = useCallback(
    async (
      workoutId: string,
      completionData: {
        duration_minutes?: number;
        calories_burned?: number;
        notes?: string;
      },
    ): Promise<boolean> => {
      try {
        const response = await fitnessDataService.completeWorkout(
          workoutId,
          completionData,
        );

        if (response.success) {
          // Refresh user workouts and stats
          await Promise.all([loadUserWorkouts(), loadWorkoutStats("week")]);
          return true;
        } else {
          setUserWorkoutsError(response.error || "Failed to complete workout");
          return false;
        }
      } catch (error) {
        setUserWorkoutsError(
          error instanceof Error ? error.message : "Failed to complete workout",
        );
        return false;
      }
    },
    [loadUserWorkouts, loadWorkoutStats],
  );

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    await Promise.all([
      loadExercises(),
      loadUserWorkouts(),
      loadWorkoutPreferences(),
      loadFitnessGoals(),
      loadWorkoutStats("week"),
    ]);
  }, [
    isAuthenticated,
    user?.id,
    loadExercises,
    loadUserWorkouts,
    loadWorkoutPreferences,
    loadFitnessGoals,
    loadWorkoutStats,
  ]);

  // Start workout session
  const startWorkoutSession = useCallback(
    async (workoutData: {
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
    }): Promise<boolean> => {
      // For guest users, we should skip the database call and return true
      // since workout sessions for guests are handled locally in the fitnessStore
      if (!user?.id) {
        console.log(
          "🏃 Guest user - skipping database workout session, using local store only",
        );
        return true; // Return success since local store will handle it
      }

      try {
        const response = await fitnessDataService.startWorkoutSession(
          user.id,
          workoutData,
        );

        if (response.success) {
          // Refresh user workouts
          await loadUserWorkouts();
          return true;
        } else {
          setUserWorkoutsError(
            response.error || "Failed to start workout session",
          );
          return false;
        }
      } catch (error) {
        setUserWorkoutsError(
          error instanceof Error
            ? error.message
            : "Failed to start workout session",
        );
        return false;
      }
    },
    [user?.id, loadUserWorkouts],
  );

  // Get recommended exercises
  const getRecommendedExercises = useCallback(
    async (workoutType?: string, limit: number = 5): Promise<Exercise[]> => {
      if (!user?.id) {
        console.log("No user ID available for recommended exercises");
        return [];
      }

      try {
        const response = await fitnessDataService.getRecommendedExercises(
          user.id,
          workoutType,
          limit,
        );

        if (response.success && response.data) {
          return response.data;
        } else {
          const errorMsg =
            response.error || "Failed to get recommended exercises";
          console.error("Failed to get recommended exercises:", errorMsg);
          setExercisesError(errorMsg);
          return [];
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : "Error getting recommended exercises";
        console.error("Error getting recommended exercises:", errorMsg);
        setExercisesError(errorMsg);
        return [];
      }
    },
    [user?.id],
  );

  // Clear all errors
  const clearErrors = useCallback(() => {
    setExercisesError(null);
    setUserWorkoutsError(null);
    setPreferencesError(null);
    setGoalsError(null);
    setStatsError(null);
  }, []);

  // Load initial data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      refreshAll();
    }
  }, [isAuthenticated, user?.id, refreshAll]);

  // Register with fitness refresh service for automatic updates
  // This ensures useFitnessData reacts to workout completions from other parts of the app
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const unsubscribe = fitnessRefreshService.onRefreshNeeded(refreshAll);
      console.log("📡 Registered fitness data hook with refresh service");

      return () => {
        unsubscribe();
        console.log("📡 Unregistered fitness data hook from refresh service");
      };
    }
  }, [isAuthenticated, user?.id, refreshAll]);

  return {
    // Exercises
    exercises,
    exercisesLoading,
    exercisesError,
    loadExercises,

    // User workouts
    userWorkouts,
    userWorkoutsLoading,
    userWorkoutsError,
    loadUserWorkouts,

    // User preferences
    workoutPreferences,
    preferencesLoading,
    preferencesError,
    loadWorkoutPreferences,

    // Fitness goals
    fitnessGoals,
    goalsLoading,
    goalsError,
    loadFitnessGoals,

    // Workout stats
    workoutStats,
    statsLoading,
    statsError,
    loadWorkoutStats,

    // Actions
    createWorkout,
    completeWorkout,
    startWorkoutSession,
    getRecommendedExercises,

    // Utility
    refreshAll,
    clearErrors,
  };
};
