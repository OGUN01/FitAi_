/**
 * Tests for useQuickWorkouts visibility logic.
 * Since testEnvironment is 'node', we test the pure visibility calculation directly.
 */

import type { CompletedSession } from '../../stores/fitness/types';

// Replicates the isVisible logic from useQuickWorkouts
function computeIsVisible(
  weeklyWorkoutPlan: { workouts?: Array<{ id: string; dayOfWeek?: string }> } | null,
  completedSessions: CompletedSession[],
  todayStr: string,
  todayName: string,
): boolean {
  if (!weeklyWorkoutPlan?.workouts) return false;

  const hasTodayPlannedWorkout = weeklyWorkoutPlan.workouts.some(
    (w) => w.dayOfWeek?.toLowerCase() === todayName,
  );

  if (!hasTodayPlannedWorkout) return false;

  const todayWorkouts = weeklyWorkoutPlan.workouts.filter(
    (w) => w.dayOfWeek?.toLowerCase() === todayName,
  );

  return todayWorkouts.every((w) =>
    completedSessions.some(
      (s) =>
        s.type === 'planned' &&
        s.workoutId === w.id &&
        s.completedAt.split('T')[0] === todayStr,
    ),
  );
}

const TODAY_STR = '2026-03-16';
const TODAY_NAME = 'monday';

const makeSession = (overrides: Partial<CompletedSession> = {}): CompletedSession => ({
  sessionId: 'sess-1',
  type: 'planned',
  workoutId: 'workout-1',
  workoutSnapshot: {
    title: 'Test Workout',
    category: 'strength',
    duration: 30,
    exercises: [],
  },
  caloriesBurned: 200,
  durationMinutes: 30,
  completedAt: `${TODAY_STR}T10:00:00.000Z`,
  weekStart: '2026-03-16',
  ...overrides,
});

describe('useQuickWorkouts isVisible logic', () => {
  test('isVisible is false when no completedSessions', () => {
    const plan = {
      workouts: [{ id: 'workout-1', dayOfWeek: TODAY_NAME }],
    };
    const result = computeIsVisible(plan, [], TODAY_STR, TODAY_NAME);
    expect(result).toBe(false);
  });

  test('isVisible is false when today workout is planned but not completed', () => {
    const plan = {
      workouts: [{ id: 'workout-1', dayOfWeek: TODAY_NAME }],
    };
    // completedSessions has a session but for a different day
    const sessions: CompletedSession[] = [
      makeSession({ completedAt: '2026-03-15T10:00:00.000Z' }),
    ];
    const result = computeIsVisible(plan, sessions, TODAY_STR, TODAY_NAME);
    expect(result).toBe(false);
  });

  test('isVisible is true when today planned workout is in completedSessions', () => {
    const plan = {
      workouts: [{ id: 'workout-1', dayOfWeek: TODAY_NAME }],
    };
    const sessions: CompletedSession[] = [
      makeSession({ completedAt: `${TODAY_STR}T10:00:00.000Z` }),
    ];
    const result = computeIsVisible(plan, sessions, TODAY_STR, TODAY_NAME);
    expect(result).toBe(true);
  });

  test('isVisible is false when weeklyWorkoutPlan is null', () => {
    const sessions: CompletedSession[] = [makeSession()];
    const result = computeIsVisible(null, sessions, TODAY_STR, TODAY_NAME);
    expect(result).toBe(false);
  });

  test('isVisible is false when plan has no workout for today', () => {
    const plan = {
      workouts: [{ id: 'workout-1', dayOfWeek: 'tuesday' }],
    };
    const sessions: CompletedSession[] = [makeSession()];
    const result = computeIsVisible(plan, sessions, TODAY_STR, TODAY_NAME);
    expect(result).toBe(false);
  });

  test('isVisible is false when only one of two today workouts is completed', () => {
    const plan = {
      workouts: [
        { id: 'workout-1', dayOfWeek: TODAY_NAME },
        { id: 'workout-2', dayOfWeek: TODAY_NAME },
      ],
    };
    const sessions: CompletedSession[] = [
      makeSession({ workoutId: 'workout-1', completedAt: `${TODAY_STR}T10:00:00.000Z` }),
    ];
    const result = computeIsVisible(plan, sessions, TODAY_STR, TODAY_NAME);
    expect(result).toBe(false);
  });

  test('isVisible is true when all today workouts are completed', () => {
    const plan = {
      workouts: [
        { id: 'workout-1', dayOfWeek: TODAY_NAME },
        { id: 'workout-2', dayOfWeek: TODAY_NAME },
      ],
    };
    const sessions: CompletedSession[] = [
      makeSession({ sessionId: 'sess-1', workoutId: 'workout-1', completedAt: `${TODAY_STR}T10:00:00.000Z` }),
      makeSession({ sessionId: 'sess-2', workoutId: 'workout-2', completedAt: `${TODAY_STR}T11:00:00.000Z` }),
    ];
    const result = computeIsVisible(plan, sessions, TODAY_STR, TODAY_NAME);
    expect(result).toBe(true);
  });

  test('isVisible is false when completed session is type extra not planned', () => {
    const plan = {
      workouts: [{ id: 'workout-1', dayOfWeek: TODAY_NAME }],
    };
    const sessions: CompletedSession[] = [
      makeSession({ type: 'extra', completedAt: `${TODAY_STR}T10:00:00.000Z` }),
    ];
    const result = computeIsVisible(plan, sessions, TODAY_STR, TODAY_NAME);
    expect(result).toBe(false);
  });
});
