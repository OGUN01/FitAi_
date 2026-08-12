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
    // Confidence-weighted scoring: most onboarding fields are non-nullable by
    // the time this runs (the review tab requires all 4 sections complete),
    // but bodyAnalysis.bmi and personalInfo.wake_time/sleep_time genuinely can
    // be absent — e.g. AdvancedReviewService.calculateAndSave can be invoked
    // for a partially-edited profile. Previously the score started at a flat
    // 100 and unanswered fields simply contributed nothing, so a profile with
    // only BMI + activity_level present could land at a misleading 90/100.
    // Instead we accumulate a delta from a neutral 50 baseline and blend it
    // toward that baseline by how much of the genuinely-optional data is
    // actually present, so a low-data profile reports an honestly mediocre
    // score instead of a falsely precise near-perfect one.
    let delta = 0;
    let optionalFieldsPresent = 0;
    const optionalFieldsTotal = 2; // bmi, sleep window

    if (bodyAnalysis.bmi) {
      optionalFieldsPresent++;
      if (bodyAnalysis.bmi < 18.5 || bodyAnalysis.bmi > 25) delta -= 10;
      if (bodyAnalysis.bmi > 30) delta -= 20;
      if (bodyAnalysis.bmi >= 18.5 && bodyAnalysis.bmi <= 24.9) delta += 5;
    }

    const activityBonus = {
      sedentary: -15,
      light: -5,
      moderate: 5,
      active: 10,
      very_active: 15,
      extreme: 15,
    };
    delta +=
      activityBonus[
        workoutPreferences.activity_level as keyof typeof activityBonus
      ] || 0;

    if (dietPreferences.drinks_enough_water) delta += 5;
    if (dietPreferences.eats_5_servings_fruits_veggies) delta += 10;
    if (dietPreferences.limits_refined_sugar) delta += 5;
    if (dietPreferences.eats_processed_foods) delta -= 10;
    if (dietPreferences.smokes_tobacco) delta -= 25;
    if (dietPreferences.drinks_alcohol) delta -= 5;

    if (personalInfo.wake_time && personalInfo.sleep_time) {
      optionalFieldsPresent++;
      const sleepHours = this.calculateSleepDuration(
        personalInfo.wake_time,
        personalInfo.sleep_time,
      );
      if (sleepHours >= 7 && sleepHours <= 9) delta += 10;
      if (sleepHours < 6) delta -= 15;
    }

    if (workoutPreferences.workout_experience_years > 0) delta += 5;
    if (workoutPreferences.workout_frequency_per_week >= 3) delta += 10;

    // Confidence ranges 0.5 (neither optional field present) to 1.0 (both
    // present) — a fully-answered profile keeps its raw computed score, a
    // sparse one is pulled back toward the neutral 50 baseline instead of
    // riding an unearned high starting point.
    const confidence = 0.5 + 0.5 * (optionalFieldsPresent / optionalFieldsTotal);
    const score = 50 + delta * confidence;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  static calculateFitnessReadinessScore(
    workoutPreferences: WorkoutPreferencesData,
    bodyAnalysis: BodyAnalysisData,
  ): number {
    let score = 50;

    // All three self-assessment fields are optional — coerce to 0 so a skipped
    // assessment reduces the score instead of producing NaN.
    score += Math.min((workoutPreferences.workout_experience_years ?? 0) * 3, 15);

    score += Math.min((workoutPreferences.can_do_pushups ?? 0) * 0.5, 15);
    score += Math.min((workoutPreferences.can_run_minutes ?? 0) * 0.3, 15);

    const activityBonus = {
      sedentary: -10,
      light: 0,
      moderate: 10,
      active: 15,
      very_active: 20,
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
      // M3: prefer weekly_weight_loss_goal (SSOT) over timeline-derived rate.
      // The timeline is Math.ceil-rounded, so re-deriving from it introduces drift.
      const storedGoal = workoutPreferences.weekly_weight_loss_goal;
      const weeklyRate =
        storedGoal && storedGoal > 0
          ? storedGoal
          : Math.abs(
              bodyAnalysis.current_weight_kg - bodyAnalysis.target_weight_kg,
            ) / bodyAnalysis.target_timeline_weeks;

      if (weeklyRate === 0) {
        // maintenance goal — no penalty
      } else if (weeklyRate > 1.5) score -= 30;
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
    if (!wakeTime || !sleepTime) return 8; // safe default (normal sleep)
    const [wakeHour, wakeMin] = wakeTime.split(":").map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(":").map(Number);

    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;

    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60;

    return duration / 60;
  }
}
