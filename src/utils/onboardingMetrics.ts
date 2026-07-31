import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
} from "../types/onboarding";

/**
 * A field counts as COMPLETED when it holds a real answer. Booleans count whether
 * true or false — a toggle answered "no" is data, not absence (the old filter
 * treated every false as missing, which pinned a fully-filled onboarding at ~53%
 * completeness because 20+ answered habit/enjoyment toggles were discarded).
 * Numbers count including 0 (a stepper left at 0 is an explicit answer).
 * Empty strings, empty arrays, null and undefined count as missing.
 */
const isProvided = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true; // booleans (incl. false) and numbers (incl. 0) are real answers
};

export const calculateCompletionMetrics = (
  personalInfo: PersonalInfoData | null,
  dietPreferences: DietPreferencesData | null,
  bodyAnalysis: BodyAnalysisData | null,
  workoutPreferences: WorkoutPreferencesData | null,
) => {
  let totalFields = 0;
  let completedFields = 0;

  // Count personal info completion (explicit core set — legacy/derived keys excluded)
  if (personalInfo) {
    const requiredPersonal = [
      "first_name",
      "last_name",
      "age",
      "gender",
      "country",
      "state",
      "wake_time",
      "sleep_time",
    ];
    totalFields += requiredPersonal.length;
    completedFields += requiredPersonal.filter((field) =>
      isProvided(personalInfo[field as keyof PersonalInfoData]),
    ).length;
  }

  // Count diet preferences completion — denominator is the number of fields
  // actually present on the object (the old hardcoded 35 never matched the real
  // schema, so the ratio was wrong even before the boolean bug).
  if (dietPreferences) {
    const values = Object.values(dietPreferences);
    totalFields += values.length;
    completedFields += values.filter(isProvided).length;
  }

  // Count body analysis completion
  if (bodyAnalysis) {
    const requiredBody = [
      "height_cm",
      "current_weight_kg",
      "target_weight_kg",
      "target_timeline_weeks",
    ];
    const optionalBody = [
      "body_fat_percentage",
      "waist_cm",
      "hip_cm",
      "front_photo_url",
      "medical_conditions",
    ];
    totalFields += requiredBody.length + optionalBody.length;

    completedFields += requiredBody.filter((field) =>
      isProvided(bodyAnalysis[field as keyof BodyAnalysisData]),
    ).length;
    completedFields += optionalBody.filter((field) =>
      isProvided(bodyAnalysis[field as keyof BodyAnalysisData]),
    ).length;
  }

  // Count workout preferences completion — dynamic denominator, same rationale
  // as diet (the old hardcoded 24 didn't match the real schema).
  if (workoutPreferences) {
    const values = Object.values(workoutPreferences);
    totalFields += values.length;
    completedFields += values.filter(isProvided).length;
  }

  const calculateReliabilityScore = (): number => {
    let score = 100;

    // Reduce score for missing critical data
    if (!bodyAnalysis?.height_cm || !bodyAnalysis?.current_weight_kg)
      score -= 20;
    if (!workoutPreferences?.primary_goals?.length) score -= 15;

    // Reduce score for unrealistic goals
    if (
      bodyAnalysis &&
      bodyAnalysis.current_weight_kg &&
      bodyAnalysis.target_weight_kg &&
      bodyAnalysis.target_timeline_weeks
    ) {
      // M3: prefer weekly_weight_loss_goal (SSOT) over timeline-derived rate.
      const storedGoal = workoutPreferences?.weekly_weight_loss_goal;
      const weeklyRate =
        storedGoal && storedGoal > 0
          ? storedGoal
          : Math.abs(
              bodyAnalysis.current_weight_kg - bodyAnalysis.target_weight_kg,
            ) / bodyAnalysis.target_timeline_weeks;
      if (weeklyRate > 1.5) score -= 25; // Very unrealistic
      if (weeklyRate > 1) score -= 10; // Slightly unrealistic
    }

    return Math.max(0, score);
  };

  const dataCompletenessPercentage =
    totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  const reliabilityScore = calculateReliabilityScore();

  // personalization_level: how tailored the output is to THIS user. The old
  // formula (completedFields * 1.2) conflated raw field count with tailoring, so
  // a fully-filled onboarding stalled at ~48. Blend overall completeness with
  // coverage of the optional enrichment fields that actually change the plan.
  const enrichmentProvided = [
    !!bodyAnalysis?.body_fat_percentage, // lean-mass-based macros
    !!bodyAnalysis?.ai_estimated_body_fat, // photo-analysis path
    !!bodyAnalysis?.waist_cm, // waist/hip risk ratios
    !!bodyAnalysis?.hip_cm,
    !!bodyAnalysis?.stress_level, // conservative deficit adjustment
    (bodyAnalysis?.medical_conditions?.length ?? 0) > 0, // safety guards
    (bodyAnalysis?.medications?.length ?? 0) > 0,
    (bodyAnalysis?.physical_limitations?.length ?? 0) > 0,
    (workoutPreferences?.workout_experience_years ?? 0) > 0, // volume scaling
    (workoutPreferences?.can_do_pushups ?? 0) > 0, // fitness assessment
    (workoutPreferences?.can_run_minutes ?? 0) > 0, // VO2 max estimate
    (workoutPreferences?.preferred_workout_times?.length ?? 0) > 0, // scheduling
    (dietPreferences?.cooking_methods?.length ?? 0) > 0, // recipe filtering
    (dietPreferences?.cuisine_preferences?.length ?? 0) > 0,
    !!personalInfo?.country, // climate/ethnicity-aware thresholds
  ];
  const enrichmentCoverage =
    enrichmentProvided.filter(Boolean).length / enrichmentProvided.length;
  const personalizationLevel = Math.min(
    100,
    Math.round(dataCompletenessPercentage * 0.6 + enrichmentCoverage * 100 * 0.4),
  );

  return {
    data_completeness_percentage: dataCompletenessPercentage,
    reliability_score: reliabilityScore,
    personalization_level: personalizationLevel,
  };
};
