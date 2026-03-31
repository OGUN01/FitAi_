import { supabase } from "./supabase";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  OnboardingProgressData,
  TabValidationResult,
  ProfilesRow,
  DietPreferencesRow,
  BodyAnalysisRow,
  WorkoutPreferencesRow,
  AdvancedReviewRow,
  OnboardingProgressRow,
} from "../types/onboarding";
import { resolveCurrentWeightForUser } from "./currentWeight";
import { normalizeCountryToISO } from "../utils/healthCalculations/autoDetection";

// ============================================================================
// PERSONAL INFO SERVICE
// ============================================================================

export class PersonalInfoService {
  static async save(userId: string, data: PersonalInfoData): Promise<boolean> {
    try {
      // CRITICAL: Get user email from auth session - required NOT NULL field in profiles table
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || "";

      if (!userEmail) {
        console.warn(
          "⚠️ [DB-SERVICE] PersonalInfoService: No email found in auth session",
        );
      }

      // Ensure NOT NULL fields have fallback values
      const firstName = data.first_name || "";
      const lastName = data.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim() || "User";

      const profileData: Partial<ProfilesRow> = {
        id: userId,
        email: userEmail, // Required NOT NULL field
        first_name: firstName,
        last_name: lastName,
        name: fullName, // Computed full name with fallback
        age: data.age || 25, // NOT NULL - default to 25 if missing
        gender: data.gender || "prefer_not_to_say", // NOT NULL - safe default
        country: data.country ? normalizeCountryToISO(data.country) : data.country,
        state: data.state,
        region: data.region || null,
        wake_time: data.wake_time,
        sleep_time: data.sleep_time,
        occupation_type: data.occupation_type,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(profileData, {
        onConflict: "id",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error(
          "❌ [DB-SERVICE] PersonalInfoService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "❌ [DB-SERVICE] PersonalInfoService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<PersonalInfoData | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error(
          "❌ [DB-SERVICE] PersonalInfoService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        return null;
      }

      // VALIDATION: CRITICAL FIELDS - no fallbacks allowed
      if (!data.age || data.age === 0) {
        throw new Error("Age is required for accurate health calculations");
      }
      if (!data.gender || data.gender === "") {
        throw new Error(
          "Gender is required for accurate BMR and health calculations",
        );
      }

      const personalInfo: PersonalInfoData = {
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        name: data.name || "", // ✅ FIXED: Load the name field from database
        age: data.age, // NO FALLBACK - validation above ensures it exists
        gender: data.gender, // NO FALLBACK - validation above ensures it exists
        country: data.country || "",
        state: data.state || "",
        region: data.region === null ? undefined : data.region,
        wake_time: data.wake_time || "07:00",
        sleep_time: data.sleep_time || "23:00",
        occupation_type: data.occupation_type || "desk_job",
      };

      return personalInfo;
    } catch (error) {
      console.error(
        "❌ [DB-SERVICE] PersonalInfoService: Unexpected error:",
        error,
      );
      return null;
    }
  }

  static async delete(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) {
        console.error("❌ PersonalInfoService: Database error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ PersonalInfoService: Unexpected error:", error);
      return false;
    }
  }
}

// ============================================================================
// DIET PREFERENCES SERVICE
// ============================================================================

export class DietPreferencesService {
  static async save(
    userId: string,
    data: DietPreferencesData,
  ): Promise<boolean> {
    try {
      const dietData: Partial<DietPreferencesRow> = {
        user_id: userId,
        diet_type: data.diet_type ?? "omnivore", // NOT NULL - only default if truly missing
        allergies: data.allergies || [], // NOT NULL - default to empty array
        restrictions: data.restrictions || [], // NOT NULL - default to empty array

        // Diet readiness toggles
        keto_ready: data.keto_ready,
        intermittent_fasting_ready: data.intermittent_fasting_ready,
        paleo_ready: data.paleo_ready,
        mediterranean_ready: data.mediterranean_ready,
        low_carb_ready: data.low_carb_ready,
        high_protein_ready: data.high_protein_ready,

        // Meal preferences
        breakfast_enabled: data.breakfast_enabled,
        lunch_enabled: data.lunch_enabled,
        dinner_enabled: data.dinner_enabled,
        snacks_enabled: data.snacks_enabled,

        // Cooking preferences
        cooking_skill_level: data.cooking_skill_level,
        max_prep_time_minutes: data.max_prep_time_minutes,
        budget_level: data.budget_level,

        // Health habits (14 fields)
        drinks_enough_water: data.drinks_enough_water,
        limits_sugary_drinks: data.limits_sugary_drinks,
        eats_regular_meals: data.eats_regular_meals,
        avoids_late_night_eating: data.avoids_late_night_eating,
        controls_portion_sizes: data.controls_portion_sizes,
        reads_nutrition_labels: data.reads_nutrition_labels,
        eats_processed_foods: data.eats_processed_foods,
        eats_5_servings_fruits_veggies: data.eats_5_servings_fruits_veggies,
        limits_refined_sugar: data.limits_refined_sugar,
        includes_healthy_fats: data.includes_healthy_fats,
        drinks_alcohol: data.drinks_alcohol,
        smokes_tobacco: data.smokes_tobacco,
        drinks_coffee: data.drinks_coffee,
        takes_supplements: data.takes_supplements,

        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("diet_preferences")
        .upsert(dietData, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(
          "❌ [DB-SERVICE] DietPreferencesService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "❌ [DB-SERVICE] DietPreferencesService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<DietPreferencesData | null> {
    try {
      const { data, error } = await supabase
        .from("diet_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error(
          "❌ [DB-SERVICE] DietPreferencesService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        return null;
      }

      const dietPreferences: DietPreferencesData = {
        diet_type: data.diet_type ?? "omnivore",
        allergies: data.allergies || [],
        restrictions: data.restrictions || [],

        // Diet readiness
        keto_ready: data.keto_ready || false,
        intermittent_fasting_ready: data.intermittent_fasting_ready || false,
        paleo_ready: data.paleo_ready || false,
        mediterranean_ready: data.mediterranean_ready || false,
        low_carb_ready: data.low_carb_ready || false,
        high_protein_ready: data.high_protein_ready || false,

        // Meal preferences
        breakfast_enabled: data.breakfast_enabled ?? true,
        lunch_enabled: data.lunch_enabled ?? true,
        dinner_enabled: data.dinner_enabled ?? true,
        snacks_enabled: data.snacks_enabled ?? true,

        // Cooking preferences
        cooking_skill_level: data.cooking_skill_level || "beginner",
        max_prep_time_minutes: data.max_prep_time_minutes || 30,
        budget_level: data.budget_level || "medium",

        // Health habits
        drinks_enough_water: data.drinks_enough_water || false,
        limits_sugary_drinks: data.limits_sugary_drinks || false,
        eats_regular_meals: data.eats_regular_meals || false,
        avoids_late_night_eating: data.avoids_late_night_eating || false,
        controls_portion_sizes: data.controls_portion_sizes || false,
        reads_nutrition_labels: data.reads_nutrition_labels || false,
        eats_processed_foods: data.eats_processed_foods ?? true,
        eats_5_servings_fruits_veggies:
          data.eats_5_servings_fruits_veggies || false,
        limits_refined_sugar: data.limits_refined_sugar || false,
        includes_healthy_fats: data.includes_healthy_fats || false,
        drinks_alcohol: data.drinks_alcohol || false,
        smokes_tobacco: data.smokes_tobacco || false,
        drinks_coffee: data.drinks_coffee || false,
        takes_supplements: data.takes_supplements || false,
      };

      return dietPreferences;
    } catch (error) {
      console.error("❌ DietPreferencesService: Unexpected error:", error);
      return null;
    }
  }
}

// ============================================================================
// BODY ANALYSIS SERVICE
// ============================================================================

export class BodyAnalysisService {
  static async save(userId: string, data: BodyAnalysisData): Promise<boolean> {
    try {
      const resolvedCurrentWeight = await resolveCurrentWeightForUser(userId, {
        bodyAnalysisWeight: data.current_weight_kg,
      });
      const bodyData: Partial<BodyAnalysisRow> = {
        user_id: userId,

        // Basic measurements
        height_cm: data.height_cm,
        current_weight_kg: resolvedCurrentWeight.value,
        target_weight_kg: data.target_weight_kg,
        target_timeline_weeks: data.target_timeline_weeks,

        // Body composition
        body_fat_percentage: data.body_fat_percentage || null,
        waist_cm: data.waist_cm || null,
        hip_cm: data.hip_cm || null,
        chest_cm: data.chest_cm || null,

        // Photos
        front_photo_url: data.front_photo_url || null,
        side_photo_url: data.side_photo_url || null,
        back_photo_url: data.back_photo_url || null,

        // AI analysis
        ai_estimated_body_fat: data.ai_estimated_body_fat || null,
        ai_body_type: data.ai_body_type || null,
        ai_confidence_score: data.ai_confidence_score || null,

        // Medical information
        medical_conditions: data.medical_conditions || [],
        medications: data.medications || [],
        physical_limitations: data.physical_limitations || [],

        // Pregnancy/Breastfeeding
        pregnancy_status: data.pregnancy_status || false,
        pregnancy_trimester: data.pregnancy_trimester || null,
        breastfeeding_status: data.breastfeeding_status || false,

        // Stress Level
        stress_level: data.stress_level || null,

        // Calculated values
        // BUG-49: bmi/bmr were always null because useReviewValidation stores them in
        // calculatedData not bodyAnalysis. Compute BMI from measurements when not provided.
        bmi: data.bmi || (data.current_weight_kg && data.height_cm
          ? Math.round((data.current_weight_kg / Math.pow(data.height_cm / 100, 2)) * 10) / 10
          : null),
        bmr: data.bmr || null,
        ideal_weight_min: data.ideal_weight_min || null,
        ideal_weight_max: data.ideal_weight_max || null,
        waist_hip_ratio: data.waist_hip_ratio || null,

        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("body_analysis").upsert(bodyData, {
        onConflict: "user_id",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error(
          "❌ [DB-SERVICE] BodyAnalysisService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "❌ [DB-SERVICE] BodyAnalysisService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<BodyAnalysisData | null> {
    try {
      const { data, error } = await supabase
        .from("body_analysis")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error(
          "❌ [DB-SERVICE] BodyAnalysisService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        return null;
      }

      // VALIDATION: CRITICAL FIELDS - no fallbacks for weight/height
      if (!data.height_cm || data.height_cm === 0) {
        throw new Error("Height is required for BMI and health calculations");
      }
      if (!data.current_weight_kg || data.current_weight_kg === 0) {
        throw new Error(
          "Current weight is required for BMI, BMR, and TDEE calculations",
        );
      }

      const bodyAnalysis: BodyAnalysisData = {
        height_cm: data.height_cm, // NO FALLBACK - validation above ensures it exists
        current_weight_kg: data.current_weight_kg, // NO FALLBACK - validation above ensures it exists
        target_weight_kg: data.target_weight_kg != null ? data.target_weight_kg : undefined,
        target_timeline_weeks: data.target_timeline_weeks != null ? data.target_timeline_weeks : undefined,

        body_fat_percentage: data.body_fat_percentage || undefined,
        waist_cm: data.waist_cm || undefined,
        hip_cm: data.hip_cm || undefined,
        chest_cm: data.chest_cm || undefined,

        front_photo_url: data.front_photo_url || undefined,
        side_photo_url: data.side_photo_url || undefined,
        back_photo_url: data.back_photo_url || undefined,

        ai_estimated_body_fat: data.ai_estimated_body_fat || undefined,
        ai_body_type: data.ai_body_type || undefined,
        ai_confidence_score: data.ai_confidence_score || undefined,

        medical_conditions: data.medical_conditions || [],
        medications: data.medications || [],
        physical_limitations: data.physical_limitations || [],

        pregnancy_status: data.pregnancy_status || false,
        pregnancy_trimester: data.pregnancy_trimester || undefined,
        breastfeeding_status: data.breastfeeding_status || false,

        stress_level: data.stress_level || undefined,

        bmi: data.bmi || undefined,
        bmr: data.bmr || undefined,
        ideal_weight_min: data.ideal_weight_min || undefined,
        ideal_weight_max: data.ideal_weight_max || undefined,
        waist_hip_ratio: data.waist_hip_ratio || undefined,
      };

      return bodyAnalysis;
    } catch (error) {
      console.error("❌ BodyAnalysisService: Unexpected error:", error);
      return null;
    }
  }
}

// ============================================================================
// WORKOUT PREFERENCES SERVICE
// ============================================================================

export class WorkoutPreferencesService {
  static async save(
    userId: string,
    data: WorkoutPreferencesData,
  ): Promise<boolean> {
    try {
      const workoutData: Partial<WorkoutPreferencesRow> = {
        user_id: userId,
        location: data.location || "home", // NOT NULL - default to home
        equipment: data.equipment || ["bodyweight"], // NOT NULL - default to bodyweight
        time_preference: data.time_preference,
        intensity: data.intensity || "moderate", // NOT NULL - default to moderate
        workout_types: data.workout_types,
        primary_goals: data.primary_goals || ["general-fitness"], // NOT NULL - default goal
        activity_level: data.activity_level,
        workout_experience_years: data.workout_experience_years,
        workout_frequency_per_week: data.workout_frequency_per_week,
        can_do_pushups: data.can_do_pushups,
        can_run_minutes: data.can_run_minutes,
        flexibility_level: data.flexibility_level,
        weekly_weight_loss_goal: data.weekly_weight_loss_goal || null,
        preferred_workout_times: data.preferred_workout_times,
        enjoys_cardio: data.enjoys_cardio,
        enjoys_strength_training: data.enjoys_strength_training,
        enjoys_group_classes: data.enjoys_group_classes,
        prefers_outdoor_activities: data.prefers_outdoor_activities,
        needs_motivation: data.needs_motivation,
        prefers_variety: data.prefers_variety,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("workout_preferences")
        .upsert(workoutData, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(
          "❌ [DB-SERVICE] WorkoutPreferencesService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "❌ [DB-SERVICE] WorkoutPreferencesService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<WorkoutPreferencesData | null> {
    try {
      const { data, error } = await supabase
        .from("workout_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error(
          "❌ [DB-SERVICE] WorkoutPreferencesService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        return null;
      }

      const workoutPreferences: WorkoutPreferencesData = {
        location: data.location || "both",
        equipment: data.equipment || [],
        time_preference: data.time_preference || 30,
        intensity: data.intensity || "beginner",
        workout_types: data.workout_types || [],
        primary_goals: data.primary_goals || [],
        activity_level: data.activity_level || "sedentary",
        workout_experience_years: data.workout_experience_years || 0,
        workout_frequency_per_week: data.workout_frequency_per_week || 0,
        can_do_pushups: data.can_do_pushups || 0,
        can_run_minutes: data.can_run_minutes || 0,
        flexibility_level: data.flexibility_level || "fair",
        weekly_weight_loss_goal: data.weekly_weight_loss_goal || undefined,
        preferred_workout_times: data.preferred_workout_times || [],
        enjoys_cardio: data.enjoys_cardio ?? true,
        enjoys_strength_training: data.enjoys_strength_training ?? true,
        enjoys_group_classes: data.enjoys_group_classes ?? false,
        prefers_outdoor_activities: data.prefers_outdoor_activities ?? false,
        needs_motivation: data.needs_motivation ?? false,
        prefers_variety: data.prefers_variety ?? true,
      };

      return workoutPreferences;
    } catch (error) {
      console.error("❌ WorkoutPreferencesService: Unexpected error:", error);
      return null;
    }
  }
}

// ============================================================================
// ADVANCED REVIEW SERVICE
// ============================================================================

export class AdvancedReviewService {
  /**
   * Calculate and save advanced review using Universal Health System
   * Uses ValidationEngine (SSOT) for all calorie/macro values and master-engine for body comp.
   */
  static async calculateAndSave(
    userId: string,
    personalInfo: PersonalInfoData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
    dietPreferences: DietPreferencesData,
  ): Promise<AdvancedReviewData | null> {
    try {
      const { ValidationEngine } = await import("./validationEngine");
      const { HealthCalculationEngine } = await import(
        "../utils/healthCalculations/master-engine"
      );

      // Use ValidationEngine as SSOT for all calorie/macro values (mirrors useReviewValidation)
      const validationResult = ValidationEngine.validateUserPlan(
        personalInfo,
        dietPreferences,
        bodyAnalysis,
        workoutPreferences,
        { bypassDeficitLimit: true },
      );
      const m = validationResult.calculatedMetrics;

      // Use master-engine for non-metabolic fields (HR zones, body comp, scores, etc.)
      const extended = HealthCalculationEngine.calculateAllMetrics(
        personalInfo,
        dietPreferences,
        bodyAnalysis,
        workoutPreferences,
      );

      const advancedReviewData: AdvancedReviewData = {
        // Core metabolic — from ValidationEngine (SSOT)
        calculated_bmi: extended.calculated_bmi,
        calculated_bmr: m.bmr,
        calculated_tdee: m.tdee,
        metabolic_age: extended.metabolic_age,
        daily_calories: Math.round(m.targetCalories),
        daily_protein_g: m.protein,
        daily_carbs_g: m.carbs,
        daily_fat_g: m.fat,
        daily_water_ml: extended.daily_water_ml,

        // Body composition — from master-engine
        healthy_weight_min: extended.healthy_weight_min,
        healthy_weight_max: extended.healthy_weight_max,
        weekly_weight_loss_rate: m.weeklyRate,
        estimated_timeline_weeks: extended.estimated_timeline_weeks,
        ideal_body_fat_min: extended.ideal_body_fat_min,
        ideal_body_fat_max: extended.ideal_body_fat_max,
        lean_body_mass: extended.lean_body_mass,
        fat_mass: extended.fat_mass,

        // HR zones / fitness — from master-engine
        estimated_vo2_max: extended.estimated_vo2_max,
        target_hr_fat_burn_min: extended.target_hr_fat_burn_min,
        target_hr_fat_burn_max: extended.target_hr_fat_burn_max,
        target_hr_cardio_min: extended.target_hr_cardio_min,
        target_hr_cardio_max: extended.target_hr_cardio_max,
        target_hr_peak_min: extended.target_hr_peak_min,
        target_hr_peak_max: extended.target_hr_peak_max,
        recommended_workout_frequency: extended.recommended_workout_frequency,
        recommended_cardio_minutes: extended.recommended_cardio_minutes,
        recommended_strength_sessions: extended.recommended_strength_sessions,

        // Scores — from master-engine
        overall_health_score: extended.overall_health_score,
        diet_readiness_score: extended.diet_readiness_score,
        fitness_readiness_score: extended.fitness_readiness_score,
        goal_realistic_score: extended.goal_realistic_score,

        // Sleep — from master-engine
        recommended_sleep_hours: extended.recommended_sleep_hours,
        current_sleep_duration: extended.current_sleep_duration,
        sleep_efficiency_score: extended.sleep_efficiency_score,

        // Flags
        was_rate_capped: m.wasRateCapped,
      };

      const saved = await this.save(userId, advancedReviewData);
      if (!saved) {
        console.error("❌ [DB-SERVICE] Failed to save calculated metrics");
        return null;
      }

      return advancedReviewData;
    } catch (error) {
      console.error(
        "❌ [DB-SERVICE] AdvancedReviewService.calculateAndSave error:",
        error,
      );
      return null;
    }
  }

  static async save(
    userId: string,
    data: AdvancedReviewData,
  ): Promise<boolean> {
    try {
      // Explicitly pick only DB columns — UI-only fields (bmi_health_risk, heart_rate_zones, etc.)
      // must not be spread into the upsert (BUG-46)
      const reviewData: Partial<AdvancedReviewRow> = {
        user_id: userId,
        calculated_bmi: data.calculated_bmi,
        calculated_bmr: data.calculated_bmr,
        calculated_tdee: data.calculated_tdee,
        metabolic_age: data.metabolic_age,
        daily_calories: data.daily_calories,
        daily_protein_g: data.daily_protein_g,
        daily_carbs_g: data.daily_carbs_g,
        daily_fat_g: data.daily_fat_g,
        daily_water_ml: data.daily_water_ml,
        daily_fiber_g: data.daily_fiber_g,
        healthy_weight_min: data.healthy_weight_min,
        healthy_weight_max: data.healthy_weight_max,
        weekly_weight_loss_rate: data.weekly_weight_loss_rate,
        estimated_timeline_weeks: data.estimated_timeline_weeks,
        total_calorie_deficit: data.total_calorie_deficit,
        ideal_body_fat_min: data.ideal_body_fat_min,
        ideal_body_fat_max: data.ideal_body_fat_max,
        lean_body_mass: data.lean_body_mass,
        fat_mass: data.fat_mass,
        estimated_vo2_max: data.estimated_vo2_max,
        target_hr_fat_burn_min: data.target_hr_fat_burn_min,
        target_hr_fat_burn_max: data.target_hr_fat_burn_max,
        target_hr_cardio_min: data.target_hr_cardio_min,
        target_hr_cardio_max: data.target_hr_cardio_max,
        target_hr_peak_min: data.target_hr_peak_min,
        target_hr_peak_max: data.target_hr_peak_max,
        recommended_workout_frequency: data.recommended_workout_frequency,
        recommended_cardio_minutes: data.recommended_cardio_minutes,
        recommended_strength_sessions: data.recommended_strength_sessions,
        overall_health_score: data.overall_health_score,
        diet_readiness_score: data.diet_readiness_score,
        fitness_readiness_score: data.fitness_readiness_score,
        goal_realistic_score: data.goal_realistic_score,
        recommended_sleep_hours: data.recommended_sleep_hours,
        current_sleep_duration: data.current_sleep_duration,
        sleep_efficiency_score: data.sleep_efficiency_score,
        data_completeness_percentage: data.data_completeness_percentage,
        reliability_score: data.reliability_score,
        personalization_level: data.personalization_level,
        validation_status: data.validation_status,
        validation_errors: data.validation_errors,
        validation_warnings: data.validation_warnings,
        refeed_schedule: data.refeed_schedule,
        medical_adjustments: data.medical_adjustments,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("advanced_review")
        .upsert(reviewData, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(
          "❌ [DB-SERVICE] AdvancedReviewService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "❌ [DB-SERVICE] AdvancedReviewService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<AdvancedReviewData | null> {
    try {
      const { data, error } = await supabase
        .from("advanced_review")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error(
          "❌ [DB-SERVICE] AdvancedReviewService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        return null;
      }

      return data as AdvancedReviewData;
    } catch (error) {
      console.error("❌ AdvancedReviewService: Unexpected error:", error);
      return null;
    }
  }

  static validate(data: AdvancedReviewData | null): TabValidationResult {
    const hasCalculations = !!(
      data?.calculated_bmi ||
      data?.calculated_bmr ||
      data?.calculated_tdee
    );

    return {
      is_valid: true,
      errors: [],
      warnings: hasCalculations
        ? []
        : ["Calculations pending - will be performed automatically"],
      completion_percentage: hasCalculations ? 100 : 0,
    };
  }
}

// ============================================================================
// ONBOARDING PROGRESS SERVICE
// ============================================================================

export class OnboardingProgressService {
  static async save(
    userId: string,
    progress: OnboardingProgressData,
  ): Promise<boolean> {
    try {
      const progressData: Partial<OnboardingProgressRow> = {
        user_id: userId,
        current_tab: progress.current_tab,
        completed_tabs: progress.completed_tabs,
        tab_validation_status: progress.tab_validation_status,
        total_completion_percentage: progress.total_completion_percentage,
        last_updated: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("onboarding_progress")
        .upsert(progressData, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(
          "❌ [DB-SERVICE] OnboardingProgressService: Database error:",
          error,
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "❌ [DB-SERVICE] OnboardingProgressService: Unexpected error:",
        error,
      );
      return false;
    }
  }

  static async load(userId: string): Promise<OnboardingProgressData | null> {
    try {
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error(
          "❌ [DB-SERVICE] OnboardingProgressService: Database error:",
          error,
        );
        return null;
      }

      if (!data) {
        // Create initial progress record
        const initialProgress: OnboardingProgressData = {
          current_tab: 1,
          completed_tabs: [],
          tab_validation_status: {},
          total_completion_percentage: 0,
        };

        await this.save(userId, initialProgress);
        return initialProgress;
      }

      const progress: OnboardingProgressData = {
        current_tab: data.current_tab || 1,
        completed_tabs: data.completed_tabs || [],
        tab_validation_status: data.tab_validation_status || {},
        total_completion_percentage: data.total_completion_percentage || 0,
        started_at: data.started_at,
        completed_at: data.completed_at,
        last_updated: data.last_updated,
      };

      return progress;
    } catch (error) {
      console.error("❌ OnboardingProgressService: Unexpected error:", error);
      return null;
    }
  }

  static async markComplete(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("onboarding_progress")
        .update({
          completed_at: new Date().toISOString(),
          total_completion_percentage: 100,
          completed_tabs: [1, 2, 3, 4, 5],
          last_updated: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("❌ OnboardingProgressService: Database error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ OnboardingProgressService: Unexpected error:", error);
      return false;
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export class OnboardingUtils {
  static calculateSleepDuration(wakeTime: string, sleepTime: string): number {
    const [wakeHour, wakeMin] = wakeTime.split(":").map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(":").map(Number);

    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;

    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60; // Handle overnight sleep

    return duration / 60; // Return hours as decimal
  }

  static formatSleepDuration(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  }

  static isHealthySleepDuration(hours: number): boolean {
    return hours >= 7 && hours <= 9;
  }

  static validatePersonalInfo(
    data: PersonalInfoData | null,
  ): TabValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      return {
        is_valid: false,
        errors: [
          "First name is required",
          "Last name is required",
          "Valid age (13-120) is required",
          "Gender selection is required",
          "Country is required",
          "State is required",
          "Occupation type is required",
        ],
        warnings: [],
        completion_percentage: 0,
      };
    }

    // Required field validation
    if (!data.first_name?.trim()) errors.push("First name is required");
    if (!data.last_name?.trim()) errors.push("Last name is required");
    if (!data.age || data.age < 13 || data.age > 120)
      errors.push("Valid age (13-120) is required");
    if (!data.gender) errors.push("Gender selection is required");
    if (!data.country?.trim()) errors.push("Country is required");
    if (!data.state?.trim()) errors.push("State is required");
    if (!data.occupation_type) errors.push("Occupation type is required");
    if (!data.wake_time) errors.push("Wake time is required");
    if (!data.sleep_time) errors.push("Sleep time is required");

    // Sleep duration warnings
    if (data.wake_time && data.sleep_time) {
      const sleepHours = this.calculateSleepDuration(
        data.wake_time,
        data.sleep_time,
      );
      if (sleepHours < 6)
        warnings.push("Consider getting more sleep (7-9 hours recommended)");
      if (sleepHours > 10) warnings.push("Very long sleep duration detected");
    }

    // Calculate completion percentage
    const requiredFields = [
      "first_name",
      "last_name",
      "age",
      "gender",
      "country",
      "state",
      "occupation_type",
      "wake_time",
      "sleep_time",
    ];
    const completedFields = requiredFields.filter((field) => {
      const value = data[field as keyof PersonalInfoData];
      return (
        value !== null && value !== undefined && value !== "" && value !== 0
      );
    }).length;

    const completionPercentage = Math.round(
      (completedFields / requiredFields.length) * 100,
    );

    const result = {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };

    return result;
  }

  static validateDietPreferences(
    data: DietPreferencesData | null,
  ): TabValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      return {
        is_valid: false,
        errors: ["Diet preferences data is missing"],
        warnings: [],
        completion_percentage: 0,
      };
    }

    // Required fields
    if (!data.diet_type) errors.push("Diet type selection is required");

    // Meal preferences validation
    const enabledMeals = [
      data.breakfast_enabled,
      data.lunch_enabled,
      data.dinner_enabled,
      data.snacks_enabled,
    ].filter(Boolean).length;

    if (enabledMeals === 0) {
      errors.push("At least one meal type must be enabled");
    }

    // Health habit warnings
    if (!data.breakfast_enabled) {
      warnings.push("Skipping breakfast may affect metabolism");
    }
    if (data.smokes_tobacco) {
      warnings.push("Smoking can significantly impact fitness goals");
    }
    if (data.drinks_alcohol && !data.limits_refined_sugar) {
      warnings.push("Consider limiting alcohol and sugar for better results");
    }
    if (!data.drinks_enough_water) {
      warnings.push("Proper hydration (3-4L daily) is crucial for fitness");
    }
    if (data.eats_processed_foods && !data.eats_5_servings_fruits_veggies) {
      warnings.push(
        "Consider reducing processed foods and increasing fruits/vegetables",
      );
    }

    // Calculate completion percentage
    const requiredFields = ["diet_type"];
    const optionalFields = [
      "allergies",
      "restrictions",
      "cooking_skill_level",
      "max_prep_time_minutes",
      "budget_level",
      // Diet readiness (6 fields)
      "keto_ready",
      "intermittent_fasting_ready",
      "paleo_ready",
      "mediterranean_ready",
      "low_carb_ready",
      "high_protein_ready",
      // Meal preferences (4 fields)
      "breakfast_enabled",
      "lunch_enabled",
      "dinner_enabled",
      "snacks_enabled",
      // Health habits (14 fields)
      "drinks_enough_water",
      "limits_sugary_drinks",
      "eats_regular_meals",
      "avoids_late_night_eating",
      "controls_portion_sizes",
      "reads_nutrition_labels",
      "eats_processed_foods",
      "eats_5_servings_fruits_veggies",
      "limits_refined_sugar",
      "includes_healthy_fats",
      "drinks_alcohol",
      "smokes_tobacco",
      "drinks_coffee",
      "takes_supplements",
    ];

    // Required fields (70% weight)
    const completedRequired = requiredFields.filter((field) => {
      const value = data[field as keyof DietPreferencesData];
      return Array.isArray(value)
        ? value.length > 0
        : value !== null && value !== undefined;
    }).length;

    // Optional fields (30% weight)
    const completedOptional = optionalFields.filter((field) => {
      const value = data[field as keyof DietPreferencesData];
      return value !== null && value !== undefined;
    }).length;

    const completionPercentage = Math.round(
      (completedRequired / requiredFields.length) * 70 +
        (completedOptional / optionalFields.length) * 30,
    );

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };
  }

  static validateBodyAnalysis(
    data: BodyAnalysisData | null,
  ): TabValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      warnings.push(
        "Body analysis skipped - continuing with default recommendations",
      );
      return { is_valid: true, errors, warnings, completion_percentage: 0 };
    }

    // Minimum required: height and current weight (to calculate BMI)
    const hasMinimumData =
      (data.height_cm && data.height_cm > 0) ||
      (data.current_weight_kg && data.current_weight_kg > 0);

    if (!hasMinimumData) {
      warnings.push(
        "Body analysis skipped - continuing with default recommendations",
      );
      return { is_valid: true, errors, warnings, completion_percentage: 0 };
    }

    // Validate height if provided
    if (data.height_cm && (data.height_cm < 100 || data.height_cm > 250)) {
      errors.push("Valid height must be between 100-250 cm");
    }

    // Validate current weight if provided
    if (
      data.current_weight_kg &&
      (data.current_weight_kg < 30 || data.current_weight_kg > 300)
    ) {
      errors.push("Valid current weight must be between 30-300 kg");
    }

    // Target weight and timeline are optional - only validate if provided
    if (
      data.target_weight_kg != null && data.target_weight_kg !== 0 &&
      (data.target_weight_kg < 30 || data.target_weight_kg > 300)
    ) {
      warnings.push(
        "Target weight should be between 30-300 kg for accurate recommendations",
      );
    }

    if (
      data.target_timeline_weeks &&
      (data.target_timeline_weeks < 4 || data.target_timeline_weeks > 104)
    ) {
      warnings.push(
        "Timeline should be between 4-104 weeks for realistic goals",
      );
    }

    // Warnings for realistic goals
    if (
      data.current_weight_kg &&
      data.target_weight_kg &&
      data.target_timeline_weeks
    ) {
      const weightDifference = Math.abs(
        data.current_weight_kg - data.target_weight_kg,
      );
      const weeklyRate = weightDifference / data.target_timeline_weeks;

      if (weeklyRate > 1) {
        warnings.push(
          "Target weight loss rate may be too aggressive (>1kg/week)",
        );
      }
      if (weeklyRate > 0 && weeklyRate < 0.25) {
        warnings.push(
          "Very slow weight change rate - consider adjusting timeline",
        );
      }
    }

    // BMI warnings
    if (data.height_cm && data.current_weight_kg) {
      const bmi = data.current_weight_kg / Math.pow(data.height_cm / 100, 2);
      if (bmi < 18.5) warnings.push("Current BMI indicates underweight");
      if (bmi > 30)
        warnings.push(
          "Current BMI indicates obesity - consult healthcare provider",
        );
    }

    // Medical condition warnings
    if (data.medical_conditions && data.medical_conditions.length > 0) {
      warnings.push(
        "Please consult healthcare provider before starting new fitness program",
      );
    }

    // Calculate completion percentage
    const basicFields: (keyof BodyAnalysisData)[] = [
      "height_cm",
      "current_weight_kg",
    ];
    const completedBasic = basicFields.filter((field) => {
      const value = data[field];
      return value !== null && value !== undefined && value !== 0;
    }).length;

    const goalFields: (keyof BodyAnalysisData)[] = [
      "target_weight_kg",
      "target_timeline_weeks",
    ];
    const completedGoals = goalFields.filter((field) => {
      const value = data[field];
      return value !== null && value !== undefined && value !== 0;
    }).length;

    const optionalFields: (keyof BodyAnalysisData)[] = [
      "body_fat_percentage",
      "waist_cm",
      "hip_cm",
      "chest_cm",
      "front_photo_url",
      "medical_conditions",
    ];
    const completedOptional = optionalFields.filter((field) => {
      const value = data[field];
      return Array.isArray(value)
        ? value.length > 0
        : value !== null && value !== undefined && value !== 0;
    }).length;

    // Basic fields: 40%, Goal fields: 30%, Optional: 30%
    const completionPercentage = Math.round(
      (completedBasic / basicFields.length) * 40 +
        (completedGoals / goalFields.length) * 30 +
        (completedOptional / optionalFields.length) * 30,
    );

    const result = {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };

    return result;
  }

  static validateWorkoutPreferences(
    data: WorkoutPreferencesData | null,
  ): TabValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      return {
        is_valid: false,
        errors: ["Workout preferences data is missing"],
        warnings: [],
        completion_percentage: 0,
      };
    }

    // Required fields
    if (!data.location) errors.push("Workout location is required");
    if (!data.intensity) errors.push("Intensity level is required");
    if (!data.activity_level) errors.push("Activity level is required");
    // workout_types is now auto-generated, no longer required
    if (!data.primary_goals || data.primary_goals.length === 0) {
      errors.push("At least one fitness goal is required");
    }

    // Warnings
    if (data.workout_frequency_per_week === 0) {
      warnings.push("Consider exercising at least 1-2 times per week");
    }
    if (
      data.workout_frequency_per_week &&
      data.workout_frequency_per_week > 6
    ) {
      warnings.push("High workout frequency - ensure adequate rest days");
    }
    if (data.time_preference && data.time_preference < 15) {
      warnings.push(
        "Very short workout duration - consider 30+ minutes for better results",
      );
    }

    const requiredFields = [
      "location",
      "intensity",
      "activity_level",
      "primary_goals",
    ];
    const completedRequired = requiredFields.filter((field) => {
      const value = data[field as keyof WorkoutPreferencesData];
      return Array.isArray(value)
        ? value.length > 0
        : value !== null && value !== undefined;
    }).length;

    const optionalFields = [
      "equipment",
      "time_preference",
      "workout_experience_years",
      "workout_frequency_per_week",
      "can_do_pushups",
      "can_run_minutes",
      "flexibility_level",
      "preferred_workout_times",
      "enjoys_cardio",
      "enjoys_strength_training",
      "enjoys_group_classes",
      "prefers_outdoor_activities",
      "needs_motivation",
      "prefers_variety",
    ];
    const completedOptional = optionalFields.filter((field) => {
      const value = data[field as keyof WorkoutPreferencesData];
      return Array.isArray(value)
        ? value.length > 0
        : value !== null && value !== undefined;
    }).length;

    const completionPercentage = Math.round(
      (completedRequired / requiredFields.length) * 70 +
        (completedOptional / optionalFields.length) * 30,
    );

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      completion_percentage: completionPercentage,
    };
  }

  static validateAdvancedReview(
    data: AdvancedReviewData | null,
  ): TabValidationResult {
    // Advanced review is mostly calculated data, so validation is minimal
    const hasCalculations = !!(
      data?.calculated_bmi ||
      data?.calculated_bmr ||
      data?.calculated_tdee
    );

    return {
      is_valid: true, // Advanced review doesn't have strict validation requirements
      errors: [],
      warnings: hasCalculations
        ? []
        : ["Calculations pending - will be performed automatically"],
      completion_percentage: hasCalculations ? 100 : 0,
    };
  }
}

// ============================================================================
// EXPORT ALL SERVICES
// ============================================================================

// Note: All services are already exported with their class declarations above
// No need for duplicate export statements
