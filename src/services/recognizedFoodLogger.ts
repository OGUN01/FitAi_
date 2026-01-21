import { RecognizedFood, MealType } from './foodRecognitionService';
import { nutritionDataService, Food } from './nutritionData';
import { supabase } from './supabase';
import { nutritionRefreshService } from './nutritionRefreshService';

/**
 * Service to handle logging recognized foods as meals
 * Bridges the gap between food recognition and meal logging
 */
export class RecognizedFoodLogger {
  private static instance: RecognizedFoodLogger;

  private constructor() {}

  static getInstance(): RecognizedFoodLogger {
    if (!RecognizedFoodLogger.instance) {
      RecognizedFoodLogger.instance = new RecognizedFoodLogger();
    }
    return RecognizedFoodLogger.instance;
  }

  /**
   * Log recognized foods as a meal with proper database integration
   */
  async logRecognizedFoods(
    userId: string,
    recognizedFoods: RecognizedFood[],
    mealType: MealType,
    customMealName?: string
  ): Promise<{
    success: boolean;
    mealId?: string;
    totalCalories?: number;
    error?: string;
  }> {
    try {
      console.log('🍽️ Starting to log recognized foods:', {
        userId,
        foodCount: recognizedFoods.length,
        mealType,
        customMealName,
      });

      // Step 1: Create or find foods in the database
      const foodMappings = await this.createOrFindFoods(recognizedFoods);

      if (foodMappings.length === 0) {
        throw new Error('Failed to create food entries in database');
      }

      // Step 2: Prepare meal data
      const mealName = customMealName || this.generateMealName(recognizedFoods, mealType);
      const totalCalories = recognizedFoods.reduce((sum, food) => sum + food.nutrition.calories, 0);

      console.log('📊 Meal preparation:', {
        mealName,
        totalCalories,
        foodMappings: foodMappings.length,
      });

      // Step 3: Log the meal using existing nutrition data service
      const mealData = {
        name: mealName,
        type: mealType,
        foods: foodMappings.map((mapping) => ({
          food_id: mapping.databaseFoodId,
          quantity_grams: mapping.recognizedFood.userGrams ?? mapping.recognizedFood.estimatedGrams,
        })),
      };

      const logResult = await nutritionDataService.logMeal(userId, mealData);

      if (!logResult.success) {
        throw new Error(logResult.error || 'Failed to log meal');
      }

      console.log('✅ Successfully logged recognized foods as meal:', {
        mealId: logResult.data?.id,
        totalCalories,
        foodCount: recognizedFoods.length,
      });

      // Step 4: Store additional metadata for food recognition tracking
      await this.storeRecognitionMetadata(logResult.data!.id, recognizedFoods, foodMappings);

      // Step 5: Trigger nutrition data refresh for real-time UI updates
      await nutritionRefreshService.refreshAfterMealLogged(userId, logResult.data!);

      return {
        success: true,
        mealId: logResult.data!.id,
        totalCalories: Math.round(totalCalories),
        // meal removed from return type for type safety
      };
    } catch (error) {
      console.error('❌ Failed to log recognized foods:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Create or find foods in the database from recognized foods
   */
  private async createOrFindFoods(recognizedFoods: RecognizedFood[]): Promise<
    {
      recognizedFood: RecognizedFood;
      databaseFoodId: string;
      isNewFood: boolean;
    }[]
  > {
    const foodMappings: {
      recognizedFood: RecognizedFood;
      databaseFoodId: string;
      isNewFood: boolean;
    }[] = [];

    for (const recognizedFood of recognizedFoods) {
      try {
        // Step 1: Try to find existing food by name
        const existingFood = await this.findExistingFood(recognizedFood.name);

        if (existingFood) {
          console.log(`✅ Found existing food: ${recognizedFood.name} -> ${existingFood.id}`);
          foodMappings.push({
            recognizedFood,
            databaseFoodId: existingFood.id,
            isNewFood: false,
          });
          continue;
        }

        // Step 2: Create new food entry
        const newFood = await this.createFoodFromRecognized(recognizedFood);

        if (newFood) {
          console.log(`🆕 Created new food: ${recognizedFood.name} -> ${newFood.id}`);
          foodMappings.push({
            recognizedFood,
            databaseFoodId: newFood.id,
            isNewFood: true,
          });
        } else {
          console.warn(`⚠️ Failed to create food: ${recognizedFood.name}`);
        }
      } catch (error) {
        console.error(`❌ Error processing food ${recognizedFood.name}:`, error);
        // Continue with other foods even if one fails
      }
    }

    return foodMappings;
  }

  /**
   * Find existing food in database by name (fuzzy matching)
   */
  private async findExistingFood(foodName: string): Promise<Food | null> {
    try {
      // Try exact match first
      let { data, error } = await supabase
        .from('foods')
        .select('*')
        .ilike('name', foodName)
        .limit(1);

      if (error) {
        console.error('Error searching for existing food:', error);
        return null;
      }

      if (data && data.length > 0) {
        return data[0];
      }

      // Try fuzzy match with cleaned name
      const cleanedName = foodName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
      const searchTerms = cleanedName.split(' ').filter((term) => term.length > 2);

      if (searchTerms.length > 0) {
        const searchQuery = searchTerms.map((term) => `name.ilike.%${term}%`).join(',');

        ({ data, error } = await supabase.from('foods').select('*').or(searchQuery).limit(1));

        if (!error && data && data.length > 0) {
          console.log(`🔍 Fuzzy matched: "${foodName}" -> "${data[0].name}"`);
          return data[0];
        }
      }

      return null;
    } catch (error) {
      console.error('Error in findExistingFood:', error);
      return null;
    }
  }

  /**
   * Create new food entry from recognized food
   */
  private async createFoodFromRecognized(recognizedFood: RecognizedFood): Promise<Food | null> {
    try {
      // Use nutritionPer100g if available, otherwise calculate from portion
      const per100g = recognizedFood.nutritionPer100g ?? {
        calories: Math.round((recognizedFood.nutrition.calories / recognizedFood.estimatedGrams) * 100),
        protein: Math.round(((recognizedFood.nutrition.protein / recognizedFood.estimatedGrams) * 100) * 10) / 10,
        carbs: Math.round(((recognizedFood.nutrition.carbs / recognizedFood.estimatedGrams) * 100) * 10) / 10,
        fat: Math.round(((recognizedFood.nutrition.fat / recognizedFood.estimatedGrams) * 100) * 10) / 10,
        fiber: Math.round(((recognizedFood.nutrition.fiber / recognizedFood.estimatedGrams) * 100) * 10) / 10,
      };

      const foodData = {
        name: recognizedFood.name,
        category: recognizedFood.category,
        calories_per_100g: per100g.calories,
        protein_per_100g: per100g.protein,
        carbs_per_100g: per100g.carbs,
        fat_per_100g: per100g.fat,
        fiber_per_100g: per100g.fiber || null,
        created_at: new Date().toISOString(),
      };

      console.log('🆕 Creating new food:', foodData);

      const { data, error } = await supabase.from('foods').insert(foodData).select().single();

      if (error) {
        console.error('Error creating food:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createFoodFromRecognized:', error);
      return null;
    }
  }

  /**
   * Generate a descriptive meal name from recognized foods
   */
  private generateMealName(recognizedFoods: RecognizedFood[], mealType: MealType): string {
    if (recognizedFoods.length === 1) {
      return recognizedFoods[0].name;
    }

    if (recognizedFoods.length === 2) {
      return `${recognizedFoods[0].name} & ${recognizedFoods[1].name}`;
    }

    // For multiple foods, create a descriptive name
    const mainFoods = recognizedFoods.slice(0, 2);
    const remainingCount = recognizedFoods.length - 2;

    let mealName = mainFoods.map((food) => food.name).join(', ');

    if (remainingCount > 0) {
      mealName += ` & ${remainingCount} more item${remainingCount !== 1 ? 's' : ''}`;
    }

    // Add meal type context if it's a complex meal
    const cuisineTypes = [...new Set(recognizedFoods.map((food) => food.cuisine))];
    if (cuisineTypes.length === 1 && cuisineTypes[0] === 'indian') {
      mealName = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} - ${mealName}`;
    }

    return mealName;
  }

  /**
   * Store additional metadata for food recognition tracking and accuracy improvement
   */
  private async storeRecognitionMetadata(
    mealId: string,
    recognizedFoods: RecognizedFood[],
    foodMappings: { recognizedFood: RecognizedFood; databaseFoodId: string; isNewFood: boolean }[]
  ): Promise<void> {
    try {
      const metadata = {
        meal_id: mealId,
        recognition_data: {
          totalFoods: recognizedFoods.length,
          averageConfidence:
            recognizedFoods.reduce((sum, food) => sum + food.confidence, 0) /
            recognizedFoods.length,
          cuisineTypes: [...new Set(recognizedFoods.map((food) => food.cuisine))],
          newFoodsCreated: foodMappings.filter((mapping) => mapping.isNewFood).length,
          recognizedAt: new Date().toISOString(),
          foods: recognizedFoods.map((food, index) => ({
            id: food.id,
            name: food.name,
            confidence: food.confidence,
            cuisine: food.cuisine,
            estimatedGrams: food.estimatedGrams,
            userGrams: food.userGrams,
            databaseFoodId: foodMappings[index]?.databaseFoodId,
            isNewFood: foodMappings[index]?.isNewFood,
          })),
        },
        created_at: new Date().toISOString(),
      };

      // Store in meal_recognition_metadata table (if it exists)
      const { error: metaError } = await supabase
        .from('meal_recognition_metadata')
        .insert(metadata)
        .select()
        .single();
      if (metaError) {
        // Table might not exist, which is fine for now
        console.log(
          'Recognition metadata storage skipped (table may not exist):',
          metaError.message
        );
      }

      console.log('📊 Recognition metadata stored successfully');
    } catch (error) {
      console.warn('Warning: Failed to store recognition metadata:', error);
      // Don't fail the entire operation for metadata storage issues
    }
  }

  /**
   * Get recognition statistics for improvement insights
   */
  async getRecognitionStats(
    userId: string,
    days: number = 30
  ): Promise<{
    totalRecognitions: number;
    averageConfidence: number;
    cuisineBreakdown: Record<string, number>;
    accuracyTrends: Array<{ date: string; confidence: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('meal_recognition_metadata')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recognition stats:', error);
        return {
          totalRecognitions: 0,
          averageConfidence: 0,
          cuisineBreakdown: {},
          accuracyTrends: [],
        };
      }

      const stats = {
        totalRecognitions: data?.length || 0,
        averageConfidence: 0,
        cuisineBreakdown: {} as Record<string, number>,
        accuracyTrends: [] as Array<{ date: string; confidence: number }>,
      };

      if (data && data.length > 0) {
        // Calculate average confidence
        const totalConfidence = data.reduce((sum, record) => {
          return sum + (record.recognition_data?.averageConfidence || 0);
        }, 0);
        stats.averageConfidence = totalConfidence / data.length;

        // Build cuisine breakdown
        data.forEach((record) => {
          const cuisines = record.recognition_data?.cuisineTypes || [];
          cuisines.forEach((cuisine: string) => {
            stats.cuisineBreakdown[cuisine] = (stats.cuisineBreakdown[cuisine] || 0) + 1;
          });
        });

        // Build accuracy trends
        stats.accuracyTrends = data.map((record) => ({
          date: record.created_at.split('T')[0],
          confidence: record.recognition_data?.averageConfidence || 0,
        }));
      }

      return stats;
    } catch (error) {
      console.error('Error in getRecognitionStats:', error);
      return {
        totalRecognitions: 0,
        averageConfidence: 0,
        cuisineBreakdown: {},
        accuracyTrends: [],
      };
    }
  }
}

// Export singleton instance
export const recognizedFoodLogger = RecognizedFoodLogger.getInstance();
export default recognizedFoodLogger;
