// AI Module Barrel Export
// This file exports all AI services and utilities

// Core AI Services
export { geminiService, PROMPT_TEMPLATES, formatUserProfileForAI, calculateDailyCalories } from './gemini';
export { MOTIVATIONAL_CONTENT_SCHEMA } from './schemas';
export { workoutGenerator } from './workoutGenerator';
export { nutritionAnalyzer } from './nutritionAnalyzer';
export { demoAIService } from './demoService';
export { weeklyContentGenerator } from './weeklyContentGenerator';

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
import { MOTIVATIONAL_CONTENT_SCHEMA } from './schemas';
import { workoutEngine } from '../features/workouts/WorkoutEngine';
import { nutritionEngine } from '../features/nutrition/NutritionEngine';
import { weeklyContentGenerator, WeeklyWorkoutPlan, WeeklyMealPlan } from './weeklyContentGenerator';
import { PersonalInfo, FitnessGoals } from '../types/user';
import { Workout, Meal, DailyMealPlan, MotivationalContent, AIResponse } from '../types/ai';

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
   * Generate a daily meal plan with multiple meals
   */
  async generateDailyMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: {
      calorieTarget?: number;
      dietaryRestrictions?: string[];
      cuisinePreference?: string;
    }
  ): Promise<AIResponse<DailyMealPlan>> {
    if (this.isRealAIAvailable()) {
      return nutritionEngine.generateDailyMealPlan(personalInfo, fitnessGoals, preferences);
    } else {
      // For demo, generate individual meals and combine them
      const breakfast = await demoAIService.generateDemoMeal('breakfast');
      const lunch = await demoAIService.generateDemoMeal('lunch'); 
      const dinner = await demoAIService.generateDemoMeal('dinner');
      const snack = await demoAIService.generateDemoMeal('snack');
      
      return {
        success: true,
        data: {
          date: new Date().toISOString().split('T')[0],
          meals: [breakfast.data, lunch.data, dinner.data, snack.data],
          totalCalories: breakfast.data.totalCalories + lunch.data.totalCalories + dinner.data.totalCalories + snack.data.totalCalories,
          totalMacros: {
            protein: breakfast.data.totalMacros.protein + lunch.data.totalMacros.protein + dinner.data.totalMacros.protein + snack.data.totalMacros.protein,
            carbohydrates: breakfast.data.totalMacros.carbohydrates + lunch.data.totalMacros.carbohydrates + dinner.data.totalMacros.carbohydrates + snack.data.totalMacros.carbohydrates,
            fat: breakfast.data.totalMacros.fat + lunch.data.totalMacros.fat + dinner.data.totalMacros.fat + snack.data.totalMacros.fat,
            fiber: breakfast.data.totalMacros.fiber + lunch.data.totalMacros.fiber + dinner.data.totalMacros.fiber + snack.data.totalMacros.fiber
          }
        },
        reasoning: 'Generated demo daily meal plan with balanced nutrition'
      };
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
   * Generate a weekly workout plan based on user experience level
   */
  async generateWeeklyWorkoutPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1
  ): Promise<AIResponse<WeeklyWorkoutPlan>> {
    if (this.isRealAIAvailable()) {
      return weeklyContentGenerator.generateWeeklyWorkoutPlan(personalInfo, fitnessGoals, weekNumber);
    } else {
      // Demo mode: Generate realistic weekly workout plan
      const workoutsPerWeek = fitnessGoals.experienceLevel === 'beginner' ? 3 : 
                              fitnessGoals.experienceLevel === 'intermediate' ? 4 : 5;
      
      const demoWorkouts = [];
      for (let i = 0; i < workoutsPerWeek; i++) {
        const workout = await demoAIService.generateDemoWorkout(personalInfo, fitnessGoals, {
          workoutType: ['strength', 'cardio', 'flexibility'][i % 3] as any,
          duration: 30 + (i * 10),
        });
        if (workout.success) {
          demoWorkouts.push(workout.data);
        }
      }
      
      return {
        success: true,
        data: {
          weekNumber,
          totalWorkouts: demoWorkouts.length,
          workouts: demoWorkouts,
          weeklyGoals: {
            caloriesBurned: demoWorkouts.reduce((sum, w) => sum + (w.estimatedCalories || 200), 0),
            totalDuration: demoWorkouts.reduce((sum, w) => sum + w.duration, 0),
            focusAreas: ['Strength Building', 'Cardiovascular Health', 'Flexibility']
          }
        } as WeeklyWorkoutPlan,
        reasoning: `Demo weekly workout plan generated with ${workoutsPerWeek} workouts for ${fitnessGoals.experienceLevel} level`
      };
    }
  }

  /**
   * Generate a weekly meal plan with macro tracking
   */
  async generateWeeklyMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    weekNumber: number = 1
  ): Promise<AIResponse<WeeklyMealPlan>> {
    if (this.isRealAIAvailable()) {
      return weeklyContentGenerator.generateWeeklyMealPlan(personalInfo, fitnessGoals, weekNumber);
    } else {
      // Demo mode: Generate realistic weekly meal plan
      const daysToGenerate = 7; // Always generate a full week
      const dailyMealPlans = [];
      
      for (let day = 0; day < daysToGenerate; day++) {
        const breakfast = await demoAIService.generateDemoMeal(personalInfo, fitnessGoals, 'breakfast');
        const lunch = await demoAIService.generateDemoMeal(personalInfo, fitnessGoals, 'lunch');
        const dinner = await demoAIService.generateDemoMeal(personalInfo, fitnessGoals, 'dinner');
        const snack = await demoAIService.generateDemoMeal(personalInfo, fitnessGoals, 'snack');
        
        if (breakfast.success && lunch.success && dinner.success && snack.success) {
          dailyMealPlans.push({
            date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            meals: [breakfast.data, lunch.data, dinner.data, snack.data],
            totalCalories: breakfast.data.totalCalories + lunch.data.totalCalories + dinner.data.totalCalories + snack.data.totalCalories,
            totalMacros: {
              protein: breakfast.data.totalMacros.protein + lunch.data.totalMacros.protein + dinner.data.totalMacros.protein + snack.data.totalMacros.protein,
              carbohydrates: breakfast.data.totalMacros.carbohydrates + lunch.data.totalMacros.carbohydrates + dinner.data.totalMacros.carbohydrates + snack.data.totalMacros.carbohydrates,
              fat: breakfast.data.totalMacros.fat + lunch.data.totalMacros.fat + dinner.data.totalMacros.fat + snack.data.totalMacros.fat,
              fiber: breakfast.data.totalMacros.fiber + lunch.data.totalMacros.fiber + dinner.data.totalMacros.fiber + snack.data.totalMacros.fiber
            }
          });
        }
      }
      
      const totalWeeklyCalories = dailyMealPlans.reduce((sum, day) => sum + day.totalCalories, 0);
      const avgDailyCalories = Math.round(totalWeeklyCalories / dailyMealPlans.length);
      
      return {
        success: true,
        data: {
          weekNumber,
          dailyMealPlans,
          weeklyNutritionSummary: {
            averageDailyCalories: avgDailyCalories,
            totalWeeklyCalories: totalWeeklyCalories,
            macroDistribution: {
              proteinPercent: 25,
              carbohydratePercent: 45,
              fatPercent: 30
            }
          },
          nutritionGoals: {
            calorieGoal: avgDailyCalories,
            proteinGoal: Math.round(avgDailyCalories * 0.25 / 4), // 25% of calories from protein
            carbGoal: Math.round(avgDailyCalories * 0.45 / 4), // 45% from carbs
            fatGoal: Math.round(avgDailyCalories * 0.30 / 9) // 30% from fat
          }
        } as WeeklyMealPlan,
        reasoning: `Demo weekly meal plan generated with ${dailyMealPlans.length} daily meal plans, averaging ${avgDailyCalories} calories per day`
      };
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
