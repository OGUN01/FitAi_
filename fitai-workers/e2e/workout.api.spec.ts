import { test, expect } from '@playwright/test';

/**
 * Workout Generation API Tests
 * Tests the /workout/generate endpoint
 */

// Sample user profile for testing (format matching API schema)
const sampleUserProfile = {
	profile: {
		age: 30,
		gender: 'male',
		height: 175,
		weight: 75,
		fitnessGoal: 'muscle_gain',
		experienceLevel: 'intermediate',
		equipment: ['dumbbells', 'barbell', 'bodyweight'],
	},
	weeklyPlan: {
		workoutsPerWeek: 3,
		preferredDays: ['monday', 'wednesday', 'friday'],
		workoutTypes: ['strength'],
		preferredWorkoutTime: 'morning',
		activityLevel: 'moderate',
		prefersVariety: true,
	},
};

// Invalid profile for testing validation
const invalidProfile = {
	personalInfo: {
		age: 30,
		gender: 'male',
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
			data: invalidProfile,
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

test.describe('Workout Generation with Auth', () => {
	test('POST /workout/generate returns workout plan with valid token', async ({ request }) => {
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

		// Should return 200 OK with workout data
		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.data).toBeDefined();
	});
});
