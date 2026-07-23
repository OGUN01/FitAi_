/**
 * Regression tests for weekly muscle-group balance in the rule-based engine.
 *
 * Pins the known bug: a 4-day HIIT/weight-loss plan previously shipped with
 * pectorals 0x, lats 1x, delts 0x (the split template used 'pecs' which matches
 * nothing in exerciseDatabase.json, and validateMuscleBalance only WARNED
 * without fixing). These tests assert that after generateWeeklyExercisePlan +
 * rebalanceMuscleBalance every major group is trained >=2x/week.
 *
 * Pure-conditioning splits (cardio-only) are exempt — see the documented
 * exemption below. The HIIT split has strength components, so balance applies.
 */
import { describe, it, expect } from 'vitest';
import {
  generateWeeklyExercisePlan,
  validateMuscleBalance,
  rebalanceMuscleBalance,
  classifyExercise,
} from './exerciseSelection';
import { getSplitById } from './workoutSplits';
import type { ExerciseWithMetadata } from './safetyFilter';
import type { UserProfile } from './validation';

// ----------------------------------------------------------------------------
// Mock exercise pool — mirrors the field shape of exerciseDatabase.json.
// targetMuscles use DB-canonical names: 'pectorals' (NOT 'pecs'), 'delts',
// 'lats', 'quads', 'hamstrings'. At least 3 compounds per major group so the
// rebalancer has fresh candidates to inject.
// ----------------------------------------------------------------------------
function makeExercise(
  id: string,
  name: string,
  targetMuscles: string[],
  bodyParts: string[],
  equipments: string[] = ['dumbbell'],
  secondaryMuscles: string[] = [],
): ExerciseWithMetadata {
  return {
    exerciseId: id,
    name,
    gifUrl: '',
    targetMuscles,
    bodyParts,
    equipments,
    secondaryMuscles,
    instructions: [],
  } as ExerciseWithMetadata;
}

const MOCK_POOL: ExerciseWithMetadata[] = [
  // Pectorals (chest)
  makeExercise('bench_press', 'bench press', ['pectorals'], ['chest'], ['barbell'], ['delts', 'triceps']),
  makeExercise('db_press', 'dumbbell press', ['pectorals'], ['chest'], ['dumbbell'], ['delts', 'triceps']),
  makeExercise('pushup', 'push up', ['pectorals'], ['chest'], ['body weight'], ['delts', 'triceps']),
  makeExercise('incline_db_press', 'incline dumbbell press', ['pectorals'], ['chest'], ['dumbbell'], ['delts']),

  // Lats (back)
  makeExercise('pull_up', 'pull up', ['lats'], ['back'], ['body weight'], ['biceps']),
  makeExercise('bb_row', 'bent over row', ['lats'], ['back'], ['barbell'], ['biceps', 'traps']),
  makeExercise('lat_pulldown', 'lat pulldown', ['lats'], ['back'], ['cable'], ['biceps']),
  makeExercise('db_row', 'dumbbell row', ['lats'], ['back'], ['dumbbell'], ['biceps']),

  // Delts (shoulders)
  makeExercise('ohp', 'overhead press', ['delts'], ['shoulders'], ['barbell'], ['triceps']),
  makeExercise('db_shoulder_press', 'dumbbell shoulder press', ['delts'], ['shoulders'], ['dumbbell'], ['triceps']),
  makeExercise('lateral_raise', 'lateral raise', ['delts'], ['shoulders'], ['dumbbell']),
  makeExercise('rear_delt_fly', 'rear delt fly', ['delts'], ['shoulders'], ['dumbbell']),

  // Quads (legs)
  makeExercise('squat', 'squat', ['quads'], ['legs'], ['barbell'], ['glutes', 'hamstrings']),
  makeExercise('leg_press', 'leg press', ['quads'], ['legs'], ['leverage machine'], ['glutes']),
  makeExercise('lunge', 'lunge', ['quads'], ['legs'], ['dumbbell'], ['glutes']),
  makeExercise('goblet_squat', 'goblet squat', ['quads'], ['legs'], ['dumbbell'], ['glutes']),

  // Hamstrings (legs)
  makeExercise('rdl', 'romanian deadlift', ['hamstrings'], ['legs'], ['barbell'], ['glutes']),
  makeExercise('leg_curl', 'leg curl', ['hamstrings'], ['legs'], ['leverage machine']),
  makeExercise('db_rdl', 'dumbbell romanian deadlift', ['hamstrings'], ['legs'], ['dumbbell'], ['glutes']),

  // Core + cardio (needed so HIIT days can fill out)
  makeExercise('plank', 'plank', ['abs'], ['core'], ['body weight']),
  makeExercise('mountain_climber', 'mountain climber', ['cardiovascular system'], ['cardio'], ['body weight']),
  makeExercise('burpee', 'burpee', ['cardiovascular system'], ['cardio'], ['body weight'], ['pectorals', 'quads']),
  makeExercise('jump_rope', 'jump rope', ['cardiovascular system'], ['cardio'], ['body weight']),
];

const WEIGHT_LOSS_PROFILE = {
  fitnessGoal: 'weight_loss',
  experienceLevel: 'intermediate',
  workoutDuration: 45,
  workoutsPerWeek: 4,
  availableEquipment: ['body weight', 'dumbbell', 'barbell', 'cable'],
  prefersVariety: true,
} as unknown as UserProfile;

