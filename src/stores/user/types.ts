/**
 * Type definitions for User Store
 *
 * Contains all interfaces and types used by the user store
 * including state shape, action signatures, and service responses.
 */

import {
  UserProfile,
  PersonalInfo,
  FitnessGoals,
  CreateProfileRequest,
  UpdateProfileRequest,
  CreateFitnessGoalsRequest,
  UpdateFitnessGoalsRequest,
} from "../../types/user";
import {
  UserProfileResponse,
  FitnessGoalsResponse,
} from "../../services/userProfile";

/**
 * Core state shape for the user store
 */
export interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isProfileComplete: boolean;
}

/**
 * Profile-related actions
 */
export interface ProfileActions {
  createProfile: (
    profileData: CreateProfileRequest,
  ) => Promise<UserProfileResponse>;
  getProfile: (userId: string) => Promise<UserProfileResponse>;
  updateProfile: (
    userId: string,
    updates: UpdateProfileRequest,
  ) => Promise<UserProfileResponse>;
  getCompleteProfile: (userId: string) => Promise<UserProfileResponse>;
  deleteProfile: (
    userId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  setProfile: (profile: UserProfile | null) => void;
  updatePersonalInfo: (personalInfo: PersonalInfo) => void;
}

/**
 * Fitness goals-related actions
 * @deprecated The fitness_goals DB table is deprecated. All goal data now lives in workout_preferences.
 * These actions are kept temporarily for integration file compatibility.
 */
export interface FitnessGoalsActions {
  /** @deprecated Use profileStore.updateWorkoutPreferences() instead */
  createFitnessGoals: (
    goalsData: CreateFitnessGoalsRequest,
  ) => Promise<FitnessGoalsResponse>;
  /** @deprecated Use profileStore.workoutPreferences instead */
  getFitnessGoals: (userId: string) => Promise<FitnessGoalsResponse>;
  /** @deprecated Use profileStore.updateWorkoutPreferences() instead */
  updateFitnessGoals: (
    userId: string,
    updates: UpdateFitnessGoalsRequest,
  ) => Promise<FitnessGoalsResponse>;
  /** @deprecated Use profileStore.updateWorkoutPreferences() instead */
  updateFitnessGoalsLocal: (fitnessGoals: FitnessGoals) => void;
}

/**
 * Utility actions
 */
export interface UtilityActions {
  clearError: () => void;
  clearProfile: () => void;
  checkProfileComplete: (profile: UserProfile) => boolean;
}

/**
 * Complete user store interface combining state and all actions
 */
export interface UserStoreState
  extends UserState,
    ProfileActions,
    FitnessGoalsActions,
    UtilityActions {}

// Re-export types from dependencies for convenience
export type {
  UserProfile,
  PersonalInfo,
  FitnessGoals,
  CreateProfileRequest,
  UpdateProfileRequest,
  CreateFitnessGoalsRequest,
  UpdateFitnessGoalsRequest,
  UserProfileResponse,
  FitnessGoalsResponse,
};
