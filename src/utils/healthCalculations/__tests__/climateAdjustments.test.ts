/**
 * PHASE 5: CLIMATE ADJUSTMENT TEST SUITE
 * Comprehensive testing for all climate zones
 *
 * Tests:
 * - Tropical (+5% TDEE, +50% water)
 * - Temperate (baseline, no adjustments)
 * - Cold (+15% TDEE, -10% water)
 * - Arid (+5% TDEE, +70% water)
 *
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import { HealthCalculatorFacade } from '../HealthCalculatorFacade';
import type { UserProfile } from '../types';

describe('Climate Adjustments', () => {
  const baseUser: Partial<UserProfile> = {
    age: 30,
    gender: 'male',
    weight: 70,
    height: 175,
    activityLevel: 'moderate',
    dietType: 'omnivore',
    goal: 'maintenance',
    fitnessLevel: 'intermediate',
  };

  describe('Tropical Climate (+5% TDEE, +50% Water)', () => {
    it('should apply +5% TDEE and +50% water for tropical climate', () => {
      const tropical = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'IN', // India = tropical
      } as UserProfile);

      const temperate = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'UK', // UK = temperate
      } as UserProfile);

      // TDEE difference: ~5%
      expect(tropical.tdee).toBeGreaterThan(temperate.tdee);
      const tdeeDiff =
        ((tropical.tdee - temperate.tdee) / temperate.tdee) * 100;
      expect(tdeeDiff).toBeGreaterThan(3); // ≥3%
      expect(tdeeDiff).toBeLessThan(7); // ≤7%

      // Water difference: ~50%
      expect(tropical.waterIntakeML).toBeGreaterThan(temperate.waterIntakeML);
      const waterDiff =
        ((tropical.waterIntakeML - temperate.waterIntakeML) /
          temperate.waterIntakeML) *
        100;
      expect(waterDiff).toBeGreaterThan(40); // ≥40%
    });

    it('should handle Thailand tropical climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'TH', // Thailand
      } as UserProfile);

      expect(metrics.climate).toBe('tropical');
      expect(metrics.waterIntakeML).toBeGreaterThan(3500);
    });

    it('should handle Brazil tropical climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'BR', // Brazil
      } as UserProfile);

      expect(metrics.climate).toBe('tropical');
      expect(metrics.tdee).toBeGreaterThan(metrics.bmr * 1.6);
    });

    it('should handle Singapore high humidity', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'SG', // Singapore
        activityLevel: 'active',
      } as UserProfile);

      expect(metrics.climate).toBe('tropical');
      // High activity + tropical = very high water needs
      expect(metrics.waterIntakeML).toBeGreaterThan(4500);
    });

    it('should handle Malaysia tropical heat', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'MY', // Malaysia
        activityLevel: 'very_active',
      } as UserProfile);

      expect(metrics.climate).toBe('tropical');
      expect(metrics.waterIntakeML).toBeGreaterThan(5000);
    });
  });

  describe('Temperate Climate (Baseline)', () => {
    it('should have no climate adjustments for temperate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'UK', // United Kingdom
      } as UserProfile);

      expect(metrics.climate).toBe('temperate');

      // TDEE should be baseline (BMR × activity)
      const expectedTDEE = metrics.bmr * 1.55; // moderate activity
      expect(metrics.tdee).toBeCloseTo(expectedTDEE, 50);

      // Water should be baseline (weight × 33ml × activity)
      expect(metrics.waterIntakeML).toBeGreaterThan(2000);
      expect(metrics.waterIntakeML).toBeLessThan(3500);
    });

    it('should handle US temperate states', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'US',
        state: 'NY', // New York
      } as UserProfile);

      expect(metrics.climate).toBe('temperate');
    });

    it('should handle France temperate climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'FR', // France
      } as UserProfile);

      expect(metrics.climate).toBe('temperate');
    });

    it('should handle Germany temperate climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'DE', // Germany
      } as UserProfile);

      expect(metrics.climate).toBe('temperate');
    });

    it('should handle Japan temperate climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'JP', // Japan
      } as UserProfile);

      expect(metrics.climate).toBe('temperate');
    });
  });

  describe('Cold Climate (+15% TDEE, -10% Water)', () => {
    it('should apply +15% TDEE and -10% water for cold climate', () => {
      const cold = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'NO', // Norway = cold
      } as UserProfile);

      const temperate = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'UK', // UK = temperate
      } as UserProfile);

      // TDEE difference: ~15%
      expect(cold.tdee).toBeGreaterThan(temperate.tdee);
      const tdeeDiff = ((cold.tdee - temperate.tdee) / temperate.tdee) * 100;
      expect(tdeeDiff).toBeGreaterThan(10); // ≥10%
      expect(tdeeDiff).toBeLessThan(20); // ≤20%

      // Water difference: ~-10%
      expect(cold.waterIntakeML).toBeLessThan(temperate.waterIntakeML);
    });

    it('should handle Norway extreme cold', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'NO', // Norway
      } as UserProfile);

      expect(metrics.climate).toBe('cold');
      expect(metrics.tdee).toBeGreaterThan(metrics.bmr * 1.7);
      expect(metrics.waterIntakeML).toBeLessThan(2500);
    });

    it('should handle Sweden cold climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'SE', // Sweden
      } as UserProfile);

      expect(metrics.climate).toBe('cold');
      expect(metrics.tdee).toBeGreaterThan(2500);
    });

    it('should handle Finland extreme cold', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'FI', // Finland
      } as UserProfile);

      expect(metrics.climate).toBe('cold');
      expect(metrics.tdee).toBeGreaterThan(2600);
    });

    it('should handle Alaska extreme cold', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'US',
        state: 'AK', // Alaska
      } as UserProfile);

      expect(metrics.climate).toBe('cold');
      expect(metrics.tdee).toBeGreaterThan(2700);
    });

    it('should handle Canada cold climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'CA', // Canada
      } as UserProfile);

      expect(metrics.climate).toBe('cold');
    });

    it('should handle Iceland extreme cold', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'IS', // Iceland
      } as UserProfile);

      expect(metrics.climate).toBe('cold');
      expect(metrics.tdee).toBeGreaterThan(2600);
    });
  });

  describe('Arid Climate (+5% TDEE, +70% Water)', () => {
    it('should apply +5% TDEE and +70% water for arid climate', () => {
      const arid = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'AE', // UAE = arid
      } as UserProfile);

      const temperate = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'UK', // UK = temperate
      } as UserProfile);

      // TDEE difference: ~5%
      expect(arid.tdee).toBeGreaterThan(temperate.tdee);
      const tdeeDiff = ((arid.tdee - temperate.tdee) / temperate.tdee) * 100;
      expect(tdeeDiff).toBeGreaterThan(3); // ≥3%

      // Water difference: ~70%
      expect(arid.waterIntakeML).toBeGreaterThan(temperate.waterIntakeML);
      const waterDiff =
        ((arid.waterIntakeML - temperate.waterIntakeML) /
          temperate.waterIntakeML) *
        100;
      expect(waterDiff).toBeGreaterThan(60); // ≥60%
    });

    it('should handle UAE extreme heat', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'AE', // UAE
      } as UserProfile);

      expect(metrics.climate).toBe('arid');
      expect(metrics.waterIntakeML).toBeGreaterThan(4500);
    });

    it('should handle Saudi Arabia desert heat', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'SA', // Saudi Arabia
      } as UserProfile);

      expect(metrics.climate).toBe('arid');
      expect(metrics.waterIntakeML).toBeGreaterThan(4500);
    });

    it('should handle Qatar extreme arid', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'QA', // Qatar
      } as UserProfile);

      expect(metrics.climate).toBe('arid');
      expect(metrics.waterIntakeML).toBeGreaterThan(5000);
    });

    it('should handle Kuwait desert climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'KW', // Kuwait
      } as UserProfile);

      expect(metrics.climate).toBe('arid');
    });

    it('should handle Oman desert heat', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'OM', // Oman
      } as UserProfile);

      expect(metrics.climate).toBe('arid');
      expect(metrics.waterIntakeML).toBeGreaterThan(4500);
    });

    it('should handle Arizona arid climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'US',
        state: 'AZ', // Arizona
      } as UserProfile);

      expect(['arid', 'temperate']).toContain(metrics.climate);
    });
  });

  describe('Climate × Activity Level Interactions', () => {
    it('tropical + very_active = extreme water needs', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'TH', // Thailand = tropical
        activityLevel: 'very_active',
      } as UserProfile);

      expect(metrics.climate).toBe('tropical');
      // Tropical boost + very active boost
      expect(metrics.waterIntakeML).toBeGreaterThan(5500);
    });

    it('cold + sedentary = minimal water needs', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'NO', // Norway = cold
        activityLevel: 'sedentary',
      } as UserProfile);

      expect(metrics.climate).toBe('cold');
      // Cold reduction + sedentary = low water
      expect(metrics.waterIntakeML).toBeLessThan(2200);
    });

    it('arid + active = very high water needs', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'AE', // UAE = arid
        activityLevel: 'active',
      } as UserProfile);

      expect(metrics.climate).toBe('arid');
      expect(metrics.waterIntakeML).toBeGreaterThan(5500);
    });

    it('temperate + moderate = baseline metrics', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'UK', // UK = temperate
        activityLevel: 'moderate',
      } as UserProfile);

      expect(metrics.climate).toBe('temperate');
      expect(metrics.waterIntakeML).toBeGreaterThan(2500);
      expect(metrics.waterIntakeML).toBeLessThan(3500);
    });
  });

  describe('Climate × Weight Interactions', () => {
    it('heavy person in tropical climate needs more water', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        weight: 100, // Heavy
        country: 'IN', // India = tropical
        activityLevel: 'moderate',
      } as UserProfile);

      expect(metrics.climate).toBe('tropical');
      // 100kg + tropical + moderate activity
      expect(metrics.waterIntakeML).toBeGreaterThan(5500);
    });

    it('light person in cold climate needs less water', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        weight: 55, // Light
        country: 'NO', // Norway = cold
        activityLevel: 'light',
      } as UserProfile);

      expect(metrics.climate).toBe('cold');
      expect(metrics.waterIntakeML).toBeLessThan(2000);
    });

    it('heavy person in arid climate needs extreme water', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        weight: 95,
        country: 'AE', // UAE = arid
        activityLevel: 'active',
      } as UserProfile);

      expect(metrics.climate).toBe('arid');
      // 95kg + arid + active
      expect(metrics.waterIntakeML).toBeGreaterThan(6500);
    });
  });

  describe('Climate × Gender Interactions', () => {
    it('female in tropical climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 30,
        gender: 'female',
        weight: 60,
        height: 165,
        country: 'TH', // Thailand = tropical
        activityLevel: 'moderate',
        goal: 'maintenance',
      } as UserProfile);

      expect(metrics.climate).toBe('tropical');
      // Female + 60kg + tropical + moderate
      expect(metrics.waterIntakeML).toBeGreaterThan(3500);
    });

    it('male in cold climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 35,
        gender: 'male',
        weight: 80,
        height: 180,
        country: 'SE', // Sweden = cold
        activityLevel: 'moderate',
        goal: 'maintenance',
      } as UserProfile);

      expect(metrics.climate).toBe('cold');
      // Male + 80kg + cold + moderate
      expect(metrics.tdee).toBeGreaterThan(2800);
      expect(metrics.waterIntakeML).toBeLessThan(3000);
    });

    it('female in arid climate', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 28,
        gender: 'female',
        weight: 65,
        height: 168,
        country: 'AE', // UAE = arid
        activityLevel: 'active',
        goal: 'fat_loss',
      } as UserProfile);

      expect(metrics.climate).toBe('arid');
      expect(metrics.waterIntakeML).toBeGreaterThan(4500);
    });
  });

  describe('Extreme Climate Scenarios', () => {
    it('should handle tropical + very active + heavy person', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 25,
        gender: 'male',
        weight: 110,
        height: 185,
        country: 'IN', // India = tropical
        activityLevel: 'very_active',
        goal: 'muscle_gain',
        fitnessLevel: 'advanced',
      } as UserProfile);

      expect(metrics.climate).toBe('tropical');
      // Extreme water needs
      expect(metrics.waterIntakeML).toBeGreaterThan(7000);
      // High TDEE
      expect(metrics.tdee).toBeGreaterThan(4000);
    });

    it('should handle cold + sedentary + light person', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 40,
        gender: 'female',
        weight: 50,
        height: 158,
        country: 'FI', // Finland = cold
        activityLevel: 'sedentary',
        goal: 'maintenance',
      } as UserProfile);

      expect(metrics.climate).toBe('cold');
      // Lower water needs
      expect(metrics.waterIntakeML).toBeLessThan(1800);
      // Lower TDEE (but cold boost)
      expect(metrics.tdee).toBeLessThan(2000);
    });

    it('should handle arid + very active + high intensity', () => {
      const metrics = HealthCalculatorFacade.calculateAllMetrics({
        age: 28,
        gender: 'male',
        weight: 85,
        height: 180,
        country: 'QA', // Qatar = arid
        activityLevel: 'very_active',
        goal: 'muscle_gain',
        fitnessLevel: 'advanced',
      } as UserProfile);

      expect(metrics.climate).toBe('arid');
      // Extreme water needs in desert + very active
      expect(metrics.waterIntakeML).toBeGreaterThan(6500);
    });
  });

  describe('Climate Consistency Across Regions', () => {
    it('all Nordic countries should be cold', () => {
      const norway = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'NO',
      } as UserProfile);

      const sweden = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'SE',
      } as UserProfile);

      const finland = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'FI',
      } as UserProfile);

      expect(norway.climate).toBe('cold');
      expect(sweden.climate).toBe('cold');
      expect(finland.climate).toBe('cold');
    });

    it('all Gulf states should be arid', () => {
      const uae = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'AE',
      } as UserProfile);

      const saudi = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'SA',
      } as UserProfile);

      const qatar = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'QA',
      } as UserProfile);

      expect(uae.climate).toBe('arid');
      expect(saudi.climate).toBe('arid');
      expect(qatar.climate).toBe('arid');
    });

    it('all Southeast Asian countries should be tropical', () => {
      const thailand = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'TH',
      } as UserProfile);

      const vietnam = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'VN',
      } as UserProfile);

      const malaysia = HealthCalculatorFacade.calculateAllMetrics({
        ...baseUser,
        country: 'MY',
      } as UserProfile);

      expect(thailand.climate).toBe('tropical');
      expect(vietnam.climate).toBe('tropical');
      expect(malaysia.climate).toBe('tropical');
    });
  });
});
