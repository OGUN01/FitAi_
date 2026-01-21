// User-related TypeScript type definitions

export interface PersonalInfo {
  // Name fields (match database schema)
  first_name: string; // REQUIRED
  last_name: string; // REQUIRED
  name?: string; // Computed field: first_name + last_name (for backward compatibility)

  email?: string; // Optional for existing users, required for new signups
  age: number; // INTEGER type to match database
  gender: "male" | "female" | "other" | "prefer_not_to_say";

  // Location (3-tier system)
  country: string; // REQUIRED
  state: string; // REQUIRED
  region?: string; // Optional

  // Sleep schedule
  wake_time: string; // TIME format "HH:MM" - REQUIRED
  sleep_time: string; // TIME format "HH:MM" - REQUIRED

  // Occupation (for activity level guidance)
  occupation_type:
    | "desk_job"
    | "light_active"
    | "moderate_active"
    | "heavy_labor"
    | "very_active"; // REQUIRED

  // Legacy/UI preferences
  profile_picture?: string;
  dark_mode?: boolean;
  units?: "metric" | "imperial";
  notifications_enabled?: boolean;

  // Backward compatibility - height/weight (now in BodyMetrics)
  height?: number; // Deprecated - use BodyMetrics.height_cm
  weight?: number; // Deprecated - use BodyMetrics.current_weight_kg
  activityLevel?: string; // Deprecated - use WorkoutPreferences.activity_level
}

// ✅ Body metrics from body_analysis table
export interface BodyMetrics {
  // Basic measurements (REQUIRED for BMI calculation)
  height_cm: number; // DECIMAL(5,2), 100-250 - REQUIRED
  current_weight_kg: number; // DECIMAL(5,2), 30-300 - REQUIRED

  // Backward compatibility aliases
  height?: number; // Alias for height_cm
  weight?: number; // Alias for current_weight_kg

  // Goal settings (optional but recommended)
  target_weight_kg?: number; // DECIMAL(5,2), 30-300
  target_timeline_weeks?: number; // INTEGER, 4-104

  // Body composition (optional)
  body_fat_percentage?: number; // DECIMAL(4,2), 3-50
  waist_cm?: number; // DECIMAL(5,2)
  hip_cm?: number; // DECIMAL(5,2)
  chest_cm?: number; // DECIMAL(5,2)

  // Progress photos (individual URLs)
  front_photo_url?: string;
  side_photo_url?: string;
  back_photo_url?: string;

  // AI analysis results (only if photos provided)
  ai_estimated_body_fat?: number; // DECIMAL(4,2)
  ai_body_type?: "ectomorph" | "mesomorph" | "endomorph";
  ai_confidence_score?: number; // INTEGER, 0-100

  // Medical information
  medical_conditions: string[]; // TEXT[] - REQUIRED (can be empty array)
  medications: string[]; // TEXT[] - REQUIRED (can be empty array)
  physical_limitations: string[]; // TEXT[] - REQUIRED (can be empty array)

  // Pregnancy/Breastfeeding status (CRITICAL for safety)
  pregnancy_status: boolean; // REQUIRED
  pregnancy_trimester?: 1 | 2 | 3; // Only if pregnancy_status = true
  breastfeeding_status: boolean; // REQUIRED

  // Stress level (affects deficit limits and recovery)
  stress_level?: "low" | "moderate" | "high";

  // Calculated values (auto-computed)
  bmi?: number; // DECIMAL(4,2)
  bmr?: number; // DECIMAL(7,2)
  ideal_weight_min?: number; // DECIMAL(5,2)
  ideal_weight_max?: number; // DECIMAL(5,2)
  waist_hip_ratio?: number; // DECIMAL(3,2)

  // Legacy JSONB fields (for backward compatibility)
  photos?: {
    front?: string;
    back?: string;
    side?: string;
  };
  analysis?: {
    bodyType: string;
    muscleMass: string;
    bodyFat: string;
    fitnessLevel: string;
    recommendations: string[];
  };
}

export interface FitnessGoals {
  // ✅ Fixed: Use database field names (snake_case) to match workout_preferences table
  primary_goals: string[];
  time_commitment: string;
  experience: string;
  experience_level: string;

  // Optional extended fields used by exercise filtering
  preferred_equipment?: string[];
  target_areas?: ("full_body" | "upper_body" | "lower_body" | "core")[];

  // Backward compatibility - computed from snake_case fields
  primaryGoals?: string[];
  timeCommitment?: string;
}

// Diet Preferences (from diet_preferences table)
export interface DietPreferences {
  // Basic diet info
  diet_type: "vegetarian" | "vegan" | "non-veg" | "pescatarian"; // REQUIRED (snake_case)
  allergies: string[]; // TEXT[] - REQUIRED (can be empty array)
  restrictions: string[]; // TEXT[] - REQUIRED (can be empty array)

