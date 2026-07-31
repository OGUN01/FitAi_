/**
 * FitAI Workers - Request Validation Schemas
 *
 * Zod schemas for validating incoming API requests
 */

import { z } from 'zod';
import { ValidationError } from './errors';

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Available equipment types (must match exerciseDatabase.json)
 */
export const EquipmentSchema = z.enum([
	'body weight',
	'dumbbell',
	'barbell',
	'band',
	'cable',
	'machine',
	'kettlebell',
	'medicine ball',
	'foam roll',
	'ez barbell',
	'trap bar',
	'bosu ball',
	'resistance band',
	'stability ball',
	'olympic barbell',
	'smith machine',
	'assisted',
	'leverage machine',
	'rope',
	'sled machine',
	'skierg machine',
	'stationary bike',
	'upper body ergometer',
	'elliptical machine',
	'stepmill machine',
	'wheel roller',
	'weighted',
	'tire',
	'hammer',
	'roller',
]);

/**
 * Body parts (must match exerciseDatabase.json)
 */
export const BodyPartSchema = z.enum([
	'back',
	'chest',
	'legs',
	'shoulders',
	'arms',
	'core',
	'cardio',
	'neck',
	'waist',
	'upper arms',
	'lower arms',
	'upper legs',
	'lower legs',
]);

/**
 * Target muscle groups
 */
export const MuscleGroupSchema = z.enum([
	'abs',
	'biceps',
	'triceps',
	'quads',
	'hamstrings',
	'glutes',
	'calves',
	'lats',
	'traps',
	'delts',
	'pecs',
	'forearms',
	'adductors',
	'abductors',
	'serratus anterior',
	'spine',
	'cardiovascular system',
]);

/**
 * Experience levels
 */
export const ExperienceLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);

/**
 * Fitness goals
 */
export const FitnessGoalSchema = z.enum([
	'weight_loss',
	'muscle_gain',
	'maintenance',
	'strength',
	'endurance',
	'flexibility',
	'athletic_performance',
]);

/**
 * Workout types
 */
export const WorkoutTypeSchema = z.enum([
	'full_body',
	'upper_body',
	'lower_body',
	'push',
	'pull',
	'legs',
	'chest',
	'back',
	'shoulders',
	'arms',
	'core',
	'cardio',
]);

/**
 * Gender
 */
export const GenderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);

// ============================================================================
// USER PROFILE SCHEMA (from onboarding)
// ============================================================================

/**
 * User profile data from onboarding
 */
export const UserProfileSchema = z.object({
	// Personal info
	age: z.number().int().min(13).max(120),
	weight: z.number().min(30).max(300).nullable().optional(), // kg — nullable for incomplete onboarding
	height: z.number().min(100).max(250).nullable().optional(), // cm — nullable for incomplete onboarding
	gender: GenderSchema,

	// Fitness profile
	fitnessGoal: FitnessGoalSchema,
	experienceLevel: ExperienceLevelSchema,

	// Equipment availability
	availableEquipment: z.array(EquipmentSchema).min(1).default(['body weight']),

	// Preferences
	targetBodyParts: z.array(BodyPartSchema).optional(),
	workoutDuration: z.number().int().min(10).max(180).default(45), // minutes
	workoutsPerWeek: z.number().int().min(1).max(7).default(4),

	// Restrictions
	injuries: z.array(z.string()).optional(),
	restrictions: z.array(z.string()).optional(),

	// ✅ CRITICAL: Medical safety fields
	medicalConditions: z.array(z.string()).optional().default([]),
	medications: z.array(z.string()).optional().default([]),
	pregnancyStatus: z.boolean().optional().default(false),
	pregnancyTrimester: z.enum(['1', '2', '3']).or(z.number().int().min(1).max(3)).optional(),
	breastfeedingStatus: z.boolean().optional().default(false),

	// ✅ Progressive overloading / split scoring fields
	prefersVariety: z.boolean().optional(),
	stressLevel: z.enum(['low', 'moderate', 'high']).optional(),
	activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'extreme']).optional(),

	// ✅ Calculated health metrics (from advanced_review table, injected by worker before rule-based engine)
	// Used to calibrate calorie estimates and coaching tips — NOT available on LLM path which reads them separately
	bmr: z.number().optional(),   // kcal/day resting metabolism
	tdee: z.number().optional(),  // kcal/day total daily energy expenditure
	vo2MaxEstimate: z.number().optional(),  // ml/kg/min
	vo2MaxClassification: z.string().optional(), // 'poor' | 'fair' | 'good' | 'excellent' | 'superior'
	heartRateZones: z.object({
		zone1_min: z.number(), zone1_max: z.number(),
		zone2_min: z.number(), zone2_max: z.number(),
		zone3_min: z.number(), zone3_max: z.number(),
		zone4_min: z.number(), zone4_max: z.number(),
		zone5_min: z.number(), zone5_max: z.number(),
	}).optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// ============================================================================
// WORKOUT GENERATION REQUEST SCHEMA
// ============================================================================

/**
 * Request body for POST /workout/generate
 */
