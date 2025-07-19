# FitAI - AI & External API Integration Guide

## Overview

This document covers the integration of AI services (primarily Google Gemini Flash 2.5) and external nutrition APIs for FitAI. The integration strategy focuses on cost optimization, accuracy improvement, and seamless user experience.

## AI Services Architecture

### Google Gemini Flash 2.5 Integration

#### Service Configuration

```typescript
// services/ai/geminiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '../config/configService';
import { CacheService } from '../cache/cacheService';
import { RateLimiter } from '../utils/rateLimiter';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private rateLimiter: RateLimiter;
  private cache: CacheService;

  constructor() {
    const apiKey = ConfigService.get('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3, // Lower for consistent nutrition analysis
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    this.rateLimiter = new RateLimiter({
      maxRequests: 1000,
      timeWindow: 3600000, // 1 hour
    });

    this.cache = new CacheService();
  }

  async analyzeFoodImage(
    imageUri: string,
    userContext: UserContext
  ): Promise<FoodAnalysisResult> {
    try {
      // Check rate limits
      await this.rateLimiter.checkLimit(userContext.userId);

      // Check cache first
      const cacheKey = await this.generateImageHash(imageUri);
      const cached = await this.cache.get(`food_analysis_${cacheKey}`);
      if (cached) {
        return cached;
      }

      // Prepare image for analysis
      const imageBase64 = await this.prepareImageForAI(imageUri);

      // Generate analysis prompt
      const prompt = this.buildFoodAnalysisPrompt(userContext);

      // Call Gemini API
      const startTime = performance.now();
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: 'image/jpeg',
          },
        },
      ]);

      const processingTime = performance.now() - startTime;

      // Parse and validate response
      const analysis = this.parseAndValidateResponse(result.response.text());

      // Enhance with external nutrition data
      const enhancedAnalysis = await this.enhanceWithNutritionAPIs(analysis);

      // Add metadata
      enhancedAnalysis.metadata = {
        processingTimeMs: processingTime,
        aiModel: 'gemini-2.5-flash',
        timestamp: new Date().toISOString(),
        userContext: userContext.userId,
      };

      // Cache result
      await this.cache.set(
        `food_analysis_${cacheKey}`,
        enhancedAnalysis,
        3600 // 1 hour cache
      );

      return enhancedAnalysis;
    } catch (error) {
      console.error('Food analysis failed:', error);
      throw new AIServiceError('Failed to analyze food image', error);
    }
  }

  private buildFoodAnalysisPrompt(userContext: UserContext): string {
    return `
      You are an expert nutritionist analyzing a food image. Provide accurate nutritional analysis.
      
      User Context:
      - Dietary preferences: ${userContext.dietaryType || 'None specified'}
      - Regional cuisine preference: ${userContext.regionalCuisine || 'Mixed'}
      - Known allergies: ${userContext.allergies?.join(', ') || 'None'}
      - Health goals: ${userContext.goals?.join(', ') || 'General health'}
      - Current diet plan: ${userContext.currentDietPlan ? 'Active' : 'None'}
      
      Instructions:
      1. Identify all visible food items with high confidence
      2. Estimate portion sizes using visual cues (plates, utensils, hands)
      3. Calculate nutritional values conservatively
      4. Consider cooking methods and hidden ingredients
      5. Provide cultural context for dishes
      6. Include actionable recommendations
      
      Return JSON with this exact structure:
      {
        "foods": [
          {
            "name": "specific food name",
            "estimatedQuantity": "amount with unit",
            "confidence": 0.85,
            "calories": 250,
            "macros": {
              "protein": 15,
              "carbohydrates": 30,
              "fats": 8,
              "fiber": 5,
              "sugar": 12,
              "sodium": 450
            },
            "micronutrients": {
              "vitaminA": 45,
              "vitaminC": 15,
              "iron": 2.5,
              "calcium": 120
            },
            "ingredients": ["visible or likely ingredients"],
            "preparationMethod": "cooking method",
            "portionContext": "description of portion size reference"
          }
        ],
        "totalNutrition": {
          "calories": 250,
          "macros": { "protein": 15, "carbohydrates": 30, "fats": 8, "fiber": 5 }
        },
        "analysis": {
          "overallConfidence": 0.85,
          "healthScore": 7.5,
          "recommendations": ["specific actionable advice"],
          "warnings": ["potential health concerns"],
          "mealBalance": "assessment of nutritional balance"
        },
        "culturalContext": {
          "cuisine": "cuisine type",
          "mealType": "breakfast/lunch/dinner/snack",
          "regionalVariations": ["regional preparation notes"],
          "traditionalPairings": ["typical accompaniments"]
        },
        "dietaryInfo": {
          "vegetarian": true,
          "vegan": false,
          "glutenFree": true,
          "allergens": ["potential allergens"],
          "dietCompatibility": ["keto", "paleo", etc]
        }
      }
      
      Critical Guidelines:
      - Err on the conservative side for calorie estimates
      - Account for cooking oils, ghee, and hidden fats
      - Consider portion distortion in photos
      - For Indian dishes, know regional preparation differences
      - If confidence is low, clearly indicate uncertainty
      - Provide specific portion size context (e.g., "compared to standard dinner plate")
    `;
  }

  async analyzeBodyPhotos(
    photos: BodyPhotos,
    previousAnalysis?: BodyAnalysis
  ): Promise<BodyAnalysisResult> {
    try {
      const prompt = this.buildBodyAnalysisPrompt(previousAnalysis);

      const imageParts = await Promise.all([
        photos.front ? this.prepareImageForAI(photos.front) : null,
        photos.side ? this.prepareImageForAI(photos.side) : null,
        photos.back ? this.prepareImageForAI(photos.back) : null,
      ]);

      const content = [
        prompt,
        ...imageParts.filter(Boolean).map((imageBase64, index) => ({
          inlineData: {
            data: imageBase64,
            mimeType: 'image/jpeg',
          },
        })),
      ];

      const result = await this.model.generateContent(content);
      const analysis = this.parseAndValidateResponse(result.response.text());

      return analysis;
    } catch (error) {
      console.error('Body analysis failed:', error);
      throw new AIServiceError('Failed to analyze body photos', error);
    }
  }

  private buildBodyAnalysisPrompt(previousAnalysis?: BodyAnalysis): string {
    return `
      You are a fitness expert analyzing body composition from photos.
      
      Available photos: front, side, and optionally back view
      Previous analysis: ${previousAnalysis ? 'Available for comparison' : 'First analysis'}
      
      Analyze and return JSON:
      {
        "bodyComposition": {
          "estimatedBodyFatPercentage": 15.5,
          "muscleDefinition": "low/moderate/high",
          "posture": "good/fair/needs_improvement",
          "bodyType": "ectomorph/mesomorph/endomorph",
          "proportions": "balanced/upper_heavy/lower_heavy"
        },
        "measurements": {
          "confidence": 0.7,
          "estimatedChanges": {
            "chest": "estimated change from photos",
            "waist": "estimated change from photos",
            "arms": "estimated change from photos"
          }
        },
        "progress": {
          "comparison": "${previousAnalysis ? 'detailed comparison' : 'baseline established'}",
          "improvements": ["observed positive changes"],
          "areasToFocus": ["areas needing attention"],
          "overallTrend": "improving/maintaining/declining"
        },
        "recommendations": {
          "workout": ["specific workout recommendations"],
          "nutrition": ["nutrition adjustment suggestions"],
          "lifestyle": ["lifestyle modification advice"]
        },
        "confidence": 0.75,
        "limitations": [
          "Photo-based analysis limitations",
          "Lighting and angle considerations",
          "Clothing impact on accuracy"
        ],
        "nextSteps": ["recommended actions for next analysis"]
      }
      
      Important:
      - Be conservative and honest about limitations
      - Focus on observable changes and trends
      - Provide actionable, specific recommendations
      - Consider photo quality and consistency
      - Emphasize progress over absolute measurements
    `;
  }

  async generateWorkoutPlan(
    userProfile: UserProfile,
    preferences: WorkoutPreferences
  ): Promise<WorkoutPlan> {
    try {
      const prompt = this.buildWorkoutGenerationPrompt(
        userProfile,
        preferences
      );

      const result = await this.model.generateContent(prompt);
      const workoutPlan = this.parseAndValidateResponse(result.response.text());

      // Validate exercises against our database
      const validatedPlan =
        await this.validateAndEnhanceWorkoutPlan(workoutPlan);

      return validatedPlan;
    } catch (error) {
      console.error('Workout generation failed:', error);
      throw new AIServiceError('Failed to generate workout plan', error);
    }
  }

  async generateDietPlan(
    userProfile: UserProfile,
    preferences: DietPreferences
  ): Promise<DietPlan> {
    try {
      const prompt = this.buildDietGenerationPrompt(userProfile, preferences);

      const result = await this.model.generateContent(prompt);
      const dietPlan = this.parseAndValidateResponse(result.response.text());

      // Enhance with accurate nutrition data
      const enhancedPlan =
        await this.enhanceDietPlanWithNutritionData(dietPlan);

      return enhancedPlan;
    } catch (error) {
      console.error('Diet generation failed:', error);
      throw new AIServiceError('Failed to generate diet plan', error);
    }
  }

  // Utility methods
  private async prepareImageForAI(imageUri: string): Promise<string> {
    // Compress and resize image for optimal AI processing
    const compressedUri = await ImageProcessor.compressForAI(imageUri, {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
    });

    return await FileService.convertToBase64(compressedUri);
  }

  private parseAndValidateResponse(responseText: string): any {
    try {
      const parsed = JSON.parse(responseText);

      // Validate required fields
      if (!this.validateResponseStructure(parsed)) {
        throw new Error('Invalid response structure from AI');
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', responseText);
      throw new Error('Invalid AI response format');
    }
  }

  private validateResponseStructure(response: any): boolean {
    // Implement validation logic based on expected response structure
    return true; // Simplified for now
  }
}
```

