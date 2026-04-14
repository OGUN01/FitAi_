/**
 * FitAI Workers - Food Recognition Handler
 *
 * Uses Gemini Vision API to recognize food from images
 * Simplified schema focusing on what AI does reliably:
 * - Food identification (name, category)
 * - Basic nutrition estimation
 * - Portion suggestion (user can override with exact grams)
 *
 * @endpoint POST /food/recognize
 */

import { Context } from 'hono';
import { generateObject } from 'ai';
import { createAIProvider } from '../utils/aiProvider';
import { z } from 'zod';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import { APIError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

// ============================================================================
// TYPES & SCHEMAS - SIMPLIFIED FOR RELIABILITY
// ============================================================================

// Request validation schema
const FoodRecognitionRequestSchema = z.object({
	imageBase64: z.string().min(100, 'Image data is too short').max(10_000_000, 'Image data exceeds 10MB limit'),
	mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
	userContext: z
		.object({
			dietaryRestrictions: z.array(z.string()).optional(),
		})
		.optional(),
});

type FoodRecognitionRequest = z.infer<typeof FoodRecognitionRequestSchema>;

// Simplified food schema - only fields AI can reliably detect
const RecognizedFoodSchema = z.object({
	// Core identification (AI is good at this)
	name: z.string().describe("Specific food name (e.g., 'Chicken Biryani', 'Caesar Salad', 'Sushi Roll')"),
	localName: z.string().optional().describe('Local/native name if applicable (e.g., Hindi, Japanese, Spanish)'),

	// Classification (reliable)
	category: z.enum(['main', 'side', 'snack', 'sweet', 'beverage']).describe('Food category'),
	cuisine: z
		.enum([
			'indian',
			'chinese',
			'japanese',
			'korean',
			'thai',
			'vietnamese',
			'italian',
			'mexican',
			'american',
			'mediterranean',
			'middle_eastern',
			'african',
			'french',
			'other',
		])
		.describe('Cuisine type - be specific'),

	// Portion estimation (AI suggestion - user can override)
	estimatedGrams: z.number().describe('Estimated portion weight in grams based on visual size'),
	servingDescription: z.string().describe("Human-readable serving description (e.g., '1 bowl', '2 pieces', '1 plate')"),

	// Nutrition for estimated portion (core macros only)
	calories: z.number().describe('Calories for the estimated portion'),
	protein: z.number().describe('Protein in grams'),
	carbs: z.number().describe('Carbohydrates in grams'),
	fat: z.number().describe('Fat in grams'),
	fiber: z.number().describe('Fiber in grams'),

	// Confidence (important for user trust)
	confidence: z.number().min(0).max(100).describe('Recognition confidence (0-100). Lower if uncertain.'),
});

const FoodRecognitionResponseSchema = z.object({
	foods: z.array(RecognizedFoodSchema).describe('List of recognized food items'),
	overallConfidence: z.number().min(0).max(100).describe('Overall confidence score'),
	totalCalories: z.number().describe('Sum of all food calories'),
	mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).describe('Meal type'),
});

// ============================================================================
// AI PROVIDER
// ============================================================================

function createAIProvider(env: Env, modelId: string) {
	const gatewayInstance = createGateway({
		apiKey: env.AI_GATEWAY_API_KEY,
	});
	const model = modelId || 'google/gemini-2.5-flash';
	return gatewayInstance(model);
}

// ============================================================================
// SIMPLIFIED PROMPT - FOCUSED ON RELIABLE DETECTION
// ============================================================================

