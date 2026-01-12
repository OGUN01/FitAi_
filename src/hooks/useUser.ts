import { useUserStore } from '../stores/userStore';
import {
  UserProfile,
  PersonalInfo,
  FitnessGoals,
  CreateProfileRequest,
  UpdateProfileRequest,
  CreateFitnessGoalsRequest,
  UpdateFitnessGoalsRequest,
} from '../types/user';
import { UserProfileResponse, FitnessGoalsResponse } from '../services/userProfile';

export interface UseUserReturn {
  // State
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isProfileComplete: boolean;

  // Actions
  createProfile: (profileData: CreateProfileRequest) => Promise<UserProfileResponse>;
  getProfile: (userId: string) => Promise<UserProfileResponse>;
  updateProfile: (userId: string, updates: UpdateProfileRequest) => Promise<UserProfileResponse>;
  createFitnessGoals: (goalsData: CreateFitnessGoalsRequest) => Promise<FitnessGoalsResponse>;
  getFitnessGoals: (userId: string) => Promise<FitnessGoalsResponse>;
  updateFitnessGoals: (
    userId: string,
    updates: UpdateFitnessGoalsRequest
  ) => Promise<FitnessGoalsResponse>;
  getCompleteProfile: (userId: string) => Promise<UserProfileResponse>;
  deleteProfile: (userId: string) => Promise<{ success: boolean; error?: string }>;
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
  } = useUserStore();

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
export const useUserProfile = (): UserProfile | null => {
  const profile = useUserStore((state) => state.profile);
  return profile;
};

/**
 * Hook to check if user profile is complete
 * Returns boolean indicating if profile has all required fields
 */
export const useIsProfileComplete = (): boolean => {
  const isProfileComplete = useUserStore((state) => state.isProfileComplete);
  return isProfileComplete;
};

/**
 * Hook to get user personal info
 * Returns personal info or null
 */
export const usePersonalInfo = (): PersonalInfo | null => {
  const profile = useUserStore((state) => state.profile);
  return profile?.personalInfo || null;
};

/**
 * Hook to get user fitness goals
 * Returns fitness goals or null
 */
export const useFitnessGoals = (): FitnessGoals | null => {
  const profile = useUserStore((state) => state.profile);
  return profile?.fitnessGoals || null;
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
  const profile = useUserStore((state) => state.profile);

  return {
    units: profile?.preferences?.units,
    notifications: profile?.preferences?.notifications,
    darkMode: profile?.preferences?.darkMode,
  };
};

/**
 * Hook to get user stats
 * SINGLE SOURCE OF TRUTH - NO FALLBACKS
 * If data is missing, returns undefined to let UI show explicit missing state
 */
export const useUserStats = () => {
  const profile = useUserStore((state) => state.profile);

  // NO FALLBACKS - return actual values or undefined
  return {
    totalWorkouts: profile?.stats?.totalWorkouts,
    totalCaloriesBurned: profile?.stats?.totalCaloriesBurned,
    // NOTE: currentStreak should come from achievementStore, not here
    // This is kept for backward compatibility but achievementStore is the source
    currentStreak: profile?.stats?.currentStreak,
    longestStreak: profile?.stats?.longestStreak,
    achievements: profile?.stats?.achievements,
  };
};

export default useUser;
