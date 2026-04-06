import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
} from "../types/onboarding";

export const calculateCompletionMetrics = (
  personalInfo: PersonalInfoData | null,
  dietPreferences: DietPreferencesData | null,
  bodyAnalysis: BodyAnalysisData | null,
  workoutPreferences: WorkoutPreferencesData | null,
) => {
  let totalFields = 0;
  let completedFields = 0;

  // Count personal info completion
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
    completedFields += requiredPersonal.filter(
      (field) => personalInfo[field as keyof PersonalInfoData],
    ).length;
  }

  // Count diet preferences completion
  if (dietPreferences) {
    totalFields += 35; // Total diet preference fields
    completedFields += Object.values(dietPreferences).filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        value !== "" &&
        value !== false &&
        (Array.isArray(value) ? value.length > 0 : true),
    ).length;
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

    completedFields += requiredBody.filter(
      (field) => bodyAnalysis[field as keyof BodyAnalysisData],
    ).length;
    completedFields += optionalBody.filter((field) => {
      const value = bodyAnalysis[field as keyof BodyAnalysisData];
      return Array.isArray(value)
        ? value.length > 0
        : value !== null && value !== undefined;
    }).length;
  }

  // Count workout preferences completion
  if (workoutPreferences) {
    totalFields += 24; // Total workout preference fields
    completedFields += Object.values(workoutPreferences).filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        value !== "" &&
        value !== false &&
        (Array.isArray(value) ? value.length > 0 : true),
    ).length;
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
  const personalizationLevel = Math.min(100, Math.round(completedFields * 1.2)); // Boost for comprehensive data

  return {
    data_completeness_percentage: dataCompletenessPercentage,
    reliability_score: reliabilityScore,
    personalization_level: personalizationLevel,
  };
};
