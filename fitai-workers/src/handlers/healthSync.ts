/**
 * FitAI Workers - Health Sync Handler
 *
 * Endpoints for syncing health data from wearables:
 * - POST /api/health/sync - Receive health data from app (writes health_metrics)
 * - GET /api/health/latest - Get latest synced metrics (reads health_metrics)
 * - POST /api/health/workout - Save workout session (workout_sessions + health_metrics)
 *
 * DATA MODEL (mirrors src/services/healthMetricsData.ts):
 * The `health_metrics` table is an EAV (entity-attribute-value) shape: ONE ROW
 * per (user_id, date, metric_type) with value/unit/source columns. A single
 * sync payload carrying steps + HR + calories etc. therefore expands to N rows,
 * upserted in a single batch on the UNIQUE(user_id, date, metric_type) conflict.
 *
 * SOURCE PRIORITY (mirrors the app's saveHealthSnapshot): a healthconnect write
 * must NEVER clobber a value the user explicitly logged as source='manual' for
 * the same (user_id, date, metric_type). We read existing manual metric types
 * for the target date first and exclude them from the batch upsert. Manual
 * writes overwrite everything.
 *
 * SECURITY: the worker uses the SUPABASE_SERVICE_ROLE_KEY, which BYPASSES Row
 * Level Security. The JWT-authenticated `user.id` (set by authMiddleware) is
 * therefore the only thing authorizing a write to a given user_id. Every write
 * path checks `user.id === payload.user_id` (when user_id is supplied) and
 * always stamps the JWT user.id as the row owner — never trusts a client-supplied
 * user_id without verification.
 */

import { Context } from 'hono';
import { z, ZodError } from 'zod';
import { Env } from '../utils/types';
import { getSupabaseClient } from '../utils/supabase';
import {
	APIError,
	ForbiddenError,
	ValidationError,
	DatabaseError,
	handleSupabaseError,
} from '../utils/errors';

// ============================================================================
// CONSTANTS — mirror src/services/healthMetricsData.ts METRIC_UNITS
// ============================================================================
// Keep in sync with the app-side METRIC_UNITS map. This is the single source
// of truth for which metric_type values the worker will persist and what unit
// each carries. Anything not in this map is dropped from the sync payload.
const METRIC_UNITS: Record<string, string> = {
	steps: 'count',
	heart_rate: 'bpm',
	resting_heart_rate: 'bpm',
	active_calories: 'kcal',
	total_calories: 'kcal',
	distance_km: 'km',
	weight_kg: 'kg',
	sleep_hours: 'hours',
	heart_rate_variability: 'ms',
	oxygen_saturation: '%',
	body_fat: '%',
};

/**
 * Map the payload's `data_source` ('apple_health' | 'google_fit' | 'manual')
 * onto the `health_metrics.source` column ('healthconnect' | 'manual').
 * apple_health/google_fit are both sensor syncs → 'healthconnect'; only an
 * explicit 'manual' source is treated as a manual entry (and is therefore
 * authoritative — it overwrites healthconnect rows for the same metric).
 */
