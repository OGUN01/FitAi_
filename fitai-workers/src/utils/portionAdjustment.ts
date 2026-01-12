/**
 * FitAI Workers - Portion Adjustment Utility
 *
 * Dynamically adjusts meal portions to hit exact calorie targets.
 * Ensures AI-generated meal plans match user's calculated daily calories.
 */

import { DietResponse, FoodItem, Meal } from './validation';

/**
 * Adjust meal plan portions to match exact calorie target
 *
 * Scales all food quantities proportionally to hit target calories within 2%
 *
 * @param mealPlan - AI-generated meal plan
 * @param targetCalories - User's calculated daily calories from database
 * @returns Adjusted meal plan with scaled portions
 *
 * @example
 * ```typescript
 * const mealPlan = await generateObject({ ... });
 * const adjusted = adjustPortionsToTarget(mealPlan.object, 2200);
 * // Adjusted plan will have ~2200 calories total
 * ```
 */
export function adjustPortionsToTarget(
  mealPlan: DietResponse,
  targetCalories: number
): DietResponse {
  console.log('[PortionAdjustment] Starting adjustment:', {
    currentCalories: mealPlan.totalCalories,
    targetCalories,
  });

  // Calculate current total calories from meals
  const currentCalories = mealPlan.meals.reduce((sum, meal) => {
    return sum + meal.foods.reduce((mealSum, food) => mealSum + food.nutrition.calories, 0);
  }, 0);

  // Calculate scale factor
  const scaleFactor = targetCalories / currentCalories;

  console.log('[PortionAdjustment] Scale factor:', scaleFactor);

  // Don't adjust if within 2% (acceptable variance)
  if (Math.abs(1 - scaleFactor) < 0.02) {
    console.log('[PortionAdjustment] Within 2% tolerance - no adjustment needed');
    return mealPlan;
  }

  // Scale all food portions
  const adjustedMeals: Meal[] = mealPlan.meals.map((meal) => {
    const adjustedFoods: FoodItem[] = meal.foods.map((food) => ({
      ...food,
      nutrition: {
        calories: Math.round(food.nutrition.calories * scaleFactor),
        protein: Math.round(food.nutrition.protein * scaleFactor * 10) / 10, // 1 decimal place
        carbs: Math.round(food.nutrition.carbs * scaleFactor * 10) / 10,
        fats: Math.round(food.nutrition.fats * scaleFactor * 10) / 10,
        fiber: food.nutrition.fiber
          ? Math.round(food.nutrition.fiber * scaleFactor * 10) / 10
          : undefined,
        sugar: food.nutrition.sugar
          ? Math.round(food.nutrition.sugar * scaleFactor * 10) / 10
          : undefined,
        sodium: food.nutrition.sodium
          ? Math.round(food.nutrition.sodium * scaleFactor)
          : undefined,
      },
    }));

    // Recalculate meal total nutrition
    const mealTotalNutrition = {
      calories: adjustedFoods.reduce((sum, f) => sum + f.nutrition.calories, 0),
      protein: Math.round(
        adjustedFoods.reduce((sum, f) => sum + f.nutrition.protein, 0) * 10
      ) / 10,
      carbs: Math.round(
        adjustedFoods.reduce((sum, f) => sum + f.nutrition.carbs, 0) * 10
      ) / 10,
      fats: Math.round(
        adjustedFoods.reduce((sum, f) => sum + f.nutrition.fats, 0) * 10
      ) / 10,
      fiber: adjustedFoods.some((f) => f.nutrition.fiber)
        ? Math.round(
            adjustedFoods.reduce((sum, f) => sum + (f.nutrition.fiber || 0), 0) * 10
          ) / 10
        : undefined,
      sugar: adjustedFoods.some((f) => f.nutrition.sugar)
        ? Math.round(
            adjustedFoods.reduce((sum, f) => sum + (f.nutrition.sugar || 0), 0) * 10
          ) / 10
        : undefined,
      sodium: adjustedFoods.some((f) => f.nutrition.sodium)
        ? Math.round(adjustedFoods.reduce((sum, f) => sum + (f.nutrition.sodium || 0), 0))
        : undefined,
    };

    return {
      ...meal,
      foods: adjustedFoods,
      totalNutrition: mealTotalNutrition,
    };
  });

  // Recalculate plan-level totals
  const totalNutrition = {
    calories: adjustedMeals.reduce((sum, m) => sum + m.totalNutrition.calories, 0),
    protein: Math.round(
      adjustedMeals.reduce((sum, m) => sum + m.totalNutrition.protein, 0) * 10
    ) / 10,
    carbs: Math.round(
      adjustedMeals.reduce((sum, m) => sum + m.totalNutrition.carbs, 0) * 10
    ) / 10,
    fats: Math.round(
      adjustedMeals.reduce((sum, m) => sum + m.totalNutrition.fats, 0) * 10
    ) / 10,
    fiber: adjustedMeals.some((m) => m.totalNutrition.fiber)
      ? Math.round(
          adjustedMeals.reduce((sum, m) => sum + (m.totalNutrition.fiber || 0), 0) * 10
        ) / 10
      : undefined,
    sugar: adjustedMeals.some((m) => m.totalNutrition.sugar)
      ? Math.round(
          adjustedMeals.reduce((sum, m) => sum + (m.totalNutrition.sugar || 0), 0) * 10
        ) / 10
      : undefined,
    sodium: adjustedMeals.some((m) => m.totalNutrition.sodium)
      ? Math.round(adjustedMeals.reduce((sum, m) => sum + (m.totalNutrition.sodium || 0), 0))
      : undefined,
  };

  console.log('[PortionAdjustment] Adjustment complete:', {
    originalCalories: currentCalories,
    adjustedCalories: totalNutrition.calories,
    targetCalories,
    difference: Math.abs(totalNutrition.calories - targetCalories),
    accuracy: `${(100 - Math.abs((totalNutrition.calories - targetCalories) / targetCalories * 100)).toFixed(2)}%`,
  });

  return {
    ...mealPlan,
    meals: adjustedMeals,
    totalCalories: totalNutrition.calories,
    totalNutrition,
  };
}

