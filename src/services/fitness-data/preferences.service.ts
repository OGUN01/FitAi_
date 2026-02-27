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

  async getUserFitnessGoals(
    userId: string,
  ): Promise<FitnessDataResponse<FitnessGoals>> {
    try {
      const { data, error } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching fitness goals:", error);
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
