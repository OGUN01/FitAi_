/**
 * Regression tests for workoutBuilderAi.ts's shared handleError() classifier.
 *
 * Added per code-review: the review that widened handleError() to
 * special-case AuthenticationError (retryable:false, re-auth message) and to
 * classify WorkersAPIError/NetworkError the same way src/ai/index.ts's
 * handleError does landed with zero regression tests. This pins the exact
 * behavior via suggestDay(), the simplest of the six builder-AI endpoints
 * that route through handleError().
 */

// fitnessStore pulls in supabase/crudOperations/offlineService — mock it so
// importing workoutBuilderStore (a transitive dependency of workoutBuilderAi)
// doesn't require the full real dependency graph. Mirrors
// src/__tests__/stores/workoutBuilderStore.test.ts's mock.
jest.mock('../stores/fitnessStore', () => ({
  useFitnessStore: {
    getState: () => ({
      customWeeklyPlan: null,
      saveCustomWeeklyPlan: jest.fn(async () => undefined),
    }),
  },
}));

const mockSuggestDay = jest.fn();
jest.mock('../services/fitaiWorkersClient', () => {
  class AuthenticationError extends Error {}
  class WorkersAPIError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  class NetworkError extends Error {}
  return {
    fitaiWorkersClient: {
      suggestDay: (...args: unknown[]) => mockSuggestDay(...args),
    },
    AuthenticationError,
    WorkersAPIError,
    NetworkError,
  };
});

import { workoutBuilderAi } from './workoutBuilderAi';
import {
  AuthenticationError,
  WorkersAPIError,
  NetworkError,
} from '../services/fitaiWorkersClient';
// profileStore is globally mocked in jest.setup.js (mocks "@/stores/profileStore",
// which resolves to the same file as this relative import). Override its
// getState() per test so buildWorkerProfile() succeeds and suggestDay()
// actually reaches fitaiWorkersClient.suggestDay (and therefore handleError).
import { useProfileStore } from '../stores/profileStore';

const VALID_PROFILE_STATE = {
  personalInfo: { age: 28, gender: 'male' as const },
  workoutPreferences: { primary_goals: ['muscle_gain'], intensity: 'beginner' },
  bodyAnalysis: null,
};

describe('workoutBuilderAi handleError classification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProfileStore.getState as jest.Mock).mockReturnValue(VALID_PROFILE_STATE);
  });

  const callSuggestDay = () =>
    workoutBuilderAi.suggestDay({ dayIndex: 0, currentExercises: [] });

  it('marks AuthenticationError as non-retryable with a re-auth message', async () => {
    mockSuggestDay.mockRejectedValueOnce(new AuthenticationError('expired'));
    const result = await callSuggestDay();
    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
    expect(result.error).toMatch(/sign in/i);
  });

  it('marks a 5xx WorkersAPIError as retryable', async () => {
    mockSuggestDay.mockRejectedValueOnce(new WorkersAPIError('server error', 500));
    const result = await callSuggestDay();
    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
  });

  it('marks a 429 WorkersAPIError as retryable', async () => {
    mockSuggestDay.mockRejectedValueOnce(new WorkersAPIError('rate limited', 429));
    const result = await callSuggestDay();
    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
  });

  it('marks a 4xx (non-429) WorkersAPIError as non-retryable', async () => {
    mockSuggestDay.mockRejectedValueOnce(new WorkersAPIError('bad request', 400));
    const result = await callSuggestDay();
    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
  });

  it('marks NetworkError as retryable', async () => {
    mockSuggestDay.mockRejectedValueOnce(new NetworkError('offline'));
    const result = await callSuggestDay();
    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
  });
});
