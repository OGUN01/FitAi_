/**
 * FitAI Workers - Health Sync Handler
 *
 * Endpoints for syncing health data from wearables:
 * - POST /api/health/sync - Receive health data from app
 * - GET /api/health/latest - Get latest synced metrics
 * - POST /api/health/workout - Save workout session
 *
 * Supports idempotent upserts using UNIQUE(user_id, log_date) constraint
 * with data_source column ('apple_health', 'google_fit', 'manual')
 */

import { Context } from 'hono';
import { z, ZodError } from 'zod';
import { Env } from '../utils/types';
import { getSupabaseClient } from '../utils/supabase';
import { APIError, ValidationError, DatabaseError, handleSupabaseError } from '../utils/errors';

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

const HealthSyncSchema = z.object({
	log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Must be YYYY-MM-DD'),
	data_source: z.enum(['apple_health', 'google_fit', 'manual']).describe('Data source: apple_health, google_fit, or manual'),
	steps: z.number().int().min(0).optional().nullable(),
	active_calories: z.number().min(0).optional().nullable(),
	resting_calories: z.number().min(0).optional().nullable(),
	heart_rate_avg: z.number().min(0).max(300).optional().nullable(),
	resting_heart_rate: z.number().min(20).max(200).optional().nullable(),
	sleep_hours: z.number().min(0).max(24).optional().nullable(),
	water_intake_ml: z.number().int().min(0).optional().nullable(),
});

const WorkoutSessionSchema = z.object({
	workout_type: z.string().min(1).max(50).describe('Type of workout (e.g., running, cycling)'),
	start_time: z.string().datetime().describe('ISO 8601 datetime when workout started'),
	end_time: z.string().datetime().describe('ISO 8601 datetime when workout ended'),
	duration_minutes: z.number().int().min(1).max(1440).describe('Workout duration in minutes'),
	calories_burned: z.number().min(0).optional().nullable().describe('Estimated calories burned'),
	distance_meters: z.number().min(0).optional().nullable().describe('Distance covered in meters'),
	intensity: z.enum(['light', 'moderate', 'vigorous']).optional().nullable().describe('Workout intensity level'),
});

const HealthLatestQuerySchema = z.object({
	days: z
		.string()
		.transform((val) => parseInt(val, 10))
		.refine((val) => !isNaN(val) && val > 0 && val <= 365, 'Days must be between 1 and 365')
		.optional()
		.default(() => 7),
});

type HealthSyncPayload = z.infer<typeof HealthSyncSchema>;
type WorkoutSessionPayload = z.infer<typeof WorkoutSessionSchema>;

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * POST /api/health/sync - Receive and store health data
 *
 * Accepts health metrics from wearable devices and stores them in daily_health_logs
 * with idempotent upserts (UNIQUE(user_id, log_date) prevents duplicates)
 *
 * Request body:
 * {
 *   "log_date": "2026-02-05",
 *   "data_source": "apple_health",
 *   "steps": 8500,
 *   "active_calories": 320,
 *   "heart_rate_avg": 72,
 *   "sleep_hours": 7.5
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": { "id": "uuid", "log_date": "2026-02-05", ... }
 * }
 */
