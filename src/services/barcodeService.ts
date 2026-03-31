/**
 * Comprehensive Barcode Scanning and Product Lookup Service
 * Integrates packaged-food barcode scanning with trusted nutrition sources.
 */

import {
  BarcodeLookupPath,
  BarcodeSearchDetailedResult,
  BarcodeSearchResult,
  FreeNutritionAPIs,
} from "./freeNutritionAPIs";
import {
  matchesPackagedFoodBarcodeType,
  normalizeBarcode,
} from "@/utils/countryMapping";
import { supabase } from "@/services/supabase";
import { sqliteFood } from "./sqliteFood";
import { isWeakPackagedFoodProduct } from "@/features/barcode/packagedFood";

export interface ScannedProduct {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar?: number;
    sodium?: number;
    servingSize?: number;
    servingUnit?: string;
  };
  perServing?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  additionalInfo?: {
    ingredients?: string[];
    allergens?: string[];
    labels?: string[];
    imageUrl?: string;
  };
  healthScore?: number;
  confidence: number;
  source: string;
  lastScanned: string;
  nutriScore?: string;
  novaGroup?: number;
  isAIEstimated?: boolean;
  gs1Country?: string;
  needsNutritionEstimate?: boolean;
}

export interface BarcodeValidationResult {
  isValid: boolean;
  format: string;
  error?: string;
}

export type ProductLookupOutcome =
  | "authoritative_hit"
  | "weak_data"
  | "not_found"
  | "invalid_scan"
  | "transient_failure";

export interface ProductLookupMeta {
  rawBarcode: string;
  normalizedBarcode: string | null;
  rawSymbology?: string;
  retryable: boolean;
  lookupPath: BarcodeLookupPath[];
  finalSource?: string;
}

export interface ProductLookupResult {
  outcome: ProductLookupOutcome;
  product?: ScannedProduct;
  error?: string;
  meta: ProductLookupMeta;
}

interface ProductLookupOptions {
  rawSymbology?: string;
}

interface LookupBarcodeRow {
  barcode: string;
  product_name: string | null;
  brand: string | null;
  energy_kcal_100g: number | null;
  proteins_100g: number | null;
  carbohydrates_100g: number | null;
  sugars_100g: number | null;
  fat_100g: number | null;
  fiber_100g: number | null;
  sodium_100g: number | null;
  nutriscore_grade: string | null;
  nova_group: number | null;
  image_url: string | null;
  source: string;
  confidence: number;
  tier: number;
}

class BarcodeService {
  private nutritionAPI: FreeNutritionAPIs;
  private scanCache = new Map<string, ScannedProduct>();
  private recentScans: string[] = [];
  private maxCacheSize = 100;
  private maxRecentScans = 20;

  constructor() {
    this.nutritionAPI = new FreeNutritionAPIs();
  }

  private deriveLookupPathFromSource(source: string): BarcodeLookupPath[] {
    if (source.includes("sqlite")) return ["sqlite"];
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
    if (source.includes("gemini-estimation")) return ["ai_estimate"];
    return ["supabase"];
  }

  private buildLookupResult(
    outcome: ProductLookupOutcome,
    rawBarcode: string,
    normalizedBarcode: string | null,
    lookupPath: BarcodeLookupPath[],
    options?: ProductLookupOptions,
    product?: ScannedProduct,
    error?: string,
  ): ProductLookupResult {
    return {
      outcome,
      product,
      error,
      meta: {
        rawBarcode,
        normalizedBarcode,
        rawSymbology: options?.rawSymbology,
        retryable: outcome === "transient_failure",
        lookupPath,
        finalSource: product?.source,
      },
    };
  }

  private classifyProductOutcome(product: ScannedProduct): ProductLookupOutcome {
    return isWeakPackagedFoodProduct(product, "barcode")
      ? "weak_data"
      : "authoritative_hit";
  }

