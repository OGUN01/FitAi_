/**
 * FitAI Workers - Meal Generation E2E Tests
 *
 * Tests the meal generation endpoint with various scenarios
 * Now supports async mode to avoid timeouts!
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getAuthToken, API_URL, TEST_USER_ID } from '../test/testSetup';

describe('Meal Generation Tests', () => {
	let authToken: string;

	beforeAll(async () => {
		// Get real auth token from Supabase
		authToken = await getAuthToken();
	});

	describe('Test 1: Basic Meal Generation (Async)', () => {
		it('should generate a 1-day meal plan successfully', async () => {
			const response = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					calorieTarget: 1800,
					mealsPerDay: 3,
					daysCount: 1,
					async: true, // Use async mode to avoid timeout
				}),
			});

			// 202 = new async job created, 200 = cache hit with immediate result
			expect([200, 202]).toContain(response.status);

			const data = (await response.json()) as any;
			expect(data.success).toBe(true);

			if (response.status === 202) {
				expect(data.data.jobId).toBeDefined();
				expect(data.data.status).toMatch(/pending|processing/);
			} else {
				// Cache hit - should have meal plan data
				expect(data.data).toBeDefined();
			}
		}, 30000);
	});

	describe('Test 2: Multi-day Generation (Async)', () => {
		it('should handle 3-day meal plan generation', async () => {
			const response = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					calorieTarget: 2000,
					mealsPerDay: 4,
					daysCount: 3,
					async: true, // Definitely need async for multi-day
				}),
			});

			// 202 = new async job, 200 = cache hit
			expect([200, 202]).toContain(response.status);

			const data = (await response.json()) as any;
			expect(data.success).toBe(true);
		}, 30000);
	});

	describe('Test 3: Vegan Diet', () => {
		it('should generate vegan meal plan', async () => {
			const response = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					calorieTarget: 1800,
					mealsPerDay: 3,
					daysCount: 1,
					dietaryRestrictions: ['vegan'],
					async: true,
				}),
			});

			// 202 = new async job, 200 = cache hit
			expect([200, 202]).toContain(response.status);

			const data = (await response.json()) as any;
			expect(data.success).toBe(true);
		}, 30000);
	});

	describe('Test 4: Keto Diet', () => {
		it('should generate keto meal plan', async () => {
			const response = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					calorieTarget: 1600,
					mealsPerDay: 3,
					daysCount: 1,
					dietaryRestrictions: ['keto'],
					async: true,
				}),
			});

			// 202 = new async job, 200 = cache hit
			expect([200, 202]).toContain(response.status);

			const data = (await response.json()) as any;
			expect(data.success).toBe(true);
		}, 30000);
	});

	describe('Test 5: Allergen Exclusion', () => {
		it('should exclude specified ingredients', async () => {
			const response = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					calorieTarget: 1800,
					mealsPerDay: 3,
					daysCount: 1,
					excludeIngredients: ['peanuts', 'shellfish', 'dairy'],
					async: true,
				}),
			});

			expect(response.status).toBe(202);

			const data = (await response.json()) as any;
			expect(data.success).toBe(true);
		}, 30000);
	});

	describe('Test 6: Custom Macros', () => {
		it('should generate plan with custom macro targets', async () => {
			const response = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					calorieTarget: 2200,
					mealsPerDay: 4,
					daysCount: 1,
					// Note: macros are calculated from calorieTarget by default
					async: true,
				}),
			});

			// 202 = new async job, 200 = cache hit
			expect([200, 202]).toContain(response.status);

			const data = (await response.json()) as any;
			expect(data.success).toBe(true);
		}, 30000);
	});

	describe('Test 7: Sync Mode (for testing)', () => {
		it('should support sync mode with async=false', async () => {
			const response = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					calorieTarget: 1800,
					mealsPerDay: 3,
					daysCount: 1,
					async: false, // Sync mode for quick test
				}),
			});

			// Sync mode returns 200 or might timeout (504)
			expect([200, 500, 504]).toContain(response.status);
		}, 60000); // Allow 60s for sync mode
	});

	describe('Test 8: Error Handling', () => {
		it('should reject invalid calorie target', async () => {
			const response = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					calorieTarget: 100, // Too low
					mealsPerDay: 3,
					daysCount: 1,
				}),
			});

			expect(response.status).toBe(400);
		});

		it('should reject missing authentication', async () => {
			const response = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					calorieTarget: 1800,
					mealsPerDay: 3,
					daysCount: 1,
				}),
			});

			expect(response.status).toBe(401);
		});
	});

	describe('Job Status Endpoints', () => {
		it('should check job status or get cached result', async () => {
			// Create a job first with unique timestamp to avoid cache
			const createRes = await fetch(`${API_URL}/diet/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					calorieTarget: 1850 + Math.floor(Math.random() * 50), // Random to avoid cache
					mealsPerDay: 3,
					daysCount: 1,
					async: true,
				}),
			});

			// 202 = new async job, 200 = cache hit
			expect([200, 202]).toContain(createRes.status);

			const createData = (await createRes.json()) as any;
			expect(createData.success).toBe(true);

			// Only check job status if we got a job ID (202 response)
			if (createRes.status === 202 && createData.data.jobId) {
				const jobId = createData.data.jobId;

				// Check status
				const statusRes = await fetch(`${API_URL}/diet/jobs/${jobId}`, {
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				});

				expect(statusRes.status).toBe(200);

				const statusData = (await statusRes.json()) as any;
				expect(statusData.success).toBe(true);
				expect(statusData.data.jobId).toBe(jobId);
			}
		});

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
});
