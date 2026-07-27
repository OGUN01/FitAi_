/**
 * Unit tests for src/services/calorieCalculator.ts
 *
 * Verifies REAL behavior of the MET-based calorie calculation pipeline:
 *   Formula: Calories = MET x Weight(kg) x Duration(hours)
 *
 * exerciseFilterService is mocked only to avoid loading the full exercise
 * database JSON and to control getExerciseById return values.
 * metMappings is NOT mocked — the real math is exercised end-to-end.
 */

import {
  getExerciseMET,
  estimateExerciseDuration,
  calculateExerciseCalories,
  calculateWorkoutCalories,
} from '../../services/calorieCalculator';
import {
  exerciseFilterService,
  FilteredExercise,
} from '../../services/exerciseFilterService';

// Mock exerciseFilterService so we (a) skip loading the large exercise DB JSON
// and (b) can control getExerciseById per-test. metMappings is left real.
jest.mock('../../services/exerciseFilterService', () => ({
  exerciseFilterService: { getExerciseById: jest.fn() },
  // FilteredExercise is a type-only export in the real module; providing a
  // runtime placeholder keeps the factory shape aligned with the import list.
  FilteredExercise: {},
}));

const mockedGetExerciseById = exerciseFilterService.getExerciseById as jest.MockedFunction<
  typeof exerciseFilterService.getExerciseById
>;

