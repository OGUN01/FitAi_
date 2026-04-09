import { PersonalInfo, FitnessGoals } from "../../types/user";
import type { DatabaseProfile, DatabaseFitnessGoals } from "./types";

/**
 * Map database profile to UserProfile type
 */
export function mapDatabaseProfileToUserProfile(dbProfile: DatabaseProfile, workoutPrefs?: any) {
  // Cast to Record to access fields in either camelCase (after fromDb) or snake_case
  const profile = dbProfile as Record<string, any>;

  // Helper to access a field in either snake_case or camelCase
  const get = (snake: string, camel: string, fallback: any = undefined) =>
    profile[snake] !== undefined ? profile[snake] : (profile[camel] !== undefined ? profile[camel] : fallback);

  const firstName = get('first_name', 'firstName', '');
  const lastName = get('last_name', 'lastName', '');
  const fullName = `${firstName} ${lastName}`.trim();

  // Log the raw database profile

  // Map to PersonalInfo interface (matches profiles table - NO activityLevel)
  const personalInfo: PersonalInfo = {
    first_name: firstName,
    last_name: lastName,
    name: fullName,
    email: profile.email || undefined,
    age: profile.age || 0,
    gender:
      (profile.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say') ||
      'prefer_not_to_say',
    country: profile.country || '',
    state: profile.state || '',
    region: profile.region || undefined,
    wake_time: get('wake_time', 'wakeTime', ''),
    sleep_time: get('sleep_time', 'sleepTime', ''),
    occupation_type:
      (get('occupation_type', 'occupationType', 'desk_job') as
        | 'desk_job'
        | 'light_active'
        | 'moderate_active'
        | 'heavy_labor'
        | 'very_active'),
    profile_picture: get('profile_picture', 'profilePicture', undefined),
    dark_mode: get('dark_mode', 'darkMode', false),
    units: (profile.units as 'metric' | 'imperial') || 'metric',
    notifications_enabled: get('notifications_enabled', 'notificationsEnabled', true) !== false,
  };


  const id = profile.id || '';
  const email = profile.email || '';
  const createdAt = get('created_at', 'createdAt', '');
  const updatedAt = get('updated_at', 'updatedAt', '');
  const profilePicture = get('profile_picture', 'profilePicture', undefined);
  const units = (profile.units as 'metric' | 'imperial') || 'metric';
  const notificationsEnabled = get('notifications_enabled', 'notificationsEnabled', true) !== false;
  const darkMode = get('dark_mode', 'darkMode', false);

  return {
    id,
    email,
    personalInfo,
    fitnessGoals: {
      // Populate from workoutPrefs if fitnessGoals table data is absent
      primary_goals: workoutPrefs?.primary_goals || workoutPrefs?.primaryGoals || [],
      time_commitment: workoutPrefs?.time_commitment || '',
      experience:
        workoutPrefs?.experience_level ||
        workoutPrefs?.experienceLevel || '',
      experience_level:
        workoutPrefs?.experience_level ||
        workoutPrefs?.experienceLevel || '',
    },
    createdAt,
    updatedAt,
    profilePicture,
    preferences: {
      units,
      notifications: notificationsEnabled,
      darkMode,
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
 * Note: dbGoals may have camelCase keys (after fromDb transform) or snake_case keys
 */
export function mapDatabaseGoalsToFitnessGoals(
  dbGoals: DatabaseFitnessGoals,
): FitnessGoals {
  const goals = dbGoals as DatabaseFitnessGoals & Record<string, unknown>;
  return {
    primary_goals: (goals.primary_goals || (goals['primaryGoals'] as string[] | undefined) || []) as string[],
    time_commitment:
      (goals.time_commitment as string | undefined) ||
      (goals['timeCommitment'] as string | undefined) ||
      "",
    experience:
      (goals.experience_level as string | undefined) ||
      (goals['experienceLevel'] as string | undefined) ||
      "",
    experience_level:
      (goals.experience_level as string | undefined) ||
      (goals['experienceLevel'] as string | undefined) ||
      "",
  };
}
