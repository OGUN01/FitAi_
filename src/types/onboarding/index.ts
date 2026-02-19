export * from "./personal-info";
export * from "./diet-preferences";
export * from "./body-analysis";
export * from "./workout-preferences";
export * from "./advanced-review";
export * from "./progress";
export * from "./combined";
export * from "./legacy";

export const VALIDATION_RULES = {
  personal_info: {
    age: { min: 13, max: 120 },
    first_name: { min_length: 1, max_length: 50 },
    last_name: { min_length: 1, max_length: 50 },
    country: { required: true },
    state: { required: true },
    wake_time: { required: true, format: "HH:MM" },
    sleep_time: { required: true, format: "HH:MM" },
  },

  body_analysis: {
    height_cm: { min: 100, max: 250 },
    current_weight_kg: { min: 30, max: 300 },
    target_weight_kg: { min: 30, max: 300 },
    target_timeline_weeks: { min: 4, max: 104 },
    body_fat_percentage: { min: 3, max: 50 },
    ai_confidence_score: { min: 0, max: 100 },
  },

  diet_preferences: {
    max_prep_time_minutes: { min: 5, max: 180 },
  },

  workout_preferences: {
    workout_experience_years: { min: 0, max: 50 },
    workout_frequency_per_week: { min: 0, max: 7 },
    can_do_pushups: { min: 0, max: 200 },
    can_run_minutes: { min: 0, max: 300 },
    workout_types: { min_items: 1 },
    primary_goals: { min_items: 1 },
  },

  health_scores: {
    min: 0,
    max: 100,
  },
} as const;
