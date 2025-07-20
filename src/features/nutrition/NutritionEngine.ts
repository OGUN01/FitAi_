// Nutrition Engine - Integrates AI generation with food database

import { nutritionAnalyzer } from '../../ai/nutritionAnalyzer';
import { 
  FOODS, 
  getFoodById, 
  getFoodsByCategory, 
  searchFoods, 
  calculateNutrition,
  getHighProteinFoods,
  getLowCalorieFoods
} from '../../data/foods';
import { 
  Meal, 
  NutritionPlan, 
  DailyMealPlan, 
  Food, 
  MealItem,
  Macronutrients,
  AIResponse 
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
    try {
      // First, get AI-generated meal structure
      const aiResponse = await nutritionAnalyzer.generatePersonalizedMeal(
        personalInfo,
        fitnessGoals,
        mealType,
        preferences
      );

      if (!aiResponse.success || !aiResponse.data) {
        return aiResponse;
      }

      // Enhance the meal with real food data
      const enhancedMeal = await this.enhanceMealWithFoodData(
        aiResponse.data,
        preferences?.dietaryRestrictions || []
      );

      return {
        success: true,
        data: enhancedMeal,
        confidence: aiResponse.confidence,
        generationTime: aiResponse.generationTime,
        tokensUsed: aiResponse.tokensUsed
      };
    } catch (error) {
      return {
        success: false,
        error: `Smart meal plan generation failed: ${error}`
      };
    }
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
    try {
      const aiResponse = await nutritionAnalyzer.generateDailyMealPlan(
        personalInfo,
        fitnessGoals,
        preferences
      );

      if (!aiResponse.success || !aiResponse.data) {
        return aiResponse;
      }

      // Enhance all meals with real food data
      const enhancedMeals: Meal[] = [];
      for (const meal of aiResponse.data.meals) {
        const enhancedMeal = await this.enhanceMealWithFoodData(
          meal,
          preferences?.dietaryRestrictions || []
        );
        enhancedMeals.push(enhancedMeal);
      }

      // Recalculate totals
      const totalCalories = enhancedMeals.reduce((sum, meal) => sum + meal.totalCalories, 0);
      const totalMacros = this.calculateTotalMacros(enhancedMeals);

      const enhancedPlan: DailyMealPlan = {
        ...aiResponse.data,
        meals: enhancedMeals,
        totalCalories,
        totalMacros
      };

      return {
        success: true,
        data: enhancedPlan,
        confidence: aiResponse.confidence,
        generationTime: aiResponse.generationTime
      };
    } catch (error) {
      return {
        success: false,
        error: `Smart daily plan generation failed: ${error}`
      };
    }
  }

  /**
   * Create a custom meal from selected foods
   */
  createCustomMeal(
    foodSelections: { foodId: string; quantity: number }[],
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    mealName: string
  ): Meal {
    const mealItems: MealItem[] = [];
    let totalCalories = 0;
    let totalMacros: Macronutrients = { protein: 0, carbohydrates: 0, fat: 0, fiber: 0 };

    for (const selection of foodSelections) {
      const food = getFoodById(selection.foodId);
      if (!food) continue;

      const nutrition = calculateNutrition(food, selection.quantity);
      
      const mealItem: MealItem = {
        foodId: food.id,
        food,
        quantity: selection.quantity,
        calories: nutrition.calories,
        macros: nutrition.macros
      };

      mealItems.push(mealItem);
      totalCalories += nutrition.calories;
      totalMacros.protein += nutrition.macros.protein;
      totalMacros.carbohydrates += nutrition.macros.carbohydrates;
      totalMacros.fat += nutrition.macros.fat;
      totalMacros.fiber += nutrition.macros.fiber;
    }

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
        fiber: Math.round(totalMacros.fiber * 10) / 10
      },
      tags: ['custom'],
      isPersonalized: true,
      aiGenerated: false,
      scheduledTime: this.getDefaultMealTime(mealType)
    };
  }

  /**
   * Get food recommendations based on user goals
   */
  getFoodRecommendations(
    fitnessGoals: FitnessGoals,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    dietaryRestrictions: string[] = [],
    count: number = 10
  ): Food[] {
    let recommendedFoods: Food[] = [];

    // Base recommendations on goals
    if (fitnessGoals.primaryGoals.includes('muscle_gain')) {
      recommendedFoods = getHighProteinFoods(15);
    } else if (fitnessGoals.primaryGoals.includes('weight_loss')) {
      recommendedFoods = getLowCalorieFoods(150);
    } else {
      // General fitness - balanced selection
      recommendedFoods = [
        ...getFoodsByCategory('protein').slice(0, 3),
        ...getFoodsByCategory('vegetables').slice(0, 3),
        ...getFoodsByCategory('fruits').slice(0, 2),
        ...getFoodsByCategory('grains').slice(0, 2)
      ];
    }

    // Filter by dietary restrictions
    if (dietaryRestrictions.length > 0) {
      recommendedFoods = recommendedFoods.filter(food => {
        // Check if food meets dietary restrictions
        if (dietaryRestrictions.includes('vegan') && !food.dietaryLabels.includes('vegan')) {
          return food.category !== 'dairy' && !food.allergens.includes('eggs');
        }
        if (dietaryRestrictions.includes('vegetarian') && food.category === 'protein') {
          return !food.name.toLowerCase().includes('chicken') && 
                 !food.name.toLowerCase().includes('beef') && 
                 !food.name.toLowerCase().includes('fish');
        }
        if (dietaryRestrictions.includes('gluten-free')) {
          return !food.allergens.includes('gluten');
        }
        return true;
      });
    }

    // Meal-specific recommendations
    if (mealType === 'breakfast') {
      const breakfastFoods = FOODS.filter(food => 
        food.name.toLowerCase().includes('oats') ||
        food.name.toLowerCase().includes('eggs') ||
        food.name.toLowerCase().includes('yogurt') ||
        food.category === 'fruits'
      );
      recommendedFoods = [...recommendedFoods, ...breakfastFoods];
    }

    // Remove duplicates and limit count
    const uniqueFoods = recommendedFoods.filter((food, index, self) => 
      index === self.findIndex(f => f.id === food.id)
    );

    return uniqueFoods.slice(0, count);
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
    const categories = new Set(meal.items.map(item => item.food.category));
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
      suggestions
    };
  }

  /**
   * Search foods with filters
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
    let results = searchFoods(query);

    if (filters) {
      if (filters.category) {
        results = results.filter(food => food.category === filters.category);
      }
      if (filters.dietaryLabels) {
        results = results.filter(food => 
          filters.dietaryLabels!.some(label => food.dietaryLabels.includes(label))
        );
      }
      if (filters.maxCalories) {
        results = results.filter(food => food.calories <= filters.maxCalories!);
      }
      if (filters.minProtein) {
        results = results.filter(food => food.macros.protein >= filters.minProtein!);
      }
    }

    return results;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async enhanceMealWithFoodData(
    aiMeal: Meal,
    dietaryRestrictions: string[]
  ): Promise<Meal> {
    const enhancedItems: MealItem[] = [];

    for (const item of aiMeal.items) {
      // Try to find matching food in our database
      let food = getFoodById(item.foodId);
      
      if (!food) {
        // If not found, find a similar food
        food = this.findSimilarFood(item.food.name, dietaryRestrictions);
      }

      if (food) {
        const nutrition = calculateNutrition(food, item.quantity);
        enhancedItems.push({
          ...item,
          foodId: food.id,
          food,
          calories: nutrition.calories,
          macros: nutrition.macros
        });
      } else {
        // Keep original if no match found
        enhancedItems.push(item);
      }
    }

    // Recalculate totals
    const totalCalories = enhancedItems.reduce((sum, item) => sum + item.calories, 0);
    const totalMacros = this.calculateTotalMacros([{ ...aiMeal, items: enhancedItems }]);

    return {
      ...aiMeal,
      items: enhancedItems,
      totalCalories,
      totalMacros
    };
  }

  private findSimilarFood(foodName: string, dietaryRestrictions: string[]): Food | null {
    // Search for similar foods
    let candidates = searchFoods(foodName);

    // Filter by dietary restrictions
    if (dietaryRestrictions.length > 0) {
      candidates = candidates.filter(food => {
        if (dietaryRestrictions.includes('vegan')) {
          return food.dietaryLabels.includes('vegan') || 
                 (food.category !== 'dairy' && !food.allergens.includes('eggs'));
        }
        if (dietaryRestrictions.includes('gluten-free')) {
          return !food.allergens.includes('gluten');
        }
        return true;
      });
    }

    return candidates.length > 0 ? candidates[0] : null;
  }

  private calculateTotalMacros(meals: Meal[]): Macronutrients {
    return meals.reduce((totals, meal) => ({
      protein: totals.protein + meal.totalMacros.protein,
      carbohydrates: totals.carbohydrates + meal.totalMacros.carbohydrates,
      fat: totals.fat + meal.totalMacros.fat,
      fiber: totals.fiber + meal.totalMacros.fiber
    }), { protein: 0, carbohydrates: 0, fat: 0, fiber: 0 });
  }

  private getDefaultMealTime(mealType: string): string {
    const times = {
      breakfast: '08:00',
      lunch: '12:30',
      dinner: '19:00',
      snack: '15:00'
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
