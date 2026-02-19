import { supabase } from "../supabase";
import {
  CreateFitnessGoalsRequest,
  UpdateFitnessGoalsRequest,
} from "../../types/user";
import { toDb, fromDb } from "../../utils/transformers/fieldNameTransformers";
import { FitnessGoalsResponse } from "./types";
import { mapDatabaseGoalsToFitnessGoals } from "./mappers";

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
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "No fitness goals found",
        };
      }
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
        error instanceof Error ? error.message : "Failed to get fitness goals",
    };
  }
}

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
          : "Failed to update fitness goals",
    };
  }
}
