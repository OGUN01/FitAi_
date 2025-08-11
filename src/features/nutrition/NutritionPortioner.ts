import { MappedFood } from './IngredientMapper';

export interface PortionTargets {
  calories: number;
  protein: number; // grams
  carbs?: number;  // optional
  fat?: number;    // optional
}

export interface QuantifiedItem {
  name: string;
  grams: number; // quantity in grams
  calories: number;
  macros: { protein: number; carbohydrates: number; fat: number; fiber: number };
}

export interface PortionResult {
  items: QuantifiedItem[];
  totals: { calories: number; protein: number; carbohydrates: number; fat: number; fiber: number };
}

// Simple greedy allocator: hit protein first, then fill remaining calories with carbs/fats
export class NutritionPortioner {
  static allocatePortions(foods: MappedFood[], targets: PortionTargets): PortionResult {
    const items: QuantifiedItem[] = [];

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;

    const byProteinDensity = [...foods].sort((a, b) => (b.macrosPer100g.protein / (b.caloriesPer100g || 1)) - (a.macrosPer100g.protein / (a.caloriesPer100g || 1)));

    const targetProtein = Math.max(0, targets.protein);
    const targetCalories = Math.max(0, targets.calories);

    // Step 1: Satisfy protein target greedily
    for (const f of byProteinDensity) {
      if (totalProtein >= targetProtein) break;
      const pPer100 = f.macrosPer100g.protein;
      if (pPer100 <= 0) continue;

      const proteinNeeded = targetProtein - totalProtein;
      const gramsNeeded = Math.min(300, Math.ceil((proteinNeeded / pPer100) * 100)); // cap 300g per item

      const cals = (f.caloriesPer100g * gramsNeeded) / 100;
      const carbs = (f.macrosPer100g.carbohydrates * gramsNeeded) / 100;
      const fat = (f.macrosPer100g.fat * gramsNeeded) / 100;
      const fiber = (f.macrosPer100g.fiber * gramsNeeded) / 100;

      items.push({ name: f.name, grams: gramsNeeded, calories: Math.round(cals), macros: {
        protein: Math.round((pPer100 * gramsNeeded) / 100 * 10) / 10,
        carbohydrates: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        fiber: Math.round(fiber * 10) / 10,
      }});

      totalCalories += cals;
      totalProtein += (pPer100 * gramsNeeded) / 100;
      totalCarbs += carbs;
      totalFat += fat;
      totalFiber += fiber;
    }

    // Step 2: Fill remaining calories with remaining foods (carb/fat balance)
    const remainingCalories = Math.max(0, targetCalories - totalCalories);
    if (remainingCalories > 0) {
      const byCaloricDensity = [...foods].sort((a, b) => (b.caloriesPer100g) - (a.caloriesPer100g));
      for (const f of byCaloricDensity) {
        if (totalCalories >= targetCalories) break;
        const cPer100 = f.caloriesPer100g;
        if (cPer100 <= 0) continue;
        // try to add up to 150g for variety
        const grams = Math.min(150, Math.ceil(((targetCalories - totalCalories) / cPer100) * 100));
        if (grams <= 0) continue;

        const p = (f.macrosPer100g.protein * grams) / 100;
        const carbs = (f.macrosPer100g.carbohydrates * grams) / 100;
        const fat = (f.macrosPer100g.fat * grams) / 100;
        const fiber = (f.macrosPer100g.fiber * grams) / 100;
        const cals = (cPer100 * grams) / 100;

        items.push({ name: f.name, grams, calories: Math.round(cals), macros: {
          protein: Math.round(p * 10) / 10,
          carbohydrates: Math.round(carbs * 10) / 10,
          fat: Math.round(fat * 10) / 10,
          fiber: Math.round(fiber * 10) / 10,
        }});

        totalCalories += cals;
        totalProtein += p;
        totalCarbs += carbs;
        totalFat += fat;
        totalFiber += fiber;
      }
    }

    return {
      items,
      totals: {
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein * 10) / 10,
        carbohydrates: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        fiber: Math.round(totalFiber * 10) / 10,
      }
    };
  }
}

export default new NutritionPortioner();

