import { supabase } from "../supabase";
import { Workout, WorkoutExercise, FitnessDataResponse } from "./types";

export class WorkoutsService {
  private static instance: WorkoutsService;

  private constructor() {}

  static getInstance(): WorkoutsService {
    if (!WorkoutsService.instance) {
      WorkoutsService.instance = new WorkoutsService();
    }
    return WorkoutsService.instance;
  }

  async getUserWorkouts(
    userId: string,
    limit?: number,
  ): Promise<FitnessDataResponse<Workout[]>> {
    try {
      let query = supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching user workouts:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      const workouts =
        data?.map((workout) => ({
          ...workout,
          exercises: workout.exercises ?? [],
        })) || [];

      return {
        success: true,
        data: workouts,
      };
    } catch (error) {
      console.error("Error in getUserWorkouts:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch user workouts",
      };
    }
  }

  async createWorkout(workoutData: {
    user_id: string;
    name: string;
    type: string;
    duration?: number;
    total_duration_minutes?: number;
    calories_burned?: number;
    notes?: string;
  }): Promise<FitnessDataResponse<Workout>> {
    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          id: crypto.randomUUID?.() || `ws_${Date.now()}`,
          user_id: workoutData.user_id,
          workout_id: `w_${Date.now()}`,
          workout_name: workoutData.name,
          workout_type: workoutData.type,
          duration: workoutData.duration,
          total_duration_minutes: workoutData.total_duration_minutes,
          calories_burned: workoutData.calories_burned,
          notes: workoutData.notes,
          started_at: new Date().toISOString(),
          is_completed: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating workout:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Error in createWorkout:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create workout",
      };
    }
  }

  async completeWorkout(
    workoutId: string,
    completionData: {
      duration?: number;
      total_duration_minutes?: number;
      calories_burned?: number;
      notes?: string;
    },
  ): Promise<FitnessDataResponse<Workout>> {
    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .update({
          ...completionData,
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", workoutId)
        .select()
        .single();

      if (error) {
        console.error("Error completing workout:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Error in completeWorkout:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to complete workout",
      };
    }
  }

  async addExercisesToWorkout(
    workoutId: string,
    exercises: {
      exercise_id: string;
      sets?: number;
      reps?: number;
      weight_kg?: number;
      duration_seconds?: number;
      rest_seconds?: number;
      order_index: number;
    }[],
  ): Promise<FitnessDataResponse<WorkoutExercise[]>> {
    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .update({ exercises })
        .eq("id", workoutId)
        .select()
        .single();

      if (error) {
        console.error("Error adding exercises to workout:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: (data?.exercises as WorkoutExercise[]) ?? [],
      };
    } catch (error) {
      console.error("Error in addExercisesToWorkout:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add exercises to workout",
      };
    }
  }

  async startWorkoutSession(
    userId: string,
    workoutData: {
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
    },
  ): Promise<FitnessDataResponse<Workout>> {
    try {
      const workoutResponse = await this.createWorkout({
        user_id: userId,
        name: workoutData.name,
        type: workoutData.type,
      });

      if (!workoutResponse.success || !workoutResponse.data) {
        return workoutResponse;
      }

      return {
        success: true,
        data: {
          ...workoutResponse.data,
          exercises: [],
        },
      };
    } catch (error) {
      console.error("Error in startWorkoutSession:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to start workout session",
      };
    }
  }
}

export const workoutsService = WorkoutsService.getInstance();