export const WorkoutGenerationRequestSchema = z.object({
	// User ID (from JWT auth)
	userId: z.string().uuid().optional(), // Optional for guest users

	// User profile (required)
	profile: UserProfileSchema,

	// ✅ NEW: Weekly plan parameters (REQUIRED for all workout generation)
	weeklyPlan: z.object({
		workoutsPerWeek: z.number().int().min(1).max(7).default(3),
		// User-chosen training days from onboarding (workout_preferences.
		// preferred_workout_days), sent monday-first by the app. When absent the
		// rule-based engine falls back to split-suggested days.
		preferredDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
		workoutTypes: z.array(z.string()).optional(), // User's preferred workout types from onboarding
		prefersVariety: z.boolean().default(false),
		activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'extreme']).optional(),
		preferredWorkoutTime: z.enum(['morning', 'afternoon', 'evening']).optional().default('morning'), // ✅ NEW
	}),

	// Optional filters
	focusMuscles: z.array(MuscleGroupSchema).optional(),
	excludeExercises: z.array(z.string()).optional(), // Exercise IDs to exclude
	difficultyOverride: ExperienceLevelSchema.optional(), // Override experience level for exercise filtering

	// H13: Fitness assessment (concrete ability indicators from onboarding)
	fitnessAssessment: z.object({
		pushupCount: z.number().int().min(0).max(200).optional().default(0),
		runningMinutes: z.number().int().min(0).max(300).optional().default(0),
		flexibilityLevel: z.enum(['poor', 'fair', 'good', 'excellent']).optional().default('fair'),
		experienceYears: z.number().min(0).max(50).optional().default(0),
	}).optional(),

	// H13: Workout location preference
	workoutLocation: z.enum(['home', 'gym', 'both']).optional().default('both'),

	// H13: Cardio/strength preference booleans
	enjoysCardio: z.boolean().optional().default(true),
	enjoysStrength: z.boolean().optional().default(true),
	enjoysGroupClasses: z.boolean().optional().default(false),
	prefersOutdoor: z.boolean().optional().default(false),
	needsMotivation: z.boolean().optional().default(false),

	// H13: Health-based recommendations from advanced review
	recommendations: z.object({
		frequency: z.number().int().min(1).max(7).nullable().optional(),
		cardioMinutes: z.number().int().min(0).max(600).nullable().optional(),
		strengthSessions: z.number().int().min(0).max(7).nullable().optional(),
	}).optional(),

	// Mesocycle week (1-4), defaults handled at usage site
	weekNumber: z.number().int().min(1).max(4).optional(),

	// Regeneration seed — when provided, varies exercise selection for the same
	// profile/weekNumber combination so "regenerate" produces a fresh plan.
	// Client sends Date.now() or a counter; engine uses it as rotation offset.
	regenerationSeed: z.number().int().optional(),

	// AI parameters (optional)
	model: z.string().default('google/gemini-3.5-flash-lite'), // Vercel AI Gateway model ID (format: provider/model)
	temperature: z.number().min(0).max(2).default(0.7),

	// Cache control — set true to bypass all cache tiers and force fresh generation
	skipCache: z.boolean().default(false),

	// Boost cardio: extra cardio minutes from the "Cardio Boost" pace card.
	// When > 0, the rule-based generator appends an explicit cardio block (treadmill/bike)
	// to every session. Separate from workoutDuration so each component gets correct calorie math.
	// Scenario map:
	//   Boost pace selected  → boostExtraCardioMinutes = 30, workoutDuration = base (e.g. 60 min)
	//   All other pace opts  → boostExtraCardioMinutes = 0,  workoutDuration = base time_preference
	boostExtraCardioMinutes: z.number().int().min(0).max(60).default(0),

	// P1-4 — Closed-loop progressive overload. The user's last-completed sets per
	// exercise (from exercise_sets). Optional; absent for first-time / guest users.
	// The AI prompt + rule engine use this to prescribe progressions that build on
	// ACTUAL lifted weights instead of guessing. See src/docs/VERIFIED-FINDINGS.md.
	priorPerformance: z.array(z.object({
		exerciseId: z.string(),
		exerciseName: z.string().optional(),
		lastSession: z.object({
			completedAt: z.string(),
			sets: z.array(z.object({
				setNumber: z.number(),
				weightKg: z.number().nullable().optional(),
				reps: z.number().nullable().optional(),
				rpe: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable().optional(),
			})),
		}).optional(),
	})).optional(),
});

export type WorkoutGenerationRequest = z.infer<typeof WorkoutGenerationRequestSchema>;

// ============================================================================
// WORKOUT RESPONSE SCHEMA (AI Output)
// ============================================================================

/**
 * Single exercise in generated workout
 */
export const WorkoutExerciseSchema = z.object({
	exerciseId: z.string(), // Must match exerciseDatabase.json
	sets: z.number().int().min(1).max(10),
	reps: z.union([
		z.number().int().min(1).max(100), // Fixed reps
		z.string(), // Range like "8-12" or "AMRAP" or "30 seconds"
	]),
	restSeconds: z.number().int().min(0).max(300).optional(),
	notes: z.string().optional(), // "Increase weight each set", "Focus on form"
	tempo: z.string().optional(), // "2-1-2" (eccentric-pause-concentric)
});

