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
import { HealthScoreCalculatorService } from "./fitnessCalculators";
import { calculateCompletionMetrics } from "../onboardingMetrics";
import { computeEnergyBreakdown } from "../../services/energy/energyModel";


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
    // Phase A.3: Delegate TDEE to the unified energy engine so master-engine
    // and core.ts agree. The engine's goalTdee (NEAT_TDEE + intentExerciseBurn)
    // replaces the old calculateTDEE (BMR × ACTIVITY_MULTIPLIERS, no exercise
    // term, no age modifier) — fixing the divergence between the two paths.
    // medicalConditions not passed: master-engine has no medical-adjustment
    // step, matching core.ts which applies medical adjustments separately.
    const energy = computeEnergyBreakdown({
      weightKg,
      heightCm,
      age: personalInfo.age,
      gender: personalInfo.gender,
      activityLevel: workoutPreferences.activity_level,
      workoutFrequencyPerWeek: workoutPreferences.workout_frequency_per_week,
      timePreference: workoutPreferences.time_preference,
      intensity: workoutPreferences.intensity,
      workoutTypes: workoutPreferences.workout_types,
      plan: null,
    });
    const tdee = energy.goalTdee;
    const metabolicAge = MetabolicCalculations.calculateMetabolicAge(
      bmr,
      personalInfo.age,
      personalInfo.gender,
      weightKg,
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
      personalInfo.gender === "male" ? "male" : "female",
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
    // Resolve body fat through the same SSOT chain the ValidationEngine uses
    // (manual entry → AI photo estimate → BMI-derived estimate → sex default).
    // Previously a missing manual entry produced lean_body_mass=0 / fat_mass=0 —
    // bare zeros presented as real measurements. BMI-derived estimates are honest
    // approximations (marked low-confidence upstream) and never fabricate a zero.
    const resolvedBodyFat = MetabolicCalculations.getFinalBodyFatPercentage(
      bodyAnalysis.body_fat_percentage,
      bodyAnalysis.ai_estimated_body_fat,
      bodyAnalysis.ai_confidence_score,
      bmi,
      personalInfo.gender,
      personalInfo.age,
    );
    const bodyComposition = BodyCompositionCalculations.calculateBodyComposition(
      weightKg,
      resolvedBodyFat.value,
    );

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

    // health_grade: letter-grade rollup of the overall health score. The DB column
    // exists (migration 20260402000000) and save() persists it, but nothing ever
    // computed it — it round-tripped as NULL. Grade bands come from the shared
    // HealthScoreCalculatorService.getGrade SSOT.
    const healthGrade = HealthScoreCalculatorService.getGrade(overallHealthScore);

    // ── Quality / Completeness scores ──────────────────────────────────────
    // SSOT: calculateCompletionMetrics (src/utils/onboardingMetrics.ts) — the same
    // function useReviewValidation spreads into the live result. Previously the
    // engine kept its own divergent formula, so the values persisted via
    // AdvancedReviewService.calculateAndSave disagreed with the live UI path.
    const {
      data_completeness_percentage: dataCompletenessPercentage,
      reliability_score: reliabilityScore,
      personalization_level: personalizationLevel,
    } = calculateCompletionMetrics(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences,
    );

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
      // @ui-only alias consumed by userMetricsService / SyncEngine — previously
      // never populated even though estimated_vo2_max was (naming mismatch).
      vo2_max_estimate: Math.round(estimatedVO2Max * 10) / 10,
      max_heart_rate: maxHeartRate,
      // @ui-only aggregate zone object for chart rendering — the 6 target_hr_*
      // columns were written but the aggregate object was never built.
      heart_rate_zones: { ...heartRateZones },
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
      health_grade: healthGrade,
      vo2_max_classification: vo2MaxClassification,
      detected_ethnicity: ethnicityResult.ethnicity,
      // This engine only runs when valid height/weight were entered, so population
      // fallback defaults were NOT used. (The no-body-data path is handled by the
      // caller, which sets usedFallbackDefaults=true.)
      usedFallbackDefaults: false,

      data_completeness_percentage: dataCompletenessPercentage,
      reliability_score: reliabilityScore,
      personalization_level: personalizationLevel,
    };
  }
}
