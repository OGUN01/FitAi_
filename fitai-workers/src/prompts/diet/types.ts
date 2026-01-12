/**
 * FitAI - Global Diet Prompt Types and Helpers
 * 
 * Supports 100+ countries with automatic cuisine detection.
 * All prompts use placeholders for dynamic content.
 */

// ============================================================================
// PLACEHOLDER TYPES
// ============================================================================

/**
 * All placeholders available for diet prompts
 * Includes ALL onboarding data for personalized generation
 */
export interface DietPlaceholders {
  // Location (determines cuisine style)
  COUNTRY: string;
  COUNTRY_CODE: string;
  STATE: string;
  CUISINE: string;

  // User profile
  DIET_TYPE: string;
  AGE: number;
  GENDER: string;
  OCCUPATION: string;

  // Allergies and restrictions
  ALLERGIES: string[];
  RESTRICTIONS: string[];

  // Nutrition targets (from Universal Health System)
  CALORIES: number;
  PROTEIN: number;
  CARBS: number;
  FATS: number;
  FIBER: number;
  WATER_LITERS: number;

  // Health context
  BMI: number;
  BMI_CATEGORY: string;
  FITNESS_GOAL: string;

  // Preferences
  COOKING_METHODS: string[];
  MEALS_ENABLED: string[];
  MEAL_EXCLUSION_INSTRUCTIONS: string; // Explicit instructions for meals NOT to generate
  
  // Medical conditions (optional)
  MEDICAL_CONDITIONS: string[];

  // ============================================
  // ONBOARDING DATA - User's cooking & lifestyle
  // ============================================
  
  // Cooking capabilities
  COOKING_SKILL: string;      // beginner, intermediate, advanced
  MAX_PREP_TIME: number;      // Max prep time in minutes
  BUDGET_LEVEL: string;       // low, medium, high

  // Diet readiness flags
  KETO_READY: boolean;
  LOW_CARB_READY: boolean;
  HIGH_PROTEIN_READY: boolean;
  INTERMITTENT_FASTING_READY: boolean;
  PALEO_READY: boolean;
  MEDITERRANEAN_READY: boolean;

  // Current eating habits (for personalized suggestions)
  DRINKS_ENOUGH_WATER: boolean;
  LIMITS_SUGARY_DRINKS: boolean;
  EATS_REGULAR_MEALS: boolean;
  AVOIDS_LATE_NIGHT_EATING: boolean;
  CONTROLS_PORTION_SIZES: boolean;
  READS_NUTRITION_LABELS: boolean;
  EATS_PROCESSED_FOODS: boolean;
  EATS_5_SERVINGS_FRUITS_VEGGIES: boolean;
  LIMITS_REFINED_SUGAR: boolean;
  INCLUDES_HEALTHY_FATS: boolean;

  // Lifestyle
  DRINKS_ALCOHOL: boolean;
  SMOKES_TOBACCO: boolean;
  DRINKS_COFFEE: boolean;
  TAKES_SUPPLEMENTS: boolean;
}

// ============================================================================
// CUISINE DETECTION (100+ COUNTRIES)
// ============================================================================

/**
 * Map country codes to cuisine types
 * ISO 3166-1 alpha-2 codes
 */
