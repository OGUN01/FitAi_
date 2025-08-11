import { FOOD_ALIASES, normalizeName } from './foodAliases';
import { searchFoods, getFoodsByCategory, getFoodById } from '../../data/foods';
import { freeNutritionAPIs } from '../../services/freeNutritionAPIs';

export interface MappedFood {
  id?: string; // id when mapped to FOODS
  name: string;
  source: 'local' | 'external' | 'fallback';
  servingSize: number; // grams per serving
  caloriesPer100g: number;
  macrosPer100g: { protein: number; carbohydrates: number; fat: number; fiber: number };
  confidence: number; // 0..1
}

// simple in-memory cache (can be extended to persistent storage)
const cache = new Map<string, MappedFood>();

export class IngredientMapper {
  static async mapIngredient(raw: string, constraints?: { dietType?: string; exclude?: string[] }): Promise<MappedFood | null> {
    const normalized = normalizeName(raw);
    if (!normalized) return null;

    const cacheKey = JSON.stringify({ normalized, constraints });
    if (cache.has(cacheKey)) return cache.get(cacheKey)!;

    // 1) local search
    const localCandidates = searchFoods(normalized);
    const bestLocal = localCandidates?.[0];
    if (bestLocal) {
      const mapped: MappedFood = {
        id: bestLocal.id,
        name: bestLocal.name,
        source: 'local',
        servingSize: bestLocal.servingSize,
        caloriesPer100g: bestLocal.calories,
        macrosPer100g: bestLocal.macros,
        confidence: 0.9,
      };
      cache.set(cacheKey, mapped);
      return mapped;
    }

    // 2) category inference (very simple heuristic)
    const categoryHints: Record<string, string> = {
      chicken: 'protein',
      tofu: 'protein',
      paneer: 'protein',
      lentil: 'protein',
      bean: 'protein',
      rice: 'grains',
      bread: 'grains',
      oats: 'grains',
      spinach: 'vegetables',
      broccoli: 'vegetables',
      lettuce: 'vegetables',
      tomato: 'vegetables',
      avocado: 'fats',
      almond: 'fats',
    };
    const hintKey = Object.keys(categoryHints).find(k => normalized.includes(k));
    if (hintKey) {
      const cat = categoryHints[hintKey];
      const list = getFoodsByCategory(cat);
      if (list.length) {
        const f = list[0];
        const mapped: MappedFood = {
          id: f.id,
          name: f.name,
          source: 'local',
          servingSize: f.servingSize,
          caloriesPer100g: f.calories,
          macrosPer100g: f.macros,
          confidence: 0.7,
        };
        cache.set(cacheKey, mapped);
        return mapped;
      }
    }

    // 3) external enrichment as last resort
    try {
      const enriched = await freeNutritionAPIs.enhanceNutritionData(normalized);
      if (enriched) {
        const mapped: MappedFood = {
          name: enriched.canonicalName || normalized,
          source: 'external',
          servingSize: 100,
          caloriesPer100g: enriched.calories,
          macrosPer100g: {
            protein: enriched.protein,
            carbohydrates: enriched.carbs,
            fat: enriched.fat,
            fiber: enriched.fiber ?? 0,
          },
          confidence: 0.6,
        };
        cache.set(cacheKey, mapped);
        return mapped;
      }
    } catch {}

    // 4) fallback
    return {
      name: normalized,
      source: 'fallback',
      servingSize: 100,
      caloriesPer100g: 100,
      macrosPer100g: { protein: 5, carbohydrates: 15, fat: 2, fiber: 2 },
      confidence: 0.3,
    };
  }

  static async mapIngredients(raws: string[], constraints?: { dietType?: string; exclude?: string[] }): Promise<MappedFood[]> {
    const results: MappedFood[] = [];
    for (const r of raws || []) {
      const m = await this.mapIngredient(r, constraints);
      if (m) results.push(m);
    }
    // de-duplicate by name/id
    const dedup = new Map<string, MappedFood>();
    for (const m of results) {
      const key = m.id || m.name;
      if (!dedup.has(key)) dedup.set(key, m);
    }
    return Array.from(dedup.values());
  }
}

export default new IngredientMapper();

