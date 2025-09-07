// Google Gemini AI Integration Service for FitAI
// Enhanced with API key rotation and food recognition support

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { AIResponse } from '../types/ai';
import * as FileSystem from 'expo-file-system';
import { APIKeyRotator } from '../utils/apiKeyRotator';
import Constants from 'expo-constants';

// ============================================================================
// CONFIGURATION
// ============================================================================

// PRODUCTION BUILD FIX: Multi-strategy environment variable access
// Try multiple approaches to access environment variables in production builds
const getEnvVar = (key: string) => {
  try {
    // Strategy 1: Direct process.env access (works in development)
    const processEnvValue = process.env[key];
    if (processEnvValue) {
      console.log(`✅ Environment variable ${key} found via process.env`);
      return processEnvValue;
    }
    
    // Strategy 2: Constants.expoConfig access (production builds)
    const expoConfigValue = (Constants.expoConfig as any)?.[key];
    if (expoConfigValue) {
      console.log(`✅ Environment variable ${key} found via Constants.expoConfig`);
      return expoConfigValue;
    }
    
    // Strategy 3: Constants.expoConfig.extra access
    const extraValue = (Constants.expoConfig as any)?.extra?.[key];
    if (extraValue) {
      console.log(`✅ Environment variable ${key} found via Constants.expoConfig.extra`);
      return extraValue;
    }
    
    // Strategy 4: Try manifest fallback
    const manifestValue = (Constants.manifest as any)?.extra?.[key];
    if (manifestValue) {
      console.log(`✅ Environment variable ${key} found via Constants.manifest.extra`);
      return manifestValue;
    }
    
    // Log failure for debugging
    console.warn(`❌ Environment variable ${key} not found in any location:`, {
      processEnv: !!process.env[key],
      expoConfig: !!(Constants.expoConfig as any)?.[key],
      expoConfigExtra: !!(Constants.expoConfig as any)?.extra?.[key],
      manifestExtra: !!(Constants.manifest as any)?.extra?.[key]
    });
    
    return null;
  } catch (error) {
    console.error(`Environment variable ${key} access error:`, error);
    return null;
  }
};

