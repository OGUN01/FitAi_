/**
 * AI Request Transformers
 * 
 * Transforms frontend types (PersonalInfo, FitnessGoals, etc.) to backend request format
 * for the fitai-workers API.
 * 
 * The backend reads user data from Supabase tables (advanced_review, profiles, etc.)
 * but still needs a minimal profile context in the request for fallback/validation.
 */

import type { PersonalInfo, FitnessGoals, DietPreferences, WorkoutPreferences, BodyMetrics } from '../types/user';
import type { DietGenerationRequest, WorkoutGenerationRequest, WorkersResponse, DietPlan, WorkoutPlan } from './fitaiWorkersClient';
import type { WeeklyMealPlan, WeeklyWorkoutPlan, Meal, DayMeal, Workout } from '../types/ai';

// ============================================================================
// DIET REQUEST TRANSFORMERS
// ============================================================================

/**
 * Transform frontend types to DietGenerationRequest for backend
 * 
 * Note: The backend primarily reads from Supabase tables (via userId/JWT auth),
 * but we send profile data for:
 * 1. Fallback if database lookup fails
 * 2. Request validation
 * 3. Cache key generation
 */
export function transformForDietRequest(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  bodyMetrics?: BodyMetrics,
  dietPreferences?: DietPreferences
): DietGenerationRequest {
  // Extract activity level from workout preferences or fitness goals
  const activityLevel = personalInfo.activityLevel || 
    fitnessGoals.experience_level || 
    fitnessGoals.experience || 
    'moderate';

  // Get primary fitness goal
  const primaryGoal = fitnessGoals.primary_goals?.[0] || 
    fitnessGoals.primaryGoals?.[0] || 
    'general_fitness';

  return {
    profile: {
      age: personalInfo.age || 25,
      gender: personalInfo.gender || 'other',
      weight: bodyMetrics?.current_weight_kg || personalInfo.weight || 70,
      height: bodyMetrics?.height_cm || personalInfo.height || 170,
      activityLevel: activityLevel,
      fitnessGoal: primaryGoal,
    },
    dietPreferences: dietPreferences ? {
      dietType: dietPreferences.diet_type,
      allergies: dietPreferences.allergies || [],
      restrictions: dietPreferences.restrictions || [],
      cuisinePreferences: [], // Will be auto-detected from user's country
      dislikes: [],
    } : undefined,
    // Note: calorieTarget and macros are read from advanced_review table by backend
    // We don't send them here to avoid conflicts with calculated values
    mealsPerDay: 3,
    model: 'google/gemini-2.0-flash-exp',
    temperature: 0.7,
  };
}

// ============================================================================
// WORKOUT REQUEST TRANSFORMERS
// ============================================================================

/**
 * Transform frontend types to WorkoutGenerationRequest for backend
 */
export function transformForWorkoutRequest(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  bodyMetrics?: BodyMetrics,
  workoutPreferences?: WorkoutPreferences,
  options?: {
    workoutType?: string;
    duration?: number;
    focusMuscles?: string[];
  }
): WorkoutGenerationRequest {
  // Get experience level
  const experienceLevel = workoutPreferences?.intensity || 
    fitnessGoals.experience_level || 
    fitnessGoals.experience || 
    'beginner';

  // Get primary fitness goal
  const primaryGoal = fitnessGoals.primary_goals?.[0] || 
    fitnessGoals.primaryGoals?.[0] || 
    'general_fitness';

  // Get available equipment
  const equipment = workoutPreferences?.equipment || 
    fitnessGoals.preferred_equipment || 
    ['bodyweight'];

  // Get physical limitations/injuries
  const injuries = bodyMetrics?.physical_limitations || [];

  return {
    profile: {
      age: personalInfo.age || 25,
      gender: personalInfo.gender || 'other',
      weight: bodyMetrics?.current_weight_kg || personalInfo.weight || 70,
      height: bodyMetrics?.height_cm || personalInfo.height || 170,
      fitnessGoal: primaryGoal,
      experienceLevel: experienceLevel,
      availableEquipment: equipment,
      injuries: injuries,
    },
    workoutType: options?.workoutType || 'strength',
    duration: options?.duration || workoutPreferences?.time_preference || 30,
    focusMuscles: options?.focusMuscles,
    model: 'google/gemini-2.0-flash-exp',
    temperature: 0.7,
  };
}

// ============================================================================
// RESPONSE TRANSFORMERS
// ============================================================================

/**
 * Transform backend diet response to frontend WeeklyMealPlan format
 */
