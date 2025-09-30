// 🎯 ONBOARDING TYPES - PERFECTLY SYNCED WITH DATABASE SCHEMA
// Generated from STEP 1.1 database schema - DO NOT modify without updating database

// ============================================================================
// TAB 1: PERSONAL INFO TYPES (profiles table)
// ============================================================================
export interface PersonalInfoData {
  // Basic demographics
  first_name: string;
  last_name: string;
  age: number; // 13-120
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  // Location (3-tier system)
  country: string;
  state: string;
  region?: string;
  
  // Sleep schedule
  wake_time: string; // TIME format "HH:MM"
  sleep_time: string; // TIME format "HH:MM"
  
  // Legacy fields (keep for compatibility)
  email?: string;
  name?: string; // Will be computed from first_name + last_name
  height_cm?: number; // Moved to body_analysis but kept here for compatibility
  weight_kg?: number; // Moved to body_analysis but kept here for compatibility
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme'; // Moved to workout_preferences
  profile_picture?: string;
  dark_mode?: boolean;
  units?: 'metric' | 'imperial';
  notifications_enabled?: boolean;
}

// ============================================================================
// TAB 2: DIET PREFERENCES TYPES (diet_preferences table)
// ============================================================================
export interface DietPreferencesData {
  // Existing diet data (enhanced)
  diet_type: 'vegetarian' | 'vegan' | 'non-veg' | 'pescatarian';
  allergies: string[]; // TEXT[] in database
  cuisine_preferences: string[]; // TEXT[] in database
  restrictions: string[]; // TEXT[] in database
  
  // NEW: Diet readiness toggles (6 fields)
  keto_ready: boolean;
  intermittent_fasting_ready: boolean;
  paleo_ready: boolean;
  mediterranean_ready: boolean;
  low_carb_ready: boolean;
  high_protein_ready: boolean;
  
  // NEW: Meal preferences (4 fields)
  breakfast_enabled: boolean;
  lunch_enabled: boolean;
  dinner_enabled: boolean;
  snacks_enabled: boolean;
  
  // NEW: Cooking preferences (3 fields)
  cooking_skill_level: 'beginner' | 'intermediate' | 'advanced';
  max_prep_time_minutes: number; // 5-180
  budget_level: 'low' | 'medium' | 'high';
  
  // NEW: Health habits (14 boolean fields)
  drinks_enough_water: boolean;
  limits_sugary_drinks: boolean;
  eats_regular_meals: boolean;
  avoids_late_night_eating: boolean;
  controls_portion_sizes: boolean;
  reads_nutrition_labels: boolean;
  eats_processed_foods: boolean;
  eats_5_servings_fruits_veggies: boolean;
  limits_refined_sugar: boolean;
  includes_healthy_fats: boolean;
  drinks_alcohol: boolean;
  smokes_tobacco: boolean;
  drinks_coffee: boolean;
  takes_supplements: boolean;
}

// Helper type for health habits section
export interface HealthHabits {
  // Hydration habits
  hydration: {
    drinks_enough_water: boolean;
    limits_sugary_drinks: boolean;
  };
  
  // Eating patterns
  eating_patterns: {
    eats_regular_meals: boolean;
    avoids_late_night_eating: boolean;
    controls_portion_sizes: boolean;
    reads_nutrition_labels: boolean;
  };
  
  // Food choices
  food_choices: {
    eats_processed_foods: boolean;
    eats_5_servings_fruits_veggies: boolean;
    limits_refined_sugar: boolean;
    includes_healthy_fats: boolean;
  };
  
  // Substances
  substances: {
    drinks_alcohol: boolean;
    smokes_tobacco: boolean;
    drinks_coffee: boolean;
    takes_supplements: boolean;
  };
}

// ============================================================================
// TAB 3: BODY ANALYSIS TYPES (body_analysis table)
// ============================================================================
export interface BodyAnalysisData {
  // Basic measurements (required)
  height_cm: number; // DECIMAL(5,2), 100-250
  current_weight_kg: number; // DECIMAL(5,2), 30-300
  target_weight_kg: number; // DECIMAL(5,2), 30-300
  target_timeline_weeks: number; // INTEGER, 4-104
  
  // Body composition (optional)
  body_fat_percentage?: number; // DECIMAL(4,2), 3-50
  waist_cm?: number; // DECIMAL(5,2)
  hip_cm?: number; // DECIMAL(5,2)
  chest_cm?: number; // DECIMAL(5,2)
  
  // Photos (individual URLs instead of JSONB)
  front_photo_url?: string;
  side_photo_url?: string;
  back_photo_url?: string;
  
  // AI analysis results (RELIABLE ONLY)
  ai_estimated_body_fat?: number; // DECIMAL(4,2)
  ai_body_type?: 'ectomorph' | 'mesomorph' | 'endomorph';
  ai_confidence_score?: number; // INTEGER, 0-100
  
  // Medical information
  medical_conditions: string[]; // TEXT[]
  medications: string[]; // TEXT[]
  physical_limitations: string[]; // TEXT[]
  