### External Nutrition APIs Integration

#### Multi-API Router Service

```typescript
// services/nutrition/nutritionApiRouter.ts
import { FatSecretAPI } from './providers/fatSecretAPI';
import { ApiNinjasAPI } from './providers/apiNinjasAPI';
import { USDAFoodDataAPI } from './providers/usdaFoodDataAPI';
import { BonHappeteeAPI } from './providers/bonHappeteeAPI';
import { IndianFoodDatabaseAPI } from './providers/indianFoodDatabaseAPI';
import { NutritionCache } from './cache/nutritionCache';
import { ApiHealthMonitor } from './monitoring/apiHealthMonitor';

interface NutritionQuery {
  foodName: string;
  quantity?: string;
  brandName?: string;
  barcode?: string;
  cuisineType?: string;
}

interface NutritionResult {
  food: {
    name: string;
    brand?: string;
    servingSize: string;
    calories: number;
    macros: {
      protein: number;
      carbohydrates: number;
      fats: number;
      fiber: number;
      sugar: number;
      sodium: number;
    };
    micronutrients?: Record<string, number>;
  };
  confidence: number;
  source: string;
  timestamp: string;
}

export class NutritionApiRouter {
  private apis: Record<string, any>;
  private cache: NutritionCache;
  private healthMonitor: ApiHealthMonitor;

  constructor() {
    this.apis = {
      fatSecret: new FatSecretAPI(),
      apiNinjas: new ApiNinjasAPI(),
      usda: new USDAFoodDataAPI(),
      bonHappetee: new BonHappeteeAPI(),
      indianDB: new IndianFoodDatabaseAPI(),
    };

    this.cache = new NutritionCache();
    this.healthMonitor = new ApiHealthMonitor();
  }

  async getNutritionData(
    query: NutritionQuery
  ): Promise<NutritionResult | null> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(query);

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Determine API priority order
    const apiOrder = this.determineApiPriority(query);

    // Try APIs in order
    for (const apiName of apiOrder) {
      try {
        const api = this.apis[apiName];

        // Check API health
        if (!(await this.healthMonitor.isHealthy(apiName))) {
          console.warn(`${apiName} is unhealthy, skipping`);
          continue;
        }

        const result = await this.callApiWithTimeout(api, query, 10000); // 10s timeout

        if (result && this.validateNutritionResult(result)) {
          // Cache successful result
          await this.cache.set(cacheKey, result, this.getCacheTTL(apiName));

          // Update API health metrics
          this.healthMonitor.recordSuccess(apiName);

          return result;
        }
      } catch (error) {
        console.warn(`${apiName} failed for query:`, query, error.message);
        this.healthMonitor.recordFailure(apiName, error);
        continue;
      }
    }

    console.warn('All nutrition APIs failed for query:', query);
    return null;
  }

  private determineApiPriority(query: NutritionQuery): string[] {
    const { foodName, cuisineType } = query;

    // Indian food keywords
    const indianKeywords = [
      'dal',
      'curry',
      'biryani',
      'roti',
      'sabzi',
      'samosa',
      'dosa',
      'idli',
      'chapati',
      'paratha',
      'rajma',
      'chole',
      'paneer',
      'masala',
      'tadka',
    ];

    // Check if it's likely Indian food
    const isIndianFood =
      indianKeywords.some(keyword =>
        foodName.toLowerCase().includes(keyword)
      ) || cuisineType?.toLowerCase().includes('indian');

    // Branded food indicators
    const hasBrandIndicators = query.brandName || query.barcode;

    if (isIndianFood) {
      return ['bonHappetee', 'indianDB', 'fatSecret', 'apiNinjas', 'usda'];
    } else if (hasBrandIndicators) {
      return ['fatSecret', 'usda', 'apiNinjas', 'bonHappetee', 'indianDB'];
    } else {
      return ['fatSecret', 'apiNinjas', 'usda', 'bonHappetee', 'indianDB'];
    }
  }

  private async callApiWithTimeout(
    api: any,
    query: NutritionQuery,
    timeout: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('API timeout'));
      }, timeout);

      api
        .search(query)
        .then((result: any) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error: Error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private validateNutritionResult(result: any): boolean {
    return (
      result &&
      result.food &&
      typeof result.food.calories === 'number' &&
      result.food.calories >= 0 &&
      result.confidence > 0.5
    );
  }

  private generateCacheKey(query: NutritionQuery): string {
    const normalized = {
      foodName: query.foodName.toLowerCase().trim(),
      quantity: query.quantity || '100g',
      brand: query.brandName?.toLowerCase().trim(),
    };

    return `nutrition_${btoa(JSON.stringify(normalized))}`;
  }

  private isCacheValid(cached: any): boolean {
    const age = Date.now() - new Date(cached.timestamp).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return age < maxAge;
  }

  private getCacheTTL(apiName: string): number {
    // Cache times based on API reliability and update frequency
    const ttls = {
      fatSecret: 86400, // 24 hours
      apiNinjas: 43200, // 12 hours
      usda: 604800, // 7 days (very stable data)
      bonHappetee: 86400, // 24 hours
      indianDB: 604800, // 7 days (static database)
    };

    return ttls[apiName] || 43200;
  }
}
```

