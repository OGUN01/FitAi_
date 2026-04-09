/**
 * Converts onboarding review data to a full UserProfile.
 * Extracted from App.tsx for testability and reuse.
 */
import { OnboardingReviewData } from '../types/onboarding';
import { UserProfile, PersonalInfo, FitnessGoals, DietPreferences } from '../types/user';

// ============================================================================
// Extended runtime interfaces
// ============================================================================
// OnboardingReviewData is the legacy type, but at runtime the data may contain
// both snake_case and camelCase variants of each field (from different onboarding
// code paths). These interfaces capture the actual runtime shape so we can
// avoid `as any` casts throughout the conversion.

/** workoutPreferences may arrive with both camelCase and snake_case keys */
interface WpExtended {
  location?: 'home' | 'gym' | 'both';
  equipment?: string[];
  intensity?: 'beginner' | 'intermediate' | 'advanced';
  // snake_case keys (from new onboarding)
  time_preference?: number;
  workout_types?: string[];
  primary_goals?: string[];
  activity_level?: string;
  workout_frequency_per_week?: number;
  workout_experience_years?: number;
  preferred_workout_times?: string[];
  enjoys_cardio?: boolean;
  enjoys_strength_training?: boolean;
  enjoys_group_classes?: boolean;
  prefers_outdoor_activities?: boolean;
  needs_motivation?: boolean;
  prefers_variety?: boolean;
  // camelCase keys (from legacy onboarding)
  timePreference?: number;
  workoutTypes?: string[];
  primaryGoals?: string[];
  activityLevel?: string;
}

/** fitnessGoals may have camelCase alias for primaryGoals */
interface FgExtended {
  primary_goals?: string[];
  primaryGoals?: string[];
  time_commitment?: string;
  experience?: 'beginner' | 'intermediate' | 'advanced';
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  preferred_equipment?: string[];
  target_areas?: string[];
}

/** dietPreferences may arrive with full DietPreferencesData fields at runtime */
interface DpExtended {
  // Legacy fields from OnboardingReviewData
  dietType?: string;
  allergies?: string[];
  restrictions?: string[];
  calorieTarget?: number;
  // snake_case field from new onboarding
  diet_type?: string;
  // Diet readiness toggles
  keto_ready?: boolean;
  intermittent_fasting_ready?: boolean;
  paleo_ready?: boolean;
  mediterranean_ready?: boolean;
  low_carb_ready?: boolean;
  high_protein_ready?: boolean;
  // Meal preferences
  breakfast_enabled?: boolean;
  lunch_enabled?: boolean;
  dinner_enabled?: boolean;
  snacks_enabled?: boolean;
  // Cooking preferences
  cooking_skill_level?: string;
  cookingSkill?: string;
  max_prep_time_minutes?: number | null;
  budget_level?: string;
  // Health habits
  drinks_enough_water?: boolean;
  limits_sugary_drinks?: boolean;
  eats_regular_meals?: boolean;
  avoids_late_night_eating?: boolean;
  controls_portion_sizes?: boolean;
  reads_nutrition_labels?: boolean;
  eats_processed_foods?: boolean;
  eats_5_servings_fruits_veggies?: boolean;
  limits_refined_sugar?: boolean;
  includes_healthy_fats?: boolean;
  drinks_alcohol?: boolean;
  smokes_tobacco?: boolean;
  drinks_coffee?: boolean;
  takes_supplements?: boolean;
}

/** bodyAnalysis may arrive with flat fields or nested measurements object */
interface BaExtended {
  // Flat fields (from new onboarding)
  height_cm?: number;
  current_weight_kg?: number;
  target_weight_kg?: number;
  target_timeline_weeks?: number;
  body_fat_percentage?: number;
  waist_cm?: number;
  hip_cm?: number;
  chest_cm?: number;
  bmi?: number | null;
  bmr?: number | null;
  ideal_weight_min?: number | null;
  ideal_weight_max?: number | null;
  front_photo_url?: string;
  side_photo_url?: string;
  back_photo_url?: string;
  medical_conditions?: string[];
  medications?: string[];
  physical_limitations?: string[];
  pregnancy_status?: boolean;
  breastfeeding_status?: boolean;
  // Nested measurements (from older code paths)
  measurements?: {
    height?: number;
    height_cm?: number;
    weight?: number;
    current_weight_kg?: number;
    targetWeight?: number;
    target_weight_kg?: number;
    target_timeline_weeks?: number;
    bodyFat?: number;
    body_fat_percentage?: number;
    waist?: number;
    waist_cm?: number;
    hips?: number;
    hip_cm?: number;
    chest?: number;
    chest_cm?: number;
  };
  // Legacy fields
  photos?: Record<string, string>;
  analysis?: {
    bodyType: string;
    muscleMass: string;
    bodyFat: string;
    fitnessLevel: string;
    recommendations: string[];
  };
}

