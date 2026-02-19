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
  console.log("🏋️ [aiService] generateWorkout called");

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
      },
    );

    console.log("🏋️ [aiService] Calling backend /workout/generate");
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

    console.log("✅ [aiService] Workout generated successfully");
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
  console.log(
    "🏋️ [aiService] generateWeeklyWorkoutPlan called for week:",
    weekNumber,
  );

  try {
    const request = transformForWorkoutRequest(
      personalInfo,
      fitnessGoals,
      options.bodyMetrics,
      options.workoutPreferences,
      {
        requestWeeklyPlan: true,
        duration: options.workoutPreferences?.time_preference || 30,
      },
    );

    console.log(
      "🏋️ [aiService] Calling backend /workout/generate with weekly plan request",
    );
    const response = await fitaiWorkersClient.generateWorkoutPlan(request);

    if (response.metadata) {
      updateMetadata(response.metadata as AIServiceMetadata);
      console.log("📊 [aiService] Generation metadata:", {
        cached: response.metadata.cached,
        cacheSource: response.metadata.cacheSource,
        generationTime: response.metadata.generationTime,
        model: response.metadata.model,
      });
    }

    if (!response.success || !response.data) {
      console.error("❌ [aiService] Backend returned error:", response.error);
      return {
        success: false,
        error: response.error || "Failed to generate workout plan",
      };
    }

    const weeklyPlanData = response.data as any;
    console.log(
      "✅ [aiService] Received weekly plan with workouts:",
      weeklyPlanData.workouts?.length,
    );

    const workouts = weeklyPlanData.workouts.map((w: any) =>
      transformWorkoutData(w.workout, w.dayOfWeek),
    );

    const weeklyPlan: WeeklyWorkoutPlan = {
      id: weeklyPlanData.id || `weekly_workout_${Date.now()}`,
      weekNumber,
      workouts: workouts,
      planTitle: weeklyPlanData.planTitle || "Your Personalized Workout Plan",
      planDescription: weeklyPlanData.planDescription,
      restDays: weeklyPlanData.restDays || [],
      totalEstimatedCalories: weeklyPlanData.totalEstimatedCalories || 0,
    };

    console.log(
      "✅ [aiService] Weekly workout plan transformed successfully:",
      {
        workouts: weeklyPlan.workouts.length,
        title: weeklyPlan.planTitle,
      },
    );

    return {
      success: true,
      data: weeklyPlan,
    };
  } catch (error) {
    return handleError(error, "generateWeeklyWorkoutPlan");
  }
}