/**
 * Single workout structure from AI
 */
export const SingleWorkoutSchema = z.object({
	// Workout metadata
	title: z.string(),
	description: z.string(),
	totalDuration: z.number().int(), // minutes
	difficulty: ExperienceLevelSchema,
	estimatedCalories: z.number().int().optional(),

	// Warmup (optional)
	warmup: z.array(WorkoutExerciseSchema).max(5).optional(),

	// Main workout
	exercises: z.array(WorkoutExerciseSchema).min(3).max(20),

	// Cooldown (optional)
	cooldown: z.array(WorkoutExerciseSchema).max(5).optional(),

	// AI notes
	coachingTips: z.array(z.string()).optional(),
	progressionNotes: z.string().optional(),
});

/**
 * ✅ NEW: Weekly workout plan structure (array of workouts for different days)
 */
export const WeeklyWorkoutPlanSchema = z.object({
	id: z.string(),
	planTitle: z.string(),
	planDescription: z.string(),
	workouts: z.array(
		z.object({
			id: z.string().optional(),
			slotKey: z.string().optional(),
			dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
			workout: SingleWorkoutSchema,
		}),
	),
	restDays: z.array(z.string()),
	totalEstimatedCalories: z.number().int(),
});

/**
 * ✅ NEW: Weekly plan response (NO FALLBACK - weekly plan only)
 */
export const WorkoutResponseSchema = WeeklyWorkoutPlanSchema;

export type WorkoutResponse = z.infer<typeof WorkoutResponseSchema>;

// ============================================================================
// DIET GENERATION RESPONSE SCHEMA (Task 1.6)
// ============================================================================

/**
 * Nutritional information for a food item or meal
 */
export const NutritionalInfoSchema = z.object({
	calories: z.number().int().min(0),
	protein: z.number().min(0), // grams
	carbs: z.number().min(0), // grams
	fats: z.number().min(0), // grams
	fiber: z.number().min(0).default(0), // grams — required, AI must populate
	sugar: z.number().min(0).optional(), // grams
	sodium: z.number().min(0).optional(), // mg
});

/**
 * Single food item in a meal
 */
export const FoodItemSchema = z.object({
	name: z.string(),
	quantity: z.string(), // "2 cups", "150g", "1 medium", etc.
	nutrition: NutritionalInfoSchema,
	preparation: z.string().optional(), // "grilled", "steamed", "raw"
});

/**
 * Single meal in the diet plan
 */
export const MealSchema = z.object({
	dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
	mealType: z.enum(['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack']),
	name: z.string(), // "High Protein Breakfast Bowl"
	foods: z.array(FoodItemSchema).min(1).max(15),
	totalNutrition: NutritionalInfoSchema,
	preparationTime: z.number().int().min(0), // minutes
	cookingInstructions: z.array(z.string()).optional(),
	tips: z.string().optional(),
	// Populated post-generation by resolveMealImages() — NOT generated by the AI.
	// Sourced from Wikimedia Commons (free, CC-licensed) and cached in MEAL_CACHE KV.
	// Absent → client renders a gradient placeholder (graceful degradation).
	imageUrl: z.string().optional(),
});

/**
 * Complete diet plan from AI
 */
export const DietResponseSchema = z.object({
	// Plan metadata
	title: z.string(),
	description: z.string(),
	totalCalories: z.number().int(),
	totalNutrition: NutritionalInfoSchema,

	// Meals
	meals: z.array(MealSchema).min(1).max(42),

	// AI notes
	nutritionTips: z.array(z.string()).optional(),
	mealPrepNotes: z.string().optional(),
	substitutionSuggestions: z.array(z.string()).optional(),
});

export type NutritionalInfo = z.infer<typeof NutritionalInfoSchema>;
export type FoodItem = z.infer<typeof FoodItemSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type DietResponse = z.infer<typeof DietResponseSchema>;

const DietProfileOverrideSchema = z.object({
	age: z.number().int().min(13).max(120).optional(),
	gender: GenderSchema.optional(),
	weight: z.number().min(30).max(300).optional(),
	height: z.number().min(100).max(250).optional(),
	country: z.string().optional(),
	state: z.string().optional(),
	occupation_type: z.string().optional(),
	wake_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
	sleep_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
	// activity_level: the diet path runs the client's mapActivityLevelForHealthCalc before
	// sending, so the worker receives health-calc values ('sedentary','light','moderate',
	// 'active','very_active'). The legacy onboarding value 'extreme' is also accepted for
	// safety — it is a valid onboarding activity_level and an unmapped client would send it
	// verbatim. Any other value is a client bug and is rejected here rather than silently
	// flowing into the TDEE calculation.
	activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active', 'extreme']).optional(),
	// fitness_goal: must match FitnessGoalSchema (the same enum the workout path enforces).
	fitness_goal: FitnessGoalSchema.optional(),
});