export function transformDietResponseToWeeklyPlan(
  response: WorkersResponse<DietPlan>,
  weekNumber: number = 1
): WeeklyMealPlan | null {
  if (!response.success || !response.data) {
    console.error('[Transformer] Diet response failed:', response.error);
    return null;
  }

  const dietPlan = response.data;

  // Transform backend meals to frontend DayMeal format
  const meals: DayMeal[] = [];
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // The backend returns a single day's meals - replicate across the week
  // In production, you'd call the API multiple times or modify backend for weekly plans
  for (const day of daysOfWeek) {
    if (dietPlan.meals) {
      for (const meal of dietPlan.meals) {
        const mealId = `${day}_${meal.mealType || meal.type}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // Transform foods/items to MealItem format
        const items = (meal.foods || meal.items || []).map((food: any, idx: number) => ({
          id: `${mealId}_item_${idx}`,
          name: food.name || 'Unknown Food',
          quantity: food.portion || food.quantity || '1 serving',
          unit: 'serving',
          calories: food.nutrition?.calories || food.calories || 0,
          macros: {
            protein: food.nutrition?.protein || food.protein || 0,
            carbohydrates: food.nutrition?.carbs || food.carbs || 0,
            fat: food.nutrition?.fats || food.fat || 0,
            fiber: food.nutrition?.fiber || food.fiber || 0,
          },
          isLogged: false,
        }));

        // Calculate totals from items
        const totalCalories = meal.totalCalories || meal.calories || 
          items.reduce((sum: number, item: any) => sum + (item.calories || 0), 0);
        
        const totalProtein = meal.totalNutrition?.protein || meal.protein ||
          items.reduce((sum: number, item: any) => sum + (item.macros?.protein || 0), 0);
        
        const totalCarbs = meal.totalNutrition?.carbs || meal.carbs ||
          items.reduce((sum: number, item: any) => sum + (item.macros?.carbohydrates || 0), 0);
        
        const totalFat = meal.totalNutrition?.fats || meal.fat ||
          items.reduce((sum: number, item: any) => sum + (item.macros?.fat || 0), 0);

        meals.push({
          id: mealId,
          dayOfWeek: day,
          type: mapMealType(meal.mealType || meal.type),
          name: meal.name || `${meal.mealType} for ${day}`,
          description: meal.description || '',
          totalCalories: Math.round(totalCalories),
          totalMacros: {
            protein: Math.round(totalProtein),
            carbohydrates: Math.round(totalCarbs),
            fat: Math.round(totalFat),
            fiber: 0,
          },
          preparationTime: meal.prepTime || meal.preparationTime || 15,
          cookingTime: meal.cookTime || meal.cookingTime || 0,
          difficulty: mapDifficultyLevel(meal.difficulty),
          tags: ['ai-generated', mapMealType(meal.mealType || meal.type)],
          items: items,
          isPersonalized: true,
          aiGenerated: true,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return {
    id: dietPlan.id || `weekly_meal_${Date.now()}`,
    weekNumber,
    meals,
    planTitle: dietPlan.title || 'Your Personalized Meal Plan',
  };
}

/**
 * Transform backend workout response to frontend WeeklyWorkoutPlan format
 */
export function transformWorkoutResponseToWeeklyPlan(
  response: WorkersResponse<WorkoutPlan>,
  weekNumber: number = 1
): WeeklyWorkoutPlan | null {
  if (!response.success || !response.data) {
    console.error('[Transformer] Workout response failed:', response.error);
    return null;
  }

  const workoutPlan = response.data;

  // Create workout for multiple days based on the generated workout
  const workouts: Workout[] = [];
  const workoutDays = ['monday', 'wednesday', 'friday']; // Default 3-day split

  for (let i = 0; i < workoutDays.length; i++) {
    const day = workoutDays[i];
    workouts.push({
      id: `${day}_workout_${Date.now()}_${i}`,
      title: workoutPlan.title || 'AI Generated Workout',
      description: workoutPlan.description || '',
      category: mapWorkoutCategory(workoutPlan),
      difficulty: mapDifficulty(workoutPlan.difficulty),
      duration: workoutPlan.totalDuration || workoutPlan.duration || 30,
      estimatedCalories: calculateEstimatedCalories(workoutPlan),
      exercises: transformExercises(workoutPlan),
      equipment: extractEquipment(workoutPlan),
      targetMuscleGroups: extractTargetMuscles(workoutPlan),
      icon: getWorkoutIcon(workoutPlan),
      tags: ['ai-generated', workoutPlan.difficulty || 'intermediate'],
      isPersonalized: true,
      aiGenerated: true,
      dayOfWeek: day,
      warmup: workoutPlan.warmup?.map(transformExerciseItem) || [],
      cooldown: workoutPlan.cooldown?.map(transformExerciseItem) || [],
      createdAt: new Date().toISOString(),
    });
  }

  return {
    id: workoutPlan.id || `weekly_workout_${Date.now()}`,
    weekNumber,
    workouts,
    planTitle: workoutPlan.title || 'Your Personalized Workout Plan',
    planDescription: workoutPlan.description,
    restDays: [1, 3, 5], // Tuesday, Thursday, Saturday, Sunday indices
    totalEstimatedCalories: workouts.reduce((sum, w) => sum + (w.estimatedCalories || 0), 0),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapMealType(type: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const typeMap: Record<string, 'breakfast' | 'lunch' | 'dinner' | 'snack'> = {
    breakfast: 'breakfast',
    lunch: 'lunch',
    dinner: 'dinner',
    snack: 'snack',
    snack1: 'snack',
    snack2: 'snack',
    morning_snack: 'snack',
    afternoon_snack: 'snack',
    evening_snack: 'snack',
  };
  return typeMap[type?.toLowerCase()] || 'lunch';
}

function mapDifficultyLevel(difficulty?: string): 'easy' | 'medium' | 'hard' {
  const diffMap: Record<string, 'easy' | 'medium' | 'hard'> = {
    easy: 'easy',
    simple: 'easy',
    beginner: 'easy',
    medium: 'medium',
    moderate: 'medium',
    intermediate: 'medium',
    hard: 'hard',
    difficult: 'hard',
    advanced: 'hard',
  };
  return diffMap[difficulty?.toLowerCase() || ''] || 'easy';
}

function mapWorkoutCategory(workout: WorkoutPlan): string {
  // Determine category based on workout content
  if (workout.title?.toLowerCase().includes('cardio')) return 'cardio';
  if (workout.title?.toLowerCase().includes('hiit')) return 'hiit';
  if (workout.title?.toLowerCase().includes('strength')) return 'strength';
  if (workout.title?.toLowerCase().includes('yoga')) return 'flexibility';
  return 'strength';
}

function mapDifficulty(difficulty?: string): 'beginner' | 'intermediate' | 'advanced' {
  const diffMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
    beginner: 'beginner',
    easy: 'beginner',
    intermediate: 'intermediate',
    moderate: 'intermediate',
    advanced: 'advanced',
    hard: 'advanced',
    expert: 'advanced',
  };
  return diffMap[difficulty?.toLowerCase() || ''] || 'intermediate';
}

function calculateEstimatedCalories(workout: WorkoutPlan): number {
  // Estimate calories based on duration and intensity
  const durationMinutes = workout.totalDuration || workout.duration || 30;
  const caloriesPerMinute = workout.difficulty === 'advanced' ? 12 : 
                            workout.difficulty === 'intermediate' ? 8 : 5;
  return Math.round(durationMinutes * caloriesPerMinute);
}

function transformExercises(workout: WorkoutPlan): any[] {
  const allExercises = [
    ...(workout.warmup || []),
    ...(workout.exercises || []),
    ...(workout.cooldown || []),
  ];

  return allExercises.map((ex, index) => ({
    exerciseId: ex.exerciseId || `ex_${index}`,
    sets: ex.sets || 3,
    reps: ex.reps || ex.targetReps || '10-12',
    restTime: ex.restSeconds || ex.restTime || 60,
    weight: undefined,
    exerciseData: ex.exerciseData,
  }));
}

function transformExerciseItem(ex: any) {
  return {
    exerciseId: ex.exerciseId,
    sets: ex.sets || 1,
    reps: ex.reps || ex.targetReps || '30 seconds',
    restTime: ex.restSeconds || 30,
    exerciseData: ex.exerciseData,
  };
}

function extractEquipment(workout: WorkoutPlan): string[] {
  const equipment = new Set<string>();
  const allExercises = [
    ...(workout.warmup || []),
    ...(workout.exercises || []),
    ...(workout.cooldown || []),
  ];

  for (const ex of allExercises) {
    if (ex.exerciseData?.equipments) {
      ex.exerciseData.equipments.forEach((eq: string) => equipment.add(eq));
    }
  }

  return equipment.size > 0 ? Array.from(equipment) : ['bodyweight'];
}

function extractTargetMuscles(workout: WorkoutPlan): string[] {
  const muscles = new Set<string>();
  const allExercises = [
    ...(workout.warmup || []),
    ...(workout.exercises || []),
    ...(workout.cooldown || []),
  ];

  for (const ex of allExercises) {
    if (ex.exerciseData?.targetMuscles) {
      ex.exerciseData.targetMuscles.forEach((m: string) => muscles.add(m));
    }
    if (ex.exerciseData?.bodyParts) {
      ex.exerciseData.bodyParts.forEach((bp: string) => muscles.add(bp));
    }
  }

  return muscles.size > 0 ? Array.from(muscles) : ['full body'];
}

function getWorkoutIcon(workout: WorkoutPlan): string {
  const category = mapWorkoutCategory(workout);
  const icons: Record<string, string> = {
    strength: 'barbell-outline',
    cardio: 'bicycle-outline',
    hiit: 'flash-outline',
    flexibility: 'body-outline',
  };
  return icons[category] || 'fitness-outline';
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  DietGenerationRequest,
  WorkoutGenerationRequest,
  WorkersResponse,
  DietPlan,
  WorkoutPlan,
};

