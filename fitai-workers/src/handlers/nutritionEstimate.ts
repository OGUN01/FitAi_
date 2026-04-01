/**
 * FitAI Workers - Barcode Nutrition Estimation Handler
 *
 * Uses Gemini via Vercel AI Gateway to estimate nutrition for a named product.
 * Called by the React Native app when OFF/UPCitemdb return a product name but
 * no nutrition data. Gemini is NEVER called with a raw barcode number.
 *
 * @endpoint POST /nutrition/barcode-estimate
 */

import { Context } from 'hono';
import { generateObject, createGateway } from 'ai';
import { z } from 'zod';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';

// ============================================================================
// SCHEMAS
// ============================================================================

const RequestSchema = z.object({
	productName: z.string().min(1).max(300),
	brand: z.string().max(200).optional().default(''),
	country: z.string().max(100).optional().default(''),
});

const NutritionSchema = z.object({
	calories_kcal: z.number().describe('Calories per 100g'),
	protein_g: z.number().describe('Protein in grams per 100g'),
	carbs_g: z.number().describe('Carbohydrates in grams per 100g'),
	fat_g: z.number().describe('Fat in grams per 100g'),
	fiber_g: z.number().describe('Dietary fiber in grams per 100g'),
	sugar_g: z.number().describe('Sugar in grams per 100g'),
	sodium_mg: z.number().describe('Sodium in milligrams per 100g'),
	confidence_0_to_100: z
		.number()
		.min(0)
		.max(100)
		.describe('Confidence score 0-100. Use lower values when estimating from brand/region only.'),
});

// ============================================================================
// PROVIDER
// ============================================================================

function createAIProvider(env: Env) {
	const gateway = createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
	return gateway('google/gemini-2.0-flash');
}

// ============================================================================
// HANDLER
// ============================================================================

export async function handleNutritionEstimate(c: Context<{ Bindings: Env; Variables: AuthContext }>) {
	const startTime = Date.now();

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ success: false, error: 'Invalid JSON body' }, 400);
	}

	const parsed = RequestSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, 400);
	}

	const { productName: rawProductName, brand, country } = parsed.data;

	// FIX E — sanitize productName before injecting into prompt
	function sanitizeForPrompt(value: string): string {
		return value
			.replace(/[*_`#\[\]]/g, '')  // strip markdown
			.replace(/\{[^}]*\}/g, '')   // strip template-like braces
			.slice(0, 200);              // hard limit
	}
	const productName = sanitizeForPrompt(rawProductName);

	const prompt =
		`You are a nutrition database. Estimate the nutritional content per 100g for:` +
		`\n  Product: ${productName}` +
		(brand ? `\n  Brand: ${brand}` : '') +
		(country ? `\n  Origin: ${country}` : '') +
		`\n\nProvide realistic values based on this type of product. ` +
		`Set confidence_0_to_100 between 20-40 since this is an estimate. ` +
		`All numeric values must be non-negative numbers.`;

	try {
		const model = createAIProvider(c.env);

		const { object } = await generateObject({
			model,
			schema: NutritionSchema,
			prompt,
		});

		// FIX D — cap confidence and attach disclaimer when AI exceeded the cap
		const rawConfidence = object.confidence_0_to_100;
		const cappedConfidence = Math.min(rawConfidence, 40);
		const lowConfidenceWarning = rawConfidence > 40
			? "Nutritional values are estimates only — product not found in database. Verify with actual packaging."
			: undefined;

		return c.json({
			success: true,
			data: {
				calories: Math.round(object.calories_kcal),
				protein: Math.round(object.protein_g * 10) / 10,
				carbs: Math.round(object.carbs_g * 10) / 10,
				fat: Math.round(object.fat_g * 10) / 10,
				fiber: Math.round(object.fiber_g * 10) / 10,
				sugar: Math.round(object.sugar_g * 10) / 10,
				sodium: Math.round(object.sodium_mg / 10) / 100,
				confidence: cappedConfidence,
				isAIEstimated: true,
				...(lowConfidenceWarning !== undefined && { lowConfidenceWarning }),
			},
			metadata: {
				model: 'google/gemini-2.0-flash',
				generationTime: Date.now() - startTime,
			},
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('[NutritionEstimate] AI error:', message);
		return c.json({ success: false, error: 'AI estimation failed', details: message }, 500);
	}
}
