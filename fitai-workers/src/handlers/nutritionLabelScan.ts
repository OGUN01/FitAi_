/**
 * FitAI Workers - Nutrition Label Scan Handler
 *
 * Uses Gemini Vision API to extract nutrition data from packaged food labels.
 * This gives near-100% accuracy for any packaged product, even if the barcode
 * is not in any database, by reading the nutrition facts panel directly.
 *
 * @endpoint POST /food/label-scan
 *
 * Flow:
 *   1. User photographs the nutrition facts table on the back/side of a package
 *   2. Base64 image sent here
 *   3. Gemini Vision extracts every numeric field verbatim from the label
 *   4. Response is shaped as a ScannedProduct-compatible object on the client
 */

import { Context } from 'hono';
import { generateObject, createGateway } from 'ai';
import { z } from 'zod';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import { APIError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

// ============================================================================
// SCHEMAS
// ============================================================================

const LabelScanRequestSchema = z.object({
	imageBase64: z.string().min(100, 'Image data is too short'),
	productName: z.string().max(300).optional(),
});

type LabelScanRequest = z.infer<typeof LabelScanRequestSchema>;

/**
 * The structured output we ask Gemini to extract from the label image.
 * All values reflect what is PRINTED on the label — no estimation.
 */
const NutritionLabelSchema = z.object({
	// Product identity (may be printed on packaging)
	productName: z.string().describe('Product name as printed on the label'),
	brand: z.string().optional().describe('Brand name if visible on packaging'),

	// Serving information — critical for correct scaling
	servingSize: z.number().describe('Serving size value as printed (e.g. 30, 100)'),
	servingUnit: z.string().describe('Serving size unit as printed (e.g. "g", "ml", "cup")'),

	// Per-serving macros — extract EXACTLY as printed
	caloriesPerServing: z.number().describe('Calories/Energy (kcal) per serving as printed on label'),
	proteinPerServing: z.number().describe('Protein in grams per serving as printed'),
	carbsPerServing: z.number().describe('Total Carbohydrates in grams per serving as printed'),
	fatPerServing: z.number().describe('Total Fat in grams per serving as printed'),
	fiberPerServing: z.number().optional().describe('Dietary fiber in grams per serving if printed, otherwise omit'),
	sugarPerServing: z.number().optional().describe('Total sugars in grams per serving if printed, otherwise omit'),
	sodiumPerServing: z.number().optional().describe('Sodium in grams PER SERVING (convert mg to g by dividing by 1000)'),

	// Per-100g values if explicitly printed on the label (many Indian/EU labels have both)
	caloriesPer100g: z.number().optional().describe('Calories per 100g if EXPLICITLY printed on label, otherwise omit'),
	proteinPer100g: z.number().optional().describe('Protein per 100g if EXPLICITLY printed, otherwise omit'),
	carbsPer100g: z.number().optional().describe('Carbs per 100g if EXPLICITLY printed, otherwise omit'),
	fatPer100g: z.number().optional().describe('Fat per 100g if EXPLICITLY printed, otherwise omit'),

	// Extras
	ingredients: z.string().optional().describe('Ingredients list as text if visible on label'),
	allergens: z.array(z.string()).optional().describe('Allergens explicitly listed (e.g. ["milk", "wheat"])'),

	// Extraction quality
	confidence: z.number().min(0).max(100).describe(
		'How clearly could you read the label? 90-100 = crystal clear, 60-89 = legible but some blur, below 60 = had to guess'
	),
	extractionNotes: z.string().optional().describe('Any caveats — e.g. "label partially obscured", "values may be per 100g not per serving"'),
});

// ============================================================================
// AI PROVIDER
// ============================================================================

function createAIProvider(env: Env) {
	const gateway = createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
	return gateway('google/gemini-2.5-flash');
}

// ============================================================================
// PROMPT
// ============================================================================

function buildLabelPrompt(productNameHint?: string): string {
	return `You are a nutrition facts extractor. You will receive an image of food packaging that contains a nutrition/ingredient table. The table may be on any background color (yellow, red, green, etc.) and in any language format (US, Indian FSSAI, EU).

${productNameHint ? `Product hint: ${productNameHint}` : ''}

Look for a table that contains rows like:
- Energy / Calories / Kcal
- Protein
- Carbohydrates / Carbs
- Fat / Fats
- Fiber / Fibre
- Sugar / Sugars
- Sodium

The table header may say "Nutritional Facts", "Nutrition Facts", "Nutritional Information", or similar.
The columns may be labeled "per 100g", "per serving", "per 40g serving", etc.

INSTRUCTIONS:
1. Find the nutrition table in the image (even if it is on a colorful background)
2. Read EVERY NUMBER verbatim — do not estimate
3. If the table has TWO columns (e.g., per 100g AND per serving), fill in BOTH sets of fields
4. For sodiumPerServing: convert mg → g (divide by 1000). E.g. 6.7mg → 0.0067
5. For serving size: extract the NUMBER only (e.g., if it says "40g serving", servingSize=40, servingUnit="g")
6. If you can read the numbers clearly, set confidence 80-100
7. Set productName from what you can see on the package

Now extract all the nutrition data from the image.`;
}

// ============================================================================
// HANDLER
// ============================================================================

export async function handleNutritionLabelScan(c: Context<{ Bindings: Env; Variables: AuthContext }>) {
	const startTime = Date.now();

	try {
		// Auth check
		const user = c.get('user') as AuthContext['user'];
		if (!user) {
			throw new APIError('Authentication required', 401, ErrorCode.UNAUTHORIZED);
		}

		// Parse and validate body
		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ success: false, error: 'Invalid JSON body' }, 400);
		}

		const parsed = LabelScanRequestSchema.safeParse(body);
		if (!parsed.success) {
			throw new APIError(
				`Invalid request: ${parsed.error.flatten().formErrors.join(', ') || 'Invalid input'}`,
				400,
				ErrorCode.VALIDATION_ERROR,
			);
		}

		const request: LabelScanRequest = parsed.data;

		// Validate image format
		if (!request.imageBase64.startsWith('data:image/')) {
			throw new APIError(
				'Invalid image format. Expected base64 data URL (data:image/...)',
				400,
				ErrorCode.VALIDATION_ERROR,
			);
		}

		console.log(`[LabelScan] Processing label image for user ${user.id}`);

		const model = createAIProvider(c.env);
		const prompt = buildLabelPrompt(request.productName);

		const { object } = await generateObject({
			model,
			schema: NutritionLabelSchema,
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: prompt },
						{ type: 'image', image: request.imageBase64 },
					],
				},
			],
			mode: 'json',
		});

		const processingTime = Date.now() - startTime;
		console.log(`[LabelScan] Done in ${processingTime}ms — confidence ${object.confidence}`);

		// ── Normalise to per-100g ──────────────────────────────────────────────
		// If label only gives per-serving, we scale to per-100g for consistency
		// with ScannedProduct.nutrition which the app always stores as per-100g.
		const servingG = object.servingSize; // treat as grams (covers "g" and "ml" for practical purposes)
		const scale = servingG > 0 ? 100 / servingG : 1;

		const per100g = {
			calories: object.caloriesPer100g ?? Math.round(object.caloriesPerServing * scale),
			protein:  object.proteinPer100g  ?? Math.round(object.proteinPerServing  * scale * 10) / 10,
			carbs:    object.carbsPer100g    ?? Math.round(object.carbsPerServing    * scale * 10) / 10,
			fat:      object.fatPer100g      ?? Math.round(object.fatPerServing      * scale * 10) / 10,
			fiber:    object.fiberPerServing  != null ? Math.round(object.fiberPerServing  * scale * 10) / 10 : undefined,
			sugar:    object.sugarPerServing  != null ? Math.round(object.sugarPerServing  * scale * 10) / 10 : undefined,
			sodium:   object.sodiumPerServing != null ? Math.round(object.sodiumPerServing * scale * 100) / 100 : undefined,
		};

		return c.json({
			success: true,
			data: {
				// Identity
				productName: object.productName,
				brand:       object.brand,

				// Serving (for display + further scaling on client)
				servingSize: object.servingSize,
				servingUnit: object.servingUnit,

				// Per-serving (for display in ProductDetailsModal)
				perServing: {
					calories: object.caloriesPerServing,
					protein:  object.proteinPerServing,
					carbs:    object.carbsPerServing,
					fat:      object.fatPerServing,
					fiber:    object.fiberPerServing,
					sugar:    object.sugarPerServing,
					sodium:   object.sodiumPerServing,
				},

				// Per-100g (what ScannedProduct.nutrition expects)
				per100g,

				// Extras
				ingredients:      object.ingredients,
				allergens:        object.allergens,
				confidence:       object.confidence,
				extractionNotes:  object.extractionNotes,

				source: 'vision-label',
			},
			metadata: {
				processingTime,
				model: 'google/gemini-2.5-flash',
				userId: user.id,
			},
		});
	} catch (error) {
		const processingTime = Date.now() - startTime;
		console.error('[LabelScan] Error:', error);

		if (error instanceof APIError) {
			return c.json({ success: false, error: error.message, code: error.errorCode }, error.statusCode as any);
		}

		if (error instanceof Error) {
			if (error.message.includes('quota') || error.message.includes('429')) {
				return c.json(
					{ success: false, error: 'AI service temporarily unavailable. Please try again in a few minutes.', code: ErrorCode.RATE_LIMIT_EXCEEDED },
					429,
				);
			}
			if (error.message.includes('image') || error.message.includes('vision')) {
				return c.json(
					{ success: false, error: 'Could not process image. Please ensure the label is well-lit and the image is sharp.', code: ErrorCode.VALIDATION_ERROR },
					400,
				);
			}
		}

		return c.json(
			{
				success: false,
				error: 'Failed to scan nutrition label. Please try again.',
				code: ErrorCode.INTERNAL_ERROR,
				metadata: { processingTime },
			},
			500,
		);
	}
}

export default handleNutritionLabelScan;
