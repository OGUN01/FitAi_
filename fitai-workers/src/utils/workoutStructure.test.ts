/**
 * Unit tests for mesocycle progressive overload in assignWorkoutParameters.
 *
 * Regression guard: previously `weekNumber` only changed the cache key + a text
 * note; sets/reps/rest were IDENTICAL across all 4 mesocycle weeks. These
 * tests pin the week-over-week scaling so the "progressive overload" product
 * claim stays real. See src/docs/FLOW-AUDIT.md §2 + src/docs/VERIFIED-FINDINGS.md.
 */
import { describe, it, expect } from 'vitest';
import { assignWorkoutParameters } from './workoutStructure';
import type { WorkoutDayExercises, ClassifiedExercise } from './exerciseSelection';

function makeExercise(
  id: string,
  classification: 'compound' | 'auxiliary' | 'isolation' | 'cardio' = 'compound',
): ClassifiedExercise {
  return {
    exerciseId: id,
    name: id,
    equipment: ['dumbbell'],
    bodyParts: ['chest'],
    classification,
    complexityScore: 5,
  } as ClassifiedExercise;
}

function makeWorkoutDay(exercises: ClassifiedExercise[]): WorkoutDayExercises {
  return {
    dayName: 'monday',
    workoutType: 'strength',
    exercises,
    totalExercises: exercises.length,
    distribution: { compound: exercises.length, auxiliary: 0, isolation: 0 },
  };
}

const profile = {
  experienceLevel: 'intermediate',
  fitnessGoal: 'muscle_gain',
  age: 30,
  weight: 75,
  gender: 'male',
} as any;

describe('assignWorkoutParameters — mesocycle progressive overload', () => {
  it('scales volume DOWN on deload week (week 4) vs week 1', () => {
    const day = makeWorkoutDay([makeExercise('bench', 'compound')]);
    const w1 = assignWorkoutParameters(day, profile, undefined, 1)[0];
    const w4 = assignWorkoutParameters(day, profile, undefined, 4)[0];

    // Deload: sets multiplier 0.7 → fewer sets than baseline
    expect(w4.sets).toBeLessThan(w1.sets);
    // Deload: rep range ceiling drops (-2)
    const w1Max = parseInt(w1.reps.split('-')[1], 10);
    const w4Max = parseInt(w4.reps.split('-')[1], 10);
    expect(w4Max).toBeLessThan(w1Max);
    // Deload: rest INCREASES (+30s) for recovery
    expect(w4.restSeconds).toBeGreaterThan(w1.restSeconds);
  });

  it('scales intensity UP on peak week (week 3) vs week 1', () => {
    const day = makeWorkoutDay([makeExercise('bench', 'compound')]);
    const w1 = assignWorkoutParameters(day, profile, undefined, 1)[0];
    const w3 = assignWorkoutParameters(day, profile, undefined, 3)[0];

    // Peak: rep-range FLOOR lifts (+1) so the user pushes heavier weight
    const w1Min = parseInt(w1.reps.split('-')[0], 10);
    const w3Min = parseInt(w3.reps.split('-')[0], 10);
    expect(w3Min).toBeGreaterThan(w1Min);
    // Peak: rest increases (+10s) for heavier sets
    expect(w3.restSeconds).toBeGreaterThan(w1.restSeconds);
  });

  it('adds volume on week 2 (rep-ceiling +1) without changing sets', () => {
    const day = makeWorkoutDay([makeExercise('bench', 'compound')]);
    const w1 = assignWorkoutParameters(day, profile, undefined, 1)[0];
    const w2 = assignWorkoutParameters(day, profile, undefined, 2)[0];

    // Week 2: sets multiplier 1.0 → same set count
    expect(w2.sets).toBe(w1.sets);
    // Week 2: rep ceiling +1 → more volume at the top of the range
    const w1Max = parseInt(w1.reps.split('-')[1], 10);
    const w2Max = parseInt(w2.reps.split('-')[1], 10);
    expect(w2Max).toBeGreaterThan(w1Max);
  });

  it('produces a DIFFERENT plan each week of the mesocycle (no more static plans)', () => {
    const day = makeWorkoutDay([makeExercise('bench', 'compound')]);
    const plans = [1, 2, 3, 4].map((w) =>
      JSON.stringify(assignWorkoutParameters(day, profile, undefined, w)[0]),
    );
    // At least 3 distinct weekly plans (weeks differ on reps/rest/sets)
    const unique = new Set(plans);
    expect(unique.size).toBeGreaterThanOrEqual(3);
  });

  it('defaults to week-1 baseline when weekNumber is omitted (backward compat)', () => {
    const day = makeWorkoutDay([makeExercise('bench', 'compound')]);
    const omitted = assignWorkoutParameters(day, profile)[0];
    const explicit1 = assignWorkoutParameters(day, profile, undefined, 1)[0];
    expect(omitted).toEqual(explicit1);
  });

  it('clamps out-of-range week numbers to the 1-4 mesocycle', () => {
    const day = makeWorkoutDay([makeExercise('bench', 'compound')]);
    const w0 = assignWorkoutParameters(day, profile, undefined, 0)[0];
    const w1 = assignWorkoutParameters(day, profile, undefined, 1)[0];
    const w9 = assignWorkoutParameters(day, profile, undefined, 9)[0];
    const w4 = assignWorkoutParameters(day, profile, undefined, 4)[0];
    // 0 → clamped to 1 (baseline)
    expect(w0).toEqual(w1);
    // 9 → clamped to 4 (deload)
    expect(w9).toEqual(w4);
  });
});
