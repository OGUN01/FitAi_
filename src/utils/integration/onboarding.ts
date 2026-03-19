import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { useOffline } from "../../hooks/useOffline";
import { OnboardingData } from "../../types/user";
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
  } = useUser();
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
        const personalData = personalInfo as any;

        let firstName = personalData.first_name || "";
        let lastName = personalData.last_name || "";

        if (!firstName && !lastName && personalData.name) {
          const nameParts = personalData.name.trim().split(" ");
          firstName = nameParts[0] || "";
          lastName = nameParts.slice(1).join(" ") || "";
        }

        const heightValue =
          personalData.height_cm ||
          parseFloat(personalData.height) ||
          undefined;
        const weightValue =
          personalData.current_weight_kg ||
          parseFloat(personalData.weight) ||
          undefined;
        const ageValue = personalData.age;

        const profileData = {
          name: personalData.name || `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          age: ageValue || undefined,
          gender: personalData.gender as "male" | "female" | "other",
          height_cm: heightValue,
          current_weight_kg: weightValue,
          activityLevel: personalData.activityLevel as any,
        } as any;

        let response = await updateProfile(authUser.id, profileData);

        if (!response.success) {
          const createData = {
            name: personalData.name || `${firstName} ${lastName}`.trim(),
            first_name: firstName,
            last_name: lastName,
            age: ageValue || "",
            gender: personalData.gender as "male" | "female" | "other",
            height_cm: heightValue || "",
            current_weight_kg: weightValue || "",
            activityLevel: personalData.activityLevel as any,
            id: authUser.id,
            email: authUser.email || "",
          } as any;
          response = await createProfile(createData);
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
        fitnessGoals as any,
      );

      if (!localSaveSuccess) {
        console.warn("[INTEGRATION] Local save of fitness goals failed");
      }

      if (isAuthenticated && authUser) {
        updateFitnessGoalsLocal(fitnessGoals as any);

        const goalsData = {
          primary_goals:
            fitnessGoals.primary_goals || fitnessGoals.primaryGoals || [],
          time_commitment:
            fitnessGoals.time_commitment || fitnessGoals.timeCommitment || "",
          experience: fitnessGoals.experience as any,
          experience_level:
            fitnessGoals.experience_level || fitnessGoals.experience,
          user_id: authUser.id,
        };

        let response = await updateFitnessGoals(authUser.id, goalsData);

        if (!response.success) {
          const createData = {
            primary_goals:
              fitnessGoals.primary_goals || fitnessGoals.primaryGoals || [],
            time_commitment:
              fitnessGoals.time_commitment || fitnessGoals.timeCommitment || "",
            experience: fitnessGoals.experience as any,
            experience_level:
              fitnessGoals.experience_level || fitnessGoals.experience,
            user_id: authUser.id,
          };
          response = await createFitnessGoals(createData);
        }

        if (!response.success) {
          console.warn(
            "[INTEGRATION] Fitness goals save/create both failed for user:",
            authUser.id,
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

      const dietPrefsWithDefaults: any = {
        ...dietPreferences,
        cookingSkill: (dietPreferences as any).cookingSkill || "intermediate",
        mealPrepTime: (dietPreferences as any).mealPrepTime || "moderate",
        dislikes: (dietPreferences as any).dislikes || [],
        id: `diet_${currentUserId}`,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: "pending" as const,
        source: "local" as const,
      };

      dataBridge.setUserId(currentUserId);
      const localSaveSuccess = await dataBridge.saveDietPreferences(
        dietPrefsWithDefaults,
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
                (workoutPreferences as any).time_preference ||
                (workoutPreferences as any).timePreference ||
                30,
              intensity: workoutPreferences.intensity,
              workout_types:
                (workoutPreferences as any).workout_types ||
                (workoutPreferences as any).workoutTypes ||
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
            front_photo_url: (photoUrls as any).front || null,
            side_photo_url: (photoUrls as any).side || null,
            back_photo_url: (photoUrls as any).back || null,
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