export function convertOnboardingToProfile(
  data: OnboardingReviewData,
  guestId: string | null | undefined,
): UserProfile {
  // ✅ FIX: Create fitnessGoals from workoutPreferences data
  // The onboarding saves goals data in workoutPreferences, not in a separate fitnessGoals field
  const wp = data.workoutPreferences;
  // Cast once to extended type for snake/camel dual access
  const wpExt = wp as WpExtended;

  // Convert goals from hyphen format to underscore format for edit modals
  // e.g., 'weight-loss' -> 'weight_loss', 'muscle-gain' -> 'muscle_gain'
  const rawGoals =
    wpExt?.primary_goals || wpExt?.primaryGoals || [];
  const normalizedGoals = rawGoals.map((goal: string) =>
    goal.replace(/-/g, "_"),
  );

  // Convert time_preference (number in minutes) to time range string
  // Onboarding stores: 15, 30, 45, 60, 75, 90, 120
  // Modal expects: '15-30', '30-45', '45-60', '60+'
  const timeMinutes =
    wpExt?.time_preference ?? wpExt?.timePreference ?? 0;
  const getTimeRange = (minutes: number): string => {
    if (minutes <= 30) return "15-30";
    if (minutes <= 45) return "30-45";
    if (minutes <= 60) return "45-60";
    return "60+";
  };
  const timeRange = getTimeRange(timeMinutes);

  // ALWAYS build fitnessGoals from workoutPreferences data (the source of truth)
  // Don't use data.fitnessGoals directly as it may have incorrect format
  const fgExt = data.fitnessGoals as FgExtended;
  const fitnessGoals = {
    // Pull from workoutPreferences which is where onboarding stores this data
    primary_goals:
      normalizedGoals.length > 0
        ? normalizedGoals
        : fgExt?.primary_goals || [],
    primaryGoals:
      normalizedGoals.length > 0
        ? normalizedGoals
        : fgExt?.primaryGoals || [], // Legacy alias for edit modals
    time_commitment: timeRange,
    timeCommitment: timeRange, // Legacy alias for edit modals
    experience: wp?.intensity ?? data.fitnessGoals?.experience ?? "beginner",
    experience_level:
      wp?.intensity ?? data.fitnessGoals?.experience_level ?? "beginner", // Legacy alias
    // Preserve other optional fields from data.fitnessGoals if they exist
    preferred_equipment: data.fitnessGoals?.preferred_equipment,
    target_areas: data.fitnessGoals?.target_areas,
  };

  // ✅ FIX: Compute name from first_name + last_name if not present
  const computedName =
    data.personalInfo.name ||
    `${data.personalInfo.first_name || ""} ${data.personalInfo.last_name || ""}`.trim() ||
    "User";

  return {
    id: guestId || `guest_${Date.now()}`,
    email: data.personalInfo.email || "",
    personalInfo: {
      ...data.personalInfo,
      name: computedName, // Ensure name is always computed
      // Provide defaults for required fields
      country: data.personalInfo.country || "",
      state: data.personalInfo.state || "",
      wake_time: data.personalInfo.wake_time || "07:00",
      sleep_time: data.personalInfo.sleep_time || "23:00",
      occupation_type:
        data.personalInfo.occupation_type ?? undefined,
    } as PersonalInfo,
    fitnessGoals: fitnessGoals as FitnessGoals,
    dietPreferences: data.dietPreferences
      ? (() => {
          // Cast once to extended type — at runtime dietPreferences may contain
          // snake_case fields from the new onboarding flow beyond the legacy type
          const dp = data.dietPreferences as DpExtended;
          return {
            // Basic diet info
            diet_type:
              (dp.diet_type ??
              dp.dietType ??
              "balanced") as DietPreferences['diet_type'],
            allergies: dp.allergies || [],
            restrictions: dp.restrictions || [],

            // Diet readiness toggles (6) - defaults for backward compatibility
            keto_ready: dp.keto_ready ?? false,
            intermittent_fasting_ready:
              dp.intermittent_fasting_ready ?? false,
            paleo_ready: dp.paleo_ready ?? false,
            mediterranean_ready:
              dp.mediterranean_ready ?? false,
            low_carb_ready:
              dp.low_carb_ready ?? false,
            high_protein_ready:
              dp.high_protein_ready ?? false,

            // Meal preferences (4)
            breakfast_enabled:
              dp.breakfast_enabled !== false,
            lunch_enabled:
              dp.lunch_enabled !== false,
            dinner_enabled:
              dp.dinner_enabled !== false,
            snacks_enabled:
              dp.snacks_enabled !== false,

            // Cooking preferences (3)
            cooking_skill_level:
              (dp.cooking_skill_level ||
              dp.cookingSkill ||
              "beginner") as DietPreferences['cooking_skill_level'],
            max_prep_time_minutes:
              dp.max_prep_time_minutes || null,
            budget_level:
              (dp.budget_level || "medium") as DietPreferences['budget_level'],

            // Health habits (14)
            drinks_enough_water:
              dp.drinks_enough_water ?? false,
            limits_sugary_drinks:
              dp.limits_sugary_drinks ?? false,
            eats_regular_meals:
              dp.eats_regular_meals ?? false,
            avoids_late_night_eating:
              dp.avoids_late_night_eating ?? false,
            controls_portion_sizes:
              dp.controls_portion_sizes ?? false,
            reads_nutrition_labels:
              dp.reads_nutrition_labels ?? false,
            eats_processed_foods:
              dp.eats_processed_foods ?? false,
            eats_5_servings_fruits_veggies:
              dp.eats_5_servings_fruits_veggies ??
              false,
            limits_refined_sugar:
              dp.limits_refined_sugar ?? false,
            includes_healthy_fats:
              dp.includes_healthy_fats ?? false,
            drinks_alcohol:
              dp.drinks_alcohol ?? false,
            smokes_tobacco:
              dp.smokes_tobacco ?? false,
            drinks_coffee: dp.drinks_coffee ?? false,
            takes_supplements:
              dp.takes_supplements ?? false,
          } satisfies DietPreferences;
        })()
      : undefined,
    workoutPreferences: (() => {
      const wp = data.workoutPreferences;
      // Cast once to extended type for snake/camel dual access
      const ext = wp as WpExtended | undefined;
      return ext
        ? {
            location: ext.location ?? "home",
            equipment: ext.equipment || [],
            time_preference:
              ext.time_preference ?? ext.timePreference ?? 0,
            intensity: ext.intensity ?? "beginner",
            workout_types:
              ext.workout_types ?? ext.workoutTypes ?? [],
            primary_goals:
              ext.primary_goals ?? ext.primaryGoals ?? [],
            activity_level:
              ext.activity_level ??
              ext.activityLevel ??
              undefined,
            workout_frequency_per_week:
              ext.workout_frequency_per_week,
            workout_experience_years:
              ext.workout_experience_years,
            preferred_workout_times:
              ext.preferred_workout_times ?? [],
            enjoys_cardio: ext.enjoys_cardio,
            enjoys_strength_training: ext.enjoys_strength_training,
            enjoys_group_classes: ext.enjoys_group_classes,
            prefers_outdoor_activities: ext.prefers_outdoor_activities,
            needs_motivation: ext.needs_motivation,
            prefers_variety: ext.prefers_variety,
            // Backward compatibility
            timePreference:
              ext.time_preference ?? ext.timePreference ?? 0,
            workoutTypes:
              ext.workout_types ?? ext.workoutTypes ?? [],
            primaryGoals:
              ext.primary_goals ?? ext.primaryGoals ?? [],
            activityLevel:
              ext.activity_level ??
              ext.activityLevel ??
              undefined,
          }
        : {
            location: "home" as const,
            equipment: [],
            time_preference: 0,
            intensity: "beginner" as const,
            workout_types: [],
            primary_goals: [],
            activity_level: undefined,
            // Backward compatibility
            timePreference: 0,
            workoutTypes: [],
            primaryGoals: [],
            activityLevel: undefined,
          };
    })(),
    // ✅ FIX: Map bodyAnalysis from onboarding to bodyMetrics in UserProfile
    // Handle both flat format (height_cm, current_weight_kg) and nested format (measurements.height, measurements.weight)
    bodyMetrics: data.bodyAnalysis
      ? (() => {
          // Cast once — at runtime bodyAnalysis may contain a nested measurements
          // object from older onboarding code paths not captured in the legacy type
          const ba = data.bodyAnalysis as BaExtended;
          const measurements = ba.measurements || {};
          return {
            // Check both flat format and nested measurements format, also check personalInfo
            height_cm:
              ba.height_cm ??
              measurements.height ??
              measurements.height_cm ??
              data.personalInfo?.height ??
              0,
            current_weight_kg:
              ba.current_weight_kg ??
              measurements.weight ??
              measurements.current_weight_kg ??
              data.personalInfo?.weight ??
              0,
            target_weight_kg:
              ba.target_weight_kg ??
              measurements.targetWeight ??
              measurements.target_weight_kg,
            target_timeline_weeks:
              ba.target_timeline_weeks ?? measurements.target_timeline_weeks,
            body_fat_percentage:
              ba.body_fat_percentage ??
              measurements.bodyFat ??
              measurements.body_fat_percentage,
            waist_cm:
              ba.waist_cm ?? measurements.waist ?? measurements.waist_cm,
            hip_cm: ba.hip_cm ?? measurements.hips ?? measurements.hip_cm,
            chest_cm:
              ba.chest_cm ?? measurements.chest ?? measurements.chest_cm,
            bmi: ba.bmi ?? undefined,
            bmr: ba.bmr ?? undefined,
            ideal_weight_min: ba.ideal_weight_min ?? undefined,
            ideal_weight_max: ba.ideal_weight_max ?? undefined,
            front_photo_url: ba.front_photo_url,
            side_photo_url: ba.side_photo_url,
            back_photo_url: ba.back_photo_url,
            // Medical fields from onboarding
            medical_conditions: ba.medical_conditions ?? [],
            medications: ba.medications ?? [],
            physical_limitations: ba.physical_limitations ?? [],
            pregnancy_status: ba.pregnancy_status ?? false,
            breastfeeding_status: ba.breastfeeding_status ?? false,
          };
        })()
      : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      units: "metric" as const,
      notifications: true,
      darkMode: false,
    },
    stats: {
      totalWorkouts: 0,
      totalCaloriesBurned: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
  };
}
