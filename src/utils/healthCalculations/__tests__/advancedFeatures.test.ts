/**
 * PHASE 3: ADVANCED HEALTH FEATURES - COMPREHENSIVE TEST SUITE
 *
 * Test Coverage:
 * 1. Muscle Gain Calculator (10+ tests)
 * 2. Fat Loss Validator (10+ tests)
 * 3. Heart Rate Calculator (10+ tests)
 * 4. VO2 Max Calculator (10+ tests)
 * 5. Health Score Calculator (10+ tests)
 *
 * Total: 50+ test cases
 *
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import {
  MuscleGainCalculator,
  FatLossValidator,
  HeartRateCalculator,
  VO2MaxCalculator,
  HealthScoreCalculator,
} from '../calculators';
import { UserProfile } from '../types';

describe('Phase 3: Advanced Health Features', () => {
  // ============================================================================
  // MUSCLE GAIN CALCULATOR TESTS
  // ============================================================================
  describe('MuscleGainCalculator', () => {
    const calculator = new MuscleGainCalculator();

    describe('calculateMaxGainRate', () => {
      test('should calculate beginner male rates correctly', () => {
        const user: UserProfile = {
          age: 25,
          gender: 'male',
          workout_experience_years: 0,
        } as UserProfile;

        const result = calculator.calculateMaxGainRate(user);

        expect(result.category).toBe('Beginner');
        expect(result.monthlyKg).toBeCloseTo(1.0, 1);
        expect(result.yearlyKg).toBeCloseTo(12.0, 1);
        expect(result.confidenceLevel).toBe('medium');
      });

      test('should calculate beginner female rates correctly', () => {
        const user: UserProfile = {
          age: 25,
          gender: 'female',
          workout_experience_years: 0,
        } as UserProfile;

        const result = calculator.calculateMaxGainRate(user);

        expect(result.category).toBe('Beginner');
        expect(result.monthlyKg).toBeCloseTo(0.5, 1);
        expect(result.yearlyKg).toBeCloseTo(6.0, 1);
      });

      test('should calculate intermediate rates correctly', () => {
        const user: UserProfile = {
          age: 28,
          gender: 'male',
          workout_experience_years: 2,
        } as UserProfile;

        const result = calculator.calculateMaxGainRate(user);

        expect(result.category).toBe('Intermediate');
        expect(result.monthlyKg).toBeCloseTo(0.5, 1);
        expect(result.confidenceLevel).toBe('high');
      });

      test('should calculate advanced rates correctly', () => {
        const user: UserProfile = {
          age: 30,
          gender: 'male',
          workout_experience_years: 4,
        } as UserProfile;

        const result = calculator.calculateMaxGainRate(user);

        expect(result.category).toBe('Advanced');
        expect(result.monthlyKg).toBeCloseTo(0.25, 2);
      });

      test('should calculate elite rates correctly', () => {
        const user: UserProfile = {
          age: 35,
          gender: 'male',
          workout_experience_years: 6,
        } as UserProfile;

        const result = calculator.calculateMaxGainRate(user);

        expect(result.category).toBe('Elite');
        expect(result.monthlyKg).toBeCloseTo(0.1, 2);
      });

      test('should apply age bonus for young athletes', () => {
        const user: UserProfile = {
          age: 18,
          gender: 'male',
          workout_experience_years: 1,
        } as UserProfile;

        const result = calculator.calculateMaxGainRate(user);

        // Should have 15% bonus for age < 20
        expect(result.monthlyKg).toBeGreaterThan(0.5);
      });

      test('should apply age penalty for older athletes (40-50)', () => {
        const user: UserProfile = {
          age: 45,
          gender: 'male',
          workout_experience_years: 1,
        } as UserProfile;

        const result = calculator.calculateMaxGainRate(user);

        // Should have 10% penalty for age 40-50
        expect(result.monthlyKg).toBeLessThan(0.5);
      });

      test('should apply age penalty for 50-60 age range', () => {
        const user: UserProfile = {
          age: 55,
          gender: 'male',
          workout_experience_years: 1,
        } as UserProfile;

        const result = calculator.calculateMaxGainRate(user);

        // Should have 20% penalty for age 50-60
        expect(result.monthlyKg).toBeLessThan(0.45);
      });

      test('should apply sarcopenia penalty for 60+', () => {
        const user: UserProfile = {
          age: 65,
          gender: 'male',
          workout_experience_years: 1,
        } as UserProfile;

        const result = calculator.calculateMaxGainRate(user);

        // Should have 30% penalty for age 60+
        expect(result.monthlyKg).toBeLessThan(0.4);
      });
    });

    describe('validateGoal', () => {
      test('should validate realistic goal with success', () => {
        const user: UserProfile = {
          age: 25,
          gender: 'male',
          workout_experience_years: 0,
        } as UserProfile;

        const result = calculator.validateGoal(6, 6, user); // 6kg in 6 months

        expect(result.valid).toBe(true);
        expect(result.severity).toBe('success');
        expect(result.achievementProbability).toBe(80);
      });

      test('should validate slightly optimistic goal with info', () => {
        const user: UserProfile = {
          age: 25,
          gender: 'male',
          workout_experience_years: 0,
        } as UserProfile;

        const result = calculator.validateGoal(7, 6, user); // 7kg in 6 months (slightly over)

        expect(result.valid).toBe(true);
        expect(result.severity).toBe('info');
        expect(result.achievementProbability).toBe(50);
        expect(result.suggestedTimeline).toBeDefined();
      });

      test('should validate very optimistic goal with warning', () => {
        const user: UserProfile = {
          age: 25,
          gender: 'male',
          workout_experience_years: 0,
        } as UserProfile;

        const result = calculator.validateGoal(10, 6, user); // 10kg in 6 months (too high)

        expect(result.valid).toBe(true);
        expect(result.severity).toBe('warning');
        expect(result.achievementProbability).toBe(20);
        expect(result.recommendations).toBeDefined();
        expect(result.recommendations!.length).toBeGreaterThan(0);
      });
    });

    describe('estimateFirstYearPotential', () => {
      test('should estimate first year potential for beginner male', () => {
        const user: UserProfile = {
          age: 25,
          gender: 'male',
          workout_experience_years: 0,
        } as UserProfile;

        const result = calculator.estimateFirstYearPotential(user);

        expect(result.realistic).toBeGreaterThan(10);
        expect(result.optimistic).toBeGreaterThan(result.realistic);
        expect(result.conservative).toBeLessThan(result.realistic);
      });
    });

    describe('calculateCareerPotential', () => {
      test('should calculate career muscle gain potential for male', () => {
        const user: UserProfile = {
          age: 25,
          gender: 'male',
          workout_experience_years: 0,
        } as UserProfile;

        const result = calculator.calculateCareerPotential(user);

        expect(result.totalPotential).toBeGreaterThan(20);
        expect(result.timeToReach).toBe(5);
        expect(result.breakdown.year1).toBeGreaterThan(result.breakdown.year2);
        expect(result.breakdown.year2).toBeGreaterThan(result.breakdown.year3);
      });

      test('should calculate career muscle gain potential for female', () => {
        const user: UserProfile = {
          age: 25,
          gender: 'female',
          workout_experience_years: 0,
        } as UserProfile;

        const result = calculator.calculateCareerPotential(user);

        expect(result.totalPotential).toBeGreaterThan(10);
        expect(result.totalPotential).toBeLessThan(15);
      });
    });
  });

  // ============================================================================
  // FAT LOSS VALIDATOR TESTS
  // ============================================================================
  describe('FatLossValidator', () => {
    const validator = new FatLossValidator();

    describe('validateGoal', () => {
      test('should validate standard rate (0.5kg/week) with success', () => {
        const result = validator.validateGoal(80, 76, 8, 25); // 4kg in 8 weeks = 0.5kg/week

        expect(result.valid).toBe(true);
        expect(result.severity).toBe('success');
        expect(result.achievementProbability).toBe(85);
      });

      test('should validate standard rate (1kg/week) with success', () => {
        const result = validator.validateGoal(80, 72, 8, 25); // 8kg in 8 weeks = 1kg/week

        expect(result.valid).toBe(true);
        expect(result.severity).toBe('success');
        expect(result.achievementProbability).toBe(85);
      });

      test('should validate aggressive rate (1.2kg/week) with info', () => {
        const result = validator.validateGoal(80, 70, 8, 25); // 10kg in 8 weeks = 1.25kg/week

        expect(result.valid).toBe(true);
        expect(result.severity).toBe('info');
        expect(result.achievementProbability).toBe(60);
      });

      test('should validate very aggressive rate (1.75kg/week) with warning', () => {
        const result = validator.validateGoal(80, 66, 8, 25); // 14kg in 8 weeks = 1.75kg/week

        expect(result.valid).toBe(true);
        expect(result.severity).toBe('warning');
        expect(result.achievementProbability).toBe(40);
        expect(result.suggestedTimeline).toBeDefined();
      });

      test('should validate extreme rate for high BMI with warning', () => {
        const result = validator.validateGoal(120, 100, 8, 38); // 20kg in 8 weeks = 2.5kg/week, BMI 38

        expect(result.valid).toBe(true);
        expect(result.severity).toBe('warning');
        expect(result.allowOverride).toBe(true);
      });

      test('should validate extreme rate for normal BMI with error', () => {
        const result = validator.validateGoal(80, 60, 8, 25); // 20kg in 8 weeks = 2.5kg/week, BMI 25

        expect(result.valid).toBe(true);
        expect(result.severity).toBe('error');
        expect(result.achievementProbability).toBe(10);
        expect(result.allowOverride).toBe(true);
      });
    });

    describe('calculateSafeDeficit', () => {
      test('should calculate safe deficit for obese individual (BMI > 35)', () => {
        const result = validator.calculateSafeDeficit(38, 2500, 'moderate');

        expect(result.maxDeficit).toBe(1000);
        expect(result.minDeficit).toBe(300);
        expect(result.recommendedDeficit).toBeLessThanOrEqual(result.maxDeficit);
      });

      test('should calculate safe deficit for overweight individual (BMI 30-35)', () => {
        const result = validator.calculateSafeDeficit(32, 2500, 'moderate');

        expect(result.maxDeficit).toBe(1000);
      });

      test('should calculate safe deficit for normal weight individual', () => {
        const result = validator.calculateSafeDeficit(24, 2500, 'moderate');

        expect(result.maxDeficit).toBe(750);
      });

      test('should adjust deficit for very active individuals', () => {
        const result = validator.calculateSafeDeficit(28, 3000, 'very_active');

        expect(result.maxDeficit).toBeGreaterThan(750);
      });

      test('should never exceed 40% of TDEE', () => {
        const result = validator.calculateSafeDeficit(38, 2000, 'moderate');

        expect(result.maxDeficit).toBeLessThanOrEqual(800); // 40% of 2000
      });
    });

    describe('validateTimeline', () => {
      test('should suggest realistic timeline ranges', () => {
        const result = validator.validateTimeline(80, 70, 25);

        expect(result.minWeeks).toBeLessThan(result.optimalWeeks);
        expect(result.optimalWeeks).toBeLessThan(result.maxWeeks);
      });

      test('should adjust for high BMI', () => {
        // Same weight loss (10kg), different BMI
        const highBMI = validator.validateTimeline(110, 100, 38);
        const normalBMI = validator.validateTimeline(80, 70, 25);

        // High BMI allows faster loss (1.5kg/week vs 1kg/week)
        // highBMI: 10kg / 1.5 = 6.67 weeks (ceil = 7)
        // normalBMI: 10kg / 1.0 = 10 weeks
        expect(highBMI.minWeeks).toBeLessThan(normalBMI.minWeeks);
      });
    });

    describe('calculateProteinRequirements', () => {
      test('should calculate protein for moderate deficit', () => {
        const result = validator.calculateProteinRequirements(60, 0.5);

        expect(result.optimal).toBeCloseTo(120, 0); // 2.0 * 60
      });

      test('should calculate higher protein for aggressive deficit', () => {
        const aggressive = validator.calculateProteinRequirements(60, 1.2);
        const moderate = validator.calculateProteinRequirements(60, 0.5);

        expect(aggressive.optimal).toBeGreaterThan(moderate.optimal);
      });

      test('should calculate maximum protein for very aggressive deficit', () => {
        const result = validator.calculateProteinRequirements(60, 2.0);

        expect(result.optimal).toBeCloseTo(180, 0); // 3.0 * 60
      });
    });
  });

  // ============================================================================
  // HEART RATE CALCULATOR TESTS
  // ============================================================================
  describe('HeartRateCalculator', () => {
    const calculator = new HeartRateCalculator();

    describe('calculateMaxHR', () => {
      test('should use measured HR when provided', () => {
        const result = calculator.calculateMaxHR(30, 'male', 190);

        expect(result).toBe(190);
      });

      test('should use Gulati formula for females', () => {
        const result = calculator.calculateMaxHR(30, 'female');

        // Gulati: 206 - (0.88 * 30) = 179.6 ≈ 180
        expect(result).toBeCloseTo(180, 0);
      });

      test('should use Tanaka formula for males', () => {
        const result = calculator.calculateMaxHR(30, 'male');

        // Tanaka: 208 - (0.7 * 30) = 187
        expect(result).toBeCloseTo(187, 0);
      });

      test('should decrease with age', () => {
        const young = calculator.calculateMaxHR(20, 'male');
        const old = calculator.calculateMaxHR(60, 'male');

        expect(young).toBeGreaterThan(old);
      });
    });

    describe('calculateZones', () => {
      test('should calculate 5 zones using Karvonen method', () => {
        const result = calculator.calculateZones(30, 'male', 60);

        expect(result.zone1).toBeDefined();
        expect(result.zone2).toBeDefined();
        expect(result.zone3).toBeDefined();
        expect(result.zone4).toBeDefined();
        expect(result.zone5).toBeDefined();
      });

      test('should have increasing intensity across zones', () => {
        const result = calculator.calculateZones(30, 'male', 60);

        expect(result.zone1.min).toBeLessThan(result.zone2.min);
        expect(result.zone2.min).toBeLessThan(result.zone3.min);
        expect(result.zone3.min).toBeLessThan(result.zone4.min);
        expect(result.zone4.min).toBeLessThan(result.zone5.min);
      });

      test('should include metadata', () => {
        const result = calculator.calculateZones(30, 'male', 60);

        expect(result.metadata.maxHR).toBeDefined();
        expect(result.metadata.restingHR).toBeDefined();
        expect(result.metadata.formula).toBeDefined();
        expect(result.metadata.method).toBe('Karvonen');
      });

      test('should estimate resting HR if not provided', () => {
        const result = calculator.calculateZones(30, 'male');

        expect(result.metadata.restingHR).toBe(70); // Default male
      });

      test('should use different default resting HR for females', () => {
        const result = calculator.calculateZones(30, 'female');

        expect(result.metadata.restingHR).toBe(75); // Default female
      });
    });

    describe('classifyRestingHR', () => {
      test('should classify excellent resting HR for males', () => {
        const result = calculator.classifyRestingHR(50, 30, 'male');

        expect(result.classification).toBe('Excellent');
      });

      test('should classify average resting HR', () => {
        const result = calculator.classifyRestingHR(70, 30, 'male');

        expect(result.classification).toBe('Average');
      });

      test('should classify poor resting HR', () => {
        const result = calculator.classifyRestingHR(90, 30, 'male');

        expect(result.classification).toBe('Poor');
      });
    });

    describe('calculateTargetHR', () => {
      test('should calculate target HR for specific intensity', () => {
        const result = calculator.calculateTargetHR(30, 'male', 70, 60);

        expect(result.target).toBeGreaterThan(60);
        expect(result.target).toBeLessThan(187);
        expect(result.zone).toBeDefined();
      });

      test('should return range around target', () => {
        const result = calculator.calculateTargetHR(30, 'male', 70, 60);

        expect(result.range.min).toBeLessThan(result.target);
        expect(result.range.max).toBeGreaterThan(result.target);
      });
    });

    describe('estimateFitnessFromRHR', () => {
      test('should estimate excellent fitness from low RHR', () => {
        const result = calculator.estimateFitnessFromRHR(50, 30, 'male');

        expect(result.fitnessLevel).toBe('Excellent');
        expect(result.score).toBeGreaterThan(80);
      });

      test('should estimate poor fitness from high RHR', () => {
        const result = calculator.estimateFitnessFromRHR(90, 30, 'male');

        expect(result.fitnessLevel).toBe('Poor');
        expect(result.score).toBeLessThan(40);
      });
    });
  });

  // ============================================================================
  // VO2 MAX CALCULATOR TESTS
  // ============================================================================
  describe('VO2MaxCalculator', () => {
    const calculator = new VO2MaxCalculator();

    describe('estimateVO2Max', () => {
      test('should estimate VO2 max for sedentary male', () => {
        const user: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'sedentary',
        } as UserProfile;

        const result = calculator.estimateVO2Max(user, 70);

        expect(result.vo2max).toBeGreaterThan(20);
        expect(result.vo2max).toBeLessThan(60);
        expect(result.classification).toBeDefined();
      });

      test('should estimate higher VO2 max for active individuals', () => {
        const sedentary: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'sedentary',
        } as UserProfile;

        const active: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'very_active',
        } as UserProfile;

        const sedentaryResult = calculator.estimateVO2Max(sedentary, 70);
        const activeResult = calculator.estimateVO2Max(active, 60);

        expect(activeResult.vo2max).toBeGreaterThan(sedentaryResult.vo2max);
      });

      test('should estimate lower VO2 max for higher resting HR', () => {
        const user: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'moderate',
        } as UserProfile;

        const lowHR = calculator.estimateVO2Max(user, 55);
        const highHR = calculator.estimateVO2Max(user, 80);

        expect(lowHR.vo2max).toBeGreaterThan(highHR.vo2max);
      });

      test('should provide classification and percentile', () => {
        const user: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'active',
        } as UserProfile;

        const result = calculator.estimateVO2Max(user, 60);

        expect(result.classification).toBeDefined();
        expect(result.percentile).toBeGreaterThan(0);
        expect(result.percentile).toBeLessThanOrEqual(100);
      });

      test('should provide recommendations', () => {
        const user: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'sedentary',
        } as UserProfile;

        const result = calculator.estimateVO2Max(user, 75);

        expect(result.recommendations).toBeDefined();
        expect(result.recommendations.length).toBeGreaterThan(0);
      });

      test('should include method and accuracy', () => {
        const user: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'moderate',
        } as UserProfile;

        const result = calculator.estimateVO2Max(user, 70);

        expect(result.method).toBe('Non-exercise estimation');
        expect(result.accuracy).toBeDefined();
      });
    });

    describe('estimateImprovementPotential', () => {
      test('should show higher improvement potential for sedentary individuals', () => {
        const sedentary = calculator.estimateImprovementPotential(35, 'sedentary');
        const active = calculator.estimateImprovementPotential(50, 'very_active');

        expect(sedentary.improvementPercent).toBeGreaterThan(active.improvementPercent);
      });

      test('should calculate 6-month and 1-year projections', () => {
        const result = calculator.estimateImprovementPotential(35, 'light');

        expect(result.potential6Months).toBeGreaterThan(35);
        expect(result.potential1Year).toBeGreaterThan(result.potential6Months);
      });
    });
  });

  // ============================================================================
  // HEALTH SCORE CALCULATOR TESTS
  // ============================================================================
  describe('HealthScoreCalculator', () => {
    const calculator = new HealthScoreCalculator();

    describe('calculate', () => {
      test('should calculate comprehensive health score', () => {
        const user: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'moderate',
        } as UserProfile;

        const metrics = {
          bmi: 22,
          bmiCategory: 'Normal',
          waterIntake: 2500,
          waterTarget: 2500,
          protein: 120,
          proteinTarget: 120,
          vo2max: 50,
        };

        const result = calculator.calculate(user, metrics);

        expect(result.totalScore).toBeGreaterThan(0);
        expect(result.totalScore).toBeLessThanOrEqual(100);
        expect(result.grade).toBeDefined();
        expect(result.factors.length).toBe(5);
        expect(result.recommendations.length).toBeGreaterThan(0);
      });

      test('should give excellent score for optimal metrics', () => {
        const user: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'very_active',
        } as UserProfile;

        const metrics = {
          bmi: 22,
          waterIntake: 3000,
          waterTarget: 2500,
          protein: 150,
          proteinTarget: 150,
          vo2max: 60,
        };

        const result = calculator.calculate(user, metrics);

        expect(result.totalScore).toBeGreaterThan(85);
        expect(result.grade).toContain('A');
      });

      test('should give poor score for suboptimal metrics', () => {
        const user: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'sedentary',
        } as UserProfile;

        const metrics = {
          bmi: 32,
          waterIntake: 1000,
          waterTarget: 2500,
          protein: 40,
          proteinTarget: 120,
          vo2max: 30,
        };

        const result = calculator.calculate(user, metrics);

        expect(result.totalScore).toBeLessThan(60);
      });

      test('should include breakdown by category', () => {
        const user: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'moderate',
        } as UserProfile;

        const metrics = {
          bmi: 22,
          waterIntake: 2500,
          waterTarget: 2500,
          protein: 120,
          proteinTarget: 120,
        };

        const result = calculator.calculate(user, metrics);

        const categories = result.factors.map(f => f.category);
        expect(categories).toContain('BMI/Body Composition');
        expect(categories).toContain('Physical Activity');
        expect(categories).toContain('Hydration');
        expect(categories).toContain('Nutrition Quality');
      });

      test('should provide targeted recommendations', () => {
        const user: UserProfile = {
          age: 30,
          gender: 'male',
          activity_level: 'sedentary',
        } as UserProfile;

        const metrics = {
          bmi: 22,
          waterIntake: 1000,
          waterTarget: 2500,
          protein: 50,
          proteinTarget: 120,
        };

        const result = calculator.calculate(user, metrics);

        // Should recommend improving weak areas
        expect(result.recommendations.length).toBeGreaterThan(0);
      });
    });

    describe('analyzeTrend', () => {
      test('should identify improving trend', () => {
        const result = calculator.analyzeTrend(85, 75);

        expect(result.trend).toBe('improving');
        expect(result.change).toBe(10);
      });

      test('should identify declining trend', () => {
        const result = calculator.analyzeTrend(65, 80);

        expect(result.trend).toBe('declining');
        expect(result.change).toBe(-15);
      });

      test('should identify stable trend', () => {
        const result = calculator.analyzeTrend(75, 73);

        expect(result.trend).toBe('stable');
      });

      test('should handle no previous score', () => {
        const result = calculator.analyzeTrend(75);

        expect(result.trend).toBe('stable');
        expect(result.change).toBe(0);
      });
    });
  });
});
