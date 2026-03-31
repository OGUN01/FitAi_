import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
} from "../../types/onboarding";

export class HealthScoring {
  static calculateOverallHealthScore(
    personalInfo: PersonalInfoData,
    dietPreferences: DietPreferencesData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
  ): number {
    let score = 100;

    if (bodyAnalysis.bmi) {
      if (bodyAnalysis.bmi < 18.5 || bodyAnalysis.bmi > 25) score -= 10;
      if (bodyAnalysis.bmi > 30) score -= 20;
      if (bodyAnalysis.bmi >= 18.5 && bodyAnalysis.bmi <= 24.9) score += 5;
    }

    const activityBonus = {
      sedentary: -15,
      light: -5,
      moderate: 5,
      active: 10,
      extreme: 15,
    };
    score +=
      activityBonus[
        workoutPreferences.activity_level as keyof typeof activityBonus
      ] || 0;

    if (dietPreferences.drinks_enough_water) score += 5;
    if (dietPreferences.eats_5_servings_fruits_veggies) score += 10;
    if (dietPreferences.limits_refined_sugar) score += 5;
    if (dietPreferences.eats_processed_foods) score -= 10;
    if (dietPreferences.smokes_tobacco) score -= 25;
    if (dietPreferences.drinks_alcohol) score -= 5;

    if (personalInfo.wake_time && personalInfo.sleep_time) {
      const sleepHours = this.calculateSleepDuration(
        personalInfo.wake_time,
        personalInfo.sleep_time,
      );
      if (sleepHours >= 7 && sleepHours <= 9) score += 10;
      if (sleepHours < 6) score -= 15;
    }

    if (workoutPreferences.workout_experience_years > 0) score += 5;
    if (workoutPreferences.workout_frequency_per_week >= 3) score += 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  static calculateFitnessReadinessScore(
    workoutPreferences: WorkoutPreferencesData,
    bodyAnalysis: BodyAnalysisData,
  ): number {
    let score = 50;

    score += Math.min(workoutPreferences.workout_experience_years * 3, 15);

    score += Math.min(workoutPreferences.can_do_pushups * 0.5, 15);
    score += Math.min(workoutPreferences.can_run_minutes * 0.3, 15);

    const activityBonus = {
      sedentary: -10,
      light: 0,
      moderate: 10,
      active: 15,
      extreme: 20,
    };
    score +=
      activityBonus[
        workoutPreferences.activity_level as keyof typeof activityBonus
      ] || 0;

    if (
      bodyAnalysis.medical_conditions &&
      bodyAnalysis.medical_conditions.length > 0
    ) {
      score -= bodyAnalysis.medical_conditions.length * 5;
    }

    if (
      bodyAnalysis.physical_limitations &&
      bodyAnalysis.physical_limitations.length > 0
    ) {
      score -= bodyAnalysis.physical_limitations.length * 3;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  static calculateGoalRealisticScore(
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData,
  ): number {
    let score = 80;

    if (
      bodyAnalysis.current_weight_kg &&
      bodyAnalysis.target_weight_kg &&
      bodyAnalysis.target_timeline_weeks
    ) {
      const weeklyRate =
        Math.abs(
          bodyAnalysis.current_weight_kg - bodyAnalysis.target_weight_kg,
        ) / bodyAnalysis.target_timeline_weeks;

      if (weeklyRate > 1.5) score -= 30;
      else if (weeklyRate > 1) score -= 15;
      else if (weeklyRate >= 0.5) score += 10;
      else if (weeklyRate < 0.25) score -= 10;
    }

    const hasAmbitiousGoals =
      workoutPreferences.primary_goals.includes("muscle-gain") ||
      workoutPreferences.primary_goals.includes("muscle_gain") ||
      workoutPreferences.primary_goals.includes("strength");
    const isExperienced = workoutPreferences.workout_experience_years > 1;

    if (hasAmbitiousGoals && !isExperienced) score -= 15;
    if (!hasAmbitiousGoals && isExperienced) score += 5;

    if (
      bodyAnalysis.medical_conditions &&
      bodyAnalysis.medical_conditions.length > 2
    ) {
      score -= 20;
    }

    return Math.max(20, Math.min(100, Math.round(score)));
  }

  private static calculateSleepDuration(
    wakeTime: string,
    sleepTime: string,
  ): number {
    const [wakeHour, wakeMin] = wakeTime.split(":").map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(":").map(Number);

    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;

    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60;

    return duration / 60;
  }
}