const DietPreferencesOverrideSchema = z.object({
	// diet_type: onboarding values are 'vegetarian|vegan|non-veg|pescatarian|balanced'.
	// The DB CHECK constraint also allows 'non_veg|omnivore|keto|paleo' (see migrations),
	// so the worker accepts the union. Anything else is rejected here rather than reaching
	// the AI prompt as a garbage diet label.
	diet_type: z.enum([
		'vegetarian', 'vegan', 'non-veg', 'non_veg', 'pescatarian', 'balanced',
		'omnivore', 'keto', 'paleo',
	]).optional(),
	allergies: z.array(z.string()).optional(),
	restrictions: z.array(z.string()).optional(),
	dislikes: z.array(z.string()).optional(),
	cuisine_preferences: z.array(z.string()).optional(),
	snacks_count: z.number().int().min(0).max(5).optional(),
	breakfast_enabled: z.boolean().optional(),
	lunch_enabled: z.boolean().optional(),
	dinner_enabled: z.boolean().optional(),
	snacks_enabled: z.boolean().optional(),
	cooking_methods: z.array(z.string()).optional(),
	// cooking_skill_level: matches DietPreferencesData union (diet-preferences.ts).
	cooking_skill_level: z.enum(['beginner', 'intermediate', 'advanced', 'not_applicable']).optional(),
	max_prep_time_minutes: z.number().int().min(0).max(240).nullable().optional(),
	// budget_level: matches DietPreferencesData union (diet-preferences.ts).
	budget_level: z.enum(['low', 'medium', 'high']).optional(),
	keto_ready: z.boolean().optional(),
	intermittent_fasting_ready: z.boolean().optional(),
	paleo_ready: z.boolean().optional(),
	mediterranean_ready: z.boolean().optional(),
	low_carb_ready: z.boolean().optional(),
	high_protein_ready: z.boolean().optional(),
	drinks_enough_water: z.boolean().optional(),
	limits_sugary_drinks: z.boolean().optional(),
	eats_regular_meals: z.boolean().optional(),
	avoids_late_night_eating: z.boolean().optional(),
	controls_portion_sizes: z.boolean().optional(),
	reads_nutrition_labels: z.boolean().optional(),
	eats_processed_foods: z.boolean().optional(),
	eats_5_servings_fruits_veggies: z.boolean().optional(),
	limits_refined_sugar: z.boolean().optional(),
	includes_healthy_fats: z.boolean().optional(),
	drinks_alcohol: z.boolean().optional(),
	smokes_tobacco: z.boolean().optional(),
	drinks_coffee: z.boolean().optional(),
	takes_supplements: z.boolean().optional(),
});

const BodyMetricsOverrideSchema = z.object({
	height_cm: z.number().min(100).max(250).optional(),
	current_weight_kg: z.number().min(30).max(300).optional(),
	target_weight_kg: z.number().min(30).max(300).optional(),
	body_fat_percentage: z.number().min(3).max(60).optional(),
	medical_conditions: z.array(z.string()).optional(),
	medications: z.array(z.string()).optional(),
	physical_limitations: z.array(z.string()).optional(),
	pregnancy_status: z.boolean().optional(),
	pregnancy_trimester: z.number().int().min(1).max(3).optional(),
	breastfeeding_status: z.boolean().optional(),
	// stress_level: must match UserProfileSchema.stressLevel enum (low|moderate|high).
	// Keeping the two schemas in sync prevents an invalid value from passing diet
	// validation while being rejected on the workout path (or vice versa).
	stress_level: z.enum(['low', 'moderate', 'high']).optional(),
});

const AdvancedReviewOverrideSchema = z.object({
	daily_calories: z.number().int().min(1000).max(5000).optional(),
	daily_protein_g: z.number().min(0).max(400).optional(),
	daily_carbs_g: z.number().min(0).max(600).optional(),
	daily_fat_g: z.number().min(0).max(250).optional(),
	daily_water_ml: z.number().int().min(0).max(10000).optional(),
	daily_fiber_g: z.number().min(0).max(200).optional(),
	calculated_bmi: z.number().min(0).max(80).optional(),
	bmi_category: z.string().optional(),
	health_score: z.number().min(0).max(100).optional(),
	overall_health_score: z.number().min(0).max(100).optional(),
});

// ============================================================================
// DIET GENERATION REQUEST SCHEMA (Task 1.6)
// ============================================================================

/**
 * Request body for POST /diet/generate
 * (Will be implemented in Task 1.6)
 */
