import { UserProfile } from "../../types/user";
import { UserProfileResponse } from "./types";
import * as profileOps from "./profile-operations";
import * as fitnessGoalsOps from "./fitness-goals";
import * as preferencesOps from "./preferences";

export * from "./types";
export * from "./profile-operations";
export * from "./fitness-goals";
export * from "./preferences";
export * from "./mappers";

class UserProfileService {
  private static instance: UserProfileService;

  private constructor() {}

  static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService();
    }
    return UserProfileService.instance;
  }

  createProfile = profileOps.createProfile;
  getProfile = profileOps.getProfile;
  updateProfile = profileOps.updateProfile;
  deleteProfile = profileOps.deleteProfile;

  /** @deprecated Writes to deprecated fitness_goals table. Use profileStore.updateWorkoutPreferences() instead. */
  createFitnessGoals = fitnessGoalsOps.createFitnessGoals;
  /** @deprecated Reads from deprecated fitness_goals table. Use profileStore.workoutPreferences instead. */
  getFitnessGoals = fitnessGoalsOps.getFitnessGoals;
  /** @deprecated Writes to deprecated fitness_goals table. Use profileStore.updateWorkoutPreferences() instead. */
  updateFitnessGoals = fitnessGoalsOps.updateFitnessGoals;

  getDietPreferences = preferencesOps.getDietPreferences;
  getWorkoutPreferences = preferencesOps.getWorkoutPreferences;
  updateWorkoutPreferences = preferencesOps.updateWorkoutPreferences;

  async getCompleteProfile(userId: string): Promise<UserProfileResponse> {
    try {
      const [profileResponse, dietResponse, workoutResponse] =
        await Promise.all([
          this.getProfile(userId),
          this.getDietPreferences(userId),
          this.getWorkoutPreferences(userId),
        ]);

      if (!profileResponse.success) {
        return profileResponse;
      }

      const userProfile = profileResponse.data!;

      if (dietResponse.success && dietResponse.data) {
        userProfile.dietPreferences = dietResponse.data;
      }

      if (workoutResponse.success && workoutResponse.data) {
        userProfile.workoutPreferences = workoutResponse.data;
        // Synthesize fitnessGoals from workout_preferences (SSOT)
        // fitness_goals table is deprecated — all goal data lives in workout_preferences
        const wp = workoutResponse.data as Record<string, unknown>;
        userProfile.fitnessGoals = {
          primary_goals: wp.primary_goals || wp.primaryGoals || [],
          time_commitment: wp.time_commitment || '',
          experience: wp.experience_level || wp.experienceLevel || '',
          experience_level: wp.experience_level || wp.experienceLevel || '',
        };
      }

      return {
        success: true,
        data: userProfile,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get complete profile",
      };
    }
  }
}

export const userProfileService = UserProfileService.getInstance();
export default userProfileService;
