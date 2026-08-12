/**
 * Free Nutrition APIs Integration Service
 * Integrates with free nutrition databases to enhance food recognition accuracy
 *
 * Supported APIs:
 * - USDA FoodData Central (720K requests/month - completely free)
 * - Open Food Facts (unlimited - open source)
 * - FatSecret Basic: NOT live. searchFatSecret() is a stub — FatSecret
 *   requires OAuth 1.0 request signing, which is not implemented. It always
 *   returns null and contributes nothing to enhanceNutritionData().
 */

import { getCountryFromBarcode } from "@/utils/countryMapping";

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
  | "off_name_search";

export interface BarcodeSearchDetailedResult {
  outcome: "match" | "not_found" | "transient_failure";
  result: BarcodeSearchResult | null;
  lookupPath: BarcodeLookupPath[];
  retryable: boolean;
  error?: string;
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

      // Process results — drop anything that fails the sanity/range check
      // before it ever reaches the weighted average or the caller.
      results.forEach((result) => {
        if (
          result.status === "fulfilled" &&
          result.value &&
          this.validateNutritionData(result.value)
        ) {
          nutritionData.push(result.value);
        }
      });

      if (nutritionData.length === 0) {
        return null;
      }

      // Calculate weighted average based on confidence scores
      const enhancedData = this.calculateWeightedAverage(nutritionData);
      if (!enhancedData) {
        return null;
      }

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
        return null;
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

