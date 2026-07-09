/**
 * ADVANCED REVIEW TYPES (Tab 5)
 *
 * Types for calculated metrics and health scores (advanced_review table)
 * Part of the onboarding flow - Tab 5
 */

// ============================================================================
// TAB 5: ADVANCED REVIEW TYPES (advanced_review table)
// ============================================================================
export interface AdvancedReviewData {
  // Basic metabolic calculations
  calculated_bmi?: number; // DECIMAL(4,2)
  calculated_bmr?: number; // DECIMAL(7,2)
  calculated_tdee?: number; // DECIMAL(7,2)
  metabolic_age?: number; // INTEGER

  // Daily nutritional needs
  daily_calories?: number; // INTEGER
  daily_protein_g?: number; // INTEGER
  daily_carbs_g?: number; // INTEGER
  daily_fat_g?: number; // INTEGER
  daily_water_ml?: number; // INTEGER
  daily_fiber_g?: number; // INTEGER

  // Weight management
  healthy_weight_min?: number; // DECIMAL(5,2)
  healthy_weight_max?: number; // DECIMAL(5,2)
  weekly_weight_loss_rate?: number; // DECIMAL(3,2)
  estimated_timeline_weeks?: number; // INTEGER
  total_calorie_deficit?: number; // INTEGER

  // Body composition
  ideal_body_fat_min?: number; // DECIMAL(4,2)
  ideal_body_fat_max?: number; // DECIMAL(5,2)
  lean_body_mass?: number; // DECIMAL(5,2)
  fat_mass?: number; // DECIMAL(5,2)

  // Fitness metrics
  estimated_vo2_max?: number; // DECIMAL(4,1)
  max_heart_rate?: number; // Maximum heart rate
  target_hr_fat_burn_min?: number; // INTEGER
  target_hr_fat_burn_max?: number; // INTEGER
  target_hr_cardio_min?: number; // INTEGER
  target_hr_cardio_max?: number; // INTEGER
  target_hr_peak_min?: number; // INTEGER
  target_hr_peak_max?: number; // INTEGER
  recommended_workout_frequency?: number; // INTEGER
  recommended_cardio_minutes?: number; // INTEGER
  recommended_strength_sessions?: number; // INTEGER

  // Health scores (0-100)
  overall_health_score?: number; // INTEGER, 0-100
  diet_readiness_score?: number; // INTEGER, 0-100
  fitness_readiness_score?: number; // INTEGER, 0-100
  goal_realistic_score?: number; // INTEGER, 0-100

  // Sleep analysis
  recommended_sleep_hours?: number; // DECIMAL(3,1)
  current_sleep_duration?: number; // DECIMAL(3,1)
  sleep_efficiency_score?: number; // INTEGER, 0-100

  // Completion metrics
  data_completeness_percentage?: number; // INTEGER, 0-100
  reliability_score?: number; // INTEGER, 0-100
  personalization_level?: number; // INTEGER, 0-100

  // Validation results (NEW)
  validation_status?: "passed" | "warnings" | "blocked";
  validation_errors?: Array<{ field: string; message: string; code: string }>;
  validation_warnings?: string[];
  refeed_schedule?: Record<string, unknown>;
  medical_adjustments?: string[];

  // Additional missing properties
  bmi_category?: string;
  bmi_health_risk?: string;
  detected_climate?: string;
  /** @computed Not yet implemented — always null. Could be derived from country. */
  detected_ethnicity?: string;
  bmr_formula_used?: string;
  health_grade?: string;
  vo2_max_classification?: string;

