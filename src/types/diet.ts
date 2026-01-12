// Diet and Nutrition-related TypeScript type definitions

// ============================================================================
// NUTRITION TYPES
// ============================================================================

export interface Macronutrients {
  protein: number; // in grams
  carbohydrates: number; // in grams
  fat: number; // in grams
  fiber: number; // in grams
}

export interface Micronutrients {
  vitamins: Record<string, number>;
  minerals: Record<string, number>;
}

export interface NutritionInfo {
  calories: number; // per serving
  macros: Macronutrients;
  micros?: Micronutrients;
  servingSize: number; // in grams
  servingUnit: string; // 'g', 'ml', 'piece', 'cup', etc.
}

// ============================================================================
// FOOD TYPES
// ============================================================================

export interface Food {
  id: string;
  name: string;
  brand?: string;
  category: FoodCategory;
  nutrition: NutritionInfo;
  allergens: Allergen[];
  dietaryLabels: DietaryLabel[];
  barcode?: string;
  imageUrl?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FoodCategory =
  | 'fruits'
  | 'vegetables'
  | 'grains'
  | 'proteins'
  | 'dairy'
  | 'fats_oils'
  | 'beverages'
  | 'snacks'
  | 'condiments'
  | 'supplements'
  | 'prepared_foods'
  | 'other';

export type Allergen =
  | 'milk'
  | 'eggs'
  | 'fish'
  | 'shellfish'
  | 'tree_nuts'
  | 'peanuts'
  | 'wheat'
  | 'soybeans'
  | 'sesame';

export type DietaryLabel =
  | 'vegan'
  | 'vegetarian'
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_free'
  | 'organic'
  | 'non_gmo'
  | 'keto_friendly'
  | 'paleo_friendly'
  | 'low_carb'
  | 'high_protein'
  | 'low_sodium'
  | 'sugar_free';

// ============================================================================
// MEAL TYPES
// ============================================================================

export interface MealItem {
  id?: string; // Unique identifier for the meal item
  foodId: string;
  food: Food;
  name?: string; // Optional food name for direct display
  quantity: number | string; // in serving units or descriptive string (e.g., "100 grams")
  amount?: number; // Alternative to quantity
  unit?: string; // Optional unit for display (e.g., 'g', 'ml', 'piece', 'serving')
  calories: number;
  macros: Macronutrients;
  notes?: string;
  // Additional properties used in meal sessions
  category?: string;
  preparationTime?: number;
  instructions?: string[];
  preparation?: any;
  // Tracking
  isLogged?: boolean; // Whether this item has been logged by the user
}

export interface Meal {
  id: string;
  type: MealType;
  name: string;
  items: MealItem[];
  totalCalories: number;
  totalMacros: Macronutrients;
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes
  difficulty?: MealDifficulty;
  recipe?: Recipe;
  imageUrl?: string;
  tags: string[];
  isPersonalized: boolean;
  aiGenerated: boolean;
  scheduledTime?: string; // ISO string
  createdAt: string;
  updatedAt: string;
  // Additional properties used in DietScreen
  ingredients?: string[];
  instructions?: string[];
  preparationTime?: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';

export type MealDifficulty = 'easy' | 'medium' | 'hard';

export interface Recipe {
  instructions: string[];
  ingredients: RecipeIngredient[];
  cookingMethods: CookingMethod[];
  nutritionTips?: string[];
  substitutions?: Substitution[];
}

export interface RecipeIngredient {
  foodId: string;
  name: string;
  quantity: number;
  unit: string;
  preparation?: string; // 'chopped', 'diced', 'sliced', etc.
  optional?: boolean;
}

export type CookingMethod =
  | 'baking'
  | 'grilling'
  | 'frying'
  | 'steaming'
  | 'boiling'
  | 'sauteing'
  | 'roasting'
  | 'raw'
  | 'blending'
  | 'microwaving';

export interface Substitution {
  originalIngredient: string;
  substitute: string;
  ratio: number; // 1:1, 1:2, etc.
  notes?: string;
}

// ============================================================================
// MEAL PLANNING
// ============================================================================

export interface DailyMealPlan {
  date: string; // ISO date string
  meals: Meal[];
  totalCalories: number;
  totalMacros: Macronutrients;
  waterIntake: number; // in ml
  adherence?: number; // 0-100 percentage
  notes?: string;
}

export interface NutritionPlan {
  id: string;
  title: string;
  description: string;
  duration: number; // in days
  dailyPlans: DailyMealPlan[];
  calorieTarget: number;
  macroTargets: Macronutrients;
  dietaryRestrictions: DietaryRestriction[];
  goals: NutritionGoal[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'keto'
  | 'paleo'
  | 'mediterranean'
  | 'low_carb'
  | 'low_fat'
  | 'high_protein'
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_free'
  | 'halal'
  | 'kosher';

export type NutritionGoal =
  | 'weight_loss'
  | 'weight_gain'
  | 'muscle_gain'
  | 'maintenance'
  | 'performance'
  | 'health'
  | 'energy'
  | 'recovery';

// ============================================================================
// MEAL LOGGING
// ============================================================================

export interface MealLog {
  id: string;
  userId: string;
  date: string; // ISO date
  mealType: MealType;
  foods: LoggedFood[];
  totalCalories: number;
  totalMacros: Macronutrients;
  notes: string;
  photos: string[]; // photo URLs
  timestamp: string; // ISO timestamp
  mood?: MoodRating;
  hungerBefore?: HungerLevel;
  hungerAfter?: HungerLevel;
  satisfaction?: SatisfactionLevel;
}

export interface LoggedFood {
  foodId: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  macros: Macronutrients;
  mealItemId?: string; // if from a planned meal
}

export type MoodRating = 1 | 2 | 3 | 4 | 5; // 1 = very bad, 5 = excellent
export type HungerLevel = 1 | 2 | 3 | 4 | 5; // 1 = not hungry, 5 = very hungry
export type SatisfactionLevel = 1 | 2 | 3 | 4 | 5; // 1 = not satisfied, 5 = very satisfied

// ============================================================================
// NUTRITION PREFERENCES
// ============================================================================

export interface NutritionPreferences {
  dietaryRestrictions: DietaryRestriction[];
  allergens: Allergen[];
  dislikedFoods: string[];
  preferredCuisines: Cuisine[];
  mealFrequency: number; // meals per day
  snackFrequency: number; // snacks per day
  cookingSkill: CookingSkill;
  prepTimeLimit: number; // minutes
  budgetLevel: BudgetLevel;
  organicPreference: boolean;
  localPreference: boolean;
}

export type Cuisine =
  | 'american'
  | 'italian'
  | 'mexican'
  | 'chinese'
  | 'japanese'
  | 'indian'
  | 'thai'
  | 'mediterranean'
  | 'french'
  | 'greek'
  | 'middle_eastern'
  | 'korean'
  | 'vietnamese'
  | 'spanish'
  | 'german'
  | 'british'
  | 'african'
  | 'caribbean';

export type CookingSkill = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type BudgetLevel = 'low' | 'moderate' | 'high' | 'unlimited';

// ============================================================================
// NUTRITION ANALYTICS
// ============================================================================

export interface NutritionAnalytics {
  averageDailyCalories: number;
  averageDailyMacros: Macronutrients;
  calorieGoalAdherence: number; // percentage
  macroGoalAdherence: {
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
  };
  mealConsistency: number; // percentage
  favoriteFood: string;
  mostLoggedMealType: MealType;
  nutritionScore: number; // 0-100
  weeklyTrends: {
    week: string; // ISO week
    calories: number;
    macros: Macronutrients;
    adherence: number;
  }[];
  monthlyTrends: {
    month: string; // YYYY-MM
    calories: number;
    macros: Macronutrients;
    adherence: number;
  }[];
}

// ============================================================================
// WATER TRACKING
// ============================================================================

export interface WaterLog {
  id: string;
  userId: string;
  date: string; // ISO date
  amount: number; // ml
  timestamp: string; // ISO timestamp
  source?: WaterSource;
  temperature?: WaterTemperature;
  notes?: string;
}

export type WaterSource = 'tap' | 'bottled' | 'filtered' | 'sparkling' | 'flavored' | 'other';
export type WaterTemperature = 'cold' | 'room_temp' | 'warm' | 'hot';

export interface WaterGoal {
  dailyTarget: number; // ml
  reminderInterval: number; // minutes
  reminderEnabled: boolean;
  customReminders: WaterReminder[];
}

export interface WaterReminder {
  time: string; // HH:MM
  message: string;
  enabled: boolean;
}

// ============================================================================
// NUTRITION GOALS
// ============================================================================

export interface NutritionGoalTarget {
  id: string;
  userId: string;
  type: NutritionGoalType;
  target: number;
  unit: string;
  timeframe: GoalTimeframe;
  startDate: string; // ISO date
  endDate: string; // ISO date
  currentProgress: number;
  isAchieved: boolean;
  achievedDate?: string; // ISO date
  notes?: string;
}

export type NutritionGoalType =
  | 'daily_calories'
  | 'daily_protein'
  | 'daily_carbs'
  | 'daily_fat'
  | 'daily_fiber'
  | 'daily_water'
  | 'weekly_meal_prep'
  | 'monthly_weight_change'
  | 'reduce_sugar'
  | 'increase_vegetables'
  | 'consistent_logging';

export type GoalTimeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// ============================================================================
// MEAL GENERATION
// ============================================================================

export interface MealGenerationRequest {
  userId: string;
  mealType: MealType;
  calorieTarget?: number;
  macroTargets?: Partial<Macronutrients>;
  dietaryRestrictions: DietaryRestriction[];
  allergens: Allergen[];
  cuisinePreference?: Cuisine;
  prepTimeLimit?: number; // minutes
  difficulty?: MealDifficulty;
  ingredients?: string[]; // ingredients to include
  excludeIngredients?: string[]; // ingredients to avoid
  previousMeals?: string[]; // meal IDs to avoid repetition
}

export interface MealGenerationResponse {
  meal: Meal;
  alternatives?: Meal[];
  reasoning: string;
  nutritionAnalysis: string;
  cookingTips: string[];
  shoppingList: ShoppingListItem[];
}

export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  category: FoodCategory;
  estimated_cost?: number;
  notes?: string;
}

// ============================================================================
// NUTRITION EDUCATION
// ============================================================================

export interface NutritionTip {
  id: string;
  title: string;
  content: string;
  category: NutritionTipCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  sources: string[];
  imageUrl?: string;
  videoUrl?: string;
  isPersonalized: boolean;
  relevanceScore?: number; // 0-100 based on user profile
}

export type NutritionTipCategory =
  | 'macronutrients'
  | 'micronutrients'
  | 'hydration'
  | 'meal_timing'
  | 'food_prep'
  | 'supplements'
  | 'weight_management'
  | 'performance'
  | 'recovery'
  | 'general_health';

// ============================================================================
// FOOD SCANNING
// ============================================================================

export interface FoodScanResult {
  confidence: number; // 0-100
  recognizedFoods: RecognizedFood[];
  nutritionEstimate?: NutritionInfo;
  suggestions: string[];
  needsManualInput: boolean;
}

// Alias for backward compatibility
export interface FoodRecognitionResult extends FoodScanResult {
  foods?: RecognizedFood[]; // Alternative name for recognizedFoods
}

export interface RecognizedFood {
  name: string;
  confidence: number; // 0-100
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  estimatedQuantity?: {
    amount: number;
    unit: string;
  };
}