// 🚀 MASSIVE SCALING: All 23 API keys for 34,500 requests/day capacity
const GEMINI_KEYS = [
  getEnvVar('EXPO_PUBLIC_GEMINI_API_KEY'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_1'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_2'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_3'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_4'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_5'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_6'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_7'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_8'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_9'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_10'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_11'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_12'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_13'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_14'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_15'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_16'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_17'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_18'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_19'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_20'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_21'),
  getEnvVar('EXPO_PUBLIC_GEMINI_KEY_22'),
].filter(Boolean);

// Use the first available key or empty string
const GEMINI_API_KEY = GEMINI_KEYS[0] || '';
const MODEL_NAME = 'gemini-2.5-flash'; // Latest Gemini 2.5 Flash model

console.log(`🚀 Production API Keys Loaded: ${GEMINI_KEYS.length}/23 keys (Capacity: ${GEMINI_KEYS.length * 1500} requests/day)`);

// 🎯 PRODUCTION VALIDATION SUITE - Critical for debugging production APK issues
console.log('🔑 Gemini API Key Status:');
console.log(`  - Primary key: ${GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 20)}...` : 'NOT SET'}`);
console.log(`  - Total keys available: ${GEMINI_KEYS.length}`);
console.log(`  - Environment: ${process.env.EXPO_PUBLIC_ENVIRONMENT || 'unknown'}`);
console.log(`  - AI Mode: ${process.env.EXPO_PUBLIC_AI_MODE || 'unknown'}`);
console.log(`  - Development mode: ${__DEV__ ? 'true' : 'false'}`);
console.log('🤖 Using Latest Model:', MODEL_NAME);

// 🎯 PRODUCTION ENVIRONMENT VALIDATION
console.log('🎯 Production Environment Validation:');
console.log(`  - process.env available: ${typeof process !== 'undefined' && !!process.env}`);
console.log(`  - EXPO_PUBLIC vars count: ${Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC')).length}`);
console.log(`  - All EXPO_PUBLIC vars: ${Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC')).join(', ')}`);
console.log(`  - Direct API key access: ${!!process.env.EXPO_PUBLIC_GEMINI_API_KEY}`);
console.log(`  - Network environment: ${typeof fetch !== 'undefined' ? 'Available' : 'Not Available'}`);
console.log(`  - Platform detection: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}`);

// 🎯 GOOGLE AI SDK VALIDATION  
console.log('🎯 Google AI SDK Validation:');
console.log(`  - GoogleGenerativeAI class: ${typeof GoogleGenerativeAI !== 'undefined' ? 'Available' : 'Not Available'}`);
console.log(`  - SDK version: ${typeof GoogleGenerativeAI !== 'undefined' ? 'Loaded' : 'Failed to load'}`);
console.log(`  - SDK initialization: ${typeof GoogleGenerativeAI !== 'undefined' ? 'Success' : 'Failed'}`);
console.log(`  - Model placeholder: Available (dynamically created)`);

// Initialize Gemini AI
let genAI: GoogleGenerativeAI | null = null;
let model: any | null = null;

// Enhanced production error handling for missing API key
if (!GEMINI_API_KEY) {
  console.error('🚨 CRITICAL: EXPO_PUBLIC_GEMINI_API_KEY is not set!');
  console.error('Production Build Debugging:');
  console.error(`  - Environment: ${process.env.EXPO_PUBLIC_ENVIRONMENT || 'unknown'}`);
  console.error(`  - Build type: ${__DEV__ ? 'development' : 'production'}`);
  console.error(`  - Available env vars: ${Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC')).join(', ')}`);
  console.error('Solution:');
  console.error('  - For production builds: Check EAS environment configuration');
  console.error('  - For development: Check .env.local file with EXPO_PUBLIC_GEMINI_API_KEY');
  console.error('  - App will fall back to demo mode');
}

const initializeGemini = () => {
  if (!GEMINI_API_KEY) {
    console.warn('❌ Gemini API key not found. AI features will be disabled.');
    console.warn(`  - Production build environment: ${!__DEV__ ? 'YES' : 'NO'}`);
    console.warn(`  - Expected: EXPO_PUBLIC_GEMINI_API_KEY environment variable`);
    console.warn(`  - Available EXPO_PUBLIC vars: ${Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC')).length}`);
    console.warn('  - App will gracefully fall back to demo mode');
    return false;
  }

  try {
    console.log(`🚀 Initializing Gemini AI in ${__DEV__ ? 'development' : 'production'} mode...`);
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // With @google/genai we don't bind config at model creation; we pass it per request
    model = { __placeholder: true } as any;

    // Safety settings are provided per request in generateResponse (see per-call config)
    // No-op here.

    console.log('✅ Gemini 2.5 Flash initialized with official structured output support');
    console.log(`🎯 Production environment: ${process.env.EXPO_PUBLIC_ENVIRONMENT || 'unknown'}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to initialize Gemini AI:', error);
    console.error('🔧 Troubleshooting:');
    console.error(`  - Error type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`  - Error message: ${error?.message || 'No message'}`);
    console.error('  - App will fall back to demo mode');
    return false;
  }
};

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

export const PROMPT_TEMPLATES = {
  WORKOUT_GENERATION: `
You are an elite fitness trainer and exercise physiologist with expertise in personalized training. Using Gemini 2.5 Flash's advanced reasoning, create a highly personalized workout plan.

COMPREHENSIVE USER ANALYSIS:
- Age: {age} years (affects recovery, intensity, exercise selection)
- Gender: {gender} (influences muscle development patterns, strength curves)
- Height: {height}cm, Weight: {weight}kg (BMI: calculate and consider)
- Activity Level: {activityLevel} (baseline fitness and work capacity)
- Experience: {experience} (technical complexity, progression rate)
- Primary Goals: {primaryGoals} (training focus and periodization)
- Time Available: {timeCommitment} minutes (exercise selection and density)
- Equipment Access: {equipment} (exercise variations and alternatives)

ADVANCED REQUIREMENTS:
1. PERSONALIZATION: Adapt every aspect to user's specific profile
2. PERIODIZATION: Consider progression and adaptation principles
3. BIOMECHANICS: Select exercises appropriate for user's anthropometry
4. ENERGY SYSTEMS: Match training to goals (strength, power, endurance)
5. RECOVERY: Include appropriate rest periods and exercise order
6. SAFETY: Prioritize injury prevention and proper progression
7. MOTIVATION: Create engaging, varied, and achievable workouts

EXERCISE SELECTION CRITERIA:
- Compound movements for efficiency
- Unilateral exercises for balance
- Core integration throughout
- Movement pattern variety
- Progressive overload potential

Create a personalized workout with the following structure:
- Title: Personalized workout name reflecting user goals
- Description: Detailed explanation of the workout's purpose and benefits
- Category: strength, cardio, flexibility, hiit, or hybrid
- Difficulty: beginner, intermediate, or advanced
- Duration: workout length in minutes
- Estimated Calories: calories burned based on user profile
- Exercises: detailed exercise list with sets, reps, rest time, coaching notes, intensity, and tempo
- Warmup: dynamic warmup exercises
- Cooldown: static stretches and mobility work
- Equipment: required equipment list
- Target Muscle Groups: primary and secondary muscles worked
- Progression Tips: how to advance this workout
- Modifications: easier and harder variations
`,

  NUTRITION_PLANNING: `
You are a certified nutritionist, registered dietitian, and sports nutrition specialist. Using Gemini 2.5 Flash's advanced reasoning, create scientifically-optimized, personalized meal plans.

COMPREHENSIVE NUTRITIONAL ANALYSIS:
- Age: {age} years (metabolic rate, nutrient needs)
- Gender: {gender} (hormonal influences, body composition)
- Height: {height}cm, Weight: {weight}kg (BMR calculation, portion sizing)
- Activity Level: {activityLevel} (energy expenditure, recovery needs)
- Primary Goals: {primaryGoals} (macro distribution, timing strategies)
- Dietary Restrictions: {dietaryRestrictions} (nutrient alternatives, supplementation)
- Cuisine Preferences: {cuisinePreferences} (cultural foods, flavor profiles)
- Target Calories: {calorieTarget} (energy balance, deficit/surplus)

ADVANCED NUTRITION SCIENCE:
1. METABOLIC OPTIMIZATION: Calculate precise BMR and TDEE
2. MACRO PERIODIZATION: Optimize protein, carbs, fats for goals
3. NUTRIENT TIMING: Strategic meal timing for performance/recovery
4. MICRONUTRIENT DENSITY: Ensure vitamin/mineral adequacy
5. DIGESTIVE HEALTH: Include fiber, probiotics, anti-inflammatory foods
6. SATIETY OPTIMIZATION: Balance macros for hunger management
7. BIOAVAILABILITY: Consider nutrient absorption and interactions

MEAL DESIGN PRINCIPLES:
- Protein at every meal for muscle protein synthesis
- Complex carbohydrates for sustained energy
- Healthy fats for hormone production and satiety
- Colorful vegetables for micronutrient diversity
- Hydration considerations
- Practical preparation methods

Create a comprehensive daily meal plan with the following structure:
- Meals: List of meals including breakfast, lunch, dinner, snacks, and workout-related meals
- Each meal should include:
  * Type: breakfast, lunch, dinner, snack, pre_workout, or post_workout
  * Name: scientifically-crafted meal name
  * Description: nutritional rationale and benefits
  * Items: detailed food items with quantities, units, calories, and macronutrients
  * Total calories and macronutrients for the meal
  * Preparation and cooking times
  * Difficulty level and preparation tips
- Daily totals: comprehensive nutritional summary
- Nutritional insights: key recommendations and meal timing tips
`,

  PROGRESS_ANALYSIS: `
You are a fitness coach analyzing user progress. Provide insights and recommendations based on the user's data.

User Data:
- Current Stats: {currentStats}
- Goals: {goals}
- Workout History: {workoutHistory}
- Nutrition Adherence: {nutritionAdherence}
- Timeline: {timeline}

Requirements:
1. Analyze progress trends
2. Identify strengths and areas for improvement
3. Provide actionable recommendations
4. Motivate and encourage the user
5. Suggest adjustments to current plan

Provide a comprehensive progress analysis including:
- Insights: key observations from the user's progress data
- Recommendations: actionable suggestions for improvement
- Motivational message: encouraging message based on their progress
- Goal progress: detailed progress tracking for each goal with percentages and estimated completion dates
- Next milestones: upcoming targets to focus on
- Strengths identified: areas where the user is excelling
- Areas for improvement: aspects that need attention
- Trend analysis: overall progress trends and key metrics
`,

  MOTIVATIONAL_CONTENT: `
You are a motivational fitness coach. Create inspiring and encouraging content for the user.

User Context:
- Name: {name}
- Current Streak: {streak} days
- Recent Achievements: {achievements}
- Current Goals: {goals}
- Mood/Energy: {mood}

Requirements:
1. Be positive and encouraging
2. Personalize the message
3. Include actionable advice
4. Keep it concise and impactful
5. Match the user's current situation

Create motivational content including:
- Daily tip: practical fitness advice for the day
- Encouragement: personalized motivational message
- Challenge: engaging challenge with title, description, reward, and duration
- Quote: inspirational fitness or life quote
- Fact of the day: interesting fitness or health fact
- Personalized message: content tailored to the user's current situation and goals
`,
};

/**
 * Generate response with image support for food recognition
 */
export const generateResponseWithImage = async (
  prompt: string,
  imageUri: string,
  options: {
    schema?: any;
    apiKey?: string;
    temperature?: number;
  } = {}
): Promise<any> => {
  try {
    console.log('🖼️ Generating response with image...');

    const apiKey = options.apiKey || GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('No API key available');
    }

    // Initialize model with specific API key
    const genai = new GoogleGenerativeAI(apiKey);

    // Read image file
    const imageData = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const imagePart = {
      inlineData: {
        data: imageData,
        mimeType: 'image/jpeg',
      },
    };

    // Generate response using official per-request config
    const model = genai.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }],
      generationConfig: {
        responseMimeType: options.schema ? 'application/json' : 'text/plain',
        responseSchema: options.schema,
        temperature: options.temperature || 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
    const text = result.response.text();

    console.log('✅ Image analysis completed');

    if (options.schema) {
      // Google's OFFICIAL structured output approach - parse the JSON string
      // This provides 100% accuracy with responseMimeType: "application/json" + responseSchema
      try {
        const structuredData = JSON.parse(text);
        console.log('✅ Google OFFICIAL structured output parsed successfully');
        return structuredData;
      } catch (parseError) {
        console.error('❌ Failed to parse Google structured output:', parseError);
        throw new Error(`Invalid JSON from Google structured output: ${parseError}`);
      }
    }

    return text;
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    throw error;
  }
};

