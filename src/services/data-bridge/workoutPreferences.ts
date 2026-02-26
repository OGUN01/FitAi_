/**
 * WorkoutPreferences Operations
 * Save and load operations for workout preferences data
 */

import { useProfileStore } from "../../stores/profileStore";
import { syncEngine } from "../SyncEngine";
import { WorkoutPreferencesService } from "../onboardingService";
import {
  SaveResult,
  WorkoutPreferencesData,
  WorkoutPreferences,
} from "./types";
import { saveToLocal } from "./localStorage";

/**
 * Transform old workoutPreferences format to new database format
 */
export function transformWorkoutPreferencesForDB(
  data: any,
): WorkoutPreferencesData {

  // Map old field names to new ones
  const transformed: any = {
    location: data.location,
    equipment: data.equipment || [],
    time_preference: data.timeCommitment || data.time_preference,
    intensity:
      data.experience_level ||
      data.experienceLevel ||
      data.intensity ||
      "beginner",
    workout_types: data.workoutTypes || data.workout_types || [],
    primary_goals: data.primary_goals || data.primaryGoals || [],
    activity_level: data.activityLevel || data.activity_level || null,
    workout_experience_years:
      data.experienceYears || data.workout_experience_years || 0,
    workout_frequency_per_week:
      data.workoutsPerWeek || data.workout_frequency_per_week || 3,
    can_do_pushups: data.canDoPushups || data.can_do_pushups || 0,
    can_run_minutes: data.canRunMinutes || data.can_run_minutes || 0,
    flexibility_level:
      data.flexibilityLevel || data.flexibility_level || "fair",
    weekly_weight_loss_goal:
      data.weeklyWeightLossGoal || data.weekly_weight_loss_goal || null,
    preferred_workout_times:
      data.preferredWorkoutTimes || data.preferred_workout_times || [],
  };

  return transformed as WorkoutPreferencesData;
}

/**
 * Save workout preferences data
 */
export async function saveWorkoutPreferences(
  data: WorkoutPreferencesData | WorkoutPreferences,
  currentUserId: string | null,
): Promise<SaveResult> {

  const result: SaveResult = {
    success: true,
    errors: [],
    newSystemSuccess: true,
  };

  try {
    // Update ProfileStore (LOCAL SYNC - always succeeds)
    const profileStore = useProfileStore.getState();
    profileStore.updateWorkoutPreferences(data as WorkoutPreferencesData);

    // Save to database if authenticated (REMOTE SYNC)
    if (currentUserId) {
      try {
        const dbSuccess = await WorkoutPreferencesService.save(
          currentUserId,
          data as WorkoutPreferencesData,
        );
        result.newSystemSuccess = dbSuccess;
        if (!dbSuccess) {
          syncEngine.queueOperation("workoutPreferences", data);
        }
      } catch (dbError) {
        console.error("[DataBridge] workoutPreferences DB error:", dbError);
        result.newSystemSuccess = false;
        syncEngine.queueOperation("workoutPreferences", data);
      }
    } else {
      await saveToLocal("workoutPreferences", data);
    }

    // LOCAL sync always succeeds - don't fail just because remote failed
    result.success = true;
    return result;
  } catch (error) {
    console.error("[DataBridge] saveWorkoutPreferences error:", error);
    return { success: false, errors: [`Error: ${error}`] };
  }
}