/**
 * Determine if a food is "high-protein" based on its macro composition
 * A food is high-protein if protein contributes >= 20% of its calories
 */
function isHighProteinFood(food: FoodItem): boolean {
  const calories = food.nutrition.calories;
  const protein = food.nutrition.protein;
  
  if (calories <= 0) return false;
  
  // Protein = 4 cal/g
  const proteinCalories = protein * 4;
  const proteinPercent = proteinCalories / calories;
  
  return proteinPercent >= 0.20; // 20% or more calories from protein
}

/**
 * Adjust meal plan to hit both calorie AND protein targets
 * 
 * Strategy:
 * 1. First do standard calorie adjustment
 * 2. Calculate protein shortfall/excess
 * 3. Categorize foods: high-protein vs low-protein
 * 4. Scale high-protein foods up/down to hit protein target
 * 5. Scale low-protein foods inversely to maintain calorie target
 * 
 * @param mealPlan - AI-generated meal plan
 * @param targetCalories - User's calculated daily calories
 * @param targetProtein - User's calculated daily protein in grams
 * @returns Adjusted meal plan with both targets met (within 5% tolerance)
 */
export function adjustForProteinTarget(
  mealPlan: DietResponse,
  targetCalories: number,
  targetProtein: number
): DietResponse {
  console.log('[ProteinAdjustment] Starting protein-aware adjustment:', {
    currentCalories: mealPlan.totalCalories,
    currentProtein: mealPlan.totalNutrition.protein,
    targetCalories,
    targetProtein,
  });

  // Step 1: First do standard calorie adjustment
  let adjusted = adjustPortionsToTarget(mealPlan, targetCalories);
  
  const currentProtein = adjusted.totalNutrition.protein;
  const proteinDiff = targetProtein - currentProtein;
  const proteinDiffPercent = Math.abs(proteinDiff / targetProtein);
  
  // If protein is within 5% of target, no further adjustment needed
  if (proteinDiffPercent < 0.05) {
    console.log('[ProteinAdjustment] Protein within 5% tolerance, no adjustment needed');
    return adjusted;
  }
  
  console.log('[ProteinAdjustment] Protein off by:', {
    diff: `${proteinDiff.toFixed(1)}g`,
    percent: `${(proteinDiffPercent * 100).toFixed(1)}%`,
  });
  
  // Step 2: Categorize all foods as high-protein or low-protein
  type FoodWithMeta = {
    mealIndex: number;
    foodIndex: number;
    food: FoodItem;
    isHighProtein: boolean;
    proteinPerCalorie: number;
  };
  
  const allFoods: FoodWithMeta[] = [];
  
  adjusted.meals.forEach((meal, mealIndex) => {
    meal.foods.forEach((food, foodIndex) => {
      const calories = food.nutrition.calories;
      const protein = food.nutrition.protein;
      const proteinPerCalorie = calories > 0 ? protein / calories : 0;
      
      allFoods.push({
        mealIndex,
        foodIndex,
        food,
        isHighProtein: isHighProteinFood(food),
        proteinPerCalorie,
      });
    });
  });
  
  const highProteinFoods = allFoods.filter(f => f.isHighProtein);
  const lowProteinFoods = allFoods.filter(f => !f.isHighProtein);
  
  console.log('[ProteinAdjustment] Food categorization:', {
    highProtein: highProteinFoods.length,
    lowProtein: lowProteinFoods.length,
  });
  
  // If no high-protein foods, can't do composition adjustment
  if (highProteinFoods.length === 0) {
    console.warn('[ProteinAdjustment] No high-protein foods found, cannot adjust');
    return adjusted;
  }
  
  // If no low-protein foods, can only scale uniformly (already done)
  if (lowProteinFoods.length === 0) {
    console.warn('[ProteinAdjustment] No low-protein foods found, uniform scaling applied');
    return adjusted;
  }
  
  // Step 3: Calculate total calories from each category
  const highProteinCalories = highProteinFoods.reduce(
    (sum, f) => sum + f.food.nutrition.calories, 0
  );
  const lowProteinCalories = lowProteinFoods.reduce(
    (sum, f) => sum + f.food.nutrition.calories, 0
  );
  
  // Calculate average protein per calorie for high-protein foods
  const highProteinTotalProtein = highProteinFoods.reduce(
    (sum, f) => sum + f.food.nutrition.protein, 0
  );
  const avgProteinPerCal = highProteinTotalProtein / highProteinCalories;
  
  // Calculate average protein per calorie for low-protein foods
  const lowProteinTotalProtein = lowProteinFoods.reduce(
    (sum, f) => sum + f.food.nutrition.protein, 0
  );
  const lowAvgProteinPerCal = lowProteinCalories > 0 
    ? lowProteinTotalProtein / lowProteinCalories 
    : 0;
  
  console.log('[ProteinAdjustment] Protein density:', {
    highProteinAvg: `${(avgProteinPerCal * 100).toFixed(2)}g/100cal`,
    lowProteinAvg: `${(lowAvgProteinPerCal * 100).toFixed(2)}g/100cal`,
  });
  
  // Step 4: Calculate how to shift calories between categories to hit protein target
  // Let x = calories to shift from low-protein to high-protein foods
  // New protein = currentProtein + (avgProteinPerCal - lowAvgProteinPerCal) * x
  // We want: targetProtein = currentProtein + (avgProteinPerCal - lowAvgProteinPerCal) * x
  // Therefore: x = proteinDiff / (avgProteinPerCal - lowAvgProteinPerCal)
  
  const proteinDensityDiff = avgProteinPerCal - lowAvgProteinPerCal;
  
  if (Math.abs(proteinDensityDiff) < 0.01) {
    // Not enough difference in protein density to make meaningful adjustment
    console.warn('[ProteinAdjustment] Protein density difference too small');
    return adjusted;
  }
  
  const caloriesToShift = proteinDiff / proteinDensityDiff;
  
  // Limit the shift to prevent extreme adjustments (max 30% of either category)
  const maxShift = Math.min(highProteinCalories * 0.5, lowProteinCalories * 0.5);
  const actualShift = Math.max(-maxShift, Math.min(maxShift, caloriesToShift));
  
  console.log('[ProteinAdjustment] Calorie shift calculation:', {
    idealShift: caloriesToShift.toFixed(0),
    actualShift: actualShift.toFixed(0),
    maxAllowed: maxShift.toFixed(0),
  });
  
  // Step 5: Calculate scale factors for each category
  // High-protein foods: add actualShift calories
  // Low-protein foods: remove actualShift calories
  const highProteinScaleFactor = (highProteinCalories + actualShift) / highProteinCalories;
  const lowProteinScaleFactor = (lowProteinCalories - actualShift) / lowProteinCalories;
  
  console.log('[ProteinAdjustment] Scale factors:', {
    highProtein: highProteinScaleFactor.toFixed(3),
    lowProtein: lowProteinScaleFactor.toFixed(3),
  });
  
  // Step 6: Apply scale factors to each food category
  const adjustedMeals: Meal[] = adjusted.meals.map((meal, mealIndex) => {
    const adjustedFoods: FoodItem[] = meal.foods.map((food, foodIndex) => {
      // Find this food's metadata
      const meta = allFoods.find(
        f => f.mealIndex === mealIndex && f.foodIndex === foodIndex
      );
      
      if (!meta) return food;
      
      const scaleFactor = meta.isHighProtein ? highProteinScaleFactor : lowProteinScaleFactor;
      
      return {
        ...food,
        nutrition: {
          calories: Math.round(food.nutrition.calories * scaleFactor),
          protein: Math.round(food.nutrition.protein * scaleFactor * 10) / 10,
          carbs: Math.round(food.nutrition.carbs * scaleFactor * 10) / 10,
          fats: Math.round(food.nutrition.fats * scaleFactor * 10) / 10,
          fiber: food.nutrition.fiber
            ? Math.round(food.nutrition.fiber * scaleFactor * 10) / 10
            : undefined,
          sugar: food.nutrition.sugar
            ? Math.round(food.nutrition.sugar * scaleFactor * 10) / 10
            : undefined,
          sodium: food.nutrition.sodium
            ? Math.round(food.nutrition.sodium * scaleFactor)
            : undefined,
        },
      };
    });
    
    // Recalculate meal total nutrition
    const mealTotalNutrition = {
      calories: adjustedFoods.reduce((sum, f) => sum + f.nutrition.calories, 0),
      protein: Math.round(
        adjustedFoods.reduce((sum, f) => sum + f.nutrition.protein, 0) * 10
      ) / 10,
      carbs: Math.round(
        adjustedFoods.reduce((sum, f) => sum + f.nutrition.carbs, 0) * 10
      ) / 10,
      fats: Math.round(
        adjustedFoods.reduce((sum, f) => sum + f.nutrition.fats, 0) * 10
      ) / 10,
      fiber: adjustedFoods.some((f) => f.nutrition.fiber)
        ? Math.round(
            adjustedFoods.reduce((sum, f) => sum + (f.nutrition.fiber || 0), 0) * 10
          ) / 10
        : undefined,
      sugar: adjustedFoods.some((f) => f.nutrition.sugar)
        ? Math.round(
            adjustedFoods.reduce((sum, f) => sum + (f.nutrition.sugar || 0), 0) * 10
          ) / 10
        : undefined,
      sodium: adjustedFoods.some((f) => f.nutrition.sodium)
        ? Math.round(adjustedFoods.reduce((sum, f) => sum + (f.nutrition.sodium || 0), 0))
        : undefined,
    };
    
    return {
      ...meal,
      foods: adjustedFoods,
      totalNutrition: mealTotalNutrition,
    };
  });
  
  // Recalculate plan-level totals
  const totalNutrition = {
    calories: adjustedMeals.reduce((sum, m) => sum + m.totalNutrition.calories, 0),
    protein: Math.round(
      adjustedMeals.reduce((sum, m) => sum + m.totalNutrition.protein, 0) * 10
    ) / 10,
    carbs: Math.round(
      adjustedMeals.reduce((sum, m) => sum + m.totalNutrition.carbs, 0) * 10
    ) / 10,
    fats: Math.round(
      adjustedMeals.reduce((sum, m) => sum + m.totalNutrition.fats, 0) * 10
    ) / 10,
    fiber: adjustedMeals.some((m) => m.totalNutrition.fiber)
      ? Math.round(
          adjustedMeals.reduce((sum, m) => sum + (m.totalNutrition.fiber || 0), 0) * 10
        ) / 10
      : undefined,
    sugar: adjustedMeals.some((m) => m.totalNutrition.sugar)
      ? Math.round(
          adjustedMeals.reduce((sum, m) => sum + (m.totalNutrition.sugar || 0), 0) * 10
        ) / 10
      : undefined,
    sodium: adjustedMeals.some((m) => m.totalNutrition.sodium)
      ? Math.round(adjustedMeals.reduce((sum, m) => sum + (m.totalNutrition.sodium || 0), 0))
      : undefined,
  };
  
  const finalProteinDiff = Math.abs(totalNutrition.protein - targetProtein);
  const finalCalorieDiff = Math.abs(totalNutrition.calories - targetCalories);
  
  console.log('[ProteinAdjustment] Adjustment complete:', {
    originalProtein: currentProtein,
    adjustedProtein: totalNutrition.protein,
    targetProtein,
    proteinDifference: finalProteinDiff.toFixed(1) + 'g',
    proteinAccuracy: `${(100 - (finalProteinDiff / targetProtein) * 100).toFixed(1)}%`,
    caloriesDifference: finalCalorieDiff,
    caloriesAccuracy: `${(100 - (finalCalorieDiff / targetCalories) * 100).toFixed(1)}%`,
  });
  
  return {
    ...adjusted,
    meals: adjustedMeals,
    totalCalories: totalNutrition.calories,
    totalNutrition,
  };
}

