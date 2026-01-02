/**
 * FitAI - Diet Prompt Router
 * 
 * Routes to the correct specialized prompt based on diet type.
 * Builds placeholders from user data.
 */

import { 
  DietPlaceholders, 
  detectCuisine, 
  getEnabledMealsList,
  getCookingSkillInstructions,
  getPrepTimeInstructions,
  getBudgetInstructions,
  getPersonalizedSuggestions
} from './types';
import { buildVeganPrompt } from './vegan';
import { buildVegetarianPrompt } from './vegetarian';
import { buildPescatarianPrompt } from './pescatarian';
import { buildNonVegPrompt } from './nonVeg';
import { buildKetoPrompt } from './keto';

// Import types from validation
import { UserProfileContext, DietPreferences } from '../../utils/validation';
import { UserHealthMetrics } from '../../services/userMetricsService';

// ============================================================================
// PLACEHOLDER BUILDER
// ============================================================================

/**
 * Build placeholders from user data
 * Converts raw database data into prompt placeholders
 * Includes ALL onboarding data for truly personalized generation
 */
export function buildPlaceholdersFromUserData(
  metrics: UserHealthMetrics,
  profile: UserProfileContext | null,
  prefs: DietPreferences | null
): DietPlaceholders {
  const countryCode = profile?.country || 'US';
  const cuisine = detectCuisine(countryCode);
  
  return {
    // Location
    COUNTRY: getCountryName(countryCode),
    COUNTRY_CODE: countryCode,
    STATE: profile?.state || 'Unknown',
    CUISINE: cuisine,
    
    // User profile
    DIET_TYPE: prefs?.diet_type || 'non-veg',
    AGE: profile?.age || 30,
    GENDER: profile?.gender || 'unknown',
    OCCUPATION: profile?.occupation_type || 'general',
    
    // Allergies and restrictions
    ALLERGIES: prefs?.allergies || [],
    RESTRICTIONS: prefs?.restrictions || [],
    
    // Nutrition targets (from Universal Health System)
    CALORIES: metrics.daily_calories,
    PROTEIN: metrics.daily_protein_g,
    CARBS: metrics.daily_carbs_g,
    FATS: metrics.daily_fat_g,
    FIBER: metrics.daily_fiber_g || 25,
    WATER_LITERS: Math.round(metrics.daily_water_ml / 1000 * 10) / 10,
    
    // Health context
    BMI: metrics.calculated_bmi || 0,
    BMI_CATEGORY: metrics.bmi_category || 'Unknown',
    FITNESS_GOAL: profile?.fitness_goal || 'maintenance',
    
    // Preferences
    COOKING_METHODS: prefs?.cooking_methods || [],
    MEALS_ENABLED: getEnabledMealsList(prefs),
    
    // Medical conditions
    MEDICAL_CONDITIONS: prefs?.medical_conditions || [],

    // ============================================
    // ONBOARDING DATA - User's cooking & lifestyle
    // ============================================
    
    // Cooking capabilities (from diet_preferences)
    COOKING_SKILL: (prefs as any)?.cooking_skill_level || 'intermediate',
    MAX_PREP_TIME: (prefs as any)?.max_prep_time_minutes || 60,
    BUDGET_LEVEL: (prefs as any)?.budget_level || 'medium',
    
    // Diet readiness flags
    KETO_READY: (prefs as any)?.keto_ready || false,
    LOW_CARB_READY: (prefs as any)?.low_carb_ready || false,
    HIGH_PROTEIN_READY: (prefs as any)?.high_protein_ready || false,
    INTERMITTENT_FASTING_READY: (prefs as any)?.intermittent_fasting_ready || false,
    PALEO_READY: (prefs as any)?.paleo_ready || false,
    MEDITERRANEAN_READY: (prefs as any)?.mediterranean_ready || false,
    
    // Current eating habits (for personalized suggestions)
    DRINKS_ENOUGH_WATER: (prefs as any)?.drinks_enough_water ?? true,
    LIMITS_SUGARY_DRINKS: (prefs as any)?.limits_sugary_drinks ?? true,
    EATS_REGULAR_MEALS: (prefs as any)?.eats_regular_meals ?? true,
    AVOIDS_LATE_NIGHT_EATING: (prefs as any)?.avoids_late_night_eating ?? true,
    CONTROLS_PORTION_SIZES: (prefs as any)?.controls_portion_sizes ?? true,
    READS_NUTRITION_LABELS: (prefs as any)?.reads_nutrition_labels ?? false,
    EATS_PROCESSED_FOODS: (prefs as any)?.eats_processed_foods ?? false,
    EATS_5_SERVINGS_FRUITS_VEGGIES: (prefs as any)?.eats_5_servings_fruits_veggies ?? false,
    LIMITS_REFINED_SUGAR: (prefs as any)?.limits_refined_sugar ?? true,
    INCLUDES_HEALTHY_FATS: (prefs as any)?.includes_healthy_fats ?? true,
    
    // Lifestyle
    DRINKS_ALCOHOL: (prefs as any)?.drinks_alcohol ?? false,
    SMOKES_TOBACCO: (prefs as any)?.smokes_tobacco ?? false,
    DRINKS_COFFEE: (prefs as any)?.drinks_coffee ?? true,
    TAKES_SUPPLEMENTS: (prefs as any)?.takes_supplements ?? false,
  };
}

