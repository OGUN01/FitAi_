/**
 * PHASE 5: DIET TYPE VALIDATION TEST SUITE
 * Comprehensive testing for all diet types and protein adjustments
 *
 * Tests:
 * - Omnivore (baseline)
 * - Vegetarian (+15% protein)
 * - Vegan (+25% protein)
 * - Pescatarian (+10% protein)
 * - Keto (70% fat, 25% protein, 5% carbs)
 * - Low-Carb (40% carbs)
 *
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import { HealthCalculatorFacade } from '../HealthCalculatorFacade';
import type { UserProfile, DietType } from '../types';

describe('Diet Type Protein Adjustments', () => {
  const baseUser: Partial<UserProfile> = {
    age: 30,
    gender: 'male',
    weight: 70,
    height: 175,
    country: 'US',
    activityLevel: 'moderate',
    goal: 'muscle_gain',
    fitnessLevel: 'intermediate',
  };

  describe('Omnivore Diet (Baseline)', () => {
    it('should calculate baseline protein with no adjustment', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'omnivore',
      } as UserProfile);

      // Base: 70kg × 2.0 = 140g for muscle gain
      expect(metrics.protein).toBeCloseTo(140, 10);
      expect(metrics.macroSplit.protein_g).toBeCloseTo(140, 10);
    });

    it('should handle omnivore maintenance goal', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'omnivore',
        goal: 'maintenance',
      } as UserProfile);

      // Maintenance: 70kg × 1.6 = 112g
      expect(metrics.protein).toBeCloseTo(112, 10);
    });

    it('should handle omnivore fat loss goal', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'omnivore',
        goal: 'fat_loss',
      } as UserProfile);

      // Fat loss: 70kg × 2.2 = 154g (preserve muscle)
      expect(metrics.protein).toBeCloseTo(154, 10);
    });
  });

  describe('Vegetarian Diet (+15% Protein)', () => {
    it('should apply +15% protein boost for vegetarian', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'vegetarian',
      } as UserProfile);

      // Base: 140g × 1.15 = 161g
      expect(metrics.protein).toBeGreaterThan(140 * 1.13); // ≥158g
      expect(metrics.protein).toBeLessThan(140 * 1.18); // ≤165g
    });

    it('should handle vegetarian female with muscle gain', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 28,
        gender: 'female',
        weight: 60,
        height: 165,
        country: 'IN',
        activityLevel: 'active',
        dietType: 'vegetarian',
        goal: 'muscle_gain',
        fitnessLevel: 'beginner',
      } as UserProfile);

      // Base: 60kg × 2.0 = 120g
      // Vegetarian: 120g × 1.15 = 138g
      expect(metrics.protein).toBeGreaterThan(130);
    });

    it('should handle vegetarian maintenance', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'vegetarian',
        goal: 'maintenance',
      } as UserProfile);

      // Base: 70kg × 1.6 = 112g
      // Vegetarian: 112g × 1.15 = 128.8g
      expect(metrics.protein).toBeGreaterThan(125);
    });

    it('should handle vegetarian fat loss', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'vegetarian',
        goal: 'fat_loss',
      } as UserProfile);

      // Base: 70kg × 2.2 = 154g
      // Vegetarian: 154g × 1.15 = 177g
      expect(metrics.protein).toBeGreaterThan(170);
    });
  });

  describe('Vegan Diet (+25% Protein)', () => {
    it('should apply +25% protein boost for vegan', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'vegan',
      } as UserProfile);

      // Base: 140g × 1.25 = 175g
      expect(metrics.protein).toBeGreaterThan(140 * 1.23); // ≥172g
      expect(metrics.protein).toBeLessThan(140 * 1.28); // ≤179g
    });

    it('should handle vegan athlete', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 25,
        gender: 'male',
        weight: 75,
        height: 180,
        country: 'US',
        activityLevel: 'very_active',
        dietType: 'vegan',
        goal: 'muscle_gain',
        fitnessLevel: 'advanced',
        trainingYears: 4,
      } as UserProfile);

      // Base: 75kg × 2.0 = 150g
      // Vegan: 150g × 1.25 = 187.5g
      expect(metrics.protein).toBeGreaterThan(180);
    });

    it('should handle vegan female fat loss', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 32,
        gender: 'female',
        weight: 65,
        height: 168,
        country: 'US',
        activityLevel: 'moderate',
        dietType: 'vegan',
        goal: 'fat_loss',
        fitnessLevel: 'intermediate',
      } as UserProfile);

      // Base: 65kg × 2.2 = 143g
      // Vegan: 143g × 1.25 = 178.75g
      expect(metrics.protein).toBeGreaterThan(170);
    });

    it('should handle vegan maintenance', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'vegan',
        goal: 'maintenance',
      } as UserProfile);

      // Base: 70kg × 1.6 = 112g
      // Vegan: 112g × 1.25 = 140g
      expect(metrics.protein).toBeGreaterThan(135);
    });
  });

  describe('Pescatarian Diet (+10% Protein)', () => {
    it('should apply +10% protein boost for pescatarian', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'pescatarian',
      } as UserProfile);

      // Base: 140g × 1.10 = 154g
      expect(metrics.protein).toBeGreaterThan(140 * 1.08); // ≥151g
      expect(metrics.protein).toBeLessThan(140 * 1.13); // ≤158g
    });

    it('should handle pescatarian female', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 29,
        gender: 'female',
        weight: 58,
        height: 163,
        country: 'US',
        activityLevel: 'moderate',
        dietType: 'pescatarian',
        goal: 'muscle_gain',
        fitnessLevel: 'beginner',
      } as UserProfile);

      // Base: 58kg × 2.0 = 116g
      // Pescatarian: 116g × 1.10 = 127.6g
      expect(metrics.protein).toBeGreaterThan(125);
    });

    it('should handle pescatarian maintenance', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'pescatarian',
        goal: 'maintenance',
      } as UserProfile);

      // Base: 70kg × 1.6 = 112g
      // Pescatarian: 112g × 1.10 = 123.2g
      expect(metrics.protein).toBeGreaterThan(120);
    });
  });

  describe('Keto Diet (70% Fat, 25% Protein, 5% Carbs)', () => {
    it('should follow keto macro split (70/25/5)', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'keto',
      } as UserProfile);

      const totalCal =
        metrics.protein * 4 + metrics.carbs * 4 + metrics.fat * 9;
      const fatPercent = (metrics.fat * 9) / totalCal;
      const proteinPercent = (metrics.protein * 4) / totalCal;
      const carbPercent = (metrics.carbs * 4) / totalCal;

      // Allow 5% variance
      expect(fatPercent).toBeGreaterThan(0.65); // ≥65%
      expect(fatPercent).toBeLessThan(0.75); // ≤75%

      expect(proteinPercent).toBeGreaterThan(0.20); // ≥20%
      expect(proteinPercent).toBeLessThan(0.30); // ≤30%

      expect(carbPercent).toBeLessThan(0.10); // ≤10%
    });

    it('should handle keto fat loss', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'keto',
        goal: 'fat_loss',
      } as UserProfile);

      // Keto for fat loss: very low carbs
      expect(metrics.carbs).toBeLessThan(50); // <50g carbs
    });

    it('should handle keto female', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 35,
        gender: 'female',
        weight: 70,
        height: 168,
        country: 'US',
        activityLevel: 'moderate',
        dietType: 'keto',
        goal: 'fat_loss',
        fitnessLevel: 'intermediate',
      } as UserProfile);

      const totalCal =
        metrics.protein * 4 + metrics.carbs * 4 + metrics.fat * 9;
      const fatPercent = (metrics.fat * 9) / totalCal;

      expect(fatPercent).toBeGreaterThan(0.65); // High fat
    });

    it('should handle keto with high activity', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'keto',
        activityLevel: 'very_active',
      } as UserProfile);

      // Even with high activity, keto stays low carb
      const totalCal =
        metrics.protein * 4 + metrics.carbs * 4 + metrics.fat * 9;
      const carbPercent = (metrics.carbs * 4) / totalCal;

      expect(carbPercent).toBeLessThan(0.10);
    });
  });

  describe('Low-Carb Diet (40% Carbs)', () => {
    it('should follow low-carb macro split', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'low_carb',
      } as UserProfile);

      const totalCal =
        metrics.protein * 4 + metrics.carbs * 4 + metrics.fat * 9;
      const carbPercent = (metrics.carbs * 4) / totalCal;

      // Low-carb: ~30-40% carbs (less than standard 50%)
      expect(carbPercent).toBeLessThan(0.45); // ≤45%
      expect(carbPercent).toBeGreaterThan(0.25); // ≥25%
    });

    it('should handle low-carb fat loss', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'low_carb',
        goal: 'fat_loss',
      } as UserProfile);

      const totalCal =
        metrics.protein * 4 + metrics.carbs * 4 + metrics.fat * 9;
      const proteinPercent = (metrics.protein * 4) / totalCal;

      // Higher protein for muscle preservation
      expect(proteinPercent).toBeGreaterThan(0.25); // ≥25%
    });

    it('should handle low-carb female', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 31,
        gender: 'female',
        weight: 62,
        height: 165,
        country: 'US',
        activityLevel: 'active',
        dietType: 'low_carb',
        goal: 'fat_loss',
        fitnessLevel: 'intermediate',
      } as UserProfile);

      const totalCal =
        metrics.protein * 4 + metrics.carbs * 4 + metrics.fat * 9;
      const carbPercent = (metrics.carbs * 4) / totalCal;

      expect(carbPercent).toBeLessThan(0.45);
    });
  });

  describe('Diet Type Comparison Tests', () => {
    it('should have protein increase: omnivore < pescatarian < vegetarian < vegan', () => {
      const omnivore = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'omnivore',
      } as UserProfile);

      const pescatarian = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'pescatarian',
      } as UserProfile);

      const vegetarian = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'vegetarian',
      } as UserProfile);

      const vegan = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'vegan',
      } as UserProfile);

      expect(omnivore.protein).toBeLessThan(pescatarian.protein);
      expect(pescatarian.protein).toBeLessThan(vegetarian.protein);
      expect(vegetarian.protein).toBeLessThan(vegan.protein);
    });

    it('should have same TDEE regardless of diet type', () => {
      const omnivore = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'omnivore',
      } as UserProfile);

      const vegan = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'vegan',
      } as UserProfile);

      // TDEE should be same (diet only affects macros)
      expect(omnivore.tdee).toBeCloseTo(vegan.tdee, 1);
    });

    it('should have same BMI regardless of diet type', () => {
      const keto = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'keto',
      } as UserProfile);

      const lowCarb = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'low_carb',
      } as UserProfile);

      expect(keto.bmi).toBeCloseTo(lowCarb.bmi, 0.1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle vegan + tropical climate (high protein + high water)', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 27,
        gender: 'female',
        weight: 55,
        height: 160,
        country: 'TH', // Thailand = tropical
        activityLevel: 'moderate',
        dietType: 'vegan',
        goal: 'muscle_gain',
        fitnessLevel: 'beginner',
      } as UserProfile);

      // Vegan protein boost
      expect(metrics.protein).toBeGreaterThan(130);
      // Tropical water boost
      expect(metrics.waterIntakeML).toBeGreaterThan(3000);
    });

    it('should handle keto + arid climate (high fat + high water)', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 32,
        gender: 'male',
        weight: 85,
        height: 180,
        country: 'AE', // UAE = arid
        activityLevel: 'active',
        dietType: 'keto',
        goal: 'fat_loss',
        fitnessLevel: 'intermediate',
      } as UserProfile);

      const totalCal =
        metrics.protein * 4 + metrics.carbs * 4 + metrics.fat * 9;
      const fatPercent = (metrics.fat * 9) / totalCal;

      expect(fatPercent).toBeGreaterThan(0.65); // Keto
      expect(metrics.waterIntakeML).toBeGreaterThan(5000); // Arid
    });

    it('should handle vegetarian + cold climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 35,
        gender: 'female',
        weight: 62,
        height: 168,
        country: 'NO', // Norway = cold
        activityLevel: 'light',
        dietType: 'vegetarian',
        goal: 'maintenance',
        fitnessLevel: 'beginner',
      } as UserProfile);

      // Vegetarian protein boost
      const baseProtein = 62 * 1.6; // 99.2g
      expect(metrics.protein).toBeGreaterThan(baseProtein * 1.13);

      // Cold climate: higher TDEE
      expect(metrics.tdee).toBeGreaterThan(metrics.bmr * 1.5);
    });
  });

  describe('Multiple Goal Scenarios', () => {
    it('omnivore muscle gain vs fat loss protein', () => {
      const muscleGain = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'omnivore',
        goal: 'muscle_gain',
      } as UserProfile);

      const fatLoss = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'omnivore',
        goal: 'fat_loss',
      } as UserProfile);

      // Fat loss should have higher protein (preserve muscle)
      expect(fatLoss.protein).toBeGreaterThan(muscleGain.protein);
    });

    it('vegan muscle gain should have very high protein', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'vegan',
        goal: 'muscle_gain',
      } as UserProfile);

      // Base: 70kg × 2.0 = 140g
      // Vegan: 140g × 1.25 = 175g
      expect(metrics.protein).toBeGreaterThan(170);
    });

    it('keto maintenance should still be high fat', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        dietType: 'keto',
        goal: 'maintenance',
      } as UserProfile);

      const totalCal =
        metrics.protein * 4 + metrics.carbs * 4 + metrics.fat * 9;
      const fatPercent = (metrics.fat * 9) / totalCal;

      expect(fatPercent).toBeGreaterThan(0.65);
    });
  });
});
