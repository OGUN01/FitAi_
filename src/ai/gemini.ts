// Google Gemini AI Integration Service for FitAI

import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { AIResponse } from '../types/ai';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL_NAME = 'gemini-2.5-flash'; // Latest Gemini 2.5 Flash model

// Log API key status for debugging (only first few characters for security)
console.log('🔑 Gemini API Key Status:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('🤖 Using Latest Model:', MODEL_NAME);

// Initialize Gemini AI
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

const initializeGemini = () => {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not found. AI features will be disabled.');
    return false;
  }

  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Initialize with latest Gemini 2.5 Flash configuration
    model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
      },
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

    console.log('✅ Gemini 2.5 Flash initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Gemini AI:', error);
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
`
};

// ============================================================================
// CORE AI SERVICE
// ============================================================================

class GeminiService {
  private initialized: boolean = false;

  constructor() {
    this.initialized = initializeGemini();
  }

  /**
   * Check if Gemini AI is available and initialized
   */
  isAvailable(): boolean {
    return this.initialized && model !== null;
  }

  /**
   * Generate AI response using a prompt template with Gemini 2.5 Flash structured output
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
        error: 'Gemini 2.5 Flash is not available. Please check your API key configuration.'
      };
    }

    const startTime = Date.now();
    let lastError: string = '';
    let totalTokensUsed = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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

        // Enhanced generation config for Gemini 2.5 Flash with structured output
        const generationConfig: any = {
          temperature: options?.temperature ?? 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: options?.maxOutputTokens ?? 8192,
        };

        // Use structured output if schema is provided
        if (schema) {
          generationConfig.responseMimeType = "application/json";
          generationConfig.responseSchema = schema;
        } else {
          generationConfig.responseMimeType = "text/plain";
        }

        // Create model instance with custom config if needed
        const modelInstance = options ?
          genAI!.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig
          }) : model!;

        console.log(`🚀 Gemini 2.5 Flash - Attempt ${attempt}/${maxRetries}`);

        // Generate content with enhanced error tracking
        const result = await modelInstance.generateContent(prompt);
        const response = await result.response;

        // Check for safety blocks or other issues
        if (response.promptFeedback?.blockReason) {
          throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
        }

        const text = response.text();
        const usageMetadata = response.usageMetadata;
        totalTokensUsed = usageMetadata?.totalTokenCount || 0;

        console.log(`✅ Gemini 2.5 Flash response received - ${totalTokensUsed} tokens`);

        // Handle structured output vs plain text
        if (schema) {
          // Structured output - response is guaranteed to be valid JSON
          try {
            const data = JSON.parse(text) as T;
            return this.createSuccessResponse(data, startTime, totalTokensUsed, text);
          } catch (parseError) {
            // This should never happen with structured output, but handle gracefully
            lastError = `Unexpected structured output parsing error: ${parseError}`;
            console.warn(`Attempt ${attempt} - Structured output parse error:`, parseError);
            console.warn('Raw response preview:', text.substring(0, 500) + '...');
          }
        } else {
          // Plain text response - return as is
          return this.createSuccessResponse(text as unknown as T, startTime, totalTokensUsed, text);
        }
      } catch (error: any) {
        lastError = `Gemini 2.5 Flash generation failed: ${error.message || error}`;
        console.warn(`Attempt ${attempt} - Generation error:`, error);

        // Handle specific Gemini API errors
        if (error.message?.includes('QUOTA_EXCEEDED')) {
          return {
            success: false,
            error: 'API quota exceeded. Please check your usage limits.',
            generationTime: Date.now() - startTime
          };
        }

        if (error.message?.includes('INVALID_API_KEY')) {
          return {
            success: false,
            error: 'Invalid API key. Please check your Gemini API key configuration.',
            generationTime: Date.now() - startTime
          };
        }
      }

      // Exponential backoff with jitter for Gemini 2.5 Flash
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: lastError,
      generationTime: Date.now() - startTime,
      tokensUsed: totalTokensUsed
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
      modelVersion: MODEL_NAME
    };
  }



  /**
   * Generate content with custom prompt
   */
  async generateCustomContent(prompt: string): Promise<AIResponse<string>> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Gemini AI is not available.'
      };
    }

    try {
      const startTime = Date.now();
      const result = await model!.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        data: text,
        generationTime: Date.now() - startTime,
        tokensUsed: response.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      return {
        success: false,
        error: `Custom content generation failed: ${error}`
      };
    }
  }

  /**
   * Test AI connectivity
   */
  async testConnection(): Promise<AIResponse<string>> {
    return this.generateCustomContent('Respond with "AI connection successful" if you can read this message.');
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
    timeCommitment: fitnessGoals.timeCommitment
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
    extreme: 1.9
  };

  const multiplier = activityMultipliers[activityLevel] || 1.55;
  return Math.round(bmr * multiplier);
};

export default geminiService;
