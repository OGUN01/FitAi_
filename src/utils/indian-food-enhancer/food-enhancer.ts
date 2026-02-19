import * as crypto from "expo-crypto";
import { RecognizedFood } from "../../services/foodRecognitionService";
import { databaseMatcher } from "./database-matcher";
import { regionClassifier } from "./region-classifier";
import { cookingMethodDetector } from "./cooking-methods";
import { nutritionCalculator } from "./nutrition-calculator";
import { helperUtils } from "./helper-utils";
import { GeminiFoodData, FoodType } from "./types";

export class IndianFoodEnhancer {
  async enhance(geminiData: any, foodType: any): Promise<RecognizedFood[]> {
    const foods = geminiData.foods || [];
    const enhancedFoods: RecognizedFood[] = [];

    console.log(`🇮🇳 Enhancing ${foods.length} Indian food items...`);

    for (const food of foods) {
      try {
        const enhancedFood = await this.enhanceIndividualFood(food, foodType);
        enhancedFoods.push(enhancedFood);
      } catch (error) {
        console.warn(`Failed to enhance Indian food ${food.name}:`, error);

        const basicEnhanced = this.createBasicIndianFood(food);
        enhancedFoods.push(basicEnhanced);
      }
    }

    console.log(
      `✅ Enhanced ${enhancedFoods.length} Indian foods with specialized database`,
    );
    return enhancedFoods;
  }

  private async enhanceIndividualFood(
    geminiFood: GeminiFoodData,
    foodType: FoodType,
  ): Promise<RecognizedFood> {
    const foodName = geminiFood.name.toLowerCase();

    const dbMatch = databaseMatcher.findDatabaseMatch(foodName);

    const region = foodType.region || regionClassifier.classifyRegion(foodName);

    const cookingMethod = cookingMethodDetector.detectCookingMethod(geminiFood);
    const spiceLevel = cookingMethodDetector.detectSpiceLevel(
      geminiFood,
      region,
    );

    const traditionalServing = nutritionCalculator.calculateTraditionalServing(
      foodName,
      region,
    );

    const correctedNutrition = nutritionCalculator.applyCorrections({
      baseNutrition:
        dbMatch?.nutritionPer100g ||
        nutritionCalculator.extractGeminiNutrition(geminiFood),
      region,
      cookingMethod,
      spiceLevel,
      portionSize: geminiFood.estimatedGrams || traditionalServing,
    });

    const enhancedFood: RecognizedFood = {
      id: `indian_food_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`,
      name: helperUtils.standardizeFoodName(geminiFood.name),
      localName: dbMatch?.hindiName,
      category: helperUtils.categorizeFood(foodName),
      cuisine: "indian",
      estimatedGrams: geminiFood.estimatedGrams || traditionalServing,
      servingDescription: helperUtils.determineServingType(
        geminiFood.estimatedGrams || traditionalServing,
      ),
      nutrition: {
        calories: correctedNutrition.calories,
        protein: correctedNutrition.protein,
        carbs: correctedNutrition.carbs,
        fat: correctedNutrition.fat,
        fiber: correctedNutrition.fiber,
      },
      nutritionPer100g: {
        calories: Math.round(
          (correctedNutrition.calories /
            (geminiFood.estimatedGrams || traditionalServing)) *
            100,
        ),
        protein:
          Math.round(
            (correctedNutrition.protein /
              (geminiFood.estimatedGrams || traditionalServing)) *
              100 *
              10,
          ) / 10,
        carbs:
          Math.round(
            (correctedNutrition.carbs /
              (geminiFood.estimatedGrams || traditionalServing)) *
              100 *
              10,
          ) / 10,
        fat:
          Math.round(
            (correctedNutrition.fat /
              (geminiFood.estimatedGrams || traditionalServing)) *
              100 *
              10,
          ) / 10,
        fiber:
          Math.round(
            (correctedNutrition.fiber /
              (geminiFood.estimatedGrams || traditionalServing)) *
              100 *
              10,
          ) / 10,
      },
      confidence: helperUtils.calculateConfidence(dbMatch, geminiFood, region),
    };

    return enhancedFood;
  }

  private createBasicIndianFood(geminiFood: GeminiFoodData): RecognizedFood {
    const grams = geminiFood.estimatedGrams || 100;
    const nutrition = nutritionCalculator.extractGeminiNutrition(geminiFood);

    return {
      id: `basic_indian_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").substring(0, 9)}`,
      name: helperUtils.standardizeFoodName(geminiFood.name),
      category: helperUtils.categorizeFood(geminiFood.name),
      cuisine: "indian",
      estimatedGrams: grams,
      servingDescription: helperUtils.determineServingType(grams),
      nutrition: nutrition,
      nutritionPer100g: {
        calories: Math.round((nutrition.calories / grams) * 100),
        protein: Math.round((nutrition.protein / grams) * 100 * 10) / 10,
        carbs: Math.round((nutrition.carbs / grams) * 100 * 10) / 10,
        fat: Math.round((nutrition.fat / grams) * 100 * 10) / 10,
        fiber: Math.round((nutrition.fiber / grams) * 100 * 10) / 10,
      },
      confidence: 60,
    };
  }
}

export default IndianFoodEnhancer;
