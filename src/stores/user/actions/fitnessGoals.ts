import { StateCreator } from "zustand";
import {
  UserStoreState,
  CreateFitnessGoalsRequest,
  UpdateFitnessGoalsRequest,
  FitnessGoalsResponse,
  FitnessGoalsActions,
  FitnessGoals,
} from "../types";
import { userProfileService } from "../../../services/userProfile";

export const createFitnessGoalsActions: StateCreator<
  UserStoreState,
  [],
  [],
  FitnessGoalsActions
> = (set, get) => ({
  createFitnessGoals: async (
    goalsData: CreateFitnessGoalsRequest,
  ): Promise<FitnessGoalsResponse> => {
    set({ isLoading: true, error: null });

    try {
      const response = await userProfileService.createFitnessGoals(goalsData);

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

  getFitnessGoals: async (userId: string): Promise<FitnessGoalsResponse> => {
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
        error instanceof Error ? error.message : "Failed to get fitness goals";
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

  /** @deprecated Use profileStore.updateWorkoutPreferences() instead */
  updateFitnessGoalsLocal: (fitnessGoals: FitnessGoals) => {
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
});
