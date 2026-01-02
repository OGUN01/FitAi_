import { supabase } from './supabase';
import { crudOperations } from './crudOperations';
import { dataBridge } from './DataBridge';
import { AuthUser } from '../types/user';
import { MealLog, SyncStatus } from '../types/localData';

// Types for nutrition data
export interface Food {
  id: string;
  name: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  sugar_per_100g?: number;
  sodium_per_100g?: number;
  image_url?: string;
  barcode?: string;
  created_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  consumed_at: string;
  created_at: string;
  foods?: MealFood[];
}

export interface MealFood {
  id: string;
  meal_id: string;
  food_id: string;
  quantity_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  food?: Food;
}

export interface UserDietPreferences {
  id: string;
  user_id: string;
  diet_type: string[];
  allergies: string[];
  dislikes: string[];
  daily_calorie_goal: number;
  protein_goal: number;
  carb_goal: number;
  fat_goal: number;
  created_at: string;
  updated_at: string;
}

export interface NutritionGoals {
  id: string;
  user_id: string;
  daily_calories: number;
  protein_grams: number;
  carb_grams: number;
  fat_grams: number;
  // Alternative field names used by some screens
  daily_protein?: number;
  daily_carbs?: number;
  daily_fat?: number;
  daily_water_ml?: number;
  macroTargets?: {
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface NutritionDataResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class NutritionDataService {
  private static instance: NutritionDataService;

  private constructor() {}

  static getInstance(): NutritionDataService {
    if (!NutritionDataService.instance) {
      NutritionDataService.instance = new NutritionDataService();
    }
    return NutritionDataService.instance;
  }

  /**
   * Initialize the service with Track B integration
   */
  async initialize(): Promise<void> {
    try {
      await crudOperations.initialize();
      console.log('Nutrition Data Service initialized with Track B integration');
    } catch (error) {
      console.error('Failed to initialize Nutrition Data Service:', error);
      throw error;
    }
  }

  /**
   * Get all available foods
   */
  async getFoods(filters?: {
    category?: string;
    search?: string;
    barcode?: string;
  }): Promise<NutritionDataResponse<Food[]>> {
    try {
      let query = supabase.from('foods').select('*').order('name');

      // Apply filters
      if (filters?.category && filters.category !== 'all') {
        query = query.ilike('category', `%${filters.category}%`);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);
      }

      if (filters?.barcode) {
        query = query.eq('barcode', filters.barcode);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching foods:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error('Error in getFoods:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch foods',
      };
    }
  }

  /**
   * Get user's meal history using Track B's data layer
   */
  async getUserMeals(
    userId: string,
    date?: string,
    limit?: number
  ): Promise<NutritionDataResponse<Meal[]>> {
    try {
      // First try to get from Track B's local storage
      const localMeals = await crudOperations.readMealLogs(date, limit);

      if (localMeals.length > 0) {
        // Convert Track B's MealLog format to our Meal format
        const meals = localMeals.map(this.convertMealLogToMeal);
        return {
          success: true,
          data: meals,
        };
      }

      // Fallback to direct Supabase query
      let query = supabase
        .from('meals')
        .select(
          `
          *,
          meal_foods (
            *,
            foods (*)
          )
        `
        )
        .eq('user_id', userId)
        .order('consumed_at', { ascending: false });

      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        query = query
          .gte('consumed_at', startDate.toISOString())
          .lt('consumed_at', endDate.toISOString());
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user meals:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Transform the data to match our interface
      const meals =
        data?.map((meal) => ({
          ...meal,
          foods:
            meal.meal_foods?.map((mf: any) => ({
              ...mf,
              food: mf.foods,
            })) || [],
        })) || [];

      return {
        success: true,
        data: meals,
      };
    } catch (error) {
      console.error('Error in getUserMeals:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user meals',
      };
    }
  }

  /**
   * Get user's diet preferences
   */
  async getUserDietPreferences(
    userId: string
  ): Promise<NutritionDataResponse<UserDietPreferences>> {
    try {
      const { data, error } = await supabase
        .from('diet_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching diet preferences:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error in getUserDietPreferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch diet preferences',
      };
    }
  }

  /**
   * Get user's nutrition goals
   * 
   * PRIORITY: First reads from advanced_review (onboarding calculations),
   * then falls back to nutrition_goals table for backward compatibility.
   * 
   * CRITICAL: Does NOT create default goals - if no data exists, returns null.
   * This makes data flow issues immediately visible instead of masking them.
   */
  async getUserNutritionGoals(userId: string): Promise<NutritionDataResponse<NutritionGoals>> {
    try {
      console.log('📊 [NutritionData] getUserNutritionGoals - Loading for user:', userId);
      
      // STEP 1: Try to load from advanced_review (onboarding calculated values)
      // This is the SOURCE OF TRUTH for nutrition targets
      const { data: advancedReview, error: advancedError } = await supabase
        .from('advanced_review')
        .select('daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, daily_water_ml')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (advancedReview && !advancedError) {
        console.log('✅ [NutritionData] Found goals in advanced_review (onboarding):', advancedReview);
        
        // Map advanced_review fields to NutritionGoals format
        const goalsFromOnboarding: NutritionGoals = {
          id: `onboarding_${userId}`,
          user_id: userId,
          daily_calories: advancedReview.daily_calories,
          protein_grams: advancedReview.daily_protein_g,
          carb_grams: advancedReview.daily_carbs_g,
          fat_grams: advancedReview.daily_fat_g,
          // Also include macro targets in the expected format
          macroTargets: {
            protein: advancedReview.daily_protein_g,
            carbohydrates: advancedReview.daily_carbs_g,
            fat: advancedReview.daily_fat_g,
          },
          // Include daily_protein/carbs/fat for screens that use that naming
          daily_protein: advancedReview.daily_protein_g,
          daily_carbs: advancedReview.daily_carbs_g,
          daily_fat: advancedReview.daily_fat_g,
          daily_water_ml: advancedReview.daily_water_ml,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        return {
          success: true,
          data: goalsFromOnboarding,
        };
      }
      
      // STEP 2: Fallback to nutrition_goals table (for backward compatibility)
      const { data, error } = await supabase
        .from('nutrition_goals')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ [NutritionData] Error fetching nutrition goals:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // CRITICAL: NO DEFAULT CREATION
      // If no goals exist anywhere, return null to make the issue visible
      if (!data) {
        console.warn('⚠️ [NutritionData] No nutrition goals found for user:', userId);
        console.warn('⚠️ [NutritionData] User needs to complete onboarding to calculate nutrition targets');
        return {
          success: false,
          error: 'No nutrition goals found. Please complete onboarding to calculate your personalized targets.',
        };
      }

      console.log('✅ [NutritionData] Found goals in nutrition_goals table:', data);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('❌ [NutritionData] Error in getUserNutritionGoals:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch nutrition goals',
      };
    }
  }

  // REMOVED: createDefaultNutritionGoals
  // Defaults should NEVER be created silently - they mask data flow issues.
  // All nutrition targets must come from onboarding calculations.

  /**
   * Log a meal using Track B's data layer
   */
  async logMeal(
    userId: string,
    mealData: {
      name: string;
      type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      foods: {
        food_id: string;
        quantity_grams: number;
      }[];
    }
  ): Promise<NutritionDataResponse<Meal>> {
    try {
      // Calculate nutrition totals
      const nutritionTotals = await this.calculateMealNutrition(mealData.foods);

      // Create meal log for Track B
      const mealLog: MealLog = {
        id: `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        mealType: mealData.type,
        foods: mealData.foods.map((f) => ({
          id: `${f.food_id}_${Date.now()}`,
          foodId: f.food_id,
          quantity: f.quantity_grams,
          unit: 'grams',
          macros: undefined,
        })),
        totalCalories: nutritionTotals.calories,
        totalMacros: {
          protein: nutritionTotals.protein,
          carbohydrates: nutritionTotals.carbs,
          fat: nutritionTotals.fat,
          fiber: 0,
        },
        loggedAt: new Date().toISOString(),
        notes: mealData.name,
        syncStatus: SyncStatus.PENDING,
        syncMetadata: {
          lastSyncedAt: undefined,
          lastModifiedAt: new Date().toISOString(),
          syncVersion: 1,
          deviceId: 'dev-device',
        },
      };

      // Store using Track B's CRUD operations
      await crudOperations.createMealLog(mealLog);

      // Also create in Supabase for immediate access
      const { data, error } = await supabase
        .from('meals')
        .insert({
          user_id: userId,
          name: mealData.name,
          type: mealData.type,
          total_calories: nutritionTotals.calories,
          total_protein: nutritionTotals.protein,
          total_carbs: nutritionTotals.carbs,
          total_fat: nutritionTotals.fat,
          consumed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating meal:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Create meal_foods entries
      if (data && mealData.foods.length > 0) {
        const mealFoodsData = await Promise.all(
          mealData.foods.map(async (food) => {
            // Get nutrition for this specific food and quantity
            const { data: foodData } = await supabase
              .from('foods')
              .select('calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
              .eq('id', food.food_id)
              .single();

            const multiplier = food.quantity_grams / 100;
            return {
              meal_id: data.id,
              food_id: food.food_id,
              quantity_grams: food.quantity_grams,
              calories: foodData ? Math.round(foodData.calories_per_100g * multiplier) : 0,
              protein: foodData ? Math.round(foodData.protein_per_100g * multiplier * 10) / 10 : 0,
              carbs: foodData ? Math.round(foodData.carbs_per_100g * multiplier * 10) / 10 : 0,
              fat: foodData ? Math.round(foodData.fat_per_100g * multiplier * 10) / 10 : 0,
            };
          })
        );

        const { error: mealFoodsError } = await supabase.from('meal_foods').insert(mealFoodsData);

        if (mealFoodsError) {
          console.warn('Warning: Failed to create meal_foods entries:', mealFoodsError);
          // Don't fail the entire operation for this
        }
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error in logMeal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log meal',
      };
    }
  }

  /**
   * Calculate nutrition totals for a meal
   */
  private async calculateMealNutrition(
    foods: { food_id: string; quantity_grams: number }[]
  ): Promise<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }> {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const foodItem of foods) {
      const { data: food } = await supabase
        .from('foods')
        .select('calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
        .eq('id', foodItem.food_id)
        .single();

      if (food) {
        const multiplier = foodItem.quantity_grams / 100;
        totalCalories += food.calories_per_100g * multiplier;
        totalProtein += food.protein_per_100g * multiplier;
        totalCarbs += food.carbs_per_100g * multiplier;
        totalFat += food.fat_per_100g * multiplier;
      }
    }

    return {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
    };
  }

  /**
   * Convert Track B's MealLog to our Meal format
   */
  private convertMealLogToMeal(mealLog: MealLog): Meal {
    return {
      id: mealLog.id,
      user_id: mealLog.userId || 'local-user',
      name: mealLog.notes || `${mealLog.mealType} meal`,
      type: mealLog.mealType,
      total_calories: mealLog.totalCalories,
      total_protein: mealLog.totalMacros?.protein ?? 0,
      total_carbs: mealLog.totalMacros?.carbohydrates ?? 0,
      total_fat: mealLog.totalMacros?.fat ?? 0,
      consumed_at: mealLog.loggedAt,
      created_at: mealLog.loggedAt,
      foods:
        mealLog.foods?.map((f) => ({
          id: `${mealLog.id}_${f.foodId}`,
          meal_id: mealLog.id,
          food_id: f.foodId,
          quantity_grams: f.quantity,
          calories: f.calories ?? 0,
          protein: f.macros?.protein ?? 0,
          carbs: f.macros?.carbohydrates ?? 0,
          fat: f.macros?.fat ?? 0,
        })) || [],
    };
  }
}

export const nutritionDataService = NutritionDataService.getInstance();
