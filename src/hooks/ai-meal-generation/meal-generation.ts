import { Alert } from "react-native";
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
      Alert.alert(
        "Sign Up Required",
        "Create an account to generate personalized AI meals.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Up", onPress: () => setShowGuestSignUp(true) },
        ],
      );
      return;
    }

    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert("Profile Incomplete", "Please complete your profile.");
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
        setAiMeals((prev) => [response.data! as unknown as Meal, ...prev]);

        Alert.alert(
          "Meal Generated!",
          `Your personalized ${mealType} is ready!`,
        );
      } else {
        setAiError(response.error || "Failed to generate meal");
        Alert.alert("Generation Failed", response.error || "Failed.");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setAiError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  const generateDailyMealPlan = async (
    setShowGuestSignUp: (show: boolean) => void,
  ) => {
    if (!userId || userId.startsWith("guest")) {
      Alert.alert(
        "Sign Up Required",
        "Create an account to generate meal plans.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Up", onPress: () => setShowGuestSignUp(true) },
        ],
      );
      return;
    }

    if (!profile?.personalInfo || !profile?.fitnessGoals) {
      Alert.alert("Profile Incomplete", "Please complete your profile.");
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
        setAiMeals((prev) => [...response.data!.meals, ...prev]);
        Alert.alert("Daily Meal Plan Generated!", "Your plan is ready!");
      } else {
        setAiError(response.error || "Failed to generate plan");
        Alert.alert("Generation Failed", response.error || "Failed.");
      }
    } catch (error) {
      setAiError(String(error));
      Alert.alert("Error", String(error));
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  return {
    generateAIMeal,
    generateDailyMealPlan,
  };
};
