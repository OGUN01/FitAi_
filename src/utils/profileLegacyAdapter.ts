import {
  BodyAnalysisData,
  DietPreferencesData,
  PersonalInfoData,
  WorkoutPreferencesData,
} from "../types/onboarding";
import { FitnessGoals, PersonalInfo, UserProfile } from "../types/user";

export interface LegacyDietPreferencesAdapter {
  allergies: string[];
  restrictions: string[];
  diet_type: string;
  dietType: string;
  dislikes: string[];
}

export interface LegacyProfileAdapter {
  personalInfo: PersonalInfo | null;
  fitnessGoals: FitnessGoals | null;
  dietPreferences: LegacyDietPreferencesAdapter | null;
}

export const buildLegacyPersonalInfo = ({
  personalInfo,
  bodyAnalysis,
  workoutPreferences,
}: {
  personalInfo?: PersonalInfoData | null;
  bodyAnalysis?: BodyAnalysisData | null;
  workoutPreferences?: WorkoutPreferencesData | null;
}): PersonalInfo | null => {
  if (!personalInfo) {
    return null;
  }

  return {
    ...personalInfo,
    name:
      personalInfo.name ||
      `${personalInfo.first_name || ""} ${personalInfo.last_name || ""}`.trim(),
    height: bodyAnalysis?.height_cm,
    weight: bodyAnalysis?.current_weight_kg,
    activityLevel: workoutPreferences?.activity_level,
  };
};

export const buildLegacyFitnessGoals = (
  workoutPreferences?: WorkoutPreferencesData | null,
  legacyProfile?: UserProfile | null,
): FitnessGoals | null => {
  if (!workoutPreferences) {
    return null;
  }

  const timeCommitment = String(
    workoutPreferences.time_preference ||
      workoutPreferences.session_duration_minutes ||
      45,
  );

  return {
    primary_goals: workoutPreferences.primary_goals || [],
    primaryGoals: workoutPreferences.primary_goals || [],
    experience: workoutPreferences.intensity || "beginner",
    experience_level: workoutPreferences.intensity || "beginner",
    time_commitment: timeCommitment,
    timeCommitment,
    preferred_equipment: workoutPreferences.equipment || [],
    target_areas: legacyProfile?.fitnessGoals?.target_areas || [],
  };
};

export const buildLegacyDietPreferences = (
  dietPreferences?: DietPreferencesData | null,
  legacyProfile?: UserProfile | null,
): LegacyDietPreferencesAdapter | null => {
  if (!dietPreferences) {
    return null;
  }

  return {
    allergies: dietPreferences.allergies || [],
    restrictions: dietPreferences.restrictions || [],
    diet_type: dietPreferences.diet_type,
    dietType: dietPreferences.diet_type,
    dislikes: (legacyProfile?.dietPreferences as any)?.dislikes || [],
  };
};

export const buildLegacyProfileAdapter = ({
  personalInfo,
  bodyAnalysis,
  workoutPreferences,
  dietPreferences,
  legacyProfile,
}: {
  personalInfo?: PersonalInfoData | null;
  bodyAnalysis?: BodyAnalysisData | null;
  workoutPreferences?: WorkoutPreferencesData | null;
  dietPreferences?: DietPreferencesData | null;
  legacyProfile?: UserProfile | null;
}): LegacyProfileAdapter => ({
  personalInfo: buildLegacyPersonalInfo({
    personalInfo,
    bodyAnalysis,
    workoutPreferences,
  }),
  fitnessGoals: buildLegacyFitnessGoals(workoutPreferences, legacyProfile),
  dietPreferences: buildLegacyDietPreferences(dietPreferences, legacyProfile),
});
