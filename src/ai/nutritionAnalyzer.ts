// AI-Powered Nutrition Analysis and Meal Planning Service for FitAI

import { geminiService, PROMPT_TEMPLATES, formatUserProfileForAI, calculateDailyCalories } from './gemini';
import { NUTRITION_SCHEMA, FOOD_ANALYSIS_SCHEMA } from './schemas';
import {
  Meal,
  NutritionPlan,
  DailyMealPlan,
  AIResponse,
  AINutritionRequest,
  Macronutrients,
  MealItem,
  Food
} from '../types/ai';
import { PersonalInfo, FitnessGoals } from '../types/user';

// ============================================================================
// NUTRITION ANALYSIS SERVICE
// ============================================================================

class NutritionAnalyzerService {

  /**
   * Generate a personalized meal based on user profile and preferences
   */
  async generatePersonalizedMeal(
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
      const userProfile = formatUserProfileForAI(personalInfo, fitnessGoals);
      const dailyCalories = calculateDailyCalories(personalInfo);
      
      // Calculate meal-specific calorie target
      const mealCalorieTargets = {
        breakfast: Math.round(dailyCalories * 0.25),
        lunch: Math.round(dailyCalories * 0.35),
        dinner: Math.round(dailyCalories * 0.30),
        snack: Math.round(dailyCalories * 0.10)
      };

      const calorieTarget = preferences?.calorieTarget || mealCalorieTargets[mealType];

      const variables = {
        ...userProfile,
        mealType,
        calorieTarget,
        dietaryRestrictions: preferences?.dietaryRestrictions?.join(', ') || 'none',
        cuisinePreferences: preferences?.cuisinePreference || 'any',
        prepTimeLimit: preferences?.prepTimeLimit || 30
      };

      const response = await geminiService.generateResponse<any>(
        PROMPT_TEMPLATES.NUTRITION_PLANNING,
        variables,
        NUTRITION_SCHEMA
      );

      if (!response.success || !response.data) {
        return response as AIResponse<Meal>;
      }

      // Transform AI response to our Meal type
      const mealData = response.data.meals[0]; // Get first meal from response
      const meal: Meal = {
        id: this.generateMealId(),
        type: mealType,
        name: mealData.name,
        items: mealData.items.map((item: any) => ({
          foodId: this.generateFoodId(item.name),
          food: {
            id: this.generateFoodId(item.name),
            name: item.name,
            category: this.categorizeFood(item.name),
            calories: Math.round((item.calories / item.quantity) * 100), // per 100g
            macros: {
              protein: item.protein || 0,
              carbohydrates: item.carbs || 0,
              fat: item.fat || 0,
              fiber: 0
            },
            servingSize: 100,
            servingUnit: 'g',
            allergens: [],
            dietaryLabels: [],
            verified: false
          },
          quantity: item.quantity,
          calories: item.calories,
          macros: {
            protein: item.protein || 0,
            carbohydrates: item.carbs || 0,
            fat: item.fat || 0,
            fiber: 0
          }
        })),
        totalCalories: mealData.totalCalories,
        totalMacros: {
          protein: response.data.totalMacros.protein,
          carbohydrates: response.data.totalMacros.carbohydrates,
          fat: response.data.totalMacros.fat,
          fiber: response.data.totalMacros.fiber
        },
        prepTime: mealData.prepTime,
        difficulty: mealData.difficulty,
        tags: mealData.tags || [],
        isPersonalized: true,
        aiGenerated: true,
        scheduledTime: this.getDefaultMealTime(mealType),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return {
        success: true,
        data: meal,
        confidence: response.confidence,
        generationTime: response.generationTime,
        tokensUsed: response.tokensUsed
      };
    } catch (error) {
      return {
        success: false,
        error: `Meal generation failed: ${error}`
      };
    }
  }

