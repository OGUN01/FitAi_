// AI-Powered Nutrition Analysis and Meal Planning Service for FitAI

import {
  geminiService,
  PROMPT_TEMPLATES,
  formatUserProfileForAI,
  calculateDailyCalories,
} from './gemini';
import { NUTRITION_SCHEMA, FOOD_ANALYSIS_SCHEMA } from './schemas';
import {
  SIMPLIFIED_DAILY_NUTRITION_SCHEMA,
  SIMPLE_FOOD_ANALYSIS_SCHEMA,
} from './schemas/simplifiedNutritionSchema';
import {
  Meal,
  NutritionPlan,
  DailyMealPlan,
  AIResponse,
  AINutritionRequest,
  Macronutrients,
  MealItem,
  Food,
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
        dinner: Math.round(dailyCalories * 0.3),
        snack: Math.round(dailyCalories * 0.1),
      };

      const calorieTarget = preferences?.calorieTarget || mealCalorieTargets[mealType];

      const variables = {
        ...userProfile,
        mealType,
        calorieTarget,
        dietaryRestrictions: preferences?.dietaryRestrictions?.join(', ') || 'none',
        cuisinePreferences: preferences?.cuisinePreference || 'any',
        prepTimeLimit: preferences?.prepTimeLimit || 30,
      };

      // 🔧 Using simplified schema to fix nutrition generation issues
      console.log('🧪 Using simplified daily nutrition schema for reliable meal generation...');

      const response = await geminiService.generateResponse<any>(
        PROMPT_TEMPLATES.NUTRITION_PLANNING,
        variables,
        SIMPLIFIED_DAILY_NUTRITION_SCHEMA, // ✅ Using simplified schema instead of complex NUTRITION_SCHEMA
        2, // Reduced retries for faster debugging
        {
          maxOutputTokens: 2048, // 🔧 Reduced from default to avoid token overflow
          temperature: 0.4, // 🔧 Lower temperature for consistent JSON structure
        }
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
              fiber: 0,
            },
            servingSize: 100,
            servingUnit: 'g',
            allergens: [],
            dietaryLabels: [],
            verified: false,
          },
          quantity: item.quantity,
          calories: item.calories,
          macros: {
            protein: item.protein || 0,
            carbohydrates: item.carbs || 0,
            fat: item.fat || 0,
            fiber: 0,
          },
        })),
        totalCalories: mealData.totalCalories,
        totalMacros: {
          protein: response.data.totalMacros.protein,
          carbohydrates: response.data.totalMacros.carbohydrates,
          fat: response.data.totalMacros.fat,
          fiber: response.data.totalMacros.fiber,
        },
        prepTime: mealData.prepTime,
        difficulty: mealData.difficulty,
        tags: mealData.tags || [],
        isPersonalized: true,
        aiGenerated: true,
        scheduledTime: this.getDefaultMealTime(mealType),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: meal,
        confidence: response.confidence,
        generationTime: response.generationTime,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      return {
        success: false,
        error: `Meal generation failed: ${error}`,
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
      const mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = [
        'breakfast',
        'lunch',
        'dinner',
        'snack',
      ];

      // Generate each meal
      for (const mealType of mealTypes) {
        const mealResponse = await this.generatePersonalizedMeal(
          personalInfo,
          fitnessGoals,
          mealType,
          {
            dietaryRestrictions: preferences?.dietaryRestrictions,
            cuisinePreference: preferences?.cuisinePreferences?.[0],
          }
        );

        if (mealResponse.success && mealResponse.data) {
          meals.push(mealResponse.data);
        }
      }

      if (meals.length === 0) {
        return {
          success: false,
          error: 'Failed to generate any meals for the day',
        };
      }

      // Calculate totals
      const totalCalories = meals.reduce((sum, meal) => sum + meal.totalCalories, 0);
      const totalMacros = meals.reduce(
        (totals, meal) => ({
          protein: totals.protein + meal.totalMacros.protein,
          carbohydrates: totals.carbohydrates + meal.totalMacros.carbohydrates,
          fat: totals.fat + meal.totalMacros.fat,
          fiber: totals.fiber + meal.totalMacros.fiber,
        }),
        { protein: 0, carbohydrates: 0, fat: 0, fiber: 0 }
      );

      const dailyPlan: DailyMealPlan = {
        date: new Date().toISOString().split('T')[0],
        meals,
        totalCalories,
        totalMacros,
        waterIntake: this.calculateWaterTarget(personalInfo),
        adherence: 100, // Default to 100% for new plans
      };

      return {
        success: true,
        data: dailyPlan,
      };
    } catch (error) {
      return {
        success: false,
        error: `Daily meal plan generation failed: ${error}`,
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
          error: 'Failed to generate any daily meal plans',
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
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: nutritionPlan,
      };
    } catch (error) {
      return {
        success: false,
        error: `Weekly nutrition plan generation failed: ${error}`,
      };
    }
  }

  /**
   * Analyze food from image or description
   */
  async analyzeFoodItem(description: string, imageBase64?: string): Promise<AIResponse<Food>> {
    try {
      const prompt = `
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

      // 🔧 Using simplified food analysis schema
      console.log('🧪 Using simplified food analysis schema for reliable food recognition...');

      const response = await geminiService.generateResponse<any>(
        prompt,
        {},
        SIMPLE_FOOD_ANALYSIS_SCHEMA, // ✅ Using simplified schema instead of complex FOOD_ANALYSIS_SCHEMA
        2, // Reduced retries
        {
          maxOutputTokens: 1024, // 🔧 Small response for food analysis
          temperature: 0.3, // 🔧 Very low temperature for consistent food recognition
        }
      );

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
          servingUnit: response.data.servingUnit,
        },
        allergens: response.data.allergens || [],
        dietaryLabels: response.data.dietaryLabels || [],
        verified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: food,
        confidence: response.confidence,
        generationTime: response.generationTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Food analysis failed: ${error}`,
      };
    }
  }

  /**
   * Comprehensive health assessment for scanned products
   */
  async assessProductHealth(productData: {
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      sugar?: number;
      sodium?: number;
    };
    additionalInfo?: {
      ingredients?: string[];
      allergens?: string[];
      labels?: string[];
    };
    name: string;
    category?: string;
  }): Promise<{
    overallScore: number;
    category: 'excellent' | 'good' | 'moderate' | 'poor' | 'unhealthy';
    breakdown: {
      calories: { score: number; status: string; message: string };
      macros: { score: number; status: string; message: string };
      additives: { score: number; status: string; message: string };
      processing: { score: number; status: string; message: string };
    };
    recommendations: string[];
    alerts: string[];
    healthBenefits: string[];
    concerns: string[];
    alternatives?: string[];
  }> {
    try {
      const { nutrition, additionalInfo } = productData;
      
      // Calculate individual component scores
      const calorieAssessment = this.assessCalories(nutrition.calories);
      const macroAssessment = this.assessMacros(nutrition);
      const additiveAssessment = this.assessAdditives(additionalInfo?.ingredients || []);
      const processingAssessment = this.assessProcessingLevel(
        additionalInfo?.ingredients || [],
        additionalInfo?.labels || []
      );

      // Calculate weighted overall score
      const overallScore = Math.round(
        (calorieAssessment.score * 0.25) +
        (macroAssessment.score * 0.35) +
        (additiveAssessment.score * 0.20) +
        (processingAssessment.score * 0.20)
      );

      // Determine category
      const category = this.getHealthCategory(overallScore);

      // Generate recommendations and alerts
      const recommendations = this.generateHealthRecommendations(nutrition, overallScore);
      const alerts = this.generateHealthAlerts(nutrition, additionalInfo);
      const healthBenefits = this.identifyHealthBenefits(nutrition, additionalInfo?.labels || []);
      const concerns = this.identifyHealthConcerns(nutrition, additionalInfo);

      return {
        overallScore,
        category,
        breakdown: {
          calories: calorieAssessment,
          macros: macroAssessment,
          additives: additiveAssessment,
          processing: processingAssessment,
        },
        recommendations,
        alerts,
        healthBenefits,
        concerns,
        alternatives: this.suggestAlternatives(productData.category, overallScore)
      };

    } catch (error) {
      console.error('Health assessment error:', error);
      return {
        overallScore: 50,
        category: 'moderate',
        breakdown: {
          calories: { score: 50, status: 'unknown', message: 'Unable to assess' },
          macros: { score: 50, status: 'unknown', message: 'Unable to assess' },
          additives: { score: 50, status: 'unknown', message: 'Unable to assess' },
          processing: { score: 50, status: 'unknown', message: 'Unable to assess' },
        },
        recommendations: ['Unable to generate recommendations due to assessment error'],
        alerts: [],
        healthBenefits: [],
        concerns: ['Assessment could not be completed'],
      };
    }
  }

  // ============================================================================
  // HEALTH ASSESSMENT HELPER METHODS
  // ============================================================================

  private assessCalories(calories: number): { score: number; status: string; message: string } {
    if (calories <= 150) {
      return { score: 90, status: 'excellent', message: 'Low calorie content' };
    } else if (calories <= 250) {
      return { score: 75, status: 'good', message: 'Moderate calorie content' };
    } else if (calories <= 400) {
      return { score: 50, status: 'moderate', message: 'High calorie content' };
    } else if (calories <= 600) {
      return { score: 25, status: 'poor', message: 'Very high calorie content' };
    } else {
      return { score: 10, status: 'unhealthy', message: 'Extremely high calorie content' };
    }
  }

  private assessMacros(nutrition: any): { score: number; status: string; message: string } {
    let score = 100;
    const issues: string[] = [];

    // Assess fat content
    if (nutrition.fat > 30) {
      score -= 30;
      issues.push('high fat');
    } else if (nutrition.fat > 20) {
      score -= 15;
      issues.push('moderate fat');
    }

    // Assess sugar content
    if (nutrition.sugar && nutrition.sugar > 20) {
      score -= 25;
      issues.push('high sugar');
    } else if (nutrition.sugar && nutrition.sugar > 10) {
      score -= 10;
      issues.push('moderate sugar');
    }

    // Assess sodium content
    if (nutrition.sodium && nutrition.sodium > 1.5) {
      score -= 20;
      issues.push('high sodium');
    } else if (nutrition.sodium && nutrition.sodium > 0.8) {
      score -= 10;
      issues.push('moderate sodium');
    }

    // Reward good protein content
    if (nutrition.protein > 15) {
      score += 10;
    }

    // Reward good fiber content
    if (nutrition.fiber > 5) {
      score += 15;
    }

    score = Math.max(0, Math.min(100, score));

    const status = score >= 80 ? 'excellent' : 
                   score >= 60 ? 'good' : 
                   score >= 40 ? 'moderate' : 
                   score >= 20 ? 'poor' : 'unhealthy';

    const message = issues.length > 0 ? 
      `Macro concerns: ${issues.join(', ')}` : 
      'Good macronutrient profile';

    return { score, status, message };
  }

  private assessAdditives(ingredients: string[]): { score: number; status: string; message: string } {
    const harmfulAdditives = [
      'artificial colors', 'artificial flavors', 'high fructose corn syrup',
      'sodium benzoate', 'potassium sorbate', 'BHT', 'BHA', 'trans fat',
      'partially hydrogenated', 'aspartame', 'sucralose', 'MSG'
    ];

    let score = 100;
    const foundAdditives: string[] = [];

    ingredients.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      harmfulAdditives.forEach(additive => {
        if (lowerIngredient.includes(additive.toLowerCase())) {
          score -= 15;
          foundAdditives.push(additive);
        }
      });
    });

    score = Math.max(0, score);

    const status = score >= 80 ? 'excellent' : 
                   score >= 60 ? 'good' : 
                   score >= 40 ? 'moderate' : 
                   score >= 20 ? 'poor' : 'unhealthy';

    const message = foundAdditives.length > 0 ? 
      `Contains: ${foundAdditives.join(', ')}` : 
      'No concerning additives detected';

    return { score, status, message };
  }

  private assessProcessingLevel(ingredients: string[], labels: string[]): { score: number; status: string; message: string } {
    const processingIndicators = [
      'natural', 'organic', 'whole grain', 'minimally processed'
    ];
    
    const ultraProcessedIndicators = [
      'modified', 'enriched', 'fortified', 'concentrate', 'isolate', 'extract'
    ];

    let score = 60; // Start with neutral score
    
    // Check for positive indicators
    labels.forEach(label => {
      const lowerLabel = label.toLowerCase();
      processingIndicators.forEach(indicator => {
        if (lowerLabel.includes(indicator)) {
          score += 10;
        }
      });
    });

    // Check for negative indicators
    ingredients.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      ultraProcessedIndicators.forEach(indicator => {
        if (lowerIngredient.includes(indicator)) {
          score -= 8;
        }
      });
    });

    score = Math.max(0, Math.min(100, score));

    const status = score >= 80 ? 'excellent' : 
                   score >= 60 ? 'good' : 
                   score >= 40 ? 'moderate' : 
                   score >= 20 ? 'poor' : 'unhealthy';

    const message = score >= 70 ? 'Minimally processed' : 
                    score >= 40 ? 'Moderately processed' : 'Highly processed';

    return { score, status, message };
  }

  private getHealthCategory(score: number): 'excellent' | 'good' | 'moderate' | 'poor' | 'unhealthy' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'moderate';
    if (score >= 30) return 'poor';
    return 'unhealthy';
  }

  private generateHealthRecommendations(nutrition: any, overallScore: number): string[] {
    const recommendations: string[] = [];

    if (overallScore < 50) {
      recommendations.push('Consider this as an occasional treat rather than regular consumption');
    }

    if (nutrition.calories > 300) {
      recommendations.push('Watch portion sizes due to high calorie content');
    }

    if (nutrition.sugar && nutrition.sugar > 15) {
      recommendations.push('High sugar content - consider pairing with protein or fiber');
    }

    if (nutrition.sodium && nutrition.sodium > 1.0) {
      recommendations.push('High sodium - drink plenty of water and balance with low-sodium foods');
    }

    if (nutrition.fiber < 3) {
      recommendations.push('Low fiber content - add fruits, vegetables, or whole grains to your meal');
    }

    if (nutrition.protein < 5) {
      recommendations.push('Low protein - consider adding protein-rich foods to feel more satisfied');
    }

    return recommendations;
  }

  private generateHealthAlerts(nutrition: any, additionalInfo?: any): string[] {
    const alerts: string[] = [];

    if (nutrition.calories > 500) {
      alerts.push('⚠️ Very high calorie content');
    }

    if (nutrition.sugar && nutrition.sugar > 25) {
      alerts.push('🍯 Extremely high sugar content');
    }

    if (nutrition.sodium && nutrition.sodium > 2.0) {
      alerts.push('🧂 Excessive sodium levels');
    }

    if (nutrition.fat > 35) {
      alerts.push('🥓 Very high fat content');
    }

    if (additionalInfo?.allergens && additionalInfo.allergens.length > 0) {
      alerts.push(`⚠️ Contains allergens: ${additionalInfo.allergens.join(', ')}`);
    }

    return alerts;
  }

  private identifyHealthBenefits(nutrition: any, labels: string[]): string[] {
    const benefits: string[] = [];

    if (nutrition.protein > 15) {
      benefits.push('High protein content supports muscle maintenance');
    }

    if (nutrition.fiber > 8) {
      benefits.push('High fiber content promotes digestive health');
    }

    if (labels.some(label => label.toLowerCase().includes('organic'))) {
      benefits.push('Organic certification ensures no synthetic pesticides');
    }

    if (labels.some(label => label.toLowerCase().includes('whole grain'))) {
      benefits.push('Whole grains provide sustained energy and nutrients');
    }

    if (nutrition.calories < 200 && nutrition.protein > 10) {
      benefits.push('Good protein-to-calorie ratio for weight management');
    }

    return benefits;
  }

  private identifyHealthConcerns(nutrition: any, additionalInfo?: any): string[] {
    const concerns: string[] = [];

    if (nutrition.sugar && nutrition.sugar > 20) {
      concerns.push('High sugar intake may contribute to blood sugar spikes');
    }

    if (nutrition.sodium && nutrition.sodium > 1.5) {
      concerns.push('High sodium content may contribute to hypertension');
    }

    if (nutrition.fat > 30 && nutrition.carbs > 40) {
      concerns.push('High fat and carb combination may be calorie-dense');
    }

    if (additionalInfo?.ingredients) {
      const concerningIngredients = additionalInfo.ingredients.filter((ingredient: string) =>
        ingredient.toLowerCase().includes('artificial') || 
        ingredient.toLowerCase().includes('preservative')
      );
      
      if (concerningIngredients.length > 0) {
        concerns.push('Contains artificial ingredients or preservatives');
      }
    }

    return concerns;
  }

  private suggestAlternatives(category?: string, currentScore?: number): string[] | undefined {
    if (!category || !currentScore || currentScore >= 70) {
      return undefined;
    }

    const alternatives: Record<string, string[]> = {
      'snacks': [
        'Fresh fruits and nuts',
        'Vegetable sticks with hummus',
        'Greek yogurt with berries',
        'Air-popped popcorn'
      ],
      'beverages': [
        'Sparkling water with lemon',
        'Herbal teas',
        'Coconut water',
        'Fresh vegetable juices'
      ],
      'dairy': [
        'Low-fat Greek yogurt',
        'Unsweetened almond milk',
        'Cottage cheese',
        'Plant-based alternatives'
      ],
      'grains': [
        'Whole grain options',
        'Quinoa products',
        'Brown rice varieties',
        'Oat-based products'
      ]
    };

    const categoryKey = Object.keys(alternatives).find(key => 
      category.toLowerCase().includes(key)
    );

    return categoryKey ? alternatives[categoryKey] : [
      'Look for organic or minimally processed alternatives',
      'Choose products with fewer ingredients',
      'Opt for items with higher protein and fiber content'
    ];
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
      protein: ['chicken', 'beef', 'fish', 'eggs', 'tofu', 'beans', 'lentils'],
      grains: ['rice', 'bread', 'pasta', 'oats', 'quinoa', 'barley'],
      vegetables: ['broccoli', 'spinach', 'carrots', 'tomatoes', 'peppers'],
      fruits: ['apple', 'banana', 'berries', 'orange', 'grapes'],
      dairy: ['milk', 'cheese', 'yogurt', 'butter'],
      nuts_seeds: ['almonds', 'walnuts', 'seeds', 'peanuts'],
      oils_fats: ['olive oil', 'coconut oil', 'avocado'],
    };

    const lowerName = name.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => lowerName.includes(keyword))) {
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
      snack: '15:00',
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
    let fatPercent = 0.3;

    // Adjust based on primary goals
    if (fitnessGoals.primaryGoals.includes('muscle_gain')) {
      proteinPercent = 0.3;
      carbPercent = 0.4;
      fatPercent = 0.3;
    } else if (fitnessGoals.primaryGoals.includes('weight_loss')) {
      proteinPercent = 0.3;
      carbPercent = 0.35;
      fatPercent = 0.35;
    }

    return {
      protein: Math.round((calorieTarget * proteinPercent) / 4), // 4 cal per gram
      carbohydrates: Math.round((calorieTarget * carbPercent) / 4), // 4 cal per gram
      fat: Math.round((calorieTarget * fatPercent) / 9), // 9 cal per gram
      fiber: 25, // Standard recommendation
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const nutritionAnalyzer = new NutritionAnalyzerService();

export default nutritionAnalyzer;
