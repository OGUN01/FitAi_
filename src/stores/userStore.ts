/**
 * User Store for FitAI
 *
 * ============================================================================
 * SUPABASE USER PROFILE OPERATIONS ONLY
 * ============================================================================
 *
 * This store handles Supabase user profile operations and remote data sync.
 *
 * IMPORTANT: For ONBOARDING profile data (personalInfo, dietPreferences,
 * bodyAnalysis, workoutPreferences, advancedReview), use profileStore.ts
 * which is the SINGLE SOURCE OF TRUTH for that data.
 *
 * RESPONSIBILITIES:
 *   - Supabase auth user profile (id, email, verification status)
 *   - Remote profile CRUD operations (createProfile, updateProfile, etc.)
 *   - isProfileComplete flag (tracks onboarding completion state)
 *
 * NOT RESPONSIBLE FOR (use profileStore instead):
 *   - personalInfo details (name, age, gender, etc.)
 *   - dietPreferences (diet type, allergies, etc.)
 *   - bodyAnalysis (height, weight, body composition, etc.)
 *   - workoutPreferences (location, equipment, goals, etc.)
 *   - advancedReview (calculated metrics, health scores, etc.)
 *
 * BACKWARD COMPATIBILITY:
 *   - Some methods like updatePersonalInfo are kept for legacy code
 *   - These methods should NOT be used for new development
 *   - Migrate to profileStore for all onboarding data
 *
 * @see src/stores/profileStore.ts - SSOT for onboarding profile data
 * @see src/services/DataBridge.ts - Unified data sync layer
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  UserProfile,
  PersonalInfo,
  FitnessGoals,
  CreateProfileRequest,
  UpdateProfileRequest,
  CreateFitnessGoalsRequest,
  UpdateFitnessGoalsRequest,
} from "../types/user";
import {
  userProfileService,
  UserProfileResponse,
  FitnessGoalsResponse,
} from "../services/userProfile";

interface UserState {
  // State
  profile: UserProfile | null;
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
  checkProfileComplete: (profile: UserProfile) => boolean;
  updateFitnessGoalsLocal: (fitnessGoals: FitnessGoals) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      isLoading: false,
      error: null,
      isProfileComplete: false,

      // Actions
      createProfile: async (
        profileData: CreateProfileRequest,
      ): Promise<UserProfileResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await userProfileService.createProfile(profileData);

          if (response.success && response.data) {
            set({
              profile: response.data,
              isLoading: false,
              error: null,
              isProfileComplete: get().checkProfileComplete(response.data),
            });
          } else {
            set({
              isLoading: false,
              error: response.error || "Failed to create profile",
            });
          }

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to create profile";
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      getProfile: async (userId: string): Promise<UserProfileResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await userProfileService.getProfile(userId);

          if (response.success && response.data) {
            set({
              profile: response.data,
              isLoading: false,
              error: null,
              isProfileComplete: get().checkProfileComplete(response.data),
            });
          } else {
            set({
              isLoading: false,
              error: response.error || "Failed to get profile",
            });
          }

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to get profile";
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      updateProfile: async (
        userId: string,
        updates: UpdateProfileRequest,
      ): Promise<UserProfileResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await userProfileService.updateProfile(
            userId,
            updates,
          );

          if (response.success && response.data) {
            set({
              profile: response.data,
              isLoading: false,
              error: null,
              isProfileComplete: get().checkProfileComplete(response.data),
            });
          } else {
            set({
              isLoading: false,
              error: response.error || "Failed to update profile",
            });
          }

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to update profile";
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      createFitnessGoals: async (
        goalsData: CreateFitnessGoalsRequest,
      ): Promise<FitnessGoalsResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response =
            await userProfileService.createFitnessGoals(goalsData);

          if (response.success && response.data) {
            const currentProfile = get().profile;
            if (currentProfile) {
              const updatedProfile = {
                ...currentProfile,
                fitnessGoals: response.data,
              };
              set({
                profile: updatedProfile,
                isLoading: false,
                error: null,
                isProfileComplete: get().checkProfileComplete(updatedProfile),
              });
            } else {
              set({
                isLoading: false,
                error: null,
              });
            }
          } else {
            set({
              isLoading: false,
              error: response.error || "Failed to create fitness goals",
            });
          }

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to create fitness goals";
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      getFitnessGoals: async (
        userId: string,
      ): Promise<FitnessGoalsResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await userProfileService.getFitnessGoals(userId);

          if (response.success && response.data) {
            const currentProfile = get().profile;
            if (currentProfile) {
              const updatedProfile = {
                ...currentProfile,
                fitnessGoals: response.data,
              };
              set({
                profile: updatedProfile,
                isLoading: false,
                error: null,
                isProfileComplete: get().checkProfileComplete(updatedProfile),
              });
            } else {
              set({
                isLoading: false,
                error: null,
              });
            }
          } else {
            set({
              isLoading: false,
              error: response.error || "Failed to get fitness goals",
            });
          }

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to get fitness goals";
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      updateFitnessGoals: async (
        userId: string,
        updates: UpdateFitnessGoalsRequest,
      ): Promise<FitnessGoalsResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await userProfileService.updateFitnessGoals(
            userId,
            updates,
          );

          if (response.success && response.data) {
            const currentProfile = get().profile;
            if (currentProfile) {
              const updatedProfile = {
                ...currentProfile,
                fitnessGoals: response.data,
              };
              set({
                profile: updatedProfile,
                isLoading: false,
                error: null,
                isProfileComplete: get().checkProfileComplete(updatedProfile),
              });
            } else {
              set({
                isLoading: false,
                error: null,
              });
            }
          } else {
            set({
              isLoading: false,
              error: response.error || "Failed to update fitness goals",
            });
          }

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to update fitness goals";
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      getCompleteProfile: async (
        userId: string,
      ): Promise<UserProfileResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await userProfileService.getCompleteProfile(userId);

          if (response.success && response.data) {
            set({
              profile: response.data,
              isLoading: false,
              error: null,
              isProfileComplete: get().checkProfileComplete(response.data),
            });
          } else {
            set({
              isLoading: false,
              error: response.error || "Failed to get complete profile",
            });
          }

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to get complete profile";
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      deleteProfile: async (
        userId: string,
      ): Promise<{ success: boolean; error?: string }> => {
        set({ isLoading: true, error: null });

        try {
          const response = await userProfileService.deleteProfile(userId);

          if (response.success) {
            set({
              profile: null,
              isLoading: false,
              error: null,
              isProfileComplete: false,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || "Failed to delete profile",
            });
          }

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to delete profile";
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

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

      setProfile: (profile: UserProfile | null) => {
        set({
          profile,
          isProfileComplete: profile
            ? get().checkProfileComplete(profile)
            : false,
        });
      },

      /**
       * @deprecated Use profileStore.updatePersonalInfo() instead
       * This method is kept for backward compatibility only.
       * profileStore is the SSOT for all onboarding profile data.
       */
      updatePersonalInfo: (personalInfo: PersonalInfo) => {
        console.warn(
          "[userStore] DEPRECATED: updatePersonalInfo called. Use profileStore.updatePersonalInfo() instead.",
        );
        const currentProfile = get().profile;
        if (currentProfile) {
          const updatedProfile = {
            ...currentProfile,
            personalInfo,
          };
          set({
            profile: updatedProfile,
            isProfileComplete: get().checkProfileComplete(updatedProfile),
          });
        }
      },

      /**
       * @deprecated Use profileStore.updateWorkoutPreferences() instead
       * This method is kept for backward compatibility only.
       * profileStore is the SSOT for all onboarding profile data.
       */
      updateFitnessGoalsLocal: (fitnessGoals: FitnessGoals) => {
        console.warn(
          "[userStore] DEPRECATED: updateFitnessGoalsLocal called. Use profileStore.updateWorkoutPreferences() instead.",
        );
        const currentProfile = get().profile;
        if (currentProfile) {
          const updatedProfile = {
            ...currentProfile,
            fitnessGoals,
          };
          set({
            profile: updatedProfile,
            isProfileComplete: get().checkProfileComplete(updatedProfile),
          });
        }
      },

      // Helper function to check if profile is complete
      checkProfileComplete: (profile: UserProfile): boolean => {
        // Guard: Check if profile exists
        if (!profile) {
          console.log("⚠️ checkProfileComplete: Profile is null/undefined");
          return false;
        }

        const { personalInfo, fitnessGoals } = profile;

        // Guard: Check if required nested objects exist
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
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
        isProfileComplete: state.isProfileComplete,
      }),
    },
  ),
);

export default useUserStore;