function buildFoodRecognitionPrompt(mealType: string, userContext?: FoodRecognitionRequest['userContext']): string {
	// FIX G — sanitize dietary restrictions before injecting into prompt
	const safeDietaryRestrictions = (userContext?.dietaryRestrictions ?? [])
		.map(r => r.replace(/[*_`#\[\]\{\}]/g, '').slice(0, 50))
		.filter(r => r.length > 0);

	const restrictionsHint = safeDietaryRestrictions.length
		? `User has dietary restrictions: ${safeDietaryRestrictions.join(', ')}.`
		: '';

	return `You are an expert nutritionist analyzing a ${mealType} image. Identify all visible food items.

${restrictionsHint}

For EACH food item, provide:
1. **Name**: Be specific (e.g., "Grilled Chicken Breast" not just "chicken")
2. **Local Name**: If it's a regional dish, include the local name
3. **Category**: main, side, snack, sweet, or beverage
4. **Cuisine**: Identify the cuisine type accurately
5. **Portion Estimate**: 
   - Estimated grams based on visual size
   - Human-readable description (e.g., "1 medium bowl", "2 pieces")
6. **Nutrition**: Calories, protein, carbs, fat, fiber for the estimated portion
7. **Confidence**: 0-100 score. Use lower scores if uncertain.

IMPORTANT:
- Focus on accurate food IDENTIFICATION - this is most important
- Portion estimates are suggestions - users can adjust with exact grams
- Be conservative with confidence scores
- If you can't identify something clearly, give it low confidence (below 50)
- Support ALL cuisines: Indian, Chinese, Japanese, Italian, Mexican, American, etc.

Common portion references:
- Small bowl: ~150g
- Medium bowl: ~250g  
- Large bowl: ~400g
- 1 roti/tortilla: ~30g
- 1 slice bread: ~30g
- 1 cup rice: ~180g
- Palm-sized meat: ~100g`;
}

// ============================================================================
// HANDLER
// ============================================================================

export async function handleFoodRecognition(c: Context<{ Bindings: Env }>) {
	const startTime = Date.now();

	try {
		// Get authenticated user
		const user = c.get('user') as AuthContext['user'];
		if (!user) {
			throw new APIError('Authentication required', 401, ErrorCode.AUTHENTICATION_REQUIRED);
		}

		// Parse and validate request body
		const body = await c.req.json();
		const parseResult = FoodRecognitionRequestSchema.safeParse(body);

		if (!parseResult.success) {
			throw new APIError(`Invalid request: ${parseResult.error.errors.map((e) => e.message).join(', ')}`, 400, ErrorCode.VALIDATION_ERROR);
		}

		const request = parseResult.data;
		console.log(`[Food Recognition] Processing ${request.mealType} image for user ${user.id}`);

		// Validate image format — only JPEG, PNG, WebP accepted (FIX F)
		const ALLOWED_IMAGE_TYPES = ['data:image/jpeg', 'data:image/png', 'data:image/webp'];
		if (!ALLOWED_IMAGE_TYPES.some(t => request.imageBase64.startsWith(t))) {
			throw new APIError('Image must be JPEG, PNG, or WebP format', 400, ErrorCode.VALIDATION_ERROR);
		}

		// Build the prompt
		const prompt = buildFoodRecognitionPrompt(request.mealType, request.userContext);

		// FIX H — use env var with fallback instead of hardcoded model
		const modelId = (c.env as any).FOOD_RECOGNITION_MODEL ?? 'google/gemini-2.5-flash';
		const model = createAIProvider(c.env, modelId);

		console.log('[Food Recognition] Calling Gemini Vision API...');

		// Call Gemini Vision with structured output
		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error('AI generation timed out after 25s')), 25000)
		);
		const result = await Promise.race([
			generateObject({
				model,
				schema: FoodRecognitionResponseSchema,
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'text', text: prompt },
							{
								type: 'image',
								image: request.imageBase64,
							},
						],
					},
				],
			}),
			timeoutPromise,
		]) as Awaited<ReturnType<typeof generateObject<typeof FoodRecognitionResponseSchema>>>;

		const processingTime = Date.now() - startTime;
		console.log(`[Food Recognition] Completed in ${processingTime}ms with ${result.object.foods.length} foods detected`);

		// Return successful response
			return c.json({
				success: true,
				data: {
					foods: result.object.foods.map((food, index) => {
						// Guard against div-by-zero: if estimatedGrams is 0 or missing,
						// fall back to the AI-provided per-serving values as the per-100g baseline.
						const grams = food.estimatedGrams > 0 ? food.estimatedGrams : 100;
						const scale = 100 / grams;
						return {
							id: `food_${Date.now()}_${index}`,
							...food,
							// Ensure estimatedGrams is never 0 in the response
							estimatedGrams: grams,
							// Nutrition per 100g for easy scaling when user adjusts portion
							nutritionPer100g: {
								calories: Math.round(food.calories * scale),
								protein:  Math.round(food.protein  * scale * 10) / 10,
								carbs:    Math.round(food.carbs    * scale * 10) / 10,
								fat:      Math.round(food.fat      * scale * 10) / 10,
								fiber:    Math.round(food.fiber    * scale * 10) / 10,
							},
						};
					}),
					overallConfidence: result.object.overallConfidence,
					totalCalories: result.object.totalCalories,
					mealType: result.object.mealType,
				},
			metadata: {
				processingTime,
				model: 'google/gemini-2.5-flash',
				userId: user.id,
			},
		});
	} catch (error) {
		const processingTime = Date.now() - startTime;
		console.error('[Food Recognition] Error:', error);

		if (error instanceof APIError) {
			return c.json(
				{
					success: false,
					error: error.message,
					code: error.errorCode,
				},
				error.statusCode as any,
			);
		}

		// Handle Gemini API errors
		if (error instanceof Error) {
			if (error.message.includes('timed out after 25s')) {
				return c.json(
					{
						success: false,
						error: 'Food recognition timed out. Please try again.',
						code: ErrorCode.INTERNAL_ERROR,
					},
					408,
				);
			}

			if (error.message.includes('quota') || error.message.includes('429')) {
				return c.json(
					{
						success: false,
						error: 'AI service temporarily unavailable. Please try again in a few minutes.',
						code: ErrorCode.RATE_LIMIT_EXCEEDED,
					},
					429,
				);
			}

			if (error.message.includes('image') || error.message.includes('vision')) {
				return c.json(
					{
						success: false,
						error: 'Could not process image. Please ensure the image is clear and try again.',
						code: ErrorCode.VALIDATION_ERROR,
					},
					400,
				);
			}
		}

		// Include actual error details for debugging
		const errorDetails =
			error instanceof Error ? { message: error.message, stack: error.stack?.split('\n').slice(0, 3).join('\n') } : String(error);

		console.error('[Food Recognition] Full error details:', JSON.stringify(errorDetails));

		return c.json(
			{
				success: false,
				error: 'Failed to recognize food. Please try again.',
				code: ErrorCode.INTERNAL_ERROR,
				metadata: {
					processingTime,
					// Include error details in dev/debug mode
					debug: errorDetails,
				},
			},
			500,
		);
	}
}

export default handleFoodRecognition;