  // Calculated values (auto-computed)
  bmi?: number; // DECIMAL(4,2)
  bmr?: number; // DECIMAL(7,2)
  ideal_weight_min?: number; // DECIMAL(5,2)
  ideal_weight_max?: number; // DECIMAL(5,2)
  waist_hip_ratio?: number; // DECIMAL(3,2)
  
  // Legacy JSONB fields (keep for backward compatibility)
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

// ============================================================================
// TAB 4: WORKOUT PREFERENCES TYPES (workout_preferences table)
// ============================================================================
export interface WorkoutPreferencesData {
  // Existing data (enhanced)
  location: 'home' | 'gym' | 'both';
  equipment: string[]; // TEXT[]
  time_preference: number; // INTEGER (minutes)
  intensity: 'beginner' | 'intermediate' | 'advanced';
  workout_types: string[]; // TEXT[]
  
  // NEW: Goals and activity (moved from profiles)
  primary_goals: string[]; // TEXT[]
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme';
  
  // NEW: Current fitness assessment
  workout_experience_years: number; // INTEGER, 0-50
  workout_frequency_per_week: number; // INTEGER, 0-7
  can_do_pushups: number; // INTEGER, 0-200
  can_run_minutes: number; // INTEGER, 0-300
  flexibility_level: 'poor' | 'fair' | 'good' | 'excellent';
  
  // NEW: Weight goals (populated from body_analysis)
  weekly_weight_loss_goal?: number; // DECIMAL(3,2)
  
  // NEW: Enhanced preferences
  preferred_workout_times: string[]; // TEXT[] - 'morning', 'afternoon', 'evening'
  enjoys_cardio: boolean;
  enjoys_strength_training: boolean;
  enjoys_group_classes: boolean;
  prefers_outdoor_activities: boolean;
  needs_motivation: boolean;
  prefers_variety: boolean;
}

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
}

// ============================================================================
// ONBOARDING PROGRESS TYPES (onboarding_progress table)
// ============================================================================
export interface OnboardingProgressData {
  current_tab: number; // INTEGER, 1-5
  completed_tabs: number[]; // INTEGER[]
  tab_validation_status: Record<number, TabValidationResult>; // JSONB
  total_completion_percentage: number; // INTEGER, 0-100
  started_at?: string; // TIMESTAMP
  completed_at?: string; // TIMESTAMP
  last_updated?: string; // TIMESTAMP
}

export interface TabValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  completion_percentage: number;
}

// ============================================================================
// COMPLETE ONBOARDING DATA TYPE
// ============================================================================
export interface CompleteOnboardingData {
  // Tab data
  personal_info: PersonalInfoData;
  diet_preferences: DietPreferencesData;
  body_analysis: BodyAnalysisData;
  workout_preferences: WorkoutPreferencesData;
  advanced_review: AdvancedReviewData;
  
  // Progress tracking
  onboarding_progress: OnboardingProgressData;
  
