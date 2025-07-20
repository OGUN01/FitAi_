// AI-related TypeScript type definitions for FitAI

import { PersonalInfo, FitnessGoals } from './user';

// ============================================================================
// WORKOUT TYPES
// ============================================================================

export interface Exercise {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  muscleGroups: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sets?: number;
  reps?: number | string; // Can be "8-12" or specific number
  duration?: number; // in seconds for time-based exercises
  restTime?: number; // in seconds
  calories?: number; // estimated calories burned
  videoUrl?: string;
  imageUrl?: string;
  tips?: string[];
  variations?: string[];
}

export interface WorkoutSet {
  exerciseId: string;
  sets: number;
  reps: number | string;
  weight?: number; // in kg
  duration?: number; // in seconds
  restTime: number; // in seconds
  notes?: string;
  intensity?: string; // e.g., "75% 1RM" or "moderate"
  tempo?: string; // e.g., "2-1-2-1" (eccentric-pause-concentric-pause)
  rpe?: number; // Rate of Perceived Exertion (1-10)
}

export interface Workout {
  id: string;
  title: string;
  description: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'hiit' | 'yoga' | 'pilates' | 'hybrid';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  estimatedCalories: number;
  exercises: WorkoutSet[];
  warmup?: WorkoutSet[];
  cooldown?: WorkoutSet[];
  equipment: string[];
  targetMuscleGroups: string[];
  icon: string;
  tags: string[];
  isPersonalized: boolean;
  aiGenerated: boolean;
  createdAt: string;
  // Enhanced Gemini 2.5 Flash features
  progressionTips?: string[];
  modifications?: string[];
  nutritionalFocus?: string[];
  recoveryNotes?: string[];
  safetyConsiderations?: string[];
  expectedAdaptations?: string[];
  periodizationWeek?: number; // For progressive programs
}

export interface WorkoutPlan {
  id: string;
  title: string;
  description: string;
  duration: number; // in days
  workouts: Workout[];
  restDays: number[];
  progression: {
    week: number;
    adjustments: string[];
  }[];
  goals: string[];
  isActive: boolean;
  createdAt: string;
}

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

export interface Food {
  id: string;
  name: string;
  brand?: string;
  category: string;
  calories: number; // per 100g
  macros: Macronutrients;
  micros?: Micronutrients;
  servingSize: number; // in grams
  servingUnit: string; // 'g', 'ml', 'piece', 'cup', etc.
  allergens: string[];
  dietaryLabels: string[]; // 'vegan', 'gluten-free', 'organic', etc.
  barcode?: string;
  imageUrl?: string;
  verified: boolean;
}

export interface MealItem {
  foodId: string;
  food: Food;
  quantity: number; // in serving units
  calories: number;
  macros: Macronutrients;
}

export interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  items: MealItem[];
  totalCalories: number;
  totalMacros: Macronutrients;
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes
  difficulty?: 'easy' | 'medium' | 'hard';
  recipe?: {
    instructions: string[];
    ingredients: string[];
  };
  imageUrl?: string;
  tags: string[];
  isPersonalized: boolean;
  aiGenerated: boolean;
  scheduledTime?: string; // ISO string
}

export interface DailyMealPlan {
  date: string; // ISO date string
  meals: Meal[];
  totalCalories: number;
  totalMacros: Macronutrients;
  waterIntake: number; // in ml
  adherence?: number; // 0-100 percentage
}

export interface NutritionPlan {
  id: string;
  title: string;
  description: string;
  duration: number; // in days
  dailyPlans: DailyMealPlan[];
  calorieTarget: number;
  macroTargets: Macronutrients;
  dietaryRestrictions: string[];
  goals: string[];
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// AI GENERATION TYPES
// ============================================================================

export interface AIGenerationContext {
  userProfile: PersonalInfo;
  fitnessGoals: FitnessGoals;
  preferences?: {
    equipment?: string[];
    dietaryRestrictions?: string[];
    cuisinePreferences?: string[];
    timeConstraints?: {
      workoutDuration?: number;
      mealPrepTime?: number;
    };
  };
  currentStats?: {
    weight?: number;
    bodyFat?: number;
    fitnessLevel?: number;
  };
  history?: {
    completedWorkouts?: string[];
    favoriteExercises?: string[];
    dislikedFoods?: string[];
  };
}

export interface AIWorkoutRequest {
  context: AIGenerationContext;
  workoutType?: 'strength' | 'cardio' | 'flexibility' | 'hiit';
  duration?: number; // in minutes
  equipment?: string[];
  targetMuscleGroups?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface AINutritionRequest {
  context: AIGenerationContext;
  calorieTarget?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'full_day';
  dietaryRestrictions?: string[];
  cuisinePreference?: string;
  prepTimeLimit?: number; // in minutes
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  confidence?: number; // 0-100
  generationTime?: number; // in ms
  tokensUsed?: number;
  modelVersion?: string; // e.g., "gemini-2.5-flash"
  warning?: string; // For partial recoveries or non-critical issues
  retryCount?: number; // Number of retries attempted
  safetyRating?: string; // Content safety assessment
}

// ============================================================================
// PROGRESS ANALYSIS TYPES
// ============================================================================

export interface ProgressMetrics {
  weight: {
    current: number;
    change: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  bodyFat?: {
    current: number;
    change: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  muscleMass?: {
    current: number;
    change: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  strength: {
    exercises: Record<string, {
      maxWeight: number;
      improvement: number;
    }>;
  };
  endurance: {
    cardioMinutes: number;
    improvement: number;
  };
  consistency: {
    workoutStreak: number;
    nutritionAdherence: number;
  };
}

export interface ProgressAnalysis {
  metrics: ProgressMetrics;
  insights: string[];
  recommendations: string[];
  goalProgress: {
    goalId: string;
    progress: number; // 0-100 percentage
    estimatedCompletion?: string; // ISO date
  }[];
  motivationalMessage: string;
  nextMilestones: string[];
}

// ============================================================================
// ACHIEVEMENT TYPES
// ============================================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'workout' | 'nutrition' | 'consistency' | 'milestone';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  criteria: {
    type: string;
    value: number;
    timeframe?: string;
  };
  reward?: {
    points: number;
    badge?: string;
    unlocks?: string[];
  };
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number; // 0-100 percentage
}

export interface MotivationalContent {
  dailyTip: string;
  encouragement: string;
  challenge?: {
    title: string;
    description: string;
    reward: string;
    duration: number; // in days
  };
  quote?: string;
  factOfTheDay?: string;
}
