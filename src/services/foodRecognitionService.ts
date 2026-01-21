/**
 * Food Recognition Service - Simplified
 *
 * Uses Cloudflare Workers backend with Gemini Vision API for food recognition.
 * Focuses on what AI does reliably:
 * - Food identification (name, category, cuisine)
 * - Basic nutrition estimation
 * - Portion suggestion (user can override with exact grams)
 */

import { fitaiWorkersClient } from './fitaiWorkersClient';
import * as FileSystem from 'expo-file-system';

// ============================================================================
// TYPES - SIMPLIFIED
// ============================================================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type CuisineType = 
  | 'indian'
  | 'chinese'
  | 'japanese'
  | 'korean'
  | 'thai'
  | 'vietnamese'
  | 'italian'
  | 'mexican'
  | 'american'
  | 'mediterranean'
  | 'middle_eastern'
  | 'african'
  | 'french'
  | 'other';

export interface RecognizedFood {
  id: string;
  name: string;
  localName?: string;
  category: 'main' | 'side' | 'snack' | 'sweet' | 'beverage';
  cuisine: CuisineType;
  
  // Portion - AI estimate (user can override)
  estimatedGrams: number;
  servingDescription: string;
  
  // User override (set when user inputs exact grams)
  userGrams?: number;
  
  // Nutrition for the current portion (estimated or user-specified)
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  
  // Nutrition per 100g (for easy recalculation when portion changes)
  nutritionPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  
  confidence: number;
}

export interface FoodRecognitionResult {
  success: boolean;
  foods?: RecognizedFood[];
  totalCalories?: number;
  overallConfidence?: number;
  processingTime: number;
  error?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

class FoodRecognitionService {
  private cache: Map<string, FoodRecognitionResult> = new Map();

  /**
   * Main food recognition method
   * Returns recognized foods with portion suggestions that users can adjust
   */
  async recognizeFood(
    imageUri: string,
    mealType: MealType,
    dietaryRestrictions?: string[]
  ): Promise<FoodRecognitionResult> {
    const startTime = Date.now();

    try {
      console.log(`🔍 Starting food recognition for ${mealType}...`);

      // Check cache first
      const cacheKey = this.generateCacheKey(imageUri, mealType);
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        console.log('✅ Found cached result');
        return cachedResult;
      }

      // Convert image to base64
      console.log('📸 Converting image to base64...');
      const imageBase64 = await this.convertImageToBase64(imageUri);

      // Call Workers backend
      console.log('🌐 Calling Cloudflare Workers backend...');
      const response = await fitaiWorkersClient.recognizeFood({
        imageBase64,
        mealType,
        userContext: dietaryRestrictions?.length ? { dietaryRestrictions } : undefined,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Food recognition failed');
      }

      // Transform response to our format
      const foods: RecognizedFood[] = response.data.foods.map((food: any) => ({
        id: food.id,
        name: food.name,
        localName: food.localName,
        category: food.category,
        cuisine: food.cuisine,
        estimatedGrams: food.estimatedGrams,
        servingDescription: food.servingDescription,
        nutrition: {
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
        },
        nutritionPer100g: food.nutritionPer100g,
        confidence: food.confidence,
      }));

      const result: FoodRecognitionResult = {
        success: true,
        foods,
        totalCalories: response.data.totalCalories,
        overallConfidence: response.data.overallConfidence,
        processingTime: Date.now() - startTime,
      };

      // Cache for 24 hours
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), 24 * 60 * 60 * 1000);

      console.log(`✅ Food recognition completed in ${result.processingTime}ms`);
      console.log(`   Found ${foods.length} items, ${result.overallConfidence}% confidence`);
      
      return result;

    } catch (error) {
      console.error('❌ Food recognition failed:', error);
      return {
        success: false,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update food portion with user-specified grams
   * Recalculates nutrition based on nutritionPer100g
   */
  updateFoodPortion(food: RecognizedFood, newGrams: number): RecognizedFood {
    const multiplier = newGrams / 100;
    
    return {
      ...food,
      userGrams: newGrams,
      nutrition: {
        calories: Math.round(food.nutritionPer100g.calories * multiplier),
        protein: Math.round(food.nutritionPer100g.protein * multiplier * 10) / 10,
        carbs: Math.round(food.nutritionPer100g.carbs * multiplier * 10) / 10,
        fat: Math.round(food.nutritionPer100g.fat * multiplier * 10) / 10,
        fiber: Math.round(food.nutritionPer100g.fiber * multiplier * 10) / 10,
      },
    };
  }

  /**
   * Get the effective portion in grams (user override or AI estimate)
   */
  getEffectiveGrams(food: RecognizedFood): number {
    return food.userGrams ?? food.estimatedGrams;
  }

  /**
   * Calculate total nutrition for multiple foods
   */
  calculateTotalNutrition(foods: RecognizedFood[]): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  } {
    return foods.reduce(
      (total, food) => ({
        calories: total.calories + food.nutrition.calories,
        protein: total.protein + food.nutrition.protein,
        carbs: total.carbs + food.nutrition.carbs,
        fat: total.fat + food.nutrition.fat,
        fiber: total.fiber + food.nutrition.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  }

  /**
   * Convert image URI to base64 data URL
   */
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      if (imageUri.startsWith('data:image/')) {
        return imageUri;
      }

      const base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const extension = imageUri.split('.').pop()?.toLowerCase() || 'jpeg';
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
      throw new Error('Failed to process image. Please try again.');
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(imageUri: string, mealType: MealType): string {
    return `${imageUri.slice(-20)}_${mealType}`;
  }

  /**
   * Clear recognition cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Food recognition cache cleared');
  }
}

// Singleton instance
export const foodRecognitionService = new FoodRecognitionService();
export default foodRecognitionService;
