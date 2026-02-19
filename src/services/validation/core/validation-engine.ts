import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
} from "../../../types/onboarding";
import { MetabolicCalculations } from "../../../utils/healthCalculations";
import {
  ValidationResult,
  ValidationResults,
  SmartAlternativesResult,
} from "../types";
import {
  validateMinimumBodyFat,
  validateMinimumBMI,
  validateBMRSafety,
  validateAbsoluteMinimum,
  validateTimeline,
  validatePregnancyBreastfeeding,
  validateGoalConflict,
  validateMealsEnabled,
  validateSleepAggressiveCombo,
  validateTrainingVolume,
  validateInsufficientExercise,
} from "../blockingValidations";
import {
  warnAggressiveTimeline,
  warnElderlyUser,
  warnTeenAthlete,
  warnZeroExercise,
  warnHighTrainingVolume,
  warnMenopause,
  warnLowSleep,
  warnMedicalConditions,
  warnBodyRecomp,
  warnSubstanceImpact,
  warnHeartDisease,
  warnConcurrentTrainingInterference,
  warnObesitySpecialGuidance,
  warnEquipmentLimitations,
  warnPhysicalLimitationsVsIntensity,
  warnLowDietReadiness,
  warnVeganProteinLimitations,
  warnMedicationEffects,
  warnExcessiveWeightGain,
  warnMultipleBadHabits,
} from "../warningValidations";
import { calculateSmartAlternatives } from "../smartAlternatives";
import { ValidationCalculations } from "./calculations";
import { ValidationAdjustments } from "./adjustments";

