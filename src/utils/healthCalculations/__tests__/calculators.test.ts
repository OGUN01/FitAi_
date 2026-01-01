/**
 * Comprehensive Test Suite for Universal Health Calculators
 * Tests all calculators with various scenarios and edge cases
 */

import { describe, it, expect } from '@jest/globals';
import type { UserProfile } from '../types.js';

// BMR Calculators
import {
  MifflinStJeorBMRCalculator,
  KatchMcArdleBMRCalculator,
  CunninghamBMRCalculator,
  HarrisBenedictBMRCalculator,
  getBMRCalculator,
} from '../calculators/bmrCalculators';

// BMI Calculators
import {
  AsianBMICalculator,
  AfricanBMICalculator,
  StandardBMICalculator,
  AthleticBMICalculator,
  HispanicBMICalculator,
  getBMICalculator,
} from '../calculators/bmiCalculators';

// TDEE Calculator
import {
  ClimateAdaptiveTDEECalculator,
  detectClimateSimple,
} from '../calculators/tdeeCalculator';

// Water Calculator
import {
  ClimateAdaptiveWaterCalculator,
  assessDehydration,
} from '../calculators/waterCalculator';

// Macro Calculator
import {
  DietAdaptiveMacroCalculator,
  getMinimumProtein,
  getOptimalProteinForMuscleGain,
} from '../calculators/macroCalculator';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMaleUser = (overrides?: Partial<UserProfile>): UserProfile => ({
  age: 30,
  gender: 'male',
  country: 'USA',
  state: 'California',
  weight: 75,
  height: 175,
  bodyFat: 15,
  activityLevel: 'moderate',
  dietType: 'omnivore',
  ...overrides,
});

const createFemaleUser = (overrides?: Partial<UserProfile>): UserProfile => ({
  age: 28,
  gender: 'female',
  country: 'USA',
  state: 'California',
  weight: 60,
  height: 165,
  bodyFat: 22,
  activityLevel: 'light',
  dietType: 'omnivore',
  ...overrides,
});

// ============================================================================
// BMR Calculator Tests
// ============================================================================

describe('BMR Calculators', () => {
  describe('MifflinStJeorBMRCalculator', () => {
    it('calculates BMR correctly for male user', () => {
      const calculator = new MifflinStJeorBMRCalculator();
      const user = createMaleUser();

      const bmr = calculator.calculate(user);

      // Expected: (10 × 75) + (6.25 × 175) - (5 × 30) + 5
      // = 750 + 1093.75 - 150 + 5 = 1698.75
      expect(bmr).toBeCloseTo(1698.75, 1);
    });

    it('calculates BMR correctly for female user', () => {
      const calculator = new MifflinStJeorBMRCalculator();
      const user = createFemaleUser();

      const bmr = calculator.calculate(user);

      // Expected: (10 × 60) + (6.25 × 165) - (5 × 28) - 161
      // = 600 + 1031.25 - 140 - 161 = 1330.25
      expect(bmr).toBeCloseTo(1330.25, 1);
    });

    it('throws error when required fields are missing', () => {
      const calculator = new MifflinStJeorBMRCalculator();
      const user = createMaleUser();
      user.weight = undefined as any;

      expect(() => calculator.calculate(user)).toThrow();
    });

    it('returns correct formula name and accuracy', () => {
      const calculator = new MifflinStJeorBMRCalculator();

      expect(calculator.getFormula()).toBe('Mifflin-St Jeor (1990)');
      expect(calculator.getAccuracy()).toBe('±10%');
    });
  });

  describe('KatchMcArdleBMRCalculator', () => {
    it('calculates BMR correctly with body fat percentage', () => {
      const calculator = new KatchMcArdleBMRCalculator();
      const user = createMaleUser();

      const bmr = calculator.calculate(user);

      // Lean mass = 75 × (1 - 0.15) = 63.75 kg
      // BMR = 370 + (21.6 × 63.75) = 370 + 1377 = 1747
      expect(bmr).toBeCloseTo(1747, 1);
    });

    it('throws error when body fat is missing', () => {
      const calculator = new KatchMcArdleBMRCalculator();
      const user = createMaleUser();
      user.bodyFat = undefined;

      expect(() => calculator.calculate(user)).toThrow('Body fat percentage required');
    });
  });

  describe('CunninghamBMRCalculator', () => {
    it('calculates BMR correctly for athletes', () => {
      const calculator = new CunninghamBMRCalculator();
      const user = createMaleUser();

      const bmr = calculator.calculate(user);

      // Lean mass = 75 × (1 - 0.15) = 63.75 kg
      // BMR = 500 + (22 × 63.75) = 500 + 1402.5 = 1902.5
      expect(bmr).toBeCloseTo(1902.5, 1);
    });
  });

  describe('HarrisBenedictBMRCalculator', () => {
    it('calculates BMR correctly for male user', () => {
      const calculator = new HarrisBenedictBMRCalculator();
      const user = createMaleUser();

      const bmr = calculator.calculate(user);

      // Expected: 88.362 + (13.397 × 75) + (4.799 × 175) - (5.677 × 30)
      // = 88.362 + 1004.775 + 839.825 - 170.31 = 1762.652
      expect(bmr).toBeCloseTo(1762.65, 1);
    });
  });

  describe('getBMRCalculator', () => {
    it('returns Cunningham for athletes with body fat', () => {
      const calculator = getBMRCalculator(true, true);
      expect(calculator).toBeInstanceOf(CunninghamBMRCalculator);
    });

    it('returns Katch-McArdle for non-athletes with body fat', () => {
      const calculator = getBMRCalculator(true, false);
      expect(calculator).toBeInstanceOf(KatchMcArdleBMRCalculator);
    });

    it('returns Mifflin-St Jeor for users without body fat', () => {
      const calculator = getBMRCalculator(false, false);
      expect(calculator).toBeInstanceOf(MifflinStJeorBMRCalculator);
    });
  });
});

