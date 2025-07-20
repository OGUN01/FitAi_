// AI Module Barrel Export
// This file exports all AI services and utilities

// Core AI Services
export { geminiService, PROMPT_TEMPLATES, formatUserProfileForAI, calculateDailyCalories } from './gemini';
export { MOTIVATIONAL_CONTENT_SCHEMA } from './schemas';
export { workoutGenerator } from './workoutGenerator';
export { nutritionAnalyzer } from './nutritionAnalyzer';
export { demoAIService } from './demoService';

// Feature Engines
export { workoutEngine } from '../features/workouts/WorkoutEngine';
export { nutritionEngine } from '../features/nutrition/NutritionEngine';

// AI Types
export * from '../types/ai';

// Data
export * from '../data/exercises';
export * from '../data/foods';
export * from '../data/achievements';

// ============================================================================
// UNIFIED AI SERVICE
// ============================================================================

import { geminiService } from './gemini';
import { demoAIService } from './demoService';
import { workoutEngine } from '../features/workouts/WorkoutEngine';
import { nutritionEngine } from '../features/nutrition/NutritionEngine';
import { PersonalInfo, FitnessGoals } from '../types/user';
import { Workout, Meal, MotivationalContent, AIResponse } from '../types/ai';

/**
 * Unified AI Service that automatically switches between real AI and demo mode
 */
class UnifiedAIService {
  
  /**
   * Check if real AI is available
   */
  isRealAIAvailable(): boolean {
    return geminiService.isAvailable();
  }

  /**
   * Generate a workout using the best available method
   */
  async generateWorkout(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: {
      workoutType?: 'strength' | 'cardio' | 'flexibility' | 'hiit';
      duration?: number;
      equipment?: string[];
    }
  ): Promise<AIResponse<Workout>> {
    if (this.isRealAIAvailable()) {
      return workoutEngine.generateSmartWorkout(personalInfo, fitnessGoals, preferences);
    } else {
      return demoAIService.generateDemoWorkout(personalInfo, fitnessGoals, preferences);
    }
  }

  /**
   * Generate a meal using the best available method
   */
  async generateMeal(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    preferences?: {
      calorieTarget?: number;
      dietaryRestrictions?: string[];
      cuisinePreference?: string;
    }
  ): Promise<AIResponse<Meal>> {
    if (this.isRealAIAvailable()) {
      return nutritionEngine.generateSmartMealPlan(personalInfo, fitnessGoals, mealType, preferences);
    } else {
      return demoAIService.generateDemoMeal(personalInfo, fitnessGoals, mealType);
    }
  }

  /**
   * Generate motivational content
   */
  async generateMotivationalContent(
    personalInfo: PersonalInfo,
    currentStreak: number = 0
  ): Promise<AIResponse<MotivationalContent>> {
    if (this.isRealAIAvailable()) {
      // Use real AI for motivational content
      const variables = {
        name: personalInfo.name,
        streak: currentStreak.toString(),
        achievements: 'Recent workouts completed',
        goals: 'Fitness and health improvement',
        mood: 'motivated'
      };

      return geminiService.generateResponse<MotivationalContent>(
        `You are a motivational fitness coach. Create inspiring content for ${personalInfo.name}.

        Current streak: ${currentStreak} days

        Create motivational content including:
        - Daily tip: practical fitness advice for the day
        - Encouragement: personalized motivational message
        - Challenge: engaging challenge with title, description, reward, and duration
        - Quote: inspirational fitness or life quote
        - Fact of the day: interesting fitness or health fact
        - Personalized message: content tailored to the user's current situation and goals`,
        variables,
        MOTIVATIONAL_CONTENT_SCHEMA
      );
    } else {
      return demoAIService.generateDemoMotivation(personalInfo, currentStreak);
    }
  }

  /**
   * Test AI connectivity
   */
  async testConnection(): Promise<AIResponse<string>> {
    if (this.isRealAIAvailable()) {
      return geminiService.testConnection();
    } else {
      return {
        success: true,
        data: 'Demo AI service is active (no API key configured)',
        confidence: 100
      };
    }
  }

  /**
   * Get AI status information
   */
  getAIStatus(): {
    isAvailable: boolean;
    mode: 'real' | 'demo';
    message: string;
    modelVersion?: string;
  } {
    const isAvailable = this.isRealAIAvailable();
    return {
      isAvailable,
      mode: isAvailable ? 'real' : 'demo',
      modelVersion: isAvailable ? 'gemini-2.5-flash' : undefined,
      message: isAvailable
        ? 'Gemini 2.5 Flash is ready - Latest AI model with enhanced reasoning and personalization'
        : 'Demo mode active - using pre-built examples (configure EXPO_PUBLIC_GEMINI_API_KEY for Gemini 2.5 Flash)'
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const aiService = new UnifiedAIService();

// Default export
export default aiService;
