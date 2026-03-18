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
  profile: any,
): any {

  switch (section) {
    case "personalInfo": {
      // SSOT: profileStore.personalInfo is authoritative (onboarding_data table); userStore.profile is legacy fallback
      const profileStorePI = useProfileStore.getState().personalInfo;
      const piName = `${profileStorePI?.first_name || ''} ${profileStorePI?.last_name || ''}`.trim();
      return {
        first_name: profileStorePI?.first_name || profile?.personalInfo?.first_name || "",
        last_name: profileStorePI?.last_name || profile?.personalInfo?.last_name || "",
        name: piName || profileStorePI?.name || profile?.personalInfo?.name || "",
        email: user?.email || profileStorePI?.email || profile?.personalInfo?.email || "",
        age: profileStorePI?.age || profile?.personalInfo?.age || 0,
        gender: profileStorePI?.gender || profile?.personalInfo?.gender || "prefer_not_to_say",
        country: profileStorePI?.country || profile?.personalInfo?.country || "",
        state: profileStorePI?.state || profile?.personalInfo?.state || "",
        region: profileStorePI?.region ?? profile?.personalInfo?.region,
        wake_time: profileStorePI?.wake_time || profile?.personalInfo?.wake_time || "",
        sleep_time: profileStorePI?.sleep_time || profile?.personalInfo?.sleep_time || "",
        occupation_type: profileStorePI?.occupation_type || profile?.personalInfo?.occupation_type || "desk_job",
        profile_picture: profileStorePI?.profile_picture ?? profile?.personalInfo?.profile_picture,
        dark_mode: profileStorePI?.dark_mode ?? profile?.personalInfo?.dark_mode,
        units: profileStorePI?.units || profile?.personalInfo?.units,
        notifications_enabled: profileStorePI?.notifications_enabled ?? profile?.personalInfo?.notifications_enabled,
      };
    }

    case "fitnessGoals": {
      // SSOT: profileStore.workoutPreferences is authoritative for fitness goals (onboarding_data table)
      const profileStoreWP = useProfileStore.getState().workoutPreferences;
      return {
        primary_goals:
          profileStoreWP?.primary_goals ||
          profile?.fitnessGoals?.primary_goals ||
          profile?.fitnessGoals?.primaryGoals ||
          [],
        time_commitment:
          String(profileStoreWP?.time_preference || '') ||
          profile?.fitnessGoals?.time_commitment ||
          profile?.fitnessGoals?.timeCommitment ||
          "",
        experience: profileStoreWP?.intensity || profile?.fitnessGoals?.experience || "",
        experience_level:
          profileStoreWP?.intensity ||
          profile?.fitnessGoals?.experience_level ||
          profile?.fitnessGoals?.experience ||
          "",
        id: `fitnessGoals_${user?.id || "guest"}_${Date.now()}`,
        version: 1,
        updatedAt: new Date().toISOString(),
        syncStatus: "pending" as const,
        source: "local" as const,
      };
    }

    case "dietPreferences": {
      // SSOT: profileStore.dietPreferences is authoritative (onboarding_data table); userStore.profile is legacy fallback
      const profileStoreDP = useProfileStore.getState().dietPreferences;
      const dp = (profileStoreDP || profile?.dietPreferences) as any;
      return {
        diet_type: dp?.diet_type || dp?.dietType || "non-veg",
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
        cooking_skill_level:
          dp?.cooking_skill_level || dp?.cookingSkill || "beginner",
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
      // SSOT: profileStore.workoutPreferences is authoritative for all workout pref fields
      const profileStoreWP = useProfileStore.getState().workoutPreferences;
      return {
        workoutTypes: profileStoreWP?.workout_types || profile?.workoutPreferences?.workoutTypes || [],
        equipment: profileStoreWP?.equipment || profile?.workoutPreferences?.equipment || [],
        location: profileStoreWP?.location || profile?.workoutPreferences?.location || ("both" as const),
        intensity:
          profileStoreWP?.intensity || profile?.workoutPreferences?.intensity || ("beginner" as const),
        timePreference: profileStoreWP?.time_preference || profile?.workoutPreferences?.timePreference || 30,
        primaryGoals: profileStoreWP?.primary_goals || profile?.workoutPreferences?.primaryGoals || [],
        activityLevel: profileStoreWP?.activity_level || profile?.workoutPreferences?.activity_level || "moderate",
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