  // Metadata
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// FORM STATE TYPES FOR UI COMPONENTS
// ============================================================================

// Form state for each tab (includes UI-specific fields)
export interface PersonalInfoFormState extends PersonalInfoData {
  // UI-specific fields
  errors: Partial<Record<keyof PersonalInfoData, string>>;
  is_loading: boolean;
  is_dirty: boolean;
}

export interface DietPreferencesFormState extends DietPreferencesData {
  // UI-specific fields
  errors: Partial<Record<keyof DietPreferencesData, string>>;
  is_loading: boolean;
  is_dirty: boolean;
  // Grouped health habits for UI display
  health_habits_grouped: HealthHabits;
}

export interface BodyAnalysisFormState extends BodyAnalysisData {
  // UI-specific fields
  errors: Partial<Record<keyof BodyAnalysisData, string>>;
  is_loading: boolean;
  is_dirty: boolean;
  is_analyzing_photos: boolean;
  photo_upload_progress: Record<'front' | 'side' | 'back', number>;
}

export interface WorkoutPreferencesFormState extends WorkoutPreferencesData {
  // UI-specific fields
  errors: Partial<Record<keyof WorkoutPreferencesData, string>>;
  is_loading: boolean;
  is_dirty: boolean;
}

export interface AdvancedReviewFormState extends AdvancedReviewData {
  // UI-specific fields
  is_loading: boolean;
  calculation_status: 'pending' | 'calculating' | 'complete' | 'error';
  last_calculated_at?: string;
}

// ============================================================================
// API TYPES FOR DATABASE OPERATIONS
// ============================================================================

// Database row types (exactly matching database schema)
export interface ProfilesRow {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  height_cm?: number;
  weight_kg?: number;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme';
  profile_picture?: string;
  dark_mode?: boolean;
  units?: 'metric' | 'imperial';
  notifications_enabled?: boolean;
  country?: string;
  state?: string;
  region?: string;
  wake_time?: string;
  sleep_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DietPreferencesRow {
  id: string;
  user_id: string;
  diet_type?: 'vegetarian' | 'vegan' | 'non-veg' | 'pescatarian';
  allergies?: string[];
  cuisine_preferences?: string[];
  restrictions?: string[];
  keto_ready?: boolean;
  intermittent_fasting_ready?: boolean;
  paleo_ready?: boolean;
  mediterranean_ready?: boolean;
  low_carb_ready?: boolean;
  high_protein_ready?: boolean;
  breakfast_enabled?: boolean;
  lunch_enabled?: boolean;
  dinner_enabled?: boolean;
  snacks_enabled?: boolean;
  cooking_skill_level?: 'beginner' | 'intermediate' | 'advanced';
  max_prep_time_minutes?: number;
  budget_level?: 'low' | 'medium' | 'high';
  drinks_enough_water?: boolean;
  limits_sugary_drinks?: boolean;
  eats_regular_meals?: boolean;
  avoids_late_night_eating?: boolean;
  controls_portion_sizes?: boolean;
  reads_nutrition_labels?: boolean;
  eats_processed_foods?: boolean;
  eats_5_servings_fruits_veggies?: boolean;
  limits_refined_sugar?: boolean;
  includes_healthy_fats?: boolean;
  drinks_alcohol?: boolean;
  smokes_tobacco?: boolean;
  drinks_coffee?: boolean;
  takes_supplements?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BodyAnalysisRow {
  id: string;
  user_id: string;
  height_cm?: number;
  current_weight_kg?: number;
  target_weight_kg?: number;
  target_timeline_weeks?: number;
  body_fat_percentage?: number;
  waist_cm?: number;
  hip_cm?: number;
  chest_cm?: number;
  front_photo_url?: string;
  side_photo_url?: string;
  back_photo_url?: string;
  ai_estimated_body_fat?: number;
  ai_body_type?: 'ectomorph' | 'mesomorph' | 'endomorph';
  ai_confidence_score?: number;
  medical_conditions?: string[];
  medications?: string[];
  physical_limitations?: string[];
  bmi?: number;
  bmr?: number;
  ideal_weight_min?: number;
  ideal_weight_max?: number;
  waist_hip_ratio?: number;
  // Legacy JSONB fields
  photos?: any;
  analysis?: any;
  created_at?: string;
  updated_at?: string;
}

export interface WorkoutPreferencesRow {
  id: string;
  user_id: string;
  location?: 'home' | 'gym' | 'both';
  equipment?: string[];
  time_preference?: number;
  intensity?: 'beginner' | 'intermediate' | 'advanced';
  workout_types?: string[];
  primary_goals?: string[];
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme';
  workout_experience_years?: number;
  workout_frequency_per_week?: number;
  can_do_pushups?: number;
  can_run_minutes?: number;
  flexibility_level?: 'poor' | 'fair' | 'good' | 'excellent';
  weekly_weight_loss_goal?: number;
  preferred_workout_times?: string[];
  enjoys_cardio?: boolean;
  enjoys_strength_training?: boolean;
  enjoys_group_classes?: boolean;
  prefers_outdoor_activities?: boolean;
  needs_motivation?: boolean;
  prefers_variety?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdvancedReviewRow {
  id: string;
  user_id: string;
  calculated_bmi?: number;
  calculated_bmr?: number;
  calculated_tdee?: number;
  metabolic_age?: number;
  daily_calories?: number;
  daily_protein_g?: number;
  daily_carbs_g?: number;
  daily_fat_g?: number;
  daily_water_ml?: number;
  daily_fiber_g?: number;
  healthy_weight_min?: number;
  healthy_weight_max?: number;
  weekly_weight_loss_rate?: number;
  estimated_timeline_weeks?: number;
  total_calorie_deficit?: number;
  ideal_body_fat_min?: number;
  ideal_body_fat_max?: number;
  lean_body_mass?: number;
  fat_mass?: number;
  estimated_vo2_max?: number;
  target_hr_fat_burn_min?: number;
  target_hr_fat_burn_max?: number;
  target_hr_cardio_min?: number;
  target_hr_cardio_max?: number;
  target_hr_peak_min?: number;
  target_hr_peak_max?: number;
  recommended_workout_frequency?: number;
  recommended_cardio_minutes?: number;
  recommended_strength_sessions?: number;
  overall_health_score?: number;
  diet_readiness_score?: number;
  fitness_readiness_score?: number;
  goal_realistic_score?: number;
  recommended_sleep_hours?: number;
  current_sleep_duration?: number;
  sleep_efficiency_score?: number;
  data_completeness_percentage?: number;
  reliability_score?: number;
  personalization_level?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OnboardingProgressRow {
  id: string;
  user_id: string;
  current_tab?: number;
  completed_tabs?: number[];
  tab_validation_status?: any; // JSONB
  total_completion_percentage?: number;
  started_at?: string;
  completed_at?: string;
  last_updated?: string;
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_RULES = {
  personal_info: {
    age: { min: 13, max: 120 },
    first_name: { min_length: 1, max_length: 50 },
    last_name: { min_length: 1, max_length: 50 },
    country: { required: true },
    state: { required: true },
    wake_time: { required: true, format: 'HH:MM' },
    sleep_time: { required: true, format: 'HH:MM' },
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
    cuisine_preferences: { min_items: 1 },
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

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// Note: All types are already exported with their interface/type declarations above
// No need for duplicate export statements
