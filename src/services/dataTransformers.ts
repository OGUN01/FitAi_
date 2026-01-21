/**
 * Response Transformer Utilities
 *
 * Converts Cloudflare Workers API responses to mobile app format.
 *
 * **Key Features:**
 * - Transform Workers diet response to app's DayMeal format
 * - Transform Workers workout response to app's DayWorkout format
 * - Handle validation errors and warnings
 * - Map cuisine metadata
 * - Preserve all nutrition data
 * - Handle missing/optional fields gracefully
 * - Comprehensive type safety
 *
 * **Workers Response Formats:**
 * - Diet: { success, data: { meals, totalCalories, totalNutrition }, metadata }
 * - Workout: { success, data: { warmup, exercises, cooldown }, metadata }
 *
 * **App Formats:**
 * - DayMeal: Full meal plan with totalCalories, totalProtein, totalCarbs, totalFat
 * - DayWorkout: Full workout with warmup, exercises, cooldown, metadata
 */

import { generateUUID } from '../utils/uuid';
import { DayMeal, ExerciseInstruction, DayWorkout } from '../types/ai';
import { Meal, MealItem, Macronutrients, Food, FoodCategory } from '../types/diet';
import {
  Workout,
  Exercise,
  WorkoutSet
} from '../types/workout';
// Note: MET-based calorie calculation happens at workout completion (completionTracking.ts)
// where we have access to the user's actual weight from their profile

// ============================================================================
// WORKERS API RESPONSE TYPES
// ============================================================================

/**
 * Workers Diet API Response Structure
 */
