/**
 * FitAI Workers - AI-First Diet Generation Handler
 *
 * **Phase 1 Implementation: 100% AI-First Approach**
 *
 * Key Features:
 * - AI generates freely from full food knowledge (10,000+ dishes)
 * - Regional cuisine detection (Indian, Mexican, Chinese, etc.)
 * - Cooking method preferences (air fryer, less oil)
 * - Multi-layer validation (allergens, diet type, calorie drift)
 * - Mathematical portion adjustment to hit exact targets
 * - NO FALLBACK TEMPLATES - All errors exposed immediately
 *
 * @see IMPLEMENTATION_PLAN_AI_FIRST.md
 */

import { Context } from 'hono';
import { generateObject } from 'ai';
import { createAIProvider } from '../utils/aiProvider';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import {
	DietGenerationRequest,
	DietGenerationRequestSchema,
	DietResponseSchema,
	DietResponse,
	validateRequest,
	DietValidationError,
	DietValidationWarning,
	DietValidationResult,
	UserProfileContext,
	DietPreferences,
	BodyMetricsContext,
	AdvancedReviewContext,
	Meal,
} from '../utils/validation';
import { getCachedData, saveCachedData, CacheMetadata } from '../utils/cache';
import { ValidationError, APIError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';
import { withDeduplication } from '../utils/deduplication';
import {
	loadUserMetrics,
	loadUserProfile,
	loadUserPreferences,
	loadBodyMeasurements,
	UserHealthMetrics,
} from '../services/userMetricsService';
import { adjustForProteinTarget } from '../utils/portionAdjustment';
import { getAIConfig } from '../utils/appConfig';

// Import the new specialized diet prompt system
import { buildDietPrompt } from '../prompts/diet';
import { detectCuisine } from '../prompts/diet/types';

// ============================================================================
// AI PROVIDER CONFIGURATION
// ============================================================================

// createAIProvider is imported from ../utils/aiProvider
// Tries Vercel AI Gateway first, falls back to @ai-sdk/google via Cloudflare AI Gateway.

// ============================================================================
// NOTE: Diet prompts are now handled by specialized prompt files in
// ../prompts/diet/ (vegan.ts, vegetarian.ts, pescatarian.ts, nonVeg.ts, keto.ts)
// The buildDietPrompt function is imported from there.
// ============================================================================

// ============================================================================
// ALLERGEN VALIDATION
// ============================================================================

/**
 * Get common aliases for allergens
 * Ensures comprehensive allergen detection
 */
function getAllergenAliases(allergen: string): string[] {
	const aliases: Record<string, string[]> = {
		peanut: ['peanut', 'groundnut', 'monkey nut', 'peanut butter', 'peanut oil'],
		shellfish: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'oyster', 'clam', 'mussel', 'scallop', 'crawfish'],
		tree_nut: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut'],
		dairy: ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'whey', 'casein', 'paneer', 'ghee'],
		egg: ['egg', 'albumin', 'mayonnaise', 'mayo', 'omelette', 'omelet'],
		soy: ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'soy sauce', 'tamari'],
		// Gluten - only flag actual gluten sources, not cooking formats
		// Jowar/bajra/ragi rotis are gluten-free, so don't flag 'roti' generically
		gluten: [
			'wheat',
			'barley',
			'rye',
			'gluten',
			'wheat flour',
			'maida',
			'semolina',
			'suji',
			'rava',
			'bread',
			'pasta',
			'naan',
			'paratha',
			'chapati',
			'puri',
			'bhatura',
			'kulcha',
			'couscous',
			'seitan',
		],
		fish: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'sardine', 'anchovy', 'mackerel'],
	};

	const allergenLower = allergen.toLowerCase();

	// Find matching allergen group
	for (const [key, values] of Object.entries(aliases)) {
		if (allergenLower.includes(key) || values.some((v) => allergenLower.includes(v))) {
			return values;
		}
	}

	// If no match, return the allergen itself
	return [allergenLower];
}

/**
 * Check if food contains allergen (with alias detection and exception handling)
 */
function containsAllergen(foodName: string, allergen: string): boolean {
	const foodLower = foodName.toLowerCase();
	const allergenLower = allergen.toLowerCase();

	// Handle gluten allergen specially
	if (allergenLower === 'gluten') {
		// "Gluten-Free" or "GF" labels should NOT be flagged as containing gluten
		if (foodLower.includes('gluten-free') || foodLower.includes('gluten free') || foodLower.includes('gf')) {
			return false;
		}
		// Check gluten-free grains/millets exceptions
		if (isGlutenFreeException(foodLower)) {
			return false; // Jowar, bajra, moong dal, etc. are gluten-free
		}
	}

	// Direct match
	if (foodLower.includes(allergenLower)) {
		return true;
	}

	// Check aliases
	const aliases = getAllergenAliases(allergen);
	return aliases.some((alias) => foodLower.includes(alias));
}

// ============================================================================
// DIET TYPE VIOLATION DETECTION
// ============================================================================

/**
 * Vegan-friendly foods that contain dairy/egg keywords but are actually plant-based
 * This prevents false positives in validation
 */
