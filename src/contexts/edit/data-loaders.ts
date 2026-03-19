import {
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
} from "./types";
import { useProfileStore } from "../../stores/profileStore";

interface LoadDataParams {
  section: string;
  user: any;
  isGuestMode: boolean;
  profile: any;
  getCompleteProfile: (userId: string) => Promise<any>;
}

export async function loadSectionData(params: LoadDataParams): Promise<any> {
  const { section, user, isGuestMode, profile, getCompleteProfile } = params;

  let profileData = null;

  if (user?.id && !isGuestMode) {
    const profileResponse = await getCompleteProfile(user.id);
    if (profileResponse.success && profileResponse.data) {
      profileData = profileResponse.data;
    }
  } else if (isGuestMode && profile) {
    profileData = profile;
  }

  if (profileData) {
    let sectionData;
    switch (section) {
      case "personalInfo":
        sectionData = profileData.personalInfo;
        break;
      case "fitnessGoals":
        sectionData = profileData.fitnessGoals;
        break;
      case "dietPreferences":
        sectionData = profileData.dietPreferences;
        break;
      case "workoutPreferences":
        sectionData = profileData.workoutPreferences;
        break;
      default:
        throw new Error(`Unknown section: ${section}`);
    }

    if (sectionData) {
      return sectionData;
    }
  }

  return null;
}

export function createDefaultSectionData(
  section: string,
  user: any,
  _profile: any,
): any {
  switch (section) {
    case "personalInfo": {
      const profileStorePI = useProfileStore.getState().personalInfo;
      const piName =
        `${profileStorePI?.first_name || ""} ${profileStorePI?.last_name || ""}`.trim();
      return {
        first_name: profileStorePI?.first_name || "",
        last_name: profileStorePI?.last_name || "",
        name: piName || profileStorePI?.name || "",
        email: user?.email || profileStorePI?.email || "",
        age: profileStorePI?.age || 0,
        gender: profileStorePI?.gender || "prefer_not_to_say",
        country: profileStorePI?.country || "",
        state: profileStorePI?.state || "",
        region: profileStorePI?.region,
        wake_time: profileStorePI?.wake_time || "",
        sleep_time: profileStorePI?.sleep_time || "",
        occupation_type: profileStorePI?.occupation_type || "desk_job",
        profile_picture: profileStorePI?.profile_picture,
        dark_mode: profileStorePI?.dark_mode,
        units: profileStorePI?.units,
        notifications_enabled: profileStorePI?.notifications_enabled,
      };
    }

    case "fitnessGoals": {
      const profileStoreWP = useProfileStore.getState().workoutPreferences;
      return {
        primary_goals: profileStoreWP?.primary_goals || [],
        primaryGoals: profileStoreWP?.primary_goals || [],
        time_commitment: String(profileStoreWP?.time_preference || ""),
        experience: profileStoreWP?.intensity || "",
        experience_level: profileStoreWP?.intensity || "",
        id: `fitnessGoals_${user?.id || "guest"}_${Date.now()}`,
        version: 1,
        updatedAt: new Date().toISOString(),
        syncStatus: "pending" as const,
        source: "local" as const,
      };
    }

    case "dietPreferences": {
      const dp = useProfileStore.getState().dietPreferences;
      return {
        diet_type: dp?.diet_type || "non-veg",
        allergies: dp?.allergies || [],
        restrictions: dp?.restrictions || [],
        keto_ready: dp?.keto_ready || false,
        intermittent_fasting_ready: dp?.intermittent_fasting_ready || false,
        paleo_ready: dp?.paleo_ready || false,
        mediterranean_ready: dp?.mediterranean_ready || false,
        low_carb_ready: dp?.low_carb_ready || false,
        high_protein_ready: dp?.high_protein_ready || false,
        breakfast_enabled: dp?.breakfast_enabled !== false,
        lunch_enabled: dp?.lunch_enabled !== false,
        dinner_enabled: dp?.dinner_enabled !== false,
        snacks_enabled: dp?.snacks_enabled !== false,
        cooking_skill_level: dp?.cooking_skill_level || "beginner",
        max_prep_time_minutes: dp?.max_prep_time_minutes || null,
        budget_level: dp?.budget_level || "medium",
        drinks_enough_water: dp?.drinks_enough_water || false,
        limits_sugary_drinks: dp?.limits_sugary_drinks || false,
        eats_regular_meals: dp?.eats_regular_meals || false,
        avoids_late_night_eating: dp?.avoids_late_night_eating || false,
        controls_portion_sizes: dp?.controls_portion_sizes || false,
        reads_nutrition_labels: dp?.reads_nutrition_labels || false,
        eats_processed_foods: dp?.eats_processed_foods !== false,
        eats_5_servings_fruits_veggies:
          dp?.eats_5_servings_fruits_veggies || false,
        limits_refined_sugar: dp?.limits_refined_sugar || false,
        includes_healthy_fats: dp?.includes_healthy_fats || false,
        drinks_alcohol: dp?.drinks_alcohol || false,
        smokes_tobacco: dp?.smokes_tobacco || false,
        drinks_coffee: dp?.drinks_coffee || false,
        takes_supplements: dp?.takes_supplements || false,
      };
    }

    case "workoutPreferences": {
      const profileStoreWP = useProfileStore.getState().workoutPreferences;
      return {
        workoutTypes: profileStoreWP?.workout_types || [],
        equipment: profileStoreWP?.equipment || [],
        location: profileStoreWP?.location || ("both" as const),
        intensity: profileStoreWP?.intensity || ("beginner" as const),
        timePreference: profileStoreWP?.time_preference || 30,
        primaryGoals: profileStoreWP?.primary_goals || [],
        activityLevel: profileStoreWP?.activity_level || "moderate",
        id: `workoutPreferences_${user?.id || "guest"}_${Date.now()}`,
        version: 1,
        updatedAt: new Date().toISOString(),
        syncStatus: "pending" as const,
        source: "local" as const,
      };
    }

    default:
      throw new Error(`Unknown section: ${section}`);
  }
}