  private buildScannedProduct(
    barcode: string,
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
    },
    nutrition:
      | BarcodeSearchResult["nutrition"]
      | {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number;
          sugar?: number;
          sodium?: number;
        }
      | null,
    metadata: {
      confidence: number;
      source: string;
      isAIEstimated?: boolean;
      needsNutritionEstimate?: boolean;
    },
  ): ScannedProduct {
    return {
      barcode,
      name: productInfo.name || `Product ${barcode}`,
      brand: productInfo.brand,
      nutrition: {
        calories: nutrition?.calories ?? 0,
        protein: nutrition?.protein ?? 0,
        carbs: nutrition?.carbs ?? 0,
        fat: nutrition?.fat ?? 0,
        fiber: nutrition?.fiber ?? 0,
        sugar: nutrition?.sugar,
        sodium: nutrition?.sodium,
        servingSize: 100,
        servingUnit: "g",
      },
      additionalInfo: {
        ingredients: productInfo.ingredients
          ? productInfo.ingredients.split(",").map((item: string) => item.trim())
          : undefined,
        allergens: productInfo.allergens,
        labels: productInfo.labels,
        imageUrl: productInfo.imageUrl,
      },
      healthScore: nutrition ? this.calculateHealthScore(nutrition) : undefined,
      confidence: metadata.confidence,
      source: metadata.source,
      lastScanned: new Date().toISOString(),
      nutriScore: productInfo.nutriScore,
      novaGroup: productInfo.novaGroup,
      isAIEstimated: metadata.isAIEstimated ?? false,
      gs1Country: productInfo.gs1Country,
      needsNutritionEstimate: metadata.needsNutritionEstimate,
    };
  }

  validateBarcode(barcode: string): BarcodeValidationResult {
    try {
      const cleanBarcode = barcode.trim();

      if (!cleanBarcode) {
        return {
          isValid: false,
          format: "unknown",
          error: "Empty barcode",
        };
      }

      if (this.isUPCA(cleanBarcode)) {
        return { isValid: true, format: "UPC-A" };
      }
      if (this.isEAN13(cleanBarcode)) {
        return { isValid: true, format: "EAN-13" };
      }
      if (this.isEAN8(cleanBarcode)) {
        return { isValid: true, format: "EAN-8" };
      }
      if (this.isUPCE(cleanBarcode)) {
        return { isValid: true, format: "UPC-E" };
      }

      return {
        isValid: false,
        format: "unknown",
        error: "Unsupported packaged-food barcode format",
      };
    } catch (error) {
      return {
        isValid: false,
        format: "unknown",
        error: `Validation error: ${error}`,
      };
    }
  }

  async lookupProduct(
    barcode: string,
    options?: ProductLookupOptions,
  ): Promise<ProductLookupResult> {
    const rawBarcode = barcode;
    const normalizedBarcode = normalizeBarcode(barcode);
    const lookupPath: BarcodeLookupPath[] = [];
    let sawRetryableFailure = false;

    try {
      if (
        options?.rawSymbology &&
        !matchesPackagedFoodBarcodeType(options.rawSymbology, rawBarcode)
      ) {
        return this.buildLookupResult(
          "invalid_scan",
          rawBarcode,
          normalizedBarcode,
          lookupPath,
          options,
          undefined,
          "Scanned barcode type does not match a supported packaged-food code.",
        );
      }

      if (!normalizedBarcode) {
        return this.buildLookupResult(
          "invalid_scan",
          rawBarcode,
          null,
          lookupPath,
          options,
          undefined,
          "Unsupported packaged-food barcode format.",
        );
      }

      if (this.scanCache.has(normalizedBarcode)) {
        const cachedProduct = this.scanCache.get(normalizedBarcode)!;
        this.updateRecentScans(normalizedBarcode);
        return this.buildLookupResult(
          this.classifyProductOutcome(cachedProduct),
          rawBarcode,
          normalizedBarcode,
          this.deriveLookupPathFromSource(cachedProduct.source),
          options,
          cachedProduct,
        );
      }

      if (sqliteFood.isDatabaseReady()) {
        lookupPath.push("sqlite");
        try {
          const sqliteRow = await sqliteFood.lookupBarcode(normalizedBarcode);
          if (sqliteRow && sqliteRow.product_name) {
            const sqliteProduct = this.buildScannedProduct(
              normalizedBarcode,
              {
                name: sqliteRow.product_name ?? undefined,
                brand: sqliteRow.brands ?? undefined,
                imageUrl: sqliteRow.image_url ?? undefined,
                nutriScore: sqliteRow.nutriscore_grade ?? undefined,
                novaGroup: sqliteRow.nova_group ?? undefined,
              },
              sqliteRow.energy_kcal_100g !== null
                ? {
                    calories: sqliteRow.energy_kcal_100g ?? 0,
                    protein: sqliteRow.proteins_100g ?? 0,
                    carbs: sqliteRow.carbohydrates_100g ?? 0,
                    fat: sqliteRow.fat_100g ?? 0,
                    fiber: sqliteRow.fiber_100g ?? 0,
                    sugar: sqliteRow.sugars_100g ?? undefined,
                    sodium: sqliteRow.sodium_100g ?? undefined,
                  }
                : null,
              {
                confidence: sqliteRow.energy_kcal_100g !== null ? 92 : 50,
                source: "sqlite-local",
                isAIEstimated: false,
                needsNutritionEstimate: sqliteRow.energy_kcal_100g === null,
              },
            );
            this.cacheProduct(normalizedBarcode, sqliteProduct);
            this.updateRecentScans(normalizedBarcode);
            return this.buildLookupResult(
              this.classifyProductOutcome(sqliteProduct),
              rawBarcode,
              normalizedBarcode,
              lookupPath,
              options,
              sqliteProduct,
            );
          }
        } catch (sqliteErr) {
          console.error('[barcodeService] SQLite lookup failed — local DB may be corrupted:', sqliteErr);
          // Continue to remote lookup but signal degraded local DB state
          sawRetryableFailure = true;
        }
      }

      lookupPath.push("supabase");
      try {
        const { data: dbRows, error: dbErr } = await supabase.rpc(
          "lookup_barcode",
          {
            p_barcode: normalizedBarcode,
          },
        );

        if (dbErr) {
          sawRetryableFailure = true;
        } else if (dbRows && (dbRows as LookupBarcodeRow[]).length > 0) {
          const row = (dbRows as LookupBarcodeRow[])[0];
          if (row.product_name) {
            const dbProduct = this.buildScannedProduct(
              normalizedBarcode,
              {
                name: row.product_name ?? undefined,
                brand: row.brand ?? undefined,
                imageUrl: row.image_url ?? undefined,
                nutriScore: row.nutriscore_grade ?? undefined,
                novaGroup: row.nova_group ?? undefined,
              },
              row.energy_kcal_100g !== null
                ? {
                    calories: row.energy_kcal_100g ?? 0,
                    protein: row.proteins_100g ?? 0,
                    carbs: row.carbohydrates_100g ?? 0,
                    fat: row.fat_100g ?? 0,
                    fiber: row.fiber_100g ?? 0,
                    sugar: row.sugars_100g ?? undefined,
                    sodium: row.sodium_100g ?? undefined,
                  }
                : null,
              {
                confidence: row.energy_kcal_100g !== null ? row.confidence : 50,
                source: row.source,
                isAIEstimated: false,
                needsNutritionEstimate: row.energy_kcal_100g === null,
              },
            );
            this.cacheProduct(normalizedBarcode, dbProduct);
            this.updateRecentScans(normalizedBarcode);
            return this.buildLookupResult(
              this.classifyProductOutcome(dbProduct),
              rawBarcode,
              normalizedBarcode,
              lookupPath,
              options,
              dbProduct,
            );
          }
        }
      } catch (dbLookupError) {
        sawRetryableFailure = true;
        console.warn(
          "DB barcode lookup failed, falling back to live API:",
          dbLookupError,
        );
      }

      let searchResult: BarcodeSearchDetailedResult =
        await this.nutritionAPI.searchByBarcodeDetailed(normalizedBarcode);

      if (searchResult.outcome === "transient_failure") {
        // 1s backoff before single retry — prevents hammering on transient network errors
        await new Promise(resolve => setTimeout(resolve, 1000));
        searchResult = await this.nutritionAPI.searchByBarcodeDetailed(
          normalizedBarcode,
        );
      }

      const mergedLookupPath = [...lookupPath, ...searchResult.lookupPath];

      if (searchResult.outcome === "match" && searchResult.result) {
        const scannedProduct = this.buildScannedProduct(
          normalizedBarcode,
          searchResult.result.productInfo,
          searchResult.result.nutrition,
          {
            confidence: searchResult.result.confidence,
            source: searchResult.result.source,
            isAIEstimated: searchResult.result.isAIEstimated ?? false,
            needsNutritionEstimate:
              searchResult.result.needsNutritionEstimate,
          },
        );

        this.cacheProduct(normalizedBarcode, scannedProduct);
        this.updateRecentScans(normalizedBarcode);

        supabase
          .rpc("upsert_barcode_cache", {
            p_barcode: normalizedBarcode,
            p_product_name: scannedProduct.name,
            p_brand: scannedProduct.brand ?? null,
            p_energy_kcal_100g: scannedProduct.nutrition.calories,
            p_proteins_100g: scannedProduct.nutrition.protein,
            p_carbohydrates_100g: scannedProduct.nutrition.carbs,
            p_sugars_100g: scannedProduct.nutrition.sugar ?? null,
            p_fat_100g: scannedProduct.nutrition.fat,
            p_fiber_100g: scannedProduct.nutrition.fiber,
            p_sodium_100g: scannedProduct.nutrition.sodium ?? null,
            p_nutriscore_grade: scannedProduct.nutriScore ?? null,
            p_nova_group: scannedProduct.novaGroup ?? null,
            p_image_url: scannedProduct.additionalInfo?.imageUrl ?? null,
            p_source: scannedProduct.source,
            p_confidence: scannedProduct.confidence,
            p_is_ai_estimated: scannedProduct.isAIEstimated ?? false,
          })
          .then(undefined, (e: unknown) =>
            console.warn("upsert_barcode_cache failed:", e),
          );

        return this.buildLookupResult(
          this.classifyProductOutcome(scannedProduct),
          rawBarcode,
          normalizedBarcode,
          mergedLookupPath,
          options,
          scannedProduct,
        );
      }

      if (searchResult.outcome === "transient_failure" || sawRetryableFailure) {
        return this.buildLookupResult(
          "transient_failure",
          rawBarcode,
          normalizedBarcode,
          mergedLookupPath,
          options,
          undefined,
          searchResult.error || "Lookup failed before all trusted sources completed.",
        );
      }

      return this.buildLookupResult(
        "not_found",
        rawBarcode,
        normalizedBarcode,
        mergedLookupPath,
        options,
        undefined,
        "Product not found in trusted packaged-food sources.",
      );
    } catch (error) {
      console.error("Product lookup error:", error);
      return this.buildLookupResult(
        "transient_failure",
        rawBarcode,
        normalizedBarcode,
        lookupPath,
        options,
        undefined,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private calculateHealthScore(nutrition: {
    calories: number;
    protein?: number;
    fat?: number;
    sugar?: number;
    sodium?: number;
    fiber?: number;
  }): number {
    let score = 100;

    if (nutrition.calories > 400) {
      score -= Math.min(30, (nutrition.calories - 400) / 10);
    }
    if (nutrition.fat && nutrition.fat > 20) {
      score -= Math.min(20, (nutrition.fat - 20) * 2);
    }
    if (nutrition.sugar && nutrition.sugar > 15) {
      score -= Math.min(25, (nutrition.sugar - 15) * 1.5);
    }
    if (nutrition.sodium && nutrition.sodium > 1.5) {
      score -= Math.min(20, (nutrition.sodium - 1.5) * 10);
    }
    if (nutrition.protein && nutrition.protein > 10) {
      score += Math.min(15, (nutrition.protein - 10) * 0.5);
    }
    if (nutrition.fiber && nutrition.fiber > 5) {
      score += Math.min(10, (nutrition.fiber - 5) * 1);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private isUPCA(barcode: string): boolean {
    return /^[0-9]{12}$/.test(barcode);
  }

  private isEAN13(barcode: string): boolean {
    return /^[0-9]{13}$/.test(barcode);
  }

  private isEAN8(barcode: string): boolean {
    return /^[0-9]{8}$/.test(barcode);
  }

  private isUPCE(barcode: string): boolean {
    return /^[0-9]{6}$/.test(barcode);
  }

  private cacheProduct(barcode: string, product: ScannedProduct): void {
    if (this.scanCache.size >= this.maxCacheSize) {
      // JS Map iterates in insertion order, so keys().next().value is the oldest entry.
      const oldestKey = this.scanCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.scanCache.delete(oldestKey);
      }
    }

    this.scanCache.set(barcode, product);
  }

  private updateRecentScans(barcode: string): void {
    this.recentScans = this.recentScans.filter((value) => value !== barcode);
    this.recentScans.unshift(barcode);

    if (this.recentScans.length > this.maxRecentScans) {
      this.recentScans = this.recentScans.slice(0, this.maxRecentScans);
    }
  }

  getRecentScans(): ScannedProduct[] {
    return this.recentScans
      .map((barcode) => this.scanCache.get(barcode))
      .filter((product): product is ScannedProduct => product !== undefined);
  }

  clearCache(): void {
    this.scanCache.clear();
    this.recentScans = [];
  }

  getCacheStats(): {
    cacheSize: number;
    recentScans: number;
    maxCacheSize: number;
  } {
    return {
      cacheSize: this.scanCache.size,
      recentScans: this.recentScans.length,
      maxCacheSize: this.maxCacheSize,
    };
  }
}

export const barcodeService = new BarcodeService();
export default barcodeService;