const VEGAN_FRIENDLY_EXCEPTIONS = [
	// Plant-based milks
	'soy milk',
	'almond milk',
	'oat milk',
	'coconut milk',
	'rice milk',
	'cashew milk',
	'hemp milk',
	'flax milk',
	'macadamia milk',
	'pea milk',
	'hazelnut milk',
	// Nut/seed butters
	'peanut butter',
	'almond butter',
	'cashew butter',
	'sunflower butter',
	'tahini',
	'seed butter',
	'nut butter',
	'cocoa butter',
	'shea butter',
	'mango butter',
	// Plant-based creams
	'coconut cream',
	'cashew cream',
	'oat cream',
	'soy cream',
	// Vegan cheese/dairy alternatives
	'vegan cheese',
	'nutritional yeast',
	'dairy-free',
	'plant-based',
	// Vegan yogurt alternatives
	'vegan yogurt',
	'vegan yoghurt',
	'coconut yogurt',
	'coconut yoghurt',
	'almond yogurt',
	'almond yoghurt',
	'soy yogurt',
	'soy yoghurt',
	'oat yogurt',
	'oat yoghurt',
	'cashew yogurt',
	'cashew yoghurt',
	'plant-based yogurt',
	'dairy-free yogurt',
	// Vegan egg alternatives
	'tofu scramble',
	'chickpea omelette',
	'vegan egg',
	'flax egg',
	'chia egg',
	'aquafaba',
	'just egg',
	// Butternut squash (contains 'butter' keyword)
	'butternut',
	'butterbeans',
	'butter beans',
	'butterfly',
];

/**
 * Check if food is a vegan-friendly exception
 * Returns true if the food name matches a known plant-based alternative
 */
function isVeganFriendlyException(foodName: string): boolean {
	const foodLower = foodName.toLowerCase();
	return VEGAN_FRIENDLY_EXCEPTIONS.some((exception) => foodLower.includes(exception));
}

/**
 * Gluten-free foods that might trigger false positives
 * Indian millets, legumes, and gluten-free grains
 */
const GLUTEN_FREE_EXCEPTIONS = [
	// Gluten-free Indian rotis/breads
	'jowar',
	'bajra',
	'ragi',
	'nachni',
	'makki',
	'buckwheat',
	'amaranth',
	'quinoa',
	'rice flour',
	'besan',
	'chickpea flour',
	'gram flour',
	'almond flour',
	'coconut flour',
	'tapioca',
	'sorghum',
	'millet',
	// Gluten-free grains
	'corn',
	'maize',
	'polenta',
	'teff',
	'arrowroot',
	// Gluten-free dals/legumes (all dals are naturally gluten-free)
	'moong',
	'mung',
	'masoor',
	'toor',
	'chana',
	'urad',
	'dal',
	'lentil',
];

/**
 * Check if food is a gluten-free exception
 */
function isGlutenFreeException(foodName: string): boolean {
	const foodLower = foodName.toLowerCase();
	return GLUTEN_FREE_EXCEPTIONS.some((exception) => foodLower.includes(exception));
}

/**
 * Check for diet type violations
 * Returns array of validation errors if violations found
 */
