import {
  PersonalInfo,
  FitnessGoals,
  BodyMetrics,
  DietPreferences,
} from "../types/user";
import { AdvancedReviewData } from "../types/onboarding";
import { AIResponse } from "../types/ai";
import { WeeklyMealPlan, AIServiceMetadata } from "./types";
import { handleError } from "./utils";
import {
  fitaiWorkersClient,
  isDietPlanResponse,
  isAsyncJobResponse,
} from "../services/fitaiWorkersClient";
import { transformForDietRequest } from "../services/aiRequestTransformers";
import { resolveCurrentWeightFromStores } from "../services/currentWeight";

import { transformDietResponseToWeeklyPlan } from "../services/aiRequestTransformers";

export async function generateWeeklyMealPlanAsync(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  weekNumber: number = 1,
  options: {
    bodyMetrics?: BodyMetrics;
    dietPreferences?: DietPreferences;
    calorieTarget?: number;
    advancedReview?: AdvancedReviewData | null;
    skipCache?: boolean;
  } = {},
  updateMetadata: (metadata: AIServiceMetadata) => void,
): Promise<
  AIResponse<
    | { type: "cache_hit"; plan: WeeklyMealPlan }
    | { type: "job_started"; jobId: string; estimatedTimeMinutes: number }
  >
> {

  try {
    const request = transformForDietRequest(
      personalInfo,
      fitnessGoals,
      options.bodyMetrics,
      options.dietPreferences,
      options.calorieTarget,
      {
        daysCount: 7,
        advancedReview: options.advancedReview,
        currentWeightKg: resolveCurrentWeightFromStores({
          bodyAnalysisWeight: options.bodyMetrics?.current_weight_kg,
        }).value,
        skipCache: options.skipCache ?? false,
      },
    );

    const response = await fitaiWorkersClient.generateDietPlanAsync(request);

    if (!response.success || !response.data) {
      console.error("Backend returned error:", response.error);
      return {
        success: false,
        error: response.error || "Failed to generate meal plan",
      };
    }

    if (isDietPlanResponse(response.data)) {

      if (response.metadata) {
        updateMetadata(response.metadata as AIServiceMetadata);
      }

      const transformed = transformDietResponseToWeeklyPlan(
        { ...response, data: response.data },
        weekNumber,
        { requestedDaysCount: 7 },
      );

      if (!transformed) {
        console.error('[asyncJobHandling] transformDietResponseToWeeklyPlan returned null. Raw response:', JSON.stringify(response.data).slice(0, 500));
        return {
          success: false,
          error: 'Received meal plan data could not be processed. Please try regenerating.',
        };
      }

      const weeklyPlan = transformed;

      return {
        success: true,
        data: { type: "cache_hit", plan: weeklyPlan },
      };
    }

    if (isAsyncJobResponse(response.data)) {
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

// MAX_POLL_ATTEMPTS = 30 (at 6s interval = 3 minutes max)
const MAX_POLL_ATTEMPTS = 30;

export async function checkMealPlanJobStatus(
  jobId: string,
  weekNumber: number = 1,
  attempts: number = 0,
): Promise<
  AIResponse<{
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    plan?: WeeklyMealPlan;
    error?: string;
    generationTimeMs?: number;
  }>
> {
  try {
    if (attempts >= MAX_POLL_ATTEMPTS) {
      return { success: false, error: 'Meal plan generation timed out. Please try again.', timedOut: true };
    }

    const response = await fitaiWorkersClient.getJobStatus(jobId);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || "Failed to check job status",
      };
    }

    const jobData = response.data;

    if (jobData.status === "completed" && jobData.result) {
      const transformed = transformDietResponseToWeeklyPlan(
        { success: true, data: jobData.result },
        weekNumber,
        { requestedDaysCount: 7 },
      );

      if (!transformed) {
        console.error('[asyncJobHandling] checkMealPlanJobStatus: transformDietResponseToWeeklyPlan returned null. Raw result:', JSON.stringify(jobData.result).slice(0, 500));
        return {
          success: false,
          error: 'Received meal plan data could not be processed. Please try regenerating.',
        };
      }

      return {
        success: true,
        data: {
          status: "completed",
          plan: transformed,
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
