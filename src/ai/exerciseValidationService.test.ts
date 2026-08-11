/**
 * Regression tests for exerciseValidationService.validateExerciseSafety.
 *
 * Added per code-review: the review that widened the knee/shoulder
 * injury cross-check (structured `muscleGroups` membership + expanded
 * name-keyword lists) to close the audited "Step-Up passes unflagged" gap
 * landed with zero regression tests pinning either the fix or its
 * intentionally-scoped non-goals (posterior-chain-only exercises staying
 * unflagged).
 */
import { validateExerciseSafety } from './exerciseValidationService';

describe('validateExerciseSafety — knee injury cross-check', () => {
  it('flags "Step-Up" via muscleGroups even though the name has no lunge/squat/jump keyword', () => {
    const violations = validateExerciseSafety(
      [{ id: 'e1', name: 'Step-Up', muscleGroups: ['quadriceps', 'glutes'] }],
      { injuries: ['knee'] }
    );
    expect(violations).toEqual([
      { exerciseId: 'e1', reason: 'Knee injury: Step-Up may aggravate condition' },
    ]);
  });

  it('flags "Leg Press" via muscleGroups', () => {
    const violations = validateExerciseSafety(
      [{ id: 'e2', name: 'Leg Press', muscleGroups: ['quadriceps'] }],
      { injuries: ['knee'] }
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].exerciseId).toBe('e2');
  });

  it('still flags via the name-keyword list even with no muscleGroups data', () => {
    const violations = validateExerciseSafety(
      [{ id: 'e3', name: 'Bulgarian Split Squat' }],
      { injuries: ['knee'] }
    );
    expect(violations).toHaveLength(1);
  });

  it('does NOT flag posterior-chain-only exercises (leg curl, hip thrust) for a knee injury', () => {
    const violations = validateExerciseSafety(
      [
        { id: 'e4', name: 'Leg Curl', muscleGroups: ['hamstrings'] },
        { id: 'e5', name: 'Hip Thrust', muscleGroups: ['glutes', 'hamstrings'] },
        { id: 'e6', name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'] },
        { id: 'e7', name: 'Calf Raise', muscleGroups: ['calves'] },
      ],
      { injuries: ['knee'] }
    );
    expect(violations).toEqual([]);
  });
});

describe('validateExerciseSafety — shoulder injury cross-check', () => {
  it.each([
    'Shoulder Press',
    'Arnold Press',
    'Push Press',
    'Strict Press',
    'Pike Push-Up',
  ])('flags "%s" for a shoulder injury', (name) => {
    const violations = validateExerciseSafety([{ id: 'e1', name }], {
      injuries: ['shoulder'],
    });
    expect(violations).toHaveLength(1);
    expect(violations[0].exerciseId).toBe('e1');
  });

  it('does not flag an unrelated exercise for a shoulder injury', () => {
    const violations = validateExerciseSafety([{ id: 'e1', name: 'Leg Press' }], {
      injuries: ['shoulder'],
    });
    expect(violations).toEqual([]);
  });
});

describe('validateExerciseSafety — neck-problems cross-check', () => {
  it.each(['Overhead Press', 'Shoulder Press', 'Barbell Shrug'])(
    'flags "%s" for the "neck-problems" onboarding option',
    (name) => {
      const violations = validateExerciseSafety([{ id: 'e1', name }], {
        injuries: ['neck-problems'],
      });
      expect(violations).toHaveLength(1);
      expect(violations[0].exerciseId).toBe('e1');
    }
  );

  it('does not flag an unrelated exercise for neck-problems', () => {
    const violations = validateExerciseSafety([{ id: 'e1', name: 'Leg Curl' }], {
      injuries: ['neck-problems'],
    });
    expect(violations).toEqual([]);
  });
});

describe('validateExerciseSafety — ankle-issues cross-check', () => {
  it.each(['Box Jump', 'Jump Rope', 'Calf Raise', 'Single-Leg Deadlift'])(
    'flags "%s" for the "ankle-issues" onboarding option',
    (name) => {
      const violations = validateExerciseSafety([{ id: 'e1', name }], {
        injuries: ['ankle-issues'],
      });
      expect(violations).toHaveLength(1);
      expect(violations[0].exerciseId).toBe('e1');
    }
  );

  it('does not flag an unrelated exercise for ankle-issues', () => {
    const violations = validateExerciseSafety([{ id: 'e1', name: 'Bench Press' }], {
      injuries: ['ankle-issues'],
    });
    expect(violations).toEqual([]);
  });
});

describe('validateExerciseSafety — wrist-problems cross-check', () => {
  it.each(['Push-Up', 'Plank', 'Front Squat', 'Overhead Press'])(
    'flags "%s" for the "wrist-problems" onboarding option',
    (name) => {
      const violations = validateExerciseSafety([{ id: 'e1', name }], {
        injuries: ['wrist-problems'],
      });
      expect(violations).toHaveLength(1);
      expect(violations[0].exerciseId).toBe('e1');
    }
  );

  it('does not flag an unrelated exercise for wrist-problems', () => {
    const violations = validateExerciseSafety([{ id: 'e1', name: 'Leg Press' }], {
      injuries: ['wrist-problems'],
    });
    expect(violations).toEqual([]);
  });
});

describe('validateExerciseSafety — balance-issues cross-check', () => {
  it.each(['Pistol Squat', 'Box Jump', 'Single-Leg Romanian Deadlift', 'Bosu Ball Squat'])(
    'flags "%s" for the "balance-issues" onboarding option',
    (name) => {
      const violations = validateExerciseSafety([{ id: 'e1', name }], {
        injuries: ['balance-issues'],
      });
      expect(violations).toHaveLength(1);
      expect(violations[0].exerciseId).toBe('e1');
    }
  );

  it('does not flag an unrelated exercise for balance-issues', () => {
    const violations = validateExerciseSafety([{ id: 'e1', name: 'Bench Press' }], {
      injuries: ['balance-issues'],
    });
    expect(violations).toEqual([]);
  });
});

describe('validateExerciseSafety — mobility-limited cross-check', () => {
  it.each(['Deep Squat', 'Walking Lunge', 'Turkish Get-Up', 'Overhead Squat'])(
    'flags "%s" for the "mobility-limited" onboarding option',
    (name) => {
      const violations = validateExerciseSafety([{ id: 'e1', name }], {
        injuries: ['mobility-limited'],
      });
      expect(violations).toHaveLength(1);
      expect(violations[0].exerciseId).toBe('e1');
    }
  );

  it('does not flag an unrelated exercise for mobility-limited', () => {
    const violations = validateExerciseSafety([{ id: 'e1', name: 'Leg Press' }], {
      injuries: ['mobility-limited'],
    });
    expect(violations).toEqual([]);
  });
});
