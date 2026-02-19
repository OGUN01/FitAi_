import { supabase } from "../supabase";
import { SyncOperation } from "./types";

export class SyncOperations {
  async executeOperation(operation: SyncOperation): Promise<void> {
    const { type, data, userId } = operation;

    switch (type) {
      case "personalInfo":
        await this.syncPersonalInfo(userId, data);
        break;
      case "dietPreferences":
        await this.syncDietPreferences(userId, data);
        break;
      case "bodyAnalysis":
        await this.syncBodyAnalysis(userId, data);
        break;
      case "workoutPreferences":
        await this.syncWorkoutPreferences(userId, data);
        break;
      case "advancedReview":
        await this.syncAdvancedReview(userId, data);
        break;
      default:
        throw new Error(`Unknown data type: ${type}`);
    }
  }

  async syncPersonalInfo(userId: string, data: any): Promise<void> {
    console.log("[SyncEngine] Syncing personal info to profiles table...");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || data.email || "";

    const firstName = data.first_name || data.firstName || "";
    const lastName = data.last_name || data.lastName || "";

    const derivedName =
      data.name ||
      `${firstName} ${lastName}`.trim() ||
      (userEmail ? userEmail.split("@")[0] : "") ||
      "User";

    const profileData = {
      id: userId,
      email: userEmail,
      name: derivedName,
      first_name: firstName,
      last_name: lastName,
      age: data.age || 25,
      gender: data.gender || "prefer_not_to_say",
      country: data.country || "US",
      state: data.state || "",
      region: data.region,
      wake_time: data.wake_time || data.wakeTime || "07:00",
      sleep_time: data.sleep_time || data.sleepTime || "23:00",
      occupation_type:
        data.occupation_type || data.occupationType || "desk_job",
      media_preference: data.media_preference || data.mediaPreference || null,
      data_usage_mode: data.data_usage_mode || data.dataUsageMode || null,
      units: data.units || "metric",
      notifications_enabled:
        data.notifications_enabled ?? data.notificationsEnabled,
      dark_mode: data.dark_mode ?? data.darkMode,
      detected_climate: data.detected_climate || data.detectedClimate || null,
      detected_ethnicity:
        data.detected_ethnicity || data.detectedEthnicity || null,
      ethnicity_confirmed:
        data.ethnicity_confirmed ?? data.ethnicityConfirmed ?? null,
      climate_confirmed:
        data.climate_confirmed ?? data.climateConfirmed ?? null,
      preferred_bmr_formula:
        data.preferred_bmr_formula || data.preferredBmrFormula || null,
      resting_heart_rate:
        data.resting_heart_rate ?? data.restingHeartRate ?? null,
      profile_picture: data.profile_picture || data.profilePicture || null,
      subscription_tier:
        data.subscription_tier || data.subscriptionTier || "free",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "id" });

    if (error) {
      console.error(
        "[SyncEngine] Failed to sync personal info:",
        error.message,
      );
      throw new Error(`Failed to sync personal info: ${error.message}`);
    }