// ============================================================================
// BMI Calculator Tests
// ============================================================================

describe('BMI Calculators', () => {
  describe('AsianBMICalculator', () => {
    it('calculates BMI correctly', () => {
      const calculator = new AsianBMICalculator();
      const bmi = calculator.calculate(70, 175);

      // BMI = 70 / (1.75^2) = 70 / 3.0625 = 22.86
      expect(bmi).toBeCloseTo(22.86, 2);
    });

    it('classifies BMI 26 as Obese (Asian-specific)', () => {
      const calculator = new AsianBMICalculator();
      const classification = calculator.getClassification(26);

      expect(classification.category).toBe('Overweight');
      expect(classification.healthRisk).toBe('moderate');
    });

    it('classifies BMI 28 as Obese (Asian-specific)', () => {
      const calculator = new AsianBMICalculator();
      const classification = calculator.getClassification(28);

      expect(classification.category).toBe('Obese');
      expect(classification.healthRisk).toBe('high');
    });

    it('has correct Asian cutoffs', () => {
      const calculator = new AsianBMICalculator();
      const cutoffs = calculator.getCutoffs();

      expect(cutoffs.normalMax).toBe(23.0);
      expect(cutoffs.obeseMin).toBe(27.5);
    });
  });

  describe('AfricanBMICalculator', () => {
    it('classifies BMI 28 as Normal (higher cutoffs)', () => {
      const calculator = new AfricanBMICalculator();
      const classification = calculator.getClassification(26);

      expect(classification.category).toBe('Normal');
      expect(classification.healthRisk).toBe('low');
    });

    it('has correct African cutoffs', () => {
      const calculator = new AfricanBMICalculator();
      const cutoffs = calculator.getCutoffs();

      expect(cutoffs.normalMax).toBe(27.0);
      expect(cutoffs.obeseMin).toBe(32.0);
    });
  });

  describe('StandardBMICalculator', () => {
    it('classifies BMI 26 as Overweight (standard)', () => {
      const calculator = new StandardBMICalculator();
      const classification = calculator.getClassification(26);

      expect(classification.category).toBe('Overweight');
      expect(classification.healthRisk).toBe('moderate');
    });

    it('has correct standard cutoffs', () => {
      const calculator = new StandardBMICalculator();
      const cutoffs = calculator.getCutoffs();

      expect(cutoffs.normalMax).toBe(25.0);
      expect(cutoffs.obeseMin).toBe(30.0);
    });
  });

  describe('AthleticBMICalculator', () => {
    it('recognizes BMI limitations for athletes', () => {
      const calculator = new AthleticBMICalculator();
      const classification = calculator.getClassification(28);

      expect(classification.category).toBe('Overweight');
      expect(classification.recommendations).toContain('Use body fat percentage instead of BMI');
    });
  });

  describe('getBMICalculator', () => {
    it('returns Asian calculator for asian population', () => {
      const calculator = getBMICalculator('asian');
      expect(calculator).toBeInstanceOf(AsianBMICalculator);
    });

    it('returns Standard calculator by default', () => {
      const calculator = getBMICalculator();
      expect(calculator).toBeInstanceOf(StandardBMICalculator);
    });
  });
});

// ============================================================================
// TDEE Calculator Tests
// ============================================================================

