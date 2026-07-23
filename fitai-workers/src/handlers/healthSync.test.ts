import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleHealthSync, handleHealthLatest, handleWorkoutSession } from './healthSync';
import { getSupabaseClient } from '../utils/supabase';

vi.mock('../utils/supabase');

/**
 * Builds a thenable Supabase query-builder mock that mirrors how supabase-js
 * works: chain methods (from/select/eq/gte/lte/insert/limit) return the builder
 * (so chains compose), and the builder itself is thenable — `await builder`
 * resolves to `directResponse`. Terminal methods (.single/.maybeSingle/.order/
 * .upsert) return their own Promises so they can be configured independently
 * for operations that the handler awaits at the terminal.
 */
function createMockSupabase() {
	let directResponse: any = { data: null, error: null };
	let singleResponse: any = { data: null, error: null };
	let maybeSingleResponse: any = { data: null, error: null };
	let orderResponse: any = { data: null, error: null };
	let upsertResponse: any = { data: null, error: null };

	const builder: any = {
		from: vi.fn(() => builder),
		insert: vi.fn(() => builder),
		select: vi.fn(() => builder),
		eq: vi.fn(() => builder),
		gte: vi.fn(() => builder),
		lte: vi.fn(() => builder),
		limit: vi.fn(() => builder),
		upsert: vi.fn(async () => upsertResponse),
		order: vi.fn(async () => orderResponse),
		single: vi.fn(async () => singleResponse),
		maybeSingle: vi.fn(async () => maybeSingleResponse),
		// thenable — chains awaited without a terminal resolve here.
		then: (resolve: any, reject: any) => Promise.resolve(directResponse).then(resolve, reject),
		_setDirect: (r: any) => {
			directResponse = r;
		},
		_setSingle: (r: any) => {
			singleResponse = r;
		},
		_setMaybeSingle: (r: any) => {
			maybeSingleResponse = r;
		},
		_setOrder: (r: any) => {
			orderResponse = r;
		},
		_setUpsert: (r: any) => {
			upsertResponse = r;
		},
	};
	return builder;
}