const MAJOR_GROUPS = ['pectorals', 'lats', 'quads', 'hamstrings', 'delts'] as const;

function countHits(
  plan: ReturnType<typeof generateWeeklyExercisePlan>,
  muscle: string,
): number {
  let hits = 0;
  for (const workout of plan.workouts) {
    for (const ex of workout.exercises) {
      const all = [...ex.targetMuscles, ...ex.secondaryMuscles].map(m => m.toLowerCase());
      if (all.includes(muscle)) hits++;
    }
  }
  return hits;
}

describe('rule-based muscle balance — 4-day weight-loss plan', () => {
  it('HIIT/Circuit split is selectable for a 4-day weight-loss profile', () => {
    // Sanity: the split we exercise in this test suite exists and is the one
    // the orchestrator would pick for weight_loss + 4 days/week.
    const split = getSplitById('hiit_circuit_4x');
    expect(split).not.toBeNull();
    expect(split!.daysPerWeek).toBe(4);
    expect(split!.fitnessGoals).toContain('weight_loss');
  });

  it('after rebalance, every major muscle group is trained >=2x/week', () => {
    const split = getSplitById('hiit_circuit_4x')!;
    const plan = generateWeeklyExercisePlan(
      MOCK_POOL,
      split,
      WEIGHT_LOSS_PROFILE,
      1, // weekNumber
      0, // regenerationSeed
    );

    // First capture the pre-rebalance state to document the bug existed here.
    const preWarnings = validateMuscleBalance(plan);

    // Apply the fix.
    const residualWarnings = rebalanceMuscleBalance(plan, MOCK_POOL);

    // Every major group must now be >=2x. (Pure-conditioning exemption does NOT
    // apply — HIIT/Circuit has strength components and lists pectorals/lats/delts
    // in its muscleGroups.)
    for (const muscle of MAJOR_GROUPS) {
      expect(countHits(plan, muscle), `${muscle} frequency`).toBeGreaterThanOrEqual(2);
    }

    // The residual warning list must be empty when the pool had coverage.
    expect(residualWarnings).toEqual([]);

    // NOTE: we intentionally do NOT assert preWarnings.length > 0. With the
    // split-template fix (pecs→pectorals + back focus on Day 2), a well-stocked
    // pool now produces a balanced plan at generation time — the rebalancer is
    // the safety net for when equipment/safety filtering thins the pool. The
    // too-small-pool test below proves the rebalancer actually engages when
    // it's needed. preWarnings is captured only for diagnostic logging.
    void preWarnings;
  });

  it('rebalance is idempotent — running it twice yields the same plan', () => {
    const split = getSplitById('hiit_circuit_4x')!;
    const plan = generateWeeklyExercisePlan(MOCK_POOL, split, WEIGHT_LOSS_PROFILE, 1, 0);
    rebalanceMuscleBalance(plan, MOCK_POOL);
    const afterFirst = JSON.stringify(plan);
    rebalanceMuscleBalance(plan, MOCK_POOL);
    const afterSecond = JSON.stringify(plan);
    expect(afterSecond).toBe(afterFirst);
  });

  it('rebalance never introduces a duplicate exercise across the week', () => {
    const split = getSplitById('hiit_circuit_4x')!;
    const plan = generateWeeklyExercisePlan(MOCK_POOL, split, WEIGHT_LOSS_PROFILE, 1, 0);
    rebalanceMuscleBalance(plan, MOCK_POOL);

    const allIds = plan.workouts.flatMap(w => w.exercises.map(e => e.exerciseId));
    const unique = new Set(allIds);
    expect(unique.size, 'no exercise appears on two days').toBe(allIds.length);
  });

  it('when the pool is too small to cover a group, residual warnings are returned (no silent failure)', () => {
    // Pool with ZERO pectorals exercises — rebalance cannot fix chest.
    const cardioOnlyPool: ExerciseWithMetadata[] = [
      makeExercise('run', 'running', ['cardiovascular system'], ['cardio'], ['body weight']),
      makeExercise('bike', 'stationary bike', ['cardiovascular system'], ['cardio'], ['body weight']),
    ];
    const split = getSplitById('hiit_circuit_4x')!;
    const plan = generateWeeklyExercisePlan(cardioOnlyPool, split, WEIGHT_LOSS_PROFILE, 1, 0);
    const residual = rebalanceMuscleBalance(plan, cardioOnlyPool);

    // Chest/back/etc. deficits survive because the pool has no movers for them.
    expect(residual.length).toBeGreaterThan(0);
    expect(residual.some(w => w.includes('pectorals'))).toBe(true);
  });

  it('classifyExercise maps DB-canonical pectorals/delts correctly (not pecs)', () => {
    // Guards the template fix: split muscleGroups must match what the DB emits.
    const bench = classifyExercise(
      makeExercise('bench', 'bench press', ['pectorals'], ['chest'], ['barbell'], ['delts']),
    );
    expect(bench.targetMuscles).toContain('pectorals');
    expect(bench.targetMuscles).not.toContain('pecs');
  });
});
