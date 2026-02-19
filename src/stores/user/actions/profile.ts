import { StateCreator } from "zustand";
import {
  UserStoreState,
  CreateProfileRequest,
  UpdateProfileRequest,
  UserProfileResponse,
  ProfileActions,
  PersonalInfo,
} from "../types";
import { userProfileService } from "../../../services/userProfile";

export const createProfileActions: StateCreator<
  UserStoreState,
  [],
  [],
  ProfileActions
> = (set, get) => ({
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
      const response = await userProfileService.updateProfile(userId, updates);

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

  getCompleteProfile: async (userId: string): Promise<UserProfileResponse> => {
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

  setProfile: (profile) => {
    set({
      profile,
      isProfileComplete: profile ? get().checkProfileComplete(profile) : false,
    });
  },

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
});