#### FatSecret API Implementation

```typescript
// services/nutrition/providers/fatSecretAPI.ts
import { BaseNutritionAPI } from './baseNutritionAPI';
import { RateLimiter } from '../../utils/rateLimiter';

export class FatSecretAPI extends BaseNutritionAPI {
  private rateLimiter: RateLimiter;
  private baseUrl = 'https://platform.fatsecret.com/rest/server.api';

  constructor() {
    super();
    this.rateLimiter = new RateLimiter({
      maxRequests: 5000, // Free tier limit
      timeWindow: 86400000, // 24 hours
    });
  }

  async search(query: NutritionQuery): Promise<NutritionResult | null> {
    try {
      await this.rateLimiter.checkLimit('fatsecret');

      // Search for food
      const searchResults = await this.searchFoods(query.foodName);

      if (!searchResults || searchResults.length === 0) {
        return null;
      }

      // Get detailed nutrition for best match
      const bestMatch = this.findBestMatch(searchResults, query);
      const nutrition = await this.getFoodNutrition(bestMatch.food_id);

      return this.formatResult(nutrition, query);
    } catch (error) {
      console.error('FatSecret API error:', error);
      return null;
    }
  }

  private async searchFoods(foodName: string): Promise<any[]> {
    const params = new URLSearchParams({
      method: 'foods.search',
      search_expression: foodName,
      format: 'json',
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_FATSECRET_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`FatSecret search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.foods?.food || [];
  }

  private async getFoodNutrition(foodId: string): Promise<any> {
    const params = new URLSearchParams({
      method: 'food.get',
      food_id: foodId,
      format: 'json',
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_FATSECRET_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`FatSecret nutrition failed: ${response.status}`);
    }

    return await response.json();
  }

  private findBestMatch(results: any[], query: NutritionQuery): any {
    // Simple matching algorithm - can be enhanced
    const searchTerms = query.foodName.toLowerCase().split(' ');

    return results.reduce((best, current) => {
      const currentName = current.food_name.toLowerCase();
      const currentScore = searchTerms.reduce((score, term) => {
        return score + (currentName.includes(term) ? 1 : 0);
      }, 0);

      const bestName = best.food_name?.toLowerCase() || '';
      const bestScore = searchTerms.reduce((score, term) => {
        return score + (bestName.includes(term) ? 1 : 0);
      }, 0);

      return currentScore > bestScore ? current : best;
    }, results[0]);
  }

  private formatResult(nutrition: any, query: NutritionQuery): NutritionResult {
    const servings = nutrition.food.servings.serving;
    const serving = Array.isArray(servings) ? servings[0] : servings;

    return {
      food: {
        name: nutrition.food.food_name,
        brand: nutrition.food.brand_name,
        servingSize: `${serving.serving_description}`,
        calories: parseFloat(serving.calories),
        macros: {
          protein: parseFloat(serving.protein || 0),
          carbohydrates: parseFloat(serving.carbohydrate || 0),
          fats: parseFloat(serving.fat || 0),
          fiber: parseFloat(serving.fiber || 0),
          sugar: parseFloat(serving.sugar || 0),
          sodium: parseFloat(serving.sodium || 0),
        },
      },
      confidence: 0.85, // FatSecret is generally reliable
      source: 'fatsecret',
      timestamp: new Date().toISOString(),
    };
  }
}
```

#### API Ninjas Implementation

```typescript
// services/nutrition/providers/apiNinjasAPI.ts
import { BaseNutritionAPI } from './baseNutritionAPI';