function toMetricSource(dataSource: 'apple_health' | 'google_fit' | 'manual'): 'healthconnect' | 'manual' {
	return dataSource === 'manual' ? 'manual' : 'healthconnect';
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

const HealthSyncSchema = z.object({
	// Optional client-supplied user_id — ALWAYS verified against JWT user.id below.
	// If omitted, the JWT user.id is used. Never trusted on its own.
	user_id: z.string().uuid().optional(),
	log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Must be YYYY-MM-DD'),
	data_source: z.enum(['apple_health', 'google_fit', 'manual']).describe(
		'Data source: apple_health, google_fit, or manual',
	),
	steps: z.number().int().min(0).max(100000).optional().nullable(),
	active_calories: z.number().min(0).optional().nullable(),
	resting_calories: z.number().min(0).optional().nullable(),
	heart_rate_avg: z.number().min(30).max(220).optional().nullable(),
	resting_heart_rate: z.number().min(20).max(200).optional().nullable(),
	sleep_hours: z.number().min(0).max(24).optional().nullable(),
	water_intake_ml: z.number().int().min(0).optional().nullable(),
});

const WorkoutSessionSchema = z.object({
	// Optional client-supplied user_id — ALWAYS verified against JWT user.id below.
	user_id: z.string().uuid().optional(),
	workout_type: z.string().min(1).max(50).describe('Type of workout (e.g., running, cycling)'),
	start_time: z.string().datetime().describe('ISO 8601 datetime when workout started'),
	end_time: z.string().datetime().describe('ISO 8601 datetime when workout ended'),
	duration_minutes: z.number().int().min(1).max(1440).describe('Workout duration in minutes'),
	calories_burned: z.number().min(0).optional().nullable().describe('Estimated calories burned'),
	distance_meters: z.number().min(0).optional().nullable().describe('Distance covered in meters'),
	intensity: z
		.enum(['light', 'moderate', 'vigorous'])
		.optional()
		.nullable()
		.describe('Workout intensity level'),
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
// SECURITY HELPER
// ============================================================================

/**
 * Verify that the JWT-authenticated user matches a client-supplied user_id.
 *
 * The worker runs with the service-role key and therefore BYPASSES RLS. The
 * JWT user.id (set by authMiddleware) is the only trustworthy identity. If the
 * payload carries a user_id, it MUST equal the JWT user.id or we refuse the
 * write — otherwise a user could write health data to another user's row.
 *
 * Returns the verified user_id to stamp on every row.
 */
function verifyUserIdentity(jwtUserId: string, payloadUserId: string | undefined): string {
	if (payloadUserId && payloadUserId !== jwtUserId) {
		console.error(
			`[HealthSync] user_id mismatch: JWT=${jwtUserId} payload=${payloadUserId}. Refusing write.`,
		);
		throw new ForbiddenError('Authenticated user does not match requested user_id', {
			jwt_user_id: jwtUserId,
			payload_user_id: payloadUserId,
		});
	}
	return jwtUserId;
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * POST /api/health/sync - Receive and store health data
 *
 * Accepts a wide health snapshot (steps, calories, HR, sleep, ...) for a given
 * date and EXPANDS it into one EAV row per metric_type in `health_metrics`, then
 * batch-upserts on (user_id, date, metric_type). Mirrors the app-side
 * saveHealthSnapshot exactly so the server-side path and the client-SDK path
 * produce identical state.
 *
 * SOURCE PRIORITY: a 'healthconnect' sync (apple_health/google_fit) never
 * overwrites a metric the user already logged manually for that date — we read
 * existing manual metric types first and exclude them from the batch.
 *
 * Request body:
 * {
 *   "user_id": "uuid",          // optional; verified against JWT
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
 *   "data": { "saved": 6, "skipped_manual": 0, "date": "2026-02-05" }
 * }
 */
export async function handleHealthSync(c: any): Promise<Response> {
	try {
		const user = (c.get('user') || {}) as any;
		if (!user.id) {
			throw new APIError('Authentication required', 401, 'UNAUTHORIZED' as any);
		}

		const jwtUserId = user.id;

		let payload: HealthSyncPayload;
		try {
			const body = await c.req.json();
			payload = HealthSyncSchema.parse(body);
		} catch (error) {
			if (error instanceof ZodError) {
				// Zod 4 exposes issues on `.issues` (`.errors` is undefined); guard
				// both so this never throws a masking TypeError on a validation path.
				const issueList = (error as any).issues ?? (error as any).errors ?? [];
				const details = issueList.map((err: any) => ({
					field: err.path.join('.'),
					message: err.message,
				}));
				throw new ValidationError('Invalid health sync payload', { errors: details });
			}
			throw error;
		}

		// SECURITY: verify client-supplied user_id matches the JWT identity. The
		// verified JWT user.id is the only value ever stamped onto rows.
		const userId = verifyUserIdentity(jwtUserId, payload.user_id);
		const source = toMetricSource(payload.data_source);

		// Pivot the wide payload into metric_type -> value entries that the
		// health_metrics EAV table understands. Only finite values are kept
		// (value column is NUMERIC NOT NULL).
		const metricEntries: Array<{ metric_type: string; value: number }> = [];
		if (Number.isFinite(payload.steps)) metricEntries.push({ metric_type: 'steps', value: payload.steps as number });
		if (Number.isFinite(payload.active_calories))
			metricEntries.push({ metric_type: 'active_calories', value: payload.active_calories as number });
		if (Number.isFinite(payload.resting_calories))
			metricEntries.push({ metric_type: 'total_calories', value: payload.resting_calories as number });
		if (Number.isFinite(payload.heart_rate_avg))
			metricEntries.push({ metric_type: 'heart_rate', value: payload.heart_rate_avg as number });
		if (Number.isFinite(payload.resting_heart_rate))
			metricEntries.push({ metric_type: 'resting_heart_rate', value: payload.resting_heart_rate as number });
		if (Number.isFinite(payload.sleep_hours))
			metricEntries.push({ metric_type: 'sleep_hours', value: payload.sleep_hours as number });

		if (metricEntries.length === 0) {
			return c.json(
				{ success: true, data: { saved: 0, skipped_manual: 0, date: payload.log_date } },
				200,
			);
		}

		const supabase = getSupabaseClient(c.env);

		// SOURCE PRIORITY — only healthconnect writes are gated. For a manual
		// write we skip the read and let the batch overwrite everything
		// (manual is authoritative). Read existing manual metric types for the
		// target date and exclude them so a sensor sync can't clobber a manual
		// value (e.g. a sensor reporting 0 for a metric the user logged by hand).
		let manualMetricTypes = new Set<string>();
		if (source === 'healthconnect') {
			const { data: manualRows, error: manualReadError } = await supabase
				.from('health_metrics')
				.select('metric_type')
				.eq('user_id', userId)
				.eq('date', payload.log_date)
				.eq('source', 'manual');
			if (manualReadError) {
				handleSupabaseError(manualReadError, 'Health sync manual-priority read failed');
			}
			manualMetricTypes = new Set((manualRows ?? []).map((r: any) => r.metric_type));
		}

		const rowsToUpsert = metricEntries
			.filter((e) => !manualMetricTypes.has(e.metric_type))
			.map((e) => ({
				user_id: userId,
				date: payload.log_date,
				metric_type: e.metric_type,
				value: e.value,
				unit: METRIC_UNITS[e.metric_type] ?? null,
				source,
				recorded_at: new Date().toISOString(),
			}));

		const skippedManual = metricEntries.length - rowsToUpsert.length;
		if (rowsToUpsert.length === 0) {
			// All candidate metrics were already manually logged — preserve them.
			return c.json(
				{ success: true, data: { saved: 0, skipped_manual: skippedManual, date: payload.log_date } },
				200,
			);
		}

		// Single batched upsert — atomic (all or nothing). onConflict matches the
		// UNIQUE(user_id, date, metric_type) constraint.
		const { error: upsertError } = await supabase
			.from('health_metrics')
			.upsert(rowsToUpsert, { onConflict: 'user_id,date,metric_type' });

		if (upsertError) {
			handleSupabaseError(upsertError, 'Health sync upsert failed');
		}

		return c.json(
			{
				success: true,
				data: { saved: rowsToUpsert.length, skipped_manual: skippedManual, date: payload.log_date },
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
 * Returns health_metrics rows for the authenticated user within the requested
 * window, grouped by date. Because health_metrics is EAV (one row per
 * metric_type), the raw rows are pivoted into a map of date -> metric_type ->
 * { value, unit, source } so callers get the same wide shape they would from a
 * legacy daily_health_logs table.
 *
 * Query params:
 * - days: Number of days to look back (default: 7, max: 365)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     { "date": "2026-02-05", "metrics": { "steps": { "value": 8500, "unit": "count", "source": "healthconnect" }, ... } },
 *     { "date": "2026-02-04", "metrics": { ... } }
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

		const endDate = new Date();
		const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

		const startDateStr = startDate.toISOString().split('T')[0];
		const endDateStr = endDate.toISOString().split('T')[0];

		const supabase = getSupabaseClient(c.env);

		const { data, error } = await supabase
			.from('health_metrics')
			.select('date, metric_type, value, unit, source')
			.eq('user_id', userId)
			.gte('date', startDateStr)
			.lte('date', endDateStr)
			.order('date', { ascending: false });

		if (error) {
			handleSupabaseError(error, 'Failed to fetch health data');
		}

		// Pivot the EAV rows into date -> metric_type -> { value, unit, source }.
		// Multiple rows for the same date collapse into one metrics map. Dates
		// with no rows simply do not appear.
		const byDate = new Map<string, Record<string, { value: number; unit: string | null; source: string }>>();
		(data ?? []).forEach((row: any) => {
			const bucket = byDate.get(row.date) ?? {};
			bucket[row.metric_type] = {
				value: Number(row.value),
				unit: row.unit,
				source: row.source,
			};
			byDate.set(row.date, bucket);
		});

		const grouped = Array.from(byDate.entries()).map(([date, metrics]) => ({ date, metrics }));

		return c.json(
			{
				success: true,
				data: grouped,
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
 * Stores the workout in the `workout_sessions` table (which exists with a
 * full schema — see 20260226000001 + 20260316000001 + 20260327000001), and also
 * mirrors the workout's calories_burned into `health_metrics` as an
 * active_calories row for the workout's start date so it shows up in health
 * history alongside sensor-synced calorie data.
 *
 * Request body:
 * {
 *   "user_id": "uuid",          // optional; verified against JWT
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

		const jwtUserId = user.id;

		let payload: WorkoutSessionPayload;
		try {
			const body = await c.req.json();
			payload = WorkoutSessionSchema.parse(body);
		} catch (error) {
			if (error instanceof ZodError) {
				// Zod 4 exposes issues on `.issues` (`.errors` is undefined); guard
				// both so this never throws a masking TypeError on a validation path.
				const issueList = (error as any).issues ?? (error as any).errors ?? [];
				const details = issueList.map((err: any) => ({
					field: err.path.join('.'),
					message: err.message,
				}));
				throw new ValidationError('Invalid workout session payload', { errors: details });
			}
			throw error;
		}

		// SECURITY: verify client-supplied user_id matches the JWT identity.
		const userId = verifyUserIdentity(jwtUserId, payload.user_id);

		const supabase = getSupabaseClient(c.env);

		const workoutData = {
			user_id: userId,
			workout_type: payload.workout_type,
			started_at: payload.start_time,
			completed_at: payload.end_time,
			total_duration_minutes: payload.duration_minutes,
			calories_burned: payload.calories_burned ?? null,
			is_completed: true,
			notes:
				[
					payload.distance_meters ? `Distance: ${payload.distance_meters}m` : null,
					payload.intensity ? `Intensity: ${payload.intensity}` : null,
				]
					.filter(Boolean)
					.join('; ') || null,
			created_at: new Date().toISOString(),
		};

		const { data, error } = await supabase
			.from('workout_sessions')
			.insert(workoutData)
			.select('*')
			.single();

		if (error) {
			handleSupabaseError(error, 'Workout session insert failed');
		}

		// Mirror the workout's calorie burn into health_metrics as an
		// active_calories row for the workout's start date, so it appears in
		// health history. Uses the same EAV upsert as the sync path — if a
		// manual entry already exists for (user, date, active_calories) it is
		// NOT clobbered (manual-priority check).
		if (Number.isFinite(payload.calories_burned) && payload.calories_burned != null) {
			const workoutDate = payload.start_time.split('T')[0];

			// Manual-priority: skip if the user already logged active_calories
			// manually for this date.
			const { data: existingManual, error: manualCheckError } = await supabase
				.from('health_metrics')
				.select('id')
				.eq('user_id', userId)
				.eq('date', workoutDate)
				.eq('metric_type', 'active_calories')
				.eq('source', 'manual')
				.limit(1)
				.maybeSingle();

			if (manualCheckError) {
				console.error('[WorkoutSession] Failed manual-priority check:', manualCheckError);
			} else if (!existingManual) {
				const { error: metricError } = await supabase
					.from('health_metrics')
					.upsert(
						{
							user_id: userId,
							date: workoutDate,
							metric_type: 'active_calories',
							value: payload.calories_burned as number,
							unit: METRIC_UNITS.active_calories,
							source: 'healthconnect',
							recorded_at: new Date().toISOString(),
						},
						{ onConflict: 'user_id,date,metric_type' },
					);

				if (metricError) {
					console.error('[WorkoutSession] Failed to mirror calories to health_metrics:', metricError);
				}
			}
		}

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
