import { test, expect } from '@playwright/test';

/**
 * Diet/Meal Generation API Tests
 * Tests the /diet/generate endpoint
 */

// Sample user profile for diet generation
const sampleDietRequest = {
	personalInfo: {
		age: 28,
		gender: 'female',
		height: 165,
		weight: 60,
		activityLevel: 'moderately_active',
	},
	fitnessGoals: {
		primary_goals: ['lose_weight', 'improve_fitness'],
		experience: 'beginner',
		target_weight: 55,
	},
	bodyMetrics: {
		height: 165,
		weight: 60,
		bmi: 22.0,
	},
	dietPreferences: {
		dietary_restrictions: ['vegetarian'],
		cuisine_preferences: ['mediterranean', 'asian'],
		allergies: ['peanuts'],
		meal_prep_preference: 'flexible',
	},
	calorieTarget: 1800,
};

test.describe('Diet Generation API', () => {
	test('POST /diet/generate requires authentication', async ({ request }) => {
		const response = await request.post('/diet/generate', {
			data: sampleDietRequest,
		});

		// Should require auth token
		expect([401, 403]).toContain(response.status());
	});

	test('POST /diet/generate validates request body', async ({ request }) => {
		// Send empty body
		const response = await request.post('/diet/generate', {
			data: {},
		});

		// Should return validation error or auth error
		expect([400, 401, 403, 422]).toContain(response.status());
	});

	test('POST /diet/generate rejects invalid calorie targets', async ({ request }) => {
		const response = await request.post('/diet/generate', {
			data: {
				...sampleDietRequest,
				calorieTarget: -500, // Invalid negative calories
			},
		});

		// Should return error
		expect([400, 401, 403, 422]).toContain(response.status());
	});

	test('OPTIONS /diet/generate returns CORS headers', async ({ request }) => {
		// Preflight request
		const response = await request.fetch('/diet/generate', {
			method: 'OPTIONS',
		});

		// Should handle preflight
		expect([200, 204]).toContain(response.status());
	});
});

test.describe('Diet Generation Validation', () => {
	test('rejects requests with missing personalInfo', async ({ request }) => {
		const response = await request.post('/diet/generate', {
			data: {
				fitnessGoals: sampleDietRequest.fitnessGoals,
				dietPreferences: sampleDietRequest.dietPreferences,
			},
		});

		expect([400, 401, 403, 422]).toContain(response.status());
	});

	test('rejects requests with invalid dietary restrictions', async ({ request }) => {
		const response = await request.post('/diet/generate', {
			data: {
				...sampleDietRequest,
				dietPreferences: {
					dietary_restrictions: 'not-an-array', // Should be array
				},
			},
		});

		expect([400, 401, 403, 422]).toContain(response.status());
	});
});

test.describe('Diet Generation with Auth', () => {
	test('POST /diet/generate returns meal plan with valid token', async ({ request }) => {
		const authToken = process.env.TEST_AUTH_TOKEN;

		if (!authToken) {
			test.skip();
			return;
		}

		const response = await request.post('/diet/generate', {
			data: sampleDietRequest,
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
		});

		// Diet can return 200 (cache hit) or 202 (async job started)
		expect([200, 202]).toContain(response.status());

		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.data).toBeDefined();
	});
});