describe('Health Sync Handler', () => {
	let mockContext: any;
	let mockSupabase: any;

	beforeEach(() => {
		mockSupabase = createMockSupabase();

		mockContext = {
			get: vi.fn((key) => {
				if (key === 'user') {
					return { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', email: 'test@example.com' };
				}
				return undefined;
			}),
			req: {
				json: vi.fn(),
				query: vi.fn(),
			},
			json: vi.fn((data, status) => ({
				status,
				data,
			})),
			env: {
				SUPABASE_URL: 'https://test.supabase.co',
				SUPABASE_SERVICE_ROLE_KEY: 'test-key',
			},
		};

		vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase);
	});

	describe('POST /api/health/sync', () => {
		it('accepts valid health data with all fields and expands to EAV rows', async () => {
			// manual-priority read returns no existing manual rows.
			mockSupabase._setDirect({ data: [], error: null });
			mockSupabase._setUpsert({ data: null, error: null });

			const validPayload = {
				log_date: '2026-02-05',
				data_source: 'apple_health',
				steps: 8500,
				active_calories: 320,
				resting_calories: 150,
				heart_rate_avg: 72,
				resting_heart_rate: 68,
				sleep_hours: 7.5,
				water_intake_ml: 2000,
			};

			mockContext.req.json.mockResolvedValue(validPayload);

			const response = await handleHealthSync(mockContext);

			expect(response.status).toBe(200);
			expect(response.data.success).toBe(true);
			// 6 metrics: steps, active_calories, total_calories, heart_rate,
			// resting_heart_rate, sleep_hours. water_intake_ml has no metric_type.
			expect(response.data.data.saved).toBe(6);
			expect(response.data.data.date).toBe('2026-02-05');
		});

		it('accepts valid health data with minimal fields (no metrics)', async () => {
			const validPayload = {
				log_date: '2026-02-05',
				data_source: 'apple_health',
			};

			mockContext.req.json.mockResolvedValue(validPayload);

			const response = await handleHealthSync(mockContext);

			expect(response.status).toBe(200);
			expect(response.data.success).toBe(true);
			expect(response.data.data.saved).toBe(0);
			// No metrics → no DB calls at all.
			expect(mockSupabase.upsert).not.toHaveBeenCalled();
		});

		it('upserts EAV rows on (user_id, date, metric_type) conflict', async () => {
			mockSupabase._setDirect({ data: [], error: null });
			mockSupabase._setUpsert({ data: null, error: null });

			const payload = {
				log_date: '2026-02-05',
				data_source: 'apple_health',
				steps: 5000,
			};

			mockContext.req.json.mockResolvedValue(payload);

			await handleHealthSync(mockContext);

			expect(mockSupabase.from).toHaveBeenCalledWith('health_metrics');
			expect(mockSupabase.upsert).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
						date: '2026-02-05',
						metric_type: 'steps',
						value: 5000,
						unit: 'count',
						source: 'healthconnect',
					}),
				]),
				{ onConflict: 'user_id,date,metric_type' },
			);
		});

		it('maps data_source apple_health -> healthconnect', async () => {
			mockSupabase._setDirect({ data: [], error: null });
			mockSupabase._setUpsert({ data: null, error: null });

			const payload = {
				log_date: '2026-02-05',
				data_source: 'apple_health',
				steps: 6000,
			};

			mockContext.req.json.mockResolvedValue(payload);

			await handleHealthSync(mockContext);

			expect(mockSupabase.upsert).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ source: 'healthconnect' })]),
				expect.anything(),
			);
		});

		it('maps data_source google_fit -> healthconnect', async () => {
			mockSupabase._setDirect({ data: [], error: null });
			mockSupabase._setUpsert({ data: null, error: null });

			const payload = {
				log_date: '2026-02-05',
				data_source: 'google_fit',
				steps: 7000,
			};

			mockContext.req.json.mockResolvedValue(payload);

			await handleHealthSync(mockContext);

			expect(mockSupabase.upsert).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ source: 'healthconnect' })]),
				expect.anything(),
			);
		});

		it('maps data_source manual -> manual (and skips manual-priority read)', async () => {
			mockSupabase._setUpsert({ data: null, error: null });

			const payload = {
				log_date: '2026-02-05',
				data_source: 'manual',
				steps: 4000,
			};

			mockContext.req.json.mockResolvedValue(payload);

			await handleHealthSync(mockContext);

			expect(mockSupabase.upsert).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ source: 'manual' })]),
				expect.anything(),
			);
			// Manual writes must NOT read existing manual rows (manual is authoritative).
			expect(mockSupabase.eq).not.toHaveBeenCalledWith('source', 'manual');
		});

		it('excludes metrics the user already logged manually (healthconnect write)', async () => {
			// Existing manual 'steps' row for this date → steps excluded from the
			// healthconnect batch, but active_calories still upserted.
			mockSupabase._setDirect({ data: [{ metric_type: 'steps' }], error: null });
			mockSupabase._setUpsert({ data: null, error: null });

			const payload = {
				log_date: '2026-02-05',
				data_source: 'apple_health',
				steps: 5000,
				active_calories: 320,
			};

			mockContext.req.json.mockResolvedValue(payload);

			const response = await handleHealthSync(mockContext);

			expect(response.data.data.saved).toBe(1);
			expect(response.data.data.skipped_manual).toBe(1);
			expect(mockSupabase.upsert).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ metric_type: 'active_calories' })]),
				expect.anything(),
			);
			// steps must NOT be in the upsert batch.
			const upsertArg = mockSupabase.upsert.mock.calls[0][0] as any[];
			expect(upsertArg.find((r) => r.metric_type === 'steps')).toBeUndefined();
		});

		it('rejects when payload user_id does not match JWT user.id', async () => {
			mockSupabase._setUpsert({ data: null, error: null });

			const payload = {
				user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
				log_date: '2026-02-05',
				data_source: 'apple_health',
				steps: 5000,
			};

			mockContext.req.json.mockResolvedValue(payload);

			const err = await handleHealthSync(mockContext).catch((e: any) => e);

			expect(err.name).toBe('ForbiddenError');
			expect(mockSupabase.upsert).not.toHaveBeenCalled();
		});

		it('accepts matching payload user_id', async () => {
			mockSupabase._setDirect({ data: [], error: null });
			mockSupabase._setUpsert({ data: null, error: null });

			const payload = {
				user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
				log_date: '2026-02-05',
				data_source: 'apple_health',
				steps: 5000,
			};

			mockContext.req.json.mockResolvedValue(payload);

			const response = await handleHealthSync(mockContext);

			expect(response.status).toBe(200);
			expect(response.data.success).toBe(true);
		});

		it('handles invalid date format', async () => {
			// The schema validates the YYYY-MM-DD *format* (regex), not calendar
			// validity, so '2026-13-45' actually passes. Use a string that
			// genuinely fails the format regex to exercise the rejection path.
			mockContext.req.json.mockResolvedValue({
				log_date: '2026/02/05',
				data_source: 'apple_health',
				steps: 5000,
			});

			await expect(handleHealthSync(mockContext)).rejects.toThrow();
		});

		it('handles invalid data_source', async () => {
			mockContext.req.json.mockResolvedValue({
				log_date: '2026-02-05',
				data_source: 'invalid_source',
				steps: 5000,
			});

			await expect(handleHealthSync(mockContext)).rejects.toThrow();
		});

		it('handles heart rate outside valid range (>300)', async () => {
			mockContext.req.json.mockResolvedValue({
				log_date: '2026-02-05',
				data_source: 'apple_health',
				heart_rate_avg: 500,
			});

			await expect(handleHealthSync(mockContext)).rejects.toThrow();
		});

		it('propagates supabase upsert errors', async () => {
			mockSupabase._setDirect({ data: [], error: null });
			mockSupabase._setUpsert({ data: null, error: { message: 'constraint violation', code: '23505' } });

			mockContext.req.json.mockResolvedValue({
				log_date: '2026-02-05',
				data_source: 'apple_health',
				steps: 5000,
			});

			await expect(handleHealthSync(mockContext)).rejects.toThrow();
		});
	});

	describe('GET /api/health/latest', () => {
		it('returns latest health data grouped by date', async () => {
			mockContext.req.query.mockReturnValue(undefined);

			mockSupabase._setOrder({
				data: [
					{ date: '2026-02-05', metric_type: 'steps', value: 8500, unit: 'count', source: 'healthconnect' },
					{ date: '2026-02-05', metric_type: 'heart_rate', value: 72, unit: 'bpm', source: 'healthconnect' },
					{ date: '2026-02-04', metric_type: 'steps', value: 7200, unit: 'count', source: 'healthconnect' },
				],
				error: null,
			});

			const response = await handleHealthLatest(mockContext);

			expect(response.status).toBe(200);
			expect(response.data.success).toBe(true);
			expect(Array.isArray(response.data.data)).toBe(true);
			expect(response.data.data[0].date).toBe('2026-02-05');
			expect(response.data.data[0].metrics.steps.value).toBe(8500);
			expect(response.data.data[0].metrics.heart_rate.value).toBe(72);
		});

		it('accepts custom days parameter', async () => {
			mockContext.req.query.mockReturnValue('14');
			mockSupabase._setOrder({ data: [], error: null });

			await handleHealthLatest(mockContext);

			expect(mockContext.req.query).toHaveBeenCalledWith('days');
		});

		it('returns empty array when no data found', async () => {
			mockContext.req.query.mockReturnValue(undefined);
			mockSupabase._setOrder({ data: [], error: null });

			const response = await handleHealthLatest(mockContext);

			expect(response.data.data).toEqual([]);
		});

		it('queries health_metrics table filtered by user_id', async () => {
			mockContext.req.query.mockReturnValue('7');
			mockSupabase._setOrder({ data: [], error: null });

			await handleHealthLatest(mockContext);

			expect(mockSupabase.from).toHaveBeenCalledWith('health_metrics');
			expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
		});

		it('handles invalid days parameter (<1)', async () => {
			mockContext.req.query.mockReturnValue('0');

			await expect(handleHealthLatest(mockContext)).rejects.toThrow();
		});

		it('handles invalid days parameter (>365)', async () => {
			mockContext.req.query.mockReturnValue('400');

			await expect(handleHealthLatest(mockContext)).rejects.toThrow();
		});

		it('orders results by date descending', async () => {
			mockContext.req.query.mockReturnValue(undefined);
			mockSupabase._setOrder({ data: [], error: null });

			await handleHealthLatest(mockContext);

			expect(mockSupabase.order).toHaveBeenCalledWith('date', { ascending: false });
		});
	});

	describe('POST /api/health/workout', () => {
		function stubSuccess() {
			// workout_sessions insert (terminal .single)
			mockSupabase._setSingle({
				data: { id: 'uuid-456', workout_type: 'running', user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
				error: null,
			});
			// calories mirror manual-priority check (terminal .maybeSingle) → no manual row
			mockSupabase._setMaybeSingle({ data: null, error: null });
			// calories mirror upsert
			mockSupabase._setUpsert({ data: null, error: null });
		}

		it('accepts complete workout data and inserts into workout_sessions', async () => {
			stubSuccess();
			const payload = {
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
				calories_burned: 420,
				distance_meters: 5000,
				intensity: 'vigorous',
			};

			mockContext.req.json.mockResolvedValue(payload);

			const response = await handleWorkoutSession(mockContext);

			expect(response.status).toBe(201);
			expect(response.data.success).toBe(true);
			expect(response.data.data).toHaveProperty('id');
			expect(mockSupabase.from).toHaveBeenCalledWith('workout_sessions');
			expect(mockSupabase.insert).toHaveBeenCalled();
		});

		it('accepts minimal workout data (only required fields)', async () => {
			stubSuccess();
			const payload = {
				workout_type: 'cycling',
				start_time: '2026-02-05T14:00:00Z',
				end_time: '2026-02-05T15:30:00Z',
				duration_minutes: 90,
			};

			mockContext.req.json.mockResolvedValue(payload);

			const response = await handleWorkoutSession(mockContext);

			expect(response.status).toBe(201);
			expect(response.data.success).toBe(true);
		});

		it('returns 201 status for successful creation', async () => {
			stubSuccess();
			const payload = {
				workout_type: 'swimming',
				start_time: '2026-02-05T09:00:00Z',
				end_time: '2026-02-05T09:30:00Z',
				duration_minutes: 30,
			};

			mockContext.req.json.mockResolvedValue(payload);

			const response = await handleWorkoutSession(mockContext);

			expect(response.status).toBe(201);
		});

		it('mirrors calories_burned to health_metrics as active_calories', async () => {
			stubSuccess();
			const payload = {
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
				calories_burned: 420,
			};

			mockContext.req.json.mockResolvedValue(payload);

			await handleWorkoutSession(mockContext);

			expect(mockSupabase.from).toHaveBeenCalledWith('health_metrics');
			expect(mockSupabase.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					metric_type: 'active_calories',
					value: 420,
					date: '2026-02-05',
					source: 'healthconnect',
				}),
				{ onConflict: 'user_id,date,metric_type' },
			);
		});

		it('does not mirror calories when a manual active_calories entry exists', async () => {
			stubSuccess();
			// Existing manual active_calories row → mirror skipped.
			mockSupabase._setMaybeSingle({ data: { id: 'manual-row' }, error: null });

			const payload = {
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
				calories_burned: 420,
			};

			mockContext.req.json.mockResolvedValue(payload);

			await handleWorkoutSession(mockContext);

			// Only workout_sessions insert happened; NO health_metrics upsert.
			expect(mockSupabase.upsert).not.toHaveBeenCalled();
		});

		it('skips the calories mirror when calories_burned is absent', async () => {
			stubSuccess();
			const payload = {
				workout_type: 'yoga',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:30:00Z',
				duration_minutes: 30,
			};

			mockContext.req.json.mockResolvedValue(payload);

			await handleWorkoutSession(mockContext);

			expect(mockSupabase.upsert).not.toHaveBeenCalled();
		});

		it('rejects when payload user_id does not match JWT user.id', async () => {
			stubSuccess();
			const payload = {
				user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
			};

			mockContext.req.json.mockResolvedValue(payload);

			const err = await handleWorkoutSession(mockContext).catch((e: any) => e);

			expect(err.name).toBe('ForbiddenError');
			expect(mockSupabase.insert).not.toHaveBeenCalled();
		});

		it('accepts all valid intensity levels', async () => {
			const intensities = ['light', 'moderate', 'vigorous'];

			for (const intensity of intensities) {
				stubSuccess();
				const payload = {
					workout_type: 'running',
					start_time: '2026-02-05T10:00:00Z',
					end_time: '2026-02-05T10:45:00Z',
					duration_minutes: 45,
					intensity,
				};

				mockContext.req.json.mockResolvedValue(payload);

				const response = await handleWorkoutSession(mockContext);
				expect(response.status).toBe(201);
			}
		});

		it('handles invalid duration (0)', async () => {
			mockContext.req.json.mockResolvedValue({
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:00:00Z',
				duration_minutes: 0,
			});

			await expect(handleWorkoutSession(mockContext)).rejects.toThrow();
		});

		it('handles invalid intensity', async () => {
			mockContext.req.json.mockResolvedValue({
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
				intensity: 'extreme',
			});

			await expect(handleWorkoutSession(mockContext)).rejects.toThrow();
		});

		it('handles empty workout_type', async () => {
			mockContext.req.json.mockResolvedValue({
				workout_type: '',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
			});

			await expect(handleWorkoutSession(mockContext)).rejects.toThrow();
		});
	});

	describe('Rate Limiting Support', () => {
		it('health sync endpoint supports frequent calls', async () => {
			mockSupabase._setDirect({ data: [], error: null });
			mockSupabase._setUpsert({ data: null, error: null });

			const payload = {
				log_date: '2026-02-05',
				data_source: 'apple_health',
				steps: 8500,
			};

			mockContext.req.json.mockResolvedValue(payload);

			for (let i = 0; i < 3; i++) {
				await handleHealthSync(mockContext);
			}

			expect(mockSupabase.upsert).toHaveBeenCalledTimes(3);
		});

		it('health latest endpoint handles rapid queries', async () => {
			mockContext.req.query.mockReturnValue(undefined);
			mockSupabase._setOrder({ data: [], error: null });

			for (let i = 0; i < 3; i++) {
				await handleHealthLatest(mockContext);
			}

			expect(mockContext.req.query).toHaveBeenCalled();
		});

		it('workout session endpoint handles frequent requests', async () => {
			mockSupabase._setSingle({
				data: { id: 'uuid-456', workout_type: 'running', user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
				error: null,
			});
			mockSupabase._setMaybeSingle({ data: null, error: null });
			mockSupabase._setUpsert({ data: null, error: null });

			const payload = {
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
			};

			mockContext.req.json.mockResolvedValue(payload);

			for (let i = 0; i < 3; i++) {
				await handleWorkoutSession(mockContext);
			}

			// 3 workout_sessions inserts.
			expect(mockSupabase.insert).toHaveBeenCalledTimes(3);
		});
	});
});
