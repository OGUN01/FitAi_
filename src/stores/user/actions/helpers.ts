import { StateCreator } from "zustand";
import { UserStoreState, UtilityActions } from "../types";

export const createUtilityActions: StateCreator<
  UserStoreState,
  [],
  [],
  UtilityActions
> = (set) => ({
  clearError: () => {
    set({ error: null });
  },

  clearProfile: () => {
    set({
      profile: null,
      isProfileComplete: false,
      error: null,
    });
  },

  checkProfileComplete: (profile) => {
    if (!profile) {
      return false;
    }

    // TODO: profile.fitnessGoals is synthesized from workout_preferences in getCompleteProfile() and mappers.ts.
    // Once the fitnessGoals field is removed from UserProfile type, read directly from
    // profileStore.workoutPreferences instead (primary_goals, time_commitment, experience_level).
    const { personalInfo, fitnessGoals } = profile;

    if (!personalInfo) {
      return false;
    }

    if (!fitnessGoals) {
      return false;
    }

    const hasPersonalInfo = !!(
      (personalInfo.name ||
        (personalInfo.first_name && personalInfo.last_name)) &&
      personalInfo.age &&
      personalInfo.gender &&
      personalInfo.occupation_type
    );

    const primaryGoals =
      fitnessGoals.primary_goals || fitnessGoals.primaryGoals;
    const timeCommitment =
      fitnessGoals.time_commitment || fitnessGoals.timeCommitment;
    const hasFitnessGoals = !!(
      primaryGoals?.length > 0 &&
      timeCommitment &&
      fitnessGoals.experience
    );

    const isComplete = hasPersonalInfo && hasFitnessGoals;

    return isComplete;
  },
});
