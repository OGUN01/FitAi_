/**
 * Free Nutrition APIs Integration Service
 * Integrates with free nutrition databases to enhance food recognition accuracy
 *
 * Supported APIs:
 * - USDA FoodData Central (720K requests/month - completely free)
 * - Open Food Facts (unlimited - open source)
 * - FatSecret Basic (150K requests/month - free tier)
 */

import { getCountryFromBarcode } from "@/utils/countryMapping";
import fitaiWorkersClient from "./fitaiWorkersClient";

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number;
  source: string;
  confidence: number;
  canonicalName?: string;
}

export interface BarcodeSearchResult {
  nutrition: NutritionData | null;
  productInfo: {
    name?: string;
    brand?: string;
    imageUrl?: string;
    ingredients?: string;
    allergens?: string[];
    labels?: string[];
    nutriScore?: string;
    novaGroup?: number;
    gs1Country?: string;
  };
  source: string;
  needsNutritionEstimate: boolean;
  confidence: number;
  isAIEstimated?: boolean;
}

export type BarcodeLookupPath =
  | "sqlite"
  | "supabase"
  | "off_world"
  | "off_india"
  | "ai_estimate";

export interface BarcodeSearchDetailedResult {
  outcome: "match" | "not_found" | "transient_failure";
  result: BarcodeSearchResult | null;
  lookupPath: BarcodeLookupPath[];
  retryable: boolean;
  error?: string;
}

interface USDAFood {
  fdcId: number;
  description: string;
  foodNutrients: Array<{
    nutrientId: number;
    value: number;
  }>;
}

interface OpenFoodFactsProduct {
  nutriments: {
    "energy-kcal_100g": number;
    proteins_100g: number;
    carbohydrates_100g: number;
    fat_100g: number;
    fiber_100g: number;
    sugars_100g: number;
    salt_100g: number;
  };
  product_name: string;
}

interface OFFv2Product {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  nutriments?: Record<string, number>;
  ingredients_text?: string;
  allergens_tags?: string[];
  nutrition_grades?: string;
  nova_group?: number;
  image_front_url?: string;
  countries_tags?: string[];
  labels_tags?: string[];
}

export async function estimateNutritionWithAI(
  productName: string,
  brand: string,
  gs1Country: string,
): Promise<BarcodeSearchResult | null> {
  try {
    const response = await fitaiWorkersClient.estimateNutrition(
      productName,
      brand,
      gs1Country,
    );
    if (!response.success || !response.data) {
      console.warn("[BarcodeAI] Nutrition estimate unavailable:", response.error);
      return null;
    }
    const d = response.data;
    const cappedConfidence = Math.min(Math.max(d.confidence ?? 0, 0), 40);
    return {
      nutrition: {
        calories: d.calories,
        protein: d.protein,
        carbs: d.carbs,
        fat: d.fat,
        fiber: d.fiber,
        sugar: d.sugar,
        sodium: d.sodium,
        source: "gemini-estimation",
        confidence: cappedConfidence,
      },
      productInfo: {
        name: productName,
        brand,
        gs1Country,
      },
      source: "gemini-estimation",
      needsNutritionEstimate: false,
      confidence: cappedConfidence,
      isAIEstimated: true,
    };
  } catch (error) {
    console.warn("[BarcodeAI] Nutrition estimate failed:", error);
    return null;
  }
}

const barcodeCache = new Map<string, BarcodeSearchResult>();