      const nutritionData: Omit<NutritionData, "source" | "confidence"> & Record<string, number> = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
      };

      nutrients.forEach((nutrient: { nutrientId: number; value: number }) => {
        const key =
          nutritionMap[nutrient.nutrientId as keyof typeof nutritionMap];
        if (key) {
          nutritionData[key] = nutrient.value || 0;
        }
      });

      return {
        ...nutritionData,
        source: "USDA",
        confidence: this.calculateMatchConfidence(foodName, food.description),
      };
    } catch (error) {
      console.error("[freeNutritionAPIs] searchUSDA failed:", error);
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
        sodium: (nutrients["salt_100g"] || 0) * 0.4, // salt (g/100g) → sodium (g/100g): NaCl is 39.3% Na by mass
        source: "OpenFoodFacts",
        confidence: this.calculateMatchConfidence(
          foodName,
          product.product_name || "",
        ),
      };
    } catch (error) {
      console.error("[freeNutritionAPIs] searchOpenFoodFacts failed:", error);
      return null;
    }
  }

  /**
   * Search FatSecret API
   * Free tier: 150K requests/month
   */
  private async searchFatSecret(
    _foodName: string,
  ): Promise<NutritionData | null> {
    if (this.fatSecretKeys.length === 0) {
      return null;
    }

    try {
      // FatSecret requires OAuth 1.0 signing — not yet implemented.
      // Return null; key rotation handled in catch on any failure.
      return null;
    } catch {
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
  ): NutritionData | null {
    if (nutritionData.length === 1) {
      // A lone source with a weak word-overlap match (as low as 30) has no
      // second source to corroborate it — don't hand that out as usable
      // nutrition. Mirrors barcodeService's <85-confidence => 'weak_data' bar.
      return nutritionData[0].confidence >= 50 ? nutritionData[0] : null;
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
      return ["off_india"];
    }

    if (source.includes("openfoodfacts")) {
      return ["off_world"];
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
        5000,
      );

      if (!response.ok) {
        transientErrors.push(`OFF world HTTP ${response.status}`);
      } else {
        const data = await response.json();
        if (data.status === 1 && data.product) {
          const product = data.product as OFFv2Product;
          const nutrients = product.nutriments || {};
          const rawHasNutrition = Boolean(
            nutrients["energy-kcal_100g"] || nutrients["energy-kcal"],
          );
          const offNutritionCandidate: NutritionData | null = rawHasNutrition
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
                sodium: (nutrients["salt_100g"] || 0) * 0.4, // salt (g/100g) → sodium (g/100g): NaCl is 39.3% Na by mass
                source: "OpenFoodFacts",
                confidence: 90,
              }
            : null;
          // Reject malformed/corrupted crowd-sourced nutriments (e.g. a
          // units mix-up producing 5000 kcal/100g) before it's trusted as
          // "hasNutrition" and cached for every future user of this barcode.
          const hasNutrition =
            offNutritionCandidate !== null &&
            this.validateNutritionData(offNutritionCandidate);

          offResult = {
            nutrition: hasNutrition ? offNutritionCandidate : null,
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
      // OFF found product identity but no nutrition — try OFF name search
      // (real DB, no AI). If that also misses, leave needsNutritionEstimate
      // true so the UI offers "Scan Label" / "Contribute Product".
      if (offResult.needsNutritionEstimate && offResult.productInfo.name) {
        const nameNutrition = await this.searchOpenFoodFacts(
          offResult.productInfo.name,
        );
        if (nameNutrition && this.validateNutritionData(nameNutrition)) {
          lookupPath.push("off_name_search");
          offResult.nutrition = nameNutrition;
          offResult.needsNutritionEstimate = false;
          offResult.confidence = Math.min(
            nameNutrition.confidence,
            offResult.confidence,
          );
          offResult.source = "openfoodfacts+name-search";
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
        5000,
      );
      if (!offIndiaResponse.ok) {
        transientErrors.push(`OFF India HTTP ${offIndiaResponse.status}`);
      } else {
        const offIndiaData = await offIndiaResponse.json();
        if (offIndiaData.status === 1 && offIndiaData.product) {
          const p = offIndiaData.product as OFFv2Product;
          const n = p.nutriments || {};
          const rawHasNutrition = Boolean(
            n["energy-kcal_100g"] || n["energy-kcal"],
          );
          const offIndiaNutritionCandidate: NutritionData | null =
            rawHasNutrition
              ? {
                  calories: n["energy-kcal_100g"] || n["energy-kcal"] || 0,
                  protein: n["proteins_100g"] || 0,
                  carbs: n["carbohydrates_100g"] || 0,
                  fat: n["fat_100g"] || 0,
                  fiber: n["fiber_100g"] || 0,
                  sugar: n["sugars_100g"] || 0,
                  sodium: (n["salt_100g"] || 0) * 0.4, // salt (g/100g) → sodium (g/100g): NaCl is 39.3% Na by mass
                  source: "OpenFoodFacts-India",
                  confidence: 90,
                }
              : null;
          // Same sanity check as OFF world — don't trust a malformed
          // crowd-sourced value as "hasNutrition".
          const hasNutrition =
            offIndiaNutritionCandidate !== null &&
            this.validateNutritionData(offIndiaNutritionCandidate);
          offIndiaResult = {
            nutrition: hasNutrition ? offIndiaNutritionCandidate : null,
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
      // OFF India found product identity but no nutrition — try OFF name
      // search (real DB, no AI). If that also misses, leave
      // needsNutritionEstimate true so the UI offers "Scan Label" /
      // "Contribute Product".
      if (
        offIndiaResult.needsNutritionEstimate &&
        offIndiaResult.productInfo.name
      ) {
        const nameNutrition = await this.searchOpenFoodFacts(
          offIndiaResult.productInfo.name,
        );
        if (nameNutrition && this.validateNutritionData(nameNutrition)) {
          lookupPath.push("off_name_search");
          offIndiaResult.nutrition = nameNutrition;
          offIndiaResult.needsNutritionEstimate = false;
          offIndiaResult.confidence = Math.min(
            nameNutrition.confidence,
            offIndiaResult.confidence,
          );
          offIndiaResult.source = "openfoodfacts-india+name-search";
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

    // Macro consistency check (calories should roughly match macros).
    // Guard div-by-zero: a genuinely near-zero-calorie item (e.g. water)
    // is only valid if its macros are also ~0.
    const calculatedCalories = data.protein * 4 + data.carbs * 4 + data.fat * 9;
    if (data.calories === 0) {
      return calculatedCalories < 5;
    }
    const variance =
      Math.abs(data.calories - calculatedCalories) / data.calories;

    return variance < 0.5; // Allow 50% variance for processing, cooking effects
  }
}

export default FreeNutritionAPIs;
