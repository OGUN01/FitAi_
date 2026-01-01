/**
 * Macro Calculator - Diet-Adaptive Macronutrient Distribution
 * Calculates protein, fat, and carbohydrate needs based on diet type and goals
 */

import type { MacroCalculator } from '../interfaces/calculators';
import type { Macros, DietType, Goal } from '../types';

/**
 * Diet-Adaptive Macro Calculator
 * Adjusts macros based on dietary restrictions and fitness goals
 *
 * Research basis:
 * - Protein: 1.6-2.4 g/kg for muscle maintenance/growth
 * - Plant proteins require +15-25% due to lower bioavailability
 * - Keto: 70% fat, 25% protein, 5% carbs
 * - Balanced: 30% fat, 50-60% carbs, remainder protein
 */
export class DietAdaptiveMacroCalculator implements MacroCalculator {
  /**
   * Calculate protein needs based on goal and diet type
   */
  calculateProtein(weight: number, goal: Goal, dietType: DietType): number {
    // Base protein multipliers by goal (g/kg body weight)
    const baseProteinMultipliers: Record<Goal, number> = {
      fat_loss: 2.4,        // High protein preserves muscle during deficit
      muscle_gain: 2.0,     // Optimal for muscle protein synthesis
      maintenance: 1.8,     // Maintain current muscle mass
      athletic: 2.2,        // Support high training volume
      endurance: 1.6,       // Lower needs for endurance athletes
      strength: 2.2,        // Similar to athletic
    };

    let protein = weight * (baseProteinMultipliers[goal] || 2.0);

    // Diet-type adjustments for bioavailability
    const dietMultipliers: Record<DietType, number> = {
      omnivore: 1.0,        // Complete proteins from animal sources
      pescatarian: 1.0,     // Fish provides complete proteins
      vegetarian: 1.15,     // +15% for incomplete proteins
      vegan: 1.25,          // +25% for plant bioavailability
      keto: 1.0,            // Animal-based typically
      low_carb: 1.0,        // Usually includes animal protein
      paleo: 1.0,           // High animal protein
      mediterranean: 1.0,   // Balanced with fish/lean meat
    };

    protein *= dietMultipliers[dietType];

    return Math.round(protein);
  }

  /**
   * Calculate complete macro split based on diet type
   */
  calculateMacroSplit(calories: number, protein: number, dietType: DietType): Macros {
    const proteinCal = protein * 4; // 4 kcal per gram

    // Ensure we don't exceed total calories with protein alone
    if (proteinCal >= calories) {
      throw new Error('Protein calories exceed total calories - invalid calculation');
    }

    // Keto diet: 70% fat, 25% protein, 5% carbs
    if (dietType === 'keto') {
      return {
        protein: Math.round(protein),
        fat: Math.round((calories * 0.70) / 9),  // 9 kcal per gram
        carbs: Math.round((calories * 0.05) / 4), // 4 kcal per gram
      };
    }

    // Low-carb diet: 45% fat, 30% protein, 25% carbs
    if (dietType === 'low_carb') {
      const fatCal = calories * 0.45;
      const carbCal = calories - proteinCal - fatCal;

      return {
        protein: Math.round(protein),
        fat: Math.round(fatCal / 9),
        carbs: Math.round(Math.max(0, carbCal / 4)),
      };
    }

    // Paleo diet: 35% fat, 30% protein, 35% carbs (from whole foods)
    if (dietType === 'paleo') {
      const fatCal = calories * 0.35;
      const carbCal = calories - proteinCal - fatCal;

      return {
        protein: Math.round(protein),
        fat: Math.round(fatCal / 9),
        carbs: Math.round(Math.max(0, carbCal / 4)),
      };
    }

    // Mediterranean diet: 35% fat (healthy fats), moderate protein, rest carbs
    if (dietType === 'mediterranean') {
      const fatCal = calories * 0.35;
      const carbCal = calories - proteinCal - fatCal;

      return {
        protein: Math.round(protein),
        fat: Math.round(fatCal / 9),
        carbs: Math.round(Math.max(0, carbCal / 4)),
      };
    }

    // Balanced diet (omnivore, vegetarian, vegan, pescatarian):
    // 30% fat, remainder carbs after protein
    const remainingCal = calories - proteinCal;
    const fatCal = remainingCal * 0.30;
    const carbCal = remainingCal * 0.70;

    return {
      protein: Math.round(protein),
      fat: Math.round(fatCal / 9),
      carbs: Math.round(carbCal / 4),
    };
  }

