import type {
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  BodyMetrics,
} from "../../types/user";
import type { DietGenerationRequest } from "../fitaiWorkersClient";

export function transformForDietRequest(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  bodyMetrics?: BodyMetrics,
  dietPreferences?: DietPreferences,
  calorieTarget?: number,
): DietGenerationRequest {
  const activityLevel =
    personalInfo.activityLevel ||
    fitnessGoals.experience_level ||
    fitnessGoals.experience ||
    "moderate";

  const primaryGoal =
    fitnessGoals.primary_goals?.[0] ||
    fitnessGoals.primaryGoals?.[0] ||
    "general_fitness";

  const dietaryRestrictions: string[] = [];
  if (dietPreferences?.diet_type) {
    const dietType = dietPreferences.diet_type.toLowerCase();
    if (["vegetarian", "vegan", "pescatarian", "keto"].includes(dietType)) {
      dietaryRestrictions.push(dietType);
    }
  }
  if (dietPreferences?.restrictions) {
    dietaryRestrictions.push(...dietPreferences.restrictions);
  }

  if (!personalInfo.age || !personalInfo.weight || !personalInfo.height) {
    console.warn(
      "[aiRequestTransformers] Missing required profile data - onboarding may be incomplete",
    );
  }

  return {
    profile: {
      age: personalInfo.age,
      gender: personalInfo.gender,
      weight: (bodyMetrics?.current_weight_kg ?? personalInfo.weight) as number,
      height: (bodyMetrics?.height_cm ?? personalInfo.height) as number,
      activityLevel: activityLevel,
      fitnessGoal: primaryGoal,
    },
    dietPreferences: dietPreferences
      ? {
          dietType: dietPreferences.diet_type,
          allergies: dietPreferences.allergies ?? [],
          restrictions: dietPreferences.restrictions ?? [],
          cuisinePreferences: [],
          dislikes: [],
        }
      : undefined,

    calorieTarget: calorieTarget,
    mealsPerDay: 3,

    dietaryRestrictions:
      dietaryRestrictions.length > 0 ? dietaryRestrictions : undefined,

    model: "google/gemini-2.5-flash",
    temperature: 0.7,
  };
}
