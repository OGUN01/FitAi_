import { useMemo } from "react";
import { useUserStore } from "../stores/userStore";
import {
  useProfileStore,
  selectIsProfileComplete,
} from "../stores/profileStore";
import { useUnifiedStats } from "./useUnifiedStats";
import {
  AdaptedUserProfile,
  buildLegacyFitnessGoals,
  buildLegacyProfileAdapter,
} from "../utils/profileLegacyAdapter";
import {
  PersonalInfo,
  FitnessGoals,
  UserProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  CreateFitnessGoalsRequest,
  UpdateFitnessGoalsRequest,
} from "../types/user";
import {
  UserProfileResponse,
  FitnessGoalsResponse,
} from "../services/userProfile";

export interface UseUserReturn {
  // State
  profile: AdaptedUserProfile | null;
  isLoading: boolean;
  error: string | null;
  isProfileComplete: boolean;

  // Actions
  createProfile: (
    profileData: CreateProfileRequest,
  ) => Promise<UserProfileResponse>;
  getProfile: (userId: string) => Promise<UserProfileResponse>;
  updateProfile: (
    userId: string,
    updates: UpdateProfileRequest,
  ) => Promise<UserProfileResponse>;
  createFitnessGoals: (
    goalsData: CreateFitnessGoalsRequest,
  ) => Promise<FitnessGoalsResponse>;
  getFitnessGoals: (userId: string) => Promise<FitnessGoalsResponse>;
  updateFitnessGoals: (
    userId: string,
    updates: UpdateFitnessGoalsRequest,
  ) => Promise<FitnessGoalsResponse>;
  getCompleteProfile: (userId: string) => Promise<UserProfileResponse>;
  deleteProfile: (
    userId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  clearProfile: () => void;
  setProfile: (profile: UserProfile | null) => void;
  updatePersonalInfo: (personalInfo: PersonalInfo) => void;
  updateFitnessGoalsLocal: (fitnessGoals: FitnessGoals) => void;
}

/**
 * Custom hook for user profile management
 * Provides access to user state and actions
 */
export const useUser = (): UseUserReturn => {
  const {
    profile: rawProfile,
    isLoading,
    error,
    isProfileComplete,
    createProfile,
    getProfile,
    updateProfile,
    createFitnessGoals,
    getFitnessGoals,
    updateFitnessGoals,
    getCompleteProfile,
    deleteProfile,
    clearError,
    clearProfile,
    setProfile,
    updatePersonalInfo,
    updateFitnessGoalsLocal,
  } = useUserStore();
  const personalInfo = useProfileStore((state) => state.personalInfo);
  const bodyAnalysis = useProfileStore((state) => state.bodyAnalysis);
  const workoutPreferences = useProfileStore(
    (state) => state.workoutPreferences,
  );
  const dietPreferences = useProfileStore((state) => state.dietPreferences);

  const profile = useMemo(
    () =>
      rawProfile
        ? ({
            ...rawProfile,
            bodyMetrics: bodyAnalysis ?? rawProfile.bodyMetrics,
            ...buildLegacyProfileAdapter({
              personalInfo,
              bodyAnalysis,
              workoutPreferences,
              dietPreferences,
              legacyProfile: rawProfile,
            }),
          } as AdaptedUserProfile)
        : null,
    [
      rawProfile,
      personalInfo,
      bodyAnalysis,
      workoutPreferences,
      dietPreferences,
    ],
  );

  return {
    profile,
    isLoading,
    error,
    isProfileComplete,
    createProfile,
    getProfile,
    updateProfile,
    createFitnessGoals,
    getFitnessGoals,
    updateFitnessGoals,
    getCompleteProfile,
    deleteProfile,
    clearError,
    clearProfile,
    setProfile,
    updatePersonalInfo,
    updateFitnessGoalsLocal,
  };
};

/**
 * Hook to get current user profile
 * Returns current profile or null
 */
export const useUserProfile = (): AdaptedUserProfile | null => {
  const { profile } = useUser();
  return profile;
};

/**
 * Hook to check if user profile is complete
 * Returns boolean indicating if profile has all required fields
 */
export const useIsProfileComplete = (): boolean => {
  const profileStoreComplete = useProfileStore(selectIsProfileComplete);
  const legacyProfileComplete = useUserStore(
    (state) => state.isProfileComplete,
  );
  return profileStoreComplete || legacyProfileComplete;
};

/**
 * Hook to get user personal info
 * Returns personal info or null
 */
export const usePersonalInfo = (): PersonalInfo | null => {
  const personalInfo = useProfileStore((state) => state.personalInfo);
  return (personalInfo as PersonalInfo) || null;
};

/**
 * Hook to get user fitness goals
 * Returns fitness goals or null
 */
export const useFitnessGoals = (): FitnessGoals | null => {
  // SSOT: profileStore.workoutPreferences is authoritative for fitness goals (onboarding_data table)
  const workoutPreferences = useProfileStore(
    (state) => state.workoutPreferences,
  );

  return buildLegacyFitnessGoals(workoutPreferences) || null;
};

/**
 * Hook to check if user data is loading
 * Useful for showing loading states
 */
export const useUserLoading = (): boolean => {
  const isLoading = useUserStore((state) => state.isLoading);
  return isLoading;
};

/**
 * Hook to get user error
 * Returns current error or null
 */
export const useUserError = (): string | null => {
  const error = useUserStore((state) => state.error);
  return error;
};

/**
 * Hook for user actions only
 * Useful when you only need actions without state
 */
export const useUserActions = () => {
  const {
    createProfile,
    getProfile,
    updateProfile,
    createFitnessGoals,
    getFitnessGoals,
    updateFitnessGoals,
    getCompleteProfile,
    deleteProfile,
    clearError,
    clearProfile,
    setProfile,
    updatePersonalInfo,
    updateFitnessGoalsLocal,
  } = useUserStore();

  return {
    createProfile,
    getProfile,
    updateProfile,
    createFitnessGoals,
    getFitnessGoals,
    updateFitnessGoals,
    getCompleteProfile,
    deleteProfile,
    clearError,
    clearProfile,
    setProfile,
    updatePersonalInfo,
    updateFitnessGoalsLocal,
  };
};

/**
 * Hook to get user preferences
 * NO FALLBACKS - returns undefined if not set
 */
export const useUserPreferences = () => {
  const personalInfo = useProfileStore((state) => state.personalInfo);

  return {
    units: personalInfo?.units,
    notifications: personalInfo?.notifications_enabled,
    darkMode: personalInfo?.dark_mode,
  };
};

/**
 * Hook to get user stats
 * SINGLE SOURCE OF TRUTH - NO FALLBACKS
 * If data is missing, returns undefined to let UI show explicit missing state
 */
export const useUserStats = () => {
  const unifiedStats = useUnifiedStats();
  const legacyStats = useUserStore((state) => state.profile?.stats);

  return {
    totalWorkouts: unifiedStats.totalWorkouts ?? legacyStats?.totalWorkouts,
    totalCaloriesBurned:
      unifiedStats.totalCaloriesBurned ?? legacyStats?.totalCaloriesBurned,
    currentStreak: unifiedStats.currentStreak ?? legacyStats?.currentStreak,
    longestStreak: unifiedStats.longestStreak ?? legacyStats?.longestStreak,
    achievements: unifiedStats.achievements ?? legacyStats?.achievements,
  };
};

export default useUser;