  /**
   * Get macro percentages from gram amounts
   */
  getMacroPercentages(macros: Macros): {
    protein: number;
    fat: number;
    carbs: number;
    totalCalories: number;
  } {
    const proteinCal = macros.protein * 4;
    const fatCal = macros.fat * 9;
    const carbCal = macros.carbs * 4;
    const totalCal = proteinCal + fatCal + carbCal;

    return {
      protein: Math.round((proteinCal / totalCal) * 100),
      fat: Math.round((fatCal / totalCal) * 100),
      carbs: Math.round((carbCal / totalCal) * 100),
      totalCalories: Math.round(totalCal),
    };
  }

  /**
   * Get diet-specific recommendations
   */
  getDietRecommendations(dietType: DietType): {
    proteinSources: string[];
    fatSources: string[];
    carbSources: string[];
    tips: string[];
  } {
    const recommendations: Record<
      DietType,
      {
        proteinSources: string[];
        fatSources: string[];
        carbSources: string[];
        tips: string[];
      }
    > = {
      omnivore: {
        proteinSources: ['Chicken', 'Fish', 'Eggs', 'Greek yogurt', 'Lean beef'],
        fatSources: ['Olive oil', 'Avocado', 'Nuts', 'Fatty fish'],
        carbSources: ['Brown rice', 'Oats', 'Sweet potato', 'Quinoa', 'Fruits'],
        tips: ['Balance animal and plant proteins', 'Choose lean cuts of meat'],
      },
      pescatarian: {
        proteinSources: ['Salmon', 'Tuna', 'Shrimp', 'Eggs', 'Greek yogurt'],
        fatSources: ['Fatty fish', 'Olive oil', 'Avocado', 'Nuts'],
        carbSources: ['Brown rice', 'Quinoa', 'Oats', 'Legumes', 'Fruits'],
        tips: ['Eat fish 2-3 times per week', 'Include omega-3 rich fish'],
      },
      vegetarian: {
        proteinSources: ['Eggs', 'Greek yogurt', 'Cottage cheese', 'Legumes', 'Tofu'],
        fatSources: ['Nuts', 'Seeds', 'Avocado', 'Olive oil', 'Cheese'],
        carbSources: ['Quinoa', 'Brown rice', 'Oats', 'Legumes', 'Fruits'],
        tips: [
          'Combine different plant proteins',
          'Consider protein powder supplement',
        ],
      },
      vegan: {
        proteinSources: ['Tempeh', 'Tofu', 'Legumes', 'Seitan', 'Quinoa', 'Protein powder'],
        fatSources: ['Nuts', 'Seeds', 'Avocado', 'Olive oil', 'Nut butter'],
        carbSources: ['Brown rice', 'Oats', 'Quinoa', 'Sweet potato', 'Fruits'],
        tips: [
          'Combine complementary proteins (rice + beans)',
          'Consider B12 and iron supplementation',
          'Eat 25% more protein than omnivores',
        ],
      },
      keto: {
        proteinSources: ['Fatty fish', 'Eggs', 'Meat', 'Cheese', 'Greek yogurt'],
        fatSources: ['MCT oil', 'Butter', 'Avocado', 'Nuts', 'Fatty cuts of meat'],
        carbSources: ['Leafy greens', 'Avocado', 'Berries (limited)', 'Nuts'],
        tips: [
          'Stay under 50g carbs per day',
          'Prioritize healthy fats',
          'Monitor ketone levels',
        ],
      },
      low_carb: {
        proteinSources: ['Chicken', 'Fish', 'Eggs', 'Lean beef', 'Greek yogurt'],
        fatSources: ['Olive oil', 'Avocado', 'Nuts', 'Fatty fish'],
        carbSources: ['Vegetables', 'Berries', 'Small portions of whole grains'],
        tips: ['Limit carbs to 50-150g/day', 'Focus on non-starchy vegetables'],
      },
      paleo: {
        proteinSources: ['Grass-fed meat', 'Wild fish', 'Eggs', 'Poultry'],
        fatSources: ['Coconut oil', 'Avocado', 'Nuts', 'Olive oil'],
        carbSources: ['Sweet potato', 'Fruits', 'Vegetables', 'Nuts'],
        tips: [
          'Avoid processed foods',
          'No grains or legumes',
          'Focus on whole foods',
        ],
      },
      mediterranean: {
        proteinSources: ['Fish', 'Chicken', 'Eggs', 'Legumes', 'Greek yogurt'],
        fatSources: ['Olive oil', 'Nuts', 'Fatty fish', 'Avocado'],
        carbSources: ['Whole grains', 'Fruits', 'Vegetables', 'Legumes'],
        tips: [
          'Use olive oil as primary fat',
          'Eat fish 2-3 times per week',
          'Include plenty of vegetables',
        ],
      },
    };

    return recommendations[dietType];
  }