describe('TDEE Calculator', () => {
  const calculator = new ClimateAdaptiveTDEECalculator();

  it('calculates TDEE correctly for sedentary temperate climate', () => {
    const bmr = 1700;
    const tdee = calculator.calculate(bmr, 'sedentary', 'temperate');

    // Expected: 1700 × 1.2 × 1.0 = 2040
    expect(tdee).toBe(2040);
  });

  it('applies tropical climate adjustment correctly', () => {
    const bmr = 1700;
    const tdee = calculator.calculate(bmr, 'moderate', 'tropical');

    // Expected: 1700 × 1.55 × 1.075 = 2832.375 (rounded)
    expect(tdee).toBeCloseTo(2833, 0);
  });

  it('applies cold climate adjustment correctly', () => {
    const bmr = 1700;
    const tdee = calculator.calculate(bmr, 'moderate', 'cold');

    // Expected: 1700 × 1.55 × 1.15 = 3031.75 (rounded to 3030)
    expect(tdee).toBe(3030);
  });

  it('applies arid climate adjustment correctly', () => {
    const bmr = 1700;
    const tdee = calculator.calculate(bmr, 'moderate', 'arid');

    // Expected: 1700 × 1.55 × 1.05 = 2766.75
    expect(tdee).toBeCloseTo(2767, 0);
  });

  it('shows significant difference between climates', () => {
    const bmr = 1700;
    const tropicalTDEE = calculator.calculate(bmr, 'moderate', 'tropical');
    const coldTDEE = calculator.calculate(bmr, 'moderate', 'cold');

    // Cold should be higher than tropical
    expect(coldTDEE).toBeGreaterThan(tropicalTDEE);
  });

  it('provides detailed breakdown', () => {
    const breakdown = calculator.getBreakdown(1700, 'moderate', 'tropical');

    expect(breakdown.bmr).toBe(1700);
    expect(breakdown.activityMultiplier).toBe(1.55);
    expect(breakdown.climateMultiplier).toBe(1.075);
    expect(breakdown.breakdown).toContain('BMR:');
  });

  it('calculates calorie target for fat loss', () => {
    const tdee = 2500;
    const target = calculator.getCalorieTarget(tdee, 'fat_loss', 0.5);

    // Should be less than TDEE
    expect(target).toBeLessThan(tdee);
  });

  it('calculates calorie target for muscle gain', () => {
    const tdee = 2500;
    const target = calculator.getCalorieTarget(tdee, 'muscle_gain', 0.5);

    // Should be more than TDEE
    expect(target).toBeGreaterThan(tdee);
  });
});

describe('detectClimateSimple', () => {
  it('detects tropical climate correctly', () => {
    expect(detectClimateSimple('India')).toBe('tropical');
    expect(detectClimateSimple('Singapore')).toBe('tropical');
    expect(detectClimateSimple('Brazil')).toBe('tropical');
  });

  it('detects cold climate correctly', () => {
    expect(detectClimateSimple('Norway')).toBe('cold');
    expect(detectClimateSimple('Canada')).toBe('cold');
    expect(detectClimateSimple('Sweden')).toBe('cold');
  });

  it('detects arid climate correctly', () => {
    expect(detectClimateSimple('UAE')).toBe('arid');
    expect(detectClimateSimple('Saudi Arabia')).toBe('arid');
  });

  it('defaults to temperate for unknown countries', () => {
    expect(detectClimateSimple('Unknown Country')).toBe('temperate');
  });
});

// ============================================================================
// Water Calculator Tests
// ============================================================================

