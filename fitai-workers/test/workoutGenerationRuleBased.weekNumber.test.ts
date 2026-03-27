import { describe, it, expect } from 'vitest';
import { WorkoutGenerationRequestSchema } from '../src/utils/validation';

describe('WorkoutGenerationRequest weekNumber', () => {
	const baseRequest = {
		profile: {
			age: 25,
			weight: 75,
			height: 175,
			gender: 'male' as const,
			fitnessGoal: 'muscle_gain' as const,
			experienceLevel: 'intermediate' as const,
			availableEquipment: ['dumbbell' as const, 'barbell' as const],
			workoutsPerWeek: 4,
			workoutDuration: 45,
		},
		weeklyPlan: {
			workoutsPerWeek: 4,
			prefersVariety: false,
		},
	};

	it('accepts request without weekNumber (defaults to undefined)', () => {
		const result = WorkoutGenerationRequestSchema.safeParse(baseRequest);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.weekNumber).toBeUndefined();
		}
	});

	it('accepts request with weekNumber=3', () => {
		const result = WorkoutGenerationRequestSchema.safeParse({
			...baseRequest,
			weekNumber: 3,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.weekNumber).toBe(3);
		}
	});

	it('rejects weekNumber=0 (min is 1)', () => {
		const result = WorkoutGenerationRequestSchema.safeParse({
			...baseRequest,
			weekNumber: 0,
		});
		expect(result.success).toBe(false);
	});

	it('rejects weekNumber=5 (max is 4)', () => {
		const result = WorkoutGenerationRequestSchema.safeParse({
			...baseRequest,
			weekNumber: 5,
		});
		expect(result.success).toBe(false);
	});
});