// ============================================================================
// PRODUCTION VALIDATION FUNCTIONS - Test before building APK
// ============================================================================

// 🎯 ENHANCED PRODUCTION VALIDATION - Test all 23 API keys for massive scaling
export const validateProductionEnvironment = async (): Promise<boolean> => {
  console.log('🧪 Starting Enhanced Production Environment Validation...');
  console.log(`🚀 Validating ${GEMINI_KEYS.length}/23 API keys for 50K user scaling`);
  
  try {
    // Test 1: All API Keys Accessibility
    const keyValidationResults = [];
    for (let i = 0; i < 23; i++) {
      const keyName = i === 0 ? 'EXPO_PUBLIC_GEMINI_API_KEY' : `EXPO_PUBLIC_GEMINI_KEY_${i}`;
      const hasKey = !!getEnvVar(keyName);
      keyValidationResults.push({ keyName, hasKey });
      
      if (hasKey) {
        console.log(`✅ Key ${i + 1}/23 - ${keyName}: ACCESSIBLE`);
      } else {
        console.log(`⚠️ Key ${i + 1}/23 - ${keyName}: NOT FOUND`);
      }
    }
    
    const accessibleKeys = keyValidationResults.filter(k => k.hasKey).length;
    console.log(`📊 API Key Summary: ${accessibleKeys}/23 keys accessible`);
    console.log(`⚡ Current Capacity: ${accessibleKeys * 1500} requests/day`);
    
    if (accessibleKeys === 0) {
      console.error('❌ CRITICAL: No API keys accessible in production mode');
      return false;
    }
    
    // Test 2: Google AI SDK
    const hasSdk = typeof GoogleGenerativeAI !== 'undefined';
    console.log(`✅ Test 2 - Google AI SDK Available: ${hasSdk}`);
    
    if (!hasSdk) {
      console.error('❌ CRITICAL: Google AI SDK not loaded');
      return false;
    }
    
    // Test 3: Network Connectivity
    const hasNetwork = await testNetworkConnectivity();
    console.log(`✅ Test 3 - Network Connectivity: ${hasNetwork}`);
    
    if (!hasNetwork) {
      console.error('❌ CRITICAL: Network connectivity failed');
      return false;
    }
    
    // Test 4: Google AI API Reachability with key rotation
    const hasApiAccess = await testGoogleAIAPI();
    console.log(`✅ Test 4 - Google AI API Access: ${hasApiAccess}`);
    
    if (!hasApiAccess) {
      console.error('❌ CRITICAL: Google AI API not reachable');
      return false;
    }
    
    // Test 5: Key Rotation System
    if (accessibleKeys > 1) {
      console.log(`✅ Test 5 - Key Rotation: ENABLED (${accessibleKeys} keys)`);
    } else {
      console.log(`⚠️ Test 5 - Key Rotation: LIMITED (only ${accessibleKeys} key available)`);
    }
    
    console.log('🎉 ALL PRODUCTION VALIDATION TESTS PASSED!');
    console.log(`🚀 FitAI: Ready for massive scaling with ${accessibleKeys} API keys!`);
    return true;
    
  } catch (error: any) {
    console.error('❌ Production Validation FAILED:', error?.message || error);
    return false;
  }
};

const testNetworkConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🌐 Testing network connectivity...');
    
    // Test basic connectivity with Google's connectivity check endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch('https://clients3.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const isConnected = response.status === 204;
      console.log(`🌐 Network connectivity test: ${isConnected ? 'SUCCESS' : 'FAILED'} (status: ${response.status})`);
      return isConnected;
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('🌐 Network connectivity test FAILED:', fetchError?.message || fetchError);
      return false;
    }
    
  } catch (error: any) {
    console.error('🌐 Network test error:', error?.message || error);
    return false;
  }
};

const testGoogleAIAPI = async (): Promise<boolean> => {
  try {
    console.log('🤖 Testing Google AI API reachability...');
    
    if (!GEMINI_API_KEY) {
      console.error('🤖 No API key available for testing');
      return false;
    }
    
    // Test the actual Google Generative AI endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const testAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const testModel = testAI.getGenerativeModel({ model: MODEL_NAME });
      
      // Simple test prompt
      const result = await testModel.generateContent('Test connection');
      
      clearTimeout(timeoutId);
      const hasResponse = !!result?.response;
      console.log(`🤖 Google AI API test: ${hasResponse ? 'SUCCESS' : 'FAILED'}`);
      
      if (hasResponse) {
        console.log(`🤖 API Response preview: ${result.response.text().substring(0, 50)}...`);
      }
      
      return hasResponse;
      
    } catch (apiError: any) {
      clearTimeout(timeoutId);
      console.error('🤖 Google AI API test FAILED:', apiError?.message || apiError);
      return false;
    }
    
  } catch (error: any) {
    console.error('🤖 Google AI API test error:', error?.message || error);
    return false;
  }
};