export const DietGenerationRequestSchema = z.object({
	userId: z.string().uuid().optional(),
	country: z.string().optional(),

	// Optional live onboarding overrides from the app
	profile: DietProfileOverrideSchema.optional(),
	dietPreferences: DietPreferencesOverrideSchema.optional(),
	bodyMetrics: BodyMetricsOverrideSchema.optional(),
	advancedReview: AdvancedReviewOverrideSchema.optional(),

	// Dietary preferences
	calorieTarget: z.number().int().min(1000).max(5000),
	macros: z
		.object({
			protein: z.number().min(0).max(100), // percentage
			carbs: z.number().min(0).max(100),
			fats: z.number().min(0).max(100),
		})
		.optional(),

	// Restrictions
	dietaryRestrictions: z
		.array(z.enum(['vegetarian', 'vegan', 'pescatarian', 'gluten_free', 'dairy_free', 'nut_free', 'halal', 'kosher', 'low_carb', 'keto']))
		.optional(),

	// Preferences
	mealsPerDay: z.number().int().min(1).max(6).default(3),
	daysCount: z.number().int().min(1).max(7).default(1), // Changed default to 1 for faster generation
	excludeIngredients: z.array(z.string()).optional(),

	// AI parameters
	model: z.string().default('google/gemini-3.5-flash-lite'), // Vercel AI Gateway model ID (format: provider/model)
	temperature: z.number().min(0).max(2).default(0.7),

	// Goal rate and deadline — used by the handler to calibrate calorie deficit and pacing
	weeklyWeightLossGoal: z.number().positive().optional(),
	targetTimelineWeeks: z.number().positive().optional(),

	// Async mode (default true to prevent timeout)
	async: z.boolean().default(true),

	// Cache control — set true to bypass all cache tiers and force fresh generation
	skipCache: z.boolean().default(false),
});

export type DietGenerationRequest = z.infer<typeof DietGenerationRequestSchema>;

// ============================================================================
// CHAT REQUEST SCHEMA (Task 1.7)
// ============================================================================

/**
 * Request body for POST /chat/ai
 * (Will be implemented in Task 1.7)
 */
export const ChatRequestSchema = z.object({
	userId: z.string().uuid().optional(),

	// Optional client-supplied conversation ID. chatHandler reads request.conversationId
	// (falling back to a generated UUID when absent) to thread messages into one
	// conversation. Without this field Zod strips it, so a client that sent a
	// conversationId always got a new conversation back.
	conversationId: z.string().uuid().optional(),

	// Chat parameters
	messages: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant', 'system']),
				content: z.string().max(10000),
			}),
		)
		.min(1)
		.max(100),

	// Context (optional)
	context: z
		.object({
			currentWorkout: z.any().optional(),
			currentDiet: z.any().optional(),
			userProfile: UserProfileSchema.optional(),
		})
		.optional(),

	// AI parameters
	model: z.string().default('google/gemini-3.5-flash-lite'), // Vercel AI Gateway model ID (format: provider/model)
	temperature: z.number().min(0).max(2).default(0.9),
	maxTokens: z.number().int().min(100).max(4000).default(1000),
	stream: z.boolean().default(false),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ============================================================================
// CHAT RESPONSE SCHEMA (Task 1.7)
// ============================================================================

/**
 * Response for POST /chat/ai (non-streaming)
 * For streaming responses, Server-Sent Events (SSE) are used instead
 */
export const ChatResponseSchema = z.object({
	message: z.string(),
	conversationId: z.string().uuid().optional(),
	tokensUsed: z.number().int().optional(),
	finishReason: z.enum(['stop', 'length', 'content_filter', 'tool_calls']).optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// ============================================================================
// EXERCISE SEARCH REQUEST SCHEMA (Task 1.8)
// ============================================================================

/**
 * Query parameters for GET /exercises/search
 * (Will be implemented in Task 1.8)
 */
export const ExerciseSearchRequestSchema = z.object({
	// Search query
	query: z.string().min(1).max(100).optional(),

	// Filters
	equipment: z.array(EquipmentSchema).optional(),
	bodyParts: z.array(BodyPartSchema).optional(),
	muscles: z.array(MuscleGroupSchema).optional(),
	experienceLevel: ExperienceLevelSchema.optional(),

	// Pagination
	limit: z.number().int().min(1).max(100).default(20),
	offset: z.number().int().min(0).default(0),
});

export type ExerciseSearchRequest = z.infer<typeof ExerciseSearchRequestSchema>;

/**
 * Response for GET /exercises/search
 * Note: exercises use the Exercise type from exerciseDatabase.ts (not validated with Zod)
 */
export interface ExerciseSearchResponse {
	exercises: any[]; // Exercise[] from exerciseDatabase.ts
	total: number;
	limit: number;
	offset: number;
	hasMore: boolean;
}

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate request body and return typed data or throw ValidationError
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
	const result = schema.safeParse(data);

	if (!result.success) {
		console.error('[Validation] Zod validation failed:', {
			hasError: !!result.error,
			hasIssues: !!result.error?.issues,
			issuesType: result.error?.issues ? typeof result.error.issues : 'undefined',
			issuesLength: result.error?.issues?.length,
			fullError: JSON.stringify(result.error),
		});

		// Safety check: Zod should always return issues array, but defensive programming
		const issues = result.error?.issues || [];
		const errorMessages = issues.map((err) => `${err.path.join('.')}: ${err.message}`);

		console.error('[Validation] Error messages:', errorMessages);

		throw new ValidationError(
			errorMessages.length > 0 ? errorMessages.join(', ') : 'Validation failed - no error details available',
			errorMessages,
		);
	}

	return result.data;
}

/**
 * Validate request body and return result object
 */
export function validateRequestSafe<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
): { success: true; data: T } | { success: false; errors: string[] } {
	const result = schema.safeParse(data);

	if (!result.success) {
		// Safety check: Zod should always return issues array, but defensive programming
		const issues = result.error?.issues || [];
		const errorMessages = issues.map((err) => `${err.path.join('.')}: ${err.message}`);

		return {
			success: false,
			errors: errorMessages.length > 0 ? errorMessages : ['Validation failed'],
		};
	}

	return {
		success: true,
		data: result.data,
	};
}

