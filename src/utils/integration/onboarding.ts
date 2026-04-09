import { useAuth } from "../../hooks/useAuth";
import { useUserStore } from "../../stores/userStore";
import { useOffline } from "../../hooks/useOffline";
import {
  OnboardingData,
  WorkoutPreferences as UserWorkoutPreferences,
  DietPreferences as UserDietPreferences,
  CreateProfileRequest,
} from "../../types/user";
import { supabase } from "../../services/api";
import { dataBridge } from "../../services/DataBridge";
import {
  IntegrationResponse,
  UserPersonalInfo,
  UserFitnessGoals,
  GetUserIdFn,
} from "./types";

export const useOnboardingIntegration = () => {
  const { user: authUser, isAuthenticated, isGuestMode, guestId } = useAuth();
  const {
    createProfile,
    updateProfile,
    createFitnessGoals,
    updateFitnessGoals,
    updatePersonalInfo,
    updateFitnessGoalsLocal,
  } = useUserStore();
  const { optimisticCreate } = useOffline();

  const getUserId: GetUserIdFn = () => {
    if (isAuthenticated && authUser) {
      return authUser.id;
    }
    return guestId || "guest";
  };

  const savePersonalInfo = async (
    personalInfo: UserPersonalInfo,
  ): Promise<IntegrationResponse> => {
    try {
      const currentUserId = getUserId();

      dataBridge.setUserId(currentUserId);
      const localSaveSuccess = await dataBridge.savePersonalInfo(personalInfo);

      if (!localSaveSuccess) {
        console.warn("[INTEGRATION] Local save of personal info failed");
      }

      if (isAuthenticated && authUser) {
        const personalData = personalInfo as UserPersonalInfo & Record<string, unknown>;

        let firstName = personalData.first_name || "";
        let lastName = personalData.last_name || "";

        if (!firstName && !lastName && personalData.name) {
          const nameParts = personalData.name.trim().split(" ");
          firstName = nameParts[0] || "";
          lastName = nameParts.slice(1).join(" ") || "";
        }

        const heightValue =
          (personalData.height_cm as number | undefined) ||
          personalData.height ||
          undefined;
        const weightValue =
          (personalData.current_weight_kg as number | undefined) ||
          personalData.weight ||
          undefined;
        const ageValue = personalData.age;

        const profileData = {
          name: personalData.name || `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          age: ageValue || undefined,
          gender: personalData.gender as UserPersonalInfo["gender"],
          height_cm: heightValue,
          current_weight_kg: weightValue,
          activityLevel: personalData.activityLevel as string | undefined,
        } as Partial<UserPersonalInfo>;

        let response = await updateProfile(authUser.id, profileData);

        if (!response.success) {
          const createData: Record<string, unknown> = {
            name: personalData.name || `${firstName} ${lastName}`.trim(),
            first_name: firstName,
            last_name: lastName,
            age: ageValue || "",
            gender: personalData.gender as UserPersonalInfo["gender"],
            height_cm: heightValue || "",
            current_weight_kg: weightValue || "",
            activityLevel: personalData.activityLevel as string | undefined,
            id: authUser.id,
            email: authUser.email || "",
          };
          response = await createProfile(createData as unknown as CreateProfileRequest);
        }

        if (!response.success) {
          console.warn(
            "[INTEGRATION] Profile save/create both failed for user:",
            authUser.id,
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Error saving personal info:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save personal info",
      };
    }
  };

  const saveFitnessGoals = async (
    fitnessGoals: UserFitnessGoals,
  ): Promise<IntegrationResponse> => {
    try {
      const currentUserId = getUserId();

      dataBridge.setUserId(currentUserId);
      const localSaveSuccess = await dataBridge.saveFitnessGoals(
        fitnessGoals as unknown as UserWorkoutPreferences,
      );

      if (!localSaveSuccess) {
        console.warn("[INTEGRATION] Local save of fitness goals failed");
      }

      if (isAuthenticated && authUser) {
        updateFitnessGoalsLocal(fitnessGoals);

        // Save to workout_preferences (SSOT) instead of deprecated fitness_goals table
        const { error: wpError } = await supabase
          .from("workout_preferences")
          .upsert(
            {
              user_id: authUser.id,
              primary_goals:
                fitnessGoals.primary_goals || fitnessGoals.primaryGoals || [],
              time_commitment:
                fitnessGoals.time_commitment || fitnessGoals.timeCommitment || "",
              experience_level:
                fitnessGoals.experience_level || fitnessGoals.experience || "",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

        if (wpError) {
          console.warn(
            "[INTEGRATION] Workout preferences save failed for user:",
            authUser.id,
            wpError.message,
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Error saving fitness goals:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save fitness goals",
      };
    }
  };

  const saveDietPreferences = async (
    dietPreferences: NonNullable<OnboardingData["dietPreferences"]>,
  ): Promise<IntegrationResponse> => {
    try {
      const currentUserId = getUserId();

      const dietPrefsRecord = dietPreferences as Record<string, unknown>;
      const dietPrefsWithDefaults: Record<string, unknown> = {
        ...dietPreferences,
        cookingSkill: (dietPrefsRecord.cookingSkill as string) || "intermediate",
        mealPrepTime: (dietPrefsRecord.mealPrepTime as string) || "moderate",
        dislikes: (dietPrefsRecord.dislikes as string[]) || [],
        id: `diet_${currentUserId}`,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: "pending" as const,
        source: "local" as const,
      };

      dataBridge.setUserId(currentUserId);
      const localSaveSuccess = await dataBridge.saveDietPreferences(
        dietPrefsWithDefaults as unknown as UserDietPreferences,
      );

      if (!localSaveSuccess) {
        console.warn("[INTEGRATION] Local save of diet preferences failed");
      }

      if (isAuthenticated && authUser) {
        try {
          const { data, error } = await supabase
            .from("diet_preferences")
            .upsert({
              user_id: authUser.id,
              diet_type: dietPreferences.dietType,
              allergies: dietPreferences.allergies,
              restrictions: dietPreferences.restrictions,
            });

          if (error) {
            console.error(
              "[INTEGRATION] diet_preferences upsert error:",
              error,
            );
          }
        } catch (remoteError) {
          console.error(
            "[INTEGRATION] diet_preferences remote error:",
            remoteError,
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Error saving diet preferences:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save diet preferences",
      };
    }
  };

  const saveWorkoutPreferences = async (
    workoutPreferences: NonNullable<OnboardingData["workoutPreferences"]>,
  ): Promise<IntegrationResponse> => {
    try {
      const currentUserId = getUserId();

      dataBridge.setUserId(currentUserId);
      const localSaveSuccess =
        await dataBridge.saveWorkoutPreferences(workoutPreferences);

      if (!localSaveSuccess) {
        console.warn("[INTEGRATION] Local save of workout preferences failed");
      }

      if (isAuthenticated && authUser) {
        try {
          const { data, error } = await supabase
            .from("workout_preferences")
            .upsert({
              user_id: authUser.id,
              location: workoutPreferences.location,
              equipment: workoutPreferences.equipment,
              time_preference:
                workoutPreferences.time_preference ||
                30,
              intensity: workoutPreferences.intensity,
              workout_types:
                workoutPreferences.workout_types ||
                [],
            });

          if (error) {
            console.error(
              "[INTEGRATION] workout_preferences upsert error:",
              error,
            );
          }
        } catch (remoteError) {
          console.error(
            "[INTEGRATION] workout_preferences remote error:",
            remoteError,
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Error saving workout preferences:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save workout preferences",
      };
    }
  };

  const saveBodyAnalysis = async (
    bodyAnalysis: NonNullable<OnboardingData["bodyAnalysis"]>,
  ): Promise<IntegrationResponse> => {
    try {
      const currentUserId = getUserId();

      if (isAuthenticated && authUser) {
        try {
          const photoUrls = bodyAnalysis.photos || {};
          const { data, error } = await supabase.from("body_analysis").upsert({
            user_id: authUser.id,
            front_photo_url: photoUrls.front || null,
            side_photo_url: photoUrls.side || null,
            back_photo_url: photoUrls.back || null,
          });

          if (error) {
            console.error("[INTEGRATION] body_analysis upsert error:", error);
          }
        } catch (remoteError) {
          console.error(
            "[INTEGRATION] body_analysis remote error:",
            remoteError,
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Error saving body analysis:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save body analysis",
      };
    }
  };

  const saveOnboardingData = async (
    onboardingData: OnboardingData,
  ): Promise<IntegrationResponse> => {
    try {
      const personalInfoResult = await savePersonalInfo(
        onboardingData.personalInfo,
      );
      if (!personalInfoResult.success) {
        return personalInfoResult;
      }

      const fitnessGoalsResult = await saveFitnessGoals(
        onboardingData.fitnessGoals,
      );
      if (!fitnessGoalsResult.success) {
        return fitnessGoalsResult;
      }

      if (onboardingData.dietPreferences) {
        const dietResult = await saveDietPreferences(
          onboardingData.dietPreferences,
        );
        if (!dietResult.success) {
          return dietResult;
        }
      }

      if (onboardingData.workoutPreferences) {
        const workoutResult = await saveWorkoutPreferences(
          onboardingData.workoutPreferences,
        );
        if (!workoutResult.success) {
          return workoutResult;
        }
      }

      if (
        onboardingData.bodyAnalysis &&
        Object.keys(onboardingData.bodyAnalysis.photos).length > 0
      ) {
        const bodyResult = await saveBodyAnalysis(onboardingData.bodyAnalysis);
        if (!bodyResult.success) {
          return bodyResult;
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save onboarding data",
      };
    }
  };

  return {
    savePersonalInfo,
    saveFitnessGoals,
    saveDietPreferences,
    saveWorkoutPreferences,
    saveBodyAnalysis,
    saveOnboardingData,
  };
};