export interface WorkersDietResponse {
  success: boolean;
  data: {
    title: string;
    meals: WorkersMeal[];
    dailyTotals: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  metadata: {
    cuisine?: string;
    model?: string;
    aiGenerationTime?: number;
    tokensUsed?: number;
    costUsd?: number;
    validationPassed?: boolean;
    warningsCount?: number;
    warnings?: ValidationWarning[];
    adjustmentApplied?: boolean;
    nutritionalAccuracy?: {
      targetCalories: number;
      actualCalories: number;
      difference: number;
      targetProtein: number;
      actualProtein: number;
      targetCarbs: number;
      actualCarbs: number;
      targetFat: number;
      actualFat: number;
    };
  };
}

export interface WorkersMeal {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: WorkersFood[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  cookingMethod?: string;
  preparationTime?: number;
  cookingInstructions?: string[];
  tips?: string[];
}

export interface WorkersFood {
  name: string;
  quantity: number;
  unit: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface ValidationWarning {
  severity: 'WARNING' | 'INFO';
  code: string;
  message: string;
  action?: string;
}

/**
 * Workers Workout API Response Structure
 */
export interface WorkersWorkoutResponse {
  success: boolean;
  data: {
    title: string;
    warmup: WorkersExercise[];
    exercises: WorkersExercise[];
    cooldown: WorkersExercise[];
    totalDuration: number;
  };
  metadata: {
    model?: string;
    aiGenerationTime?: number;
    tokensUsed?: number;
    costUsd?: number;
    filterStats?: {
      initial: number;
      afterEquipment: number;
      afterExperience: number;
      afterInjuries: number;
      final: number;
    };
    usedCalculatedMetrics?: boolean;
    calculatedMetricsSummary?: {
      bmr?: number;
      tdee?: number;
      vo2max?: number;
      hasHeartRateZones?: boolean;
    };
    validation?: {
      exercisesValidated: boolean;
      invalidExercisesFound: number;
      replacementsMade: number;
      gifCoverageVerified: boolean;
      warnings: string[];
    };
  };
}

export interface WorkersExercise {
  exerciseId: string;
  sets?: number;
  reps?: number | string;
  duration?: number;
  restTime?: number;
  notes?: string;
  exerciseData?: {
    exerciseId: string;
    name: string;
    bodyParts: string[];
    targetMuscles: string[];
    equipments: string[];
    gifUrl: string;
    instructions?: string[];
  };
}

/**
 * User-friendly error format for validation failures
 */
export interface UserFriendlyError {
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
  suggestions?: string[];
  metadata?: Record<string, any>;
}

// ============================================================================
// DIET RESPONSE TRANSFORMATION
// ============================================================================

/**
 * Transform Workers diet response to app's DayMeal format
 *
 * **Transformation Details:**
 * - Converts Workers meals to app Meal format
 * - Maps food items to MealItem format
 * - Preserves all nutrition data
 * - Generates UUID for meal plan
 * - Handles missing/optional fields gracefully
 * - Maps cuisine metadata
 *
 * @param workersResponse - Response from Workers diet generation API
 * @param userId - User ID to associate with meal plan
 * @param date - Date for the meal plan (ISO string)
 * @returns DayMeal object compatible with app
 */
export function transformDietResponse(
  workersResponse: WorkersDietResponse,
  userId: string,
  date: string = new Date().toISOString()
): DayMeal {
  if (!workersResponse.success) {
    throw new Error('Workers API returned unsuccessful response');
  }

  const { data, metadata } = workersResponse;

  // Transform each meal
  const meals: Meal[] = data.meals.map((workersMeal) => {
    return transformWorkersMealToAppMeal(workersMeal);
  });

  // Build DayMeal object
  const dayMeal: DayMeal = {
    id: generateUUID(),
    type: 'breakfast', // This will be overridden by individual meals
    name: data.title || 'Daily Meal Plan',
    description: metadata.cuisine
      ? `${metadata.cuisine} cuisine meal plan`
      : 'AI-generated meal plan',
    items: [], // Not used in DayMeal format - meals have their own items
    totalCalories: data.dailyTotals.calories,
    totalMacros: {
      protein: data.dailyTotals.protein,
      carbohydrates: data.dailyTotals.carbs,
      fat: data.dailyTotals.fat,
      fiber: 0, // Not provided by Workers API
    },
    preparationTime: calculateTotalPrepTime(data.meals),
    cookingTime: calculateTotalCookingTime(data.meals),
    cookingInstructions: buildCombinedCookingInstructions(data.meals),
    difficulty: determineDifficulty(data.meals),
    tags: buildTags(data.meals, metadata),
    dayOfWeek: getDayOfWeek(date),
    isPersonalized: true,
    aiGenerated: true,
    createdAt: new Date().toISOString(),
  };

  return dayMeal;
}

/**
 * Transform a single Workers meal to app Meal format
 */
function transformWorkersMealToAppMeal(workersMeal: WorkersMeal): Meal {
  const mealId = generateUUID();

  // Transform food items to MealItem format
  const items: MealItem[] = workersMeal.foods.map((workersFood) => {
    return transformWorkersFoodToMealItem(workersFood);
  });

  const meal: Meal = {
    id: mealId,
    type: workersMeal.type,
    name: workersMeal.name,
    items,
    totalCalories: workersMeal.totalNutrition.calories,
    totalMacros: {
      protein: workersMeal.totalNutrition.protein,
      carbohydrates: workersMeal.totalNutrition.carbs,
      fat: workersMeal.totalNutrition.fat,
      fiber: 0, // Not provided by Workers API
    },
    prepTime: workersMeal.preparationTime || 15,
    cookTime: workersMeal.cookingInstructions ? 30 : undefined,
    difficulty: workersMeal.cookingInstructions && workersMeal.cookingInstructions.length > 5
      ? 'medium'
      : 'easy',
    tags: buildMealTags(workersMeal),
    isPersonalized: true,
    aiGenerated: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Add recipe if cooking instructions are provided
  if (workersMeal.cookingInstructions && workersMeal.cookingInstructions.length > 0) {
    meal.recipe = {
      instructions: workersMeal.cookingInstructions,
      ingredients: workersMeal.foods.map((food) => ({
        foodId: generateUUID(),
        name: food.name,
        quantity: food.quantity,
        unit: food.unit,
      })),
      cookingMethods: [determineCookingMethod(workersMeal.cookingMethod)],
      nutritionTips: workersMeal.tips,
    };
  }

  return meal;
}

/**
 * Transform Workers food item to app MealItem format
 */
function transformWorkersFoodToMealItem(workersFood: WorkersFood): MealItem {
  const foodId = generateUUID();

  // Create a basic Food object for the MealItem
  const food: Food = {
    id: foodId,
    name: workersFood.name,
    category: categorizeFoodByName(workersFood.name),
    nutrition: {
      calories: workersFood.nutrition.calories,
      macros: {
        protein: workersFood.nutrition.protein,
        carbohydrates: workersFood.nutrition.carbs,
        fat: workersFood.nutrition.fat,
        fiber: 0, // Not provided by Workers API
      },
      servingSize: workersFood.quantity,
      servingUnit: workersFood.unit,
    },
    allergens: [], // Not provided by Workers API
    dietaryLabels: [], // Not provided by Workers API
    verified: true, // From Workers API, considered verified
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mealItem: MealItem = {
    foodId,
    food,
    name: workersFood.name,
    quantity: workersFood.quantity,
    unit: workersFood.unit,
    calories: workersFood.nutrition.calories,
    macros: {
      protein: workersFood.nutrition.protein,
      carbohydrates: workersFood.nutrition.carbs,
      fat: workersFood.nutrition.fat,
      fiber: 0,
    },
  };

  return mealItem;
}

// ============================================================================
// WORKOUT RESPONSE TRANSFORMATION
// ============================================================================

/**
 * Transform Workers workout response to app's DayWorkout format
 *
 * **Transformation Details:**
 * - Converts Workers exercises to app Exercise format
 * - Maps warmup, main exercises, and cooldown
 * - Preserves all workout metadata
 * - Generates UUID for workout
 * - Handles missing/optional fields gracefully
 * - Includes GIF URLs and instructions
 *
 * @param workersResponse - Response from Workers workout generation API
 * @param userId - User ID to associate with workout
 * @param date - Date for the workout (ISO string)
 * @returns DayWorkout object compatible with app
 */
export function transformWorkoutResponse(
  workersResponse: WorkersWorkoutResponse,
  userId: string,
  date: string = new Date().toISOString()
): DayWorkout {
  if (!workersResponse.success) {
    throw new Error('Workers API returned unsuccessful response');
  }

  const { data, metadata } = workersResponse;

  // Transform warmup exercises
  const warmUp: ExerciseInstruction[] = (data.warmup || []).map(ex => ({
    name: ex.exerciseData?.name || 'Unknown Exercise',
    duration: ex.duration,
    instructions: ex.exerciseData?.instructions?.join('\n') || ex.notes || '',
  }));

  // Transform cooldown exercises
  const coolDown: ExerciseInstruction[] = (data.cooldown || []).map(ex => ({
    name: ex.exerciseData?.name || 'Unknown Exercise',
    duration: ex.duration,
    instructions: ex.exerciseData?.instructions?.join('\n') || ex.notes || '',
  }));

  // Transform main exercises
  const exercises: WorkoutSet[] = (data.exercises || []).map(workersEx => {
    return transformWorkersExerciseToWorkoutSet(workersEx);
  });

  // Determine difficulty from metadata or default
  const workoutDifficulty = determineWorkoutDifficulty(metadata);
  
  // Build DayWorkout object
  const dayWorkout: DayWorkout = {
    id: generateUUID(),
    title: data.title || 'AI-Generated Workout',
    description: buildWorkoutDescription(data, metadata),
    category: 'strength', // Default, can be inferred from exercises
    difficulty: workoutDifficulty,
    duration: data.totalDuration || 60,
    estimatedCalories: estimateCaloriesBurned(data.totalDuration || 60, metadata, data.exercises, workoutDifficulty),
    exercises,
    warmup: exercises.slice(0, 2), // First 2 for warmup
    cooldown: exercises.slice(-2), // Last 2 for cooldown
    equipment: extractEquipmentList(data),
    targetMuscleGroups: extractTargetMuscles(data),
    icon: '💪',
    tags: buildWorkoutTags(data, metadata),
    isPersonalized: true,
    aiGenerated: true,
    createdAt: new Date().toISOString(),

    // DayWorkout-specific fields
    dayOfWeek: getDayOfWeek(date),
    subCategory: determineWorkoutSubCategory(data),
    intensityLevel: determineIntensityLevel(metadata),
    warmUp,
    coolDown,
    progressionNotes: buildProgressionNotes(metadata),
    safetyConsiderations: buildSafetyConsiderations(data),
    expectedBenefits: buildExpectedBenefits(data, metadata),
  };

  return dayWorkout;
}

/**
 * Transform Workers exercise to app WorkoutSet format
 */
function transformWorkersExerciseToWorkoutSet(workersEx: WorkersExercise): WorkoutSet {
  return {
    exerciseId: workersEx.exerciseId,
    name: workersEx.exerciseData?.name,        // ✅ Preserve exercise name
    exerciseData: workersEx.exerciseData,      // ✅ Preserve full exercise data
    sets: workersEx.sets || 3,
    reps: workersEx.reps || 12,
    duration: workersEx.duration,
    restTime: workersEx.restTime || 60,
    notes: workersEx.notes,
  };
}

// ============================================================================
// VALIDATION ERROR TRANSFORMATION
// ============================================================================

/**
 * Transform validation errors/warnings to user-friendly format
 *
 * **Handles:**
 * - Critical validation errors (allergens, diet violations)
 * - Quality warnings (calorie drift, low protein)
 * - API errors
 * - Missing data errors
 *
 * @param errors - Array of validation errors/warnings
 * @returns Array of user-friendly error objects
 */
export function transformValidationErrors(
  errors: ValidationWarning[] | any[]
): UserFriendlyError[] {
  if (!errors || errors.length === 0) {
    return [];
  }

  return errors.map((error): UserFriendlyError => {
    // Handle Workers validation warnings
    if (typeof error === 'object' && error !== null && 'severity' in error && 'code' in error) {
      return {
        title: formatErrorTitle(error.code),
        message: error.message,
        severity: error.severity === 'WARNING' ? 'warning' : 'info',
        code: error.code,
        suggestions: error.action ? [error.action] : [],
        metadata: error,
      };
    }

    // Handle generic errors
    return {
      title: 'Validation Error',
      message: typeof error === 'string' ? error : (error?.message || 'Unknown error'),
      severity: 'error',
      suggestions: ['Please try again or contact support'],
    };
  });
}

/**
 * Format error code to user-friendly title
 */
function formatErrorTitle(code: string): string {
  const titles: Record<string, string> = {
    'ALLERGEN_DETECTED': 'Allergen Detected',
    'DIET_TYPE_VIOLATION': 'Diet Restriction Violated',
    'EXTREME_CALORIE_DRIFT': 'Calorie Target Missed',
    'MODERATE_CALORIE_DRIFT': 'Calorie Adjustment Applied',
    'LOW_PROTEIN': 'Low Protein Warning',
    'LOW_VARIETY': 'Limited Food Variety',
    'MISSING_REQUIRED_FIELDS': 'Missing Information',
    'INCOMPLETE_FOOD_DATA': 'Incomplete Nutrition Data',
  };

  return titles[code] || 'Validation Issue';
}

// ============================================================================
// HELPER FUNCTIONS - DIET
// ============================================================================

/**
 * Calculate total prep time for all meals
 */
function calculateTotalPrepTime(meals: WorkersMeal[]): number {
  return meals.reduce((total, meal) => total + (meal.preparationTime || 15), 0);
}

/**
 * Calculate total cooking time for all meals
 */
function calculateTotalCookingTime(meals: WorkersMeal[]): number | undefined {
  const total = meals.reduce((sum, meal) => {
    const hasCooking = meal.cookingInstructions && meal.cookingInstructions.length > 0;
    return sum + (hasCooking ? 30 : 0);
  }, 0);

  return total > 0 ? total : undefined;
}

/**
 * Build combined cooking instructions for all meals
 */
function buildCombinedCookingInstructions(meals: WorkersMeal[]): Array<{ step: number; instruction: string; timeRequired?: number }> | undefined {
  const instructions: Array<{ step: number; instruction: string; timeRequired?: number }> = [];

  let stepNumber = 1;
  meals.forEach((meal) => {
    if (meal.cookingInstructions && meal.cookingInstructions.length > 0) {
      instructions.push({
        step: stepNumber++,
        instruction: `${meal.name}:`,
        timeRequired: meal.preparationTime,
      });

      meal.cookingInstructions.forEach((instruction) => {
        instructions.push({
          step: stepNumber++,
          instruction,
        });
      });
    }
  });

  return instructions.length > 0 ? instructions : undefined;
}

/**
 * Determine overall difficulty based on meals
 */
function determineDifficulty(meals: WorkersMeal[]): 'easy' | 'medium' | 'hard' {
  const maxInstructions = Math.max(
    ...meals.map(m => m.cookingInstructions?.length || 0)
  );

  if (maxInstructions > 8) return 'hard';
  if (maxInstructions > 4) return 'medium';
  return 'easy';
}

/**
 * Build tags for meal plan
 */
function buildTags(meals: WorkersMeal[], metadata: WorkersDietResponse['metadata']): string[] {
  const tags: string[] = ['ai-generated', 'personalized'];

  if (metadata.cuisine) {
    tags.push(metadata.cuisine.toLowerCase());
  }

  // Add meal type tags
  const mealTypes = new Set(meals.map(m => m.type));
  tags.push(...Array.from(mealTypes));

  // Add cooking method tags
  meals.forEach(meal => {
    if (meal.cookingMethod) {
      tags.push(meal.cookingMethod.toLowerCase());
    }
  });

  return [...new Set(tags)];
}

/**
 * Build tags for individual meal
 */
function buildMealTags(meal: WorkersMeal): string[] {
  const tags: string[] = [meal.type];

  if (meal.cookingMethod) {
    tags.push(meal.cookingMethod.toLowerCase());
  }

  // Add quick/easy tags
  if ((meal.preparationTime || 0) < 20) {
    tags.push('quick');
  }

  if (!meal.cookingInstructions || meal.cookingInstructions.length < 3) {
    tags.push('easy');
  }

  // Add high-protein tag if applicable
  if (meal.totalNutrition.protein > 30) {
    tags.push('high-protein');
  }

  return tags;
}

/**
 * Determine cooking method from text
 */
function determineCookingMethod(method?: string): 'baking' | 'grilling' | 'frying' | 'steaming' | 'boiling' | 'sauteing' | 'roasting' | 'raw' | 'blending' | 'microwaving' {
  if (!method) return 'raw';

  const methodLower = method.toLowerCase();

  if (methodLower.includes('bak')) return 'baking';
  if (methodLower.includes('grill')) return 'grilling';
  if (methodLower.includes('fry')) return 'frying';
  if (methodLower.includes('steam')) return 'steaming';
  if (methodLower.includes('boil')) return 'boiling';
  if (methodLower.includes('saut')) return 'sauteing';
  if (methodLower.includes('roast')) return 'roasting';
  if (methodLower.includes('blend')) return 'blending';
  if (methodLower.includes('microwave')) return 'microwaving';

  return 'raw';
}

/**
 * Categorize food by name (best effort)
 */
function categorizeFoodByName(name: string): FoodCategory {
  const nameLower = name.toLowerCase();

  // Fruits
  if (/apple|banana|orange|berry|grape|mango|pineapple|melon/.test(nameLower)) {
    return 'fruits';
  }

  // Vegetables
  if (/broccoli|carrot|spinach|lettuce|tomato|cucumber|pepper|onion|garlic/.test(nameLower)) {
    return 'vegetables';
  }

  // Grains
  if (/rice|bread|pasta|oat|quinoa|wheat|roti|naan/.test(nameLower)) {
    return 'grains';
  }

  // Proteins
  if (/chicken|beef|pork|fish|egg|tofu|paneer|dal|lentil/.test(nameLower)) {
    return 'proteins';
  }

  // Dairy
  if (/milk|cheese|yogurt|butter|cream/.test(nameLower)) {
    return 'dairy';
  }

  // Beverages
  if (/juice|tea|coffee|water|smoothie/.test(nameLower)) {
    return 'beverages';
  }

  // Default to other
  return 'other';
}

/**
 * Get day of week from date string
 */
function getDayOfWeek(date: string): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dateObj = new Date(date);
  return days[dateObj.getDay()];
}

// ============================================================================
// HELPER FUNCTIONS - WORKOUT
// ============================================================================

/**
 * Build workout description from data and metadata
 */
function buildWorkoutDescription(
  data: WorkersWorkoutResponse['data'],
  metadata: WorkersWorkoutResponse['metadata']
): string {
  const parts: string[] = [];

  parts.push(`${data.totalDuration}-minute workout`);

  if (metadata.usedCalculatedMetrics && metadata.calculatedMetricsSummary) {
    if (metadata.calculatedMetricsSummary.vo2max) {
      parts.push(`VO2 Max: ${metadata.calculatedMetricsSummary.vo2max.toFixed(1)}`);
    }
  }

  if (data.exercises?.length) {
    parts.push(`${data.exercises.length} exercises`);
  }

  return parts.join(' • ');
}

/**
 * Estimate calories burned from duration, metadata, and exercises
 * 
 * Uses MET-based calculation when exercise data AND user weight are available.
 * Returns 0 if required data is missing (NO FALLBACK VALUES).
 * 
 * Priority:
 * 1. MET-based calculation from exercise data (requires user weight)
 * 2. TDEE-based calculation (if user metrics available)
 * 3. Returns 0 if no calculation possible (will be recalculated at workout completion)
 */
function estimateCaloriesBurned(
  duration: number,
  metadata: WorkersWorkoutResponse['metadata'],
  exercises?: WorkersExercise[],
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): number {
  // Try to get user weight from metadata (calculatedMetrics has BMR which we can derive weight from)
  // BMR = 10 * weight + 6.25 * height - 5 * age + s (Mifflin-St Jeor)
  // Without full data, we can't reliably extract weight, so we skip MET calculation at generation time
  // The actual calories will be calculated at workout completion when we have user profile access
  
  // Priority 1: TDEE-based calculation (if user metrics available)
  if (metadata.calculatedMetricsSummary?.tdee && duration > 0) {
    // Calculate calories per minute based on TDEE and activity multiplier
    const caloriesPerMinute = metadata.calculatedMetricsSummary.tdee / 1440 * 3; // 3x resting rate for exercise
    const calories = Math.round(duration * caloriesPerMinute);
    console.log(`[dataTransformers] TDEE-based calorie estimate: ${calories} kcal`);
    return calories;
  }
  
  // NO FALLBACK - return 0, will be calculated at workout completion with actual user weight
  console.log('[dataTransformers] Cannot estimate calories: no TDEE available, will calculate at completion');
  return 0;
}

/**
 * Extract equipment list from workout data
 */
function extractEquipmentList(data: WorkersWorkoutResponse['data']): string[] {
  const equipment = new Set<string>();

  const allExercises = [
    ...(data.warmup || []),
    ...(data.exercises || []),
    ...(data.cooldown || []),
  ];

  allExercises.forEach(ex => {
    if (ex.exerciseData?.equipments) {
      ex.exerciseData.equipments.forEach(eq => equipment.add(eq));
    }
  });

  return Array.from(equipment);
}

/**
 * Extract target muscle groups from workout data
 */
function extractTargetMuscles(data: WorkersWorkoutResponse['data']): string[] {
  const muscles = new Set<string>();

  const allExercises = [
    ...(data.warmup || []),
    ...(data.exercises || []),
    ...(data.cooldown || []),
  ];

  allExercises.forEach(ex => {
    if (ex.exerciseData?.targetMuscles) {
      ex.exerciseData.targetMuscles.forEach(muscle => muscles.add(muscle));
    }
  });

  return Array.from(muscles);
}

/**
 * Build workout tags
 */
function buildWorkoutTags(
  data: WorkersWorkoutResponse['data'],
  metadata: WorkersWorkoutResponse['metadata']
): string[] {
  const tags: string[] = ['ai-generated', 'personalized'];

  if (metadata.usedCalculatedMetrics) {
    tags.push('metrics-optimized');
  }

  if (metadata.validation?.gifCoverageVerified) {
    tags.push('visual-guide');
  }

  // Add duration tags
  if (data.totalDuration < 30) {
    tags.push('quick');
  } else if (data.totalDuration > 60) {
    tags.push('extended');
  }

  return tags;
}

/**
 * Determine workout subcategory
 */
function determineWorkoutSubCategory(data: WorkersWorkoutResponse['data']): string {
  const muscles = extractTargetMuscles(data);

  if (muscles.some(m => m.toLowerCase().includes('chest'))) return 'chest';
  if (muscles.some(m => m.toLowerCase().includes('back'))) return 'back';
  if (muscles.some(m => m.toLowerCase().includes('leg'))) return 'legs';
  if (muscles.some(m => m.toLowerCase().includes('shoulder'))) return 'shoulders';
  if (muscles.some(m => m.toLowerCase().includes('arm'))) return 'arms';

  return 'full-body';
}

/**
 * Determine workout difficulty from metadata
 */
function determineWorkoutDifficulty(
  metadata: WorkersWorkoutResponse['metadata']
): 'beginner' | 'intermediate' | 'advanced' {
  // Check VO2max for fitness level indicator
  if (metadata.calculatedMetricsSummary?.vo2max) {
    if (metadata.calculatedMetricsSummary.vo2max > 50) return 'advanced';
    if (metadata.calculatedMetricsSummary.vo2max > 35) return 'intermediate';
    return 'beginner';
  }
  
  // Default to intermediate
  return 'intermediate';
}

/**
 * Determine intensity level from metadata
 */
function determineIntensityLevel(metadata: WorkersWorkoutResponse['metadata']): string {
  if (metadata.validation?.replacementsMade && metadata.validation.replacementsMade > 3) {
    return 'moderate';
  }

  if (metadata.calculatedMetricsSummary?.vo2max) {
    if (metadata.calculatedMetricsSummary.vo2max > 50) return 'high';
    if (metadata.calculatedMetricsSummary.vo2max > 35) return 'moderate';
  }

  return 'moderate';
}

/**
 * Build progression notes from metadata
 */
function buildProgressionNotes(metadata: WorkersWorkoutResponse['metadata']): string[] {
  const notes: string[] = [];

  if (metadata.usedCalculatedMetrics) {
    notes.push('Workout optimized based on your current fitness metrics');
  }

  if (metadata.calculatedMetricsSummary?.hasHeartRateZones) {
    notes.push('Use heart rate zones for optimal intensity');
  }

  if (metadata.validation?.replacementsMade) {
    notes.push(`${metadata.validation.replacementsMade} exercises adjusted to match your equipment and experience`);
  }

  return notes.length > 0 ? notes : ['Increase weight or reps as you get stronger'];
}

/**
 * Build safety considerations
 */
function buildSafetyConsiderations(data: WorkersWorkoutResponse['data']): string[] {
  const safety: string[] = [
    'Warm up properly before starting',
    'Use proper form to prevent injury',
    'Stay hydrated throughout the workout',
  ];

  if (data.totalDuration > 60) {
    safety.push('Take breaks as needed for longer workouts');
  }

  return safety;
}

/**
 * Build expected benefits
 */
function buildExpectedBenefits(
  data: WorkersWorkoutResponse['data'],
  metadata: WorkersWorkoutResponse['metadata']
): string[] {
  const benefits: string[] = [];

  const muscles = extractTargetMuscles(data);

  if (muscles.length > 0) {
    benefits.push(`Strengthens ${muscles.slice(0, 3).join(', ')}`);
  }

  benefits.push('Improves overall fitness');
  benefits.push('Increases muscle endurance');

  if (metadata.calculatedMetricsSummary?.hasHeartRateZones) {
    benefits.push('Optimizes cardiovascular health');
  }

  return benefits;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if Workers diet response is valid
 */
export function isValidDietResponse(response: any): response is WorkersDietResponse {
  return (
    response !== null &&
    response !== undefined &&
    typeof response === 'object' &&
    'success' in response &&
    'data' in response &&
    response.data &&
    typeof response.data === 'object' &&
    'meals' in response.data &&
    Array.isArray(response.data.meals)
  );
}

/**
 * Check if Workers workout response is valid
 */
export function isValidWorkoutResponse(response: any): response is WorkersWorkoutResponse {
  return (
    response !== null &&
    response !== undefined &&
    typeof response === 'object' &&
    'success' in response &&
    'data' in response &&
    response.data &&
    typeof response.data === 'object' &&
    'exercises' in response.data &&
    Array.isArray(response.data.exercises)
  );
}

/**
 * Extract error message from Workers error response
 */
export function extractErrorMessage(errorResponse: any): string {
  if (typeof errorResponse === 'string') {
    return errorResponse;
  }

  if (errorResponse?.message) {
    return errorResponse.message;
  }

  if (errorResponse?.error) {
    return typeof errorResponse.error === 'string'
      ? errorResponse.error
      : errorResponse.error.message || 'Unknown error';
  }

  return 'An unexpected error occurred';
}

// ============================================================================
// ADDITIONAL EXPORTS FOR API COMPATIBILITY
// ============================================================================

/**
 * Transform exercise warnings to user-friendly format
 */
export function transformExerciseWarnings(warnings: ValidationWarning[]): UserFriendlyError[] {
  return transformValidationErrors(warnings);
}

/**
 * Generate unique plan ID
 */
export function generatePlanId(): string {
  return `plan_${generateUUID()}`;
}

/**
 * Generate unique meal ID
 */
export function generateMealId(): string {
  return `meal_${generateUUID()}`;
}

/**
 * Generate unique exercise ID
 */
export function generateExerciseId(): string {
  return `exercise_${generateUUID()}`;
}

// ============================================================================
// TYPE ALIASES FOR API COMPATIBILITY
// ============================================================================

export type TransformedDietPlan = DayMeal;
export type TransformedWorkoutPlan = DayWorkout;
export type ValidationError = UserFriendlyError;
