import { supabase } from "../supabase";
import {
  ProgressGoals,
  ProgressDataResponse,
  UpdateProgressGoalsData,
} from "./types";
import { getDefaultGoals } from "./converters";

export async function getProgressGoals(
  userId: string,
): Promise<ProgressDataResponse<ProgressGoals>> {
  try {
    const { data, error } = await supabase
      .from("progress_goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching progress goals:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data) {
      return {
        success: true,
        data: getDefaultGoals(userId),
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error in getProgressGoals:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch progress goals",
    };
  }
}

export async function updateProgressGoals(
  userId: string,
  goals: UpdateProgressGoalsData,
): Promise<ProgressDataResponse<ProgressGoals>> {
  try {
    const { data, error } = await supabase
      .from("progress_goals")
      .upsert(
        {
          user_id: userId,
          ...goals,
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
      console.error("Error updating progress goals:", error);
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
    console.error("Error in updateProgressGoals:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update progress goals",
    };
  }
}
