import { OnboardingData, UserPreferences } from "../../types/localData";
import { SupabaseProfile } from "./types";

function normalizeGender(gender: string): "male" | "female" | "other" | null {
  const normalized = gender.toLowerCase();
  if (["male", "female", "other"].includes(normalized)) {
    return normalized as "male" | "female" | "other";
  }
  return null;
}

function normalizeActivityLevel(
  level: string,
): "sedentary" | "light" | "moderate" | "active" | "extreme" | null {
  const normalized = level.toLowerCase();
  if (
    ["sedentary", "light", "moderate", "active", "extreme"].includes(normalized)
  ) {
    return normalized as
      | "sedentary"
      | "light"
      | "moderate"
      | "active"
      | "extreme";
  }
  return null;
}

export function transformOnboardingDataToProfile(
  onboardingData: OnboardingData,
  userId: string,
  email: string,
): SupabaseProfile {
  const { personalInfo, fitnessGoals } = onboardingData;

  return {
    id: userId,
    email: email || personalInfo.email || "",
    name:
      personalInfo.name ||
      `${personalInfo.first_name || ""} ${personalInfo.last_name || ""}`.trim(),
    age: personalInfo.age || null,
    gender: normalizeGender(personalInfo.gender),
    updated_at: new Date().toISOString(),
  };
}

export function transformUserPreferencesToProfile(
  preferences: UserPreferences,
  userId: string,
): Partial<SupabaseProfile> {
  return {
    id: userId,
    units: preferences.units,
    notifications_enabled: preferences.notifications,
    dark_mode: preferences.darkMode,
    updated_at: new Date().toISOString(),
  };
}
