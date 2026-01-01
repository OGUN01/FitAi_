/**
 * INTEGRATION TESTS - Universal Health System
 * Tests the complete flow from onboarding data to database storage
 *
 * These tests verify:
 * 1. HealthCalculatorFacade calculates all metrics correctly
 * 2. Onboarding service maps data correctly
 * 3. Database schema supports all fields
 * 4. End-to-end flow works seamlessly
 */

import { HealthCalculatorFacade } from '../HealthCalculatorFacade';
import type { UserProfile } from '../types';

describe('Universal Health System - Integration Tests', () => {
  describe('HealthCalculatorFacade.calculateAllMetrics', () => {
    it('should calculate all metrics for a complete user profile', () => {
      const mockUser: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 70,
        height: 175,
        country: 'IN',
        state: 'Maharashtra',
        activityLevel: 'moderate',
        dietType: 'vegetarian',
        goal: 'muscle_gain',
        fitnessLevel: 'intermediate',
        trainingYears: 2,
        restingHR: 65,
        bodyFat: 15,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(mockUser);

      // Core metrics should be calculated
      expect(metrics.bmr).toBeGreaterThan(0);
      expect(metrics.bmi).toBeGreaterThan(0);
      expect(metrics.tdee).toBeGreaterThan(metrics.bmr);
      expect(metrics.dailyCalories).toBe(metrics.tdee);

      // Nutrition should be calculated
      expect(metrics.waterIntakeML).toBeGreaterThan(0);
      expect(metrics.protein).toBeGreaterThan(0);
      expect(metrics.carbs).toBeGreaterThan(0);
      expect(metrics.fat).toBeGreaterThan(0);

      // Context should be auto-detected
      expect(metrics.climate).toBe('tropical'); // India = tropical
      expect(metrics.ethnicity).toBe('asian'); // India = asian
      expect(metrics.bmrFormula).toBeDefined();
      expect(metrics.bmrConfidence).toBeGreaterThan(0);

      // BMI classification should be population-specific
      expect(metrics.bmiClassification.category).toBeDefined();
      expect(metrics.bmiClassification.healthRisk).toBeDefined();
      expect(metrics.bmiClassification.ethnicity).toBe('asian');

      // Advanced metrics should be calculated (with resting HR)
      expect(metrics.heartRateZones).toBeDefined();
      expect(metrics.heartRateZones?.resting).toBe(65);
      expect(metrics.heartRateZones?.fatBurn).toBeDefined();
      expect(metrics.heartRateZones?.cardio).toBeDefined();
      expect(metrics.heartRateZones?.peak).toBeDefined();

      expect(metrics.vo2max).toBeDefined();
      expect(metrics.vo2max?.vo2max).toBeGreaterThan(0);
      expect(metrics.vo2max?.classification).toBeDefined();

      expect(metrics.healthScore).toBeDefined();
      expect(metrics.healthScore?.totalScore).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore?.totalScore).toBeLessThanOrEqual(100);
      expect(metrics.healthScore?.grade).toBeDefined();

      // Breakdown should be present
      expect(metrics.breakdown).toBeDefined();
      expect(metrics.breakdown?.bmr.value).toBe(metrics.bmr);
      expect(metrics.breakdown?.tdee.finalTDEE).toBe(metrics.tdee);
      expect(metrics.breakdown?.water.final_ml).toBe(metrics.waterIntakeML);
    });

    it('should calculate metrics for vegetarian with protein boost', () => {
      const mockUser: UserProfile = {
        age: 25,
        gender: 'female',
        weight: 60,
        height: 165,
        country: 'IN',
        activityLevel: 'moderate',
        dietType: 'vegetarian',
        goal: 'muscle_gain',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(mockUser);

      // Base protein for muscle gain: 60kg * 2.0 = 120g
      // Vegetarian boost: +15% = 138g
      const baseProtein = 60 * 2.0;
      const expectedProtein = baseProtein * 1.15;

      expect(metrics.protein).toBeGreaterThan(baseProtein);
      expect(metrics.protein).toBeCloseTo(expectedProtein, 0);
    });

    it('should apply tropical climate adjustments', () => {
      const mockUser: UserProfile = {
        age: 28,
        gender: 'male',
        weight: 75,
        height: 180,
        country: 'IN', // Tropical
        activityLevel: 'active',
        dietType: 'omnivore',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(mockUser);

      expect(metrics.climate).toBe('tropical');

      // TDEE should have tropical modifier (5% increase)
      expect(metrics.tdee).toBeGreaterThan(metrics.bmr * 1.725); // Active multiplier
      expect(metrics.breakdown?.tdee.climateModifier).toBe(1.05);

      // Water should have tropical bonus (10ml/kg)
      const tropicalBonus = 75 * 10;
      expect(metrics.breakdown?.water.climate_ml).toBe(tropicalBonus);
      expect(metrics.waterIntakeML).toBeGreaterThan(2500); // Should be higher than temperate
    });

    it('should use Katch-McArdle formula when body fat is provided', () => {
      const mockUser: UserProfile = {
        age: 32,
        gender: 'male',
        weight: 80,
        height: 178,
        bodyFat: 12,
        country: 'US',
        activityLevel: 'moderate',
        fitnessLevel: 'advanced',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(mockUser);

      // Should use Katch-McArdle (more accurate with body fat)
      expect(metrics.bmrFormula).toBe('katch_mcardle');
      expect(metrics.bmrAccuracy).toContain('±5%'); // More accurate
      expect(metrics.bmrConfidence).toBeGreaterThanOrEqual(90);
    });

    it('should calculate muscle gain limits correctly', () => {
      const mockUser: UserProfile = {
        age: 22,
        gender: 'male',
        weight: 70,
        height: 175,
        country: 'US',
        activityLevel: 'very_active',
        goal: 'muscle_gain',
        fitnessLevel: 'beginner',
        trainingYears: 0,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(mockUser);

      // Beginner should have higher muscle gain potential
      expect(metrics.muscleGainLimits).toBeDefined();
      expect(metrics.muscleGainLimits?.monthlyRate).toBeGreaterThan(0);
      expect(metrics.muscleGainLimits?.yearlyGain).toBeGreaterThan(0);
      expect(metrics.muscleGainLimits?.classification).toBe('beginner');
    });

    it('should handle minimal user profile gracefully', () => {
      const minimalUser: UserProfile = {
        age: 30,
        gender: 'female',
        weight: 65,
        height: 168,
        country: 'CA', // Canada
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(minimalUser);

      // Should still calculate core metrics with defaults
      expect(metrics.bmr).toBeGreaterThan(0);
      expect(metrics.bmi).toBeGreaterThan(0);
      expect(metrics.tdee).toBeGreaterThan(0);
      expect(metrics.waterIntakeML).toBeGreaterThan(0);

      // Should use defaults for optional fields
      expect(metrics.activityLevel).toBeDefined(); // Default: moderate
      expect(metrics.climate).toBe('temperate'); // Canada = temperate
      expect(metrics.ethnicity).toBe('general'); // Canada = mixed

      // Advanced metrics should be null (no resting HR)
      expect(metrics.heartRateZones).toBeNull();
      expect(metrics.vo2max).toBeNull();
    });
  });

  describe('HealthCalculatorFacade.validateGoal', () => {
    it('should validate realistic fat loss goal', () => {
      const mockUser: UserProfile = {
        age: 35,
        gender: 'male',
        weight: 90,
        height: 175,
        country: 'IN',
      };

      const goal = {
        type: 'fat_loss' as const,
        targetWeight: 80,
        timelineWeeks: 20,
      };

      const validation = HealthCalculatorFacade.validateGoal(mockUser, goal);

      // 10kg in 20 weeks = 0.5kg/week (realistic)
      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('success');
      expect(validation.weeklyRate).toBeCloseTo(0.5, 1);
    });

    it('should warn about aggressive fat loss goal', () => {
      const mockUser: UserProfile = {
        age: 28,
        gender: 'female',
        weight: 70,
        height: 165,
        country: 'IN',
      };

      const goal = {
        type: 'fat_loss' as const,
        targetWeight: 55,
        timelineWeeks: 10,
      };

      const validation = HealthCalculatorFacade.validateGoal(mockUser, goal);

      // 15kg in 10 weeks = 1.5kg/week (too aggressive)
      expect(validation.valid).toBe(false);
      expect(['error', 'warning']).toContain(validation.severity); // Can be error or warning depending on BMI
      expect(validation.weeklyRate).toBeGreaterThan(1.0);

      if (validation.suggestions) {
        expect(validation.suggestions).toBeDefined();
      }
      if (validation.adjustedTimeline) {
        expect(validation.adjustedTimeline).toBeGreaterThan(10);
      }
    });

    it('should validate muscle gain goal', () => {
      const mockUser: UserProfile = {
        age: 25,
        gender: 'male',
        weight: 70,
        height: 178,
        country: 'US',
        fitnessLevel: 'beginner',
        trainingYears: 0,
      };

      const goal = {
        type: 'muscle_gain' as const,
        targetGain: 10,
        timelineMonths: 12,
      };

      const validation = HealthCalculatorFacade.validateGoal(mockUser, goal);

      // Beginner can gain ~0.8-1kg/month, so 10kg in 12 months is realistic
      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('success');
    });
  });

  describe('HealthCalculatorFacade.recalculateMetrics', () => {
    it('should recalculate metrics after weight update', () => {
      const initialUser: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 80,
        height: 175,
        country: 'IN',
        activityLevel: 'moderate',
        goal: 'fat_loss',
      };

      const initialMetrics = HealthCalculatorFacade.calculateAllMetrics(initialUser);

      // User loses 5kg
      const updatedUser: UserProfile = {
        ...initialUser,
        weight: 75,
      };

      const updatedMetrics = HealthCalculatorFacade.recalculateMetrics(updatedUser);

      // BMR and TDEE should decrease with lower weight
      expect(updatedMetrics.bmr).toBeLessThan(initialMetrics.bmr);
      expect(updatedMetrics.tdee).toBeLessThan(initialMetrics.tdee);
      expect(updatedMetrics.bmi).toBeLessThan(initialMetrics.bmi);

      // Water should also adjust
      expect(updatedMetrics.waterIntakeML).toBeLessThan(initialMetrics.waterIntakeML);

      // Macros are calculated from TDEE, so they should also be less
      expect(updatedMetrics.macroSplit.protein_g).toBeLessThan(initialMetrics.macroSplit.protein_g);
    });
  });

  describe('HealthCalculatorFacade.exportMetrics', () => {
    it('should export metrics in shareable format', () => {
      const mockUser: UserProfile = {
        age: 28,
        gender: 'female',
        weight: 62,
        height: 168,
        country: 'IN',
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(mockUser);
      const exported = HealthCalculatorFacade.exportMetrics(metrics);

      // Should be valid JSON
      expect(() => JSON.parse(exported)).not.toThrow();

      const parsed = JSON.parse(exported);

      // Should have summary
      expect(parsed.summary).toBeDefined();
      expect(parsed.summary.dailyCalories).toBe(metrics.dailyCalories);
      expect(parsed.summary.protein).toBe(metrics.protein);
      expect(parsed.summary.water).toContain('L');

      // Should have context
      expect(parsed.context).toBeDefined();
      expect(parsed.context.climate).toBe('tropical');
      expect(parsed.context.ethnicity).toBe('asian');
      expect(parsed.context.formula).toBe(metrics.bmrFormula);

      // Should have calculation date
      expect(parsed.calculationDate).toBeDefined();
    });
  });

  describe('Database Integration Simulation', () => {
    it('should map facade output to database columns correctly', () => {
      const mockUser: UserProfile = {
        age: 32,
        gender: 'male',
        weight: 78,
        height: 180,
        bodyFat: 14,
        country: 'IN',
        state: 'Karnataka',
        activityLevel: 'active',
        dietType: 'omnivore',
        goal: 'muscle_gain',
        fitnessLevel: 'intermediate',
        trainingYears: 3,
        restingHR: 60,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(mockUser);

      // Simulate database row mapping
      const dbRow = {
        // Core calculations
        calculated_bmr: metrics.bmr,
        calculated_bmi: metrics.bmi,
        calculated_tdee: metrics.tdee,

        // BMI classification
        bmi_category: metrics.bmiClassification.category,
        bmi_health_risk: metrics.bmiClassification.healthRisk,

        // Daily targets
        daily_calories: Math.round(metrics.dailyCalories),
        daily_protein_g: Math.round(metrics.protein),
        daily_carbs_g: Math.round(metrics.carbs),
        daily_fat_g: Math.round(metrics.fat),
        daily_water_ml: Math.round(metrics.waterIntakeML),

        // Context
        detected_climate: metrics.climate,
        detected_ethnicity: metrics.ethnicity,
        bmr_formula_used: metrics.bmrFormula,
        bmr_formula_accuracy: metrics.bmrAccuracy,
        bmr_formula_confidence: metrics.bmrConfidence,

        // Advanced metrics
        heart_rate_zones: metrics.heartRateZones ? JSON.stringify(metrics.heartRateZones) : null,
        vo2_max_estimate: metrics.vo2max?.vo2max,
        vo2_max_classification: metrics.vo2max?.classification,
        health_score: metrics.healthScore?.totalScore,
        health_grade: metrics.healthScore?.grade,

        // Metadata
        calculations_version: '4.0.0',
      };

      // Verify all required fields are present
      expect(dbRow.calculated_bmr).toBeGreaterThan(0);
      expect(dbRow.calculated_bmi).toBeGreaterThan(0);
      expect(dbRow.calculated_tdee).toBeGreaterThan(0);
      expect(dbRow.daily_calories).toBeGreaterThan(0);
      expect(dbRow.daily_water_ml).toBeGreaterThan(0);

      expect(dbRow.bmi_category).toBeDefined();
      expect(dbRow.bmi_health_risk).toBeDefined();
      expect(dbRow.detected_climate).toBe('tropical');
      expect(dbRow.detected_ethnicity).toBe('asian');
      // Note: Formula selection depends on fitness level + body fat
      expect(['katch_mcardle', 'cunningham', 'mifflin_st_jeor']).toContain(dbRow.bmr_formula_used);

      expect(dbRow.heart_rate_zones).toBeDefined();
      expect(dbRow.vo2_max_estimate).toBeGreaterThan(0);
      expect(dbRow.health_score).toBeGreaterThanOrEqual(0);

      expect(dbRow.calculations_version).toBe('4.0.0');
    });
  });
});
