// Nutrition Engine - Integrates AI generation with food database

// Note: nutritionAnalyzer is deprecated. Use Cloudflare Workers backend instead.
// Import removed to prevent errors. AI generation is now handled by fitaiWorkersClient.
import {
  Meal,
  NutritionPlan,
  DailyMealPlan,
  Food,
  MealItem,
  Macronutrients,
  AIResponse,
} from '../../types/ai';
import { PersonalInfo, FitnessGoals } from '../../types/user';

// ============================================================================
// NUTRITION ENGINE SERVICE
// ============================================================================

class NutritionEngineService {
  /**
   * Generate a smart meal plan with real food data
   */
  async generateSmartMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    preferences?: {
      calorieTarget?: number;
      dietaryRestrictions?: string[];
      cuisinePreference?: string;
      prepTimeLimit?: number;
    }
  ): Promise<AIResponse<Meal>> {
    // DEPRECATED: nutritionAnalyzer removed. Use fitaiWorkersClient instead.
    return {
      success: false,
      error: 'nutritionAnalyzer is deprecated. Please use fitaiWorkersClient for AI meal generation.',
    };
  }

  /**
   * Generate a complete daily meal plan
   */
  async generateSmartDailyPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: {
      dietaryRestrictions?: string[];
      cuisinePreferences?: string[];
      calorieTarget?: number;
    }
  ): Promise<AIResponse<DailyMealPlan>> {
    // DEPRECATED: nutritionAnalyzer removed. Use fitaiWorkersClient instead.
    return {
      success: false,
      error: 'nutritionAnalyzer is deprecated. Please use fitaiWorkersClient for AI meal generation.',
    };
  }

  /**
   * Create a custom meal from selected foods
   * Note: Nutrition data should come from external APIs or Supabase food database
   */
  createCustomMeal(
    foodSelections: { foodId: string; quantity: number; name?: string; nutrition?: any }[],
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    mealName: string
  ): Meal {
    const mealItems: MealItem[] = [];
    let totalCalories = 0;
    const totalMacros: Macronutrients = { protein: 0, carbohydrates: 0, fat: 0, fiber: 0 };

    for (const selection of foodSelections) {
      // Use nutrition data passed in (from Supabase or external APIs)
      if (!selection.nutrition) {
        console.warn(`No nutrition data provided for food: ${selection.name || selection.foodId}`);
        continue;
      }

      const { calories, macros } = selection.nutrition;

      const mealItem: MealItem = {
        foodId: selection.foodId,
        food: {
          id: selection.foodId,
          name: selection.name || 'Unknown Food',
          category: 'snacks',
          nutrition: {
            calories,
            macros,
            servingSize: 100,
            servingUnit: 'g',
          },
          allergens: [],
          dietaryLabels: [],
          verified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        quantity: selection.quantity,
        calories,
        macros,
      };

      mealItems.push(mealItem);
      totalCalories += calories;
      totalMacros.protein += macros.protein;
      totalMacros.carbohydrates += macros.carbohydrates;
      totalMacros.fat += macros.fat;
      totalMacros.fiber += macros.fiber;
    }

    const now = new Date().toISOString();

    return {
      id: this.generateMealId(),
      type: mealType,
      name: mealName,
      items: mealItems,
      totalCalories: Math.round(totalCalories),
      totalMacros: {
        protein: Math.round(totalMacros.protein * 10) / 10,
        carbohydrates: Math.round(totalMacros.carbohydrates * 10) / 10,
        fat: Math.round(totalMacros.fat * 10) / 10,
        fiber: Math.round(totalMacros.fiber * 10) / 10,
      },
      tags: ['custom'],
      isPersonalized: true,
      aiGenerated: false,
      scheduledTime: this.getDefaultMealTime(mealType),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get food recommendations based on user goals
   * Now relies on AI to provide recommendations based on user profile
   */
  getFoodRecommendations(
    fitnessGoals: FitnessGoals,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    dietaryRestrictions: string[] = [],
    count: number = 10
  ): Food[] {
    // AI-first approach: Return empty array and let AI handle recommendations
    // AI has full knowledge of all foods and will generate appropriate meals
    // based on user's fitness goals, dietary restrictions, and preferences
    console.log(
      'Food recommendations requested - delegating to AI for generation',
      { mealType, fitnessGoals, dietaryRestrictions }
    );
    return [];
  }

  /**
   * Analyze a meal for nutritional balance
   */
  analyzeMealBalance(meal: Meal): {
    score: number;
    feedback: string[];
    suggestions: string[];
  } {
    const feedback: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    const { totalCalories, totalMacros } = meal;

    // Check calorie distribution
    const proteinCalories = totalMacros.protein * 4;
    const carbCalories = totalMacros.carbohydrates * 4;
    const fatCalories = totalMacros.fat * 9;

    const proteinPercent = (proteinCalories / totalCalories) * 100;
    const carbPercent = (carbCalories / totalCalories) * 100;
    const fatPercent = (fatCalories / totalCalories) * 100;

    // Protein analysis
    if (proteinPercent < 15) {
      score -= 20;
      feedback.push('Low protein content');
      suggestions.push('Add more protein-rich foods like chicken, fish, or legumes');
    } else if (proteinPercent > 40) {
      score -= 10;
      feedback.push('Very high protein content');
      suggestions.push('Balance with more carbohydrates or healthy fats');
    } else {
      feedback.push('Good protein balance');
    }

    // Carbohydrate analysis
    if (carbPercent < 20) {
      score -= 15;
      feedback.push('Low carbohydrate content');
      suggestions.push('Add complex carbs like quinoa, brown rice, or sweet potato');
    } else if (carbPercent > 65) {
      score -= 15;
      feedback.push('High carbohydrate content');
      suggestions.push('Balance with more protein or healthy fats');
    } else {
      feedback.push('Good carbohydrate balance');
    }

    // Fat analysis
    if (fatPercent < 15) {
      score -= 15;
      feedback.push('Low healthy fat content');
      suggestions.push('Add healthy fats like avocado, nuts, or olive oil');
    } else if (fatPercent > 40) {
      score -= 10;
      feedback.push('High fat content');
      suggestions.push('Reduce portion sizes of high-fat foods');
    } else {
      feedback.push('Good fat balance');
    }

    // Fiber analysis
    if (totalMacros.fiber < 5) {
      score -= 10;
      feedback.push('Low fiber content');
      suggestions.push('Add more vegetables, fruits, or whole grains');
    } else {
      feedback.push('Good fiber content');
    }

    // Variety analysis
    const categories = new Set(meal.items.map((item) => item.food.category));
    if (categories.size < 2) {
      score -= 15;
      feedback.push('Limited food variety');
      suggestions.push('Include foods from different categories for better nutrition');
    } else {
      feedback.push('Good food variety');
    }

    return {
      score: Math.max(0, score),
      feedback,
      suggestions,
    };
  }

  /**
   * Search foods with filters
   * Note: Food search and recommendations should be handled by AI
   */
  searchFoodsWithFilters(
    query: string,
    filters?: {
      category?: string;
      dietaryLabels?: string[];
      maxCalories?: number;
      minProtein?: number;
    }
  ): Food[] {
    // AI-first approach: Food search is delegated to AI which has full knowledge
    console.log('Food search requested - delegating to AI', { query, filters });
    return [];
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async enhanceMealWithFoodData(
    aiMeal: Meal,
    dietaryRestrictions: string[]
  ): Promise<Meal> {
    // AI meals already have nutrition data calculated by AI
    // No need to enhance with local database since we're using AI-first approach
    const totalCalories = aiMeal.items.reduce((sum, item) => sum + item.calories, 0);
    const totalMacros = this.calculateTotalMacros([aiMeal]);

    return {
      ...aiMeal,
      totalCalories,
      totalMacros,
    };
  }

  private calculateTotalMacros(meals: Meal[]): Macronutrients {
    return meals.reduce(
      (totals, meal) => ({
        protein: totals.protein + meal.totalMacros.protein,
        carbohydrates: totals.carbohydrates + meal.totalMacros.carbohydrates,
        fat: totals.fat + meal.totalMacros.fat,
        fiber: totals.fiber + meal.totalMacros.fiber,
      }),
      { protein: 0, carbohydrates: 0, fat: 0, fiber: 0 }
    );
  }

  private getDefaultMealTime(mealType: string): string {
    const times = {
      breakfast: '08:00',
      lunch: '12:30',
      dinner: '19:00',
      snack: '15:00',
    };

    const today = new Date();
    const timeString = times[mealType as keyof typeof times] || '12:00';
    return `${today.toISOString().split('T')[0]}T${timeString}:00.000Z`;
  }

  private generateMealId(): string {
    return `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const nutritionEngine = new NutritionEngineService();

export default nutritionEngine;
