/**
 * DIET PREFERENCES TYPES (Tab 2)
 *
 * Types for dietary preferences and health habits (diet_preferences table)
 * Part of the onboarding flow - Tab 2
 */

// ============================================================================
// TAB 2: DIET PREFERENCES TYPES (diet_preferences table)
// ============================================================================
export interface DietPreferencesData {
  // Existing diet data (enhanced)
  diet_type: "vegetarian" | "vegan" | "non-veg" | "pescatarian";
  allergies: string[]; // TEXT[] in database
  restrictions: string[]; // TEXT[] in database
  cuisine_preferences?: string[]; // Cuisine preferences
  snacks_count?: number; // Number of snacks per day

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
  cooking_skill_level:
    | "beginner"
    | "intermediate"
    | "advanced"
    | "not_applicable";
  max_prep_time_minutes: number | null; // 5-180, null when not_applicable
  budget_level: "low" | "medium" | "high";

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

// Form state for UI components
export interface DietPreferencesFormState extends DietPreferencesData {
  // UI-specific fields
  errors: Partial<Record<keyof DietPreferencesData, string>>;
  is_loading: boolean;
  is_dirty: boolean;
  // Grouped health habits for UI display
  health_habits_grouped: HealthHabits;
}

// Database row type (matching database schema)
export interface DietPreferencesRow {
  id: string;
  user_id: string;
  diet_type?: "vegetarian" | "vegan" | "non-veg" | "pescatarian" | null;
  allergies?: string[] | null;
  restrictions?: string[] | null;
  keto_ready?: boolean | null;
  intermittent_fasting_ready?: boolean | null;
  paleo_ready?: boolean | null;
  mediterranean_ready?: boolean | null;
  low_carb_ready?: boolean | null;
  high_protein_ready?: boolean | null;
  breakfast_enabled?: boolean | null;
  lunch_enabled?: boolean | null;
  dinner_enabled?: boolean | null;
  snacks_enabled?: boolean | null;
  cooking_skill_level?:
    | "beginner"
    | "intermediate"
    | "advanced"
    | "not_applicable"
    | null;
  max_prep_time_minutes?: number | null;
  budget_level?: "low" | "medium" | "high" | null;
  drinks_enough_water?: boolean | null;
  limits_sugary_drinks?: boolean | null;
  eats_regular_meals?: boolean | null;
  avoids_late_night_eating?: boolean | null;
  controls_portion_sizes?: boolean | null;
  reads_nutrition_labels?: boolean | null;
  eats_processed_foods?: boolean | null;
  eats_5_servings_fruits_veggies?: boolean | null;
  limits_refined_sugar?: boolean | null;
  includes_healthy_fats?: boolean | null;
  drinks_alcohol?: boolean | null;
  smokes_tobacco?: boolean | null;
  drinks_coffee?: boolean | null;
  takes_supplements?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Validation rules for diet preferences
export const DIET_PREFERENCES_VALIDATION = {
  max_prep_time_minutes: { min: 5, max: 180 },
} as const;
