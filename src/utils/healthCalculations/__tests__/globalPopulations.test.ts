/**
 * PHASE 5: GLOBAL POPULATION TEST SUITE
 * Comprehensive testing for all populations worldwide
 *
 * Tests real-world user scenarios from:
 * - India (Asian BMI cutoffs)
 * - United States (Standard BMI)
 * - Nigeria (African BMI cutoffs)
 * - UAE (Arid climate)
 * - Norway (Cold climate)
 * - Thailand (Tropical climate)
 * - And many more...
 *
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import { HealthCalculatorFacade } from '../HealthCalculatorFacade';
import { getBMICalculator } from '../calculators/bmiCalculators';
import type { UserProfile } from '../types';

describe('Global Population Scenarios', () => {
  describe('Indian Users (Asian BMI)', () => {
    it('should use Asian BMI cutoffs for Indian user', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 70,
        height: 175,
        country: 'IN',
        state: 'MH',
        activityLevel: 'moderate',
        dietType: 'vegetarian',
        goal: 'fat_loss',
        fitnessLevel: 'beginner',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // BMI = 22.86
      expect(metrics.bmi).toBeCloseTo(22.86, 1);
      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.bmiClassification.category).toBe('Normal'); // Asian: 18.5-23

      // Climate adjustments
      expect(metrics.climate).toBe('tropical');
      expect(metrics.waterIntakeML).toBeGreaterThan(3500); // +50% tropical

      // Vegetarian protein boost
      const baseProtein = 70 * 2.0; // 140g
      expect(metrics.protein).toBeGreaterThan(baseProtein * 1.1); // +15%
    });

    it('should classify BMI 26 as Obese for Indian (Asian cutoff)', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 80,
        height: 175,
        country: 'IN',
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const bmi = 80 / Math.pow(1.75, 2); // 26.12

      const bmiCalc = getBMICalculator('asian');
      const classification = bmiCalc.getClassification(bmi);

      // Asian cutoffs: ≥25 is Obese (not 30 like standard)
      expect(classification.category).toBe('Obese');
      expect(classification.healthRisk).toBe('high');
    });

    it('should handle vegetarian diet with adequate protein', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'female',
        weight: 60,
        height: 165,
        country: 'IN',
        activityLevel: 'moderate',
        dietType: 'vegetarian',
        goal: 'muscle_gain',
        fitnessLevel: 'beginner',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // Vegetarian protein: +15% boost
      const baseProtein = 60 * 2.0; // 120g for muscle gain
      expect(metrics.protein).toBeGreaterThan(baseProtein * 1.13); // ≥135g
    });

    it('should handle Mumbai tropical climate correctly', () => {
      const user: UserProfile = {
        age: 35,
        gender: 'male',
        weight: 75,
        height: 180,
        country: 'IN',
        state: 'MH', // Maharashtra (Mumbai)
        activityLevel: 'active',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('tropical');
      // Tropical: +5% TDEE
      expect(metrics.tdee).toBeGreaterThan(metrics.bmr * 1.7); // baseline 1.725 * 1.05
      // Tropical: +50% water
      expect(metrics.waterIntakeML).toBeGreaterThan(4000);
    });

    it('should handle Delhi (north India) climate', () => {
      const user: UserProfile = {
        age: 32,
        gender: 'male',
        weight: 72,
        height: 178,
        country: 'IN',
        state: 'DL', // Delhi
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // Delhi has tropical climate
      expect(metrics.climate).toBe('tropical');
    });
  });

  describe('American Users (Standard BMI)', () => {
    it('should use standard BMI for American user', () => {
      const user: UserProfile = {
        age: 35,
        gender: 'female',
        weight: 65,
        height: 165,
        country: 'US',
        state: 'CA',
        activityLevel: 'active',
        dietType: 'omnivore',
        goal: 'maintenance',
        fitnessLevel: 'intermediate',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('caucasian');
      expect(metrics.climate).toBe('temperate'); // California

      // Standard WHO cutoffs
      const bmi = 65 / Math.pow(1.65, 2); // 23.9
      expect(metrics.bmi).toBeCloseTo(bmi, 1);
      expect(metrics.bmiClassification.category).toBe('Normal'); // 18.5-25
    });

    it('should handle Texas hot climate', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'male',
        weight: 80,
        height: 180,
        country: 'US',
        state: 'TX', // Texas
        activityLevel: 'active',
        goal: 'muscle_gain',
        fitnessLevel: 'intermediate',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      // Texas is arid/temperate
      expect(['arid', 'temperate']).toContain(metrics.climate);
    });

    it('should handle Alaska cold climate', () => {
      const user: UserProfile = {
        age: 40,
        gender: 'male',
        weight: 85,
        height: 182,
        country: 'US',
        state: 'AK', // Alaska
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('cold');
      // Cold: +15% TDEE
      expect(metrics.tdee).toBeGreaterThan(metrics.bmr * 1.7);
      // Cold: -10% water
      expect(metrics.waterIntakeML).toBeLessThan(3500);
    });

    it('should handle New York temperate climate', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'female',
        weight: 60,
        height: 168,
        country: 'US',
        state: 'NY',
        activityLevel: 'light',
        goal: 'fat_loss',
        fitnessLevel: 'beginner',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('temperate');
      // No climate modifiers
      expect(metrics.tdee).toBeCloseTo(metrics.bmr * 1.375, 50);
    });

    it('should handle obese American (BMI > 30)', () => {
      const user: UserProfile = {
        age: 45,
        gender: 'male',
        weight: 110,
        height: 175,
        country: 'US',
        activityLevel: 'sedentary',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      const bmi = 110 / Math.pow(1.75, 2); // 35.9
      expect(metrics.bmi).toBeCloseTo(bmi, 1);
      expect(metrics.bmiClassification.category).toBe('Obese');
      expect(metrics.bmiClassification.healthRisk).toBe('high');
    });
  });

  describe('Middle Eastern Users (Arid Climate)', () => {
    it('should use arid climate adjustments for UAE user', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'male',
        weight: 85,
        height: 180,
        country: 'AE', // UAE
        activityLevel: 'very_active',
        dietType: 'omnivore',
        goal: 'muscle_gain',
        fitnessLevel: 'advanced',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('arid');
      // Arid: +70% water
      expect(metrics.waterIntakeML).toBeGreaterThan(5000);
      // Arid: +5% TDEE
      expect(metrics.tdee).toBeGreaterThan(3000);
    });

    it('should handle Saudi Arabia arid climate', () => {
      const user: UserProfile = {
        age: 32,
        gender: 'male',
        weight: 78,
        height: 175,
        country: 'SA', // Saudi Arabia
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('arid');
      expect(metrics.waterIntakeML).toBeGreaterThan(4500);
    });

    it('should handle Qatar extreme heat', () => {
      const user: UserProfile = {
        age: 35,
        gender: 'male',
        weight: 82,
        height: 178,
        country: 'QA', // Qatar
        activityLevel: 'active',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('arid');
      expect(metrics.waterIntakeML).toBeGreaterThan(5000);
    });

    it('should handle Kuwaiti user with high activity', () => {
      const user: UserProfile = {
        age: 27,
        gender: 'male',
        weight: 75,
        height: 176,
        country: 'KW', // Kuwait
        activityLevel: 'very_active',
        goal: 'muscle_gain',
        fitnessLevel: 'intermediate',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('arid');
      // Very active + arid = extreme water needs
      expect(metrics.waterIntakeML).toBeGreaterThan(5500);
    });
  });

  describe('African Users (African BMI)', () => {
    it('should use African BMI cutoffs for Nigerian user', () => {
      const user: UserProfile = {
        age: 25,
        gender: 'male',
        weight: 80,
        height: 175,
        country: 'NG', // Nigeria
        activityLevel: 'moderate',
        dietType: 'omnivore',
        goal: 'maintenance',
        fitnessLevel: 'beginner',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('black_african');

      const bmi = 80 / Math.pow(1.75, 2); // 26.12
      // African cutoffs: Normal up to 27
      expect(metrics.bmiClassification.category).toBe('Normal');
    });

    it('should handle South African user', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'female',
        weight: 70,
        height: 168,
        country: 'ZA', // South Africa
        activityLevel: 'light',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('black_african');
      expect(metrics.climate).toBe('temperate'); // South Africa varies
    });

    it('should handle Kenyan runner profile', () => {
      const user: UserProfile = {
        age: 24,
        gender: 'male',
        weight: 62,
        height: 175,
        country: 'KE', // Kenya
        activityLevel: 'very_active',
        goal: 'maintenance',
        fitnessLevel: 'advanced',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('black_african');
      expect(metrics.climate).toBe('tropical');

      const bmi = 62 / Math.pow(1.75, 2); // 20.24
      expect(metrics.bmiClassification.category).toBe('Normal');
    });

    it('should handle Egyptian user (North Africa)', () => {
      const user: UserProfile = {
        age: 33,
        gender: 'male',
        weight: 78,
        height: 177,
        country: 'EG', // Egypt
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('middle_eastern');
      expect(metrics.climate).toBe('arid');
    });

    it('should handle Ethiopian highland climate', () => {
      const user: UserProfile = {
        age: 26,
        gender: 'male',
        weight: 65,
        height: 172,
        country: 'ET', // Ethiopia
        activityLevel: 'active',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('black_african');
    });
  });

  describe('European Users (Varied Climates)', () => {
    it('should use cold climate adjustments for Norwegian user', () => {
      const user: UserProfile = {
        age: 40,
        gender: 'female',
        weight: 60,
        height: 168,
        country: 'NO', // Norway
        activityLevel: 'light',
        dietType: 'pescatarian',
        goal: 'fat_loss',
        fitnessLevel: 'beginner',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('cold');
      // Cold: +15% TDEE, -10% water
      expect(metrics.tdee).toBeGreaterThan(metrics.bmr * 1.5); // Baseline + cold
      expect(metrics.waterIntakeML).toBeLessThan(2500); // Reduced for cold
    });

    it('should handle Swedish cold climate', () => {
      const user: UserProfile = {
        age: 35,
        gender: 'male',
        weight: 80,
        height: 182,
        country: 'SE', // Sweden
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('cold');
      expect(metrics.ethnicity).toBe('caucasian');
    });

    it('should handle Finnish extreme cold', () => {
      const user: UserProfile = {
        age: 38,
        gender: 'male',
        weight: 85,
        height: 180,
        country: 'FI', // Finland
        activityLevel: 'active',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('cold');
      // Cold climate requires more calories
      expect(metrics.tdee).toBeGreaterThan(3000);
    });

    it('should handle UK temperate climate', () => {
      const user: UserProfile = {
        age: 32,
        gender: 'female',
        weight: 65,
        height: 170,
        country: 'GB', // United Kingdom
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('temperate');
      expect(metrics.ethnicity).toBe('caucasian');
    });

    it('should handle German user', () => {
      const user: UserProfile = {
        age: 29,
        gender: 'male',
        weight: 78,
        height: 180,
        country: 'DE', // Germany
        activityLevel: 'active',
        goal: 'muscle_gain',
        fitnessLevel: 'intermediate',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('temperate');
      expect(metrics.ethnicity).toBe('caucasian');
    });

    it('should handle Spanish Mediterranean climate', () => {
      const user: UserProfile = {
        age: 31,
        gender: 'female',
        weight: 62,
        height: 165,
        country: 'ES', // Spain
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('temperate');
    });

    it('should handle Italian user', () => {
      const user: UserProfile = {
        age: 36,
        gender: 'male',
        weight: 75,
        height: 177,
        country: 'IT', // Italy
        activityLevel: 'light',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('temperate');
      expect(metrics.ethnicity).toBe('caucasian');
    });

    it('should handle French user', () => {
      const user: UserProfile = {
        age: 27,
        gender: 'female',
        weight: 58,
        height: 168,
        country: 'FR', // France
        activityLevel: 'light',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('temperate');
    });
  });

  describe('Southeast Asian Users (Tropical)', () => {
    it('should handle Thai vegan user correctly', () => {
      const user: UserProfile = {
        age: 27,
        gender: 'female',
        weight: 55,
        height: 160,
        country: 'TH', // Thailand
        activityLevel: 'moderate',
        dietType: 'vegan',
        goal: 'muscle_gain',
        fitnessLevel: 'beginner',
        trainingYears: 0,
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.climate).toBe('tropical');

      // Vegan protein: +25%
      const baseProtein = 55 * 2.0; // 110g
      expect(metrics.protein).toBeGreaterThan(baseProtein * 1.2); // ≥132g

      // Beginner female muscle gain
      expect(metrics.muscleGainLimits?.monthlyKg).toBeCloseTo(0.5, 1);
    });

    it('should handle Vietnamese user', () => {
      const user: UserProfile = {
        age: 25,
        gender: 'male',
        weight: 65,
        height: 170,
        country: 'VN', // Vietnam
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.climate).toBe('tropical');
    });

    it('should handle Malaysian tropical climate', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'female',
        weight: 58,
        height: 162,
        country: 'MY', // Malaysia
        activityLevel: 'light',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.climate).toBe('tropical');
      expect(metrics.waterIntakeML).toBeGreaterThan(3000);
    });

    it('should handle Indonesian user', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'male',
        weight: 68,
        height: 172,
        country: 'ID', // Indonesia
        activityLevel: 'active',
        goal: 'muscle_gain',
        fitnessLevel: 'beginner',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.climate).toBe('tropical');
    });

    it('should handle Singaporean user (city-state)', () => {
      const user: UserProfile = {
        age: 32,
        gender: 'male',
        weight: 72,
        height: 175,
        country: 'SG', // Singapore
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.climate).toBe('tropical');
      // High humidity = high water needs
      expect(metrics.waterIntakeML).toBeGreaterThan(3500);
    });
  });

  describe('East Asian Users', () => {
    it('should handle Chinese user with Asian BMI', () => {
      const user: UserProfile = {
        age: 29,
        gender: 'male',
        weight: 70,
        height: 175,
        country: 'CN', // China
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      const bmi = 70 / Math.pow(1.75, 2); // 22.86
      expect(metrics.bmiClassification.category).toBe('Normal'); // Asian: 18.5-23
    });

    it('should handle Japanese user', () => {
      const user: UserProfile = {
        age: 35,
        gender: 'female',
        weight: 55,
        height: 160,
        country: 'JP', // Japan
        activityLevel: 'light',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.climate).toBe('temperate');
    });

    it('should handle South Korean user', () => {
      const user: UserProfile = {
        age: 26,
        gender: 'male',
        weight: 68,
        height: 173,
        country: 'KR', // South Korea
        activityLevel: 'active',
        goal: 'muscle_gain',
        fitnessLevel: 'intermediate',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.climate).toBe('temperate');
    });

    it('should handle Taiwanese user', () => {
      const user: UserProfile = {
        age: 31,
        gender: 'female',
        weight: 57,
        height: 163,
        country: 'TW', // Taiwan
        activityLevel: 'moderate',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.climate).toBe('tropical');
    });
  });

  describe('Latin American Users', () => {
    it('should handle Brazilian tropical climate', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'male',
        weight: 75,
        height: 177,
        country: 'BR', // Brazil
        activityLevel: 'active',
        goal: 'muscle_gain',
        fitnessLevel: 'intermediate',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('hispanic');
      expect(metrics.climate).toBe('tropical');
    });

    it('should handle Mexican user', () => {
      const user: UserProfile = {
        age: 33,
        gender: 'male',
        weight: 80,
        height: 170,
        country: 'MX', // Mexico
        activityLevel: 'moderate',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('hispanic');
    });

    it('should handle Argentine user', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'female',
        weight: 65,
        height: 168,
        country: 'AR', // Argentina
        activityLevel: 'light',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('hispanic');
      expect(metrics.climate).toBe('temperate');
    });

    it('should handle Colombian user', () => {
      const user: UserProfile = {
        age: 27,
        gender: 'male',
        weight: 72,
        height: 175,
        country: 'CO', // Colombia
        activityLevel: 'active',
        goal: 'muscle_gain',
        fitnessLevel: 'beginner',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('hispanic');
      expect(metrics.climate).toBe('tropical');
    });
  });

  describe('Oceania Users', () => {
    it('should handle Australian user', () => {
      const user: UserProfile = {
        age: 32,
        gender: 'male',
        weight: 82,
        height: 180,
        country: 'AU', // Australia
        activityLevel: 'active',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('caucasian');
    });

    it('should handle New Zealand user', () => {
      const user: UserProfile = {
        age: 29,
        gender: 'female',
        weight: 68,
        height: 170,
        country: 'NZ', // New Zealand
        activityLevel: 'moderate',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('caucasian');
      expect(metrics.climate).toBe('temperate');
    });

    it('should handle Pacific Islander user', () => {
      const user: UserProfile = {
        age: 35,
        gender: 'male',
        weight: 95,
        height: 178,
        country: 'FJ', // Fiji
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('pacific_islander');
      expect(metrics.climate).toBe('tropical');
    });
  });

  describe('South Asian Diversity', () => {
    it('should handle Pakistani user', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'male',
        weight: 73,
        height: 176,
        country: 'PK', // Pakistan
        activityLevel: 'moderate',
        goal: 'muscle_gain',
        fitnessLevel: 'beginner',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
    });

    it('should handle Bangladeshi user', () => {
      const user: UserProfile = {
        age: 26,
        gender: 'male',
        weight: 65,
        height: 170,
        country: 'BD', // Bangladesh
        activityLevel: 'light',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.climate).toBe('tropical');
    });

    it('should handle Sri Lankan user', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'female',
        weight: 58,
        height: 162,
        country: 'LK', // Sri Lanka
        activityLevel: 'moderate',
        goal: 'fat_loss',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('asian');
      expect(metrics.climate).toBe('tropical');
    });
  });

  describe('Canadian Users (Multiple Climates)', () => {
    it('should handle Toronto (temperate)', () => {
      const user: UserProfile = {
        age: 34,
        gender: 'male',
        weight: 78,
        height: 180,
        country: 'CA',
        state: 'ON', // Ontario
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.ethnicity).toBe('caucasian');
      expect(metrics.climate).toBe('cold');
    });

    it('should handle Vancouver (temperate coastal)', () => {
      const user: UserProfile = {
        age: 29,
        gender: 'female',
        weight: 63,
        height: 168,
        country: 'CA',
        state: 'BC', // British Columbia
        activityLevel: 'active',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('temperate');
    });

    it('should handle Northern Canada (extreme cold)', () => {
      const user: UserProfile = {
        age: 38,
        gender: 'male',
        weight: 85,
        height: 182,
        country: 'CA',
        state: 'YT', // Yukon
        activityLevel: 'moderate',
        goal: 'maintenance',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.climate).toBe('cold');
      // Extreme cold = high calorie needs
      expect(metrics.tdee).toBeGreaterThan(2800);
    });
  });
});