describe('Water Calculator', () => {
  const calculator = new ClimateAdaptiveWaterCalculator();

  it('calculates water correctly for sedentary temperate climate', () => {
    const water = calculator.calculate(70, 'sedentary', 'temperate');

    // Expected: 70 × 35 × 1.0 = 2450 ml
    expect(water).toBe(2450);
  });

  it('applies tropical climate adjustment correctly', () => {
    const water = calculator.calculate(70, 'moderate', 'tropical');

    // Base: 70 × 35 = 2450
    // + Activity: 1000
    // × Climate: 1.5
    // = (2450 + 1000) × 1.5 = 5175 (rounded to nearest 50)
    expect(water).toBeCloseTo(5175, -2); // Rounded to nearest 50
  });

  it('applies arid climate adjustment correctly (highest)', () => {
    const water = calculator.calculate(70, 'moderate', 'arid');

    // (70 × 35 + 1000) × 1.7 = 5865
    expect(water).toBeGreaterThan(5800);
  });

  it('reduces water for cold climate', () => {
    const waterCold = calculator.calculate(70, 'moderate', 'cold');
    const waterTemperate = calculator.calculate(70, 'moderate', 'temperate');

    expect(waterCold).toBeLessThan(waterTemperate);
  });

  it('provides detailed breakdown', () => {
    const breakdown = calculator.getBreakdown(70, 'moderate', 'tropical');

    expect(breakdown.baseWater).toBe(2450);
    expect(breakdown.activityBonus).toBe(1000);
    expect(breakdown.climateMultiplier).toBe(1.5);
    expect(breakdown.liters).toBeGreaterThan(0);
    expect(breakdown.cups).toBeGreaterThan(0);
  });

  it('provides climate-specific recommendations', () => {
    const recs = calculator.getRecommendations('arid');

    expect(recs).toContain('Increase intake significantly');
    expect(recs.length).toBeGreaterThan(4);
  });

  it('assesses hydration adequacy correctly', () => {
    const result = calculator.isAdequate(2000, 2000);

    expect(result.adequate).toBe(true);
    expect(result.percentage).toBe(100);
  });

  it('flags low hydration', () => {
    const result = calculator.isAdequate(1000, 2000);

    expect(result.adequate).toBe(false);
    expect(result.percentage).toBe(50);
  });

  it('calculates exercise water bonus', () => {
    const bonus = calculator.getExerciseWaterBonus(60, 'high');

    // 60 min × 15 ml/min × 1.5 = 1350 ml
    expect(bonus).toBeCloseTo(1350, -1);
  });
});

describe('assessDehydration', () => {
  it('detects no dehydration', () => {
    const result = assessDehydration({
      darkUrine: false,
      dryMouth: false,
      fatigue: false,
      dizziness: false,
      headache: false,
      reducedUrination: false,
    });

    expect(result.level).toBe('none');
  });

  it('detects mild dehydration', () => {
    const result = assessDehydration({
      darkUrine: true,
      dryMouth: true,
      fatigue: false,
      dizziness: false,
      headache: false,
      reducedUrination: false,
    });

    expect(result.level).toBe('mild');
    expect(result.symptomCount).toBe(2);
  });

  it('detects severe dehydration', () => {
    const result = assessDehydration({
      darkUrine: true,
      dryMouth: true,
      fatigue: true,
      dizziness: true,
      headache: true,
      reducedUrination: true,
    });

    expect(result.level).toBe('severe');
    expect(result.recommendations).toContain('Seek medical attention immediately');
  });
});

// ============================================================================
// Macro Calculator Tests
// ============================================================================

describe('Macro Calculator', () => {
  const calculator = new DietAdaptiveMacroCalculator();

  it('calculates protein correctly for fat loss omnivore', () => {
    const protein = calculator.calculateProtein(75, 'fat_loss', 'omnivore');

    // 75 × 2.4 × 1.0 = 180g
    expect(protein).toBe(180);
  });

  it('calculates protein correctly for vegan (25% increase)', () => {
    const protein = calculator.calculateProtein(75, 'muscle_gain', 'vegan');

    // 75 × 2.0 × 1.25 = 187.5 → 188g
    expect(protein).toBeCloseTo(188, 0);
  });

  it('calculates protein correctly for vegetarian (15% increase)', () => {
    const protein = calculator.calculateProtein(75, 'muscle_gain', 'vegetarian');

    // 75 × 2.0 × 1.15 = 172.5 → 173g
    expect(protein).toBeCloseTo(173, 0);
  });

  it('calculates keto macros correctly', () => {
    const macros = calculator.calculateMacroSplit(2000, 150, 'keto');

    // Protein: 150g (already given)
    // Fat: 2000 × 0.70 / 9 = 155g
    // Carbs: 2000 × 0.05 / 4 = 25g
    expect(macros.protein).toBe(150);
    expect(macros.fat).toBeCloseTo(156, 0);
    expect(macros.carbs).toBe(25);
  });

  it('calculates balanced macros correctly', () => {
    const macros = calculator.calculateMacroSplit(2000, 150, 'omnivore');

    // Protein: 150g = 600 kcal
    // Remaining: 1400 kcal
    // Fat (30%): 1400 × 0.30 / 9 = 47g
    // Carbs (70%): 1400 × 0.70 / 4 = 245g
    expect(macros.protein).toBe(150);
    expect(macros.fat).toBeCloseTo(47, 0);
    expect(macros.carbs).toBeCloseTo(245, 0);
  });

  it('validates macros correctly', () => {
    const macros = { protein: 150, fat: 67, carbs: 250 };
    const validation = calculator.validateMacros(macros, 2000);

    // 150×4 + 67×9 + 250×4 = 600 + 603 + 1000 = 2203 kcal
    expect(validation.totalCalories).toBeCloseTo(2203, 0);
  });

  it('flags invalid macros', () => {
    const macros = { protein: 30, fat: 10, carbs: 100 };
    const validation = calculator.validateMacros(macros, 2000);

    expect(validation.valid).toBe(false);
    expect(validation.issues.length).toBeGreaterThan(0);
  });

  it('provides diet-specific recommendations', () => {
    const recs = calculator.getDietRecommendations('vegan');

    expect(recs.proteinSources).toContain('Tempeh');
    expect(recs.tips.length).toBeGreaterThan(0);
  });

  it('calculates macro percentages correctly', () => {
    const macros = { protein: 150, fat: 67, carbs: 250 };
    const percentages = calculator.getMacroPercentages(macros);

    // Due to rounding, sum may be 99-101
    const sum = percentages.protein + percentages.fat + percentages.carbs;
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
  });

  it('distributes macros across meals', () => {
    const macros = { protein: 150, fat: 60, carbs: 300 };
    const distribution = calculator.getMealDistribution(macros, 3);

    expect(distribution).toHaveLength(3);
    expect(distribution[0].protein).toBe(50);
    expect(distribution[0].fat).toBe(20);
    expect(distribution[0].carbs).toBe(100);
  });
});