export class ApiNinjasAPI extends BaseNutritionAPI {
  private apiKey: string;
  private baseUrl = 'https://api.api-ninjas.com/v1/nutrition';

  constructor() {
    super();
    this.apiKey = process.env.EXPO_PUBLIC_API_NINJAS_KEY!;
  }

  async search(query: NutritionQuery): Promise<NutritionResult | null> {
    try {
      const searchQuery = this.buildSearchQuery(query);

      const response = await fetch(
        `${this.baseUrl}?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'X-Api-Key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API Ninjas failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return null;
      }

      return this.formatResult(data[0], query);
    } catch (error) {
      console.error('API Ninjas error:', error);
      return null;
    }
  }

  private buildSearchQuery(query: NutritionQuery): string {
    let searchQuery = query.foodName;

    if (query.quantity) {
      searchQuery = `${query.quantity} ${searchQuery}`;
    }

    return searchQuery;
  }

  private formatResult(nutrition: any, query: NutritionQuery): NutritionResult {
    return {
      food: {
        name: nutrition.name,
        servingSize: `${nutrition.serving_size_g}g`,
        calories: nutrition.calories,
        macros: {
          protein: nutrition.protein_g,
          carbohydrates: nutrition.carbohydrates_total_g,
          fats: nutrition.fat_total_g,
          fiber: nutrition.fiber_g,
          sugar: nutrition.sugar_g,
          sodium: nutrition.sodium_mg,
        },
      },
      confidence: 0.8, // Good accuracy with natural language processing
      source: 'api_ninjas',
      timestamp: new Date().toISOString(),
    };
  }
}
```

#### Indian Food Database API

```typescript
// services/nutrition/providers/indianFoodDatabaseAPI.ts
import { BaseNutritionAPI } from './baseNutritionAPI';
import { supabase } from '../../../config/supabase';

export class IndianFoodDatabaseAPI extends BaseNutritionAPI {
  async search(query: NutritionQuery): Promise<NutritionResult | null> {
    try {
      // Search in local Indian food database
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .ilike('name', `%${query.foodName}%`)
        .eq('cuisine_type', 'indian')
        .eq('is_active', true)
        .order('search_count', { ascending: false })
        .limit(5);

      if (error || !data || data.length === 0) {
        return null;
      }

      const bestMatch = this.findBestMatch(data, query);
      return this.formatResult(bestMatch, query);
    } catch (error) {
      console.error('Indian Food DB error:', error);
      return null;
    }
  }

  private findBestMatch(results: any[], query: NutritionQuery): any {
    // Implement fuzzy matching for Indian food names
    const searchTerms = query.foodName.toLowerCase().split(' ');

    return results.reduce((best, current) => {
      const currentName = current.name.toLowerCase();
      const currentScore = this.calculateMatchScore(currentName, searchTerms);

      const bestName = best.name?.toLowerCase() || '';
      const bestScore = this.calculateMatchScore(bestName, searchTerms);

      return currentScore > bestScore ? current : best;
    }, results[0]);
  }

  private calculateMatchScore(name: string, searchTerms: string[]): number {
    let score = 0;

    searchTerms.forEach(term => {
      if (name.includes(term)) {
        score += term.length; // Longer matching terms get higher scores
      }
    });

    return score;
  }

  private formatResult(food: any, query: NutritionQuery): NutritionResult {
    const quantity = this.parseQuantity(query.quantity || '100g');
    const multiplier = quantity / 100; // Database values are per 100g

    return {
      food: {
        name: food.name,
        servingSize: query.quantity || '100g',
        calories: Math.round(food.calories_per_100g * multiplier),
        macros: {
          protein: Math.round(food.protein_g * multiplier * 10) / 10,
          carbohydrates:
            Math.round(food.carbohydrates_g * multiplier * 10) / 10,
          fats: Math.round(food.fats_g * multiplier * 10) / 10,
          fiber: Math.round(food.fiber_g * multiplier * 10) / 10,
          sugar: Math.round(food.sugar_g * multiplier * 10) / 10,
          sodium: Math.round(food.sodium_mg * multiplier),
        },
        micronutrients: food.micronutrients
          ? this.scaleNutrients(food.micronutrients, multiplier)
          : undefined,
      },
      confidence: 0.9, // High confidence for verified local data
      source: 'indian_food_db',
      timestamp: new Date().toISOString(),
    };
  }

  private parseQuantity(quantityStr: string): number {
    // Parse quantity strings like "1 cup", "150g", "2 pieces"
    const match = quantityStr.match(/(\d+(?:\.\d+)?)\s*(\w+)/);

    if (!match) return 100; // Default to 100g

    const [, amount, unit] = match;
    const numAmount = parseFloat(amount);

    // Convert common units to grams (approximate)
    const unitConversions = {
      g: 1,
      kg: 1000,
      cup: 240, // Varies by food, but rough average
      piece: 50, // Very rough estimate
      slice: 30,
      tbsp: 15,
      tsp: 5,
    };

    const conversion = unitConversions[unit.toLowerCase()] || 100;
    return numAmount * conversion;
  }

  private scaleNutrients(
    nutrients: Record<string, number>,
    multiplier: number
  ): Record<string, number> {
    const scaled: Record<string, number> = {};

    for (const [key, value] of Object.entries(nutrients)) {
      scaled[key] = Math.round(value * multiplier * 10) / 10;
    }

    return scaled;
  }
}
```

### AI Enhancement Service

```typescript
// services/ai/aiEnhancementService.ts
import { GeminiService } from './geminiService';
import { NutritionApiRouter } from '../nutrition/nutritionApiRouter';

export class AIEnhancementService {
  private gemini: GeminiService;
  private nutritionRouter: NutritionApiRouter;

  constructor() {
    this.gemini = new GeminiService();
    this.nutritionRouter = new NutritionApiRouter();
  }

  async enhanceFoodAnalysis(
    initialAnalysis: any,
    userContext: UserContext
  ): Promise<EnhancedFoodAnalysis> {
    try {
      const enhancedFoods = await Promise.all(
        initialAnalysis.foods.map(async (food: any) => {
          // Get more accurate nutrition data from APIs
          const nutritionData = await this.nutritionRouter.getNutritionData({
            foodName: food.name,
            quantity: food.estimatedQuantity,
            cuisineType: initialAnalysis.culturalContext?.cuisine,
          });

          if (nutritionData) {
            // Merge AI analysis with API data, giving preference to API accuracy
            return {
              ...food,
              calories: nutritionData.food.calories,
              macros: nutritionData.food.macros,
              micronutrients: {
                ...food.micronutrients,
                ...nutritionData.food.micronutrients,
              },
              dataSource: 'hybrid_ai_api',
              confidence: Math.min(food.confidence + 0.1, 0.95), // Boost confidence
            };
          }

          return food; // Keep original if no API data found
        })
      );

      // Recalculate totals
      const totalNutrition = this.calculateTotalNutrition(enhancedFoods);

      // Generate personalized recommendations
      const personalizedRecommendations =
        await this.generatePersonalizedRecommendations(
          enhancedFoods,
          totalNutrition,
          userContext
        );

      return {
        ...initialAnalysis,
        foods: enhancedFoods,
        totalNutrition,
        analysis: {
          ...initialAnalysis.analysis,
          recommendations: personalizedRecommendations,
        },
        enhancementMetadata: {
          enhancedAt: new Date().toISOString(),
          apiDataSources: enhancedFoods.map(f => f.dataSource).filter(Boolean),
          confidenceImprovement: this.calculateConfidenceImprovement(
            initialAnalysis.foods,
            enhancedFoods
          ),
        },
      };
    } catch (error) {
      console.error('Enhancement failed:', error);
      return initialAnalysis; // Return original if enhancement fails
    }
  }

  private async generatePersonalizedRecommendations(
    foods: any[],
    totalNutrition: any,
    userContext: UserContext
  ): Promise<string[]> {
    try {
      const prompt = `
        Based on this meal analysis and user context, provide personalized recommendations:
        
        Meal: ${foods.map(f => `${f.name} (${f.calories} cal)`).join(', ')}
        Total: ${totalNutrition.calories} calories
        
        User Context:
        - Goals: ${userContext.goals?.join(', ')}
        - Dietary preferences: ${userContext.dietaryType}
        - Current diet plan target: ${userContext.dailyCalorieTarget} calories
        - Meal type: ${userContext.currentMealType}
        - Time of day: ${new Date().toLocaleTimeString()}
        
        Provide 3-5 specific, actionable recommendations as a JSON array of strings.
        Focus on:
        1. Nutritional balance for this meal
        2. Alignment with user goals
        3. Timing considerations
        4. Portion adjustments if needed
        5. Complementary foods to add/remove
      `;

      const result = await this.gemini.model.generateContent(prompt);
      const recommendations = JSON.parse(result.response.text());

      return Array.isArray(recommendations) ? recommendations : [];
    } catch (error) {
      console.error('Failed to generate personalized recommendations:', error);
      return [
        'Consider adding more vegetables to balance your meal',
        'Stay hydrated with water throughout the day',
        'Monitor portion sizes to align with your goals',
      ];
    }
  }

  private calculateTotalNutrition(foods: any[]): any {
    return foods.reduce(
      (total, food) => ({
        calories: total.calories + (food.calories || 0),
        macros: {
          protein: total.macros.protein + (food.macros?.protein || 0),
          carbohydrates:
            total.macros.carbohydrates + (food.macros?.carbohydrates || 0),
          fats: total.macros.fats + (food.macros?.fats || 0),
          fiber: total.macros.fiber + (food.macros?.fiber || 0),
          sugar: total.macros.sugar + (food.macros?.sugar || 0),
          sodium: total.macros.sodium + (food.macros?.sodium || 0),
        },
      }),
      {
        calories: 0,
        macros: {
          protein: 0,
          carbohydrates: 0,
          fats: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        },
      }
    );
  }

  private calculateConfidenceImprovement(
    originalFoods: any[],
    enhancedFoods: any[]
  ): number {
    const originalAvg =
      originalFoods.reduce((sum, f) => sum + f.confidence, 0) /
      originalFoods.length;
    const enhancedAvg =
      enhancedFoods.reduce((sum, f) => sum + f.confidence, 0) /
      enhancedFoods.length;

    return Math.round((enhancedAvg - originalAvg) * 100) / 100;
  }
}
```

### Error Handling & Resilience

```typescript
// services/ai/errorHandling.ts
export class AIServiceError extends Error {
  constructor(
    message: string,
    public originalError?: Error,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class APIRetryService {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }

        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private static isRetryableError(error: any): boolean {
    // Network errors, timeouts, rate limits are retryable
    return (
      error.name === 'NetworkError' ||
      error.message?.includes('timeout') ||
      error.status === 429 || // Rate limit
      error.status === 503 || // Service unavailable
      error.status === 502 // Bad gateway
    );
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Performance Monitoring

```typescript
// services/monitoring/performanceMonitor.ts
export class AIPerformanceMonitor {
  private metrics: Map<string, any[]> = new Map();

  recordOperation(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any
  ) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    this.metrics.get(operation)!.push({
      timestamp: Date.now(),
      duration,
      success,
      metadata,
    });

    // Keep only last 100 records per operation
    const records = this.metrics.get(operation)!;
    if (records.length > 100) {
      records.splice(0, records.length - 100);
    }
  }

  getMetrics(operation: string) {
    const records = this.metrics.get(operation) || [];

    if (records.length === 0) {
      return null;
    }

    const successful = records.filter(r => r.success);
    const failed = records.filter(r => !r.success);

    return {
      totalRequests: records.length,
      successRate: successful.length / records.length,
      averageDuration:
        successful.reduce((sum, r) => sum + r.duration, 0) / successful.length,
      p95Duration: this.calculatePercentile(
        successful.map(r => r.duration),
        0.95
      ),
      recentFailures: failed.slice(-5),
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }
}
```

This comprehensive API integration guide provides a robust, scalable, and cost-effective approach to integrating AI services and external nutrition APIs in the FitAI application. The multi-layered approach ensures high accuracy while maintaining optimal performance and user experience.