const CUISINE_MAP: Record<string, string> = {
  // Asia
  'IN': 'Indian',
  'CN': 'Chinese',
  'JP': 'Japanese',
  'KR': 'Korean',
  'TH': 'Thai',
  'VN': 'Vietnamese',
  'ID': 'Indonesian',
  'MY': 'Malaysian',
  'SG': 'Singaporean',
  'PH': 'Filipino',
  'PK': 'Pakistani',
  'BD': 'Bangladeshi',
  'LK': 'Sri Lankan',
  'NP': 'Nepali',
  'MM': 'Burmese',
  'KH': 'Cambodian',
  'LA': 'Laotian',
  'TW': 'Taiwanese',
  'HK': 'Hong Kong',
  'MO': 'Macanese',

  // Middle East
  'AE': 'Emirati',
  'SA': 'Saudi Arabian',
  'TR': 'Turkish',
  'IR': 'Persian',
  'IQ': 'Iraqi',
  'IL': 'Israeli',
  'LB': 'Lebanese',
  'SY': 'Syrian',
  'JO': 'Jordanian',
  'KW': 'Kuwaiti',
  'QA': 'Qatari',
  'BH': 'Bahraini',
  'OM': 'Omani',
  'YE': 'Yemeni',
  'EG': 'Egyptian',

  // Europe
  'GB': 'British',
  'FR': 'French',
  'DE': 'German',
  'IT': 'Italian',
  'ES': 'Spanish',
  'PT': 'Portuguese',
  'GR': 'Greek',
  'NL': 'Dutch',
  'BE': 'Belgian',
  'CH': 'Swiss',
  'AT': 'Austrian',
  'PL': 'Polish',
  'CZ': 'Czech',
  'HU': 'Hungarian',
  'RO': 'Romanian',
  'BG': 'Bulgarian',
  'SE': 'Swedish',
  'NO': 'Norwegian',
  'DK': 'Danish',
  'FI': 'Finnish',
  'IE': 'Irish',
  'RU': 'Russian',
  'UA': 'Ukrainian',
  'HR': 'Croatian',
  'RS': 'Serbian',
  'SK': 'Slovak',
  'SI': 'Slovenian',

  // Americas
  'US': 'American',
  'CA': 'Canadian',
  'MX': 'Mexican',
  'BR': 'Brazilian',
  'AR': 'Argentinian',
  'CO': 'Colombian',
  'PE': 'Peruvian',
  'CL': 'Chilean',
  'VE': 'Venezuelan',
  'EC': 'Ecuadorian',
  'BO': 'Bolivian',
  'PY': 'Paraguayan',
  'UY': 'Uruguayan',
  'CR': 'Costa Rican',
  'PA': 'Panamanian',
  'CU': 'Cuban',
  'DO': 'Dominican',
  'PR': 'Puerto Rican',
  'JM': 'Jamaican',
  'GT': 'Guatemalan',
  'HN': 'Honduran',
  'SV': 'Salvadoran',
  'NI': 'Nicaraguan',

  // Africa
  'ZA': 'South African',
  'NG': 'Nigerian',
  'KE': 'Kenyan',
  'ET': 'Ethiopian',
  'GH': 'Ghanaian',
  'TZ': 'Tanzanian',
  'UG': 'Ugandan',
  'MA': 'Moroccan',
  'DZ': 'Algerian',
  'TN': 'Tunisian',
  'SN': 'Senegalese',
  'CI': 'Ivorian',
  'CM': 'Cameroonian',
  'ZW': 'Zimbabwean',

  // Oceania
  'AU': 'Australian',
  'NZ': 'New Zealand',
  'FJ': 'Fijian',
  'PG': 'Papua New Guinean',

  // Central Asia
  'KZ': 'Kazakh',
  'UZ': 'Uzbek',
  'AF': 'Afghan',
  'GE': 'Georgian',
  'AM': 'Armenian',
  'AZ': 'Azerbaijani',
};

/**
 * Detect cuisine type from country code
 * Returns "International" if country not found
 */
export function detectCuisine(countryCode?: string): string {
  if (!countryCode) return 'International';
  return CUISINE_MAP[countryCode.toUpperCase()] || 'International';
}

/**
 * Get country name from code
 */
export function getCountryName(countryCode?: string): string {
  if (!countryCode) return 'Unknown';
  const cuisine = detectCuisine(countryCode);
  if (cuisine === 'International') return countryCode;
  // Remove "ese", "an", "ish" suffixes to get country name
  return cuisine.replace(/(ese|an|ish|i)$/, '');
}

// ============================================================================
// ALLERGY HELPERS
// ============================================================================

/**
 * Common allergen groups with all variations
 */
export const ALLERGEN_GROUPS: Record<string, string[]> = {
  peanut: ['peanut', 'groundnut', 'peanut butter', 'peanut oil', 'arachis'],
  tree_nut: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'chestnut', 'pine nut'],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'ghee', 'paneer', 'whey', 'casein', 'lactose'],
  egg: ['egg', 'albumin', 'mayonnaise', 'meringue'],
  soy: ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso', 'soy sauce'],
  gluten: ['wheat', 'barley', 'rye', 'gluten', 'semolina', 'couscous', 'seitan'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'oyster', 'clam', 'mussel', 'scallop'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'sardine', 'anchovy', 'mackerel'],
  sesame: ['sesame', 'tahini', 'sesame oil', 'sesame seeds'],
  mustard: ['mustard', 'mustard oil', 'mustard seeds'],
};

/**
 * Format allergies for prompt display
 */
export function formatAllergies(allergies: string[]): string {
  if (!allergies || allergies.length === 0) return 'None';
  
  const expanded: string[] = [];
  for (const allergy of allergies) {
    const group = ALLERGEN_GROUPS[allergy.toLowerCase()];
    if (group) {
      expanded.push(`${allergy.toUpperCase()} (including: ${group.join(', ')})`);
    } else {
      expanded.push(allergy.toUpperCase());
    }
  }
  return expanded.join('\n');
}

// ============================================================================
// MEDICAL CONDITION HELPERS
// ============================================================================

/**
 * Get dietary instructions for medical conditions
 */
