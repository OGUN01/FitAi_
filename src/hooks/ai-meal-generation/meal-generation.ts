import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { aiService } from "../../ai";
import { Meal } from "../../types/ai";

interface DietPreferences {
  allergies?: string[];
  diet_type?: string[];
  dislikes?: string[];
}

/** Extended preferences shape built locally for meal generation calls. */
interface MealGenerationPreferences {
  dietaryRestrictions: string[];
  cuisinePreference: string;
  prepTimeLimit: number;
  calorieTarget: number;
  dietType: string[];
  dislikes: string[];
  customOptions: Record<string, unknown>;
  suggestions: string[];
  specialAction?: string;
}

/** Preferences shape for daily meal plan generation. */
interface DailyPlanPreferences {
  calorieTarget: number;
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
}

export const createMealGenerationHandlers = (
  userId: string | undefined,
  profile: any,
  foods: any[],
  dietPreferences: DietPreferences | undefined,
  getCalorieTarget: () => number | null,
  setIsGeneratingMeal: (loading: boolean) => void,
  setAiError: (error: string | null) => void,
  setAiMeals: React.Dispatch<React.SetStateAction<Meal[]>>,
  canUseFeature: (featureKey: "ai_generation" | "barcode_scan") => boolean,
  incrementUsage: (featureKey: "ai_generation" | "barcode_scan") => void,
  triggerPaywall: (reason: string) => void,
) => {
  const generateAIMeal = async (
    mealType: string,
    setShowGuestSignUp: (show: boolean) => void,
    options?: any,
  ) => {
    if (mealType === "daily_plan") {
      return generateDailyMealPlan(setShowGuestSignUp);
    }

    if (!userId || userId.startsWith("guest")) {
      crossPlatformAlert(
        "Sign In Required",
        "Create an account to generate personalized AI meals.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Up", onPress: () => setShowGuestSignUp(true) },
        ],
      );
      return;
    }

    if (!canUseFeature("ai_generation")) {
      triggerPaywall("ai_generation_limit");
      return;
    }

    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      crossPlatformAlert("Profile Incomplete", "Please complete your profile.");
      return;
    }

    setIsGeneratingMeal(true);
    setAiError(null);

    try {
      const calorieTarget = getCalorieTarget();
      if (!calorieTarget) throw new Error("Calorie target not calculated.");

      const preferences = {
        dietaryRestrictions: dietPreferences?.allergies || [],
        cuisinePreference: options?.cuisinePreference || "any",
        prepTimeLimit: options?.quickEasy ? 20 : 30,
        calorieTarget: calorieTarget,
        dietType: dietPreferences?.diet_type || [],
        dislikes: dietPreferences?.dislikes || [],
        customOptions: options?.customOptions || {},
        suggestions: options?.suggestions || [],
      };

      let actualMealType = mealType;
      const specialActionType = [
        "meal_prep",
        "goal_focused",
        "quick_easy",
      ].includes(mealType)
        ? mealType
        : undefined;

      if (specialActionType) {
        actualMealType = "lunch";
        (preferences as any).specialAction = specialActionType;
      }

      const response = await aiService.generateMeal(
        profile.personalInfo,
        profile.fitnessGoals,
        actualMealType as "breakfast" | "lunch" | "dinner" | "snack",
        preferences as any,
      );

      if (response.success && response.data) {
        incrementUsage("ai_generation");
        setAiMeals((prev) => [response.data! as unknown as Meal, ...prev]);

        crossPlatformAlert(
          "Meal Generated!",
          `Your personalized ${mealType} is ready!`,
        );
      } else {
        setAiError(response.error || "Failed to generate meal");
        crossPlatformAlert("Generation Failed", response.error || "Failed.");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setAiError(errorMessage);
      crossPlatformAlert("Error", errorMessage);
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  const generateDailyMealPlan = async (
    setShowGuestSignUp: (show: boolean) => void,
  ) => {
    if (!userId || userId.startsWith("guest")) {
      crossPlatformAlert(
        "Sign In Required",
        "Create an account to generate meal plans.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Up", onPress: () => setShowGuestSignUp(true) },
        ],
      );
      return;
    }

    if (!canUseFeature("ai_generation")) {
      triggerPaywall("ai_generation_limit");
      return;
    }

    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      crossPlatformAlert("Profile Incomplete", "Please complete your profile.");
      return;
    }

    setIsGeneratingMeal(true);
    setAiError(null);

    try {
      const userCalorieTarget = getCalorieTarget();
      if (!userCalorieTarget) throw new Error("Calorie target not calculated.");

      const preferences = {
        calorieTarget: userCalorieTarget,
        dietaryRestrictions: dietPreferences?.allergies || [],
        cuisinePreferences: ["any"],
      };

      const response = await aiService.generateDailyMealPlan(
        profile.personalInfo,
        profile.fitnessGoals,
        preferences as any,
      );

      if (response.success && response.data) {
        incrementUsage("ai_generation");
        setAiMeals((prev) => [...response.data!.meals, ...prev]);
        crossPlatformAlert("Daily Meal Plan Generated!", "Your plan is ready!");
      } else {
        setAiError(response.error || "Failed to generate plan");
        crossPlatformAlert("Generation Failed", response.error || "Failed.");
      }
    } catch (error) {
      setAiError(String(error));
      crossPlatformAlert("Error", String(error));
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  return {
    generateAIMeal,
    generateDailyMealPlan,
  };
};