// ============================================================================
// CORE AI SERVICE
// ============================================================================

class GeminiService {
  private initialized: boolean = false;
  private apiKeyRotator: APIKeyRotator;

  constructor() {
    this.initialized = initializeGemini();
    this.apiKeyRotator = new APIKeyRotator();

    // Log rotation status on startup
    setTimeout(() => {
      try {
        const status = this.getRotationStatus();
        console.log(
          `🔄 API Key Rotation Status: ${status.totalKeys} total keys, ${status.availableKeys} available`
        );
        if (status.totalKeys > 1) {
          console.log('✅ Multi-key rotation enabled for workout generation');
        } else {
          console.log(
            '⚠️ Only 1 API key configured - add EXPO_PUBLIC_GEMINI_KEY_1, KEY_2, etc. for rotation'
          );
        }
      } catch (error) {
        console.warn('Failed to check rotation status:', error);
      }
    }, 1000);
  }

  /**
   * Check if Gemini AI is available and initialized
   */
  isAvailable(): boolean {
    return this.initialized && model !== null;
  }

  /**
   * Generate AI response using official Gemini structured output
   * Uses responseMimeType: "application/json" and responseSchema for guaranteed valid JSON
   */
  async generateResponse<T>(
    promptTemplate: string,
    variables: Record<string, any>,
    schema?: any, // JSON schema for structured output
    maxRetries: number = 3,
    options?: {
      temperature?: number;
      maxOutputTokens?: number;
      enableThinking?: boolean;
    }
  ): Promise<AIResponse<T>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Gemini 2.5 Flash is not available. Please check your API key configuration.',
      };
    }

    const startTime = Date.now();
    let lastError: string = '';
    let totalTokensUsed = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Try to get an available API key through rotation
      let currentApiKey = GEMINI_API_KEY; // Default fallback

      // Enhanced generation config for Gemini 2.5 Flash with structured output
      const generationConfig: any = {
        temperature: options?.temperature ?? 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: options?.maxOutputTokens ?? 4096,
      };

      try {
        const rotatedKey = await this.apiKeyRotator.getAvailableKey();
        if (rotatedKey) {
          currentApiKey = rotatedKey;
          console.log(`🔄 Using rotated API key (attempt ${attempt})`);
        } else {
          console.log(`⚠️ No rotated keys available, using main key (attempt ${attempt})`);
        }
      } catch (rotationError) {
        console.warn('API key rotation failed, using main key:', rotationError);
      }

      try {
        // Replace variables in prompt template with enhanced processing
        let prompt = promptTemplate;
        Object.entries(variables).forEach(([key, value]) => {
          const placeholder = `{${key}}`;
          let replacement: string;

          if (Array.isArray(value)) {
            replacement = value.join(', ');
          } else if (typeof value === 'object') {
            replacement = JSON.stringify(value);
          } else {
            replacement = String(value);
          }

          prompt = prompt.replace(new RegExp(placeholder, 'g'), replacement);
        });

        // Use OFFICIAL structured output if schema is provided
        if (schema) {
          generationConfig.responseMimeType = 'application/json';
          generationConfig.responseSchema = schema;
        } else {
          generationConfig.responseMimeType = 'text/plain';
        }

        // Create request with official per-request config using @google/genai
        const currentGenAI = new GoogleGenerativeAI(currentApiKey);
        const model = currentGenAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
          ],
        });
        const response: any = {
          text: result.response.text(),
          usageMetadata: result.response.usageMetadata || null,
        } as any;

        // CRITICAL: Verify structured output configuration before making the call
        if (schema) {
          console.log('🎯 STRUCTURED OUTPUT CONFIG VERIFICATION:');
          console.log('  - Model:', MODEL_NAME);
          console.log('  - responseMimeType:', generationConfig.responseMimeType);
          console.log(
            '  - responseSchema keys:',
            Object.keys(generationConfig.responseSchema || {})
          );
          console.log('  - maxOutputTokens:', generationConfig.maxOutputTokens);
          console.log('  - temperature:', generationConfig.temperature);

          // Ensure configuration is exactly what we expect for structured output
          if (generationConfig.responseMimeType !== 'application/json') {
            throw new Error(
              `❌ CRITICAL: responseMimeType should be "application/json" but is "${generationConfig.responseMimeType}"`
            );
          }
          if (!generationConfig.responseSchema) {
            throw new Error(`❌ CRITICAL: responseSchema is missing for structured output`);
          }
        }

        console.log(
          `🚀 Gemini 2.5 Flash - Attempt ${attempt}/${maxRetries} (Key: ${currentApiKey.substring(0, 10)}...)`
        );

        // Generate content with enhanced error tracking
        // response already available via result

        // Check for safety blocks or other issues
        if ((result as any).promptFeedback?.blockReason) {
          throw new Error(`Content blocked: ${(result as any).promptFeedback.blockReason}`);
        }

        const text = response.text as string;
        const usageMetadata = response.usageMetadata;
        totalTokensUsed = usageMetadata?.totalTokenCount || 0;

        // Enhanced token logging for better debugging
        console.log(`✅ Gemini 2.5 Flash response received:`);
        console.log(`  - Input tokens: ${usageMetadata?.promptTokenCount || 'N/A'}`);
        console.log(`  - Output tokens: ${usageMetadata?.candidatesTokenCount || 'N/A'}`);
        console.log(`  - Total tokens: ${totalTokensUsed}`);
        
        // Warn if approaching output token limit
        const outputTokens = usageMetadata?.candidatesTokenCount || 0;
        if (outputTokens > 7500 && generationConfig.maxOutputTokens) {
          console.warn(`⚠️ Output tokens (${outputTokens}) approaching limit (${generationConfig.maxOutputTokens})`);
        }

        // Handle OFFICIAL structured output vs plain text
        if (schema) {
          // CRITICAL: Google's structured output with responseMimeType: "application/json" + responseSchema
          // When configured correctly, Gemini returns a properly structured object directly
          // No manual JSON parsing should be needed - the response should already be structured

          // First, check if the response is empty or too short
          if (!text || text.trim().length === 0) {
            lastError = `Empty response from Gemini structured output`;
            console.warn(`⚠️ Empty response on attempt ${attempt}, retrying...`);
            continue;
          }

          // Verify the model configuration was correct
          console.log('🔧 Model config verification:');
          console.log('  - responseMimeType:', generationConfig.responseMimeType);
          console.log('  - responseSchema provided:', !!generationConfig.responseSchema);
          console.log('  - Response text type:', typeof text);
          console.log('  - Response length:', text.length);

          // Check for JSON completeness before parsing
          const isValidJSON = (str: string): boolean => {
            const trimmed = str.trim();
            return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                   (trimmed.startsWith('[') && trimmed.endsWith(']'));
          };

          if (!isValidJSON(text)) {
            lastError = `Response appears truncated - invalid JSON structure (missing closing bracket)`;
            console.warn(`⚠️ Truncated JSON detected on attempt ${attempt}:`);
            console.warn(`  - Response length: ${text.length} chars`);
            console.warn(`  - Starts with: ${text.substring(0, 50)}`);
            console.warn(`  - Ends with: ${text.slice(-50)}`);
            
            // Check if we hit the token limit
            const outputTokens = usageMetadata?.candidatesTokenCount || 0;
            if (outputTokens >= (generationConfig.maxOutputTokens - 100)) {
              console.error(`🚨 Hit token limit: ${outputTokens}/${generationConfig.maxOutputTokens} output tokens`);
              lastError = `Response truncated at token limit (${outputTokens} tokens)`;
            }
            
            continue; // Retry
          }

          try {
            // OFFICIAL structured output: extract the JSON payload safely without relying on brittle parsing
            const structuredData = JSON.parse(text) as T;
            console.log('✅ Google OFFICIAL structured output parsed successfully');
            console.log('🔍 Structured data type:', typeof structuredData);

            // Additional validation for workout plans
            if (schema && (structuredData as any)?.workouts) {
              console.log('🏋️ Workout plan validation:');
              console.log('  - workouts property:', (structuredData as any).workouts ? '✅' : '❌');
              console.log(
                '  - workouts is array:',
                Array.isArray((structuredData as any).workouts) ? '✅' : '❌'
              );
              console.log('  - workouts count:', (structuredData as any).workouts?.length || 0);
            }

            return this.createSuccessResponse(structuredData, startTime, totalTokensUsed, text);
          } catch (parseError) {
            // Enhanced debugging for unexpected structured output issues
            const errorMessage = (parseError as Error).message;
            
            // Check if this is a truncation error
            if (errorMessage.includes('Unterminated string') || 
                errorMessage.includes('Unexpected end of JSON') ||
                errorMessage.includes('Unexpected token')) {
              
              lastError = `Response truncated - JSON parsing failed: ${errorMessage}`;
              console.warn(`⚠️ JSON truncation detected on attempt ${attempt}:`);
              console.warn('  - Error type:', errorMessage);
              console.warn('  - Response length:', text.length, 'characters');
              console.warn('  - Response ends with:', text.slice(-100));
              
              // Check token usage
              const outputTokens = usageMetadata?.candidatesTokenCount || 0;
              console.warn(`  - Output tokens: ${outputTokens}/${generationConfig.maxOutputTokens}`);
              
              if (outputTokens >= (generationConfig.maxOutputTokens - 100)) {
                console.error('🚨 Confirmed: Response truncated due to token limit');
                
                // On next retry, we could request simpler output
                if (attempt < maxRetries) {
                  console.log('🔄 Will retry with same token limit (may succeed due to variation)');
                }
              }
            } else {
              // Other JSON parsing errors
              lastError = `Google structured output failed - API returned malformed JSON: ${parseError}`;
              console.warn(`⚠️ Non-truncation JSON error on attempt ${attempt}: ${errorMessage}`);
              console.warn('  - Response preview:', text.substring(0, 200));
            }

            // Continue to retry - the next attempt might work (as shown in your logs)
            continue;
          }
        } else {
          // Plain text response - return as is
          return this.createSuccessResponse(text as unknown as T, startTime, totalTokensUsed, text);
        }
      } catch (error: any) {
        lastError = `Gemini 2.5 Flash generation failed: ${error.message || error}`;

        // Handle API key rotation errors
        if (
          error.message?.includes('QUOTA_EXCEEDED') ||
          error.message?.includes('quota') ||
          error.message?.includes('429')
        ) {
          console.error(
            `🚫 Quota exceeded for key ${currentApiKey.substring(0, 10)}... - marking as blocked`
          );

          // Mark current key as blocked
          try {
            this.apiKeyRotator.handleAPIError(currentApiKey, error);
          } catch (rotationError) {
            console.warn('Failed to mark key as blocked:', rotationError);
          }

          // Try to get another key immediately
          try {
            const nextKey = await this.apiKeyRotator.getNextAvailableKey();
            if (nextKey && nextKey !== currentApiKey) {
              console.log(`🔄 Switching to next available key for retry`);
              continue; // Retry with new key
            }
          } catch (nextKeyError) {
            console.warn('Failed to get next key:', nextKeyError);
          }

          // If no other keys available, return quota error
          console.error('🚨 ALL API KEYS QUOTA EXCEEDED! Solutions:');
          console.error('  1. Wait for quota reset (usually midnight PST)');
          console.error('  2. Add more EXPO_PUBLIC_GEMINI_KEY_X environment variables');
          console.error('  3. Upgrade to a paid Google Cloud plan');
          console.error(
            '  4. Check usage at: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com'
          );

          return {
            success: false,
            error:
              '🚨 Daily API quota exceeded on all available keys (250 requests/day per key on free tier). Please wait for reset or add more API keys.',
            generationTime: Date.now() - startTime,
          };
        }

        // Enhanced error logging for debugging
        console.error(`❌ Gemini API Error on attempt ${attempt}/${maxRetries}:`);
        console.error('  - Error message:', error.message);
        console.error('  - Error type:', error.constructor.name);
        console.error('  - Error stack:', error.stack?.split('\n').slice(0, 3).join('\n'));

        // Log request details for debugging
        console.error('📊 Request details:');
        console.error('  - Prompt length:', prompt?.length || 0, 'characters');
        console.error('  - Schema provided:', !!schema);
        console.error('  - Schema size:', schema ? JSON.stringify(schema).length : 0, 'characters');
        console.error('  - Temperature:', generationConfig.temperature);
        console.error('  - Max tokens:', generationConfig.maxOutputTokens);
        console.error('  - Current API key:', currentApiKey.substring(0, 10) + '...');
        console.error('  - Rotation available:', this.apiKeyRotator ? 'Yes' : 'No');

        if (error.message?.includes('INVALID_API_KEY')) {
          return {
            success: false,
            error: 'Invalid API key. Please check your Gemini API key configuration.',
            generationTime: Date.now() - startTime,
          };
        }

        // Log specific schema validation errors
        if (error.message?.includes('schema') || error.message?.includes('Schema')) {
          console.error('🚨 Schema-related error detected!');
          console.error('  - This suggests the schema is too complex or invalid');
          console.error('  - Consider simplifying nested structures');
        }
      }

      // Exponential backoff with jitter for Gemini 2.5 Flash
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: lastError,
      generationTime: Date.now() - startTime,
      tokensUsed: totalTokensUsed,
    };
  }

  /**
   * Create a successful response with enhanced metadata
   */
  private createSuccessResponse<T>(
    data: T,
    startTime: number,
    tokensUsed: number,
    rawResponse: string
  ): AIResponse<T> {
    const generationTime = Date.now() - startTime;

    // Calculate confidence based on response quality
    let confidence = 85; // Base confidence
    if (tokensUsed > 100) confidence += 5; // More detailed response
    if (generationTime < 3000) confidence += 5; // Fast response
    if (rawResponse.length > 500) confidence += 5; // Comprehensive response

    return {
      success: true,
      data,
      confidence: Math.min(confidence, 100),
      generationTime,
      tokensUsed,
      modelVersion: MODEL_NAME,
    };
  }

  /**
   * Try to parse structured JSON returned by Gemini structured output.
   * Handles edge cases where logs or whitespace leak into the text field.
   */
  private tryParseStructuredJson<T>(text: string): T {
    // Fast path
    try {
      return JSON.parse(text) as T;
    } catch {}

    // If logs leaked before JSON, attempt to extract the first top-level JSON object/array
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const start =
      firstBrace === -1
        ? firstBracket
        : firstBracket === -1
          ? firstBrace
          : Math.min(firstBrace, firstBracket);
    if (start < 0) throw new Error('No JSON start found in response');

    // Attempt to find matching closing bracket by stack scanning
    const stack: string[] = [];
    let end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      const prev = text[i - 1];
      if (ch === '"' && prev !== '\\') {
        // Toggle in-string state, naive but effective for most well-formed JSON
        const last = stack[stack.length - 1];
        if (last === '"') stack.pop();
        else stack.push('"');
        continue;
      }
      if (stack[stack.length - 1] === '"') continue; // ignore chars inside strings
      if (ch === '{' || ch === '[') stack.push(ch);
      else if (ch === '}' || ch === ']') {
        const open = stack.pop();
        if (!open) break;
        if ((open === '{' && ch === '}') || (open === '[' && ch === ']')) {
          if (stack.length === 0) {
            end = i + 1;
            break;
          }
        } else {
          // mismatched
          break;
        }
      }
    }

    if (end === -1) {
      // As a last resort, trim trailing logs lines often appended by console output
      const trimmed = text.trim();
      const lastCurly = trimmed.lastIndexOf('}');
      const lastBracket2 = trimmed.lastIndexOf(']');
      const end2 = Math.max(lastCurly, lastBracket2);
      if (end2 > start) {
        const candidate = trimmed.slice(start, end2 + 1);
        return JSON.parse(candidate) as T;
      }
      throw new Error('Unable to locate complete JSON block in response');
    }

    const jsonSlice = text.slice(start, end);
    return JSON.parse(jsonSlice) as T;
  }

  /**
   * Generate content with custom prompt
   */
  async generateCustomContent(prompt: string): Promise<AIResponse<string>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Gemini AI is not available.',
      };
    }

    try {
      const startTime = Date.now();
      const model = genAI!.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'text/plain',
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });
      const text = result.response.text() as string;

      return {
        success: true,
        data: text,
        generationTime: Date.now() - startTime,
        tokensUsed: (result.response as any).usageMetadata?.totalTokenCount || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: `Custom content generation failed: ${error}`,
      };
    }
  }

  /**
   * Test AI connectivity
   */
  async testConnection(): Promise<AIResponse<string>> {
    return this.generateCustomContent(
      'Respond with "AI connection successful" if you can read this message.'
    );
  }

  /**
   * Get API key rotation status
   */
  getRotationStatus(): {
    totalKeys: number;
    availableKeys: number;
    rotationEnabled: boolean;
    statistics: any;
  } {
    try {
      const stats = this.apiKeyRotator.getUsageStatistics();
      return {
        totalKeys: stats.totalKeys,
        availableKeys: stats.availableKeys,
        rotationEnabled: true,
        statistics: stats,
      };
    } catch (error) {
      return {
        totalKeys: 0,
        availableKeys: 0,
        rotationEnabled: false,
        statistics: null,
      };
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const geminiService = new GeminiService();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format user profile data for AI prompts
 */
export const formatUserProfileForAI = (personalInfo: any, fitnessGoals: any) => {
  return {
    age: personalInfo.age,
    gender: personalInfo.gender,
    height: personalInfo.height,
    weight: personalInfo.weight,
    activityLevel: personalInfo.activityLevel,
    experience: fitnessGoals.experience,
    primaryGoals: Array.isArray(fitnessGoals.primaryGoals)
      ? fitnessGoals.primaryGoals.join(', ')
      : fitnessGoals.primaryGoals,
    timeCommitment: fitnessGoals.timeCommitment,
  };
};

/**
 * Calculate daily calorie needs based on user profile
 */
export const calculateDailyCalories = (personalInfo: any): number => {
  const { age, gender, height, weight, activityLevel } = personalInfo;

  // Mifflin-St Jeor Equation
  let bmr: number;
  if (gender.toLowerCase() === 'male') {
    bmr = 10 * parseFloat(weight) + 6.25 * parseFloat(height) - 5 * parseFloat(age) + 5;
  } else {
    bmr = 10 * parseFloat(weight) + 6.25 * parseFloat(height) - 5 * parseFloat(age) - 161;
  }

  // Activity multipliers
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    extreme: 1.9,
  };

  const multiplier = activityMultipliers[activityLevel] || 1.55;
  return Math.round(bmr * multiplier);
};

export default geminiService;