export function getMedicalInstructions(conditions: string[]): string {
  if (!conditions || conditions.length === 0) return '';

  const instructions: string[] = [];
  
  for (const condition of conditions) {
    switch (condition.toLowerCase()) {
      case 'diabetes':
      case 'type_2_diabetes':
        instructions.push('DIABETES: Low glycemic index foods, limit sugar, moderate carbs, high fiber');
        break;
      case 'hypertension':
      case 'high_blood_pressure':
        instructions.push('HYPERTENSION: Low sodium (<2000mg/day), DASH diet friendly, potassium-rich foods');
        break;
      case 'heart_disease':
      case 'cardiovascular':
        instructions.push('HEART HEALTH: Low saturated fat, omega-3 rich, high fiber, limit sodium');
        break;
      case 'kidney_disease':
        instructions.push('KIDNEY: Moderate protein, low phosphorus, low potassium, low sodium');
        break;
      case 'gerd':
      case 'acid_reflux':
        instructions.push('GERD: Avoid spicy, acidic, fatty foods. Small frequent meals.');
        break;
      case 'ibs':
        instructions.push('IBS: Low FODMAP friendly, avoid trigger foods, easy to digest');
        break;
      case 'pcos':
        instructions.push('PCOS: Low glycemic, anti-inflammatory, moderate carbs, high protein');
        break;
      case 'thyroid':
      case 'hypothyroid':
        instructions.push('THYROID: Iodine-rich (if deficient), selenium, avoid goitrogens in excess');
        break;
    }
  }

  return instructions.length > 0 
    ? `\n⚕️ MEDICAL DIETARY REQUIREMENTS:\n${instructions.join('\n')}`
    : '';
}

// ============================================================================
// COOKING METHOD HELPERS
// ============================================================================

/**
 * Format cooking methods for prompt
 */
export function formatCookingMethods(methods: string[]): string {
  if (!methods || methods.length === 0) {
    return 'Any healthy cooking method (grilling, steaming, air frying, sautéing)';
  }
  return methods.join(', ');
}

// ============================================================================
// MEAL ENABLEMENT HELPERS
// ============================================================================

/**
 * Get enabled meals list
 */
export function getEnabledMealsList(prefs?: {
  breakfast_enabled?: boolean;
  lunch_enabled?: boolean;
  dinner_enabled?: boolean;
  snacks_enabled?: boolean;
}): string[] {
  if (!prefs) return ['Breakfast', 'Lunch', 'Dinner', '2 Snacks'];

  const meals: string[] = [];
  if (prefs.breakfast_enabled !== false) meals.push('Breakfast');
  if (prefs.lunch_enabled !== false) meals.push('Lunch');
  if (prefs.dinner_enabled !== false) meals.push('Dinner');
  if (prefs.snacks_enabled !== false) meals.push('2 Snacks');

  return meals.length > 0 ? meals : ['Breakfast', 'Lunch', 'Dinner'];
}

/**
 * Get explicit instructions for meals that should NOT be generated
 * Returns empty string if all meals are enabled
 */
export function getMealExclusionInstructions(prefs?: {
  breakfast_enabled?: boolean;
  lunch_enabled?: boolean;
  dinner_enabled?: boolean;
  snacks_enabled?: boolean;
}): string {
  if (!prefs) return '';
  
  const excluded: string[] = [];
  if (prefs.breakfast_enabled === false) excluded.push('BREAKFAST');
  if (prefs.lunch_enabled === false) excluded.push('LUNCH');
  if (prefs.dinner_enabled === false) excluded.push('DINNER');
  if (prefs.snacks_enabled === false) {
    excluded.push('ANY SNACKS (morning_snack, afternoon_snack, evening_snack)');
  }
  
  if (excluded.length === 0) return '';
  
  return `
════════════════════════════════════════════════════════════════════════════════
⛔ MEAL EXCLUSIONS - DO NOT GENERATE THESE MEALS:
════════════════════════════════════════════════════════════════════════════════
The user has DISABLED the following meal types. DO NOT include them in the plan:
${excluded.map(m => `❌ NO ${m}`).join('\n')}

IMPORTANT: Only generate meals that are in the "Meals to Generate" list above.
`;
}

// ============================================================================
// PERSONALIZED COOKING INSTRUCTIONS
// ============================================================================

/**
 * Get cooking instructions based on skill level
 */
export function getCookingSkillInstructions(skill: string): string {
  switch (skill?.toLowerCase()) {
    case 'beginner':
      return `
🔰 BEGINNER COOK - Keep recipes SIMPLE:
- Use basic cooking techniques (boiling, pan-frying, steaming)
- Prefer one-pot or one-pan meals
- Use readily available, common ingredients
- Provide step-by-step instructions
- Avoid complex techniques (tempering, julienning, etc.)
- Suggest pre-cut vegetables if available`;
    
    case 'intermediate':
      return `
👨‍🍳 INTERMEDIATE COOK:
- Can handle multi-step recipes
- Familiar with basic techniques
- Can follow moderately complex instructions
- Open to trying new ingredients`;
    
    case 'advanced':
      return `
⭐ ADVANCED COOK:
- Can handle complex recipes and techniques
- Appreciates authentic, traditional preparations
- Can improvise and adjust recipes
- Comfortable with specialty ingredients`;
    
    default:
      return '- Use accessible cooking techniques suitable for all skill levels';
  }
}