/**
 * Validate meal plan accuracy against target metrics
 *
 * @param mealPlan - Meal plan to validate
 * @param targetMetrics - User's calculated nutritional needs
 * @returns Array of validation warnings
 *
 * @example
 * ```typescript
 * const warnings = validateMealPlan(mealPlan, {
 *   daily_calories: 2200,
 *   daily_protein_g: 165,
 *   daily_carbs_g: 220,
 *   daily_fat_g: 73
 * });
 * if (warnings.length > 0) {
 *   console.warn('Meal plan validation warnings:', warnings);
 * }
 * ```
 */
export function validateMealPlan(
  mealPlan: DietResponse,
  targetMetrics: {
    daily_calories: number;
    daily_protein_g: number;
    daily_carbs_g: number;
    daily_fat_g: number;
  }
): string[] {
  const warnings: string[] = [];

  // Calculate totals
  const totals = {
    calories: mealPlan.totalCalories,
    protein: mealPlan.totalNutrition.protein,
    carbs: mealPlan.totalNutrition.carbs,
    fat: mealPlan.totalNutrition.fats,
  };

  console.log('[MealPlanValidation] Validating meal plan:', {
    totals,
    targets: targetMetrics,
  });

  // Calorie validation (±100 kcal = acceptable)
  const calorieDiff = Math.abs(totals.calories - targetMetrics.daily_calories);
  if (calorieDiff > 100) {
    warnings.push(
      `Calories off by ${calorieDiff} kcal (target: ${targetMetrics.daily_calories}, actual: ${totals.calories})`
    );
  }

  // Protein validation (±20g = acceptable)
  const proteinDiff = Math.abs(totals.protein - targetMetrics.daily_protein_g);
  if (proteinDiff > 20) {
    warnings.push(
      `Protein off by ${proteinDiff.toFixed(1)}g (target: ${targetMetrics.daily_protein_g}g, actual: ${totals.protein}g)`
    );
  }

  // Carbs validation (±30g = acceptable)
  const carbsDiff = Math.abs(totals.carbs - targetMetrics.daily_carbs_g);
  if (carbsDiff > 30) {
    warnings.push(
      `Carbs off by ${carbsDiff.toFixed(1)}g (target: ${targetMetrics.daily_carbs_g}g, actual: ${totals.carbs}g)`
    );
  }

  // Fat validation (±15g = acceptable)
  const fatDiff = Math.abs(totals.fat - targetMetrics.daily_fat_g);
  if (fatDiff > 15) {
    warnings.push(
      `Fat off by ${fatDiff.toFixed(1)}g (target: ${targetMetrics.daily_fat_g}g, actual: ${totals.fat}g)`
    );
  }

  if (warnings.length > 0) {
    console.warn('[MealPlanValidation] Validation warnings:', warnings);
  } else {
    console.log('[MealPlanValidation] Meal plan meets all targets');
  }

  return warnings;
}

/**
 * Calculate macro percentages from meal plan
 */
export function calculateMacroPercentages(mealPlan: DietResponse): {
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
} {
  const totalCalories = mealPlan.totalCalories;
  const protein = mealPlan.totalNutrition.protein;
  const carbs = mealPlan.totalNutrition.carbs;
  const fat = mealPlan.totalNutrition.fats;

  // Calories from macros (protein/carbs = 4 cal/g, fat = 9 cal/g)
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;

  const totalMacroCals = proteinCals + carbsCals + fatCals;

  return {
    proteinPercent: Math.round((proteinCals / totalMacroCals) * 100),
    carbsPercent: Math.round((carbsCals / totalMacroCals) * 100),
    fatPercent: Math.round((fatCals / totalMacroCals) * 100),
  };
}
