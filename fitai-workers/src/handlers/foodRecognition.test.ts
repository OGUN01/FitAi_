/**
 * Food Recognition Handler - Unit Tests
 * 
 * Tests the simplified food recognition schema and response handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// ============================================================================
// SCHEMA TESTS - Validate the simplified schema
// ============================================================================

// Recreate schemas for testing (mirrors the handler)
const RecognizedFoodSchema = z.object({
  name: z.string(),
  localName: z.string().optional(),
  category: z.enum(['main', 'side', 'snack', 'sweet', 'beverage']),
  cuisine: z.enum([
    'indian', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese',
    'italian', 'mexican', 'american', 'mediterranean', 'middle_eastern',
    'african', 'french', 'other'
  ]),
  estimatedGrams: z.number(),
  servingDescription: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  confidence: z.number().min(0).max(100),
});

const FoodRecognitionResponseSchema = z.object({
  foods: z.array(RecognizedFoodSchema),
  overallConfidence: z.number().min(0).max(100),
  totalCalories: z.number(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
});

const FoodRecognitionRequestSchema = z.object({
  imageBase64: z.string().min(100),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  userContext: z.object({
    dietaryRestrictions: z.array(z.string()).optional(),
  }).optional(),
});

// ============================================================================
// MOCK DATA
// ============================================================================

const mockIndianFood = {
  name: 'Chicken Biryani',
  localName: 'चिकन बिरयानी',
  category: 'main' as const,
  cuisine: 'indian' as const,
  estimatedGrams: 250,
  servingDescription: '1 large serving',
  calories: 450,
  protein: 22,
  carbs: 55,
  fat: 15,
  fiber: 3,
  confidence: 92,
};

const mockJapaneseFood = {
  name: 'Salmon Sushi Roll',
  localName: 'サーモン巻き',
  category: 'main' as const,
  cuisine: 'japanese' as const,
  estimatedGrams: 180,
  servingDescription: '6 pieces',
  calories: 280,
  protein: 18,
  carbs: 35,
  fat: 8,
  fiber: 1,
  confidence: 88,
};

const mockAmericanFood = {
  name: 'Caesar Salad',
  category: 'main' as const,
  cuisine: 'american' as const,
  estimatedGrams: 200,
  servingDescription: '1 bowl',
  calories: 320,
  protein: 12,
  carbs: 15,
  fat: 24,
  fiber: 4,
  confidence: 85,
};

const mockItalianFood = {
  name: 'Margherita Pizza',
  localName: 'Pizza Margherita',
  category: 'main' as const,
  cuisine: 'italian' as const,
  estimatedGrams: 150,
  servingDescription: '2 slices',
  calories: 380,
  protein: 14,
  carbs: 45,
  fat: 16,
  fiber: 2,
  confidence: 90,
};

const mockMexicanFood = {
  name: 'Chicken Tacos',
  localName: 'Tacos de Pollo',
  category: 'main' as const,
  cuisine: 'mexican' as const,
  estimatedGrams: 180,
  servingDescription: '3 tacos',
  calories: 420,
  protein: 25,
  carbs: 35,
  fat: 20,
  fiber: 5,
  confidence: 87,
};

// ============================================================================
// TESTS
// ============================================================================

describe('Food Recognition Schema Validation', () => {
  describe('RecognizedFoodSchema', () => {
    it('should validate a correct Indian food item', () => {
      const result = RecognizedFoodSchema.safeParse(mockIndianFood);
      expect(result.success).toBe(true);
    });

    it('should validate a correct Japanese food item', () => {
      const result = RecognizedFoodSchema.safeParse(mockJapaneseFood);
      expect(result.success).toBe(true);
    });

    it('should validate a correct American food item (no local name)', () => {
      const result = RecognizedFoodSchema.safeParse(mockAmericanFood);
      expect(result.success).toBe(true);
    });

    it('should validate Italian food', () => {
      const result = RecognizedFoodSchema.safeParse(mockItalianFood);
      expect(result.success).toBe(true);
    });

    it('should validate Mexican food', () => {
      const result = RecognizedFoodSchema.safeParse(mockMexicanFood);
      expect(result.success).toBe(true);
    });

    it('should reject food with invalid category', () => {
      const invalidFood = { ...mockIndianFood, category: 'invalid' };
      const result = RecognizedFoodSchema.safeParse(invalidFood);
      expect(result.success).toBe(false);
    });

    it('should reject food with invalid cuisine', () => {
      const invalidFood = { ...mockIndianFood, cuisine: 'invalid_cuisine' };
      const result = RecognizedFoodSchema.safeParse(invalidFood);
      expect(result.success).toBe(false);
    });

    it('should reject food with confidence > 100', () => {
      const invalidFood = { ...mockIndianFood, confidence: 150 };
      const result = RecognizedFoodSchema.safeParse(invalidFood);
      expect(result.success).toBe(false);
    });

    it('should reject food with confidence < 0', () => {
      const invalidFood = { ...mockIndianFood, confidence: -10 };
      const result = RecognizedFoodSchema.safeParse(invalidFood);
      expect(result.success).toBe(false);
    });

    it('should reject food without required fields', () => {
      const invalidFood = { name: 'Test' }; // Missing required fields
      const result = RecognizedFoodSchema.safeParse(invalidFood);
      expect(result.success).toBe(false);
    });
  });

  describe('FoodRecognitionResponseSchema', () => {
    it('should validate a complete response with multiple foods', () => {
      const response = {
        foods: [mockIndianFood, mockJapaneseFood],
        overallConfidence: 90,
        totalCalories: 730,
        mealType: 'lunch' as const,
      };
      const result = FoodRecognitionResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate a response with empty foods array', () => {
      const response = {
        foods: [],
        overallConfidence: 0,
        totalCalories: 0,
        mealType: 'snack' as const,
      };
      const result = FoodRecognitionResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject response with invalid meal type', () => {
      const response = {
        foods: [mockIndianFood],
        overallConfidence: 90,
        totalCalories: 450,
        mealType: 'brunch', // Invalid
      };
      const result = FoodRecognitionResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('FoodRecognitionRequestSchema', () => {
    it('should validate a minimal valid request', () => {
      const request = {
        imageBase64: 'data:image/jpeg;base64,' + 'x'.repeat(100),
        mealType: 'lunch' as const,
      };
      const result = FoodRecognitionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should validate a request with dietary restrictions', () => {
      const request = {
        imageBase64: 'data:image/jpeg;base64,' + 'x'.repeat(100),
        mealType: 'dinner' as const,
        userContext: {
          dietaryRestrictions: ['vegetarian', 'gluten-free'],
        },
      };
      const result = FoodRecognitionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject request with too short image data', () => {
      const request = {
        imageBase64: 'short',
        mealType: 'lunch' as const,
      };
      const result = FoodRecognitionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject request with invalid meal type', () => {
      const request = {
        imageBase64: 'data:image/jpeg;base64,' + 'x'.repeat(100),
        mealType: 'midnight_snack', // Invalid
      };
      const result = FoodRecognitionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });
});

describe('Food Recognition Response Processing', () => {
  it('should correctly calculate nutritionPer100g', () => {
    const food = mockIndianFood;
    const nutritionPer100g = {
      calories: Math.round((food.calories / food.estimatedGrams) * 100),
      protein: Math.round(((food.protein / food.estimatedGrams) * 100) * 10) / 10,
      carbs: Math.round(((food.carbs / food.estimatedGrams) * 100) * 10) / 10,
      fat: Math.round(((food.fat / food.estimatedGrams) * 100) * 10) / 10,
      fiber: Math.round(((food.fiber / food.estimatedGrams) * 100) * 10) / 10,
    };

    expect(nutritionPer100g.calories).toBe(180); // 450 / 250 * 100 = 180
    expect(nutritionPer100g.protein).toBe(8.8);  // 22 / 250 * 100 = 8.8
    expect(nutritionPer100g.carbs).toBe(22);     // 55 / 250 * 100 = 22
    expect(nutritionPer100g.fat).toBe(6);        // 15 / 250 * 100 = 6
    expect(nutritionPer100g.fiber).toBe(1.2);    // 3 / 250 * 100 = 1.2
  });

  it('should recalculate nutrition when user adjusts portion', () => {
    const originalGrams = 250;
    const newGrams = 300;
    const multiplier = newGrams / originalGrams;

    const adjustedNutrition = {
      calories: Math.round(mockIndianFood.calories * multiplier),
      protein: Math.round(mockIndianFood.protein * multiplier * 10) / 10,
      carbs: Math.round(mockIndianFood.carbs * multiplier * 10) / 10,
      fat: Math.round(mockIndianFood.fat * multiplier * 10) / 10,
      fiber: Math.round(mockIndianFood.fiber * multiplier * 10) / 10,
    };

    expect(adjustedNutrition.calories).toBe(540); // 450 * 1.2 = 540
    expect(adjustedNutrition.protein).toBe(26.4); // 22 * 1.2 = 26.4
    expect(adjustedNutrition.carbs).toBe(66);     // 55 * 1.2 = 66
    expect(adjustedNutrition.fat).toBe(18);       // 15 * 1.2 = 18
    expect(adjustedNutrition.fiber).toBe(3.6);    // 3 * 1.2 = 3.6
  });

  it('should handle half portion correctly', () => {
    const originalGrams = 250;
    const newGrams = 125;
    const multiplier = newGrams / originalGrams; // 0.5

    const adjustedNutrition = {
      calories: Math.round(mockIndianFood.calories * multiplier),
      protein: Math.round(mockIndianFood.protein * multiplier * 10) / 10,
    };

    expect(adjustedNutrition.calories).toBe(225); // 450 * 0.5 = 225
    expect(adjustedNutrition.protein).toBe(11);   // 22 * 0.5 = 11
  });
});

describe('Cuisine Type Coverage', () => {
  const allCuisines = [
    'indian', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese',
    'italian', 'mexican', 'american', 'mediterranean', 'middle_eastern',
    'african', 'french', 'other'
  ] as const;

  it('should support all 14 cuisine types', () => {
    expect(allCuisines.length).toBe(14);
  });

  allCuisines.forEach((cuisine) => {
    it(`should validate food with cuisine: ${cuisine}`, () => {
      const food = { ...mockAmericanFood, cuisine };
      const result = RecognizedFoodSchema.safeParse(food);
      expect(result.success).toBe(true);
    });
  });
});

describe('Category Coverage', () => {
  const allCategories = ['main', 'side', 'snack', 'sweet', 'beverage'] as const;

  it('should support all 5 category types', () => {
    expect(allCategories.length).toBe(5);
  });

  allCategories.forEach((category) => {
    it(`should validate food with category: ${category}`, () => {
      const food = { ...mockAmericanFood, category };
      const result = RecognizedFoodSchema.safeParse(food);
      expect(result.success).toBe(true);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle very small portions (1g)', () => {
    const tinyFood = { ...mockAmericanFood, estimatedGrams: 1 };
    const result = RecognizedFoodSchema.safeParse(tinyFood);
    expect(result.success).toBe(true);
  });

  it('should handle very large portions (2000g)', () => {
    const hugeFood = { ...mockAmericanFood, estimatedGrams: 2000 };
    const result = RecognizedFoodSchema.safeParse(hugeFood);
    expect(result.success).toBe(true);
  });

  it('should handle zero calories (water/diet drinks)', () => {
    const zeroCal = { ...mockAmericanFood, calories: 0, category: 'beverage' as const };
    const result = RecognizedFoodSchema.safeParse(zeroCal);
    expect(result.success).toBe(true);
  });

  it('should handle low confidence (uncertain recognition)', () => {
    const lowConfidence = { ...mockAmericanFood, confidence: 25 };
    const result = RecognizedFoodSchema.safeParse(lowConfidence);
    expect(result.success).toBe(true);
  });

  it('should handle exact 100% confidence', () => {
    const perfectConfidence = { ...mockAmericanFood, confidence: 100 };
    const result = RecognizedFoodSchema.safeParse(perfectConfidence);
    expect(result.success).toBe(true);
  });

  it('should handle 0% confidence', () => {
    const noConfidence = { ...mockAmericanFood, confidence: 0 };
    const result = RecognizedFoodSchema.safeParse(noConfidence);
    expect(result.success).toBe(true);
  });

  it('should handle very long food names', () => {
    const longName = { ...mockAmericanFood, name: 'A'.repeat(500) };
    const result = RecognizedFoodSchema.safeParse(longName);
    expect(result.success).toBe(true);
  });

  it('should handle unicode characters in names', () => {
    const unicodeFood = { 
      ...mockAmericanFood, 
      name: '北京烤鸭 (Beijing Roast Duck)',
      localName: '北京烤鸭',
      cuisine: 'chinese' as const,
    };
    const result = RecognizedFoodSchema.safeParse(unicodeFood);
    expect(result.success).toBe(true);
  });
});

