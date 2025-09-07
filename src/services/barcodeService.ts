/**
 * Comprehensive Barcode Scanning and Product Lookup Service
 * Integrates camera scanning with nutrition database lookup
 */

import { FreeNutritionAPIs } from './freeNutritionAPIs';

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
          format: 'unknown',
          error: 'Empty barcode'
        };
      }

      // Check for common barcode formats
      if (this.isUPCA(cleanBarcode)) {
        return { isValid: true, format: 'UPC-A' };
      }
      
      if (this.isEAN13(cleanBarcode)) {
        return { isValid: true, format: 'EAN-13' };
      }
      
      if (this.isEAN8(cleanBarcode)) {
        return { isValid: true, format: 'EAN-8' };
      }

      if (this.isQRCode(cleanBarcode)) {
        return { isValid: true, format: 'QR Code' };
      }

      // If we can't identify the format but it contains only digits/alphanumeric
      if (/^[0-9A-Za-z\-_]+$/.test(cleanBarcode)) {
        return { isValid: true, format: 'Generic' };
      }

      return {
        isValid: false,
        format: 'unknown',
        error: 'Invalid barcode format'
      };
    } catch (error) {
      return {
        isValid: false,
        format: 'unknown',
        error: `Validation error: ${error}`
      };
    }
  }

  /**
   * Main barcode lookup function - integrates with existing nutrition API
   */
  async lookupProduct(barcode: string): Promise<ProductLookupResult> {
    try {
      console.log(`🔍 Looking up product with barcode: ${barcode}`);

      // Validate barcode first
      const validation = this.validateBarcode(barcode);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error || 'Invalid barcode',
          confidence: 0
        };
      }

      // Check cache first
      const cachedProduct = this.scanCache.get(barcode);
      if (cachedProduct) {
        console.log('✅ Found cached product:', cachedProduct.name);
        this.updateRecentScans(barcode);
        return {
          success: true,
          product: cachedProduct,
          confidence: cachedProduct.confidence
        };
      }

      // Use existing nutrition API for lookup
      const nutritionData = await this.nutritionAPI.searchByBarcode(barcode);

      if (!nutritionData) {
        return {
          success: false,
          error: 'Product not found in database',
          confidence: 0
        };
      }

      // Get additional product info from OpenFoodFacts
      const productDetails = await this.fetchProductDetails(barcode);

      // Create comprehensive product object
      const scannedProduct: ScannedProduct = {
        barcode,
        name: productDetails?.name || `Product ${barcode}`,
        brand: productDetails?.brand,
        category: productDetails?.category,
        nutrition: {
          calories: nutritionData.calories,
          protein: nutritionData.protein,
          carbs: nutritionData.carbs,
          fat: nutritionData.fat,
          fiber: nutritionData.fiber,
          sugar: nutritionData.sugar,
          sodium: nutritionData.sodium,
          servingSize: 100, // Default to 100g
          servingUnit: 'g'
        },
        additionalInfo: {
          ingredients: productDetails?.ingredients,
          allergens: productDetails?.allergens,
          labels: productDetails?.labels,
          imageUrl: productDetails?.imageUrl
        },
        healthScore: this.calculateHealthScore(nutritionData),
        confidence: nutritionData.confidence,
        source: nutritionData.source,
        lastScanned: new Date().toISOString()
      };

      // Cache the result
      this.cacheProduct(barcode, scannedProduct);
      this.updateRecentScans(barcode);

      console.log(`✅ Product lookup successful: ${scannedProduct.name} (Health Score: ${scannedProduct.healthScore}/100)`);

      return {
        success: true,
        product: scannedProduct,
        confidence: scannedProduct.confidence
      };

    } catch (error) {
      console.error('❌ Product lookup error:', error);
      return {
        success: false,
        error: `Lookup failed: ${error}`,
        confidence: 0
      };
    }
  }

  /**
   * Fetch additional product details from OpenFoodFacts
   */
  private async fetchProductDetails(barcode: string): Promise<{
    name?: string;
    brand?: string;
    category?: string;
    ingredients?: string[];
    allergens?: string[];
    labels?: string[];
    imageUrl?: string;
  } | null> {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const product = data.product;

      if (!product) {
        return null;
      }

      return {
        name: product.product_name || product.product_name_en,
        brand: product.brands,
        category: product.categories,
        ingredients: product.ingredients_text ? 
          product.ingredients_text.split(',').map((i: string) => i.trim()) : 
          undefined,
        allergens: product.allergens_tags?.map((tag: string) => 
          tag.replace('en:', '').replace(/-/g, ' ')
        ),
        labels: product.labels_tags?.map((tag: string) => 
          tag.replace('en:', '').replace(/-/g, ' ')
        ),
        imageUrl: product.image_front_url || product.image_url
      };
    } catch (error) {
      console.warn('Failed to fetch product details:', error);
      return null;
    }
  }

  /**
   * Calculate health score based on nutrition data
   */
  private calculateHealthScore(nutrition: any): number {
    let score = 100;

    // Penalize high calories (>400 per 100g)
    if (nutrition.calories > 400) {
      score -= Math.min(30, (nutrition.calories - 400) / 10);
    }

    // Penalize high fat (>20g per 100g)
    if (nutrition.fat > 20) {
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
    if (nutrition.protein > 10) {
      score += Math.min(15, (nutrition.protein - 10) * 0.5);
    }

    // Reward high fiber (>5g per 100g)
    if (nutrition.fiber > 5) {
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
    this.recentScans = this.recentScans.filter(b => b !== barcode);
    
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
      .map(barcode => this.scanCache.get(barcode))
      .filter((product): product is ScannedProduct => product !== undefined);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.scanCache.clear();
    this.recentScans = [];
    console.log('🗑️ Barcode cache cleared');
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
      maxCacheSize: this.maxCacheSize
    };
  }
}

// Singleton instance
export const barcodeService = new BarcodeService();
export default barcodeService;