// ============================================================================
// AI-FIRST DIET VALIDATION TYPES (Phase 1)
// ============================================================================

/**
 * Critical validation error that blocks the meal plan
 */
export interface DietValidationError {
	severity: 'CRITICAL';
	code: string;
	message: string;
	meal?: string;
	food?: string;
	allergen?: string;
	dietType?: string;
	current?: number;
	target?: number;
	drift?: number;
	[key: string]: any;
}

/**
 * Non-blocking quality warning
 */
export interface DietValidationWarning {
	severity: 'WARNING' | 'INFO';
	code: string;
	message: string;
	action?: string;
	[key: string]: any;
}

/**
 * Complete validation result
 */
export interface DietValidationResult {
	isValid: boolean;
	errors: DietValidationError[];
	warnings: DietValidationWarning[];
}

/**
 * User profile data for AI prompt context
 */
export interface UserProfileContext {
	age?: number;
	gender?: string;
	country?: string;
	state?: string;
	occupation_type?: string;
	wake_time?: string;
	sleep_time?: string;
	activity_level?: string;
	fitness_goal?: string;
	weight?: number;
	height?: number;
}

/**
 * Diet preferences from database
 */
export interface DietPreferences {
	diet_type?: string;
	allergies?: string[];
	restrictions?: string[];
	dislikes?: string[];
	cuisine_preferences?: string[];
	snacks_count?: number;
	breakfast_enabled?: boolean;
	lunch_enabled?: boolean;
	dinner_enabled?: boolean;
	snacks_enabled?: boolean;
	cooking_methods?: string[];
	cooking_skill_level?: string;
	max_prep_time_minutes?: number | null;
	budget_level?: string;
	keto_ready?: boolean;
	intermittent_fasting_ready?: boolean;
	paleo_ready?: boolean;
	mediterranean_ready?: boolean;
	low_carb_ready?: boolean;
	high_protein_ready?: boolean;
	drinks_enough_water?: boolean;
	limits_sugary_drinks?: boolean;
	eats_regular_meals?: boolean;
	avoids_late_night_eating?: boolean;
	controls_portion_sizes?: boolean;
	reads_nutrition_labels?: boolean;
	eats_processed_foods?: boolean;
	eats_5_servings_fruits_veggies?: boolean;
	limits_refined_sugar?: boolean;
	includes_healthy_fats?: boolean;
	drinks_alcohol?: boolean;
	smokes_tobacco?: boolean;
	drinks_coffee?: boolean;
	takes_supplements?: boolean;
}

export interface BodyMetricsContext {
	height_cm?: number;
	current_weight_kg?: number;
	target_weight_kg?: number;
	body_fat_percentage?: number;
	medical_conditions?: string[];
	medications?: string[];
	physical_limitations?: string[];
	pregnancy_status?: boolean;
	pregnancy_trimester?: number;
	breastfeeding_status?: boolean;
	stress_level?: string;
}

export interface AdvancedReviewContext {
	daily_calories?: number;
	daily_protein_g?: number;
	daily_carbs_g?: number;
	daily_fat_g?: number;
	daily_water_ml?: number;
	daily_fiber_g?: number;
	calculated_bmi?: number;
	bmi_category?: string;
	health_score?: number;
}

// ============================================================================
// PHASE 9 — WORKOUT BUILDER AI SCHEMAS
// ============================================================================
// Additive schemas for the 6 builder-AI endpoints. They reuse the existing
// WorkoutExerciseSchema / SingleWorkoutSchema / WeeklyWorkoutPlanSchema /
// UserProfileSchema wherever the shape matches. DO NOT modify existing schemas.
//
// The client-side canonical PlannedExercise (src/types/workout.ts) is richer
// than the worker WorkoutExerciseSchema (it carries PlannedSet[] with
// setNumber/setType/dropWeightKg etc.). For builder-AI round-trips we use a
// PlannedExerciseSchema that mirrors the client shape so NL edits / progressions
// preserve set-level detail. Adapters on the client convert to/from the simpler
// WorkoutExerciseSchema when interfacing with the generation pipeline.
// ============================================================================

/**
 * PlannedSet — mirrors src/types/workout.ts PlannedSet (worker-side copy).
 * Kept in sync with the client canonical type via the AI service adapters.
 */
