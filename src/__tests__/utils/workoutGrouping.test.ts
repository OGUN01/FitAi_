import {
  computeExerciseGroups,
  getNextStep,
  isRoundSkippedForExercise,
  type ExerciseGroupInfo,
} from '../../utils/workoutGrouping';
import type { WorkoutSet } from '../../types/workout';

function ex(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    exerciseId: 'ex',
    sets: 3,
    reps: 10,
    restTime: 60,
    ...overrides,
  } as WorkoutSet;
}

describe('computeExerciseGroups', () => {
  it('treats a plan with no grouping fields as all-ungrouped', () => {
    const groups = computeExerciseGroups([ex(), ex(), ex()]);
    expect(groups.every((g) => g.groupType === 'none')).toBe(true);
    expect(groups.every((g) => g.isFirstInGroup && g.isLastInGroup)).toBe(true);
  });

  it('groups a contiguous run of equal supersetId', () => {
    const groups = computeExerciseGroups([
      ex({ exerciseId: 'a', supersetId: 'ss1' }),
      ex({ exerciseId: 'b', supersetId: 'ss1' }),
      ex({ exerciseId: 'c' }),
    ]);
    expect(groups[0].groupType).toBe('superset');
    expect(groups[1].groupType).toBe('superset');
    expect(groups[2].groupType).toBe('none');
    expect(groups[0].isFirstInGroup).toBe(true);
    expect(groups[0].isLastInGroup).toBe(false);
    expect(groups[1].isFirstInGroup).toBe(false);
    expect(groups[1].isLastInGroup).toBe(true);
    expect(groups[0].groupStartIndex).toBe(0);
    expect(groups[0].groupEndIndex).toBe(1);
    expect(groups[1].groupStartIndex).toBe(0);
    expect(groups[1].groupEndIndex).toBe(1);
  });

  it('groups a contiguous run of equal circuitId, same as supersets', () => {
    const groups = computeExerciseGroups([
      ex({ circuitId: 'c1' }),
      ex({ circuitId: 'c1' }),
      ex({ circuitId: 'c1' }),
    ]);
    expect(groups.every((g) => g.groupType === 'circuit')).toBe(true);
    expect(groups[0].groupStartIndex).toBe(0);
    expect(groups[0].groupEndIndex).toBe(2);
    expect(groups[1].isFirstInGroup).toBe(false);
    expect(groups[1].isLastInGroup).toBe(false);
  });

  it('does NOT merge two DIFFERENT groups even if adjacent', () => {
    const groups = computeExerciseGroups([
      ex({ supersetId: 'ss1' }),
      ex({ supersetId: 'ss2' }),
    ]);
    expect(groups[0].groupId).toBe('ss1');
    expect(groups[1].groupId).toBe('ss2');
    expect(groups[0].isLastInGroup).toBe(true);
    expect(groups[1].isFirstInGroup).toBe(true);
  });

  it('does NOT bridge across a non-matching exercise in between', () => {
    const groups = computeExerciseGroups([
      ex({ supersetId: 'ss1' }),
      ex(), // ungrouped exercise splits the run
      ex({ supersetId: 'ss1' }),
    ]);
    expect(groups[0].isLastInGroup).toBe(true);
    expect(groups[0].groupEndIndex).toBe(0);
    expect(groups[2].isFirstInGroup).toBe(true);
    expect(groups[2].groupStartIndex).toBe(2);
  });

  it('derives roundCount as the MAX sets.length across group members', () => {
    const groups = computeExerciseGroups([
      ex({ circuitId: 'c1', sets: 3 }),
      ex({ circuitId: 'c1', sets: 4 }),
      ex({ circuitId: 'c1', sets: 2 }),
    ]);
    expect(groups.every((g) => g.roundCount === 4)).toBe(true);
  });

  it('ungrouped exercise roundCount is just its own set count', () => {
    const groups = computeExerciseGroups([ex({ sets: 5 })]);
    expect(groups[0].roundCount).toBe(5);
  });
});

describe('getNextStep — ungrouped (must match pre-4B.1 behavior exactly)', () => {
  const ungrouped: ExerciseGroupInfo = {
    exerciseIndex: 2,
    groupType: 'none',
    groupId: null,
    groupStartIndex: 2,
    groupEndIndex: 2,
    isFirstInGroup: true,
    isLastInGroup: true,
    roundCount: 3,
  };

  it('holds position and advances the set index when sets remain (intra_set)', () => {
    const step = getNextStep(ungrouped, 0, false);
    expect(step.restMode).toBe('intra_set');
    expect(step.nextExerciseIndex).toBe(2);
    expect(step.nextSetIndex).toBe(1);
    expect(step.exerciseFullyComplete).toBe(false);
  });

  it('advances to the next exercise with inter_exercise rest once all sets are done', () => {
    const step = getNextStep(ungrouped, 2, true);
    expect(step.restMode).toBe('inter_exercise');
    expect(step.nextExerciseIndex).toBe(3);
    expect(step.nextSetIndex).toBe(0);
    expect(step.exerciseFullyComplete).toBe(true);
  });
});

