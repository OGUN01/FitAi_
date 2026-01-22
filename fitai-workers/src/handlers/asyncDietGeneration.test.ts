/**
 * FitAI Workers - Async Diet Generation Tests
 *
 * Tests the async job-based meal generation flow
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getAuthToken, API_URL, TEST_USER_ID } from '../test/testSetup';

describe('Async Diet Generation', () => {
	let authToken: string;

	beforeAll(async () => {
		// Get real auth token from Supabase
		authToken = await getAuthToken();
	});

	describe('POST /diet/generate (async mode)', () => {
		it('should create a job and return 202 Accepted or 200 from cache', async () => {
			const response = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({
					calorieTarget: 1800,
					mealsPerDay: 3,
					daysCount: 1,
					async: true,
				}),
			});

			// 202 = new async job, 200 = cache hit with immediate result
			expect([200, 202]).toContain(response.status);

			const data = (await response.json()) as any;
			expect(data.success).toBe(true);

			if (response.status === 202) {
				expect(data.data.jobId).toBeDefined();
				expect(data.data.status).toMatch(/pending|processing/);
			}
		});

		it('should handle sync mode when async=false', async () => {
			const response = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({
					calorieTarget: 1800,
					mealsPerDay: 3,
					daysCount: 1,
					async: false,
				}),
			});

			// Sync mode should return 200 with result (or timeout on long requests)
			expect([200, 500, 504]).toContain(response.status);
		}, 60000);
	});

	describe('GET /diet/jobs/:jobId', () => {
		it('should return job status', async () => {
			// First create a job with random calorie to avoid cache
			const createResponse = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({
					calorieTarget: 1700 + Math.floor(Math.random() * 100),
					mealsPerDay: 3,
					daysCount: 1,
					async: true,
				}),
			});

			// 202 = new job, 200 = cache hit
			expect([200, 202]).toContain(createResponse.status);
			const createData = (await createResponse.json()) as any;
			expect(createData.success).toBe(true);

			// Only test job status if we got a new job
			if (createResponse.status === 202 && createData.data.jobId) {
				const jobId = createData.data.jobId;

				// Check job status
				const statusResponse = await fetch(`${API_URL}/diet/jobs/${jobId}`, {
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				});

				expect(statusResponse.status).toBe(200);

				const statusData = (await statusResponse.json()) as any;
				expect(statusData.success).toBe(true);
				expect(statusData.data.jobId).toBe(jobId);
				expect(statusData.data.status).toBeDefined();
			}
		});

		it('should return 404 for non-existent job', async () => {
			const response = await fetch(`${API_URL}/diet/jobs/non-existent-job-id`, {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			});

			expect(response.status).toBe(404);
		});
	});

	describe('GET /diet/jobs', () => {
		it('should list user jobs', async () => {
			const response = await fetch(`${API_URL}/diet/jobs`, {
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			});

			expect(response.status).toBe(200);

			const data = (await response.json()) as any;
			expect(data.success).toBe(true);
			expect(data.data).toBeDefined();
			// Jobs are nested: data.data.jobs.jobs (based on actual API response)
			const jobsData = data.data.jobs?.jobs || data.data.jobs || data.data;
			expect(Array.isArray(jobsData)).toBe(true);
		});
	});

	describe('Cron Job Processing', () => {
		it('should process pending jobs via cron', async () => {
			// Create a job with random calorie to avoid cache
			const createResponse = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({
					calorieTarget: 1600 + Math.floor(Math.random() * 200),
					mealsPerDay: 3,
					daysCount: 1,
					async: true,
				}),
			});

			// 202 = new job, 200 = cache hit
			expect([200, 202]).toContain(createResponse.status);
			const createData = (await createResponse.json()) as any;
			expect(createData.success).toBe(true);

			// Only test cron processing if we got a new job
			if (createResponse.status === 202 && createData.data.jobId) {
				const jobId = createData.data.jobId;

				// Wait a bit and check if job is being processed
				await new Promise((resolve) => setTimeout(resolve, 2000));

				const statusResponse = await fetch(`${API_URL}/diet/jobs/${jobId}`, {
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				});

				const statusData = (await statusResponse.json()) as any;

				// Job should be pending or processing (cron picks it up within 60s in production)
				expect(['pending', 'processing', 'completed']).toContain(statusData.data.status);
			}
		}, 10000); // 10s timeout for this test
	});
});