  /**
   * Validate macro distribution
   */
  validateMacros(macros: Macros, calories: number): {
    valid: boolean;
    issues: string[];
    totalCalories: number;
    variance: number;
  } {
    const issues: string[] = [];
    const calculatedCalories =
      macros.protein * 4 + macros.fat * 9 + macros.carbs * 4;
    const variance = Math.abs(calculatedCalories - calories);
    const variancePercent = (variance / calories) * 100;

    if (variancePercent > 5) {
      issues.push(
        `Macro calories (${calculatedCalories}) don't match target (${calories})`
      );
    }

    if (macros.protein < 40) {
      issues.push('Protein too low (minimum 40g recommended)');
    }

    if (macros.fat < 20) {
      issues.push('Fat too low (minimum 20g for hormone production)');
    }

    if (macros.carbs < 0) {
      issues.push('Carbs cannot be negative');
    }

    return {
      valid: issues.length === 0,
      issues,
      totalCalories: Math.round(calculatedCalories),
      variance: Math.round(variance),
    };
  }

  /**
   * Get meal distribution (how to split macros across meals)
   */
  getMealDistribution(
    macros: Macros,
    meals: number = 3
  ): Array<{ meal: string; protein: number; fat: number; carbs: number }> {
    const distribution = [];

    for (let i = 1; i <= meals; i++) {
      distribution.push({
        meal: `Meal ${i}`,
        protein: Math.round(macros.protein / meals),
        fat: Math.round(macros.fat / meals),
        carbs: Math.round(macros.carbs / meals),
      });
    }

    return distribution;
  }
}

/**
 * Calculate minimum protein to prevent muscle loss
 */
export function getMinimumProtein(weight: number): number {
  // Minimum 1.2 g/kg to prevent muscle wasting
  return Math.round(weight * 1.2);
}

/**
 * Calculate optimal protein for muscle gain
 */
export function getOptimalProteinForMuscleGain(weight: number, dietType: DietType): number {
  const baseProtein = weight * 2.0;

  const multipliers: Record<DietType, number> = {
    omnivore: 1.0,
    pescatarian: 1.0,
    vegetarian: 1.15,
    vegan: 1.25,
    keto: 1.0,
    low_carb: 1.0,
    paleo: 1.0,
    mediterranean: 1.0,
  };

  return Math.round(baseProtein * multipliers[dietType]);
}

/**
 * Singleton instance
 */
export const macroCalculator = new DietAdaptiveMacroCalculator();