  /**
   * Generate a full day meal plan
   */
  async generateDailyMealPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: {
      dietaryRestrictions?: string[];
      cuisinePreferences?: string[];
      calorieTarget?: number;
    }
  ): Promise<AIResponse<DailyMealPlan>> {
    try {
      const calorieTarget = preferences?.calorieTarget || calculateDailyCalories(personalInfo);
      const meals: Meal[] = [];
      const mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = ['breakfast', 'lunch', 'dinner', 'snack'];

      // Generate each meal
      for (const mealType of mealTypes) {
        const mealResponse = await this.generatePersonalizedMeal(
          personalInfo,
          fitnessGoals,
          mealType,
          {
            dietaryRestrictions: preferences?.dietaryRestrictions,
            cuisinePreference: preferences?.cuisinePreferences?.[0]
          }
        );

        if (mealResponse.success && mealResponse.data) {
          meals.push(mealResponse.data);
        }
      }

      if (meals.length === 0) {
        return {
          success: false,
          error: 'Failed to generate any meals for the day'
        };
      }

      // Calculate totals
      const totalCalories = meals.reduce((sum, meal) => sum + meal.totalCalories, 0);
      const totalMacros = meals.reduce((totals, meal) => ({
        protein: totals.protein + meal.totalMacros.protein,
        carbohydrates: totals.carbohydrates + meal.totalMacros.carbohydrates,
        fat: totals.fat + meal.totalMacros.fat,
        fiber: totals.fiber + meal.totalMacros.fiber
      }), { protein: 0, carbohydrates: 0, fat: 0, fiber: 0 });

      const dailyPlan: DailyMealPlan = {
        date: new Date().toISOString().split('T')[0],
        meals,
        totalCalories,
        totalMacros,
        waterIntake: this.calculateWaterTarget(personalInfo),
        adherence: 100 // Default to 100% for new plans
      };

      return {
        success: true,
        data: dailyPlan
      };
    } catch (error) {
      return {
        success: false,
        error: `Daily meal plan generation failed: ${error}`
      };
    }
  }

  /**
   * Generate a weekly nutrition plan
   */
  async generateWeeklyNutritionPlan(
    personalInfo: PersonalInfo,
    fitnessGoals: FitnessGoals,
    preferences?: {
      dietaryRestrictions?: string[];
      cuisinePreferences?: string[];
      calorieTarget?: number;
    }
  ): Promise<AIResponse<NutritionPlan>> {
    try {
      const dailyPlans: DailyMealPlan[] = [];
      const startDate = new Date();

      // Generate 7 days of meal plans
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const dailyPlanResponse = await this.generateDailyMealPlan(
          personalInfo,
          fitnessGoals,
          preferences
        );

        if (dailyPlanResponse.success && dailyPlanResponse.data) {
          dailyPlanResponse.data.date = date.toISOString().split('T')[0];
          dailyPlans.push(dailyPlanResponse.data);
        }
      }

      if (dailyPlans.length === 0) {
        return {
          success: false,
          error: 'Failed to generate any daily meal plans'
        };
      }

      const calorieTarget = preferences?.calorieTarget || calculateDailyCalories(personalInfo);
      const macroTargets = this.calculateMacroTargets(calorieTarget, fitnessGoals);

      const nutritionPlan: NutritionPlan = {
        id: this.generatePlanId(),
        title: `${personalInfo.name}'s Weekly Nutrition Plan`,
        description: `Personalized 7-day meal plan targeting ${fitnessGoals.primaryGoals.join(', ')}`,
        duration: 7,
        dailyPlans,
        calorieTarget,
        macroTargets,
        dietaryRestrictions: (preferences?.dietaryRestrictions || []) as any[],
        goals: (fitnessGoals.primaryGoals || []) as any[],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return {
        success: true,
        data: nutritionPlan
      };
    } catch (error) {
      return {
        success: false,
        error: `Weekly nutrition plan generation failed: ${error}`
      };
    }
  }

  /**
   * Analyze food from image or description
   */
  async analyzeFoodItem(
    description: string,
    imageBase64?: string
  ): Promise<AIResponse<Food>> {
    try {
      let prompt = `
Analyze the following food item and provide detailed nutritional information:

Food Description: ${description}

Return ONLY a valid JSON object with this structure:
{
  "name": "Food name",
  "category": "food category",
  "calories": number_per_100g,
  "macros": {
    "protein": grams_per_100g,
    "carbohydrates": grams_per_100g,
    "fat": grams_per_100g,
    "fiber": grams_per_100g
  },
  "servingSize": typical_serving_size_in_grams,
  "servingUnit": "g|ml|piece|cup",
  "allergens": ["allergen1", "allergen2"],
  "dietaryLabels": ["vegan", "gluten-free", etc]
}
`;

      const response = await geminiService.generateResponse<any>(prompt, {}, FOOD_ANALYSIS_SCHEMA);

      if (!response.success || !response.data) {
        return response as AIResponse<Food>;
      }

      const food: Food = {
        id: this.generateFoodId(response.data.name),
        name: response.data.name,
        category: response.data.category,
        nutrition: {
          calories: response.data.calories,
          macros: response.data.macros,
          servingSize: response.data.servingSize,
          servingUnit: response.data.servingUnit
        },
        allergens: response.data.allergens || [],
        dietaryLabels: response.data.dietaryLabels || [],
        verified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return {
        success: true,
        data: food,
        confidence: response.confidence,
        generationTime: response.generationTime
      };
    } catch (error) {
      return {
        success: false,
        error: `Food analysis failed: ${error}`
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateMealId(): string {
    return `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFoodId(name: string): string {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `food_${cleanName}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generatePlanId(): string {
    return `nutrition_plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private categorizeFood(name: string): string {
    const categories: Record<string, string[]> = {
      'protein': ['chicken', 'beef', 'fish', 'eggs', 'tofu', 'beans', 'lentils'],
      'grains': ['rice', 'bread', 'pasta', 'oats', 'quinoa', 'barley'],
      'vegetables': ['broccoli', 'spinach', 'carrots', 'tomatoes', 'peppers'],
      'fruits': ['apple', 'banana', 'berries', 'orange', 'grapes'],
      'dairy': ['milk', 'cheese', 'yogurt', 'butter'],
      'nuts_seeds': ['almonds', 'walnuts', 'seeds', 'peanuts'],
      'oils_fats': ['olive oil', 'coconut oil', 'avocado']
    };

    const lowerName = name.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    return 'other';
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

  private calculateWaterTarget(personalInfo: PersonalInfo): number {
    // Basic water calculation: 35ml per kg of body weight
    const weight = parseFloat(personalInfo.weight);
    return Math.round(weight * 35); // in ml
  }

  private calculateMacroTargets(calorieTarget: number, fitnessGoals: FitnessGoals): Macronutrients {
    // Default macro distribution based on goals
    let proteinPercent = 0.25;
    let carbPercent = 0.45;
    let fatPercent = 0.30;

    // Adjust based on primary goals
    if (fitnessGoals.primaryGoals.includes('muscle_gain')) {
      proteinPercent = 0.30;
      carbPercent = 0.40;
      fatPercent = 0.30;
    } else if (fitnessGoals.primaryGoals.includes('weight_loss')) {
      proteinPercent = 0.30;
      carbPercent = 0.35;
      fatPercent = 0.35;
    }

    return {
      protein: Math.round((calorieTarget * proteinPercent) / 4), // 4 cal per gram
      carbohydrates: Math.round((calorieTarget * carbPercent) / 4), // 4 cal per gram
      fat: Math.round((calorieTarget * fatPercent) / 9), // 9 cal per gram
      fiber: 25 // Standard recommendation
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const nutritionAnalyzer = new NutritionAnalyzerService();

export default nutritionAnalyzer;
