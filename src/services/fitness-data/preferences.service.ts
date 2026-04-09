import { supabase } from "../supabase";
import {
  UserWorkoutPreferences,
  FitnessGoals,
  FitnessDataResponse,
} from "./types";

export class PreferencesService {
  private static instance: PreferencesService;

  private constructor() {}

  static getInstance(): PreferencesService {
    if (!PreferencesService.instance) {
      PreferencesService.instance = new PreferencesService();
    }
    return PreferencesService.instance;
  }

  async getUserWorkoutPreferences(
    userId: string,
  ): Promise<FitnessDataResponse<UserWorkoutPreferences>> {
    try {
      const { data, error } = await supabase
        .from("workout_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching workout preferences:", error);
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
      console.error("Error in getUserWorkoutPreferences:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch workout preferences",
      };
    }
  }

  /**
   * @deprecated fitness_goals table is deprecated. Reads from workout_preferences instead.
   */
  async getUserFitnessGoals(
    userId: string,
  ): Promise<FitnessDataResponse<FitnessGoals>> {
    try {
      // Read from workout_preferences (SSOT) instead of deprecated fitness_goals table
      const { data, error } = await supabase
        .from("workout_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching workout preferences for goals:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      if (!data) {
        return { success: true, data: undefined };
      }

      // Map workout_preferences fields to FitnessGoals shape
      // data comes from workout_preferences table — access fields directly
      const wpData = data as Record<string, unknown>;
      return {
        success: true,
        data: {
          id: (wpData.id as string) || '',
          user_id: (wpData.user_id as string) || '',
          primary_goals: (wpData.primary_goals as string[]) || [],
          time_commitment: (wpData.time_commitment as string) || '',
          experience: (wpData.experience_level as string) || '',
          experience_level: (wpData.experience_level as string) || '',
          created_at: (wpData.created_at as string) || '',
          updated_at: (wpData.updated_at as string) || '',
        } as FitnessGoals,
      };
    } catch (error) {
      console.error("Error in getUserFitnessGoals:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch fitness goals",
      };
    }
  }
}

export const preferencesService = PreferencesService.getInstance();
