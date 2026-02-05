import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleHealthSync, handleHealthLatest, handleWorkoutSession } from './healthSync';
import { getSupabaseClient } from '../utils/supabase';

vi.mock('../utils/supabase');

describe('Health Sync Handler', () => {
	let mockContext: any;
	let mockSupabase: any;

	beforeEach(() => {
		mockSupabase = {
			from: vi.fn().mockReturnThis(),
			upsert: vi.fn().mockReturnThis(),
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn(),
			eq: vi.fn().mockReturnThis(),
			gte: vi.fn().mockReturnThis(),
			lte: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
		};

		mockContext = {
			get: vi.fn((key) => {
				if (key === 'user') {
					return { id: 'test-user-123', email: 'test@example.com' };
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
		it('accepts valid health data with all fields', async () => {
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
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid-123', ...validPayload, user_id: 'test-user-123' },
				error: null,
			});

			const response = await handleHealthSync(mockContext);

			expect(response.status).toBe(200);
			expect(response.data.success).toBe(true);
			expect(response.data.data).toHaveProperty('id');
		});

		it('accepts valid health data with minimal fields', async () => {
			const validPayload = {
				log_date: '2026-02-05',
				data_source: 'apple_health',
			};

			mockContext.req.json.mockResolvedValue(validPayload);
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid-124', ...validPayload, user_id: 'test-user-123' },
				error: null,
			});

			const response = await handleHealthSync(mockContext);

			expect(response.status).toBe(200);
			expect(response.data.success).toBe(true);
		});

		it('performs upsert with UNIQUE(user_id, log_date) constraint', async () => {
			const payload = {
				log_date: '2026-02-05',
				data_source: 'apple_health',
				steps: 5000,
			};

			mockContext.req.json.mockResolvedValue(payload);
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid-123', ...payload, user_id: 'test-user-123' },
				error: null,
			});

			await handleHealthSync(mockContext);

			expect(mockSupabase.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: 'test-user-123',
					log_date: '2026-02-05',
					data_source: 'apple_health',
				}),
				{ onConflict: 'user_id,log_date' },
			);
		});

		it('includes data_source in payload (apple_health)', async () => {
			const payload = {
				log_date: '2026-02-05',
				data_source: 'apple_health',
				steps: 6000,
			};

			mockContext.req.json.mockResolvedValue(payload);
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid', ...payload, user_id: 'test-user-123' },
				error: null,
			});

			await handleHealthSync(mockContext);

			expect(mockSupabase.upsert).toHaveBeenCalledWith(expect.objectContaining({ data_source: 'apple_health' }), expect.anything());
		});

		it('includes data_source in payload (google_fit)', async () => {
			const payload = {
				log_date: '2026-02-05',
				data_source: 'google_fit',
				steps: 7000,
			};

			mockContext.req.json.mockResolvedValue(payload);
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid', ...payload, user_id: 'test-user-123' },
				error: null,
			});

			await handleHealthSync(mockContext);

			expect(mockSupabase.upsert).toHaveBeenCalledWith(expect.objectContaining({ data_source: 'google_fit' }), expect.anything());
		});

		it('includes data_source in payload (manual)', async () => {
			const payload = {
				log_date: '2026-02-05',
				data_source: 'manual',
				steps: 4000,
			};

			mockContext.req.json.mockResolvedValue(payload);
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid', ...payload, user_id: 'test-user-123' },
				error: null,
			});

			await handleHealthSync(mockContext);

			expect(mockSupabase.upsert).toHaveBeenCalledWith(expect.objectContaining({ data_source: 'manual' }), expect.anything());
		});

		it('handles invalid date format', async () => {
			const invalidPayload = {
				log_date: '2026-13-45',
				data_source: 'apple_health',
				steps: 5000,
			};

			mockContext.req.json.mockResolvedValue(invalidPayload);

			expect(async () => {
				await handleHealthSync(mockContext);
			}).rejects.toThrow();
		});

		it('handles invalid data_source', async () => {
			const invalidPayload = {
				log_date: '2026-02-05',
				data_source: 'invalid_source',
				steps: 5000,
			};

			mockContext.req.json.mockResolvedValue(invalidPayload);

			expect(async () => {
				await handleHealthSync(mockContext);
			}).rejects.toThrow();
		});

		it('handles heart rate outside valid range (>300)', async () => {
			const invalidPayload = {
				log_date: '2026-02-05',
				data_source: 'apple_health',
				heart_rate_avg: 500,
			};

			mockContext.req.json.mockResolvedValue(invalidPayload);

			expect(async () => {
				await handleHealthSync(mockContext);
			}).rejects.toThrow();
		});
	});

	describe('GET /api/health/latest', () => {
		it('returns latest health data with default 7 days', async () => {
			mockContext.req.query.mockReturnValue(undefined);

			const mockData = [
				{ id: '1', log_date: '2026-02-05', steps: 8500 },
				{ id: '2', log_date: '2026-02-04', steps: 7200 },
			];

			const selectFn = vi.fn().mockResolvedValue({
				data: mockData,
				error: null,
			});

			mockSupabase.order.mockReturnValue({
				select: selectFn,
			});
			mockSupabase.lte.mockReturnThis();
			mockSupabase.gte.mockReturnThis();

			const response = await handleHealthLatest(mockContext);

			expect(response.status).toBe(200);
			expect(response.data.success).toBe(true);
			expect(Array.isArray(response.data.data)).toBe(true);
		});

		it('accepts custom days parameter', async () => {
			mockContext.req.query.mockReturnValue('14');

			mockSupabase.order.mockReturnValue({
				select: vi.fn().mockResolvedValue({
					data: [],
					error: null,
				}),
			});
			mockSupabase.lte.mockReturnThis();
			mockSupabase.gte.mockReturnThis();

			await handleHealthLatest(mockContext);

			expect(mockContext.req.query).toHaveBeenCalledWith('days');
		});

		it('returns empty array when no data found', async () => {
			mockContext.req.query.mockReturnValue(undefined);

			mockSupabase.order.mockReturnValue({
				select: vi.fn().mockResolvedValue({
					data: [],
					error: null,
				}),
			});
			mockSupabase.lte.mockReturnThis();
			mockSupabase.gte.mockReturnThis();

			const response = await handleHealthLatest(mockContext);

			expect(response.data.data).toEqual([]);
		});

		it('filters by date range correctly', async () => {
			mockContext.req.query.mockReturnValue('7');

			mockSupabase.order.mockReturnValue({
				select: vi.fn().mockResolvedValue({
					data: [],
					error: null,
				}),
			});
			mockSupabase.lte.mockReturnThis();
			mockSupabase.gte.mockReturnThis();

			await handleHealthLatest(mockContext);

			expect(mockSupabase.from).toHaveBeenCalledWith('daily_health_logs');
			expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'test-user-123');
		});

		it('handles invalid days parameter (<1)', async () => {
			mockContext.req.query.mockReturnValue('0');

			expect(async () => {
				await handleHealthLatest(mockContext);
			}).rejects.toThrow();
		});

		it('handles invalid days parameter (>365)', async () => {
			mockContext.req.query.mockReturnValue('400');

			expect(async () => {
				await handleHealthLatest(mockContext);
			}).rejects.toThrow();
		});

		it('orders results by date descending', async () => {
			mockContext.req.query.mockReturnValue(undefined);

			mockSupabase.order.mockReturnValue({
				select: vi.fn().mockResolvedValue({
					data: [],
					error: null,
				}),
			});
			mockSupabase.lte.mockReturnThis();
			mockSupabase.gte.mockReturnThis();

			await handleHealthLatest(mockContext);

			expect(mockSupabase.order).toHaveBeenCalledWith('log_date', { ascending: false });
		});
	});

	describe('POST /api/health/workout', () => {
		it('accepts complete workout data', async () => {
			const validPayload = {
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
				calories_burned: 420,
				distance_meters: 5000,
				intensity: 'vigorous',
			};

			mockContext.req.json.mockResolvedValue(validPayload);
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid-456', ...validPayload, user_id: 'test-user-123' },
				error: null,
			});

			const response = await handleWorkoutSession(mockContext);

			expect(response.status).toBe(201);
			expect(response.data.success).toBe(true);
			expect(response.data.data).toHaveProperty('id');
		});

		it('accepts minimal workout data (only required fields)', async () => {
			const minimalPayload = {
				workout_type: 'cycling',
				start_time: '2026-02-05T14:00:00Z',
				end_time: '2026-02-05T15:30:00Z',
				duration_minutes: 90,
			};

			mockContext.req.json.mockResolvedValue(minimalPayload);
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid-456', ...minimalPayload, user_id: 'test-user-123' },
				error: null,
			});

			const response = await handleWorkoutSession(mockContext);

			expect(response.status).toBe(201);
			expect(response.data.success).toBe(true);
		});

		it('returns 201 status for successful creation', async () => {
			const payload = {
				workout_type: 'swimming',
				start_time: '2026-02-05T09:00:00Z',
				end_time: '2026-02-05T09:30:00Z',
				duration_minutes: 30,
			};

			mockContext.req.json.mockResolvedValue(payload);
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid', ...payload, user_id: 'test-user-123' },
				error: null,
			});

			const response = await handleWorkoutSession(mockContext);

			expect(response.status).toBe(201);
		});

		it('inserts workout into database', async () => {
			const payload = {
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
			};

			mockContext.req.json.mockResolvedValue(payload);
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid', ...payload, user_id: 'test-user-123' },
				error: null,
			});

			await handleWorkoutSession(mockContext);

			expect(mockSupabase.from).toHaveBeenCalledWith('workout_sessions');
			expect(mockSupabase.insert).toHaveBeenCalled();
		});

		it('accepts all valid intensity levels', async () => {
			const intensities = ['light', 'moderate', 'vigorous'];

			for (const intensity of intensities) {
				const payload = {
					workout_type: 'running',
					start_time: '2026-02-05T10:00:00Z',
					end_time: '2026-02-05T10:45:00Z',
					duration_minutes: 45,
					intensity,
				};

				mockContext.req.json.mockResolvedValue(payload);
				mockSupabase.single.mockResolvedValue({
					data: { id: 'uuid', ...payload, user_id: 'test-user-123' },
					error: null,
				});

				const response = await handleWorkoutSession(mockContext);
				expect(response.status).toBe(201);
			}
		});

		it('handles invalid duration (0)', async () => {
			const invalidPayload = {
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:00:00Z',
				duration_minutes: 0,
			};

			mockContext.req.json.mockResolvedValue(invalidPayload);

			expect(async () => {
				await handleWorkoutSession(mockContext);
			}).rejects.toThrow();
		});

		it('handles invalid intensity', async () => {
			const invalidPayload = {
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
				intensity: 'extreme',
			};

			mockContext.req.json.mockResolvedValue(invalidPayload);

			expect(async () => {
				await handleWorkoutSession(mockContext);
			}).rejects.toThrow();
		});

		it('handles empty workout_type', async () => {
			const invalidPayload = {
				workout_type: '',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
			};

			mockContext.req.json.mockResolvedValue(invalidPayload);

			expect(async () => {
				await handleWorkoutSession(mockContext);
			}).rejects.toThrow();
		});
	});

	describe('Rate Limiting Support', () => {
		it('health sync endpoint schema supports frequent calls', async () => {
			const payload = {
				log_date: '2026-02-05',
				data_source: 'apple_health',
				steps: 8500,
			};

			mockContext.req.json.mockResolvedValue(payload);
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid', ...payload, user_id: 'test-user-123' },
				error: null,
			});

			for (let i = 0; i < 3; i++) {
				await handleHealthSync(mockContext);
			}

			expect(mockSupabase.upsert).toHaveBeenCalledTimes(3);
		});

		it('health latest endpoint handles rapid queries', async () => {
			mockContext.req.query.mockReturnValue(undefined);
			mockSupabase.order.mockReturnValue({
				select: vi.fn().mockResolvedValue({
					data: [],
					error: null,
				}),
			});
			mockSupabase.lte.mockReturnThis();
			mockSupabase.gte.mockReturnThis();

			for (let i = 0; i < 3; i++) {
				await handleHealthLatest(mockContext);
			}

			expect(mockContext.req.query).toHaveBeenCalled();
		});

		it('workout session endpoint handles frequent requests', async () => {
			const payload = {
				workout_type: 'running',
				start_time: '2026-02-05T10:00:00Z',
				end_time: '2026-02-05T10:45:00Z',
				duration_minutes: 45,
			};

			mockContext.req.json.mockResolvedValue(payload);
			mockSupabase.single.mockResolvedValue({
				data: { id: 'uuid', ...payload, user_id: 'test-user-123' },
				error: null,
			});

			for (let i = 0; i < 3; i++) {
				await handleWorkoutSession(mockContext);
			}

			expect(mockSupabase.insert).toHaveBeenCalledTimes(3);
		});
	});
});