  // Diet readiness toggles (6 specialized diets)
  keto_ready: boolean;
  intermittent_fasting_ready: boolean;
  paleo_ready: boolean;
  mediterranean_ready: boolean;
  low_carb_ready: boolean;
  high_protein_ready: boolean;

  // Meal preferences (at least 1 required)
  breakfast_enabled: boolean;
  lunch_enabled: boolean;
  dinner_enabled: boolean;
  snacks_enabled: boolean;

  // Cooking preferences
  cooking_skill_level:
    | "beginner"
    | "intermediate"
    | "advanced"
    | "not_applicable";
  max_prep_time_minutes: number | null; // 5-180, null when not_applicable
  budget_level: "low" | "medium" | "high";

  // Health habits (14 boolean fields)
  // Hydration
  drinks_enough_water: boolean;
  limits_sugary_drinks: boolean;
  // Eating patterns
  eats_regular_meals: boolean;
  avoids_late_night_eating: boolean;
  controls_portion_sizes: boolean;
  reads_nutrition_labels: boolean;
  // Food choices
  eats_processed_foods: boolean;
  eats_5_servings_fruits_veggies: boolean;
  limits_refined_sugar: boolean;
  includes_healthy_fats: boolean;
  // Substances
  drinks_alcohol: boolean;
  smokes_tobacco: boolean;
  drinks_coffee: boolean;
  takes_supplements: boolean;

  // Additional properties used in DietScreen
  specialAction?: string;
}

export interface WorkoutPreferences {
  // ✅ Fixed: Use database field names (snake_case) to match workout_preferences table
  location: "home" | "gym" | "both";
  equipment: string[];
  time_preference: number; // INTEGER (minutes) - database field name
  intensity: "beginner" | "intermediate" | "advanced";
  workout_types: string[]; // TEXT[] - database field name
  primary_goals: string[]; // TEXT[] - database field name
  activity_level: string; // TEXT - database field name
  workout_frequency_per_week?: number; // INTEGER - how many days per week
  preferred_workout_times?: string[]; // TEXT[] - e.g., ['monday', 'wednesday', 'friday']
  prefers_variety?: boolean; // Whether user prefers variety in workouts

  // Backward compatibility - computed from snake_case fields
  timePreference?: number;
  workoutTypes?: string[];
  primaryGoals?: string[];
  activityLevel?: string;

  // Legacy compatibility fields
  workoutType?: string[];
  timeSlots?: string[];
  duration?: string;
}

export interface User {
  id: string;
  email: string;
  personalInfo: PersonalInfo;
  fitnessGoals: FitnessGoals;
  dietPreferences?: DietPreferences;
  workoutPreferences?: WorkoutPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  profilePicture?: string;
  preferences: {
    units: "metric" | "imperial";
    notifications: boolean;
    darkMode: boolean;
  };
  stats: {
    totalWorkouts: number;
    totalCaloriesBurned: number;
    currentStreak: number;
    longestStreak: number;
    achievements?: any[];
  };
  // ✅ NEW: Body metrics from body_analysis table
  bodyMetrics?: BodyMetrics;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  isEmailVerified: boolean;
  lastLoginAt: string;
  // Additional properties used in ProfileScreen
  name?: string;
  createdAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  confirmPassword: string;
}

// Onboarding types
export interface OnboardingData {
  personalInfo: PersonalInfo;
  fitnessGoals: FitnessGoals;
  dietPreferences?: {
    dietType: "vegetarian" | "vegan" | "non-veg" | "pescatarian";
    allergies: string[];
    cuisinePreferences: string[];
    restrictions: string[];
  };
  workoutPreferences?: {
    location: "home" | "gym" | "both";
    equipment: string[];
    time_preference: number;
    intensity: "beginner" | "intermediate" | "advanced";
    workout_types: string[];
    primary_goals: string[];
    activity_level: string;
  };
  bodyAnalysis?: {
    photos: {
      front?: string;
      back?: string;
      side?: string;
    };
    analysis?: {
      bodyType: string;
      muscleMass: string;
      bodyFat: string;
      fitnessLevel: string;
      recommendations: string[];
    };
  };
  isComplete: boolean;
}

// Activity levels
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "extreme";

// Gender options
export type Gender = "male" | "female" | "other";

// Experience levels
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

// Fitness goals
export type FitnessGoal =
  | "weight_loss"
  | "muscle_gain"
  | "strength"
  | "endurance"
  | "flexibility"
  | "general_fitness";

// Time commitment options
export type TimeCommitment = "15-30" | "30-45" | "45-60" | "60+";

// API request types used by userProfile service/store
export interface CreateProfileRequest extends PersonalInfo {}
export interface UpdateProfileRequest extends Partial<PersonalInfo> {}
export interface CreateFitnessGoalsRequest extends FitnessGoals {}
export interface UpdateFitnessGoalsRequest extends Partial<FitnessGoals> {}
