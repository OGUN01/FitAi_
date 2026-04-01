import { supabase } from "../supabase";
import {
  WorkoutPreferencesData,
  TabValidationResult,
  WorkoutPreferencesRow,
} from "../../types/onboarding";

export class WorkoutPreferencesService {
  static async save(
    userId: string,
    data: WorkoutPreferencesData,
  ): Promise<boolean> {
    try {
      const workoutData: Partial<WorkoutPreferencesRow> = {
        user_id: userId,
        location: data.location || "home",
        equipment: data.equipment || ["bodyweight"],
        time_preference: data.time_preference,
        intensity: data.intensity || "moderate",
        workout_types: data.workout_types,
        primary_goals: data.primary_goals || ["general-fitness"],
        activity_level: data.activity_level,
        workout_experience_years: data.workout_experience_years,
        workout_frequency_per_week: data.workout_frequency_per_week,
        can_do_pushups: data.can_do_pushups,
        can_run_minutes: data.can_run_minutes,
        flexibility_level: data.flexibility_level,
        weekly_weight_loss_goal: data.weekly_weight_loss_goal || null,
        preferred_workout_times: data.preferred_workout_times,
        enjoys_cardio: data.enjoys_cardio,
        enjoys_strength_training: data.enjoys_strength_training,
        enjoys_group_classes: data.enjoys_group_classes,
        prefers_outdoor_activities: data.prefers_outdoor_activities,
        needs_motivation: data.needs_motivation,
        prefers_variety: data.prefers_variety,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("workout_preferences")
        .upsert(workoutData, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(
          "[DB-SERVICE] WorkoutPreferencesService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "[DB-SERVICE] WorkoutPreferencesService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<WorkoutPreferencesData | null> {
    try {
      const { data, error } = await supabase
        .from("workout_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error(
          "[DB-SERVICE] WorkoutPreferencesService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        return null;
      }

      const workoutPreferences: WorkoutPreferencesData = {
        location: data.location || "both",
        equipment: data.equipment || [],
        time_preference: data.time_preference ?? 30,
        intensity: data.intensity || "beginner",
        workout_types: data.workout_types || [],
        primary_goals: data.primary_goals || [],
        activity_level: data.activity_level || "sedentary",
        workout_experience_years: data.workout_experience_years || 0,
        workout_frequency_per_week: data.workout_frequency_per_week || 0,
        can_do_pushups: data.can_do_pushups || 0,
        can_run_minutes: data.can_run_minutes || 0,
        flexibility_level: data.flexibility_level || "fair",
        weekly_weight_loss_goal: data.weekly_weight_loss_goal || undefined,
        preferred_workout_times: data.preferred_workout_times || [],
        enjoys_cardio: data.enjoys_cardio ?? true,
        enjoys_strength_training: data.enjoys_strength_training ?? true,
        enjoys_group_classes: data.enjoys_group_classes ?? false,
        prefers_outdoor_activities: data.prefers_outdoor_activities ?? false,
        needs_motivation: data.needs_motivation ?? false,
        prefers_variety: data.prefers_variety ?? true,
      };

      return workoutPreferences;
    } catch (error) {
      console.error("WorkoutPreferencesService: Unexpected error:", error);
      return null;
    }
  }

  static validate(data: WorkoutPreferencesData | null): TabValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      return {
        is_valid: false,
        errors: ["Workout preferences data is missing"],
        warnings: [],
        completion_percentage: 0,
      };
    }

    if (!data.location) errors.push("Workout location is required");
    if (!data.intensity) errors.push("Intensity level is required");
    if (!data.activity_level) errors.push("Activity level is required");
    if (!data.primary_goals || data.primary_goals.length === 0) {
      errors.push("At least one fitness goal is required");
    }

    if (data.workout_frequency_per_week === 0) {
      warnings.push("Consider exercising at least 1-2 times per week");
    }
    if (
      data.workout_frequency_per_week &&
      data.workout_frequency_per_week > 6
    ) {
      warnings.push("High workout frequency - ensure adequate rest days");
    }
    if (data.time_preference && data.time_preference < 15) {
      warnings.push(
        "Very short workout duration - consider 30+ minutes for better results",
      );
    }

    const requiredFields = [
      "location",
      "intensity",
      "activity_level",
      "primary_goals",
    ];
    const completedRequired = requiredFields.filter((field) => {
      const value = data[field as keyof WorkoutPreferencesData];
      return Array.isArray(value)
        ? value.length > 0
        : value !== null && value !== undefined;
    }).length;

    const optionalFields = [
      "equipment",
      "time_preference",
      "workout_experience_years",
      "workout_frequency_per_week",
      "can_do_pushups",
      "can_run_minutes",
      "flexibility_level",
      "preferred_workout_times",
      "enjoys_cardio",
      "enjoys_strength_training",
      "enjoys_group_classes",
      "prefers_outdoor_activities",
      "needs_motivation",
      "prefers_variety",
    ];
    const completedOptional = optionalFields.filter((field) => {
      const value = data[field as keyof WorkoutPreferencesData];
      return Array.isArray(value)
        ? value.length > 0
        : value !== null && value !== undefined;
    }).length;

    const completionPercentage = Math.round(
      (completedRequired / requiredFields.length) * 70 +
        (completedOptional / optionalFields.length) * 30,
    );

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };
  }
}