    console.log("[SyncEngine] Personal info synced successfully");
  }

  async syncDietPreferences(userId: string, data: any): Promise<void> {
    console.log("[SyncEngine] Syncing diet preferences...");

    const dietPreferencesData = {
      user_id: userId,
      diet_type: data.diet_type || data.dietType || "omnivore",
      allergies: data.allergies || [],
      restrictions: data.restrictions || [],
      keto_ready: data.keto_ready ?? data.ketoReady,
      intermittent_fasting_ready:
        data.intermittent_fasting_ready ?? data.intermittentFastingReady,
      paleo_ready: data.paleo_ready ?? data.paleoReady,
      mediterranean_ready: data.mediterranean_ready ?? data.mediterraneanReady,
      low_carb_ready: data.low_carb_ready ?? data.lowCarbReady,
      high_protein_ready: data.high_protein_ready ?? data.highProteinReady,
      breakfast_enabled: data.breakfast_enabled ?? data.breakfastEnabled,
      lunch_enabled: data.lunch_enabled ?? data.lunchEnabled,
      dinner_enabled: data.dinner_enabled ?? data.dinnerEnabled,
      snacks_enabled: data.snacks_enabled ?? data.snacksEnabled,
      cooking_skill_level:
        data.cooking_skill_level || data.cookingSkillLevel || "beginner",
      max_prep_time_minutes:
        data.max_prep_time_minutes ?? data.maxPrepTimeMinutes ?? null,
      budget_level: data.budget_level || data.budgetLevel || "medium",
      drinks_enough_water: data.drinks_enough_water ?? data.drinksEnoughWater,
      limits_sugary_drinks:
        data.limits_sugary_drinks ?? data.limitsSugaryDrinks,
      eats_regular_meals: data.eats_regular_meals ?? data.eatsRegularMeals,
      avoids_late_night_eating:
        data.avoids_late_night_eating ?? data.avoidsLateNightEating,
      controls_portion_sizes:
        data.controls_portion_sizes ?? data.controlsPortionSizes,
      reads_nutrition_labels:
        data.reads_nutrition_labels ?? data.readsNutritionLabels,
      eats_processed_foods:
        data.eats_processed_foods ?? data.eatsProcessedFoods,
      eats_5_servings_fruits_veggies:
        data.eats_5_servings_fruits_veggies ?? data.eats5ServingsFruitsVeggies,
      limits_refined_sugar:
        data.limits_refined_sugar ?? data.limitsRefinedSugar,
      includes_healthy_fats:
        data.includes_healthy_fats ?? data.includesHealthyFats,
      drinks_alcohol: data.drinks_alcohol ?? data.drinksAlcohol,
      smokes_tobacco: data.smokes_tobacco ?? data.smokesTobacco,
      drinks_coffee: data.drinks_coffee ?? data.drinksCoffee,
      takes_supplements: data.takes_supplements ?? data.takesSupplements,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("diet_preferences")
      .upsert(dietPreferencesData, { onConflict: "user_id" });

    if (error) {
      console.error(
        "[SyncEngine] Failed to sync diet preferences:",
        error.message,
      );
      throw new Error(`Failed to sync diet preferences: ${error.message}`);
    }

    console.log("[SyncEngine] Diet preferences synced successfully");
  }

  async syncBodyAnalysis(userId: string, data: any): Promise<void> {
    console.log("[SyncEngine] Syncing body analysis...");

    const bodyAnalysisData = {
      user_id: userId,
      height_cm: data.height_cm ?? data.heightCm,
      current_weight_kg: data.current_weight_kg ?? data.currentWeightKg,
      target_weight_kg: data.target_weight_kg ?? data.targetWeightKg ?? null,
      target_timeline_weeks:
        data.target_timeline_weeks ?? data.targetTimelineWeeks ?? null,
      body_fat_percentage:
        data.body_fat_percentage ?? data.bodyFatPercentage ?? null,
      body_fat_source: data.body_fat_source ?? data.bodyFatSource ?? null,
      body_fat_measured_at:
        data.body_fat_measured_at ?? data.bodyFatMeasuredAt ?? null,
      waist_cm: data.waist_cm ?? data.waistCm ?? null,
      hip_cm: data.hip_cm ?? data.hipCm ?? null,
      chest_cm: data.chest_cm ?? data.chestCm ?? null,
      waist_hip_ratio: data.waist_hip_ratio ?? data.waistHipRatio ?? null,
      bmi: data.bmi ?? null,
      bmr: data.bmr ?? null,
      ideal_weight_min: data.ideal_weight_min ?? data.idealWeightMin ?? null,
      ideal_weight_max: data.ideal_weight_max ?? data.idealWeightMax ?? null,
      photos: data.photos ?? null,
      front_photo_url: data.front_photo_url ?? data.frontPhotoUrl ?? null,
      side_photo_url: data.side_photo_url ?? data.sidePhotoUrl ?? null,
      back_photo_url: data.back_photo_url || data.backPhotoUrl || null,
      analysis: data.analysis || null,
      ai_estimated_body_fat:
        data.ai_estimated_body_fat || data.aiEstimatedBodyFat || null,
      ai_body_type: data.ai_body_type || data.aiBodyType || null,
      ai_confidence_score:
        data.ai_confidence_score || data.aiConfidenceScore || null,
      medical_conditions:
        data.medical_conditions || data.medicalConditions || [],
      medications: data.medications || null,
      physical_limitations:
        data.physical_limitations || data.physicalLimitations || null,
      pregnancy_status: data.pregnancy_status ?? data.pregnancyStatus,
      pregnancy_trimester:
        data.pregnancy_trimester || data.pregnancyTrimester || null,
      breastfeeding_status:
        data.breastfeeding_status ?? data.breastfeedingStatus,
      stress_level: data.stress_level || data.stressLevel || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("body_analysis")
      .upsert(bodyAnalysisData, { onConflict: "user_id" });

    if (error) {
      console.error(
        "[SyncEngine] Failed to sync body analysis:",
        error.message,
      );
      throw new Error(`Failed to sync body analysis: ${error.message}`);
    }

    console.log("[SyncEngine] Body analysis synced successfully");
  }

  async syncWorkoutPreferences(userId: string, data: any): Promise<void> {
    console.log("[SyncEngine] Syncing workout preferences...");

    if (!data.location || !data.intensity || !data.activity_level) {
      console.warn(
        "[SyncEngine] Missing required workout preferences - using DB defaults",
      );
    }

    const workoutPreferencesData = {
      user_id: userId,
      location: data.location ?? "home",
      equipment: data.equipment ?? ["bodyweight"],
      time_preference: data.time_preference ?? data.timePreference,
      intensity: data.intensity ?? "moderate",
      workout_types: data.workout_types ?? data.workoutTypes,
      primary_goals: data.primary_goals ?? data.primaryGoals,
      activity_level: data.activity_level ?? data.activityLevel,
      workout_experience_years:
        data.workout_experience_years ?? data.workoutExperienceYears,
      workout_frequency_per_week:
        data.workout_frequency_per_week ?? data.workoutFrequencyPerWeek,
      can_do_pushups: data.can_do_pushups ?? data.canDoPushups,
      can_run_minutes: data.can_run_minutes ?? data.canRunMinutes,
      flexibility_level: data.flexibility_level ?? data.flexibilityLevel,
      weekly_weight_loss_goal:
        data.weekly_weight_loss_goal ?? data.weeklyWeightLossGoal ?? null,
      preferred_workout_times:
        data.preferred_workout_times || data.preferredWorkoutTimes || [],
      enjoys_cardio: data.enjoys_cardio ?? data.enjoysCardio,
      enjoys_strength_training:
        data.enjoys_strength_training ?? data.enjoysStrengthTraining,
      enjoys_group_classes:
        data.enjoys_group_classes ?? data.enjoysGroupClasses,
      prefers_outdoor_activities:
        data.prefers_outdoor_activities ?? data.prefersOutdoorActivities,
      needs_motivation: data.needs_motivation ?? data.needsMotivation,
      prefers_variety: data.prefers_variety ?? data.prefersVariety,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("workout_preferences")
      .upsert(workoutPreferencesData, { onConflict: "user_id" });

    if (error) {
      console.error(
        "[SyncEngine] Failed to sync workout preferences:",
        error.message,
      );
      throw new Error(`Failed to sync workout preferences: ${error.message}`);
    }

    console.log("[SyncEngine] Workout preferences synced successfully");
  }

  async syncAdvancedReview(userId: string, data: any): Promise<void> {
    console.log("[SyncEngine] Syncing advanced review...");

    const advancedReviewData = {
      user_id: userId,
      calculated_bmi: data.calculated_bmi || data.calculatedBmi || null,
      calculated_bmr: data.calculated_bmr || data.calculatedBmr || null,
      calculated_tdee: data.calculated_tdee || data.calculatedTdee || null,
      metabolic_age: data.metabolic_age || data.metabolicAge || null,
      daily_calories: data.daily_calories || data.dailyCalories || null,
      daily_protein_g: data.daily_protein_g || data.dailyProteinG || null,
      daily_carbs_g: data.daily_carbs_g || data.dailyCarbsG || null,
      daily_fat_g: data.daily_fat_g || data.dailyFatG || null,
      daily_water_ml: data.daily_water_ml || data.dailyWaterMl || null,
      daily_fiber_g: data.daily_fiber_g || data.dailyFiberG || null,
      healthy_weight_min:
        data.healthy_weight_min || data.healthyWeightMin || null,
      healthy_weight_max:
        data.healthy_weight_max || data.healthyWeightMax || null,
      weekly_weight_loss_rate:
        data.weekly_weight_loss_rate || data.weeklyWeightLossRate || null,
      estimated_timeline_weeks:
        data.estimated_timeline_weeks || data.estimatedTimelineWeeks || null,
      total_calorie_deficit:
        data.total_calorie_deficit || data.totalCalorieDeficit || null,
      ideal_body_fat_min:
        data.ideal_body_fat_min || data.idealBodyFatMin || null,
      ideal_body_fat_max:
        data.ideal_body_fat_max || data.idealBodyFatMax || null,
      lean_body_mass: data.lean_body_mass || data.leanBodyMass || null,
      fat_mass: data.fat_mass || data.fatMass || null,
      estimated_vo2_max: data.estimated_vo2_max || data.estimatedVo2Max || null,
      vo2_max_estimate: data.vo2_max_estimate || data.vo2MaxEstimate || null,
      vo2_max_classification:
        data.vo2_max_classification || data.vo2MaxClassification || null,
      heart_rate_zones: data.heart_rate_zones || data.heartRateZones || null,
      target_hr_fat_burn_min:
        data.target_hr_fat_burn_min || data.targetHrFatBurnMin || null,
      target_hr_fat_burn_max:
        data.target_hr_fat_burn_max || data.targetHrFatBurnMax || null,
      target_hr_cardio_min:
        data.target_hr_cardio_min || data.targetHrCardioMin || null,
      target_hr_cardio_max:
        data.target_hr_cardio_max || data.targetHrCardioMax || null,
      target_hr_peak_min:
        data.target_hr_peak_min || data.targetHrPeakMin || null,
      target_hr_peak_max:
        data.target_hr_peak_max || data.targetHrPeakMax || null,
      recommended_workout_frequency:
        data.recommended_workout_frequency ||
        data.recommendedWorkoutFrequency ||
        null,
      recommended_cardio_minutes:
        data.recommended_cardio_minutes ||
        data.recommendedCardioMinutes ||
        null,
      recommended_strength_sessions:
        data.recommended_strength_sessions ||
        data.recommendedStrengthSessions ||
        null,
      overall_health_score:
        data.overall_health_score || data.overallHealthScore || null,
      health_score: data.health_score || data.healthScore || null,
      health_grade: data.health_grade || data.healthGrade || null,
      diet_readiness_score:
        data.diet_readiness_score || data.dietReadinessScore || null,
      fitness_readiness_score:
        data.fitness_readiness_score || data.fitnessReadinessScore || null,
      goal_realistic_score:
        data.goal_realistic_score || data.goalRealisticScore || null,
      recommended_sleep_hours:
        data.recommended_sleep_hours || data.recommendedSleepHours || null,
      current_sleep_duration:
        data.current_sleep_duration || data.currentSleepDuration || null,
      sleep_efficiency_score:
        data.sleep_efficiency_score || data.sleepEfficiencyScore || null,
      data_completeness_percentage:
        data.data_completeness_percentage ||
        data.dataCompletenessPercentage ||
        null,
      reliability_score:
        data.reliability_score || data.reliabilityScore || null,
      personalization_level:
        data.personalization_level || data.personalizationLevel || null,
      validation_status:
        data.validation_status || data.validationStatus || null,
      validation_errors:
        data.validation_errors || data.validationErrors || null,
      validation_warnings:
        data.validation_warnings || data.validationWarnings || null,
      bmi_category: data.bmi_category || data.bmiCategory || null,
      bmi_health_risk: data.bmi_health_risk || data.bmiHealthRisk || null,
      bmi_cutoffs_used: data.bmi_cutoffs_used || data.bmiCutoffsUsed || null,
      refeed_schedule: data.refeed_schedule || data.refeedSchedule || null,
      medical_adjustments:
        data.medical_adjustments || data.medicalAdjustments || null,
      bmr_formula_used: data.bmr_formula_used || data.bmrFormulaUsed || null,
      bmr_formula_accuracy:
        data.bmr_formula_accuracy || data.bmrFormulaAccuracy || null,
      bmr_formula_confidence:
        data.bmr_formula_confidence || data.bmrFormulaConfidence || null,
      climate_used: data.climate_used || data.climateUsed || null,
      detected_climate: data.detected_climate || data.detectedClimate || null,
      climate_tdee_modifier:
        data.climate_tdee_modifier || data.climateTdeeModifier || null,
      climate_water_modifier:
        data.climate_water_modifier || data.climateWaterModifier || null,
      ethnicity_used: data.ethnicity_used || data.ethnicityUsed || null,
      detected_ethnicity:
        data.detected_ethnicity || data.detectedEthnicity || null,
      calculations_version:
        data.calculations_version || data.calculationsVersion || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("advanced_review")
      .upsert(advancedReviewData, { onConflict: "user_id" });

    if (error) {
      console.error(
        "[SyncEngine] Failed to sync advanced review:",
        error.message,
      );
      throw new Error(`Failed to sync advanced review: ${error.message}`);
    }

    console.log("[SyncEngine] Advanced review synced successfully");
  }
}
