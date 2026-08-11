/**
 * Regression tests for pure helpers and the swapMealInPlan retryable
 * classification in src/ai/index.ts. Added per code-review: the 0s-rest
 * ternary fix, the resolveWorkoutCategory strength-keyword pre-check (and
 * its hiit/cardio-ordering carve-out), and swapMealInPlan's `retryable`
 * derivation all landed with zero regression tests.
 */

const mockSwapMeal = jest.fn();
jest.mock('../services/fitaiWorkersClient', () => ({
  fitaiWorkersClient: {
    swapMeal: (...args: unknown[]) => mockSwapMeal(...args),
  },
  AuthenticationError: class AuthenticationError extends Error {},
  WorkersAPIError: class WorkersAPIError extends Error {
    statusCode = 500;
  },
  NetworkError: class NetworkError extends Error {},
  isDietPlanResponse: () => false,
  isAsyncJobResponse: () => false,
}));

jest.mock('../services/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../services/currentWeight', () => ({
  resolveCurrentWeight: () => ({ value: 75 }),
  resolveCurrentWeightFromStores: () => ({ value: 75 }),
}));

import {
  aiService,
  resolveWorkoutCategory,
  transformRawExercise,
  type RawWorkerWorkout,
  type RawWorkerExercise,
} from './index';
import type { DayMeal } from '../types/ai';

// ----------------------------------------------------------------------------
// resolveWorkoutCategory
// ----------------------------------------------------------------------------

describe('resolveWorkoutCategory', () => {
  it('classifies an unambiguous strength title that also contains "circuit" as strength', () => {
    expect(resolveWorkoutCategory({ title: 'Upper Body Circuit Strength' } as RawWorkerWorkout)).toBe(
      'strength'
    );
  });

  it('classifies "Metabolic Push Day" as strength, not hybrid', () => {
    expect(resolveWorkoutCategory({ title: 'Metabolic Push Day' } as RawWorkerWorkout)).toBe(
      'strength'
    );
  });

  it('classifies a title with BOTH a strength cue and an explicit HIIT cue as hiit (hiit wins)', () => {
    expect(resolveWorkoutCategory({ title: 'HIIT Strength Circuit' } as RawWorkerWorkout)).toBe(
      'hiit'
    );
  });

  it('classifies a title with BOTH a strength cue and an explicit cardio cue as cardio (cardio wins)', () => {
    expect(resolveWorkoutCategory({ title: 'Cardio Strength Blast' } as RawWorkerWorkout)).toBe(
      'cardio'
    );
  });

  it('still classifies a plain HIIT title as hiit', () => {
    expect(resolveWorkoutCategory({ title: 'Full Body HIIT' } as RawWorkerWorkout)).toBe('hiit');
  });

  it('falls back to hybrid for a plain circuit/metabolic title with no strength cue', () => {
    expect(resolveWorkoutCategory({ title: 'Metabolic Circuit' } as RawWorkerWorkout)).toBe(
      'hybrid'
    );
  });

  it('prefers an explicit whitelisted category field over title inference', () => {
    expect(
      resolveWorkoutCategory({ title: 'HIIT Strength Circuit', category: 'yoga' } as RawWorkerWorkout)
    ).toBe('yoga');
  });
});

// ----------------------------------------------------------------------------
// transformRawExercise
// ----------------------------------------------------------------------------

describe('transformRawExercise', () => {
  it('preserves a deliberate 0s restSeconds instead of falling back to defaultRestTime', () => {
    const ex: RawWorkerExercise = { exerciseId: 'ex_1', sets: 3, restSeconds: 0 };
    const result = transformRawExercise(ex, 'day1', 0, 3, '8-12', 60);
    expect(result?.restTime).toBe(0);
  });

  it('preserves a deliberate 0s restTime (legacy field) instead of falling back', () => {
    const ex: RawWorkerExercise = { exerciseId: 'ex_1', sets: 3, restTime: 0 };
    const result = transformRawExercise(ex, 'day1', 0, 3, '8-12', 60);
    expect(result?.restTime).toBe(0);
  });

  it('falls back to defaultRestTime when rest is genuinely absent', () => {
    const ex: RawWorkerExercise = { exerciseId: 'ex_1', sets: 3 };
    const result = transformRawExercise(ex, 'day1', 0, 3, '8-12', 60);
    expect(result?.restTime).toBe(60);
  });

  it('drops an exercise with no exerciseId', () => {
    const ex: RawWorkerExercise = { sets: 3, restSeconds: 30 };
    const result = transformRawExercise(ex, 'day1', 0, 3, '8-12', 60);
    expect(result).toBeNull();
  });
});

// ----------------------------------------------------------------------------
// swapMealInPlan — retryable classification
// ----------------------------------------------------------------------------

function makeMeal(): DayMeal {
  return {
    id: 'meal_1',
    dayOfWeek: 'monday',
    type: 'lunch',
    name: 'Original Meal',
    totalCalories: 500,
    totalMacros: { protein: 30, carbohydrates: 50, fat: 15, fiber: 5 },
    foods: [],
  } as unknown as DayMeal;
}

describe('swapMealInPlan retryable classification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks an offline (transient) failure as retryable', async () => {
    mockSwapMeal.mockResolvedValueOnce({
      success: false,
      isOffline: true,
      error: 'Network unavailable',
    });
    const result = await aiService.swapMealInPlan(makeMeal(), {});
    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
  });

  it('marks a non-offline business-logic failure as non-retryable', async () => {
    mockSwapMeal.mockResolvedValueOnce({
      success: false,
      error: 'Sign up to swap meals',
    });
    const result = await aiService.swapMealInPlan(makeMeal(), {});
    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
    expect(result.error).toBe('Sign up to swap meals');
  });
});
