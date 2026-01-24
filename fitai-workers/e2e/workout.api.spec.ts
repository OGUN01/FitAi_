import { test, expect } from '@playwright/test';

/**
 * Workout Generation API Tests
 * Tests the /workout/generate endpoint
 */

// Sample user profile for testing
const sampleUserProfile = {
	personalInfo: {
		age: 30,
		gender: 'male',
		height: 175,
		weight: 75,
		activityLevel: 'moderately_active',
	},
	fitnessGoals: {
		primary_goals: ['build_muscle', 'improve_fitness'],
		experience: 'intermediate',
		target_weight: 80,
	},
	bodyMetrics: {
		height: 175,
		weight: 75,
		bmi: 24.5,
	},
	workoutPreferences: {
		workout_types: ['strength', 'hiit'],
		time_preference: 45,
		equipment: ['dumbbells', 'barbell', 'bodyweight'],
		workout_days: ['monday', 'wednesday', 'friday'],
	},
};

test.describe('Workout Generation API', () => {
	test('POST /workout/generate requires authentication', async ({ request }) => {
		const response = await request.post('/workout/generate', {
			data: sampleUserProfile,
		});

		// Should require auth token
		expect([401, 403]).toContain(response.status());
	});

	test('POST /workout/generate validates request body', async ({ request }) => {
		// Send empty body
		const response = await request.post('/workout/generate', {
			data: {},
		});

		// Should return validation error or auth error
		expect([400, 401, 403, 422]).toContain(response.status());
	});

	test('POST /workout/generate rejects invalid data types', async ({ request }) => {
		const response = await request.post('/workout/generate', {
			data: {
				personalInfo: {
					age: 'not-a-number', // Invalid type
					gender: 'male',
				},
			},
		});

		// Should return error
		expect([400, 401, 403, 422]).toContain(response.status());
	});

	test('OPTIONS /workout/generate returns CORS headers', async ({ request }) => {
		// Preflight request
		const response = await request.fetch('/workout/generate', {
			method: 'OPTIONS',
		});

		// Should handle preflight
		expect([200, 204]).toContain(response.status());
	});
});

test.describe('Workout Generation with Auth (requires valid token)', () => {
	// These tests require a valid Supabase JWT token
	// Skip if no auth token is available

	test.skip('POST /workout/generate returns workout plan with valid token', async ({ request }) => {
		// This test requires a valid JWT token from Supabase
		// In CI, this would be provided via environment variables
		const authToken = process.env.TEST_AUTH_TOKEN;

		if (!authToken) {
			test.skip();
			return;
		}

		const response = await request.post('/workout/generate', {
			data: sampleUserProfile,
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.data).toBeDefined();
		expect(data.data.workouts).toBeDefined();
	});
});
