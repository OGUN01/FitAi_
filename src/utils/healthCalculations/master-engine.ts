import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../types/onboarding";
import { MetabolicCalculations } from "./metabolic";
import { NutritionalCalculations, resolveDietType } from "./nutritional";
import { BodyCompositionCalculations } from "./body-composition";
import { CardiovascularCalculations } from "./cardiovascular";
import { FitnessRecommendations } from "./fitness-recommendations";
import { HealthScoring } from "./health-scoring";
import { SleepAnalysis } from "./sleep-analysis";
import { getBMICategoryWithRisk } from "./core/bmiCalculation";
import { CALORIE_PER_KG } from "../../services/validation/constants";
import type { Goal } from "./types";
import { mapActivityLevelForHealthCalc } from "../typeTransformers";
import { detectEthnicity } from "./autoDetection";


export class HealthCalculationEngine {
  static calculateAllMetrics(
    personalInfo: PersonalInfoData,
    dietPreferences: DietPreferencesData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
  ): AdvancedReviewData {
    const weightKg = bodyAnalysis.current_weight_kg;
    const heightCm = bodyAnalysis.height_cm;

    if (weightKg < 30 || weightKg > 300) {
      throw new Error(
        `[HealthCalculationEngine] Invalid weight: ${weightKg}kg. Must be 30–300kg.`,
      );
    }
    if (heightCm < 100 || heightCm > 250) {
      throw new Error(
        `[HealthCalculationEngine] Invalid height: ${heightCm}cm. Must be 100–250cm.`,
      );
    }

    const primaryGoal = workoutPreferences.primary_goals[0] as Goal;
    if (!primaryGoal) {
      throw new Error(
        '[HealthCalculationEngine] primary_goals is empty — cannot calculate macros without a fitness goal.',
      );
    }
    const bmi = MetabolicCalculations.calculateBMI(
      weightKg,
      heightCm,
    );
    const bmr = MetabolicCalculations.calculateBMR(
      weightKg,
      heightCm,
      personalInfo.age,
      personalInfo.gender,
    );
    const tdee = MetabolicCalculations.calculateTDEE(
      bmr,
      mapActivityLevelForHealthCalc(workoutPreferences.activity_level),
    );
    const metabolicAge = MetabolicCalculations.calculateMetabolicAge(
      bmr,
      personalInfo.age,
      personalInfo.gender,
    );

    const idealWeightRange =
      BodyCompositionCalculations.calculateIdealWeightRange(
        heightCm,
        personalInfo.gender,
        personalInfo.age,
      );
    const weeklyWeightLossRate =
      BodyCompositionCalculations.calculateHealthyWeightLossRate(
        weightKg,
        personalInfo.gender,
      );
    const targetWeightKg = bodyAnalysis.target_weight_kg > 0
      ? bodyAnalysis.target_weight_kg
      : weightKg; // If no target set, assume maintenance
    const isWeightLoss = weightKg > targetWeightKg;
    // BUG-79: cap the rate to 20% of TDEE-derived weekly loss before passing to calorie calculator
    const requestedRate = workoutPreferences.weekly_weight_loss_goal || weeklyWeightLossRate;
    const maxSafeRate = (tdee * 0.20) / 1100; // 20% deficit → max kg/week
    const cappedRate = Math.min(requestedRate, Math.max(maxSafeRate, weeklyWeightLossRate));
    const dailyCalories = NutritionalCalculations.calculateDailyCaloriesForGoal(
      tdee,
      cappedRate,
      isWeightLoss,
      personalInfo.gender,
    );

    const macros = NutritionalCalculations.calculateMacronutrients(
      dailyCalories,
      weightKg,
      primaryGoal,
      resolveDietType(dietPreferences),
      bodyAnalysis.body_fat_percentage,
      bodyAnalysis.target_weight_kg,
    );
    const dailyWater = MetabolicCalculations.calculateWaterIntake(
      weightKg,
    );
    const dailyFiber = MetabolicCalculations.calculateFiber(dailyCalories);

    const bodyFatRange = BodyCompositionCalculations.getHealthyBodyFatRange(
      personalInfo.age,
      personalInfo.gender,
    );
    const bodyComposition = bodyAnalysis.body_fat_percentage
      ? BodyCompositionCalculations.calculateBodyComposition(
          weightKg,
          bodyAnalysis.body_fat_percentage,
        )
      : { leanMass: 0, fatMass: 0 };

    const maxHeartRate = CardiovascularCalculations.calculateMaxHeartRate(
      personalInfo.age,
    );
    const heartRateZones =
      CardiovascularCalculations.calculateHeartRateZones(maxHeartRate);
    const estimatedVO2Max = CardiovascularCalculations.estimateVO2Max(
      workoutPreferences.can_run_minutes,
      personalInfo.age,
      personalInfo.gender,
    );

    const recommendedWorkoutFrequency =
      FitnessRecommendations.calculateWorkoutFrequency(
        workoutPreferences.primary_goals,
        workoutPreferences.workout_experience_years,
        workoutPreferences.workout_frequency_per_week,
      );
    const recommendedCardioMinutes =
      FitnessRecommendations.calculateCardioMinutes(
        workoutPreferences.primary_goals,
        workoutPreferences.intensity,
      );
    const recommendedStrengthSessions =
      FitnessRecommendations.calculateStrengthSessions(
        workoutPreferences.primary_goals,
        workoutPreferences.workout_experience_years,
      );

    const overallHealthScore = HealthScoring.calculateOverallHealthScore(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences,
    );
    const dietReadinessScore =
      MetabolicCalculations.calculateDietReadinessScore(dietPreferences);
    const fitnessReadinessScore = HealthScoring.calculateFitnessReadinessScore(
      workoutPreferences,
      bodyAnalysis,
    );
    const goalRealisticScore = HealthScoring.calculateGoalRealisticScore(
      bodyAnalysis,
      workoutPreferences,
    );

    const recommendedSleepHours = SleepAnalysis.getRecommendedSleepHours(
      personalInfo.age,
    );
    const currentSleepDuration = SleepAnalysis.calculateSleepDuration(
      personalInfo.wake_time,
      personalInfo.sleep_time,
    );
    const sleepEfficiencyScore = SleepAnalysis.calculateSleepEfficiencyScore(
      currentSleepDuration,
      recommendedSleepHours,
      dietPreferences,
    );

    const estimatedTimelineWeeks = bodyAnalysis.target_timeline_weeks;
    const totalCalorieDeficit = Math.round(weeklyWeightLossRate * CALORIE_PER_KG);

    // Derived classification fields (H17)
    const bmiClassification = getBMICategoryWithRisk(bmi);
    const vo2MaxClassification = CardiovascularCalculations.classifyVO2Max(
      estimatedVO2Max,
      personalInfo.gender,
    );
    // H17: Ethnicity detection from country (used for BMI risk thresholds per WHO guidelines)
    const ethnicityResult = detectEthnicity(personalInfo.country, personalInfo.state);

    // ── Quality / Completeness scores ──────────────────────────────────────
    // data_completeness_percentage: fraction of optional precision fields provided.
    // Optional fields that improve calculation accuracy:
    const optionalPrecisionFields = [
      bodyAnalysis.body_fat_percentage != null,              // body composition path
      (bodyAnalysis.photos && Object.keys(bodyAnalysis.photos).length > 0), // AI photo analysis
      bodyAnalysis.stress_level != null,                     // conservative deficit adjustment
      bodyAnalysis.medical_conditions && bodyAnalysis.medical_conditions.length > 0, // safety guards
      workoutPreferences.workout_experience_years > 0,       // volume recommendations
      workoutPreferences.can_run_minutes > 0,                // VO2 max calculation
      personalInfo.country?.length > 0,                      // ethnicity-aware BMI thresholds
      dietPreferences.cooking_methods && dietPreferences.cooking_methods.length > 0, // recipe filtering
    ];
    const providedCount = optionalPrecisionFields.filter(Boolean).length;
    const dataCompletenessPercentage = Math.round(
      // 40 base (required fields always present) + up to 60 from optional fields
      40 + (providedCount / optionalPrecisionFields.length) * 60
    );

    // reliability_score: how confident are the metabolic calculations.
    // Penalised when key inputs are estimated rather than measured.
    let reliabilityScore = 100;
    if (!bodyAnalysis.body_fat_percentage) reliabilityScore -= 15; // BMR uses population formula, not lean mass
    if (!workoutPreferences.can_run_minutes || workoutPreferences.can_run_minutes === 0) reliabilityScore -= 10; // VO2 max is an estimate
    if (!bodyAnalysis.stress_level) reliabilityScore -= 5;  // stress correction not applied
    if (bodyAnalysis.medical_conditions && bodyAnalysis.medical_conditions.length > 0 && !bodyAnalysis.body_fat_percentage) reliabilityScore -= 10;
    reliabilityScore = Math.max(50, reliabilityScore); // floor at 50 — always somewhat reliable

    // personalization_level: how tailored the output is to this specific user.
    // Combines completeness + goal specificity + preference richness.
    const hasSpecificGoal = workoutPreferences.primary_goals && workoutPreferences.primary_goals.length > 0;
    const hasDietPreferences = dietPreferences.diet_type && dietPreferences.diet_type !== "balanced";
    const hasHealthHabits = dietPreferences.health_habits_grouped != null;
    const hasLocationData = !!(personalInfo.country && personalInfo.state);
    const personalizationBonus = [hasSpecificGoal, hasDietPreferences, hasHealthHabits, hasLocationData]
      .filter(Boolean).length * 5;
    const personalizationLevel = Math.min(100, Math.round(dataCompletenessPercentage * 0.7 + reliabilityScore * 0.2 + personalizationBonus));

    return {
      calculated_bmi: Math.round(bmi * 100) / 100,
      calculated_bmr: Math.round(bmr),
      calculated_tdee: Math.round(tdee),
      metabolic_age: Math.round(metabolicAge),

      daily_calories: Math.round(dailyCalories),
      daily_protein_g: macros.protein,
      daily_carbs_g: macros.carbs,
      daily_fat_g: macros.fat,
      daily_water_ml: Math.round(dailyWater),
      daily_fiber_g: dailyFiber,

      healthy_weight_min: idealWeightRange.min,
      healthy_weight_max: idealWeightRange.max,
      weekly_weight_loss_rate: weeklyWeightLossRate,
      estimated_timeline_weeks: estimatedTimelineWeeks,
      total_calorie_deficit: totalCalorieDeficit,

      ideal_body_fat_min: bodyFatRange.min,
      ideal_body_fat_max: bodyFatRange.max,
      lean_body_mass: bodyComposition.leanMass,
      fat_mass: bodyComposition.fatMass,

      estimated_vo2_max: Math.round(estimatedVO2Max * 10) / 10,
      target_hr_fat_burn_min: heartRateZones.fatBurn.min,
      target_hr_fat_burn_max: heartRateZones.fatBurn.max,
      target_hr_cardio_min: heartRateZones.cardio.min,
      target_hr_cardio_max: heartRateZones.cardio.max,
      target_hr_peak_min: heartRateZones.peak.min,
      target_hr_peak_max: heartRateZones.peak.max,
      recommended_workout_frequency: recommendedWorkoutFrequency,
      recommended_cardio_minutes: recommendedCardioMinutes,
      recommended_strength_sessions: recommendedStrengthSessions,

      overall_health_score: overallHealthScore,
      diet_readiness_score: dietReadinessScore,
      fitness_readiness_score: fitnessReadinessScore,
      goal_realistic_score: goalRealisticScore,

      recommended_sleep_hours: recommendedSleepHours,
      current_sleep_duration: currentSleepDuration,
      sleep_efficiency_score: sleepEfficiencyScore,

      // Derived classification fields (H17)
      bmi_category: bmiClassification.category,
      bmi_health_risk: bmiClassification.risk,
      bmr_formula_used: "mifflin_st_jeor",
      vo2_max_classification: vo2MaxClassification,
      detected_ethnicity: ethnicityResult.ethnicity,

      data_completeness_percentage: dataCompletenessPercentage,
      reliability_score: reliabilityScore,
      personalization_level: personalizationLevel,
    };
  }
}
