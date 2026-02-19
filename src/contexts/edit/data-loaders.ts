import {
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
} from "./types";

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
    console.log(
      `🔄 EditContext: Loading ${section} data for authenticated user`,
    );
    const profileResponse = await getCompleteProfile(user.id);
    if (profileResponse.success && profileResponse.data) {
      profileData = profileResponse.data;
    }
  } else if (isGuestMode && profile) {
    console.log(`🔄 EditContext: Loading ${section} data for guest user`);
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
      console.log(
        `✅ EditContext: Found existing ${section} data (using database schema):`,
        sectionData,
      );
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
  console.log(
    `📝 EditContext: No existing ${section} data found, creating default structure`,
  );

  switch (section) {
    case "personalInfo":
      return {
        first_name: profile?.personalInfo?.first_name || "",
        last_name: profile?.personalInfo?.last_name || "",
        name: profile?.personalInfo?.name || "",
        email: user?.email || profile?.personalInfo?.email || "",
        age: profile?.personalInfo?.age || 0,
        gender: profile?.personalInfo?.gender || "prefer_not_to_say",
        country: profile?.personalInfo?.country || "",
        state: profile?.personalInfo?.state || "",
        region: profile?.personalInfo?.region,
        wake_time: profile?.personalInfo?.wake_time || "",
        sleep_time: profile?.personalInfo?.sleep_time || "",
        occupation_type: profile?.personalInfo?.occupation_type || "desk_job",
        profile_picture: profile?.personalInfo?.profile_picture,
        dark_mode: profile?.personalInfo?.dark_mode,
        units: profile?.personalInfo?.units,
        notifications_enabled: profile?.personalInfo?.notifications_enabled,
      };

    case "fitnessGoals":
      return {
        primary_goals:
          profile?.fitnessGoals?.primary_goals ||
          profile?.fitnessGoals?.primaryGoals ||
          [],
        time_commitment:
          profile?.fitnessGoals?.time_commitment ||
          profile?.fitnessGoals?.timeCommitment ||
          "",
        experience: profile?.fitnessGoals?.experience || "",
        experience_level:
          profile?.fitnessGoals?.experience_level ||
          profile?.fitnessGoals?.experience ||
          "",
        id: `fitnessGoals_${user?.id || "guest"}_${Date.now()}`,
        version: 1,
        updatedAt: new Date().toISOString(),
        syncStatus: "pending" as const,
        source: "local" as const,
      };

    case "dietPreferences":
      const dp = profile?.dietPreferences as any;
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

    case "workoutPreferences":
      return {
        workoutTypes: profile?.workoutPreferences?.workoutTypes || [],
        equipment: profile?.workoutPreferences?.equipment || [],
        location: profile?.workoutPreferences?.location || ("both" as const),
        intensity:
          profile?.workoutPreferences?.intensity || ("beginner" as const),
        timePreference: profile?.workoutPreferences?.timePreference || 30,
        primaryGoals: profile?.workoutPreferences?.primaryGoals || [],
        activityLevel: profile?.workoutPreferences?.activityLevel || "moderate",
        id: `workoutPreferences_${user?.id || "guest"}_${Date.now()}`,
        version: 1,
        updatedAt: new Date().toISOString(),
        syncStatus: "pending" as const,
        source: "local" as const,
      };

    default:
      throw new Error(`Unknown section: ${section}`);
  }
}
