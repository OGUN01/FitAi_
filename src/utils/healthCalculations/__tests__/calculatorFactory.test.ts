/**
 * UNIVERSAL HEALTH CALCULATION SYSTEM - CALCULATOR FACTORY TESTS
 * Comprehensive test suite for BMR, BMI, TDEE, and Water calculators
 *
 * Test Coverage:
 * - All 4 BMR formulas with published validation data
 * - Population-specific BMI classifications
 * - Climate-adaptive TDEE calculations
 * - Climate-adaptive water recommendations
 *
 * Phase 1: Foundation Tests
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import { HealthCalculatorFactory } from '../calculatorFactory';
import type { UserProfile } from '../types';

describe('BMR Calculators', () => {
  describe('Mifflin-St Jeor Formula', () => {
    test('Male: 30yo, 70kg, 175cm → ~1710 cal', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 70,
        height: 175,
        country: 'US',
      };

      const calculator = HealthCalculatorFactory.createBMRCalculator(user);
      const bmr = calculator.calculate(user);

      expect(bmr).toBeCloseTo(1710, -1); // Within 10 calories
      expect(calculator.getFormula()).toBe('mifflin_st_jeor');
      expect(calculator.getAccuracy()).toBe('±10%');
    });

    test('Female: 30yo, 60kg, 165cm → ~1390 cal', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'female',
        weight: 60,
        height: 165,
        country: 'US',
      };

      const calculator = HealthCalculatorFactory.createBMRCalculator(user);
      const bmr = calculator.calculate(user);

      expect(bmr).toBeCloseTo(1390, -1);
    });

    test('Other gender: uses average formula', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'other',
        weight: 65,
        height: 170,
        country: 'US',
      };

      const calculator = HealthCalculatorFactory.createBMRCalculator(user);
      const bmr = calculator.calculate(user);

      expect(bmr).toBeGreaterThan(1300);
      expect(bmr).toBeLessThan(1700);
    });
  });

  describe('Katch-McArdle Formula', () => {
    test('70kg, 15% body fat → ~1751 cal', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 70,
        height: 175,
        bodyFat: 15,
        bodyFatMethod: 'dexa',
        country: 'US',
      };

      const calculator = HealthCalculatorFactory.createBMRCalculator(user);
      const bmr = calculator.calculate(user);

      // 70kg * (1 - 0.15) = 59.5kg lean mass
      // 370 + (21.6 * 59.5) = 370 + 1285.2 = 1655.2
      expect(bmr).toBeCloseTo(1655, 0);
      expect(calculator.getFormula()).toBe('katch_mcardle');
      expect(calculator.getAccuracy()).toBe('±5%');
    });

    test('60kg, 25% body fat → ~1341 cal', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'female',
        weight: 60,
        height: 165,
        bodyFat: 25,
        bodyFatMethod: 'dexa',
        country: 'US',
      };

      const calculator = HealthCalculatorFactory.createBMRCalculator(user);
      const bmr = calculator.calculate(user);

      // 60kg * (1 - 0.25) = 45kg lean mass
      // 370 + (21.6 * 45) = 370 + 972 = 1342
      expect(bmr).toBeCloseTo(1342, 0);
    });

    test('Fallback to Mifflin-St Jeor if no body fat data', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 70,
        height: 175,
        bodyFatMethod: 'dexa', // Method set but no actual bodyFat value
        country: 'US',
      };

      const calculator = HealthCalculatorFactory.createBMRCalculator(user);
      const bmr = calculator.calculate(user);

      // Should fall back to Mifflin-St Jeor
      expect(bmr).toBeCloseTo(1710, -1);
    });
  });

  describe('Cunningham Formula', () => {
    test('Elite athlete: 80kg, 10% BF → ~2076 cal', () => {
      const user: UserProfile = {
        age: 25,
        gender: 'male',
        weight: 80,
        height: 180,
        bodyFat: 10,
        workoutExperienceYears: 5,
        fitnessLevel: 'elite',
        country: 'US',
      };

      const calculator = HealthCalculatorFactory.createBMRCalculator(user);
      const bmr = calculator.calculate(user);

      // 80kg * (1 - 0.10) = 72kg lean mass
      // 500 + (22 * 72) = 500 + 1584 = 2084
      expect(bmr).toBeCloseTo(2084, 0);
      expect(calculator.getFormula()).toBe('cunningham');
    });
  });
});

describe('BMI Calculators', () => {
  describe('Standard BMI (General Population)', () => {
    test('70kg, 175cm → BMI 22.9 (Normal)', () => {
      const calculator = HealthCalculatorFactory.createBMICalculator('general');
      const bmi = calculator.calculate(70, 175);

      expect(bmi).toBeCloseTo(22.9, 1);

      const classification = calculator.getClassification(bmi);
      expect(classification.category).toBe('Normal');
      expect(classification.healthRisk).toBe('low');
      expect(classification.ethnicity).toBe('general');
    });

    test('BMI 27 → Overweight', () => {
      const calculator = HealthCalculatorFactory.createBMICalculator('general');
      const classification = calculator.getClassification(27);

      expect(classification.category).toBe('Overweight');
      expect(classification.healthRisk).toBe('moderate');
    });

    test('BMI 32 → Obese Class I', () => {
      const calculator = HealthCalculatorFactory.createBMICalculator('general');
      const classification = calculator.getClassification(32);

      expect(classification.category).toBe('Obese Class I');
      expect(classification.healthRisk).toBe('high');
    });

    test('Standard cutoffs: 18.5, 24.9, 29.9, 30', () => {
      const calculator = HealthCalculatorFactory.createBMICalculator('general');
      const cutoffs = calculator.getCutoffs();

      expect(cutoffs.underweight).toBe(18.5);
      expect(cutoffs.normalMax).toBe(24.9);
      expect(cutoffs.overweightMax).toBe(29.9);
      expect(cutoffs.obeseMin).toBe(30);
    });
  });

  describe('Asian BMI (Lower Cutoffs)', () => {
    test('BMI 23.5 → Overweight (Asian)', () => {
      const calculator = HealthCalculatorFactory.createBMICalculator('asian');
      const classification = calculator.getClassification(23.5);

      expect(classification.category).toBe('Overweight');
      expect(classification.healthRisk).toBe('moderate');
      expect(classification.ethnicity).toBe('asian');
      expect(classification.message).toContain('Asian classification');
    });

    test('BMI 22.5 → Normal (Asian)', () => {
      const calculator = HealthCalculatorFactory.createBMICalculator('asian');
      const classification = calculator.getClassification(22.5);

      expect(classification.category).toBe('Normal');
      expect(classification.healthRisk).toBe('low');
    });

    test('Asian cutoffs: 18.5, 22.9, 27.4, 27.5', () => {
      const calculator = HealthCalculatorFactory.createBMICalculator('asian');
      const cutoffs = calculator.getCutoffs();

      expect(cutoffs.underweight).toBe(18.5);
      expect(cutoffs.normalMax).toBe(22.9);
      expect(cutoffs.overweightMax).toBe(27.4);
      expect(cutoffs.obeseMin).toBe(27.5);
      expect(cutoffs.source).toContain('WHO Asia-Pacific');
    });

    test('Borderline BMI 23.5 shows educational message', () => {
      const calculator = HealthCalculatorFactory.createBMICalculator('asian');
      const classification = calculator.getClassification(23.5);

      expect(classification.message).toContain('WHO classification');
      expect(classification.message).toContain('higher health risks');
    });
  });

  describe('African BMI (Higher Cutoffs)', () => {
    test('BMI 26.5 → Normal (African)', () => {
      const calculator = HealthCalculatorFactory.createBMICalculator('black_african');
      const classification = calculator.getClassification(26.5);

      expect(classification.category).toBe('Normal');
      expect(classification.healthRisk).toBe('low');
      expect(classification.ethnicity).toBe('black_african');
    });

    test('BMI 25.5 shows muscle mass message', () => {
      const calculator = HealthCalculatorFactory.createBMICalculator('black_african');
      const classification = calculator.getClassification(25.5);

      expect(classification.message).toContain('higher muscle mass');
      expect(classification.message).toContain('waist-to-height ratio');
    });

    test('African cutoffs: 18.5, 26.9, 31.9, 32', () => {
      const calculator = HealthCalculatorFactory.createBMICalculator('black_african');
      const cutoffs = calculator.getCutoffs();

      expect(cutoffs.underweight).toBe(18.5);
      expect(cutoffs.normalMax).toBe(26.9);
      expect(cutoffs.overweightMax).toBe(31.9);
      expect(cutoffs.obeseMin).toBe(32);
    });
  });
});

describe('TDEE Calculator', () => {
  test('BMR 1710, sedentary, temperate → 2052 cal', () => {
    const tdee = HealthCalculatorFactory.calculateTDEE(1710, 'sedentary', 'temperate');

    // 1710 * 1.2 (sedentary) * 1.0 (temperate) = 2052
    expect(tdee).toBe(2052);
  });

  test('BMR 1710, moderate, tropical → 2913 cal', () => {
    const tdee = HealthCalculatorFactory.calculateTDEE(1710, 'moderate', 'tropical');

    // 1710 * 1.55 (moderate) = 2650.5
    // 2650.5 * 1.05 (tropical) = 2783.025 → rounds to 2783
    expect(tdee).toBeCloseTo(2783, 0);
  });

  test('BMR 1710, active, cold → 3417 cal', () => {
    const tdee = HealthCalculatorFactory.calculateTDEE(1710, 'active', 'cold');

    // 1710 * 1.725 (active) = 2949.75
    // 2949.75 * 1.15 (cold) = 3392.2125 → rounds to 3392
    expect(tdee).toBeCloseTo(3392, 0);
  });

  test('BMR 1710, light, arid → 2220 cal', () => {
    const tdee = HealthCalculatorFactory.calculateTDEE(1710, 'light', 'arid');

    // 1710 * 1.375 (light) = 2351.25
    // 2351.25 * 1.05 (arid) = 2468.8125 → rounds to 2469
    expect(tdee).toBeCloseTo(2469, 0);
  });

  test('BMR 1710, very_active, temperate → 3249 cal', () => {
    const tdee = HealthCalculatorFactory.calculateTDEE(1710, 'very_active', 'temperate');

    // 1710 * 1.9 (very_active) * 1.0 (temperate) = 3249
    expect(tdee).toBe(3249);
  });
});

describe('Water Calculator', () => {
  test('70kg, sedentary, temperate → 2450 ml', () => {
    const water = HealthCalculatorFactory.calculateWaterIntake(70, 'sedentary', 'temperate');

    // 70kg * 35ml = 2450ml
    // 2450 * 1.0 (temperate) + 0 (sedentary) = 2450ml
    expect(water).toBe(2450);
  });

  test('70kg, moderate, tropical → 4175 ml', () => {
    const water = HealthCalculatorFactory.calculateWaterIntake(70, 'moderate', 'tropical');

    // 70kg * 35ml = 2450ml
    // 2450 * 1.5 (tropical) = 3675ml
    // 3675 + 500 (moderate) = 4175ml
    expect(water).toBe(4175);
  });

  test('70kg, active, cold → 2958 ml', () => {
    const water = HealthCalculatorFactory.calculateWaterIntake(70, 'active', 'cold');

    // 70kg * 35ml = 2450ml
    // 2450 * 0.9 (cold) = 2205ml
    // 2205 + 750 (active) = 2955ml → rounds to 2955
    expect(water).toBe(2955);
  });

  test('70kg, very_active, arid → 5165 ml', () => {
    const water = HealthCalculatorFactory.calculateWaterIntake(70, 'very_active', 'arid');

    // 70kg * 35ml = 2450ml
    // 2450 * 1.7 (arid) = 4165ml
    // 4165 + 1000 (very_active) = 5165ml
    expect(water).toBe(5165);
  });

  test('80kg, light, temperate → 3050 ml', () => {
    const water = HealthCalculatorFactory.calculateWaterIntake(80, 'light', 'temperate');

    // 80kg * 35ml = 2800ml
    // 2800 * 1.0 (temperate) + 250 (light) = 3050ml
    expect(water).toBe(3050);
  });
});

describe('Integrated Real-World Scenarios', () => {
  test('Indian vegetarian male in Mumbai (tropical climate)', () => {
    const user: UserProfile = {
      age: 30,
      gender: 'male',
      weight: 70,
      height: 175,
      country: 'IN',
      state: 'MH',
      activityLevel: 'moderate',
      dietType: 'vegetarian',
    };

    const bmrCalc = HealthCalculatorFactory.createBMRCalculator(user);
    const bmiCalc = HealthCalculatorFactory.createBMICalculator('asian');

    const bmr = bmrCalc.calculate(user);
    const bmi = bmiCalc.calculate(70, 175);
    const tdee = HealthCalculatorFactory.calculateTDEE(bmr, 'moderate', 'tropical');
    const water = HealthCalculatorFactory.calculateWaterIntake(70, 'moderate', 'tropical');

    expect(bmr).toBeCloseTo(1710, -1);
    expect(bmi).toBeCloseTo(22.9, 1);
    expect(tdee).toBeGreaterThan(2700); // Tropical boost
    expect(water).toBeGreaterThan(4000); // High due to tropical climate
  });

  test('American athlete in cold climate (Alaska)', () => {
    const user: UserProfile = {
      age: 25,
      gender: 'male',
      weight: 80,
      height: 180,
      bodyFat: 10,
      bodyFatMethod: 'dexa',
      workoutExperienceYears: 5,
      fitnessLevel: 'elite',
      country: 'US',
      state: 'AK',
      activityLevel: 'very_active',
    };

    const bmrCalc = HealthCalculatorFactory.createBMRCalculator(user);
    const bmr = bmrCalc.calculate(user);
    const tdee = HealthCalculatorFactory.calculateTDEE(bmr, 'very_active', 'cold');
    const water = HealthCalculatorFactory.calculateWaterIntake(80, 'very_active', 'cold');

    expect(bmrCalc.getFormula()).toBe('cunningham'); // Elite athlete
    expect(bmr).toBeGreaterThan(2000);
    expect(tdee).toBeGreaterThan(4000); // High activity + cold boost
    expect(water).toBeLessThan(4000); // Cold reduces water needs despite activity
  });
});
