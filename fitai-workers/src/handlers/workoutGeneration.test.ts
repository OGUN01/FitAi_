/**
 * FitAI Workers - Workout Generation E2E Tests
 *
 * Tests the workout generation endpoint with various scenarios
 * Covers rule-based and AI-based generation flows
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getAuthToken, API_URL } from '../test/testSetup';

describe('Workout Generation Tests', () => {
	let authToken: string;

	beforeAll(async () => {
		// Get real auth token from Supabase
		authToken = await getAuthToken();
	});

	// Helper to create a valid profile
	const createProfile = (overrides = {}) => ({
		age: 30,
		weight: 75,
		height: 175,
		gender: 'male',
		fitnessGoal: 'muscle_gain',
		experienceLevel: 'intermediate',
		availableEquipment: ['body weight', 'dumbbell'],
		workoutDuration: 60,
		workoutsPerWeek: 4,
		...overrides,
	});

	// Helper to create a valid weekly plan
	const createWeeklyPlan = (overrides = {}) => ({
		workoutsPerWeek: 4,
		prefersVariety: false,
		preferredWorkoutTime: 'morning',
		...overrides,
	});

	describe('Test 1: Basic Workout Generation', () => {
		it('should generate a basic workout plan', async () => {
			const response = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					profile: createProfile({
						fitnessGoal: 'muscle_gain',
						experienceLevel: 'intermediate',
						availableEquipment: ['dumbbell', 'barbell', 'body weight'],
					}),
					weeklyPlan: createWeeklyPlan({ workoutsPerWeek: 4 }),
				}),
			});

			expect([200, 202]).toContain(response.status);

			if (response.status === 200) {
				const data = (await response.json()) as any;
				expect(data.success).toBe(true);
				expect(data.data.workouts).toBeDefined();
				expect(Array.isArray(data.data.workouts)).toBe(true);
			}
		}, 120000); // 2min timeout for AI generation
	});

	describe('Test 2: Beginner Workout Plan', () => {
		it('should generate beginner-friendly workout', async () => {
			const response = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					profile: createProfile({
						fitnessGoal: 'weight_loss',
						experienceLevel: 'beginner',
						availableEquipment: ['body weight'],
						workoutDuration: 45,
					}),
					weeklyPlan: createWeeklyPlan({ workoutsPerWeek: 3 }),
				}),
			});

			expect([200, 202]).toContain(response.status);
		}, 120000);
	});

	describe('Test 3: Advanced Strength Training', () => {
		it('should generate advanced strength program', async () => {
			const response = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					profile: createProfile({
						fitnessGoal: 'strength',
						experienceLevel: 'advanced',
						availableEquipment: ['dumbbell', 'barbell', 'body weight', 'cable'],
						workoutDuration: 90,
					}),
					weeklyPlan: createWeeklyPlan({ workoutsPerWeek: 5 }),
				}),
			});

			expect([200, 202]).toContain(response.status);
		}, 120000);
	});

	describe('Test 4: Cardio-Focused Plan', () => {
		it('should generate cardio and endurance workout', async () => {
			const response = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					profile: createProfile({
						fitnessGoal: 'endurance',
						experienceLevel: 'intermediate',
						availableEquipment: ['body weight', 'stationary bike'],
						workoutDuration: 60,
					}),
					weeklyPlan: createWeeklyPlan({ workoutsPerWeek: 4 }),
				}),
			});

			expect([200, 202]).toContain(response.status);
		}, 120000);
	});

	describe('Test 5: Bodyweight Only', () => {
		it('should generate bodyweight-only workout', async () => {
			const response = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					profile: createProfile({
						fitnessGoal: 'muscle_gain',
						experienceLevel: 'intermediate',
						availableEquipment: ['body weight'],
						workoutDuration: 45,
					}),
					weeklyPlan: createWeeklyPlan({ workoutsPerWeek: 4 }),
				}),
			});

			expect([200, 202]).toContain(response.status);
		}, 120000);
	});

	describe('Test 6: Full Gym Equipment', () => {
		it('should utilize full gym equipment', async () => {
			const response = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					profile: createProfile({
						fitnessGoal: 'muscle_gain',
						experienceLevel: 'advanced',
						availableEquipment: ['dumbbell', 'barbell', 'body weight', 'cable', 'machine', 'leverage machine'],
						workoutDuration: 75,
					}),
					weeklyPlan: createWeeklyPlan({ workoutsPerWeek: 6 }),
				}),
			});

			expect([200, 202]).toContain(response.status);
		}, 120000);
	});

	describe('Test 7: Women-Specific Program', () => {
		it('should generate women-focused workout', async () => {
			const response = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					profile: createProfile({
						gender: 'female',
						fitnessGoal: 'weight_loss',
						experienceLevel: 'intermediate',
						availableEquipment: ['dumbbell', 'resistance band', 'body weight'],
						workoutDuration: 50,
					}),
					weeklyPlan: createWeeklyPlan({ workoutsPerWeek: 4 }),
				}),
			});

			expect([200, 202]).toContain(response.status);
		}, 120000);
	});

	describe('Test 8: Split Training Program', () => {
		it('should generate split training schedule', async () => {
			const response = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					profile: createProfile({
						fitnessGoal: 'muscle_gain',
						experienceLevel: 'advanced',
						availableEquipment: ['dumbbell', 'barbell', 'body weight', 'cable'],
						workoutDuration: 90,
					}),
					weeklyPlan: createWeeklyPlan({
						workoutsPerWeek: 5,
						prefersVariety: true,
						workoutTypes: ['push', 'pull', 'legs'],
					}),
				}),
			});

			expect([200, 202]).toContain(response.status);
		}, 120000);
	});

	describe('Test 9: Error Handling', () => {
		it('should reject invalid days per week', async () => {
			const response = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					profile: createProfile(),
					weeklyPlan: createWeeklyPlan({ workoutsPerWeek: 10 }), // Invalid - max is 7
				}),
			});

			expect(response.status).toBe(400);
		}, 30000); // Add 30s timeout

		it('should reject missing authentication', async () => {
			const response = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					profile: createProfile(),
					weeklyPlan: createWeeklyPlan(),
				}),
			});

			expect(response.status).toBe(401);
		}, 30000); // Add 30s timeout
	});

	describe('Test 10: Cache Behavior', () => {
		it('should use cache for identical requests', async () => {
			const requestBody = {
				profile: createProfile({
					fitnessGoal: 'muscle_gain',
					experienceLevel: 'intermediate',
					availableEquipment: ['dumbbell', 'barbell', 'body weight'],
				}),
				weeklyPlan: createWeeklyPlan({ workoutsPerWeek: 4 }),
			};

			// First request
			const response1 = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			});

			expect([200, 202]).toContain(response1.status);

			// Second identical request (should hit cache)
			const response2 = await fetch(`${API_URL}/workout/generate`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			});

			expect([200, 202]).toContain(response2.status);

			if (response2.status === 200) {
				const data = (await response2.json()) as any;
				// Check if response indicates cache hit
				expect(data.metadata?.cached).toBeDefined();
			}
		}, 240000); // 4min for two requests
	});
});