describe('getNextStep — superset (2 exercises, 3 rounds)', () => {
  const first: ExerciseGroupInfo = {
    exerciseIndex: 0,
    groupType: 'superset',
    groupId: 'ss1',
    groupStartIndex: 0,
    groupEndIndex: 1,
    isFirstInGroup: true,
    isLastInGroup: false,
    roundCount: 3,
  };
  const second: ExerciseGroupInfo = {
    ...first,
    exerciseIndex: 1,
    isFirstInGroup: false,
    isLastInGroup: true,
  };

  it('hops to the next exercise in the group with minimal (intra_group) rest, same round', () => {
    const step = getNextStep(first, 0, true);
    expect(step.restMode).toBe('intra_group');
    expect(step.nextExerciseIndex).toBe(1);
    expect(step.nextSetIndex).toBe(0); // same round
    expect(step.exerciseFullyComplete).toBe(false);
  });

  it('loops back to the first exercise with full (post_group) rest and increments the round', () => {
    const step = getNextStep(second, 0, true); // round 0 done, 2 more remain (roundCount=3)
    expect(step.restMode).toBe('post_group');
    expect(step.nextExerciseIndex).toBe(0); // groupStartIndex
    expect(step.nextSetIndex).toBe(1); // next round
    expect(step.exerciseFullyComplete).toBe(false);
  });

  it('finishes the group entirely (inter_exercise rest, advance past the group) on the final round', () => {
    const step = getNextStep(second, 2, true); // round 2 = last round (roundCount=3, 0-indexed)
    expect(step.restMode).toBe('inter_exercise');
    expect(step.nextExerciseIndex).toBe(2); // groupEndIndex + 1
    expect(step.nextSetIndex).toBe(0);
    expect(step.exerciseFullyComplete).toBe(true);
  });
});

describe('getNextStep — circuit (3 exercises, 2 rounds), full round-trip simulation', () => {
  const groups: ExerciseGroupInfo[] = [
    { exerciseIndex: 0, groupType: 'circuit', groupId: 'c1', groupStartIndex: 0, groupEndIndex: 2, isFirstInGroup: true, isLastInGroup: false, roundCount: 2 },
    { exerciseIndex: 1, groupType: 'circuit', groupId: 'c1', groupStartIndex: 0, groupEndIndex: 2, isFirstInGroup: false, isLastInGroup: false, roundCount: 2 },
    { exerciseIndex: 2, groupType: 'circuit', groupId: 'c1', groupStartIndex: 0, groupEndIndex: 2, isFirstInGroup: false, isLastInGroup: true, roundCount: 2 },
  ];

  it('walks the full sequence: 0→1→2 (round 0), back to 0→1→2 (round 1), then exits', () => {
    let exIdx = 0;
    let setIdx = 0;
    const visited: Array<{ exIdx: number; setIdx: number; restMode: string }> = [];

    for (let hop = 0; hop < 6; hop++) {
      const step = getNextStep(groups[exIdx], setIdx, true);
      visited.push({ exIdx, setIdx, restMode: step.restMode });
      if (step.exerciseFullyComplete) break;
      exIdx = step.nextExerciseIndex;
      setIdx = step.nextSetIndex;
    }

    expect(visited).toEqual([
      { exIdx: 0, setIdx: 0, restMode: 'intra_group' },
      { exIdx: 1, setIdx: 0, restMode: 'intra_group' },
      { exIdx: 2, setIdx: 0, restMode: 'post_group' }, // round 0 done, loop back
      { exIdx: 0, setIdx: 1, restMode: 'intra_group' },
      { exIdx: 1, setIdx: 1, restMode: 'intra_group' },
      { exIdx: 2, setIdx: 1, restMode: 'inter_exercise' }, // final round, exit group
    ]);
  });
});

describe('getNextStep — unequal set counts within one circuit', () => {
  it('a shorter exercise contributes fewer real rounds; roundCount is still the group max', () => {
    // Exercise B only has 2 sets while the circuit runs 3 rounds (A and C have 3).
    const b: ExerciseGroupInfo = {
      exerciseIndex: 1,
      groupType: 'circuit',
      groupId: 'c1',
      groupStartIndex: 0,
      groupEndIndex: 2,
      isFirstInGroup: false,
      isLastInGroup: false,
      roundCount: 3,
    };
    // Round 2 (0-indexed) doesn't exist for exercise B (only has 2 sets).
    expect(isRoundSkippedForExercise(ex({ sets: 2 }), 2)).toBe(true);
    expect(isRoundSkippedForExercise(ex({ sets: 2 }), 1)).toBe(false);
    expect(isRoundSkippedForExercise(ex({ sets: 3 }), 2)).toBe(false);
    // getNextStep itself doesn't need to change behavior for this — the
    // CALLER (session screen) is responsible for skipping straight past a
    // skipped instance using isRoundSkippedForExercise, not this function.
    void b;
  });
});
