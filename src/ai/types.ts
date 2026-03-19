/**
 * AI Module - Type Definitions
 *
 * Contains all type definitions for AI service interfaces
 */

import { Workout, Meal } from "../types/ai";

/**
 * Weekly workout plan structure
 */
export interface WeeklyWorkoutPlan {
  id: string;
  databaseId?: string;
  weekNumber: number;
  workouts: Workout[];
  planTitle?: string;
  planDescription?: string;
  restDays?: number[];
  totalEstimatedCalories?: number;
  duration?: number | string; // Total duration in minutes for the week
}

/**
 * Weekly meal plan structure
 */
export interface WeeklyMealPlan {
  id: string;
  databaseId?: string;
  weekNumber: number;
  meals: any[];
  planTitle?: string;
  planDescription?: string;
  totalEstimatedCalories?: number;
}

/**
 * Metadata about AI service generation
 */
export interface AIServiceMetadata {
  cached: boolean;
  cacheSource?: "kv" | "database" | "fresh";
  generationTime: number;
  model?: string;
  tokensUsed?: number;
  costUsd?: number;
  cuisineDetected?: string;
}
