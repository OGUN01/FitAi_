import {
  PersonalInfo,
  FitnessGoals,
  BodyMetrics,
  DietPreferences,
} from "../types/user";
import { AIResponse } from "../types/ai";
import { WeeklyMealPlan, AIServiceMetadata } from "./types";
import { handleError } from "./utils";
import {
  fitaiWorkersClient,
  isDietPlanResponse,
  isAsyncJobResponse,
} from "../services/fitaiWorkersClient";
import { transformForDietRequest } from "../services/aiRequestTransformers";

import { transformDietResponseToWeeklyPlan } from "../services/aiRequestTransformers";

export async function generateWeeklyMealPlanAsync(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  weekNumber: number = 1,
  options: {
    bodyMetrics?: BodyMetrics;
    dietPreferences?: DietPreferences;
    calorieTarget?: number;
  } = {},
  updateMetadata: (metadata: AIServiceMetadata) => void,
): Promise<
  AIResponse<
    | { type: "cache_hit"; plan: WeeklyMealPlan }
    | { type: "job_started"; jobId: string; estimatedTimeMinutes: number }
  >
> {
  console.log("generateWeeklyMealPlanAsync called for week:", weekNumber);
  console.log("calorieTarget:", options.calorieTarget);

  try {
    const request = transformForDietRequest(
      personalInfo,
      fitnessGoals,
      options.bodyMetrics,
      options.dietPreferences,
      options.calorieTarget,
    );

    console.log("Calling backend /diet/generate (async mode)");
    const response = await fitaiWorkersClient.generateDietPlanAsync(request);

    if (!response.success || !response.data) {
      console.error("Backend returned error:", response.error);
      return {
        success: false,
        error: response.error || "Failed to generate meal plan",
      };
    }

    if (isDietPlanResponse(response.data)) {
      console.log("Cache hit - immediate result");

      if (response.metadata) {
        updateMetadata(response.metadata as AIServiceMetadata);
      }

      const weeklyPlan = transformDietResponseToWeeklyPlan(
        { ...response, data: response.data },
        weekNumber,
      );

      if (!weeklyPlan) {
        return {
          success: false,
          error: "Failed to transform diet response",
        };
      }

      return {
        success: true,
        data: { type: "cache_hit", plan: weeklyPlan },
      };
    }

    if (isAsyncJobResponse(response.data)) {
      console.log("Async job created:", response.data.jobId);
      return {
        success: true,
        data: {
          type: "job_started",
          jobId: response.data.jobId,
          estimatedTimeMinutes: response.data.estimatedTimeMinutes || 2,
        },
      };
    }

    return {
      success: false,
      error: "Unexpected response format",
    };
  } catch (error) {
    return handleError(error, "generateWeeklyMealPlanAsync");
  }
}

export async function checkMealPlanJobStatus(
  jobId: string,
  weekNumber: number = 1,
): Promise<
  AIResponse<{
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    plan?: WeeklyMealPlan;
    error?: string;
    generationTimeMs?: number;
  }>
> {
  try {
    const response = await fitaiWorkersClient.getJobStatus(jobId);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || "Failed to check job status",
      };
    }

    const jobData = response.data;

    if (jobData.status === "completed" && jobData.result) {
      const weeklyPlan = transformDietResponseToWeeklyPlan(
        { success: true, data: jobData.result },
        weekNumber,
      );

      return {
        success: true,
        data: {
          status: "completed",
          plan: weeklyPlan || undefined,
          generationTimeMs: jobData.metadata?.generationTimeMs,
        },
      };
    }

    return {
      success: true,
      data: {
        status: jobData.status,
        error: jobData.error,
      },
    };
  } catch (error) {
    return handleError(error, "checkMealPlanJobStatus");
  }
}