function checkDietTypeViolations(meals: Meal[], dietType: string, restrictions?: string[]): DietValidationError[] {
	const errors: DietValidationError[] = [];

	const meatKeywords = ['chicken', 'beef', 'pork', 'mutton', 'lamb', 'goat', 'turkey', 'duck', 'bacon', 'sausage', 'ham'];
	const fishKeywords = ['fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'crab', 'lobster', 'sardine', 'anchovy', 'mackerel'];
	const dairyKeywords = ['milk', 'cheese', 'yogurt', 'yoghurt', 'paneer', 'butter', 'ghee', 'cream', 'whey'];
	const eggKeywords = ['egg', 'omelette', 'omelet', 'scrambled', 'albumin'];

	for (const meal of meals) {
		for (const food of meal.foods) {
			const foodLower = food.name.toLowerCase();

			// Skip validation for known vegan-friendly foods
			if (isVeganFriendlyException(foodLower)) {
				continue;
			}

			// Vegan checks (strictest)
			if (dietType.toLowerCase() === 'vegan') {
				if (meatKeywords.some((k) => foodLower.includes(k))) {
					errors.push({
						severity: 'CRITICAL',
						code: 'DIET_TYPE_VIOLATION',
						message: `Vegan diet cannot contain meat: "${food.name}"`,
						meal: meal.name,
						food: food.name,
						dietType,
					});
				}
				if (fishKeywords.some((k) => foodLower.includes(k))) {
					errors.push({
						severity: 'CRITICAL',
						code: 'DIET_TYPE_VIOLATION',
						message: `Vegan diet cannot contain fish/seafood: "${food.name}"`,
						meal: meal.name,
						food: food.name,
						dietType,
					});
				}
				if (dairyKeywords.some((k) => foodLower.includes(k))) {
					errors.push({
						severity: 'CRITICAL',
						code: 'DIET_TYPE_VIOLATION',
						message: `Vegan diet cannot contain dairy: "${food.name}"`,
						meal: meal.name,
						food: food.name,
						dietType,
					});
				}
				if (eggKeywords.some((k) => foodLower.includes(k))) {
					errors.push({
						severity: 'CRITICAL',
						code: 'DIET_TYPE_VIOLATION',
						message: `Vegan diet cannot contain eggs: "${food.name}"`,
						meal: meal.name,
						food: food.name,
						dietType,
					});
				}
			}

			// Vegetarian checks
			if (dietType.toLowerCase() === 'vegetarian') {
				if (meatKeywords.some((k) => foodLower.includes(k))) {
					errors.push({
						severity: 'CRITICAL',
						code: 'DIET_TYPE_VIOLATION',
						message: `Vegetarian diet cannot contain meat: "${food.name}"`,
						meal: meal.name,
						food: food.name,
						dietType,
					});
				}
				if (fishKeywords.some((k) => foodLower.includes(k))) {
					errors.push({
						severity: 'CRITICAL',
						code: 'DIET_TYPE_VIOLATION',
						message: `Vegetarian diet cannot contain fish/seafood: "${food.name}"`,
						meal: meal.name,
						food: food.name,
						dietType,
					});
				}
				// BUG-74: Respect explicit egg_free / dairy_free restrictions for vegetarians
				if (restrictions?.includes('egg_free') && eggKeywords.some((k) => foodLower.includes(k))) {
					errors.push({
						severity: 'CRITICAL',
						code: 'DIET_TYPE_VIOLATION',
						message: `Vegetarian (egg-free) diet cannot contain eggs: "${food.name}"`,
						meal: meal.name,
						food: food.name,
						dietType,
					});
				}
				if (restrictions?.includes('dairy_free') && dairyKeywords.some((k) => foodLower.includes(k))) {
					errors.push({
						severity: 'CRITICAL',
						code: 'DIET_TYPE_VIOLATION',
						message: `Vegetarian (dairy-free) diet cannot contain dairy: "${food.name}"`,
						meal: meal.name,
						food: food.name,
						dietType,
					});
				}
			}

			// Pescatarian checks
			if (dietType.toLowerCase() === 'pescatarian') {
				if (meatKeywords.some((k) => foodLower.includes(k))) {
					errors.push({
						severity: 'CRITICAL',
						code: 'DIET_TYPE_VIOLATION',
						message: `Pescatarian diet cannot contain meat: "${food.name}"`,
						meal: meal.name,
						food: food.name,
						dietType,
					});
				}
			}
		}
	}

	return errors;
}

// ============================================================================
// COMPREHENSIVE VALIDATION
// ============================================================================

const MICRONUTRIENT_SOURCE_KEYWORDS: Record<string, string[]> = {
	iron: ['spinach', 'lentil', 'chickpea', 'bean', 'rajma', 'red meat', 'beef', 'liver', 'tofu', 'pumpkin seed'],
	calcium: ['milk', 'yogurt', 'curd', 'cheese', 'paneer', 'tofu', 'sesame', 'sardine', 'fortified'],
	omega_3: ['salmon', 'sardine', 'mackerel', 'herring', 'chia', 'flax', 'walnut'],
	vitamin_c: ['orange', 'lemon', 'amla', 'guava', 'kiwi', 'berry', 'bell pepper', 'broccoli'],
	vitamin_a: ['carrot', 'sweet potato', 'pumpkin', 'spinach', 'kale', 'mango', 'egg yolk', 'liver'],
	vitamin_b12: ['egg', 'milk', 'yogurt', 'cheese', 'fish', 'chicken', 'beef', 'fortified', 'nutritional yeast'],
	vitamin_d: ['salmon', 'sardine', 'fortified', 'egg yolk', 'mushroom'],
	magnesium: ['almond', 'cashew', 'pumpkin seed', 'spinach', 'bean', 'lentil', 'oat', 'dark chocolate'],
	potassium: ['banana', 'potato', 'sweet potato', 'bean', 'yogurt', 'coconut water', 'spinach', 'avocado'],
};

function getDailyFiberTarget(metrics: UserHealthMetrics): number {
	if (metrics.daily_fiber_g && metrics.daily_fiber_g > 0) {
		return metrics.daily_fiber_g;
	}

	return Math.max(25, Math.round((metrics.daily_calories / 1000) * 14));
}

function buildMicronutrientCoverageWarnings(
	meals: Meal[],
	aiResponse: DietResponse,
	metrics: UserHealthMetrics,
	prefs: DietPreferences | null,
	daysCount: number,
): DietValidationWarning[] {
	const warnings: DietValidationWarning[] = [];
	const planDays = Math.max(1, daysCount);
	const foodNames = meals.flatMap((meal) => meal.foods.map((food) => food.name.toLowerCase()));
	const totalFiber = aiResponse.totalNutrition.fiber;
	const totalSodium = aiResponse.totalNutrition.sodium;
	const totalSugar = aiResponse.totalNutrition.sugar;
	const fiberTarget = getDailyFiberTarget(metrics) * planDays;
	const sodiumLimit = 2300 * planDays;
	const sugarLimit = 50 * planDays;

	if (typeof totalFiber === 'number' && totalFiber < fiberTarget * 0.85) {
		warnings.push({
			severity: 'WARNING',
			code: 'LOW_FIBER',
			message: `Fiber is ${totalFiber}g for the full plan; target is about ${fiberTarget}g.`,
			type: 'low_fiber',
			suggestion: 'Add legumes, vegetables, fruits, seeds, and whole grains across the week.',
		});
	}

	if (typeof totalSodium === 'number' && totalSodium > sodiumLimit) {
		warnings.push({
			severity: 'WARNING',
			code: 'HIGH_SODIUM',
			message: `Sodium is ${totalSodium}mg for the full plan, above the ${sodiumLimit}mg guideline.`,
			type: 'high_sodium',
			suggestion: 'Reduce packaged foods and salty sauces; use fresh herbs, lemon, and spices.',
		});
	}

	if (typeof totalSugar === 'number' && totalSugar > sugarLimit) {
		warnings.push({
			severity: 'INFO',
			code: 'HIGH_SUGAR',
			message: `Sugar is ${totalSugar}g for the full plan, above the ${sugarLimit}g guideline.`,
			suggestion: 'Prefer whole-fruit sweetness and reduce desserts or sweetened drinks.',
		});
	}

	const uncoveredNutrients = Object.entries(MICRONUTRIENT_SOURCE_KEYWORDS)
		.filter(([, keywords]) => !keywords.some((keyword) => foodNames.some((food) => food.includes(keyword))))
		.map(([nutrient]) => nutrient.replace(/_/g, ' '));

	if (uncoveredNutrients.length > 0) {
		warnings.push({
			severity: uncoveredNutrients.length >= 3 ? 'WARNING' : 'INFO',
			code: 'MICRONUTRIENT_COVERAGE_GAPS',
			message: `Potential weekly micronutrient gaps detected for: ${uncoveredNutrients.join(', ')}.`,
			affectedItems: uncoveredNutrients,
			suggestions: [
				'Rotate leafy greens, legumes, dairy or fortified alternatives, seeds, colorful produce, and omega-3 sources.',
				`Recheck food variety for the ${prefs?.diet_type || 'current'} diet pattern.`,
			],
		});
	}

	return warnings;
}

/**
 * Validate AI-generated diet plan with multi-layer checks
 *
 * **Critical Validation (Blocks Plan):**
 * 1. Allergen detection (with aliases)
 * 2. Diet type violations
 * 3. Extreme calorie drift (>30%)
 * 4. Missing required fields
 *
 * **Quality Warnings (Non-Blocking):**
 * 1. Moderate calorie drift (10-30%)
 * 2. Low protein (<80% of target)
 * 3. Low food variety
 *
 * @param aiResponse - AI-generated meal plan
 * @param metrics - User's calculated metrics
 * @param prefs - User's diet preferences
 * @param daysCount - Number of days represented by the plan
 * @returns Validation result with errors and warnings
 */
function validateDietPlan(
	aiResponse: DietResponse,
	metrics: UserHealthMetrics,
	prefs: DietPreferences | null,
	daysCount: number = 1,
): DietValidationResult {
	const errors: DietValidationError[] = [];
	const warnings: DietValidationWarning[] = [];
	const planDays = Math.max(1, daysCount);
	const calorieTarget = metrics.daily_calories * planDays;
	const proteinTarget = metrics.daily_protein_g * planDays;

	console.log('[DietValidation] Starting comprehensive validation');

	// ==========================================
	// CRITICAL VALIDATION (Must Pass)
	// ==========================================

	// 1. ALLERGEN CHECK (CRITICAL)
	const allergies = prefs?.allergies || [];
	for (const meal of aiResponse.meals) {
		for (const food of meal.foods) {
			for (const allergen of allergies) {
				if (containsAllergen(food.name, allergen)) {
					errors.push({
						severity: 'CRITICAL',
						code: 'ALLERGEN_DETECTED',
						message: `CRITICAL: Contains allergen "${allergen}" in food "${food.name}"`,
						meal: meal.name,
						food: food.name,
						allergen: allergen,
					});

					console.error('[DietValidation] ALLERGEN DETECTED:', {
						meal: meal.name,
						food: food.name,
						allergen,
					});
				}
			}
		}
	}

	// 2. DIET TYPE VIOLATION CHECK (CRITICAL)
	if (!prefs?.diet_type) {
		console.error('[DietValidation] diet_type missing — skipping diet violation check');
	} else {
		const dietViolations = checkDietTypeViolations(aiResponse.meals, prefs.diet_type, prefs.restrictions);
		if (dietViolations.length > 0) {
			errors.push(...dietViolations);
			console.error('[DietValidation] DIET TYPE VIOLATIONS:', dietViolations.length);
		}
	}

	// 3. EXTREME CALORIE DRIFT CHECK (CRITICAL - >20% off)
	const totalCal = aiResponse.totalCalories;
	const targetCal = calorieTarget;
	const calorieDrift = Math.abs(totalCal - targetCal) / targetCal;

	if (calorieDrift > 0.2) {
		// More than 20% off target — hard block
		errors.push({
			severity: 'CRITICAL',
			code: 'EXTREME_CALORIE_DRIFT',
			message: `CRITICAL: Extreme calorie deviation: ${totalCal} cal vs ${targetCal} cal target (${(calorieDrift * 100).toFixed(0)}% off)`,
			current: totalCal,
			target: targetCal,
			drift: calorieDrift,
		});

		console.error('[DietValidation] EXTREME CALORIE DRIFT:', {
			current: totalCal,
			target: targetCal,
			drift: `${(calorieDrift * 100).toFixed(1)}%`,
		});
	}

	// 4. MISSING REQUIRED FIELDS CHECK
	for (const meal of aiResponse.meals) {
		if (!meal.name || !meal.mealType || !meal.foods || meal.foods.length === 0) {
			errors.push({
				severity: 'CRITICAL',
				code: 'MISSING_REQUIRED_FIELDS',
				message: `CRITICAL: Meal missing required fields (name, type, or foods)`,
				meal: meal.name || 'Unknown',
			});
		}

		for (const food of meal.foods) {
			if (!food.name || food.nutrition.calories === undefined || food.nutrition.protein === undefined) {
				errors.push({
					severity: 'CRITICAL',
					code: 'INCOMPLETE_FOOD_DATA',
					message: `CRITICAL: Food "${food.name}" missing nutrition data`,
					meal: meal.name,
					food: food.name,
				});
			}
		}
	}

	// ==========================================
	// QUALITY WARNINGS (Non-blocking)
	// ==========================================

	// 1. MODERATE CALORIE DRIFT (10-30% off)
	if (calorieDrift > 0.1 && calorieDrift <= 0.3) {
		warnings.push({
			severity: 'WARNING',
			code: 'MODERATE_CALORIE_DRIFT',
			message: `Calories need adjustment: ${totalCal} vs ${targetCal} (will auto-adjust portions)`,
			action: 'ADJUST_PORTIONS',
		});

		console.warn('[DietValidation] Moderate calorie drift - will adjust portions');
	}

	// 2. LOW PROTEIN WARNING (<80% of target)
	const proteinRatio = aiResponse.totalNutrition.protein / proteinTarget;
	if (proteinRatio < 0.8) {
		warnings.push({
			severity: 'WARNING',
			code: 'LOW_PROTEIN',
			message: `Protein is ${aiResponse.totalNutrition.protein}g, target is ${proteinTarget}g (${(proteinRatio * 100).toFixed(0)}%)`,
			action: 'LOG_FOR_AI_IMPROVEMENT',
		});

		console.warn('[DietValidation] Low protein:', {
			actual: aiResponse.totalNutrition.protein,
			target: proteinTarget,
			ratio: `${(proteinRatio * 100).toFixed(1)}%`,
		});
	}

	// 3. LOW FOOD VARIETY CHECK
	const allFoods = aiResponse.meals.flatMap((m) => m.foods.map((f) => f.name.toLowerCase()));
	const uniqueFoods = new Set(allFoods);
	const varietyRatio = uniqueFoods.size / allFoods.length;

	if (varietyRatio < 0.6) {
		// Less than 60% unique foods
		warnings.push({
			severity: 'INFO',
			code: 'LOW_VARIETY',
			message: `Food variety is low (${uniqueFoods.size} unique foods out of ${allFoods.length} total)`,
			action: 'LOG_FOR_AI_IMPROVEMENT',
		});

		console.warn('[DietValidation] Low variety:', {
			unique: uniqueFoods.size,
			total: allFoods.length,
			ratio: `${(varietyRatio * 100).toFixed(1)}%`,
		});
	}

	warnings.push(
		...buildMicronutrientCoverageWarnings(
			aiResponse.meals,
			aiResponse,
			metrics,
			prefs,
			planDays,
		),
	);

	// Log validation summary
	console.log('[DietValidation] Validation complete:', {
		isValid: errors.length === 0,
		criticalErrors: errors.length,
		warnings: warnings.length,
	});

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

function mergeProfileContext(
	storedProfile: UserProfileContext | null,
	request: DietGenerationRequest,
): UserProfileContext | null {
	const override = request.profile;

	if (!storedProfile && !override && !request.country) {
		return null;
	}

	return {
		...(storedProfile || {}),
		...(override || {}),
		country: override?.country ?? request.country ?? storedProfile?.country,
	};
}

function mergeDietPreferences(
	storedPrefs: DietPreferences | null,
	request: DietGenerationRequest,
): DietPreferences | null {
	const override = request.dietPreferences;
	const hasRestrictions = (request.dietaryRestrictions?.length ?? 0) > 0;

	if (!storedPrefs && !override && !request.excludeIngredients?.length && !hasRestrictions) {
		return null;
	}

	const dislikes = [
		...(override?.dislikes || []),
		...(request.excludeIngredients || []),
	];

	// Warn on conflicting restrictions before deriving diet type (FIX-D)
	if (request.dietaryRestrictions?.includes('vegan') && request.dietaryRestrictions?.includes('vegetarian')) {
		console.warn('[dietGen] Conflicting restrictions: both vegan and vegetarian specified. Using vegan.');
	}

	// Derive diet_type from dietaryRestrictions when not explicitly set (BUG-73)
	const derivedDietType = request.dietaryRestrictions?.includes('vegan') ? 'vegan' :
		request.dietaryRestrictions?.includes('vegetarian') ? 'vegetarian' :
		request.dietaryRestrictions?.includes('pescatarian') ? 'pescatarian' : undefined;

	return {
		...(storedPrefs || {}),
		...(override || {}),
		diet_type: override?.diet_type ?? storedPrefs?.diet_type ?? derivedDietType,
		dislikes: dislikes.length > 0 ? [...new Set(dislikes)] : storedPrefs?.dislikes,
		restrictions:
			override?.restrictions ??
			storedPrefs?.restrictions ??
			request.dietaryRestrictions,
		allergies: override?.allergies ?? storedPrefs?.allergies,
	};
}

function mergeBodyMetricsContext(
	storedBody: BodyMetricsContext | null,
	request: DietGenerationRequest,
): BodyMetricsContext | null {
	const override = request.bodyMetrics;

	if (!storedBody && !override) {
		return null;
	}

	return {
		...(storedBody || {}),
		...(override || {}),
	};
}

function mergeHealthMetrics(
	storedMetrics: UserHealthMetrics,
	request: DietGenerationRequest,
): UserHealthMetrics {
	const override = request.advancedReview;
	const calorieTarget = override?.daily_calories ?? request.calorieTarget;
	const derivedFiberTarget =
		override?.daily_fiber_g ??
		storedMetrics.daily_fiber_g ??
		Math.max(25, Math.round(((calorieTarget || storedMetrics.daily_calories) / 1000) * 14));

	return {
		...storedMetrics,
		daily_calories: calorieTarget ?? storedMetrics.daily_calories,
		daily_protein_g: override?.daily_protein_g ?? storedMetrics.daily_protein_g,
		daily_carbs_g: override?.daily_carbs_g ?? storedMetrics.daily_carbs_g,
		daily_fat_g: override?.daily_fat_g ?? storedMetrics.daily_fat_g,
		daily_water_ml: override?.daily_water_ml ?? storedMetrics.daily_water_ml,
		daily_fiber_g: derivedFiberTarget,
		calculated_bmi: override?.calculated_bmi ?? storedMetrics.calculated_bmi,
		bmi_category: override?.bmi_category ?? storedMetrics.bmi_category,
		health_score: override?.health_score ?? storedMetrics.health_score,
	};
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * POST /diet/generate - Generate personalized diet plan (AI-First Approach)
 *
 * **NO FALLBACK TEMPLATES** - All errors are exposed immediately
 *
 * Flow:
 * 1. Load user metrics from database
 * 2. Build comprehensive AI prompt
 * 3. Generate with AI (full freedom)
 * 4. Validate (allergens, diet type, calories)
 * 5. Adjust portions mathematically
 * 6. Return or fail with detailed error
 */
export async function handleDietGeneration(c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>): Promise<Response> {
	const startTime = Date.now();

	try {
		// 1. Validate request
		const rawBody = await c.req.json();
		const request: DietGenerationRequest = validateRequest(DietGenerationRequestSchema, rawBody);

		console.log('[Diet Generation] Request validated:', {
			calorieTarget: request.calorieTarget,
			mealsPerDay: request.mealsPerDay,
			restrictions: request.dietaryRestrictions?.length || 0,
		});

		// Get authenticated user ID (if available)
		const user = c.get('user');
		const userId = user?.id;

		if (!userId) {
			throw new APIError('User ID required for AI-first diet generation', 401, ErrorCode.UNAUTHORIZED, {
				message: 'Please log in to generate personalized diet plans',
			});
		}

		// 2. Check cache (3-tier: KV → Database → Fresh)
		const cacheParams = {
			calorieTarget: request.calorieTarget,
			mealsPerDay: request.mealsPerDay,
			macros: request.macros ? `${request.macros.protein}-${request.macros.carbs}-${request.macros.fats}` : 'default',
			restrictions: request.dietaryRestrictions?.sort().join(',') || 'none',
			excludes: request.excludeIngredients?.sort().join(',') || 'none',
		};

		// 2. Check cache (3-tier: KV → Database → Fresh) — skipped if skipCache=true
		const cacheResult = request.skipCache
			? { hit: false, source: 'fresh' as const, cacheKey: undefined }
			: await getCachedData(c.env, 'meal', cacheParams, userId);

		if (cacheResult.hit) {
			console.log(`[Diet Generation] Cache HIT from ${cacheResult.source}`);

			return c.json(
				{
					success: true,
					data: cacheResult.data,
					metadata: {
						cached: true,
						cacheSource: cacheResult.source,
						generationTime: Date.now() - startTime,
					},
				},
				200,
			);
		}

		console.log('[Diet Generation] Cache MISS - generating fresh diet plan');

		// Safe cache key — cacheResult.cacheKey may be undefined on cache miss (FIX-C)
		const cacheKey = cacheResult?.cacheKey ?? `diet_${userId}_${Date.now()}`;

		// 3. Check if async mode is enabled (default: true)
		if (request.async !== false) {
			console.log('[Diet Generation] Async mode enabled - creating job');

			const { createJob } = await import('../services/jobService');

			// Create job in database + KV
			const { jobId, isExisting } = await createJob(c.env, userId, cacheKey, {
				calorieTarget: request.calorieTarget,
				mealsPerDay: request.mealsPerDay,
				daysCount: request.daysCount,
				macros: request.macros,
				dietaryRestrictions: request.dietaryRestrictions,
				excludeIngredients: request.excludeIngredients,
				profile: request.profile,
				dietPreferences: request.dietPreferences,
				bodyMetrics: request.bodyMetrics,
				advancedReview: request.advancedReview,
				model: request.model,
				temperature: request.temperature,
			});

			// Send to queue (only if newly created)
			if (!isExisting) {
				let queueSent = false;

				// Try to send to queue if available (paid plan)
				if (c.env.DIET_GENERATION_QUEUE) {
					try {
						await c.env.DIET_GENERATION_QUEUE.send({
							jobId,
							userId,
							cacheKey: cacheKey,
							params: {
								calorieTarget: request.calorieTarget,
								mealsPerDay: request.mealsPerDay,
								daysCount: request.daysCount,
								macros: request.macros,
								dietaryRestrictions: request.dietaryRestrictions,
								excludeIngredients: request.excludeIngredients,
								profile: request.profile,
								dietPreferences: request.dietPreferences,
								bodyMetrics: request.bodyMetrics,
								advancedReview: request.advancedReview,
								model: request.model,
								temperature: request.temperature,
							},
							metadata: {
								createdAt: new Date().toISOString(),
								priority: 0,
							},
						});

						queueSent = true;
						console.log(`[Diet Generation] Job ${jobId} sent to queue successfully`);
					} catch (error) {
						console.warn(
							`[Diet Generation] Queue send failed - job will be processed by cron:`,
							error instanceof Error ? error.message : error,
						);
					}
				} else {
					console.log('[Diet Generation] Queue not available (free plan) - using cron fallback');
				}

				// Return appropriate message based on queue availability
				return c.json(
					{
						success: true,
						data: {
							jobId,
							status: 'pending',
							message: queueSent
								? 'Job queued successfully. Processing will start shortly. Poll GET /diet/jobs/:jobId for status.'
								: 'Job created successfully. Processing will start within 1 minute (cron fallback). Poll GET /diet/jobs/:jobId for status.',
							estimatedTimeMinutes: request.daysCount * 0.5, // Rough estimate: 30s per day
						},
					},
					202,
				);
			} else {
				console.log(`[Diet Generation] Job ${jobId} already exists - returning existing job`);

				// Return 202 Accepted with existing job ID
				return c.json(
					{
						success: true,
						data: {
							jobId,
							status: 'processing',
							message: 'Job already in progress. Use GET /diet/jobs/:jobId to check status.',
						},
					},
					202,
				);
			}
		}

		console.log('[Diet Generation] Sync mode - generating immediately');

		// 4. Use deduplication to prevent duplicate AI calls during burst traffic
		const deduplicationResult = await withDeduplication(c.env, cacheKey, async () => {
			// This function will only execute if no identical request is in-flight
			return await generateFreshDiet(request, c.env, userId);
		});

		if (deduplicationResult.deduplicated) {
			console.log(`[Diet Generation] DEDUPLICATED! Waited ${deduplicationResult.waitTime}ms`);

			return c.json(
				{
					success: true,
					data: deduplicationResult.data.diet,
					metadata: {
						...deduplicationResult.data.metadata,
						cached: false,
						deduplicated: true,
						waitTime: deduplicationResult.waitTime,
						generationTime: Date.now() - startTime,
					},
				},
				200,
			);
		}

		// Request was not deduplicated - we generated it fresh
		console.log('[Diet Generation] Generated fresh (no deduplication)');
		const dietResult = deduplicationResult.data;
		const aiGenerationTime = dietResult.metadata.aiGenerationTime;

		// 5. Save to cache (KV + Database)
		const cacheMetadata: CacheMetadata = {
			modelUsed: dietResult.metadata.model,
			generationTimeMs: aiGenerationTime,
			tokensUsed: dietResult.metadata.tokensUsed,
			costUsd: dietResult.metadata.costUsd,
		};

		await saveCachedData(c.env, 'meal', cacheKey, dietResult.diet, cacheMetadata, userId);

		console.log('[Diet Generation] Cached successfully');

		// 6. Return response
		const totalTime = Date.now() - startTime;

		return c.json(
			{
				success: true,
				data: dietResult.diet,
				metadata: {
					...dietResult.metadata,
					generationTime: totalTime,
					cached: false,
					deduplicated: false,
				},
			},
			200,
		);
	} catch (error) {
		console.error('[Diet Generation] Error:', error);

		if (error instanceof ValidationError || error instanceof APIError) {
			throw error;
		}

		if (error instanceof Error && error.message.includes('timed out after 150s')) {
			throw new APIError('Diet generation timed out. Please try again.', 408, ErrorCode.AI_GENERATION_FAILED, {
				error: error.message,
			});
		}

		throw new APIError('Failed to generate diet plan. Please try again.', 500, ErrorCode.AI_GENERATION_FAILED, {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

// ============================================================================
// FRESH DIET GENERATION (Extracted for Deduplication)
// ============================================================================

/**
 * Generate a fresh diet plan (used by deduplication wrapper)
 *
 * **AI-First Flow:**
 * 1. Load user metrics, profile, preferences
 * 2. Build comprehensive prompt
 * 3. Generate with AI (NO food filtering)
 * 4. Validate (allergens, diet type, calories)
 * 5. Adjust portions if needed
 * 6. Return or throw detailed error
 */
export async function generateFreshDiet(request: DietGenerationRequest, env: Env, userId: string) {
	console.log('[Diet Generation] Starting AI-first generation for user:', userId);

	// 1. Load user data from database
	const [storedMetrics, storedProfile, preferences, bodyContext] = await Promise.all([
		loadUserMetrics(env, userId),
		loadUserProfile(env, userId),
		loadUserPreferences(env, userId),
		loadBodyMeasurements(env, userId),
	]);
	const metrics = mergeHealthMetrics(storedMetrics, request);
	const profile = mergeProfileContext(storedProfile, request);
	const mergedDietPreferences = mergeDietPreferences(preferences.diet, request);
	const mergedBodyContext = mergeBodyMetricsContext(bodyContext, request);

	console.log('[Diet Generation] User data loaded:', {
		daily_calories: metrics.daily_calories,
		protein: metrics.daily_protein_g,
		diet_type: mergedDietPreferences?.diet_type,
		allergies: mergedDietPreferences?.allergies?.length || 0,
	});

	const planDays = Math.max(1, request.daysCount || 1);
	const planCalorieTarget = metrics.daily_calories * planDays;
	const planProteinTarget = metrics.daily_protein_g * planDays;
	const planCarbsTarget = metrics.daily_carbs_g * planDays;
	const planFatTarget = metrics.daily_fat_g * planDays;

	// 2. Build comprehensive AI prompt (NO FOOD FILTERING)
	const prompt = buildDietPrompt(
		metrics,
		profile,
		mergedDietPreferences,
		mergedBodyContext,
		planDays,
		request.excludeIngredients || [],
	);

	console.log('[Diet Generation] Prompt built. Cuisine detected:', {
		cuisine: detectCuisine(profile?.country),
		country: profile?.country,
		state: profile?.state,
	});

	// 3. Generate with AI — model comes from app_config (admin-controlled)
	const aiConfig = await getAIConfig(env);
	const model = createAIProvider(env, aiConfig.model);

	console.log('[Diet Generation] Calling AI model:', aiConfig.model);

	const aiStartTime = Date.now();
	const timeoutPromise = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error('AI generation timed out after 150s')), 150000)
	);
	const result = await Promise.race([
		generateObject({
			model,
			schema: DietResponseSchema,
			prompt,
			temperature: request.temperature || 0.7,
			// Note: maxTokens may not be supported by all models via AI Gateway
		}),
		timeoutPromise,
	]) as Awaited<ReturnType<typeof generateObject<typeof DietResponseSchema>>>;
	const aiGenerationTime = Date.now() - aiStartTime;

	// Validate AI response structure
	if (!result.object) {
		throw new APIError('AI returned empty response', 500, ErrorCode.AI_INVALID_RESPONSE, { received: result });
	}

	if (!result.object.meals || !Array.isArray(result.object.meals) || result.object.meals.length === 0) {
		throw new APIError('AI returned diet plan without meals', 500, ErrorCode.AI_INVALID_RESPONSE, { received: result.object });
	}

	console.log('[Diet Generation] AI generation complete:', {
		generationTime: aiGenerationTime + 'ms',
		mealCount: result.object.meals?.length || 0,
		totalCalories: result.object.totalCalories,
	});

	// 3.5 POST-PROCESSING: Filter out disabled meal types (safety net for prompt violations)
	const filteredMealPlanWithMergedPrefs = filterDisabledMeals(result.object, mergedDietPreferences);

	// 4. COMPREHENSIVE VALIDATION (NO FALLBACK)
	const validationResult = validateDietPlan(
		filteredMealPlanWithMergedPrefs,
		metrics,
		mergedDietPreferences,
		planDays,
	);

	// If validation FAILED - throw error (NO FALLBACK)
	if (!validationResult.isValid) {
		console.error('[Diet Generation] CRITICAL VALIDATION FAILED:', validationResult.errors);

		// Return detailed error to expose the issue
		throw new APIError('AI-generated meal plan failed critical validation', 400, ErrorCode.VALIDATION_ERROR, {
			validationErrors: validationResult.errors,
			action: 'Please retry generation or contact support',
		});
	}

	// Log warnings (non-blocking)
	if (validationResult.warnings.length > 0) {
		console.warn('[Diet Generation] Quality warnings:', validationResult.warnings);
	}

	// 5. Adjust portions to match EXACT calorie AND protein targets
	const adjustedDiet = adjustForProteinTarget(
		filteredMealPlanWithMergedPrefs,
		planCalorieTarget,
		planProteinTarget,
	);

	console.log('[Diet Generation] Portions adjusted (calorie + protein):', {
		originalCalories: filteredMealPlanWithMergedPrefs.totalCalories,
		adjustedCalories: adjustedDiet.totalCalories,
		targetCalories: planCalorieTarget,
		calorieDifference: Math.abs(adjustedDiet.totalCalories - planCalorieTarget),
		originalProtein: filteredMealPlanWithMergedPrefs.totalNutrition.protein,
		adjustedProtein: adjustedDiet.totalNutrition.protein,
		targetProtein: planProteinTarget,
		proteinDifference: Math.abs(adjustedDiet.totalNutrition.protein - planProteinTarget),
	});

	// Return diet with metadata for deduplication/caching
	return {
		diet: adjustedDiet,
		metadata: {
			model: request.model || 'google/gemini-2.5-flash',
			aiGenerationTime,
			tokensUsed: result.usage?.totalTokens,
			costUsd: calculateCost(request.model || 'google/gemini-2.5-flash', result.usage?.totalTokens || 0),
			validationPassed: true,
			warningsCount: validationResult.warnings.length,
			warnings: validationResult.warnings,
			adjustmentApplied: true,
			nutritionalAccuracy: {
				targetCalories: planCalorieTarget,
				actualCalories: adjustedDiet.totalCalories,
				difference: Math.abs(adjustedDiet.totalCalories - planCalorieTarget),
				targetProtein: planProteinTarget,
				actualProtein: adjustedDiet.totalNutrition.protein,
				targetCarbs: planCarbsTarget,
				actualCarbs: adjustedDiet.totalNutrition.carbs,
				targetFat: planFatTarget,
				actualFat: adjustedDiet.totalNutrition.fats,
			},
		},
	};
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Filter out disabled meal types from the AI-generated plan
 * This is a safety net in case AI ignores prompt instructions
 */
function filterDisabledMeals(mealPlan: DietResponse, prefs: DietPreferences | null): DietResponse {
	if (!prefs) return mealPlan;

	// Get meal type flags from preferences
	const snacksEnabled = (prefs as any)?.snacks_enabled !== false;
	const breakfastEnabled = (prefs as any)?.breakfast_enabled !== false;
	const lunchEnabled = (prefs as any)?.lunch_enabled !== false;
	const dinnerEnabled = (prefs as any)?.dinner_enabled !== false;

	// Snack meal types to filter
	const snackTypes = ['morning_snack', 'afternoon_snack', 'evening_snack'];

	// Filter meals based on enabled flags
	const filteredMeals = mealPlan.meals.filter((meal) => {
		const mealType = meal.mealType.toLowerCase();

		// Check if snacks should be excluded
		if (!snacksEnabled && snackTypes.includes(mealType)) {
			console.log('[Diet Generation] Filtering out disabled snack:', meal.name);
			return false;
		}

		// Check individual meal types
		if (!breakfastEnabled && mealType === 'breakfast') {
			console.log('[Diet Generation] Filtering out disabled breakfast:', meal.name);
			return false;
		}
		if (!lunchEnabled && mealType === 'lunch') {
			console.log('[Diet Generation] Filtering out disabled lunch:', meal.name);
			return false;
		}
		if (!dinnerEnabled && mealType === 'dinner') {
			console.log('[Diet Generation] Filtering out disabled dinner:', meal.name);
			return false;
		}

		return true;
	});

	// If meals were filtered, recalculate totals
	if (filteredMeals.length !== mealPlan.meals.length) {
		const totalNutrition = {
			calories: filteredMeals.reduce((sum, m) => sum + m.totalNutrition.calories, 0),
			protein: Math.round(filteredMeals.reduce((sum, m) => sum + m.totalNutrition.protein, 0) * 10) / 10,
			carbs: Math.round(filteredMeals.reduce((sum, m) => sum + m.totalNutrition.carbs, 0) * 10) / 10,
			fats: Math.round(filteredMeals.reduce((sum, m) => sum + m.totalNutrition.fats, 0) * 10) / 10,
			fiber: filteredMeals.some((m) => m.totalNutrition.fiber)
				? Math.round(filteredMeals.reduce((sum, m) => sum + (m.totalNutrition.fiber || 0), 0) * 10) / 10
				: undefined,
			sugar: filteredMeals.some((m) => m.totalNutrition.sugar)
				? Math.round(filteredMeals.reduce((sum, m) => sum + (m.totalNutrition.sugar || 0), 0) * 10) / 10
				: undefined,
			sodium: filteredMeals.some((m) => m.totalNutrition.sodium)
				? Math.round(filteredMeals.reduce((sum, m) => sum + (m.totalNutrition.sodium || 0), 0))
				: undefined,
		};

		console.log('[Diet Generation] Meals filtered:', {
			originalCount: mealPlan.meals.length,
			filteredCount: filteredMeals.length,
			originalCalories: mealPlan.totalCalories,
			filteredCalories: totalNutrition.calories,
		});

		return {
			...mealPlan,
			meals: filteredMeals,
			totalCalories: totalNutrition.calories,
			totalNutrition,
		};
	}

	return mealPlan;
}

/**
 * Calculate approximate API cost based on model and token usage
 * Prices as of January 2025 (subject to change)
 */
function calculateCost(modelId: string, tokens: number): number {
	const costPer1kTokens: Record<string, number> = {
		'google/gemini-2.0-flash-exp': 0.0001, // $0.10 per 1M tokens
		'google/gemini-2.5-flash': 0.0001, // $0.10 per 1M tokens
		'google/gemini-1.5-pro': 0.002, // $2.00 per 1M tokens
		'openai/gpt-4': 0.03, // $30 per 1M tokens
		'openai/gpt-3.5-turbo': 0.0015, // $1.50 per 1M tokens
	};

	const costRate = costPer1kTokens[modelId] || 0.001; // Default $1 per 1M tokens
	return (tokens / 1000) * costRate;
}
