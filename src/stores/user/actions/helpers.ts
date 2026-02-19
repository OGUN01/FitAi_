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
      console.log("⚠️ checkProfileComplete: Profile is null/undefined");
      return false;
    }

    const { personalInfo, fitnessGoals } = profile;

    if (!personalInfo) {
      console.log("⚠️ checkProfileComplete: personalInfo is missing");
      return false;
    }

    if (!fitnessGoals) {
      console.log("⚠️ checkProfileComplete: fitnessGoals is missing");
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
    console.log(
      `✅ checkProfileComplete: hasPersonalInfo=${hasPersonalInfo}, hasFitnessGoals=${hasFitnessGoals}, isComplete=${isComplete}`,
    );

    return isComplete;
  },
});
