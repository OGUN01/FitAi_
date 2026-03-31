import { CalculatedMetrics } from "./types";
import {
  AdvancedReviewData,
  BodyAnalysisData,
  PersonalInfoData,
  WorkoutPreferencesData,
  DietPreferencesData,
} from "../../types/onboarding";
import { waterCalculator } from "../../utils/healthCalculations/calculators/waterCalculator";
import type { ActivityLevel, ClimateType } from "../../utils/healthCalculations/types";

export function mapToCalculatedMetrics(
  advancedReview: AdvancedReviewData | null,
  bodyAnalysis: BodyAnalysisData | null,
  personalInfo: PersonalInfoData | null,
  workoutPreferences: WorkoutPreferencesData | null,
  dietPreferences: DietPreferencesData | null,
): CalculatedMetrics {
  const calculateMealsPerDay = (): number | null => {
    if (!dietPreferences) return null;
    let count = 0;
    if (dietPreferences.breakfast_enabled) count++;
    if (dietPreferences.lunch_enabled) count++;
    if (dietPreferences.dinner_enabled) count++;
    if (dietPreferences.snacks_enabled) count++;
    return count > 0 ? count : null;
  };

  let heartRateZones: CalculatedMetrics["heartRateZones"] = null;
  if (
    advancedReview?.target_hr_fat_burn_min &&
    advancedReview?.target_hr_fat_burn_max
  ) {
    heartRateZones = {
      fatBurn: {
        min: advancedReview.target_hr_fat_burn_min,
        max: advancedReview.target_hr_fat_burn_max,
      },
      cardio: {
        min: advancedReview.target_hr_cardio_min || 0,
        max: advancedReview.target_hr_cardio_max || 0,
      },
      peak: {
        min: advancedReview.target_hr_peak_min || 0,
        max: advancedReview.target_hr_peak_max || 0,
      },
    };
  }

  const hrZonesFromJson = (advancedReview as any)?.heart_rate_zones;
  if (hrZonesFromJson && typeof hrZonesFromJson === "object") {
    heartRateZones = {
      fatBurn: {
        min: hrZonesFromJson.fatBurn?.min ?? hrZonesFromJson.fat_burn?.min,
        max: hrZonesFromJson.fatBurn?.max ?? hrZonesFromJson.fat_burn?.max,
      },
      cardio: {
        min: hrZonesFromJson.cardio?.min,
        max: hrZonesFromJson.cardio?.max,
      },
      peak: {
        min: hrZonesFromJson.peak?.min,
        max: hrZonesFromJson.peak?.max,
      },
    };
  }

  return {
    dailyCalories: advancedReview?.daily_calories ?? null,
    dailyProteinG: advancedReview?.daily_protein_g ?? null,
    dailyCarbsG: advancedReview?.daily_carbs_g ?? null,
    dailyFatG: advancedReview?.daily_fat_g ?? null,
    dailyWaterML: (() => {
      const weight = bodyAnalysis?.current_weight_kg;
      const activity = (workoutPreferences?.activity_level ?? "sedentary") as ActivityLevel;
      const climate = ((advancedReview as any)?.detected_climate ?? "temperate") as ClimateType;
      if (weight && weight > 0) {
        return waterCalculator.calculate(weight, activity, climate);
      }
      return advancedReview?.daily_water_ml ?? null;
    })(),
    dailyFiberG: advancedReview?.daily_fiber_g ?? null,

    calculatedBMI: advancedReview?.calculated_bmi ?? null,
    calculatedBMR: advancedReview?.calculated_bmr ?? null,
    calculatedTDEE: advancedReview?.calculated_tdee ?? null,
    metabolicAge: advancedReview?.metabolic_age ?? null,

    bmiCategory: (advancedReview as any)?.bmi_category ?? null,
    bmiHealthRisk: (advancedReview as any)?.bmi_health_risk ?? null,

    detectedClimate: (advancedReview as any)?.detected_climate ?? null,
    detectedEthnicity: (advancedReview as any)?.detected_ethnicity ?? null,
    bmrFormulaUsed: (advancedReview as any)?.bmr_formula_used ?? null,

    currentWeightKg: bodyAnalysis?.current_weight_kg ?? null,
    targetWeightKg: bodyAnalysis?.target_weight_kg ?? null,
    healthyWeightMin: advancedReview?.healthy_weight_min ?? null,
    healthyWeightMax: advancedReview?.healthy_weight_max ?? null,
    weeklyWeightLossRate: advancedReview?.weekly_weight_loss_rate ?? null,
    estimatedTimelineWeeks: advancedReview?.estimated_timeline_weeks ?? null,

    heightCm: bodyAnalysis?.height_cm ?? null,
    bodyFatPercentage: bodyAnalysis?.body_fat_percentage ?? null,
    idealWeightMin: bodyAnalysis?.ideal_weight_min ?? null,
    idealWeightMax: bodyAnalysis?.ideal_weight_max ?? null,
    ideal_body_fat_max: advancedReview?.ideal_body_fat_max ?? null,

    age: personalInfo?.age ?? null,
    gender: personalInfo?.gender ?? null,
    country: personalInfo?.country ?? null,
    state: personalInfo?.state ?? null,

    activityLevel: workoutPreferences?.activity_level ?? null,
    primaryGoals: workoutPreferences?.primary_goals ?? null,

    workoutDurationMinutes: workoutPreferences?.time_preference ?? null,
    workoutFrequencyPerWeek:
      workoutPreferences?.workout_frequency_per_week ?? null,

    recommendedCardioMinutes:
      advancedReview?.recommended_cardio_minutes ?? null,
    mealsPerDay: calculateMealsPerDay(),

    healthScore:
      (advancedReview as any)?.health_score ??
      advancedReview?.overall_health_score,
    healthGrade: (advancedReview as any)?.health_grade ?? null,
    fitnessReadinessScore: advancedReview?.fitness_readiness_score ?? null,
    dietReadinessScore: advancedReview?.diet_readiness_score ?? null,

    heartRateZones,

    vo2MaxEstimate:
      (advancedReview as any)?.vo2_max_estimate ??
      advancedReview?.estimated_vo2_max,
    vo2MaxClassification:
      (advancedReview as any)?.vo2_max_classification ?? null,
  };
}
