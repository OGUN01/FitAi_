/**
 * Comprehensive Barcode Scanning and Product Lookup Service
 * Integrates camera scanning with nutrition database lookup
 */

import { FreeNutritionAPIs, BarcodeSearchResult } from "./freeNutritionAPIs";
import { normalizeBarcode } from "@/utils/countryMapping";
import { supabase } from "@/services/supabase";
import { sqliteFood } from "./sqliteFood";

// Enhanced product information interface
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

export interface ProductLookupResult {
  success: boolean;
  product?: ScannedProduct;
  error?: string;
  confidence: number;
}

// Shape returned by the lookup_barcode() Supabase RPC function
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

  /**
   * Validate barcode format and structure
   */
  validateBarcode(barcode: string): BarcodeValidationResult {
    try {
      // Remove any whitespace
      const cleanBarcode = barcode.trim();

      if (!cleanBarcode) {
        return {
          isValid: false,
          format: "unknown",
          error: "Empty barcode",
        };
      }

      // Check for common barcode formats
      if (this.isUPCA(cleanBarcode)) {
        return { isValid: true, format: "UPC-A" };
      }

      if (this.isEAN13(cleanBarcode)) {
        return { isValid: true, format: "EAN-13" };
      }

      if (this.isEAN8(cleanBarcode)) {
        return { isValid: true, format: "EAN-8" };
      }

      if (this.isQRCode(cleanBarcode)) {
        return { isValid: true, format: "QR Code" };
      }

      // If we can't identify the format but it contains only digits/alphanumeric
      if (/^[0-9A-Za-z\-_]+$/.test(cleanBarcode)) {
        return { isValid: true, format: "Generic" };
      }

      return {
        isValid: false,
        format: "unknown",
        error: "Invalid barcode format",
      };
    } catch (error) {
      return {
        isValid: false,
        format: "unknown",
        error: `Validation error: ${error}`,
      };
    }
  }

  /**
   * Main barcode lookup function - integrates with existing nutrition API
   */
  async lookupProduct(barcode: string): Promise<ProductLookupResult> {
    try {
      // Normalize barcode (zero-pad UPC-A → EAN-13, validate format)
      const normalizedBarcode = normalizeBarcode(barcode);
      if (!normalizedBarcode) {
        return {
          success: false,
          error: "Invalid barcode format",
          confidence: 0,
        };
      }

      // Check cache first
      if (this.scanCache.has(normalizedBarcode)) {
        const cachedProduct = this.scanCache.get(normalizedBarcode)!;
        this.updateRecentScans(normalizedBarcode);
        return {
          success: true,
          product: cachedProduct,
          confidence: cachedProduct.confidence,
        };
      }

      // ─── Step 0a: On-device SQLite (zero-latency, offline-first) ───────────
      if (sqliteFood.isDatabaseReady()) {
        try {
          const sqliteRow = await sqliteFood.lookupBarcode(normalizedBarcode);
          if (sqliteRow && sqliteRow.energy_kcal_100g !== null) {
            const sqliteProduct: ScannedProduct = {
              barcode: normalizedBarcode,
              name: sqliteRow.product_name ?? "Product " + normalizedBarcode,
              brand: sqliteRow.brands ?? undefined,
              nutrition: {
                calories: sqliteRow.energy_kcal_100g ?? 0,
                protein: sqliteRow.proteins_100g ?? 0,
                carbs: sqliteRow.carbohydrates_100g ?? 0,
                fat: sqliteRow.fat_100g ?? 0,
                fiber: sqliteRow.fiber_100g ?? 0,
                sugar: sqliteRow.sugars_100g ?? undefined,
                sodium: sqliteRow.sodium_100g ?? undefined,
                servingSize: 100,
                servingUnit: "g",
              },
              additionalInfo: { imageUrl: sqliteRow.image_url ?? undefined },
              healthScore: this.calculateHealthScore({
                calories: sqliteRow.energy_kcal_100g ?? 0,
                protein: sqliteRow.proteins_100g ?? undefined,
                fat: sqliteRow.fat_100g ?? undefined,
                sugar: sqliteRow.sugars_100g ?? undefined,
                sodium: sqliteRow.sodium_100g ?? undefined,
                fiber: sqliteRow.fiber_100g ?? undefined,
              }),
              confidence: 92,
              source: "sqlite-local",
              lastScanned: new Date().toISOString(),
              nutriScore: sqliteRow.nutriscore_grade ?? undefined,
              novaGroup: sqliteRow.nova_group ?? undefined,
              isAIEstimated: false,
            };
            this.cacheProduct(normalizedBarcode, sqliteProduct);
            this.updateRecentScans(normalizedBarcode);
            return { success: true, product: sqliteProduct, confidence: 92 };
          }
        } catch (sqliteErr) {
          console.warn("⚠️ SQLite lookup failed, falling through:", sqliteErr);
        }
      }

      // ─────────────────────────────────────────────────────────────
      // Step 0: Query Supabase DB (off_products / user contributions / cache)
      //   Tier 1 = self-hosted OFF India  (confidence 90)
      //   Tier 2 = user contributions     (confidence 80)
      //   Tier 3 = barcode_lookup_cache   (runtime API cache, 7-day TTL)
      // ─────────────────────────────────────────────────────────────
      try {
        const { data: dbRows, error: dbErr } = await supabase.rpc(
          "lookup_barcode",
          {
            p_barcode: normalizedBarcode,
          },
        );
        if (!dbErr && dbRows && (dbRows as LookupBarcodeRow[]).length > 0) {
          const row = (dbRows as LookupBarcodeRow[])[0];
          if (row.energy_kcal_100g !== null) {
            const dbProduct: ScannedProduct = {
              barcode: normalizedBarcode,
              name: row.product_name ?? "Product " + normalizedBarcode,
              brand: row.brand ?? undefined,
              nutrition: {
                calories: row.energy_kcal_100g ?? 0,
                protein: row.proteins_100g ?? 0,
                carbs: row.carbohydrates_100g ?? 0,
                fat: row.fat_100g ?? 0,
                fiber: row.fiber_100g ?? 0,
                sugar: row.sugars_100g ?? undefined,
                sodium: row.sodium_100g ?? undefined,
                servingSize: 100,
                servingUnit: "g",
              },
              additionalInfo: {
                imageUrl: row.image_url ?? undefined,
              },
              healthScore: this.calculateHealthScore({
                calories: row.energy_kcal_100g ?? 0,
                protein: row.proteins_100g ?? undefined,
                fat: row.fat_100g ?? undefined,
                sugar: row.sugars_100g ?? undefined,
                sodium: row.sodium_100g ?? undefined,
                fiber: row.fiber_100g ?? undefined,
              }),
              confidence: row.confidence,
              source: row.source,
              lastScanned: new Date().toISOString(),
              nutriScore: row.nutriscore_grade ?? undefined,
              novaGroup: row.nova_group ?? undefined,
              isAIEstimated: false,
            };
            this.cacheProduct(normalizedBarcode, dbProduct);
            this.updateRecentScans(normalizedBarcode);
            return {
              success: true,
              product: dbProduct,
              confidence: row.confidence,
            };
          }
        }
      } catch (dbLookupError) {
        // Non-fatal: fall through to live API
        console.warn(
          "⚠️ DB barcode lookup failed, falling back to live API:",
          dbLookupError,
        );
      }

      // ─────────────────────────────────────────────────────────────
      // Step 1: Live API fallback (OFF v2 → UPCitemdb → USDA → Gemini)
      // ─────────────────────────────────────────────────────────────
      // India-first packaged-food lookup: use trusted barcode sources only.
      // When no reliable match exists, the UI should direct the user to label scan.
      const result = await this.nutritionAPI.searchByBarcode(normalizedBarcode);

      if (!result) {
        return {
          success: false,
          error: "Product not found in database",
          confidence: 0,
        };
      }

      // Map BarcodeSearchResult → ScannedProduct
      const nutrition = result.nutrition;
      const info = result.productInfo;

      const scannedProduct: ScannedProduct = {
        barcode: normalizedBarcode,
        name: info.name || `Product ${normalizedBarcode}`,
        brand: info.brand,
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
          ingredients: info.ingredients
            ? info.ingredients.split(",").map((i: string) => i.trim())
            : undefined,
          allergens: info.allergens,
          labels: info.labels,
          imageUrl: info.imageUrl,
        },
        healthScore: nutrition
          ? this.calculateHealthScore(nutrition)
          : undefined,
        confidence: result.confidence,
        source: result.source,
        lastScanned: new Date().toISOString(),
        nutriScore: info.nutriScore,
        novaGroup: info.novaGroup,
        isAIEstimated: result.isAIEstimated ?? false,
        gs1Country: info.gs1Country,
        needsNutritionEstimate: result.needsNutritionEstimate,
      };

      // Cache in memory
      this.cacheProduct(normalizedBarcode, scannedProduct);
      this.updateRecentScans(normalizedBarcode);

      // Persist to Supabase barcode_lookup_cache (7-day TTL) — fire and forget
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
          console.warn("⚠️ upsert_barcode_cache failed:", e),
        );

      return {
        success: true,
        product: scannedProduct,
        confidence: scannedProduct.confidence,
      };
    } catch (error) {
      console.error("❌ Product lookup error:", error);
      return {
        success: false,
        error: `Lookup failed: ${error}`,
        confidence: 0,
      };
    }
  }

  /**
   * Calculate health score based on nutrition data
   */
  private calculateHealthScore(nutrition: {
    calories: number;
    protein?: number;
    fat?: number;
    sugar?: number;
    sodium?: number;
    fiber?: number;
  }): number {
    let score = 100;

    // Penalize high calories (>400 per 100g)
    if (nutrition.calories > 400) {
      score -= Math.min(30, (nutrition.calories - 400) / 10);
    }

    // Penalize high fat (>20g per 100g)
    if (nutrition.fat && nutrition.fat > 20) {
      score -= Math.min(20, (nutrition.fat - 20) * 2);
    }

    // Penalize high sugar (>15g per 100g)
    if (nutrition.sugar && nutrition.sugar > 15) {
      score -= Math.min(25, (nutrition.sugar - 15) * 1.5);
    }

    // Penalize high sodium (>1.5g per 100g)
    if (nutrition.sodium && nutrition.sodium > 1.5) {
      score -= Math.min(20, (nutrition.sodium - 1.5) * 10);
    }

    // Reward high protein (>10g per 100g)
    if (nutrition.protein && nutrition.protein > 10) {
      score += Math.min(15, (nutrition.protein - 10) * 0.5);
    }

    // Reward high fiber (>5g per 100g)
    if (nutrition.fiber && nutrition.fiber > 5) {
      score += Math.min(10, (nutrition.fiber - 5) * 1);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Barcode format validation helpers
   */
  private isUPCA(barcode: string): boolean {
    return /^[0-9]{12}$/.test(barcode);
  }

  private isEAN13(barcode: string): boolean {
    return /^[0-9]{13}$/.test(barcode);
  }

  private isEAN8(barcode: string): boolean {
    return /^[0-9]{8}$/.test(barcode);
  }

  private isQRCode(barcode: string): boolean {
    // QR codes can contain various formats, so we're more permissive
    return barcode.length >= 3 && barcode.length <= 4296; // QR code max capacity
  }

  /**
   * Cache management
   */
  private cacheProduct(barcode: string, product: ScannedProduct): void {
    // Remove oldest entries if cache is full
    if (this.scanCache.size >= this.maxCacheSize) {
      const oldestBarcode = this.scanCache.keys().next().value;
      if (oldestBarcode) {
        this.scanCache.delete(oldestBarcode);
      }
    }

    this.scanCache.set(barcode, product);
  }

  private updateRecentScans(barcode: string): void {
    // Remove if already exists
    this.recentScans = this.recentScans.filter((b) => b !== barcode);

    // Add to beginning
    this.recentScans.unshift(barcode);

    // Trim to max size
    if (this.recentScans.length > this.maxRecentScans) {
      this.recentScans = this.recentScans.slice(0, this.maxRecentScans);
    }
  }

  /**
   * Get recent scans
   */
  getRecentScans(): ScannedProduct[] {
    return this.recentScans
      .map((barcode) => this.scanCache.get(barcode))
      .filter((product): product is ScannedProduct => product !== undefined);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.scanCache.clear();
    this.recentScans = [];
  }

  /**
   * Get cache statistics
   */
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

// Singleton instance
export const barcodeService = new BarcodeService();
export default barcodeService;
