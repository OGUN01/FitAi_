import {
  PersonalInfo,
  FitnessGoals,
  BodyMetrics,
  WorkoutPreferences,
} from "../types/user";
import { Workout, AIResponse } from "../types/ai";
import { WeeklyWorkoutPlan, AIServiceMetadata } from "./types";
import { transformWorkoutData, handleError } from "./utils";
import { fitaiWorkersClient } from "../services/fitaiWorkersClient";
import {
  transformForWorkoutRequest,
  transformWorkoutResponseToWeeklyPlan,
} from "../services/aiRequestTransformers";
import { resolveCurrentWeightFromStores } from "../services/currentWeight";

export async function generateWorkout(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  preferences: {
    workoutType?: string;
    duration?: number;
    focusMuscles?: string[];
    bodyMetrics?: BodyMetrics;
    workoutPreferences?: WorkoutPreferences;
  } = {},
  updateMetadata: (metadata: AIServiceMetadata) => void,
): Promise<AIResponse<Workout>> {

  try {
    const request = transformForWorkoutRequest(
      personalInfo,
      fitnessGoals,
      preferences.bodyMetrics,
      preferences.workoutPreferences,
      {
        workoutType: preferences.workoutType,
        duration: preferences.duration,
        focusMuscles: preferences.focusMuscles,
        currentWeightKg: resolveCurrentWeightFromStores({
          bodyAnalysisWeight: preferences.bodyMetrics?.current_weight_kg,
        }).value,
      },
    );

    const response = await fitaiWorkersClient.generateWorkoutPlan(request);

    if (response.metadata) {
      updateMetadata(response.metadata as AIServiceMetadata);
    }

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || "Failed to generate workout",
      };
    }

    const weeklyPlan = transformWorkoutResponseToWeeklyPlan(
      response,
      1,
      preferences.workoutPreferences,
    );
    const workout = weeklyPlan?.workouts[0];

    if (!workout) {
      return {
        success: false,
        error: "No workout generated",
      };
    }

    return {
      success: true,
      data: workout,
    };
  } catch (error) {
    return handleError(error, "generateWorkout");
  }
}

export async function generateWeeklyWorkoutPlan(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  weekNumber: number = 1,
  options: {
    bodyMetrics?: BodyMetrics;
    workoutPreferences?: WorkoutPreferences;
  } = {},
  updateMetadata: (metadata: AIServiceMetadata) => void,
): Promise<AIResponse<WeeklyWorkoutPlan>> {

  try {
    const request = transformForWorkoutRequest(
      personalInfo,
      fitnessGoals,
      options.bodyMetrics,
      options.workoutPreferences,
      {
        requestWeeklyPlan: true,
        duration: options.workoutPreferences?.time_preference || 30,
        currentWeightKg: resolveCurrentWeightFromStores({
          bodyAnalysisWeight: options.bodyMetrics?.current_weight_kg,
        }).value,
      },
    );

    const response = await fitaiWorkersClient.generateWorkoutPlan(request);

    if (response.metadata) {
      updateMetadata(response.metadata as AIServiceMetadata);
    }
    if (!response.success || !response.data) {
      console.error("❌ [aiService] Backend returned error:", response.error);
      return {
        success: false,
        error: response.error || "Failed to generate workout plan",
      };
    }

    const weeklyPlanData = response.data as any;

    const daySlotCounts = new Map<string, number>();
    const workouts = weeklyPlanData.workouts.map((w: any) => {
      const currentSlot = daySlotCounts.get(w.dayOfWeek) ?? 0;
      daySlotCounts.set(w.dayOfWeek, currentSlot + 1);
      return transformWorkoutData(w.workout, w.dayOfWeek, currentSlot);
    });

    const weeklyPlan: WeeklyWorkoutPlan = {
      id: weeklyPlanData.id || `weekly_workout_week_${weekNumber}`,
      weekNumber,
      workouts: workouts,
      planTitle: weeklyPlanData.planTitle || "Your Personalized Workout Plan",
      planDescription: weeklyPlanData.planDescription,
      restDays: weeklyPlanData.restDays || [],
      totalEstimatedCalories: weeklyPlanData.totalEstimatedCalories || 0,
    };


    return {
      success: true,
      data: weeklyPlan,
    };
  } catch (error) {
    return handleError(error, "generateWeeklyWorkoutPlan");
  }
}
