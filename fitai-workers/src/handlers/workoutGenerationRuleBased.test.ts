/**
 * FitAI Workers - Rule-Based Workout Generation: Injury Substitution Tests
 *
 * Regression coverage for two previously-dead-code safety paths:
 *  1. Step 3b injury substitution — a knee-injury profile must actually
 *     receive a knee-safe substitute (hip thrust / romanian deadlift /
 *     leg curl / glute bridge / calf raise style movement) instead of
 *     silently losing all lower-body training stimulus.
 *  2. The per-day 0-exercise guard — no day in the generated plan may ship
 *     with an empty exercises array, even for a dedicated "Legs" day when
 *     the user has a knee injury (which the coarse safety filter excludes
 *     wholesale by bodyPart).
 *
 * These are pure in-process unit tests (no network/auth) — the exercise
 * database is a static JSON import, so generateRuleBasedWorkout can be
 * exercised directly.
 */

import { describe, it, expect } from 'vitest';
import { generateRuleBasedWorkout } from './workoutGenerationRuleBased';
import { validateRequest, WorkoutGenerationRequestSchema } from '../utils/validation';

function buildKneeInjuryRequest() {
	return validateRequest(WorkoutGenerationRequestSchema, {
		userId: undefined,
		profile: {
			age: 30,
			weight: 75,
			height: 175,
			gender: 'male',
			fitnessGoal: 'muscle_gain',
			experienceLevel: 'intermediate',
			availableEquipment: ['body weight', 'dumbbell', 'barbell', 'cable', 'leverage machine', 'resistance band'],
			workoutDuration: 60,
			workoutsPerWeek: 4,
			// Onboarding sends the hyphenated PHYSICAL_LIMITATIONS_OPTIONS value,
			// not the underscored SUBSTITUTION_RULES vocabulary.
			injuries: ['knee-problems'],
		},
		weeklyPlan: {
			workoutsPerWeek: 4,
			prefersVariety: false,
			preferredDays: ['monday', 'tuesday', 'thursday', 'friday'],
		},
	});
}

describe('generateRuleBasedWorkout — injury substitution + per-day guard', () => {
	it('never ships a day with zero exercises, even under a knee-injury profile', async () => {
		const request = buildKneeInjuryRequest();
		const response = await generateRuleBasedWorkout(request);

		expect(response.workouts.length).toBeGreaterThan(0);
		for (const { dayOfWeek, workout } of response.workouts) {
			expect(workout.exercises.length, `day ${dayOfWeek} ("${workout.title}") shipped with 0 exercises`).toBeGreaterThan(0);
		}
	});

	it('substitutes a knee-safe replacement (hip thrust/RDL/leg curl/glute bridge/calf raise style movement) rather than dropping lower-body training entirely', async () => {
		const request = buildKneeInjuryRequest();
		const response = await generateRuleBasedWorkout(request);

		const allExerciseNames = response.workouts
			.flatMap((w) => w.workout.exercises)
			.map((ex) => ((ex as { name?: string }).name ?? '').toLowerCase());

		const kneeSafeSubstitutePattern = /(hip thrust|romanian deadlift|leg curl|glute bridge|calf raise|standing hip extension)/;
		const hasKneeSafeSubstitute = allExerciseNames.some((name) => kneeSafeSubstitutePattern.test(name));

		expect(hasKneeSafeSubstitute, `expected at least one knee-safe substitute among: ${JSON.stringify(allExerciseNames)}`).toBe(true);

		// And the plan must not contain any knee-contraindicated movement.
		const kneeUnsafePattern = /(squat|lunge|leg press|jump|step up|box jump)/;
		const unsafeExercises = allExerciseNames.filter((name) => kneeUnsafePattern.test(name));
		expect(unsafeExercises, `found knee-contraindicated exercises in a knee-injury plan: ${JSON.stringify(unsafeExercises)}`).toEqual([]);
	});
});
