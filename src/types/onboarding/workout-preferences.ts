/**
 * WORKOUT PREFERENCES TYPES (Tab 4)
 *
 * Types for workout preferences and fitness assessment (workout_preferences table)
 * Part of the onboarding flow - Tab 4
 */

// ============================================================================
// TAB 4: WORKOUT PREFERENCES TYPES (workout_preferences table)
// ============================================================================
export interface WorkoutPreferencesData {
  // Existing data (enhanced)
  location: "home" | "gym" | "both";
  equipment: string[]; // TEXT[]
  time_preference: number; // INTEGER (minutes)
  session_duration_minutes?: number; // Alias for time_preference
  intensity: "beginner" | "intermediate" | "advanced";
  workout_types: string[]; // TEXT[]
  available_equipment?: string[]; // Alias for equipment

  // NEW: Goals and activity (moved from profiles)
  primary_goals: string[]; // TEXT[]
  activity_level: "sedentary" | "light" | "moderate" | "active" | "extreme";

  // NEW: Current fitness assessment
  workout_experience_years: number; // INTEGER, 0-50
  workout_frequency_per_week: number; // INTEGER, 0-7
  can_do_pushups: number; // INTEGER, 0-200
  can_run_minutes: number; // INTEGER, 0-300
  flexibility_level: "poor" | "fair" | "good" | "excellent";

  // NEW: Weight goals (populated from body_analysis)
  weekly_weight_loss_goal?: number; // DECIMAL(3,2)
  // Write-once: the user's original intended rate before any pace-card selection.
  // Persisted so originalRateRef in useReviewValidation survives tab remounts.
  original_weekly_rate?: number; // DECIMAL(3,2)

  // NEW: Enhanced preferences
  preferred_workout_times: string[]; // TEXT[] - 'morning', 'afternoon', 'evening'
  enjoys_cardio: boolean;
  enjoys_strength_training: boolean;
  enjoys_group_classes: boolean;
  prefers_outdoor_activities: boolean;
  needs_motivation: boolean;
  prefers_variety: boolean;
}

// Database row type (matching database schema)
export interface WorkoutPreferencesRow {
  id: string;
  user_id: string;
  location?: "home" | "gym" | "both" | null;
  equipment?: string[] | null;
  time_preference?: number | null;
  intensity?: "beginner" | "intermediate" | "advanced" | null;
  workout_types?: string[] | null;
  primary_goals?: string[] | null;
  activity_level?:
    | "sedentary"
    | "light"
    | "moderate"
    | "active"
    | "extreme"
    | null;
  workout_experience_years?: number | null;
  workout_frequency_per_week?: number | null;
  can_do_pushups?: number | null;
  can_run_minutes?: number | null;
  flexibility_level?: "poor" | "fair" | "good" | "excellent" | null;
  weekly_weight_loss_goal?: number | null;
  original_weekly_rate?: number | null;
  preferred_workout_times?: string[] | null;
  enjoys_cardio?: boolean | null;
  enjoys_strength_training?: boolean | null;
  enjoys_group_classes?: boolean | null;
  prefers_outdoor_activities?: boolean | null;
  needs_motivation?: boolean | null;
  prefers_variety?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}
