/**
 * FitAI - Diet Prompt Router
 *
 * Routes to the correct specialized prompt based on diet type.
 * Builds placeholders from user data.
 */

import {
	DietPlaceholders,
	detectCuisine,
	getEnabledMealsList,
	getMealExclusionInstructions,
	getCookingSkillInstructions,
	getPrepTimeInstructions,
	getBudgetInstructions,
	getPersonalizedSuggestions,
} from './types';
import { buildVeganPrompt } from './vegan';
import { buildVegetarianPrompt } from './vegetarian';
import { buildPescatarianPrompt } from './pescatarian';
import { buildNonVegPrompt } from './nonVeg';
import { buildKetoPrompt } from './keto';

// Import types from validation
import {
	UserProfileContext,
	DietPreferences,
	BodyMetricsContext,
} from '../../utils/validation';
import { UserHealthMetrics } from '../../services/userMetricsService';

// ============================================================================
// PROMPT INJECTION SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitize a free-text field before injecting into an AI prompt.
 * Strips markdown control characters, newlines, and limits length.
 */
function sanitizePromptField(value: string | undefined | null): string {
	if (!value) return '';
	return value.replace(/[*_`#\[\]\{\}]/g, '').replace(/\n/g, ' ').slice(0, 150);
}

/**
 * Sanitize an array of free-text strings before injecting into an AI prompt.
 */
function sanitizePromptArray(arr: string[] | undefined | null): string[] {
	return (arr ?? []).map(sanitizePromptField).filter((s) => s.length > 0);
}

// ============================================================================
// PLACEHOLDER BUILDER
// ============================================================================

/**
 * Build placeholders from user data
 * Converts raw database data into prompt placeholders
 * Includes ALL onboarding data for truly personalized generation
 */
export function buildPlaceholdersFromUserData(
	metrics: UserHealthMetrics,
	profile: UserProfileContext | null,
	prefs: DietPreferences | null,
	bodyContext: BodyMetricsContext | null,
	daysCount: number = 1,
): DietPlaceholders {
	const countryCode = profile?.country || 'US';
	const cuisine = detectCuisine(countryCode);

	return {
		// Location
		COUNTRY: getCountryName(countryCode),
		COUNTRY_CODE: countryCode,
		STATE: profile?.state || 'Unknown',
		CUISINE: cuisine,
		CUISINE_PREFERENCES: prefs?.cuisine_preferences?.length
			? sanitizePromptArray(prefs.cuisine_preferences).join(', ')
			: '', // empty = no specific preference, use auto-detected only

		// User profile
		DIET_TYPE: (() => {
			const raw = (prefs?.diet_type || 'non-veg').toLowerCase().trim();
			// Normalize 'balanced' → 'non-veg' so placeholder and prompt header agree
			return raw === 'balanced' ? 'non-veg' : raw;
		})(),
		AGE: profile?.age || 30,
		GENDER: profile?.gender || 'unknown',
		OCCUPATION: profile?.occupation_type || 'general',
		WAKE_TIME: profile?.wake_time || '07:00',
		SLEEP_TIME: profile?.sleep_time || '23:00',

		// Allergies and restrictions
		ALLERGIES: prefs?.allergies || [],
		RESTRICTIONS: prefs?.restrictions || [],

		// Nutrition targets (from Universal Health System)
		CALORIES: metrics.daily_calories,
		PROTEIN: metrics.daily_protein_g,
		CARBS: metrics.daily_carbs_g,
		FATS: metrics.daily_fat_g,
		FIBER: (metrics as any).daily_fiber_g || 25,
		WATER_LITERS: Math.round((metrics.daily_water_ml / 1000) * 10) / 10,

		// Health context
		BMI: metrics.calculated_bmi || 0,
		BMI_CATEGORY: metrics.bmi_category || 'Unknown',
		// BUG-95: UserProfileContext uses snake_case fitness_goal, not camelCase fitnessGoal
		// Sanitized to prevent prompt injection via user-supplied goal text
		FITNESS_GOAL: sanitizePromptField(profile?.fitness_goal) || 'maintenance',

		// Preferences
		COOKING_METHODS: prefs?.cooking_methods || [],
		MEALS_ENABLED: getEnabledMealsList(prefs ?? undefined),
		MEAL_EXCLUSION_INSTRUCTIONS: getMealExclusionInstructions(prefs ?? undefined),

		// Medical conditions (sanitized to prevent prompt injection)
		MEDICAL_CONDITIONS: sanitizePromptArray(bodyContext?.medical_conditions),
		MEDICATIONS: sanitizePromptArray(bodyContext?.medications),
		PHYSICAL_LIMITATIONS: sanitizePromptArray(bodyContext?.physical_limitations),
		PREGNANCY_STATUS: bodyContext?.pregnancy_status ?? false,
		PREGNANCY_TRIMESTER: bodyContext?.pregnancy_trimester,
		BREASTFEEDING_STATUS: bodyContext?.breastfeeding_status ?? false,
		STRESS_LEVEL: bodyContext?.stress_level,

		// ============================================
		// ONBOARDING DATA - User's cooking & lifestyle
		// ============================================

		// Cooking capabilities (from diet_preferences)
		COOKING_SKILL: (prefs as any)?.cooking_skill_level || 'intermediate',
		MAX_PREP_TIME: (prefs as any)?.max_prep_time_minutes || 60,
		BUDGET_LEVEL: (prefs as any)?.budget_level || 'medium',

		// Diet readiness flags
		KETO_READY: (prefs as any)?.keto_ready || false,
		LOW_CARB_READY: (prefs as any)?.low_carb_ready || false,
		HIGH_PROTEIN_READY: (prefs as any)?.high_protein_ready || false,
		INTERMITTENT_FASTING_READY: (prefs as any)?.intermittent_fasting_ready || false,
		PALEO_READY: (prefs as any)?.paleo_ready || false,
		MEDITERRANEAN_READY: (prefs as any)?.mediterranean_ready || false,

		// Current eating habits (for personalized suggestions)
		DRINKS_ENOUGH_WATER: (prefs as any)?.drinks_enough_water ?? true,
		LIMITS_SUGARY_DRINKS: (prefs as any)?.limits_sugary_drinks ?? true,
		EATS_REGULAR_MEALS: (prefs as any)?.eats_regular_meals ?? true,
		AVOIDS_LATE_NIGHT_EATING: (prefs as any)?.avoids_late_night_eating ?? true,
		CONTROLS_PORTION_SIZES: (prefs as any)?.controls_portion_sizes ?? true,
		READS_NUTRITION_LABELS: (prefs as any)?.reads_nutrition_labels ?? false,
		EATS_PROCESSED_FOODS: (prefs as any)?.eats_processed_foods ?? false,
		EATS_5_SERVINGS_FRUITS_VEGGIES: (prefs as any)?.eats_5_servings_fruits_veggies ?? false,
		LIMITS_REFINED_SUGAR: (prefs as any)?.limits_refined_sugar ?? true,
		INCLUDES_HEALTHY_FATS: (prefs as any)?.includes_healthy_fats ?? true,

		// Lifestyle
		DRINKS_ALCOHOL: (prefs as any)?.drinks_alcohol ?? false,
		SMOKES_TOBACCO: (prefs as any)?.smokes_tobacco ?? false,
		DRINKS_COFFEE: (prefs as any)?.drinks_coffee ?? true,
		TAKES_SUPPLEMENTS: (prefs as any)?.takes_supplements ?? false,

		// Generation options
		DAYS_COUNT: daysCount,
	};
}

/**
 * Get country name from code (simplified mapping)
 */
function getCountryName(code: string): string {
	const names: Record<string, string> = {
		US: 'United States',
		IN: 'India',
		GB: 'United Kingdom',
		CA: 'Canada',
		AU: 'Australia',
		DE: 'Germany',
		FR: 'France',
		JP: 'Japan',
		CN: 'China',
		MX: 'Mexico',
		BR: 'Brazil',
		IT: 'Italy',
		ES: 'Spain',
		KR: 'South Korea',
		TH: 'Thailand',
		VN: 'Vietnam',
		ID: 'Indonesia',
		MY: 'Malaysia',
		SG: 'Singapore',
		PH: 'Philippines',
		PK: 'Pakistan',
		BD: 'Bangladesh',
		AE: 'United Arab Emirates',
		SA: 'Saudi Arabia',
		TR: 'Turkey',
		ZA: 'South Africa',
		NG: 'Nigeria',
		KE: 'Kenya',
		EG: 'Egypt',
		AR: 'Argentina',
		CO: 'Colombia',
		PE: 'Peru',
		CL: 'Chile',
		NZ: 'New Zealand',
		SE: 'Sweden',
		NO: 'Norway',
		NL: 'Netherlands',
		BE: 'Belgium',
		CH: 'Switzerland',
		AT: 'Austria',
		PL: 'Poland',
		RU: 'Russia',
		UA: 'Ukraine',
		GR: 'Greece',
		PT: 'Portugal',
		IE: 'Ireland',
	};

	return names[code.toUpperCase()] || code;
}

function buildPlanStructureRequirements(
	p: DietPlaceholders,
	excludeIngredients: string[] = [],
): string {
	const isMultiDayPlan = p.DAYS_COUNT > 1;
	const weekdayInstruction = isMultiDayPlan
		? `- Every meal MUST include a dayOfWeek field using exactly one of: monday, tuesday, wednesday, thursday, friday, saturday, sunday
- Cover each day in order starting at monday and keep meals grouped day-by-day`
		: '- dayOfWeek is optional for a 1-day plan';
	const additionalRestrictions =
		p.RESTRICTIONS.length > 0
			? `- Honor these additional nutrition guidelines across the full plan: ${p.RESTRICTIONS.join(', ')}`
			: '';
	const explicitExclusions =
		excludeIngredients.length > 0
			? `- NEVER include these explicitly excluded or disliked ingredients: ${excludeIngredients.join(', ')}`
			: '';
	const mealTimingContext = p.WAKE_TIME && p.SLEEP_TIME
		? `- User wakes at ${p.WAKE_TIME} and sleeps at ${p.SLEEP_TIME}. Schedule breakfast within 1-2 hours of waking, dinner at least 2-3 hours before sleep, and space meals evenly throughout the active window`
		: '';
	const clinicalContext = [
		p.MEDICATIONS.length > 0
			? `- Check ingredient and timing conflicts for these medications/supplements: ${sanitizePromptArray(p.MEDICATIONS).join(', ')}`
			: '',
		p.PREGNANCY_STATUS && p.PREGNANCY_TRIMESTER && [1, 2, 3].includes(Number(p.PREGNANCY_TRIMESTER))
			? `- This user is pregnant (trimester ${Number(p.PREGNANCY_TRIMESTER)}); avoid unsafe foods, avoid aggressive calorie restriction, and prioritise iron, folate, calcium, choline, DHA, and hydration`
			: p.PREGNANCY_STATUS
			? `- This user is pregnant. Apply full pregnancy safety guidelines for all trimesters. Avoid high-mercury fish, raw foods, excess vitamin A, alcohol, and high-intensity exercises. Prioritise iron, folate, calcium, choline, DHA, and hydration.`
			: '',
		p.BREASTFEEDING_STATUS
			? '- This user is breastfeeding; prioritise hydration, adequate calories, calcium, iodine, DHA, and protein'
			: '',
		p.PHYSICAL_LIMITATIONS.length > 0
			? `- Keep meal prep realistic for these physical limitations: ${sanitizePromptArray(p.PHYSICAL_LIMITATIONS).join(', ')}`
			: '',
		p.STRESS_LEVEL === 'high'
			? '- Stress level is high; avoid overly restrictive meals and favour stable energy, magnesium-rich foods, and recovery-friendly meal timing'
			: '',
	]
		.filter(Boolean)
		.join('\n');

	return `
========================================================================
GLOBAL OUTPUT RULES:
========================================================================
- The plan must cover exactly ${p.DAYS_COUNT} day(s)
${weekdayInstruction}
- totalCalories and totalNutrition MUST represent totals for the FULL ${p.DAYS_COUNT}-day plan, not a single day
- Keep daily calories and protein close to the user's daily targets while ensuring the full plan total matches ${p.DAYS_COUNT} days of nutrition
- Spread meals realistically across the week and avoid repeating the same main dish on consecutive days
- Across the full plan, rotate ingredients to cover key micronutrient sources such as iron, calcium, potassium, magnesium, omega-3, and vitamins A/C/B12/D when compatible with the diet type
- Use vegetables, fruits, legumes, whole grains, dairy/fortified alternatives, seeds, nuts, and protein sources strategically so the weekly plan feels nutritionally complete
- Respect allergies, restrictions, prep time, budget, enabled meal slots, and cooking skill for every day
${additionalRestrictions}
${explicitExclusions}
${mealTimingContext}
${clinicalContext}
`;
}

// ============================================================================
// DIET PROMPT ROUTER
// ============================================================================

/**
 * Build the appropriate diet prompt based on diet type
 * Routes to specialized prompts for each diet type
 *
 * @param metrics - User health metrics from Universal Health System
 * @param profile - User profile (age, gender, location)
 * @param prefs - Diet preferences (type, allergies, cooking methods)
 * @param daysCount - Number of days to generate (default: 3, max: 7)
 * @returns Complete prompt string for AI generation
 */
export function buildDietPrompt(
	metrics: UserHealthMetrics,
	profile: UserProfileContext | null,
	prefs: DietPreferences | null,
	bodyContext: BodyMetricsContext | null,
	daysCount: number = 3,
	excludeIngredients: string[] = [],
): string {
	// Build placeholders from user data
	const placeholders = buildPlaceholdersFromUserData(
		metrics,
		profile,
		prefs,
		bodyContext,
		daysCount,
	);

	// Get diet type (default to non-veg/omnivore)
	const dietType = (prefs?.diet_type || 'non-veg').toLowerCase().trim();

	console.log('[DietPrompt] Building prompt for:', {
		dietType,
		cuisine: placeholders.CUISINE,
		cuisinePreferences: placeholders.CUISINE_PREFERENCES || '(none)',
		country: placeholders.COUNTRY,
		calories: placeholders.CALORIES,
		protein: placeholders.PROTEIN,
		allergies: placeholders.ALLERGIES.length,
	});

	let basePrompt: string;

	// Route to specialized prompt based on diet type
	switch (dietType) {
		case 'vegan':
			basePrompt = buildVeganPrompt(placeholders);
			break;

		case 'vegetarian':
		case 'lacto-vegetarian':
		case 'ovo-vegetarian':
		case 'lacto-ovo-vegetarian':
			basePrompt = buildVegetarianPrompt(placeholders);
			break;

		case 'pescatarian':
		case 'pescetarian':
			basePrompt = buildPescatarianPrompt(placeholders);
			break;

		case 'keto':
		case 'ketogenic':
		case 'low-carb':
		case 'lchf':
			basePrompt = buildKetoPrompt(placeholders);
			break;

		case 'non-veg':
		case 'nonveg':
		case 'non-vegetarian':
		case 'omnivore':
		case 'balanced':
		case 'all':
		default:
			basePrompt = buildNonVegPrompt(placeholders);
			break;
	}

	return `${basePrompt}\n${buildPlanStructureRequirements(placeholders, excludeIngredients)}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { DietPlaceholders } from './types';
export { buildVeganPrompt } from './vegan';
export { buildVegetarianPrompt } from './vegetarian';
export { buildPescatarianPrompt } from './pescatarian';
export { buildNonVegPrompt } from './nonVeg';
export { buildKetoPrompt } from './keto';
