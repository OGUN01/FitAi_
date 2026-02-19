import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../types/onboarding";
import { MetabolicCalculations } from "./metabolic";
import { NutritionalCalculations } from "./nutritional";
import { BodyCompositionCalculations } from "./body-composition";
import { CardiovascularCalculations } from "./cardiovascular";
import { FitnessRecommendations } from "./fitness-recommendations";
import { HealthScoring } from "./health-scoring";
import { SleepAnalysis } from "./sleep-analysis";

export class HealthCalculationEngine {
  static calculateAllMetrics(
    personalInfo: PersonalInfoData,
    dietPreferences: DietPreferencesData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
  ): AdvancedReviewData {
    const bmi = MetabolicCalculations.calculateBMI(
      bodyAnalysis.current_weight_kg,
      bodyAnalysis.height_cm,
    );
    const bmr = MetabolicCalculations.calculateBMR(
      bodyAnalysis.current_weight_kg,
      bodyAnalysis.height_cm,
      personalInfo.age,
      personalInfo.gender,
    );
    const tdee = MetabolicCalculations.calculateTDEE(
      bmr,
      workoutPreferences.activity_level,
    );
    const metabolicAge = MetabolicCalculations.calculateMetabolicAge(
      bmr,
      personalInfo.age,
      personalInfo.gender,
    );

    const idealWeightRange =
      BodyCompositionCalculations.calculateIdealWeightRange(
        bodyAnalysis.height_cm,
        personalInfo.gender,
        personalInfo.age,
      );
    const weeklyWeightLossRate =
      BodyCompositionCalculations.calculateHealthyWeightLossRate(
        bodyAnalysis.current_weight_kg,
        personalInfo.gender,
      );
    const isWeightLoss =
      bodyAnalysis.current_weight_kg > bodyAnalysis.target_weight_kg;
    const dailyCalories = NutritionalCalculations.calculateDailyCaloriesForGoal(
      tdee,
      workoutPreferences.weekly_weight_loss_goal || weeklyWeightLossRate,
      isWeightLoss,
    );

    const macros = NutritionalCalculations.calculateMacronutrients(
      dailyCalories,
      workoutPreferences.primary_goals,
      dietPreferences,
    );
    const dailyWater = MetabolicCalculations.calculateWaterIntake(
      bodyAnalysis.current_weight_kg,
    );
    const dailyFiber = MetabolicCalculations.calculateFiber(dailyCalories);

    const bodyFatRange = BodyCompositionCalculations.getHealthyBodyFatRange(
      personalInfo.age,
      personalInfo.gender,
    );
    const bodyComposition = bodyAnalysis.body_fat_percentage
      ? BodyCompositionCalculations.calculateBodyComposition(
          bodyAnalysis.current_weight_kg,
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
    const totalCalorieDeficit = Math.round(weeklyWeightLossRate * 7700);

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

      data_completeness_percentage: 0,
      reliability_score: 0,
      personalization_level: 0,
    };
  }
}