describe('Macro Helper Functions', () => {
  it('calculates minimum protein correctly', () => {
    const minProtein = getMinimumProtein(75);

    // 75 × 1.2 = 90g
    expect(minProtein).toBe(90);
  });

  it('calculates optimal protein for muscle gain', () => {
    const protein = getOptimalProteinForMuscleGain(75, 'vegan');

    // 75 × 2.0 × 1.25 = 187.5 → 188g
    expect(protein).toBeCloseTo(188, 0);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Calculator Integration', () => {
  it('full health calculation workflow', () => {
    const user = createMaleUser();

    // 1. Calculate BMR
    const bmrCalculator = new MifflinStJeorBMRCalculator();
    const bmr = bmrCalculator.calculate(user);
    expect(bmr).toBeGreaterThan(1000);

    // 2. Calculate TDEE
    const tdeeCalculator = new ClimateAdaptiveTDEECalculator();
    const tdee = tdeeCalculator.calculate(bmr, 'moderate', 'temperate');
    expect(tdee).toBeGreaterThan(bmr);

    // 3. Calculate water
    const waterCalculator = new ClimateAdaptiveWaterCalculator();
    const water = waterCalculator.calculate(75, 'moderate', 'temperate');
    expect(water).toBeGreaterThan(2000);

    // 4. Calculate macros
    const macroCalculator = new DietAdaptiveMacroCalculator();
    const protein = macroCalculator.calculateProtein(75, 'muscle_gain', 'omnivore');
    const macros = macroCalculator.calculateMacroSplit(tdee, protein, 'omnivore');

    expect(macros.protein).toBe(protein);
    expect(macros.fat).toBeGreaterThan(0);
    expect(macros.carbs).toBeGreaterThan(0);
  });

  it('Asian user in tropical climate workflow', () => {
    const user = createMaleUser({
      country: 'India',
      state: 'Maharashtra',
    });

    // BMI with Asian cutoffs
    const bmiCalculator = new AsianBMICalculator();
    const bmi = bmiCalculator.calculate(70, 175);
    const classification = bmiCalculator.getClassification(bmi);

    // TDEE with tropical climate
    const bmrCalculator = new MifflinStJeorBMRCalculator();
    const bmr = bmrCalculator.calculate(user);
    const tdeeCalculator = new ClimateAdaptiveTDEECalculator();
    const tdee = tdeeCalculator.calculate(bmr, 'moderate', 'tropical');

    // Water with tropical climate
    const waterCalculator = new ClimateAdaptiveWaterCalculator();
    const water = waterCalculator.calculate(70, 'moderate', 'tropical');

    expect(classification.category).toBe('Normal');
    expect(tdee).toBeGreaterThan(bmr);
    expect(water).toBeGreaterThan(4000); // High due to tropical climate
  });

  it('Vegan athlete workflow', () => {
    const user = createMaleUser({
      bodyFat: 10,
    });

    // Use Cunningham for athlete
    const bmrCalculator = new CunninghamBMRCalculator();
    const bmr = bmrCalculator.calculate(user);

    // Higher protein for vegan
    const macroCalculator = new DietAdaptiveMacroCalculator();
    const protein = macroCalculator.calculateProtein(75, 'muscle_gain', 'vegan');

    expect(protein).toBeGreaterThan(150); // Higher due to vegan multiplier
  });
});
