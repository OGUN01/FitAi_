import { PersonalInfo, FitnessGoals } from "../../types/user";
import type { DatabaseProfile, DatabaseFitnessGoals } from "./types";

/**
 * Map database profile to UserProfile type
 */
export function mapDatabaseProfileToUserProfile(dbProfile: DatabaseProfile) {
  // Cast to any to access new fields that might not be in generated types yet
  const profile = dbProfile as any;

  // Log the raw database profile
  console.log("🔍 userProfile.ts: Raw database profile:", {
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    age: profile.age,
    gender: profile.gender,
    country: profile.country,
    state: profile.state,
  });

  // Compute full name from first_name + last_name
  const fullName =
    `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

  // Map to PersonalInfo interface (matches profiles table - NO activityLevel)
  const personalInfo: PersonalInfo = {
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    name: fullName,
    email: profile.email || undefined,
    age: profile.age || 0,
    gender:
      (profile.gender as "male" | "female" | "other" | "prefer_not_to_say") ||
      "prefer_not_to_say",
    country: profile.country || "",
    state: profile.state || "",
    region: profile.region || undefined,
    wake_time: profile.wake_time || "",
    sleep_time: profile.sleep_time || "",
    occupation_type:
      (profile.occupation_type as
        | "desk_job"
        | "light_active"
        | "moderate_active"
        | "heavy_labor"
        | "very_active") || "desk_job",
    profile_picture: profile.profile_picture || undefined,
    dark_mode: profile.dark_mode || false,
    units: (profile.units as "metric" | "imperial") || "metric",
    notifications_enabled: profile.notifications_enabled !== false,
  };

  console.log(
    "✅ userProfile.ts: Mapped PersonalInfo (NO activityLevel):",
    personalInfo,
  );

  return {
    id: dbProfile.id,
    email: dbProfile.email || "",
    personalInfo,
    fitnessGoals: {
      primary_goals: [],
      time_commitment: "",
      experience: "",
      experience_level: "",
    },
    createdAt: dbProfile.created_at || "",
    updatedAt: dbProfile.updated_at || "",
    profilePicture: dbProfile.profile_picture || undefined,
    preferences: {
      units: (dbProfile.units as "metric" | "imperial") || "metric",
      notifications: dbProfile.notifications_enabled !== false,
      darkMode: dbProfile.dark_mode || false,
    },
    stats: {
      totalWorkouts: 0,
      totalCaloriesBurned: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
  };
}

/**
 * Map database fitness goals to FitnessGoals type
 */
export function mapDatabaseGoalsToFitnessGoals(
  dbGoals: DatabaseFitnessGoals,
): FitnessGoals {
  return {
    primary_goals: dbGoals.primary_goals,
    time_commitment:
      (dbGoals as any).time_commitment ||
      dbGoals.preferred_workout_duration?.toString() ||
      "",
    experience: dbGoals.fitness_level || "",
    experience_level: dbGoals.fitness_level || "",
  };
}