/**
 * Get country name from code (simplified mapping)
 */
function getCountryName(code: string): string {
  const names: Record<string, string> = {
    'US': 'United States',
    'IN': 'India',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'JP': 'Japan',
    'CN': 'China',
    'MX': 'Mexico',
    'BR': 'Brazil',
    'IT': 'Italy',
    'ES': 'Spain',
    'KR': 'South Korea',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'ID': 'Indonesia',
    'MY': 'Malaysia',
    'SG': 'Singapore',
    'PH': 'Philippines',
    'PK': 'Pakistan',
    'BD': 'Bangladesh',
    'AE': 'United Arab Emirates',
    'SA': 'Saudi Arabia',
    'TR': 'Turkey',
    'ZA': 'South Africa',
    'NG': 'Nigeria',
    'KE': 'Kenya',
    'EG': 'Egypt',
    'AR': 'Argentina',
    'CO': 'Colombia',
    'PE': 'Peru',
    'CL': 'Chile',
    'NZ': 'New Zealand',
    'SE': 'Sweden',
    'NO': 'Norway',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'PL': 'Poland',
    'RU': 'Russia',
    'UA': 'Ukraine',
    'GR': 'Greece',
    'PT': 'Portugal',
    'IE': 'Ireland',
  };
  
  return names[code.toUpperCase()] || code;
}

// ============================================================================
// DIET PROMPT ROUTER
// ============================================================================

/**
 * Build the appropriate diet prompt based on diet type
 * Routes to specialized prompts for each diet type
 * 
 * @param metrics - User health metrics from Universal Health System
 * @param profile - User profile (age, gender, location)
 * @param prefs - Diet preferences (type, allergies, cooking methods)
 * @returns Complete prompt string for AI generation
 */
export function buildDietPrompt(
  metrics: UserHealthMetrics,
  profile: UserProfileContext | null,
  prefs: DietPreferences | null
): string {
  // Build placeholders from user data
  const placeholders = buildPlaceholdersFromUserData(metrics, profile, prefs);
  
  // Get diet type (default to non-veg/omnivore)
  const dietType = (prefs?.diet_type || 'non-veg').toLowerCase().trim();
  
  console.log('[DietPrompt] Building prompt for:', {
    dietType,
    cuisine: placeholders.CUISINE,
    country: placeholders.COUNTRY,
    calories: placeholders.CALORIES,
    protein: placeholders.PROTEIN,
    allergies: placeholders.ALLERGIES.length,
  });
  
  // Route to specialized prompt based on diet type
  switch (dietType) {
    case 'vegan':
      return buildVeganPrompt(placeholders);
      
    case 'vegetarian':
    case 'lacto-vegetarian':
    case 'ovo-vegetarian':
    case 'lacto-ovo-vegetarian':
      return buildVegetarianPrompt(placeholders);
      
    case 'pescatarian':
    case 'pescetarian':
      return buildPescatarianPrompt(placeholders);
      
    case 'keto':
    case 'ketogenic':
    case 'low-carb':
    case 'lchf':
      return buildKetoPrompt(placeholders);
      
    case 'non-veg':
    case 'nonveg':
    case 'non-vegetarian':
    case 'omnivore':
    case 'all':
    default:
      return buildNonVegPrompt(placeholders);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DietPlaceholders } from './types';
export { buildVeganPrompt } from './vegan';
export { buildVegetarianPrompt } from './vegetarian';
export { buildPescatarianPrompt } from './pescatarian';
export { buildNonVegPrompt } from './nonVeg';
export { buildKetoPrompt } from './keto';

