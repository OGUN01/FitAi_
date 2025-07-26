// AI-related TypeScript type definitions for FitAI

import { PersonalInfo, FitnessGoals } from './user';

// Re-export types from other modules that AI uses
export type { 
  Exercise, 
  WorkoutSet, 
  Workout, 
  WorkoutPlan,
  CompletedExercise,
  CompletedSet,
  WorkoutSession
} from './workout';

export type { 
  Macronutrients,
  Micronutrients,
  Food,
  MealItem,
  Meal,
  DailyMealPlan,
  NutritionPlan,
  MealLog,
  WaterLog,
  LoggedFood
} from './diet';

// ============================================================================
// AI RESPONSE TYPES
// ============================================================================

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  confidence?: number;  // Add confidence as direct property
  generationTime?: number;  // Add generationTime as direct property
  tokensUsed?: number;  // Add tokensUsed as direct property
  modelVersion?: string;  // Add modelVersion as direct property
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
    confidence?: number;
  };
}

// ============================================================================
// AI GENERATION PARAMETERS
// ============================================================================

export interface WorkoutGenerationParams {
  personalInfo: PersonalInfo;
  fitnessGoals: FitnessGoals;
  preferences?: {
    equipmentAvailable?: string[];
    workoutDuration?: number; // minutes
    excludeExercises?: string[];
    focusMuscles?: string[];
    intensity?: 'low' | 'moderate' | 'high';
  };
  constraints?: {
    injuries?: string[];
    limitations?: string[];
    medicalConditions?: string[];
  };
}

export interface NutritionGenerationParams {
  personalInfo: PersonalInfo;
  fitnessGoals: FitnessGoals;
  preferences?: {
    dietaryRestrictions?: string[];
    allergies?: string[];
    cuisinePreferences?: string[];
    mealComplexity?: 'simple' | 'moderate' | 'complex';
    budget?: 'low' | 'medium' | 'high';
  };
  currentMetrics?: {
    weight?: number;
    bodyFat?: number;
    activityLevel?: string;
  };
}

// Add missing type for nutrition analyzer
export interface AINutritionRequest {
  personalInfo: PersonalInfo;
  preferences?: {
    dietaryRestrictions?: string[];
    allergies?: string[];
    cuisinePreferences?: string[];
  };
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  targetCalories?: number;
}

// ============================================================================
// PROGRESS ANALYSIS TYPES
// ============================================================================

export interface ProgressMetrics {
  weight: number[];
  bodyFat?: number[];
  measurements?: {
    chest?: number[];
    waist?: number[];
    hips?: number[];
    arms?: number[];
    thighs?: number[];
  };
  performance?: {
    strength?: { [exercise: string]: number[] };
    endurance?: { [activity: string]: number[] };
    flexibility?: { [test: string]: number[] };
  };
  dates: string[];
}

export interface ProgressAnalysis {
  summary: string;
  trends: {
    weight: 'increasing' | 'decreasing' | 'stable';
    bodyFat?: 'increasing' | 'decreasing' | 'stable';
    strength?: 'improving' | 'declining' | 'stable';
    endurance?: 'improving' | 'declining' | 'stable';
  };
  achievements: string[];
  recommendations: string[];
  projections?: {
    weightIn4Weeks?: number;
    goalCompletionDate?: string;
    milestones?: { date: string; achievement: string }[];
  };
  insights: {
    strengths: string[];
    areasForImprovement: string[];
    nutritionFeedback?: string[];
    workoutFeedback?: string[];
  };
}

// ============================================================================
// MOTIVATIONAL CONTENT TYPES
// ============================================================================

export interface MotivationalContent {
  dailyTip: {
    icon: string;
    title: string;
    content: string;
    category: 'nutrition' | 'exercise' | 'mindset' | 'recovery';
  };
  encouragement: {
    message: string;
    emoji: string;
    tone: 'supportive' | 'energetic' | 'calm' | 'challenging';
  };
  challenge: {
    title: string;
    description: string;
    reward: string;
    duration: string;
    difficulty: 'easy' | 'medium' | 'hard';
  };
  quote: {
    text: string;
    author: string;
    context?: string;
  };
  factOfTheDay: {
    fact: string;
    source?: string;
    relatedTip?: string;
  };
  personalizedMessage: {
    content: string;
    basedOn: string; // What data point triggered this message
    actionItem?: string;
  };
}

// ============================================================================
// AI SERVICE CONFIGURATION
// ============================================================================

export interface AIServiceConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'demo';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number; // milliseconds
  retryAttempts?: number;
  cacheResponses?: boolean;
  structuredOutput?: boolean;
}

// ============================================================================
// CACHED AI DATA TYPES
// ============================================================================

export interface CachedWorkout {
  workout: Workout;
  generatedAt: string;
  expiresAt: string;
  params: WorkoutGenerationParams;
}

export interface CachedNutritionPlan {
  plan: NutritionPlan;
  generatedAt: string;
  expiresAt: string;
  params: NutritionGenerationParams;
}

export interface CachedMotivation {
  content: MotivationalContent;
  generatedAt: string;
  validUntil: string;
  userContext: {
    streak?: number;
    lastWorkout?: string;
    mood?: string;
  };
}

// ============================================================================
// AI ANALYTICS TYPES
// ============================================================================

export interface AIUsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number; // milliseconds
  tokenUsage: {
    total: number;
    byFeature: {
      workouts: number;
      nutrition: number;
      progress: number;
      motivation: number;
    };
  };
  costEstimate?: number; // in USD
  lastReset: string;
}

// ============================================================================
// ACHIEVEMENT SYSTEM TYPES
// ============================================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'workout' | 'nutrition' | 'consistency' | 'milestone' | 'social';
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
  criteria: {
    type: 'streak' | 'total' | 'personal_best' | 'challenge' | 'special';
    value: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  };
  rewards?: {
    xp?: number;
    badges?: string[];
    features?: string[];
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface AIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  retryable: boolean;
  userMessage?: string;
}

// ============================================================================
// DEMO MODE TYPES
// ============================================================================

export interface DemoModeConfig {
  enabled: boolean;
  scenarios: {
    workout: 'beginner' | 'intermediate' | 'advanced';
    nutrition: 'weight_loss' | 'muscle_gain' | 'maintenance';
    progress: 'good' | 'average' | 'needs_improvement';
  };
  simulateDelay?: boolean;
  delayRange?: [number, number]; // min and max milliseconds
}