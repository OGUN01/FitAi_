import { supabase } from "../supabase";
import { BodyAnalysis, ProgressDataResponse } from "./types";

export async function getUserBodyAnalysis(
  userId: string,
): Promise<ProgressDataResponse<BodyAnalysis>> {
  try {
    const { data, error } = await supabase
      .from("body_analysis")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching body analysis:", error);
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
    console.error("Error in getUserBodyAnalysis:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch body analysis",
    };
  }
}