export const PlannedSetSchema = z.object({
	setNumber: z.number().int().min(1),
	reps: z.union([z.number().int().min(0).max(200), z.string()]), // number or "8-12"
	weightKg: z.number().min(0).max(1000).optional(),
	setType: z.enum(['normal', 'warmup', 'failure', 'drop', 'superset', 'circuit']),
	dropWeightKg: z.number().min(0).max(1000).optional(),
	dropReps: z.number().int().min(0).max(200).optional(),
	durationSeconds: z.number().int().min(0).max(7200).optional(),
});

/**
 * PlannedExercise — mirrors src/types/workout.ts PlannedExercise (worker-side).
 * This is the canonical builder exercise shape; richer than WorkoutExerciseSchema.
 */
export const PlannedExerciseSchema = z.object({
	exerciseId: z.string(),
	name: z.string(),
	sets: z.array(PlannedSetSchema).min(1).max(20),
	restSeconds: z.number().int().min(0).max(600),
	notes: z.string().max(500).optional(),
	tempo: z.string().max(20).optional(),
	targetRpe: z.number().min(1).max(10).optional(),
	supersetId: z.string().optional(),
	circuitId: z.string().optional(),
	blockIndex: z.number().int().min(0).optional(),
	alternativeExerciseId: z.string().optional(),
});

/**
 * Builder DayWorkout — mirrors src/types/ai.ts DayWorkout (subset used by the
 * builder). Carries plannedExercises (canonical) + legacy exercises for back-compat.
 */
export const BuilderDayWorkoutSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	category: z.string(),
	difficulty: ExperienceLevelSchema,
	duration: z.number().int().min(0),
	estimatedCalories: z.number().optional(),
	exercises: z.array(WorkoutExerciseSchema),
	plannedExercises: z.array(PlannedExerciseSchema),
	equipment: z.array(z.string()),
	targetMuscleGroups: z.array(z.string()),
	icon: z.string(),
	tags: z.array(z.string()),
	isPersonalized: z.boolean(),
	aiGenerated: z.boolean(),
	createdAt: z.string(),
	dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
	subCategory: z.string(),
	intensityLevel: z.string(),
	warmUp: z.array(z.any()),
	coolDown: z.array(z.any()),
	progressionNotes: z.array(z.string()),
	safetyConsiderations: z.array(z.string()),
	expectedBenefits: z.array(z.string()),
	isExtra: z.boolean().optional(),
});

/**
 * Builder WeeklyWorkoutPlan — mirrors src/types/ai.ts WeeklyWorkoutPlan.
 */
export const BuilderWeeklyPlanSchema = z.object({
	id: z.string(),
	weekNumber: z.number().int().min(1).max(52),
	workouts: z.array(BuilderDayWorkoutSchema),
	planTitle: z.string().optional(),
	planDescription: z.string().optional(),
	restDays: z.array(z.union([z.string(), z.number()])),
	totalEstimatedCalories: z.number().optional(),
});

/**
 * AiSuggestion — mirrors src/types/workout.ts AiSuggestion.
 */
export const AiSuggestionSchema = z.object({
	exerciseId: z.string(),
	name: z.string(),
	reason: z.string(),
	confidence: z.number().min(0).max(1),
	muscleGroup: z.string(),
	sets: z.number().int().min(1).max(10),
	reps: z.union([z.number().int().min(0).max(200), z.string()]),
	restSeconds: z.number().int().min(0).max(600),
});

/**
 * ValidationWarning — mirrors src/types/workout.ts ValidationWarning.
 */
export const ValidationWarningSchema = z.object({
	id: z.string(),
	type: z.enum([
		'excessive_volume',
		'insufficient_pull',
		'missing_legs',
		'too_many_compounds',
		'missing_warmup',
		'recovery_conflict',
		'safety_constraint',
		'muscle_imbalance',
	]),
	severity: z.enum(['info', 'warning', 'error']),
	message: z.string(),
	exerciseId: z.string().optional(),
	dayIndex: z.number().int().min(0).optional(),
	fixAction: z.object({
		label: z.string(),
		type: z.enum(['add_exercise', 'remove_exercise', 'replace_exercise', 'adjust_volume']),
		payload: z.record(z.string(), z.any()).optional(),
	}).optional(),
});

// ----------------------------------------------------------------------------
// ENDPOINT REQUEST / RESPONSE SCHEMAS
// ----------------------------------------------------------------------------

// ── 1. POST /workout/suggest-day ────────────────────────────────────────────

export const SuggestDayRequestSchema = z.object({
	userId: z.string().uuid().optional(),
	dayIndex: z.number().int().min(0).max(6),
	currentExercises: z.array(PlannedExerciseSchema).max(30),
	profile: UserProfileSchema,
	goals: z.array(z.string()).max(10).optional(),
	weekNumber: z.number().int().min(1).max(4).optional(),
	model: z.string().default('google/gemini-3.5-flash-lite'),
	temperature: z.number().min(0).max(2).default(0.6),
	skipCache: z.boolean().default(false),
});

