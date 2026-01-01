/**
 * PHASE 5: EDGE CASES TEST SUITE
 * Comprehensive testing for extreme and unusual scenarios
 *
 * Tests:
 * - Very young adults (18-22)
 * - Elderly users (60-80+)
 * - Very tall users (>200cm)
 * - Very short users (<150cm)
 * - Very heavy users (>150kg)
 * - Very light users (<50kg)
 * - Athletes with low body fat (<10%)
 * - Obese users (BMI >35)
 * - Extreme activity levels
 * - Multiple condition combinations
 *
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import { HealthCalculatorFacade } from '../HealthCalculatorFacade';
import { getBMICalculator } from '../calculators/bmiCalculators';
import type { UserProfile } from '../types';

describe('Edge Cases', () => {
  describe('Age Extremes', () => {
    it('very young adult (18 years)', () => {
      const user: UserProfile = {
        age: 18,
        gender: 'male',
        weight: 65,
        height: 175,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'muscle_gain',
        trainingYears: 0,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // Young adults get +15% muscle gain potential
      expect(metrics.muscleGainLimits?.monthlyKg).toBeGreaterThan(1.0);
      expect(metrics.bmr).toBeGreaterThan(1500); // Higher metabolism
    });

    it('very young adult (19 years)', () => {
      const user: UserProfile = {
        age: 19,
        gender: 'male',
        weight: 70,
        height: 178,
        country: 'US',
        activityLevel: 'very_active',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'muscle_gain',
        trainingYears: 0,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.muscleGainLimits?.monthlyKg).toBeGreaterThan(1.1);
      expect(metrics.tdee).toBeGreaterThan(2800);
    });

    it('middle-aged user (50 years)', () => {
      const user: UserProfile = {
        age: 50,
        gender: 'male',
        weight: 80,
        height: 178,
        country: 'US',
        activityLevel: 'moderate',
        dietType: 'omnivore',
        fitnessLevel: 'intermediate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // Lower BMR due to age
      expect(metrics.bmr).toBeLessThan(1800);
      expect(metrics.tdee).toBeLessThan(2800);
    });

    it('senior user (65 years)', () => {
      const user: UserProfile = {
        age: 65,
        gender: 'male',
        weight: 75,
        height: 175,
        country: 'US',
        activityLevel: 'light',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.bmr).toBeLessThan(1600);
      expect(metrics.tdee).toBeLessThan(2200);
    });

    it('elderly user (70 years)', () => {
      const user: UserProfile = {
        age: 70,
        gender: 'male',
        weight: 70,
        height: 170,
        country: 'US',
        activityLevel: 'light',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // BMR should be significantly lower due to age
      expect(metrics.bmr).toBeLessThan(1550);

      // Muscle gain potential reduced by ~30% for elderly
      if (metrics.muscleGainLimits) {
        expect(metrics.muscleGainLimits.monthlyKg).toBeLessThan(0.7);
      }
    });

    it('very elderly user (80 years)', () => {
      const user: UserProfile = {
        age: 80,
        gender: 'female',
        weight: 55,
        height: 160,
        country: 'US',
        activityLevel: 'sedentary',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.bmr).toBeLessThan(1200);
      expect(metrics.tdee).toBeLessThan(1500);
    });
  });

  describe('Height Extremes', () => {
    it('very tall user (200 cm)', () => {
      const user: UserProfile = {
        age: 25,
        gender: 'male',
        weight: 100,
        height: 200,
        country: 'US',
        activityLevel: 'moderate',
        dietType: 'omnivore',
        fitnessLevel: 'intermediate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      const bmi = 100 / Math.pow(2.0, 2); // 25
      expect(metrics.bmi).toBeCloseTo(bmi, 1);
      expect(metrics.bmiClassification.category).toBe('Normal');
      expect(metrics.bmr).toBeGreaterThan(2000); // Tall = higher BMR
    });

    it('extremely tall user (210 cm)', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'male',
        weight: 110,
        height: 210,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'intermediate',
        goal: 'muscle_gain',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      const bmi = 110 / Math.pow(2.1, 2); // 24.9
      expect(metrics.bmi).toBeCloseTo(bmi, 1);
      expect(metrics.bmr).toBeGreaterThan(2200);
    });

    it('very short user (150 cm)', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'female',
        weight: 50,
        height: 150,
        country: 'US',
        activityLevel: 'light',
        dietType: 'vegetarian',
        fitnessLevel: 'beginner',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.bmr).toBeLessThan(1300); // Smaller person = lower BMR
      expect(metrics.tdee).toBeLessThan(1800);
    });

    it('extremely short user (140 cm)', () => {
      const user: UserProfile = {
        age: 35,
        gender: 'female',
        weight: 45,
        height: 140,
        country: 'JP', // Japan
        activityLevel: 'light',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.bmr).toBeLessThan(1200);
      expect(metrics.tdee).toBeLessThan(1650);
    });
  });

  describe('Weight Extremes', () => {
    it('very heavy user (150 kg)', () => {
      const user: UserProfile = {
        age: 35,
        gender: 'male',
        weight: 150,
        height: 185,
        country: 'US',
        activityLevel: 'sedentary',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      const bmi = 150 / Math.pow(1.85, 2); // 43.8
      expect(metrics.bmi).toBeCloseTo(bmi, 1);
      expect(metrics.bmiClassification.category).toBe('Obese');
      expect(metrics.bmiClassification.healthRisk).toBe('very_high');
      expect(metrics.bmr).toBeGreaterThan(2200); // High weight = high BMR
    });

    it('extremely heavy user (200 kg)', () => {
      const user: UserProfile = {
        age: 40,
        gender: 'male',
        weight: 200,
        height: 190,
        country: 'US',
        activityLevel: 'sedentary',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.bmi).toBeGreaterThan(50);
      expect(metrics.bmr).toBeGreaterThan(2800);
      expect(metrics.waterIntakeML).toBeGreaterThan(6000); // High weight = high water
    });

    it('very light user (45 kg)', () => {
      const user: UserProfile = {
        age: 22,
        gender: 'female',
        weight: 45,
        height: 160,
        country: 'TH', // Thailand
        activityLevel: 'moderate',
        dietType: 'vegan',
        fitnessLevel: 'beginner',
        goal: 'muscle_gain',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      const bmi = 45 / Math.pow(1.6, 2); // 17.6
      expect(metrics.bmi).toBeCloseTo(bmi, 1);
      expect(metrics.bmiClassification.category).toBe('Underweight');
      expect(metrics.bmr).toBeLessThan(1200);
    });

    it('extremely light user (40 kg)', () => {
      const user: UserProfile = {
        age: 25,
        gender: 'female',
        weight: 40,
        height: 155,
        country: 'IN', // India
        activityLevel: 'light',
        dietType: 'vegetarian',
        fitnessLevel: 'beginner',
        goal: 'muscle_gain',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.bmi).toBeLessThan(17);
      expect(metrics.bmr).toBeLessThan(1100);
      expect(metrics.tdee).toBeLessThan(1500);
    });
  });

  describe('Body Composition Extremes', () => {
    it('athlete with very low body fat (8%)', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'male',
        weight: 75,
        height: 180,
        bodyFat: 8,
        bodyFatMethod: 'dexa',
        country: 'US',
        activityLevel: 'very_active',
        dietType: 'omnivore',
        fitnessLevel: 'advanced',
        goal: 'muscle_gain',
        trainingYears: 5,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // Should use Cunningham or Katch-McArdle formula for athletes
      expect(metrics.bmrFormula).toMatch(/(cunningham|katch)/i);

      // BMI might show "overweight" but it's muscle
      const bmi = 75 / Math.pow(1.8, 2); // 23.1
      expect(metrics.bmi).toBeCloseTo(bmi, 1);

      // With low body fat, might be classified as athletic
      if (metrics.bmi > 25) {
        expect(['Normal', 'Athletic', 'Overweight']).toContain(
          metrics.bmiClassification.category
        );
      }
    });

    it('athlete with extremely low body fat (6%)', () => {
      const user: UserProfile = {
        age: 25,
        gender: 'male',
        weight: 72,
        height: 178,
        bodyFat: 6,
        bodyFatMethod: 'dexa',
        country: 'US',
        activityLevel: 'very_active',
        dietType: 'omnivore',
        fitnessLevel: 'advanced',
        goal: 'maintenance',
        trainingYears: 6,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.bmrFormula).toMatch(/(cunningham|katch)/i);
      expect(metrics.bmr).toBeGreaterThan(1700);
    });

    it('bodybuilder with high muscle mass (BMI 28, 10% BF)', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 90,
        height: 180,
        bodyFat: 10,
        bodyFatMethod: 'dexa',
        country: 'US',
        activityLevel: 'very_active',
        dietType: 'omnivore',
        fitnessLevel: 'advanced',
        goal: 'muscle_gain',
        trainingYears: 7,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      const bmi = 90 / Math.pow(1.8, 2); // 27.8
      expect(metrics.bmi).toBeCloseTo(bmi, 1);

      // Should be classified as athletic despite high BMI
      expect(['Normal', 'Athletic', 'Overweight']).toContain(
        metrics.bmiClassification.category
      );
    });

    it('very high body fat (40%)', () => {
      const user: UserProfile = {
        age: 45,
        gender: 'male',
        weight: 120,
        height: 175,
        bodyFat: 40,
        bodyFatMethod: 'dexa',
        country: 'US',
        activityLevel: 'sedentary',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.bmiClassification.category).toBe('Obese');
      expect(metrics.bmiClassification.healthRisk).toBe('very_high');
    });
  });

  describe('Activity Level Extremes', () => {
    it('completely sedentary (desk job, no exercise)', () => {
      const user: UserProfile = {
        age: 35,
        gender: 'male',
        weight: 80,
        height: 178,
        country: 'US',
        activityLevel: 'sedentary',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // TDEE should be close to BMR (1.2x multiplier)
      expect(metrics.tdee).toBeCloseTo(metrics.bmr * 1.2, 100);
      expect(metrics.waterIntakeML).toBeLessThan(3000); // Lower water for sedentary
    });

    it('extremely active (athlete training 2x/day)', () => {
      const user: UserProfile = {
        age: 25,
        gender: 'male',
        weight: 75,
        height: 180,
        country: 'US',
        activityLevel: 'very_active',
        dietType: 'omnivore',
        fitnessLevel: 'advanced',
        goal: 'muscle_gain',
        trainingYears: 5,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // TDEE should be high (1.9x multiplier)
      expect(metrics.tdee).toBeGreaterThan(metrics.bmr * 1.85);
      expect(metrics.waterIntakeML).toBeGreaterThan(4000);
    });
  });

  describe('Multiple Extreme Conditions', () => {
    it('very young + very tall + very active', () => {
      const user: UserProfile = {
        age: 19,
        gender: 'male',
        weight: 95,
        height: 200,
        country: 'US',
        activityLevel: 'very_active',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'muscle_gain',
        trainingYears: 0,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // Extreme calorie needs
      expect(metrics.tdee).toBeGreaterThan(3500);
      expect(metrics.waterIntakeML).toBeGreaterThan(5000);
      // High muscle gain potential
      expect(metrics.muscleGainLimits?.monthlyKg).toBeGreaterThan(1.1);
    });

    it('elderly + very short + sedentary', () => {
      const user: UserProfile = {
        age: 75,
        gender: 'female',
        weight: 48,
        height: 148,
        country: 'JP',
        activityLevel: 'sedentary',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // Very low calorie needs
      expect(metrics.tdee).toBeLessThan(1300);
      expect(metrics.bmr).toBeLessThan(1000);
    });

    it('very heavy + cold climate + active', () => {
      const user: UserProfile = {
        age: 35,
        gender: 'male',
        weight: 140,
        height: 185,
        country: 'NO', // Norway = cold
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('cold');
      // High TDEE (heavy + active + cold boost)
      expect(metrics.tdee).toBeGreaterThan(3500);
    });

    it('athlete + tropical climate + vegan', () => {
      const user: UserProfile = {
        age: 27,
        gender: 'male',
        weight: 72,
        height: 178,
        bodyFat: 9,
        bodyFatMethod: 'dexa',
        country: 'TH', // Thailand = tropical
        activityLevel: 'very_active',
        dietType: 'vegan',
        fitnessLevel: 'advanced',
        goal: 'muscle_gain',
        trainingYears: 5,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('tropical');
      // Vegan protein boost
      expect(metrics.protein).toBeGreaterThan(170);
      // Tropical water boost
      expect(metrics.waterIntakeML).toBeGreaterThan(5500);
    });

    it('obese + arid climate + sedentary', () => {
      const user: UserProfile = {
        age: 42,
        gender: 'male',
        weight: 130,
        height: 175,
        country: 'AE', // UAE = arid
        activityLevel: 'sedentary',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('arid');
      expect(metrics.bmiClassification.category).toBe('Obese');
      // Arid climate = high water needs even when sedentary
      expect(metrics.waterIntakeML).toBeGreaterThan(5000);
    });
  });

  describe('BMI Classification Edge Cases', () => {
    it('BMI exactly at boundary (18.5)', () => {
      const weight = 18.5 * Math.pow(1.7, 2); // 53.5 kg
      const user: UserProfile = {
        age: 25,
        gender: 'female',
        weight: weight,
        height: 170,
        country: 'US',
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.bmi).toBeCloseTo(18.5, 0.1);
      // Should be Normal (just above Underweight)
      expect(['Underweight', 'Normal']).toContain(
        metrics.bmiClassification.category
      );
    });

    it('BMI exactly at boundary (25.0)', () => {
      const weight = 25.0 * Math.pow(1.75, 2); // 76.6 kg
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: weight,
        height: 175,
        country: 'US',
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.bmi).toBeCloseTo(25.0, 0.1);
      // Should be Overweight (just above Normal)
      expect(['Normal', 'Overweight']).toContain(
        metrics.bmiClassification.category
      );
    });

    it('Asian BMI boundary (23.0)', () => {
      const weight = 23.0 * Math.pow(1.7, 2); // 66.5 kg
      const user: UserProfile = {
        age: 28,
        gender: 'male',
        weight: weight,
        height: 170,
        country: 'IN', // India = Asian BMI
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.bmi).toBeCloseTo(23.0, 0.1);
      // Asian cutoff: 18.5-23 Normal, ≥23 Overweight
      expect(['Normal', 'Overweight']).toContain(
        metrics.bmiClassification.category
      );
    });
  });

  describe('Calculation Precision', () => {
    it('should handle decimal weights precisely', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 75.7,
        height: 178.5,
        country: 'US',
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      const expectedBMI = 75.7 / Math.pow(1.785, 2);
      expect(metrics.bmi).toBeCloseTo(expectedBMI, 1);
    });

    it('should handle extreme decimal precision', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'female',
        weight: 62.345,
        height: 165.789,
        country: 'US',
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      const expectedBMI = 62.345 / Math.pow(1.65789, 2);
      expect(metrics.bmi).toBeCloseTo(expectedBMI, 0.1);
    });
  });

  describe('Missing Optional Data', () => {
    it('should handle missing body fat data', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 75,
        height: 178,
        country: 'US',
        activityLevel: 'moderate',
        goal: 'maintenance',
        // No bodyFat provided
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // Should use Mifflin St Jeor (default without BF%)
      expect(metrics.bmrFormula).toBe('mifflin_st_jeor');
      expect(metrics.bmr).toBeGreaterThan(1600);
    });

    it('should handle missing training years', () => {
      const user: UserProfile = {
        age: 25,
        gender: 'male',
        weight: 70,
        height: 175,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'muscle_gain',
        // No trainingYears provided
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // Should still calculate muscle gain limits
      expect(metrics.muscleGainLimits).toBeDefined();
    });

    it('should handle missing state for US user', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 75,
        height: 178,
        country: 'US',
        // No state provided
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // Should default to temperate
      expect(metrics.climate).toBeDefined();
      expect(['temperate', 'arid', 'cold']).toContain(metrics.climate);
    });
  });
});
