import { supabase } from "../supabase";
import { Exercise, FitnessDataResponse } from "./types";

export class ExercisesService {
  private static instance: ExercisesService;

  private constructor() {}

  static getInstance(): ExercisesService {
    if (!ExercisesService.instance) {
      ExercisesService.instance = new ExercisesService();
    }
    return ExercisesService.instance;
  }

  async getExercises(filters?: {
    category?: string;
    difficulty?: string;
    equipment?: string[];
    search?: string;
  }): Promise<FitnessDataResponse<Exercise[]>> {
    try {
      let query = supabase.from("exercises").select("*").order("name");

      if (filters?.category && filters.category !== "all") {
        query = query.ilike("category", `%${filters.category}%`);
      }

      if (filters?.difficulty) {
        query = query.eq("difficulty_level", filters.difficulty);
      }

      if (filters?.equipment && filters.equipment.length > 0) {
        query = query.overlaps("equipment", filters.equipment);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,category.ilike.%${filters.search}%`,
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching exercises:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error("Error in getExercises:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch exercises",
      };
    }
  }

  async getRecommendedExercises(
    userId: string,
    workoutType?: string,
    limit: number = 5,
    getUserWorkoutPreferences?: (
      userId: string,
    ) => Promise<FitnessDataResponse<any>>,
    getUserFitnessGoals?: (userId: string) => Promise<FitnessDataResponse<any>>,
  ): Promise<FitnessDataResponse<Exercise[]>> {
    try {
      let query = supabase.from("exercises").select("*").limit(limit);

      if (workoutType) {
        query = query.ilike("category", `%${workoutType}%`);
      }

      if (getUserFitnessGoals) {
        const goalsResponse = await getUserFitnessGoals(userId);
        if (goalsResponse.success && goalsResponse.data?.experience_level) {
          query = query.eq(
            "difficulty_level",
            goalsResponse.data.experience_level,
          );
        }
      }

      if (getUserWorkoutPreferences) {
        const preferencesResponse = await getUserWorkoutPreferences(userId);
        if (
          preferencesResponse.success &&
          preferencesResponse.data?.equipment
        ) {
          query = query.overlaps(
            "equipment",
            preferencesResponse.data.equipment,
          );
        }
      }

      const { data, error } = await query.order("name");

      if (error) {
        console.error("Error fetching recommended exercises:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error("Error in getRecommendedExercises:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get recommended exercises",
      };
    }
  }
}

export const exercisesService = ExercisesService.getInstance();