export const SuggestDayResponseSchema = z.object({
	suggestedExercises: z.array(AiSuggestionSchema).max(8),
	confidence: z.number().min(0).max(1),
	reasoning: z.string(),
});

export type SuggestDayRequest = z.infer<typeof SuggestDayRequestSchema>;
export type SuggestDayResponse = z.infer<typeof SuggestDayResponseSchema>;

// ── 2. POST /workout/validate ──────────────────────────────────────────────

export const ValidatePlanRequestSchema = z.object({
	userId: z.string().uuid().optional(),
	plan: BuilderWeeklyPlanSchema,
	profile: UserProfileSchema.optional(),
	model: z.string().default('google/gemini-3.5-flash-lite'),
	skipCache: z.boolean().default(false),
});

export const ValidatePlanResponseSchema = z.object({
	warnings: z.array(ValidationWarningSchema),
	fixActions: z.array(z.object({
		label: z.string(),
		type: z.enum(['add_exercise', 'remove_exercise', 'replace_exercise', 'adjust_volume']),
		dayIndex: z.number().int().min(0).optional(),
		payload: z.record(z.string(), z.any()).optional(),
	})),
});

export type ValidatePlanRequest = z.infer<typeof ValidatePlanRequestSchema>;
export type ValidatePlanResponse = z.infer<typeof ValidatePlanResponseSchema>;

// ── 3. POST /workout/edit-natural-language ──────────────────────────────────

export const EditNaturalLanguageRequestSchema = z.object({
	userId: z.string().uuid().optional(),
	plan: BuilderWeeklyPlanSchema,
	instruction: z.string().min(3).max(500),
	profile: UserProfileSchema.optional(),
	model: z.string().default('google/gemini-3.5-flash-lite'),
	temperature: z.number().min(0).max(2).default(0.4),
	skipCache: z.boolean().default(false),
});

export const EditNaturalLanguageResponseSchema = z.object({
	updatedPlan: BuilderWeeklyPlanSchema,
	summary: z.string(),
});

export type EditNaturalLanguageRequest = z.infer<typeof EditNaturalLanguageRequestSchema>;
export type EditNaturalLanguageResponse = z.infer<typeof EditNaturalLanguageResponseSchema>;

// ── 4. POST /workout/generate-full-week ─────────────────────────────────────

export const GenerateFullWeekRequestSchema = z.object({
	userId: z.string().uuid().optional(),
	partialPlan: BuilderWeeklyPlanSchema,
	profile: UserProfileSchema,
	model: z.string().default('google/gemini-3.5-flash-lite'),
	temperature: z.number().min(0).max(2).default(0.5),
	skipCache: z.boolean().default(false),
});

export const GenerateFullWeekResponseSchema = z.object({
	completePlan: BuilderWeeklyPlanSchema,
	daysGenerated: z.number().int().min(1).max(7),
});

export type GenerateFullWeekRequest = z.infer<typeof GenerateFullWeekRequestSchema>;
export type GenerateFullWeekResponse = z.infer<typeof GenerateFullWeekResponseSchema>;

// ── 5. POST /workout/apply-progression ─────────────────────────────────────

export const PriorPerformanceEntrySchema = z.object({
	exerciseId: z.string(),
	exerciseName: z.string().optional(),
	lastSession: z.object({
		completedAt: z.string(),
		sets: z.array(z.object({
			setNumber: z.number().int(),
			weightKg: z.number().nullable().optional(),
			reps: z.number().nullable().optional(),
			rpe: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable().optional(),
		})),
	}).optional(),
});

export const ApplyProgressionRequestSchema = z.object({
	userId: z.string().uuid().optional(),
	plan: BuilderWeeklyPlanSchema,
	priorPerformance: z.array(PriorPerformanceEntrySchema).max(50),
	model: z.string().default('google/gemini-3.5-flash-lite'),
	temperature: z.number().min(0).max(2).default(0.3),
	skipCache: z.boolean().default(false),
});

export const ApplyProgressionResponseSchema = z.object({
	updatedPlan: BuilderWeeklyPlanSchema,
	changes: z.array(z.object({
		exerciseId: z.string(),
		dayIndex: z.number().int().min(0),
		action: z.enum(['increase', 'hold', 'deload']),
		reason: z.string(),
	})),
});

export type ApplyProgressionRequest = z.infer<typeof ApplyProgressionRequestSchema>;
export type ApplyProgressionResponse = z.infer<typeof ApplyProgressionResponseSchema>;

// ── 6. POST /workout/deload ────────────────────────────────────────────────

export const DeloadRequestSchema = z.object({
	userId: z.string().uuid().optional(),
	plan: BuilderWeeklyPlanSchema,
	model: z.string().default('google/gemini-3.5-flash-lite'),
	skipCache: z.boolean().default(false),
});

export const DeloadResponseSchema = z.object({
	deloadPlan: BuilderWeeklyPlanSchema,
	volumeReductionPercent: z.number().min(0).max(100),
});

export type DeloadRequest = z.infer<typeof DeloadRequestSchema>;
export type DeloadResponse = z.infer<typeof DeloadResponseSchema>;