export function clearBarcodeCache(): void {
  barcodeCache.clear();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error(`Timeout after ${ms}ms`)),
      ms,
    );

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export class FreeNutritionAPIs {
  private usdaApiKey = process.env.USDA_API_KEY || ""; // Free - no key required
  private fatSecretKeys = [
    process.env.FATSECRET_KEY_1,
    process.env.FATSECRET_KEY_2,
    process.env.FATSECRET_KEY_3,
  ].filter(Boolean);

  private currentFatSecretKeyIndex = 0;
  private cache = new Map<string, NutritionData>();

  /**
   * Enhance nutrition data using free APIs
   */
  async enhanceNutritionData(foodName: string): Promise<NutritionData | null> {
    try {
      // Check cache first
      const cacheKey = foodName.toLowerCase().trim();
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Try multiple APIs in parallel for best accuracy
      const promises = [
        this.searchUSDAFoodData(foodName),
        this.searchOpenFoodFacts(foodName),
        this.searchFatSecret(foodName),
      ];

      const results = await Promise.allSettled(promises);
      const nutritionData: NutritionData[] = [];

      // Process results
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          nutritionData.push(result.value);
        } else {
          const apiNames = ["USDA", "OpenFoodFacts", "FatSecret"];
        }
      });

      if (nutritionData.length === 0) {
        return null;
      }

      // Calculate weighted average based on confidence scores
      const enhancedData = this.calculateWeightedAverage(nutritionData);

      // Cache the result
      this.cache.set(cacheKey, enhancedData);

      return enhancedData;
    } catch (error) {
      console.error("❌ Error enhancing nutrition data:", error);
      return null;
    }
  }

  /**
   * Search USDA FoodData Central
   * Free government database with 900K+ foods
   */
  private async searchUSDAFoodData(
    foodName: string,
  ): Promise<NutritionData | null> {
    try {
      // Validate API key is set
      if (!this.usdaApiKey) {
        throw new Error(
          "USDA API key not configured. Set USDA_API_KEY environment variable.",
        );
      }

      const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search`;
      // Manual query string building for React Native compatibility
      const params = `query=${encodeURIComponent(foodName)}&dataType=Foundation,SR Legacy&pageSize=5&api_key=${encodeURIComponent(this.usdaApiKey)}`;

      const response = await fetch(`${searchUrl}?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.foods || data.foods.length === 0) {
        return null;
      }

      // Get the best match (first result)
      const food = data.foods[0];
      const nutrients = food.foodNutrients || [];

      // Extract key nutrients (USDA nutrient IDs)
      const nutritionMap = {
        208: "calories", // Energy
        203: "protein", // Protein
        205: "carbs", // Carbohydrates
        204: "fat", // Total fat
        291: "fiber", // Fiber
        269: "sugar", // Sugars
        307: "sodium", // Sodium
      };

      const nutritionData: any = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      };

      nutrients.forEach((nutrient: any) => {
        const key =
          nutritionMap[nutrient.nutrientId as keyof typeof nutritionMap];
        if (key) {
          nutritionData[key] = nutrient.value || 0;
        }
      });

      // Convert sodium from mg to g for consistency
      if (nutritionData.sodium) {
        nutritionData.sodium = nutritionData.sodium / 1000;
      }

      return {
        ...nutritionData,
        source: "USDA",
        confidence: this.calculateMatchConfidence(foodName, food.description),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Search Open Food Facts database
   * Free, unlimited requests
   */
  private async searchOpenFoodFacts(
    foodName: string,
  ): Promise<NutritionData | null> {
    try {
      const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl`;
      // Manual query string building for React Native compatibility
      const params = `search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=5`;

      const response = await fetch(`${searchUrl}?${params}`, {
        method: "GET",
        headers: {
          "User-Agent": "FitAI-App/1.0.0",
        },
      });

      if (!response.ok) {
        throw new Error(`OpenFoodFacts API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.products || data.products.length === 0) {
        return null;
      }

      // Find the best match
      const product = data.products[0];
      const nutrients = product.nutriments;

      if (!nutrients) {
        return null;
      }

      return {
        calories: nutrients["energy-kcal_100g"] || 0,
        protein: nutrients["proteins_100g"] || 0,
        carbs: nutrients["carbohydrates_100g"] || 0,
        fat: nutrients["fat_100g"] || 0,
        fiber: nutrients["fiber_100g"] || 0,
        sugar: nutrients["sugars_100g"] || 0,
        sodium: (nutrients["salt_100g"] || 0) / 2.5, // Convert salt to sodium
        source: "OpenFoodFacts",
        confidence: this.calculateMatchConfidence(
          foodName,
          product.product_name || "",
        ),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Search FatSecret API
   * Free tier: 150K requests/month
   */
  private async searchFatSecret(
    foodName: string,
  ): Promise<NutritionData | null> {
    if (this.fatSecretKeys.length === 0) {
      return null;
    }

    try {
      const apiKey = this.fatSecretKeys[this.currentFatSecretKeyIndex];

      // FatSecret uses OAuth 1.0, but for simplicity using their basic API
      // Note: This is a simplified implementation - production would need proper OAuth
      const searchUrl = `https://platform.fatsecret.com/rest/server.api`;
      // Manual query string building for React Native compatibility
      const params = `method=foods.search&search_expression=${encodeURIComponent(foodName)}&format=json&max_results=5`;

      // For now, return null as FatSecret requires complex OAuth implementation
      // This can be implemented later with proper OAuth 1.0 signing
      return null;
    } catch (error) {
      // Rotate to next key
      this.currentFatSecretKeyIndex =
        (this.currentFatSecretKeyIndex + 1) % this.fatSecretKeys.length;
      return null;
    }
  }

  /**
   * Calculate weighted average of nutrition data from multiple sources
   */
  private calculateWeightedAverage(
    nutritionData: NutritionData[],
  ): NutritionData {
    if (nutritionData.length === 1) {
      return nutritionData[0];
    }

    const totalWeight = nutritionData.reduce(
      (sum, data) => sum + data.confidence,
      0,
    );

    const weightedData = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      source: "hybrid",
      confidence: 0,
    };

    // Calculate weighted averages
    nutritionData.forEach((data) => {
      const weight = data.confidence / totalWeight;
      weightedData.calories += data.calories * weight;
      weightedData.protein += data.protein * weight;
      weightedData.carbs += data.carbs * weight;
      weightedData.fat += data.fat * weight;
      weightedData.fiber += data.fiber * weight;
      weightedData.sugar += (data.sugar || 0) * weight;
      weightedData.sodium += (data.sodium || 0) * weight;
    });

    // Calculate combined confidence (average with boost for multiple sources)
    const avgConfidence = totalWeight / nutritionData.length;
    const multiSourceBoost = Math.min(10, (nutritionData.length - 1) * 5); // Up to 10 point boost
    weightedData.confidence = Math.min(
      95,
      Math.round(avgConfidence + multiSourceBoost),
    );

    // Update source information
    const sources = [...new Set(nutritionData.map((d) => d.source))];
    weightedData.source = sources.join(" + ");

    // Round to reasonable precision
    return {
      calories: Math.round(weightedData.calories),
      protein: Math.round(weightedData.protein * 10) / 10,
      carbs: Math.round(weightedData.carbs * 10) / 10,
      fat: Math.round(weightedData.fat * 10) / 10,
      fiber: Math.round(weightedData.fiber * 10) / 10,
      sugar: Math.round((weightedData.sugar || 0) * 10) / 10,
      sodium: Math.round((weightedData.sodium || 0) * 10) / 10,
      source: weightedData.source,
      confidence: weightedData.confidence,
    };
  }

  /**
   * Calculate match confidence based on string similarity
   */
  private calculateMatchConfidence(
    searchTerm: string,
    foundName: string,
  ): number {
    if (!foundName) return 30;

    const search = searchTerm.toLowerCase().trim();
    const found = foundName.toLowerCase().trim();

    // Exact match
    if (search === found) return 95;

    // One contains the other
    if (search.includes(found) || found.includes(search)) return 85;

    // Word overlap
    const searchWords = search.split(/\s+/);
    const foundWords = found.split(/\s+/);

    let matchingWords = 0;
    searchWords.forEach((word) => {
      if (
        word.length > 2 &&
        foundWords.some((fw) => fw.includes(word) || word.includes(fw))
      ) {
        matchingWords++;
      }
    });

    const wordMatchRatio =
      matchingWords / Math.max(searchWords.length, foundWords.length);
    return Math.round(30 + wordMatchRatio * 50); // 30-80 range
  }

  private cacheBarcodeResult(
    barcode: string,
    result: BarcodeSearchResult,
  ): void {
    if (barcodeCache.size >= 100) {
      const firstKey = barcodeCache.keys().next().value;
      if (firstKey !== undefined) barcodeCache.delete(firstKey);
    }
    barcodeCache.set(barcode, result);
  }

  private deriveLookupPathFromSource(source: string): BarcodeLookupPath[] {
    if (source.includes("openfoodfacts-india")) {
      return source.includes("gemini-estimation")
        ? ["off_india", "ai_estimate"]
        : ["off_india"];
    }

    if (source.includes("openfoodfacts")) {
      return source.includes("gemini-estimation")
        ? ["off_world", "ai_estimate"]
        : ["off_world"];
    }

    if (source.includes("gemini-estimation")) {
      return ["ai_estimate"];
    }

    return [];
  }

  async searchByBarcodeDetailed(
    barcode: string,
  ): Promise<BarcodeSearchDetailedResult> {
    if (barcodeCache.has(barcode)) {
      const cachedResult = barcodeCache.get(barcode)!;
      return {
        outcome: "match",
        result: cachedResult,
        lookupPath: this.deriveLookupPathFromSource(cachedResult.source),
        retryable: false,
      };
    }

    const lookupPath: BarcodeLookupPath[] = ["off_world"];
    const transientErrors: string[] = [];

    let offResult: BarcodeSearchResult | null = null;
    try {
      const offUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,product_name_en,brands,nutriments,ingredients_text,allergens_tags,nutrition_grades,nova_group,image_front_url,countries_tags,labels_tags`;
      const response = await withTimeout(
        fetch(offUrl, {
          headers: { "User-Agent": "FitAI/1.0 (fitai@example.com)" },
        }),
        8000,
      );

      if (!response.ok) {
        transientErrors.push(`OFF world HTTP ${response.status}`);
      } else {
        const data = await response.json();
        if (data.status === 1 && data.product) {
          const product = data.product as OFFv2Product;
          const nutrients = product.nutriments || {};
          const hasNutrition = Boolean(
            nutrients["energy-kcal_100g"] || nutrients["energy-kcal"],
          );

          offResult = {
            nutrition: hasNutrition
              ? {
                  calories:
                    nutrients["energy-kcal_100g"] ||
                    nutrients["energy-kcal"] ||
                    0,
                  protein: nutrients["proteins_100g"] || 0,
                  carbs: nutrients["carbohydrates_100g"] || 0,
                  fat: nutrients["fat_100g"] || 0,
                  fiber: nutrients["fiber_100g"] || 0,
                  sugar: nutrients["sugars_100g"] || 0,
                  sodium: (nutrients["salt_100g"] || 0) / 2.5,
                  source: "OpenFoodFacts",
                  confidence: 90,
                }
              : null,
            productInfo: {
              name:
                product.product_name_en || product.product_name || undefined,
              brand: product.brands || undefined,
              imageUrl: product.image_front_url || undefined,
              ingredients: product.ingredients_text || undefined,
              allergens:
                product.allergens_tags?.map((t: string) =>
                  t.replace("en:", ""),
                ) || [],
              labels:
                product.labels_tags?.map((t: string) => t.replace("en:", "")) ||
                [],
              nutriScore: product.nutrition_grades || undefined,
              novaGroup: product.nova_group
                ? Number(product.nova_group)
                : undefined,
              gs1Country: getCountryFromBarcode(barcode),
            },
            source: "openfoodfacts",
            needsNutritionEstimate: !hasNutrition,
            confidence: hasNutrition ? 90 : 50,
          };
        }
      }
    } catch (error) {
      console.error("OpenFoodFacts barcode lookup failed:", error);
      transientErrors.push(
        error instanceof Error ? error.message : String(error),
      );
    }

    if (offResult) {
      // OFF found product but no nutrition data — try Gemini AI estimation
      if (offResult.needsNutritionEstimate && offResult.productInfo.name) {
        const aiResult = await estimateNutritionWithAI(
          offResult.productInfo.name,
          offResult.productInfo.brand || "",
          offResult.productInfo.gs1Country || getCountryFromBarcode(barcode),
        );
        if (aiResult && aiResult.nutrition) {
          lookupPath.push("ai_estimate");
          offResult.nutrition = aiResult.nutrition;
          offResult.needsNutritionEstimate = false;
          offResult.isAIEstimated = true;
          offResult.confidence = aiResult.confidence;
          offResult.source = "openfoodfacts+gemini-estimation";
        }
      }
      this.cacheBarcodeResult(barcode, offResult);
      return {
        outcome: "match",
        result: offResult,
        lookupPath,
        retryable: false,
      };
    }

    const gs1Country = getCountryFromBarcode(barcode);
    lookupPath.push("off_india");

    // Step 2: Try OFF India endpoint — 14K+ Indian products not indexed on OFF World
    let offIndiaResult: BarcodeSearchResult | null = null;
    try {
      const offIndiaUrl = `https://in.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,product_name_en,brands,nutriments,ingredients_text,allergens_tags,nutrition_grades,nova_group,image_front_url,countries_tags,labels_tags`;
      const offIndiaResponse = await withTimeout(
        fetch(offIndiaUrl, {
          headers: { "User-Agent": "FitAI/1.0 (fitai@example.com)" },
        }),
        8000,
      );
      if (!offIndiaResponse.ok) {
        transientErrors.push(`OFF India HTTP ${offIndiaResponse.status}`);
      } else {
        const offIndiaData = await offIndiaResponse.json();
        if (offIndiaData.status === 1 && offIndiaData.product) {
          const p = offIndiaData.product as OFFv2Product;
          const n = p.nutriments || {};
          const hasNutrition = Boolean(
            n["energy-kcal_100g"] || n["energy-kcal"],
          );
          offIndiaResult = {
            nutrition: hasNutrition
              ? {
                  calories: n["energy-kcal_100g"] || n["energy-kcal"] || 0,
                  protein: n["proteins_100g"] || 0,
                  carbs: n["carbohydrates_100g"] || 0,
                  fat: n["fat_100g"] || 0,
                  fiber: n["fiber_100g"] || 0,
                  sugar: n["sugars_100g"] || 0,
                  sodium: (n["salt_100g"] || 0) / 2.5,
                  source: "OpenFoodFacts-India",
                  confidence: 90,
                }
              : null,
            productInfo: {
              name: p.product_name_en || p.product_name || undefined,
              brand: p.brands || undefined,
              imageUrl: p.image_front_url || undefined,
              ingredients: p.ingredients_text || undefined,
              allergens:
                p.allergens_tags?.map((t: string) => t.replace("en:", "")) ||
                [],
              labels:
                p.labels_tags?.map((t: string) => t.replace("en:", "")) || [],
              nutriScore: p.nutrition_grades || undefined,
              novaGroup: p.nova_group ? Number(p.nova_group) : undefined,
              gs1Country,
            },
            source: "openfoodfacts-india",
            needsNutritionEstimate: !hasNutrition,
            confidence: hasNutrition ? 90 : 50,
          };
        }
      }
    } catch (offIndiaErr) {
      console.error("[NutritionAPIs] OFF India lookup failed:", offIndiaErr);
      transientErrors.push(
        offIndiaErr instanceof Error ? offIndiaErr.message : String(offIndiaErr),
      );
    }

    if (offIndiaResult) {
      if (
        offIndiaResult.needsNutritionEstimate &&
        offIndiaResult.productInfo.name
      ) {
        const aiResult = await estimateNutritionWithAI(
          offIndiaResult.productInfo.name,
          offIndiaResult.productInfo.brand || "",
          gs1Country || "",
        );
        if (aiResult && aiResult.nutrition) {
          lookupPath.push("ai_estimate");
          offIndiaResult.nutrition = aiResult.nutrition;
          offIndiaResult.needsNutritionEstimate = false;
          offIndiaResult.isAIEstimated = true;
          offIndiaResult.confidence = aiResult.confidence;
          offIndiaResult.source = "openfoodfacts-india+gemini-estimation";
        }
      }
      this.cacheBarcodeResult(barcode, offIndiaResult);
      return {
        outcome: "match",
        result: offIndiaResult,
        lookupPath,
        retryable: false,
      };
    }

    if (transientErrors.length > 0) {
      return {
        outcome: "transient_failure",
        result: null,
        lookupPath,
        retryable: true,
        error: transientErrors[0],
      };
    }

    return {
      outcome: "not_found",
      result: null,
      lookupPath,
      retryable: false,
    };
  }

  async searchByBarcode(barcode: string): Promise<BarcodeSearchResult | null> {
    const detailedResult = await this.searchByBarcodeDetailed(barcode);
    return detailedResult.result;
  }

  /**
   * Get usage statistics
   */
  getStatistics(): {
    cacheSize: number;
    totalRequests: number;
    successRate: number;
  } {
    return {
      cacheSize: this.cache.size,
      totalRequests: 0,
      successRate: 0,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Validate nutrition data for reasonableness
   */
  private validateNutritionData(data: NutritionData): boolean {
    // Basic validation rules
    if (data.calories < 0 || data.calories > 900) return false; // Reasonable calorie range per 100g
    if (data.protein < 0 || data.protein > 100) return false;
    if (data.carbs < 0 || data.carbs > 100) return false;
    if (data.fat < 0 || data.fat > 100) return false;
    if (data.fiber < 0 || data.fiber > 50) return false;

    // Macro consistency check (calories should roughly match macros)
    const calculatedCalories = data.protein * 4 + data.carbs * 4 + data.fat * 9;
    const variance =
      Math.abs(data.calories - calculatedCalories) / data.calories;

    return variance < 0.5; // Allow 50% variance for processing, cooking effects
  }
}

export default FreeNutritionAPIs;