  // ── UI-only fields (NOT DB columns on advanced_review) ──────────────────
  // These are derived/computed for display only and must never be written to
  // the table. They are kept on AdvancedReviewData (the runtime/UI shape) so
  // existing UI readers type-check, but are intentionally ABSENT from
  // AdvancedReviewRow (the DB row type) — see P2-8.
  /** @ui-only Composed health score for display (mirrors overall_health_score). */
  health_score?: number;
  /** @ui-only VO2 max estimate label value (DB column is estimated_vo2_max). */
  vo2_max_estimate?: number;
  /** @ui-only Heart-rate zones object for chart rendering (DB stores the 6 target_hr_* columns). */
  heart_rate_zones?: Record<string, { min: number; max: number }>;
  /** @ui-only True when population-average defaults were used because the user
   *  did not provide height/weight during onboarding. */
  usedFallbackDefaults?: boolean;

  // ── Climate / ethnicity debug columns added by migration 20260331000000 ─
  // These round-trip to/from the DB (see AdvancedReviewRow) but are not yet
  // populated by calculateAndSave — they default to null on save.
  climate_used?: string;
  climate_tdee_modifier?: number;
  climate_water_modifier?: number;
  ethnicity_used?: string;
  calculations_version?: string;
  bmr_formula_accuracy?: number;
  bmr_formula_confidence?: number;
  // NOTE: max_heart_rate is already declared above in the Fitness metrics block.

  // BUG-35: Rate cap indicator — true when the requested deficit was reduced for safety
  was_rate_capped?: boolean;
}

// Database row type (matching database schema)
export interface AdvancedReviewRow {
  id: string;
  user_id: string;
  calculated_bmi?: number | null;
  calculated_bmr?: number | null;
  calculated_tdee?: number | null;
  metabolic_age?: number | null;
  daily_calories?: number | null;
  daily_protein_g?: number | null;
  daily_carbs_g?: number | null;
  daily_fat_g?: number | null;
  daily_water_ml?: number | null;
  daily_fiber_g?: number | null;
  healthy_weight_min?: number | null;
  healthy_weight_max?: number | null;
  weekly_weight_loss_rate?: number | null;
  estimated_timeline_weeks?: number | null;
  total_calorie_deficit?: number | null;
  ideal_body_fat_min?: number | null;
  ideal_body_fat_max?: number | null;
  lean_body_mass?: number | null;
  fat_mass?: number | null;
  estimated_vo2_max?: number | null;
  target_hr_fat_burn_min?: number | null;
  target_hr_fat_burn_max?: number | null;
  target_hr_cardio_min?: number | null;
  target_hr_cardio_max?: number | null;
  target_hr_peak_min?: number | null;
  target_hr_peak_max?: number | null;
  recommended_workout_frequency?: number | null;
  recommended_cardio_minutes?: number | null;
  recommended_strength_sessions?: number | null;
  overall_health_score?: number | null;
  diet_readiness_score?: number | null;
  fitness_readiness_score?: number | null;
  goal_realistic_score?: number | null;
  recommended_sleep_hours?: number | null;
  current_sleep_duration?: number | null;
  sleep_efficiency_score?: number | null;
  data_completeness_percentage?: number | null;
  reliability_score?: number | null;
  personalization_level?: number | null;
  validation_status?: string | null;
  validation_errors?: Array<{ field: string; message: string; code: string }>;
  validation_warnings?: string[];
  refeed_schedule?: Record<string, unknown>;
  medical_adjustments?: string[] | null;
  detected_climate?: string | null;
  detected_ethnicity?: string | null;
  was_rate_capped?: boolean | null;
  bmi_category?: string | null;
  bmi_health_risk?: string | null;
  bmr_formula_used?: string | null;
  // P2-7: 8 columns added by migrations 20260331000000 + 20260406000000 that
  // were silently dropped on load because the hand-written Row type was never
  // regenerated. Now declared so select("*") round-trips them.
  climate_used?: string | null;
  climate_tdee_modifier?: number | null;
  climate_water_modifier?: number | null;
  ethnicity_used?: string | null;
  calculations_version?: string | null;
  bmr_formula_accuracy?: number | null;
  bmr_formula_confidence?: number | null;
  max_heart_rate?: number | null;
  health_grade?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
