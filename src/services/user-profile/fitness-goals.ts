import { supabase } from "../supabase";
import {
  CreateFitnessGoalsRequest,
  UpdateFitnessGoalsRequest,
} from "../../types/user";
import { toDb, fromDb } from "../../utils/transformers/fieldNameTransformers";
import { FitnessGoalsResponse } from "./types";
import { mapDatabaseGoalsToFitnessGoals } from "./mappers";

/**
 * @deprecated The fitness_goals DB table is deprecated. All goal data now lives in workout_preferences.
 * This CRUD layer is only kept because integration files (utils/integration.ts, utils/integration/onboarding.ts)
 * still call the userStore actions that delegate here. Remove once integration files are migrated.
 */
export async function createFitnessGoals(
  goalsData: CreateFitnessGoalsRequest,
): Promise<FitnessGoalsResponse> {
  try {
    const dbData = toDb(goalsData);

    const { data, error } = await supabase
      .from("fitness_goals")
      .insert([dbData])
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    const transformedData = fromDb(data);
    const fitnessGoals = mapDatabaseGoalsToFitnessGoals(transformedData);
    return {
      success: true,
      data: fitnessGoals,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create fitness goals",
    };
  }
}

/**
 * @deprecated The fitness_goals DB table is deprecated. All goal data now lives in workout_preferences.
 * This CRUD layer is only kept because integration files still call the userStore actions that delegate here.
 * Remove once integration files are migrated.
 */
export async function getFitnessGoals(
  userId: string,
): Promise<FitnessGoalsResponse> {
  try {
    const { data, error } = await supabase
      .from("fitness_goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data) {
      return {
        success: false,
        error: "No fitness goals found",
      };
    }

    const transformedData = fromDb(data);
    const fitnessGoals = mapDatabaseGoalsToFitnessGoals(transformedData);
    return {
      success: true,
      data: fitnessGoals,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get fitness goals",
    };
  }
}

/**
 * @deprecated The fitness_goals DB table is deprecated. All goal data now lives in workout_preferences.
 * This CRUD layer is only kept because integration files still call the userStore actions that delegate here.
 * Remove once integration files are migrated.
 */
export async function updateFitnessGoals(
  userId: string,
  updates: UpdateFitnessGoalsRequest,
): Promise<FitnessGoalsResponse> {
  try {
    const dbUpdates = toDb(updates);

    const { data, error } = await supabase
      .from("fitness_goals")
      .upsert(
        {
          user_id: userId,
          ...dbUpdates,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
          ignoreDuplicates: false,
        },
      )
      .select()
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    const transformedData = fromDb(data);
    const fitnessGoals = mapDatabaseGoalsToFitnessGoals(transformedData);
    return {
      success: true,
      data: fitnessGoals,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update fitness goals",
    };
  }
}
