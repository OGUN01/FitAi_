/**
 * PERSONAL INFO TYPES (Tab 1)
 *
 * Types for personal information and demographics (profiles table)
 * Part of the onboarding flow - Tab 1
 */

// ============================================================================
// TAB 1: PERSONAL INFO TYPES (profiles table)
// ============================================================================
export interface PersonalInfoData {
  // Basic demographics
  first_name: string;
  last_name: string;
  age: number; // 13-120
  gender: "male" | "female" | "other" | "prefer_not_to_say";

  // Location (3-tier system)
  country: string;
  state: string;
  region?: string;

  // Sleep schedule
  wake_time: string; // TIME format "HH:MM"
  sleep_time: string; // TIME format "HH:MM"

  // Occupation (for activity level guidance)
  occupation_type:
    | "desk_job"
    | "light_active"
    | "moderate_active"
    | "heavy_labor"
    | "very_active";

  // Legacy fields (keep for compatibility)
  email?: string;
  name?: string; // Will be computed from first_name + last_name
  profile_picture?: string;
  dark_mode?: boolean;
  units?: "metric" | "imperial";
  notifications_enabled?: boolean;
}

// Form state for UI components
export interface PersonalInfoFormState extends PersonalInfoData {
  // UI-specific fields
  errors: Partial<Record<keyof PersonalInfoData, string>>;
  is_loading: boolean;
  is_dirty: boolean;
}

// Database row type (matching database schema)
export interface ProfilesRow {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  name?: string | null;
  age?: number | null;
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
  profile_picture?: string | null;
  dark_mode?: boolean | null;
  units?: "metric" | "imperial" | null;
  notifications_enabled?: boolean | null;
  country?: string | null;
  state?: string | null;
  region?: string | null;
  wake_time?: string | null;
  sleep_time?: string | null;
  occupation_type?:
    | "desk_job"
    | "light_active"
    | "moderate_active"
    | "heavy_labor"
    | "very_active"
    | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Validation rules for personal info
export const PERSONAL_INFO_VALIDATION = {
  age: { min: 13, max: 120 },
  first_name: { min_length: 1, max_length: 50 },
  last_name: { min_length: 1, max_length: 50 },
  country: { required: true },
  state: { required: true },
  wake_time: { required: true, format: "HH:MM" },
  sleep_time: { required: true, format: "HH:MM" },
} as const;