describe('calorieCalculator', () => {
  afterEach(() => {
    mockedGetExerciseById.mockReset();
  });

  // ===========================================================================
  // getExerciseMET
  // ===========================================================================
  describe('getExerciseMET', () => {
    it('returns override MET for known exercise names', () => {
      // running -> 9.8 (EXERCISE_TYPE_MET_OVERRIDES), within [1.5, 14.0]
      expect(
        getExerciseMET({
          name: 'running',
          bodyParts: ['cardio'],
          equipments: ['body weight'],
        })
      ).toBe(9.8);

      // plank -> 3.5
      expect(
        getExerciseMET({
          name: 'plank',
          bodyParts: ['waist'],
          equipments: ['body weight'],
        })
      ).toBe(3.5);

      // squat -> 6.0
      expect(
        getExerciseMET({
          name: 'squat',
          bodyParts: ['upper legs'],
          equipments: ['barbell'],
        })
      ).toBe(6.0);
    });

    it('clamps calculated MET to MAX_MET=14.0 when components exceed the cap', () => {
      // Hand-computed: bodyPart 'cardio' (8.0) x equipment 'stepmill machine' (1.20)
      // x intensity modifier for 'hiit' keyword (1.50) = 14.4 -> clamped to 14.0
      const met = getExerciseMET({
        name: 'hiit workout',
        bodyParts: ['cardio'],
        equipments: ['stepmill machine'],
      });
      expect(met).toBe(14.0);
    });

    it('clamps calculated MET to MIN_MET=1.5 when components fall below the floor', () => {
      // Hand-computed: bodyPart 'neck' (2.5) x equipment 'roller' (0.80)
      // x intensity modifier for 'meditation'(0.40) + 'stretch'(0.70) -> lowest 0.40
      // = 2.5 x 0.80 x 0.40 = 0.8 -> clamped to 1.5
      const met = getExerciseMET({
        name: 'meditation stretch',
        bodyParts: ['neck'],
        equipments: ['roller'],
      });
      expect(met).toBe(1.5);
    });

    it('calculates MET from bodyPart x equipment x intensity when no override matches', () => {
      // Hand-computed from metMappings.ts:
      //   getBodyPartMET('back') = 5.0
      //   getEquipmentMultiplier('barbell') = 1.20
      //   getIntensityModifier('bent over row') = 1.0 (no keyword matches)
      //   met = 5.0 x 1.20 x 1.0 = 6.0  (within bounds, no clamp)
      const met = getExerciseMET({
        name: 'bent over row',
        bodyParts: ['back'],
        equipments: ['barbell'],
      });
      expect(met).toBe(6.0);
    });

    it('defaults bodyPart to "waist" and equipment to "body weight" when arrays are empty', () => {
      // Hand-computed: getBodyPartMET('waist')=4.0 x getEquipmentMultiplier('body weight')=1.00
      // x getIntensityModifier('crunch')=1.0 = 4.0
      const met = getExerciseMET({
        name: 'crunch',
        bodyParts: [],
        equipments: [],
      });
      expect(met).toBe(4.0);
    });
  });

  // ===========================================================================
  // estimateExerciseDuration
  // ===========================================================================
  describe('estimateExerciseDuration', () => {
    it('default args (3 sets, 10 reps, 60s rest) -> 3.5 minutes', () => {
      // No bodyParts -> secondsPerRep = 3 (default)
      // workTime   = 3 sets x 10 reps x 3s = 90s
      // restTime   = 60s x (3-1) = 120s
      // total      = 210s / 60 = 3.5 min
      expect(estimateExerciseDuration()).toBe(3.5);
    });

    it('uses the durationSeconds formula when durationSeconds is provided', () => {
      // (durationSeconds x sets + restTime x (sets-1)) / 60
      // (45 x 3 + 60 x 2) / 60 = (135 + 120) / 60 = 255 / 60 = 4.25
      expect(estimateExerciseDuration(3, 10, 60, 45, ['waist'])).toBe(4.25);
    });

    it('averages string reps like "8-12" to 10', () => {
      // repCount = round((8+12)/2) = 10 -> same as default-args path -> 3.5 min
      expect(estimateExerciseDuration(3, '8-12', 60)).toBe(3.5);
    });

    it('uses secondsPerRep=1.5 for cardio bodyPart', () => {
      // sets=4, reps=20, rest=30, bodyParts=['cardio']
      // workTime = 4 x 20 x 1.5 = 120s
      // restTime = 30 x (4-1) = 90s
      // total    = 210s / 60 = 3.5 min
      expect(estimateExerciseDuration(4, 20, 30, undefined, ['cardio'])).toBe(3.5);
    });

    it('uses secondsPerRep=4 for upper legs bodyPart', () => {
      // sets=3, reps=12, rest=90, bodyParts=['upper legs']
      // workTime = 3 x 12 x 4 = 144s
      // restTime = 90 x (3-1) = 180s
      // total    = 324s / 60 = 5.4 min
      expect(estimateExerciseDuration(3, 12, 90, undefined, ['upper legs'])).toBe(5.4);
    });
  });

  // ===========================================================================
  // calculateExerciseCalories
  // ===========================================================================
  describe('calculateExerciseCalories', () => {
    let warnSpy: jest.SpyInstance;

    afterEach(() => {
      if (warnSpy) {
        warnSpy.mockRestore();
      }
    });

    it('returns 0 and warns when userWeightKg is 0', () => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = calculateExerciseCalories(
        { name: 'running', bodyParts: ['cardio'], equipments: ['body weight'] },
        30,
        0
      );
      expect(result).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('returns 0 and warns when userWeightKg is null', () => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = calculateExerciseCalories(
        { name: 'running', bodyParts: ['cardio'], equipments: ['body weight'] },
        30,
        null
      );
      expect(result).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('returns 0 and warns when userWeightKg is undefined', () => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = calculateExerciseCalories(
        { name: 'running', bodyParts: ['cardio'], equipments: ['body weight'] },
        30,
        undefined
      );
      expect(result).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('returns 0 and warns when userWeightKg is negative', () => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = calculateExerciseCalories(
        { name: 'running', bodyParts: ['cardio'], equipments: ['body weight'] },
        30,
        -70
      );
      expect(result).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('returns 0 and warns when durationMinutes is 0', () => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = calculateExerciseCalories(
        { name: 'running', bodyParts: ['cardio'], equipments: ['body weight'] },
        0,
        70
      );
      expect(result).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('returns 0 and warns when durationMinutes is negative', () => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = calculateExerciseCalories(
        { name: 'running', bodyParts: ['cardio'], equipments: ['body weight'] },
        -5,
        70
      );
      expect(result).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('returns Math.round(MET x weight x hours) for a normal case', () => {
      // running -> MET 9.8, duration 30 min (0.5 h), weight 70 kg
      // calories = 9.8 x 70 x 0.5 = 343 -> Math.round = 343
      const result = calculateExerciseCalories(
        { name: 'running', bodyParts: ['cardio'], equipments: ['body weight'] },
        30,
        70
      );
      expect(result).toBe(343);
    });

    it('rounds to nearest integer for non-integer results', () => {
      // plank -> MET 3.5, duration 2 min, weight 80 kg
      // calories = 3.5 x 80 x (2/60) = 560/60 = 9.333... -> Math.round = 9
      const result = calculateExerciseCalories(
        { name: 'plank', bodyParts: ['waist'], equipments: ['body weight'] },
        2,
        80
      );
      expect(result).toBe(9);
    });
  });

  // ===========================================================================
  // calculateWorkoutCalories
  // ===========================================================================
  describe('calculateWorkoutCalories', () => {
    let warnSpy: jest.SpyInstance;

    afterEach(() => {
      if (warnSpy) {
        warnSpy.mockRestore();
      }
    });

    it('returns a zero-result object and warns when weight is missing', () => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = calculateWorkoutCalories(
        [{ exerciseId: 'ex1', sets: 3, reps: 10, restTime: 60 }],
        0
      );
      expect(result).toEqual({
        totalCalories: 0,
        exerciseBreakdown: [],
        averageMET: 0,
        totalDurationMinutes: 0,
      });
      expect(warnSpy).toHaveBeenCalled();
    });

    it('returns zeros for an empty exercises array when weight is present', () => {
      const result = calculateWorkoutCalories([], 70);
      expect(result).toEqual({
        totalCalories: 0,
        exerciseBreakdown: [],
        averageMET: 0,
        totalDurationMinutes: 0,
      });
    });

    it('aggregates a single exercise with hand-computed totals', () => {
      // Mock DB returns a back/barbell exercise (no name override -> calculated MET).
      const dbExercise: FilteredExercise = {
        exerciseId: 'ex1',
        name: 'Bent Over Row',
        gifUrl: '',
        targetMuscles: ['back'],
        bodyParts: ['back'],
        equipments: ['barbell'],
        secondaryMuscles: [],
        instructions: [],
        difficulty: 'intermediate',
      };
      mockedGetExerciseById.mockReturnValue(dbExercise);

      // Input overrides sets/reps/restTime; exerciseData merges DB + input.
      const result = calculateWorkoutCalories(
        [{ exerciseId: 'ex1', sets: 3, reps: 10, restTime: 60 }],
        70
      );

      // Hand-computed:
      //   met            = getBodyPartMET('back')=5.0 x getEquipmentMultiplier('barbell')=1.20
      //                    x getIntensityModifier('bent over row')=1.0 = 6.0
      //   durationMinutes = estimateExerciseDuration(3,10,60,undefined,['back'])
      //                    workTime  = 3 x 10 x 4 (upper-body compound -> 4s/rep) = 120s
      //                    restTime  = 60 x (3-1) = 120s
      //                    total     = 240s / 60 = 4.0 min
      //   calories       = round(6.0 x 70 x (4.0/60)) = round(28) = 28
      //   averageMET     = 6.0 / 1 = 6.0
      expect(result.totalCalories).toBe(28);
      expect(result.totalDurationMinutes).toBe(4.0);
      expect(result.averageMET).toBe(6.0);
      expect(result.exerciseBreakdown).toHaveLength(1);
      expect(result.exerciseBreakdown[0]).toEqual({
        exerciseId: 'ex1',
        name: 'Bent Over Row',
        met: 6.0,
        durationMinutes: 4.0,
        calories: 28,
      });
    });
  });
});