export async function handleHealthSync(c: any): Promise<Response> {
	try {
		const user = (c.get('user') || {}) as any;
		if (!user.id) {
			throw new APIError('Authentication required', 401, 'UNAUTHORIZED' as any);
		}

		const userId = user.id;

		let payload: HealthSyncPayload;
		try {
			const body = await c.req.json();
			payload = HealthSyncSchema.parse(body);
		} catch (error) {
			if (error instanceof ZodError) {
				const details = (error as any).errors.map((err: any) => ({
					field: err.path.join('.'),
					message: err.message,
				}));
				throw new ValidationError('Invalid health sync payload', { errors: details });
			}
			throw error;
		}

		console.log(`[HealthSync] Processing health data for user ${userId} on ${payload.log_date}`);

		const supabase = getSupabaseClient(c.env);

		const healthLogData = {
			user_id: userId,
			log_date: payload.log_date,
			data_source: payload.data_source,
			steps: payload.steps ?? null,
			active_calories: payload.active_calories ?? null,
			resting_calories: payload.resting_calories ?? null,
			heart_rate_avg: payload.heart_rate_avg ?? null,
			resting_heart_rate: payload.resting_heart_rate ?? null,
			sleep_hours: payload.sleep_hours ?? null,
			water_intake_ml: payload.water_intake_ml ?? null,
			updated_at: new Date().toISOString(),
		};

		const { data, error } = await supabase
			.from('daily_health_logs')
			.upsert(healthLogData, {
				onConflict: 'user_id,log_date',
			})
			.select('*')
			.single();

		if (error) {
			handleSupabaseError(error, 'Health sync upsert failed');
		}

		console.log(`[HealthSync] Successfully synced health data. ID: ${data?.id}`);

		return c.json(
			{
				success: true,
				data,
			},
			200,
		);
	} catch (error) {
		console.error('[HealthSync] Error:', error);

		if (error instanceof APIError) {
			throw error;
		}

		throw new DatabaseError('Failed to sync health data', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * GET /api/health/latest - Retrieve latest health metrics
 *
 * Returns the most recent health data for the authenticated user
 * Query params:
 * - days: Number of days to look back (default: 7, max: 365)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     { "log_date": "2026-02-05", "steps": 8500, "heart_rate_avg": 72, ... },
 *     { "log_date": "2026-02-04", "steps": 7200, ... }
 *   ]
 * }
 */
export async function handleHealthLatest(c: any): Promise<Response> {
	try {
		const user = (c.get('user') || {}) as any;
		if (!user.id) {
			throw new APIError('Authentication required', 401, 'UNAUTHORIZED' as any);
		}

		const userId = user.id;

		let daysBack = 7;
		try {
			const daysParam = c.req.query('days');
			if (daysParam) {
				const validation = HealthLatestQuerySchema.parse({ days: daysParam });
				daysBack = validation.days;
			}
		} catch (error) {
			if (error instanceof ZodError) {
				throw new ValidationError('Invalid query parameters', {
					errors: (error as any).errors,
				});
			}
			throw error;
		}

		console.log(`[HealthLatest] Fetching latest ${daysBack} days for user ${userId}`);

		const endDate = new Date();
		const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

		const startDateStr = startDate.toISOString().split('T')[0];
		const endDateStr = endDate.toISOString().split('T')[0];

		const supabase = getSupabaseClient(c.env);

		const { data, error } = await supabase
			.from('daily_health_logs')
			.select('*')
			.eq('user_id', userId)
			.gte('log_date', startDateStr)
			.lte('log_date', endDateStr)
			.order('log_date', { ascending: false });

		if (error) {
			handleSupabaseError(error, 'Failed to fetch health data');
		}

		console.log(`[HealthLatest] Retrieved ${data?.length || 0} health records`);

		return c.json(
			{
				success: true,
				data: data || [],
			},
			200,
		);
	} catch (error) {
		console.error('[HealthLatest] Error:', error);

		if (error instanceof APIError) {
			throw error;
		}

		throw new DatabaseError('Failed to retrieve health data', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * POST /api/health/workout - Save workout session
 *
 * Stores workout data in workout_sessions table
 *
 * Request body:
 * {
 *   "workout_type": "running",
 *   "start_time": "2026-02-05T10:00:00Z",
 *   "end_time": "2026-02-05T10:45:00Z",
 *   "duration_minutes": 45,
 *   "calories_burned": 420,
 *   "distance_meters": 5000,
 *   "intensity": "vigorous"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": { "id": "uuid", "workout_type": "running", ... }
 * }
 */
export async function handleWorkoutSession(c: any): Promise<Response> {
	try {
		const user = (c.get('user') || {}) as any;
		if (!user.id) {
			throw new APIError('Authentication required', 401, 'UNAUTHORIZED' as any);
		}

		const userId = user.id;

		let payload: WorkoutSessionPayload;
		try {
			const body = await c.req.json();
			payload = WorkoutSessionSchema.parse(body);
		} catch (error) {
			if (error instanceof ZodError) {
				const details = (error as any).errors.map((err: any) => ({
					field: err.path.join('.'),
					message: err.message,
				}));
				throw new ValidationError('Invalid workout session payload', { errors: details });
			}
			throw error;
		}

		console.log(`[WorkoutSession] Saving workout for user ${userId}: ${payload.workout_type}`);

		const supabase = getSupabaseClient(c.env);

		const workoutData = {
			user_id: userId,
			workout_type: payload.workout_type,
			start_time: payload.start_time,
			end_time: payload.end_time,
			duration_minutes: payload.duration_minutes,
			calories_burned: payload.calories_burned ?? null,
			distance_meters: payload.distance_meters ?? null,
			intensity: payload.intensity ?? null,
			created_at: new Date().toISOString(),
		};

		const { data, error } = await supabase.from('workout_sessions').insert(workoutData).select('*').single();

		if (error) {
			handleSupabaseError(error, 'Workout session insert failed');
		}

		console.log(`[WorkoutSession] Successfully saved workout. ID: ${data?.id}`);

		return c.json(
			{
				success: true,
				data,
			},
			201,
		);
	} catch (error) {
		console.error('[WorkoutSession] Error:', error);

		if (error instanceof APIError) {
			throw error;
		}

		throw new DatabaseError('Failed to save workout session', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