/**
 * Get prep time instructions
 */
export function getPrepTimeInstructions(maxMinutes: number): string {
  if (!maxMinutes || maxMinutes <= 0) return '';
  
  if (maxMinutes <= 15) {
    return `
⏱️ QUICK MEALS ONLY (Max ${maxMinutes} minutes):
- Use pre-cut vegetables, canned legumes
- Suggest meal prep shortcuts
- No-cook options for snacks
- Quick stir-fries, salads, smoothies`;
  } else if (maxMinutes <= 30) {
    return `
⏱️ TIME-EFFICIENT (Max ${maxMinutes} minutes):
- Simple recipes with minimal steps
- Prefer quick-cooking proteins (eggs, fish, chicken)
- Suggest batch cooking for efficiency`;
  } else if (maxMinutes <= 60) {
    return `
⏱️ MODERATE PREP TIME (Max ${maxMinutes} minutes):
- Can include slow-simmered dishes
- Balanced complexity
- Some elaborate meals okay`;
  }
  
  return `⏱️ Flexible cooking time (up to ${maxMinutes} minutes)`;
}

/**
 * Get budget-based instructions
 */
export function getBudgetInstructions(budget: string): string {
  switch (budget?.toLowerCase()) {
    case 'low':
      return `
💰 BUDGET-FRIENDLY MEALS:
- Use affordable protein sources (eggs, legumes, seasonal vegetables)
- Prefer whole grains over specialty items
- Avoid expensive cuts of meat (use thighs instead of breast)
- Suggest seasonal, local produce
- Include pantry staples (rice, lentils, oats)
- Minimize specialty or imported ingredients`;
    
    case 'high':
      return `
💎 PREMIUM INGREDIENTS ALLOWED:
- Can include premium proteins (salmon, ribeye, seafood)
- Fresh herbs and specialty ingredients okay
- Organic/free-range options acceptable
- Exotic fruits and imported items allowed`;
    
    default:
      return '- Use moderately priced, accessible ingredients';
  }
}

/**
 * Generate personalized suggestions based on user habits
 */
export function getPersonalizedSuggestions(p: DietPlaceholders): string {
  const suggestions: string[] = [];

  // Hydration
  if (!p.DRINKS_ENOUGH_WATER) {
    suggestions.push('💧 Include water-rich foods (cucumber, watermelon, soups) to improve hydration');
  }

  // Sugar habits
  if (!p.LIMITS_SUGARY_DRINKS || !p.LIMITS_REFINED_SUGAR) {
    suggestions.push('🍬 Minimize added sugars; use natural sweetness from fruits');
  }

  // Processed foods
  if (p.EATS_PROCESSED_FOODS) {
    suggestions.push('🥗 Gradually introduce whole foods; suggest healthier alternatives to processed items');
  }

  // Fruits and vegetables
  if (!p.EATS_5_SERVINGS_FRUITS_VEGGIES) {
    suggestions.push('🥬 Increase vegetable portions; add salads or veggie sides to each meal');
  }

  // Portion control
  if (!p.CONTROLS_PORTION_SIZES) {
    suggestions.push('📏 Include specific gram/cup measurements to help with portion awareness');
  }

  // Meal regularity
  if (!p.EATS_REGULAR_MEALS) {
    suggestions.push('⏰ Create consistent meal timing; include easy-prep options for busy days');
  }

  // Late night eating
  if (!p.AVOIDS_LATE_NIGHT_EATING) {
    suggestions.push('🌙 Suggest a satisfying dinner with protein/fiber to prevent late-night cravings');
  }

  // Healthy fats
  if (!p.INCLUDES_HEALTHY_FATS) {
    suggestions.push('🥑 Include sources of healthy fats (avocado, nuts, olive oil)');
  }

  // Lifestyle adjustments
  if (p.DRINKS_COFFEE) {
    suggestions.push('☕ Consider caffeine timing; suggest alternatives for afternoon energy');
  }

  if (p.DRINKS_ALCOHOL) {
    suggestions.push('🍷 If drinking, suggest lower-calorie options and account for alcohol calories');
  }

  if (p.TAKES_SUPPLEMENTS) {
    suggestions.push('💊 Note any foods that may interact with common supplements (calcium, iron)');
  }

  return suggestions.length > 0 
    ? `\n📋 PERSONALIZED SUGGESTIONS BASED ON YOUR HABITS:\n${suggestions.join('\n')}`
    : '';
}