export class ValidationEngine {
  static validateUserPlan(
    personalInfo: PersonalInfoData,
    dietPreferences: DietPreferencesData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
  ): ValidationResults {
    const errors: ValidationResult[] = [];
    const warnings: ValidationResult[] = [];

    const bmr = MetabolicCalculations.calculateBMR(
      bodyAnalysis.current_weight_kg,
      bodyAnalysis.height_cm,
      personalInfo.age,
      personalInfo.gender,
    );

    const bmi = MetabolicCalculations.calculateBMI(
      bodyAnalysis.current_weight_kg,
      bodyAnalysis.height_cm,
    );
    const bodyFatData = MetabolicCalculations.getFinalBodyFatPercentage(
      bodyAnalysis.body_fat_percentage,
      bodyAnalysis.ai_estimated_body_fat,
      bodyAnalysis.ai_confidence_score,
      bmi,
      personalInfo.gender,
      personalInfo.age,
    );

    const sleepHours = ValidationCalculations.calculateSleepDuration(
      personalInfo.wake_time,
      personalInfo.sleep_time,
    );

    const baseTDEE = MetabolicCalculations.calculateBaseTDEE(
      bmr,
      personalInfo.occupation_type,
    );
    const exerciseBurn = MetabolicCalculations.calculateDailyExerciseBurn(
      workoutPreferences.workout_frequency_per_week,
      workoutPreferences.time_preference,
      workoutPreferences.intensity,
      bodyAnalysis.current_weight_kg,
      workoutPreferences.workout_types,
    );
    let tdee = MetabolicCalculations.applyAgeModifier(
      baseTDEE + exerciseBurn,
      personalInfo.age,
      personalInfo.gender,
    );

    const isWeightLoss =
      bodyAnalysis.current_weight_kg > bodyAnalysis.target_weight_kg;
    const isWeightGain =
      bodyAnalysis.current_weight_kg < bodyAnalysis.target_weight_kg;

    const weightDifference = Math.abs(
      bodyAnalysis.target_weight_kg - bodyAnalysis.current_weight_kg,
    );
    const requiredWeeklyRate =
      weightDifference / bodyAnalysis.target_timeline_weeks;

    let targetCalories: number;
    let weeklyRate: number;
    let deficitLimitResult: {
      adjustedCalories: number;
      wasLimited: boolean;
      limitReason?: string;
      originalDeficitPercent: number;
      adjustedDeficitPercent: number;
    } | null = null;

    if (isWeightLoss) {
      const dailyDeficit = (requiredWeeklyRate * 7700) / 7;
      const initialTargetCalories = tdee - dailyDeficit;
      deficitLimitResult = ValidationAdjustments.applyDeficitLimit(
        initialTargetCalories,
        tdee,
        bmr,
        bodyAnalysis.stress_level || "moderate",
        bodyAnalysis.medical_conditions.length > 0,
      );
      targetCalories = deficitLimitResult.adjustedCalories;

      if (deficitLimitResult.wasLimited) {
        const actualDailyDeficit = tdee - targetCalories;
        weeklyRate = (actualDailyDeficit * 7) / 7700;
        warnings.push({
          status: "WARNING",
          code: "DEFICIT_LIMITED_FOR_SAFETY",
          message: `Calorie deficit reduced from ${Math.round(deficitLimitResult.originalDeficitPercent * 100)}% to ${Math.round(deficitLimitResult.adjustedDeficitPercent * 100)}% due to ${deficitLimitResult.limitReason}`,
          recommendations: [
            `🛡️ Your deficit was capped at ${Math.round(deficitLimitResult.adjustedDeficitPercent * 100)}% for your safety`,
            `Original target: ${Math.round(initialTargetCalories)} cal/day`,
            `Adjusted target: ${Math.round(targetCalories)} cal/day`,
            "💡 This will extend your timeline but protect your health and hormones",
          ],
          canProceed: true,
        });
      } else {
        weeklyRate = requiredWeeklyRate;
      }
    } else if (isWeightGain) {
      const dailySurplus = (requiredWeeklyRate * 7700) / 7;
      targetCalories = tdee + dailySurplus;
      weeklyRate = requiredWeeklyRate;
    } else {
      targetCalories = tdee;
      weeklyRate = 0;
    }

    if (isWeightLoss) {
      const bodyFatCheck = validateMinimumBodyFat(
        bodyAnalysis.body_fat_percentage,
        personalInfo.gender,
      );
      if (bodyFatCheck.status === "BLOCKED") errors.push(bodyFatCheck);

      const bmiCheck = validateMinimumBMI(
        bodyAnalysis.bmi || 0,
        bodyAnalysis.target_weight_kg,
        bodyAnalysis.height_cm,
      );
      if (bmiCheck.status === "BLOCKED") errors.push(bmiCheck);

      const bmrCheck = validateBMRSafety(targetCalories, bmr);
      if (bmrCheck.status === "BLOCKED") errors.push(bmrCheck);

      const minCheck = validateAbsoluteMinimum(
        targetCalories,
        personalInfo.gender,
      );
      if (minCheck.status === "BLOCKED") errors.push(minCheck);

      const timelineCheck = validateTimeline(
        bodyAnalysis.current_weight_kg,
        bodyAnalysis.target_weight_kg,
        bodyAnalysis.target_timeline_weeks,
      );
      if (timelineCheck.status === "BLOCKED") errors.push(timelineCheck);

      const exerciseCheck = validateInsufficientExercise(
        workoutPreferences.workout_frequency_per_week,
        requiredWeeklyRate,
        bodyAnalysis.current_weight_kg,
        tdee,
        bmr,
      );
      if (exerciseCheck.status === "BLOCKED") errors.push(exerciseCheck);
    }

    const pregnancyCheck = validatePregnancyBreastfeeding(
      bodyAnalysis.pregnancy_status,
      bodyAnalysis.breastfeeding_status,
      targetCalories,
      tdee,
    );
    if (pregnancyCheck.status === "BLOCKED") errors.push(pregnancyCheck);

    const goalCheck = validateGoalConflict(workoutPreferences.primary_goals);
    if (goalCheck.status === "BLOCKED") errors.push(goalCheck);

    const mealsCheck = validateMealsEnabled(
      dietPreferences.breakfast_enabled,
      dietPreferences.lunch_enabled,
      dietPreferences.dinner_enabled,
      dietPreferences.snacks_enabled,
    );
    if (mealsCheck.status === "BLOCKED") errors.push(mealsCheck);

    const sleepComboCheck = validateSleepAggressiveCombo(
      sleepHours,
      requiredWeeklyRate,
      bodyAnalysis.current_weight_kg,
    );
    if (sleepComboCheck.status === "BLOCKED") errors.push(sleepComboCheck);

    const volumeCheck = validateTrainingVolume(
      workoutPreferences.workout_frequency_per_week,
      workoutPreferences.time_preference,
      workoutPreferences.intensity,
      personalInfo.occupation_type,
    );
    if (volumeCheck.status === "BLOCKED") errors.push(volumeCheck);

    if (errors.length === 0) {
      const isAggressive =
        requiredWeeklyRate > bodyAnalysis.current_weight_kg * 0.0075;

      if (isWeightLoss || isWeightGain) {
        const timelineWarn = warnAggressiveTimeline(
          requiredWeeklyRate,
          bodyAnalysis.current_weight_kg,
          bodyAnalysis.target_weight_kg,
          bodyAnalysis.target_timeline_weeks,
          tdee,
        );
        if (timelineWarn.status === "WARNING") warnings.push(timelineWarn);
      }

      const sleepWarn = warnLowSleep(sleepHours);
      if (sleepWarn.status === "WARNING") warnings.push(sleepWarn);

      const medicalWarn = warnMedicalConditions(
        bodyAnalysis.medical_conditions,
        isAggressive,
      );
      if (medicalWarn.status === "WARNING") warnings.push(medicalWarn);

      const recompWarn = warnBodyRecomp(
        workoutPreferences.primary_goals,
        workoutPreferences.workout_experience_years,
        bodyFatData.value,
      );
      if (recompWarn.status !== "OK") warnings.push(recompWarn);

      const substanceWarns = warnSubstanceImpact(
        dietPreferences.drinks_alcohol,
        dietPreferences.smokes_tobacco,
        isAggressive,
      );
      warnings.push(...substanceWarns);

      const elderlyWarn = warnElderlyUser(personalInfo.age);
      if (elderlyWarn.status === "WARNING") warnings.push(elderlyWarn);

      const teenWarn = warnTeenAthlete(
        personalInfo.age,
        workoutPreferences.activity_level,
        isWeightLoss ? "weight-loss" : "other",
      );
      if (teenWarn.status === "WARNING") warnings.push(teenWarn);

      const heartWarn = warnHeartDisease(
        bodyAnalysis.medical_conditions,
        workoutPreferences.intensity,
      );
      if (heartWarn.status === "WARNING") warnings.push(heartWarn);

      const interferenceWarn = warnConcurrentTrainingInterference(
        workoutPreferences.primary_goals,
      );
      if (interferenceWarn.status === "WARNING")
        warnings.push(interferenceWarn);

      const obesityWarn = warnObesitySpecialGuidance(
        bmi,
        requiredWeeklyRate,
        bodyAnalysis.current_weight_kg,
      );
      if (obesityWarn.status === "WARNING") warnings.push(obesityWarn);

      const zeroExerciseWarn = warnZeroExercise(
        workoutPreferences.workout_frequency_per_week,
        isWeightLoss ? "weight-loss" : "other",
      );
      if (zeroExerciseWarn.status === "WARNING")
        warnings.push(zeroExerciseWarn);

      const highVolumeWarn = warnHighTrainingVolume(
        workoutPreferences.workout_frequency_per_week,
        workoutPreferences.time_preference,
        workoutPreferences.intensity,
      );
      if (highVolumeWarn.status === "WARNING") warnings.push(highVolumeWarn);

      const menopauseWarn = warnMenopause(
        personalInfo.gender,
        personalInfo.age,
      );
      if (menopauseWarn.status === "WARNING") warnings.push(menopauseWarn);

      const equipmentWarn = warnEquipmentLimitations(
        workoutPreferences.primary_goals,
        workoutPreferences.location,
        workoutPreferences.equipment,
      );
      if (equipmentWarn.status === "WARNING") warnings.push(equipmentWarn);

      const limitationsWarn = warnPhysicalLimitationsVsIntensity(
        bodyAnalysis.physical_limitations,
        workoutPreferences.intensity,
      );
      if (limitationsWarn.status === "WARNING") warnings.push(limitationsWarn);

      const dietReadinessScore =
        MetabolicCalculations.calculateDietReadinessScore(dietPreferences);
      const readinessWarn = warnLowDietReadiness(
        dietReadinessScore,
        requiredWeeklyRate,
        bodyAnalysis.current_weight_kg,
      );
      if (readinessWarn.status === "WARNING") warnings.push(readinessWarn);

      const proteinTarget = ValidationCalculations.calculateProtein(
        bodyAnalysis.current_weight_kg,
        isWeightLoss ? "cutting" : isWeightGain ? "bulking" : "maintenance",
      );
      const veganWarn = warnVeganProteinLimitations(
        dietPreferences.diet_type,
        dietPreferences.allergies,
        proteinTarget,
      );
      if (veganWarn.status === "WARNING") warnings.push(veganWarn);

      const medWarn = warnMedicationEffects(bodyAnalysis.medications);
      if (medWarn.status === "WARNING") warnings.push(medWarn);

      if (isWeightGain) {
        const gainWarn = warnExcessiveWeightGain(
          requiredWeeklyRate,
          bodyAnalysis.current_weight_kg,
        );
        if (gainWarn.status === "WARNING") warnings.push(gainWarn);
      }

      const habitsWarn = warnMultipleBadHabits(
        sleepHours,
        dietPreferences.smokes_tobacco,
        dietPreferences.drinks_alcohol,
      );
      if (habitsWarn.status === "WARNING") warnings.push(habitsWarn);
    }

    const proteinGoal = isWeightLoss
      ? "cutting"
      : isWeightGain
        ? "bulking"
        : "maintenance";
    const protein = ValidationCalculations.calculateProtein(
      bodyAnalysis.current_weight_kg,
      proteinGoal,
    );
    const macros = ValidationCalculations.calculateMacros(
      targetCalories,
      protein,
      workoutPreferences.workout_frequency_per_week,
      workoutPreferences.intensity,
    );

    const { adjustedTDEE, adjustedMacros, notes } =
      ValidationAdjustments.applyMedicalAdjustments(
        tdee,
        macros,
        bodyAnalysis.medical_conditions,
      );

    const deficitPercent = isWeightLoss ? (tdee - targetCalories) / tdee : 0;
    const refeedSchedule = ValidationAdjustments.calculateRefeedSchedule(
      bodyAnalysis.target_timeline_weeks,
      deficitPercent,
      isWeightLoss
        ? "weight-loss"
        : isWeightGain
          ? "weight-gain"
          : "maintenance",
    );

    const wasRateCapped =
      isWeightLoss && deficitLimitResult?.wasLimited === true;

    return {
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0,
      errors,
      warnings,
      canProceed: errors.length === 0,
      calculatedMetrics: {
        bmr: Math.round(bmr),
        tdee: Math.round(adjustedTDEE || tdee),
        targetCalories: Math.round(targetCalories),
        weeklyRate: Math.round(weeklyRate * 100) / 100,
        originalWeeklyRate: Math.round(requiredWeeklyRate * 100) / 100,
        wasRateCapped,
        protein: adjustedMacros.protein,
        carbs: adjustedMacros.carbs,
        fat: adjustedMacros.fat,
        timeline: bodyAnalysis.target_timeline_weeks,
      },
      adjustments: {
        refeedSchedule:
          refeedSchedule.needsRefeeds || refeedSchedule.needsDietBreak
            ? refeedSchedule
            : undefined,
        medicalNotes: notes.length > 0 ? notes : undefined,
      },
    };
  }

  static calculateSmartAlternatives = calculateSmartAlternatives;
}
