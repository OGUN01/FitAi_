/**
 * Regression test for a real bug found via Playwright testing of Workout
 * Engine v2 (2026-09-04): applying "Deload Week" silently wiped a day's
 * cardio block while correctly preserving its strength exercises.
 *
 * Root cause: `BuilderDayWorkoutSchema` (used by every builder-AI endpoint
 * that round-trips a plan — deload, apply-progression, natural-language
 * edit, replace, generate) had no `cardioBlocks` field at all, so Zod's
 * default unknown-key-stripping silently dropped it from `request.plan`
 * before any handler logic ran — independent of what the handler itself
 * does with the plan. Fixed by adding CardioBlockSchema + wiring it into
 * BuilderDayWorkoutSchema.
 */
import { describe, it, expect } from 'vitest';
import { BuilderDayWorkoutSchema, CardioBlockSchema } from './validation';

function makeMinimalDay(overrides: Record<string, unknown> = {}) {
	return {
		id: 'day-1',
		title: 'Monday',
		description: '',
		category: 'strength',
		difficulty: 'intermediate',
		duration: 45,
		exercises: [],
		plannedExercises: [],
		equipment: [],
		targetMuscleGroups: [],
		icon: 'barbell',
		tags: [],
		isPersonalized: false,
		aiGenerated: false,
		createdAt: new Date().toISOString(),
		dayOfWeek: 'monday',
		subCategory: 'full_body',
		intensityLevel: 'moderate',
		warmUp: [],
		coolDown: [],
		progressionNotes: [],
		safetyConsiderations: [],
		expectedBenefits: [],
		...overrides,
	};
}

describe('CardioBlockSchema', () => {
	it('accepts a valid cardio block', () => {
		const result = CardioBlockSchema.safeParse({
			id: 'cardio-1',
			kind: 'cardio',
			name: 'Treadmill Run',
			durationMinutes: 20,
			intensity: 'moderate',
			distanceKm: 3.5,
		});
		expect(result.success).toBe(true);
	});

	it('accepts a cardio block with only the required fields', () => {
		const result = CardioBlockSchema.safeParse({
			id: 'cardio-2',
			kind: 'cardio',
			name: 'Rowing',
			durationMinutes: 15,
			intensity: 'high',
		});
		expect(result.success).toBe(true);
	});

	it('rejects a non-cardio kind literal', () => {
		const result = CardioBlockSchema.safeParse({
			id: 'cardio-3',
			kind: 'strength',
			name: 'Bad Block',
			durationMinutes: 15,
			intensity: 'high',
		});
		expect(result.success).toBe(false);
	});
});

describe('BuilderDayWorkoutSchema — cardioBlocks survival (regression)', () => {
	it('preserves cardioBlocks through parsing when present', () => {
		const day = makeMinimalDay({
			cardioBlocks: [
				{
					id: 'cardio-1',
					kind: 'cardio',
					name: 'Treadmill Run',
					durationMinutes: 20,
					intensity: 'moderate',
					distanceKm: 5,
				},
			],
		});

		const result = BuilderDayWorkoutSchema.parse(day);

		// The actual bug: before this fix, `cardioBlocks` had no field
		// declared on the schema, so Zod's default .parse() behavior
		// silently stripped it here — this assertion is what previously
		// failed (result.cardioBlocks was undefined).
		expect(result.cardioBlocks).toHaveLength(1);
		expect(result.cardioBlocks?.[0]).toMatchObject({
			id: 'cardio-1',
			name: 'Treadmill Run',
			durationMinutes: 20,
			intensity: 'moderate',
			distanceKm: 5,
		});
	});

	it('parses cleanly with no cardioBlocks (optional field, back-compat)', () => {
		const day = makeMinimalDay();
		const result = BuilderDayWorkoutSchema.parse(day);
		expect(result.cardioBlocks).toBeUndefined();
	});
});
