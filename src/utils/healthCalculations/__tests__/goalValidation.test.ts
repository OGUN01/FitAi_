/**
 * PHASE 5: GOAL VALIDATION TEST SUITE
 * Comprehensive testing for all fitness goals
 *
 * Tests:
 * - Fat Loss (4 tiers: standard, aggressive, very aggressive, extreme)
 * - Muscle Gain (4 experience levels: beginner, intermediate, advanced, elite)
 * - Maintenance
 * - Body Recomposition
 *
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import { HealthCalculatorFacade } from '../HealthCalculatorFacade';
import type { UserProfile, GoalInput } from '../HealthCalculatorFacade';

describe('Goal Validation', () => {
  describe('Fat Loss Validation', () => {
    const user: UserProfile = {
      age: 30,
      gender: 'male',
      weight: 90,
      height: 175,
      country: 'US',
      activityLevel: 'moderate',
      dietType: 'omnivore',
      fitnessLevel: 'beginner',
      goal: 'fat_loss',
    };

    it('0.5 kg/week: success (conservative)', () => {
      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'fat_loss',
        targetWeight: 80,
        timelineWeeks: 20, // 10kg in 20 weeks = 0.5kg/week
      });

      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('success');
      expect(validation.weeklyRate).toBeCloseTo(0.5, 1);
    });

    it('0.75 kg/week: success (standard)', () => {
      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'fat_loss',
        targetWeight: 80,
        timelineWeeks: 13, // 10kg in 13 weeks = 0.77kg/week
      });

      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('success');
      expect(validation.weeklyRate).toBeCloseTo(0.77, 1);
    });

    it('1.0 kg/week: success (aggressive)', () => {
      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'fat_loss',
        targetWeight: 80,
        timelineWeeks: 10, // 10kg in 10 weeks = 1.0kg/week
      });

      expect(validation.valid).toBe(true);
      expect(['success', 'info']).toContain(validation.severity);
      expect(validation.weeklyRate).toBeCloseTo(1.0, 1);
    });

    it('1.5 kg/week: warning (very aggressive)', () => {
      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'fat_loss',
        targetWeight: 75,
        timelineWeeks: 10, // 15kg in 10 weeks = 1.5kg/week
      });

      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('warning');
      expect(validation.suggestions).toBeDefined();
      expect(validation.suggestions!.length).toBeGreaterThan(0);
    });

    it('2.0 kg/week: warning (extreme)', () => {
      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'fat_loss',
        targetWeight: 70,
        timelineWeeks: 10, // 20kg in 10 weeks = 2.0kg/week
      });

      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('warning');
      expect(validation.adjustedTimeline).toBeGreaterThan(10);
    });

    it('2.5 kg/week obese: allowed with warning', () => {
      const obeseUser: UserProfile = {
        ...user,
        weight: 120, // BMI 39
      };

      const validation = HealthCalculatorFacade.validateGoal(obeseUser, {
        type: 'fat_loss',
        targetWeight: 100,
        timelineWeeks: 8, // 20kg in 8 weeks = 2.5kg/week
      });

      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('warning');
      // Higher rates allowed for obese
    });

    it('3.0 kg/week very obese: allowed with warning', () => {
      const veryObeseUser: UserProfile = {
        ...user,
        weight: 140, // BMI 45
      };

      const validation = HealthCalculatorFacade.validateGoal(veryObeseUser, {
        type: 'fat_loss',
        targetWeight: 110,
        timelineWeeks: 10, // 30kg in 10 weeks = 3.0kg/week
      });

      expect(validation.valid).toBe(true);
      // Should allow higher rates for very obese
    });

    it('female fat loss should have slightly lower rates', () => {
      const femaleUser: UserProfile = {
        age: 30,
        gender: 'female',
        weight: 75,
        height: 165,
        country: 'US',
        activityLevel: 'moderate',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'fat_loss',
      };

      const validation = HealthCalculatorFacade.validateGoal(femaleUser, {
        type: 'fat_loss',
        targetWeight: 65,
        timelineWeeks: 13, // 10kg in 13 weeks = 0.77kg/week
      });

      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('success');
    });

    it('should suggest adjusted timeline for unrealistic goal', () => {
      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'fat_loss',
        targetWeight: 70,
        timelineWeeks: 5, // 20kg in 5 weeks = 4.0kg/week - unrealistic
      });

      expect(validation.adjustedTimeline).toBeDefined();
      expect(validation.adjustedTimeline).toBeGreaterThan(5);
      expect(validation.suggestions).toBeDefined();
    });
  });

  describe('Muscle Gain Validation', () => {
    describe('Beginner Male', () => {
      const user: UserProfile = {
        age: 25,
        gender: 'male',
        weight: 70,
        height: 175,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        trainingYears: 0,
        goal: 'muscle_gain',
      };

      it('1 kg/month: success (realistic)', () => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'muscle_gain',
          targetGain: 10, // kg
          timelineMonths: 10,
        });

        expect(validation.valid).toBe(true);
        expect(validation.severity).toBe('success');
      });

      it('0.75 kg/month: success (conservative)', () => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'muscle_gain',
          targetGain: 9, // kg
          timelineMonths: 12,
        });

        expect(validation.valid).toBe(true);
        expect(validation.severity).toBe('success');
      });

      it('1.5 kg/month: warning (too aggressive)', () => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'muscle_gain',
          targetGain: 15, // kg
          timelineMonths: 10,
        });

        expect(validation.severity).toBe('warning');
        expect(validation.suggestions).toBeDefined();
      });
    });

    describe('Intermediate Male', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'male',
        weight: 75,
        height: 178,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'intermediate',
        trainingYears: 2,
        goal: 'muscle_gain',
      };

      it('0.5 kg/month: success (realistic)', () => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'muscle_gain',
          targetGain: 6, // kg
          timelineMonths: 12,
        });

        expect(validation.valid).toBe(true);
        expect(validation.severity).toBe('success');
      });

      it('1 kg/month: warning (too aggressive for intermediate)', () => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'muscle_gain',
          targetGain: 10, // kg
          timelineMonths: 10,
        });

        expect(validation.severity).toBe('warning');
      });
    });

    describe('Advanced Male', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 80,
        height: 180,
        country: 'US',
        activityLevel: 'very_active',
        dietType: 'omnivore',
        fitnessLevel: 'advanced',
        trainingYears: 5,
        goal: 'muscle_gain',
      };

      it('0.25 kg/month: success (realistic)', () => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'muscle_gain',
          targetGain: 3, // kg
          timelineMonths: 12,
        });

        expect(validation.valid).toBe(true);
        expect(validation.severity).toBe('success');
      });

      it('0.5 kg/month: warning (aggressive for advanced)', () => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'muscle_gain',
          targetGain: 6, // kg
          timelineMonths: 12,
        });

        expect(validation.severity).toBe('warning');
      });
    });

    describe('Beginner Female', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'female',
        weight: 60,
        height: 165,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        trainingYears: 0,
        goal: 'muscle_gain',
      };

      it('0.5 kg/month: success (realistic)', () => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'muscle_gain',
          targetGain: 5, // kg
          timelineMonths: 10,
        });

        expect(validation.valid).toBe(true);
        expect(validation.severity).toBe('success');
      });

      it('1 kg/month: warning (too aggressive for female)', () => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'muscle_gain',
          targetGain: 10, // kg
          timelineMonths: 10,
        });

        expect(validation.severity).toBe('warning');
      });
    });

    describe('Intermediate Female', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'female',
        weight: 62,
        height: 168,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'intermediate',
        trainingYears: 2,
        goal: 'muscle_gain',
      };

      it('0.25 kg/month: success (realistic)', () => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'muscle_gain',
          targetGain: 3, // kg
          timelineMonths: 12,
        });

        expect(validation.valid).toBe(true);
        expect(validation.severity).toBe('success');
      });
    });

    describe('Advanced Female', () => {
      const user: UserProfile = {
        age: 32,
        gender: 'female',
        weight: 65,
        height: 170,
        country: 'US',
        activityLevel: 'very_active',
        dietType: 'omnivore',
        fitnessLevel: 'advanced',
        trainingYears: 4,
        goal: 'muscle_gain',
      };

      it('0.125 kg/month: success (realistic)', () => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'muscle_gain',
          targetGain: 1.5, // kg
          timelineMonths: 12,
        });

        expect(validation.valid).toBe(true);
        expect(validation.severity).toBe('success');
      });
    });
  });

  describe('Age Impact on Muscle Gain', () => {
    it('young adult (18-25) should have +15% muscle gain potential', () => {
      const youngUser: UserProfile = {
        age: 20,
        gender: 'male',
        weight: 70,
        height: 178,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        trainingYears: 0,
        goal: 'muscle_gain',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(youngUser);

      // Young adults: base 1.0kg/month × 1.15 = 1.15kg/month
      expect(metrics.muscleGainLimits?.monthlyKg).toBeGreaterThan(1.1);
    });

    it('middle-aged (40-50) should have reduced muscle gain', () => {
      const middleAgedUser: UserProfile = {
        age: 45,
        gender: 'male',
        weight: 75,
        height: 180,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        trainingYears: 0,
        goal: 'muscle_gain',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(middleAgedUser);

      // Reduced by ~15% for age
      expect(metrics.muscleGainLimits?.monthlyKg).toBeLessThan(1.0);
    });

    it('elderly (60+) should have significantly reduced muscle gain', () => {
      const elderlyUser: UserProfile = {
        age: 65,
        gender: 'male',
        weight: 72,
        height: 175,
        country: 'US',
        activityLevel: 'light',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        trainingYears: 0,
        goal: 'muscle_gain',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(elderlyUser);

      // Reduced by ~30% for age
      expect(metrics.muscleGainLimits?.monthlyKg).toBeLessThan(0.7);
    });
  });

  describe('Maintenance Goal', () => {
    it('should always validate maintenance as success', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 75,
        height: 178,
        country: 'US',
        activityLevel: 'moderate',
        dietType: 'omnivore',
        fitnessLevel: 'intermediate',
        goal: 'maintenance',
      };

      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'maintenance',
      });

      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('success');
    });

    it('should validate maintenance for any user profile', () => {
      const users: UserProfile[] = [
        {
          age: 18,
          gender: 'male',
          weight: 65,
          height: 175,
          country: 'IN',
          activityLevel: 'sedentary',
          goal: 'maintenance',
        } as UserProfile,
        {
          age: 70,
          gender: 'female',
          weight: 55,
          height: 160,
          country: 'JP',
          activityLevel: 'light',
          goal: 'maintenance',
        } as UserProfile,
        {
          age: 35,
          gender: 'male',
          weight: 120,
          height: 180,
          country: 'US',
          activityLevel: 'moderate',
          goal: 'maintenance',
        } as UserProfile,
      ];

      users.forEach((user) => {
        const validation = HealthCalculatorFacade.validateGoal(user, {
          type: 'maintenance',
        });

        expect(validation.valid).toBe(true);
        expect(validation.severity).toBe('success');
      });
    });
  });

  describe('Body Recomposition Goal', () => {
    it('should validate recomp for normal weight users', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'male',
        weight: 75,
        height: 178,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'intermediate',
        goal: 'recomp',
      };

      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'recomp',
      });

      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('success');
    });

    it('should validate recomp for slightly overweight users', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 85,
        height: 178,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        goal: 'recomp',
      };

      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'recomp',
      });

      expect(validation.valid).toBe(true);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should require target weight for fat loss', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'male',
        weight: 90,
        height: 175,
        country: 'US',
        activityLevel: 'moderate',
        goal: 'fat_loss',
      };

      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'fat_loss',
        // Missing targetWeight and timelineWeeks
      } as GoalInput);

      expect(validation.valid).toBe(false);
      expect(validation.severity).toBe('error');
    });

    it('should require target gain for muscle gain', () => {
      const user: UserProfile = {
        age: 25,
        gender: 'male',
        weight: 70,
        height: 175,
        country: 'US',
        activityLevel: 'active',
        goal: 'muscle_gain',
      };

      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'muscle_gain',
        // Missing targetGain and timelineMonths
      } as GoalInput);

      expect(validation.valid).toBe(false);
      expect(validation.severity).toBe('error');
    });

    it('should handle very small fat loss goals', () => {
      const user: UserProfile = {
        age: 28,
        gender: 'female',
        weight: 62,
        height: 165,
        country: 'US',
        activityLevel: 'moderate',
        goal: 'fat_loss',
      };

      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'fat_loss',
        targetWeight: 60, // Only 2kg to lose
        timelineWeeks: 4,
      });

      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('success');
    });

    it('should handle very small muscle gain goals', () => {
      const user: UserProfile = {
        age: 32,
        gender: 'female',
        weight: 58,
        height: 163,
        country: 'US',
        activityLevel: 'moderate',
        fitnessLevel: 'advanced',
        trainingYears: 4,
        goal: 'muscle_gain',
      };

      const validation = HealthCalculatorFacade.validateGoal(user, {
        type: 'muscle_gain',
        targetGain: 1, // Only 1kg
        timelineMonths: 8,
      });

      expect(validation.valid).toBe(true);
      expect(validation.severity).toBe('success');
    });
  });

  describe('Muscle Gain Limits Calculation', () => {
    it('should calculate muscle gain limits for beginner male', () => {
      const user: UserProfile = {
        age: 25,
        gender: 'male',
        weight: 70,
        height: 175,
        country: 'US',
        activityLevel: 'active',
        dietType: 'omnivore',
        fitnessLevel: 'beginner',
        trainingYears: 0,
        goal: 'muscle_gain',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.muscleGainLimits).toBeDefined();
      expect(metrics.muscleGainLimits!.monthlyKg).toBeGreaterThan(0.8);
      expect(metrics.muscleGainLimits!.monthlyKg).toBeLessThan(1.2);
      expect(metrics.muscleGainLimits!.yearlyGain).toBeGreaterThan(9);
    });

    it('should calculate muscle gain limits for advanced female', () => {
      const user: UserProfile = {
        age: 30,
        gender: 'female',
        weight: 60,
        height: 165,
        country: 'US',
        activityLevel: 'very_active',
        dietType: 'omnivore',
        fitnessLevel: 'advanced',
        trainingYears: 4,
        goal: 'muscle_gain',
      };

      const metrics = HealthCalculatorFacade.calculateAllMetrics(user);

      expect(metrics.muscleGainLimits).toBeDefined();
      expect(metrics.muscleGainLimits!.monthlyKg).toBeLessThan(0.2);
      expect(metrics.muscleGainLimits!.yearlyGain).toBeLessThan(2.5);
    });
  });
});
