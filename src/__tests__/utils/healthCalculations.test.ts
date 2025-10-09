// 🧪 HEALTH CALCULATIONS - COMPREHENSIVE AUTOMATED TESTS
// Tests all calculation functions for accuracy

import { MetabolicCalculations } from '../../utils/healthCalculations';
import { ValidationEngine } from '../../services/validationEngine';
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData
} from '../../types/onboarding';

const createBasicPersonalInfo = (overrides?: Partial<PersonalInfoData>): PersonalInfoData => ({
  first_name: 'Test',
  last_name: 'User',
  age: 30,
  gender: 'male',
  country: 'US',
  state: 'CA',
  wake_time: '07:00',
  sleep_time: '23:00',
  occupation_type: 'desk_job',
  ...overrides
});

const createBasicDietPreferences = (overrides?: Partial<DietPreferencesData>): DietPreferencesData => ({
  diet_type: 'non-veg',
  allergies: [],
  restrictions: [],
  keto_ready: false,
  intermittent_fasting_ready: false,
  paleo_ready: false,
  mediterranean_ready: false,
  low_carb_ready: false,
  high_protein_ready: false,
  breakfast_enabled: true,
  lunch_enabled: true,
  dinner_enabled: true,
  snacks_enabled: true,
  cooking_skill_level: 'intermediate',
  max_prep_time_minutes: 30,
  budget_level: 'medium',
  drinks_enough_water: true,
  limits_sugary_drinks: true,
  eats_regular_meals: true,
  avoids_late_night_eating: true,
  controls_portion_sizes: true,
  reads_nutrition_labels: false,
  eats_processed_foods: false,
  eats_5_servings_fruits_veggies: true,
  limits_refined_sugar: true,
  includes_healthy_fats: true,
  drinks_alcohol: false,
  smokes_tobacco: false,
  drinks_coffee: true,
  takes_supplements: false,
  ...overrides
});

const createBasicBodyAnalysis = (overrides?: Partial<BodyAnalysisData>): BodyAnalysisData => ({
  height_cm: 175,
  current_weight_kg: 80,
  target_weight_kg: 75,
  target_timeline_weeks: 16,
  medical_conditions: [],
  medications: [],
  physical_limitations: [],
  pregnancy_status: false,
  breastfeeding_status: false,
  ...overrides
});

const createBasicWorkoutPreferences = (overrides?: Partial<WorkoutPreferencesData>): WorkoutPreferencesData => ({
  location: 'gym',
  equipment: ['dumbbells'],
  time_preference: 60,
  intensity: 'intermediate',
  workout_types: ['strength'],
  primary_goals: ['weight-loss'],
  activity_level: 'moderate',
  workout_experience_years: 2,
  workout_frequency_per_week: 4,
  can_do_pushups: 20,
  can_run_minutes: 15,
  flexibility_level: 'fair',
  preferred_workout_times: ['morning'],
  enjoys_cardio: true,
  enjoys_strength_training: true,
  enjoys_group_classes: false,
  prefers_outdoor_activities: false,
  needs_motivation: false,
  prefers_variety: true,
  ...overrides
});

describe('MetabolicCalculations - Core Functions', () => {
  
  describe('calculateBMR', () => {
    it('should calculate BMR correctly for males (Mifflin-St Jeor)', () => {
      const bmr = MetabolicCalculations.calculateBMR(80, 175, 30, 'male');
      // Expected: 10(80) + 6.25(175) - 5(30) + 5 = 800 + 1093.75 - 150 + 5 = 1748.75
      expect(bmr).toBeCloseTo(1748.75, 1);
    });
    
    it('should calculate BMR correctly for females', () => {
      const bmr = MetabolicCalculations.calculateBMR(60, 165, 25, 'female');
      // Expected: 10(60) + 6.25(165) - 5(25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
      expect(bmr).toBeCloseTo(1345.25, 1);
    });
    
    it('should calculate BMR for other/prefer_not_to_say (average)', () => {
      const bmr = MetabolicCalculations.calculateBMR(70, 170, 30, 'other');
      const base = 10*70 + 6.25*170 - 5*30;  // 1612.5
      const expectedAvg = base - 78;  // As per spec: base - 78
      expect(bmr).toBeCloseTo(expectedAvg, 1);  // 1612.5 - 78 = 1534.5
    });
  });

  describe('calculateBMI', () => {
    it('should calculate BMI correctly', () => {
      const bmi = MetabolicCalculations.calculateBMI(80, 175);
      // Expected: 80 / (1.75^2) = 80 / 3.0625 = 26.12
      expect(bmi).toBeCloseTo(26.12, 1);
    });
  });

  describe('calculateBaseTDEE (NEW - Occupation-Based)', () => {
    it('should calculate base TDEE from occupation', () => {
      const bmr = 1750;
      
      expect(MetabolicCalculations.calculateBaseTDEE(bmr, 'desk_job')).toBeCloseTo(1750 * 1.25, 1);
      expect(MetabolicCalculations.calculateBaseTDEE(bmr, 'light_active')).toBeCloseTo(1750 * 1.35, 1);
      expect(MetabolicCalculations.calculateBaseTDEE(bmr, 'moderate_active')).toBeCloseTo(1750 * 1.45, 1);
      expect(MetabolicCalculations.calculateBaseTDEE(bmr, 'heavy_labor')).toBeCloseTo(1750 * 1.60, 1);
      expect(MetabolicCalculations.calculateBaseTDEE(bmr, 'very_active')).toBeCloseTo(1750 * 1.70, 1);
    });
  });

  describe('estimateSessionCalorieBurn (MET-Based)', () => {
    it('should calculate session burn correctly', () => {
      // Intermediate strength, 60min, 80kg
      // MET = 5.0, duration = 1hr, weight = 80kg
      // Expected: 5.0 × 80 × 1.0 = 400 calories
      const burn = MetabolicCalculations.estimateSessionCalorieBurn(60, 'intermediate', 80, ['strength']);
      expect(burn).toBe(400);
    });
    
    it('should calculate higher burn for advanced intensity', () => {
      // Advanced cardio, 45min, 70kg
      // MET = 9.0, duration = 0.75hr, weight = 70kg
      // Expected: 9.0 × 70 × 0.75 = 472.5 → 473
      const burn = MetabolicCalculations.estimateSessionCalorieBurn(45, 'advanced', 70, ['cardio']);
      expect(burn).toBe(473);
    });
    
    it('should calculate lower burn for beginner intensity', () => {
      // Beginner yoga, 30min, 60kg
      // MET = 2.5, duration = 0.5hr, weight = 60kg
      // Expected: 2.5 × 60 × 0.5 = 75
      const burn = MetabolicCalculations.estimateSessionCalorieBurn(30, 'beginner', 60, ['yoga']);
      expect(burn).toBe(75);
    });
  });

  describe('calculateDailyExerciseBurn', () => {
    it('should calculate daily average from weekly burn', () => {
      // 4 sessions/week, 60min each, intermediate strength, 80kg
      // Per session: 400 cal
      // Weekly: 1600 cal
      // Daily average: 1600/7 = 228.57 → 229
      const dailyBurn = MetabolicCalculations.calculateDailyExerciseBurn(4, 60, 'intermediate', 80, ['strength']);
      expect(dailyBurn).toBe(229);
    });
  });

  describe('getFinalBodyFatPercentage (Priority Logic)', () => {
    it('should prioritize user input over all others', () => {
      const result = MetabolicCalculations.getFinalBodyFatPercentage(
        15,    // User input
        20,    // AI estimate
        85,    // High AI confidence
        25,    // BMI
        'male',
        30
      );
      
      expect(result.value).toBe(15);
      expect(result.source).toBe('user_input');
      expect(result.confidence).toBe('high');
      expect(result.showWarning).toBe(false);
    });
    
    it('should use AI if no user input and confidence > 70%', () => {
      const result = MetabolicCalculations.getFinalBodyFatPercentage(
        undefined,  // No user input
        18,         // AI estimate
        75,         // Confidence > 70%
        25,
        'male',
        30
      );
      
      expect(result.value).toBe(18);
      expect(result.source).toBe('ai_analysis');
      expect(result.confidence).toBe('medium');
      expect(result.showWarning).toBe(true);
    });
    
    it('should estimate from BMI if no user input or low AI confidence', () => {
      const result = MetabolicCalculations.getFinalBodyFatPercentage(
        undefined,
        15,
        50,  // Low confidence
        25,  // BMI
        'male',
        30
      );
      
      expect(result.source).toBe('bmi_estimation');
      expect(result.confidence).toBe('low');
      expect(result.showWarning).toBe(true);
    });
  });

  describe('estimateBodyFatFromBMI (Deurenberg Formula)', () => {
    it('should estimate body fat from BMI for males', () => {
      // Formula: (1.20 × BMI) + (0.23 × age) - 16.2
      // BMI 25, age 30: (1.20 × 25) + (0.23 × 30) - 16.2 = 30 + 6.9 - 16.2 = 20.7
      const bf = MetabolicCalculations.estimateBodyFatFromBMI(25, 'male', 30);
      expect(bf).toBe(21);  // Rounded
    });
    
    it('should estimate body fat from BMI for females', () => {
      // Formula: (1.20 × BMI) + (0.23 × age) - 5.4
      // BMI 25, age 30: (1.20 × 25) + (0.23 × 30) - 5.4 = 30 + 6.9 - 5.4 = 31.5
      const bf = MetabolicCalculations.estimateBodyFatFromBMI(25, 'female', 30);
      expect(bf).toBe(32);  // Rounded
    });
  });

  describe('calculateDietReadinessScore', () => {
    it('should calculate high score for good habits', () => {
      const score = MetabolicCalculations.calculateDietReadinessScore({
        drinks_enough_water: true,
        limits_sugary_drinks: true,
        eats_regular_meals: true,
        avoids_late_night_eating: true,
        controls_portion_sizes: true,
        reads_nutrition_labels: true,
        eats_processed_foods: false,
        eats_5_servings_fruits_veggies: true,
        limits_refined_sugar: true,
        includes_healthy_fats: true,
        drinks_alcohol: false,
        smokes_tobacco: false
      } as any);
      
      // Should be high (80-100 range)
      expect(score).toBeGreaterThan(80);
    });
    
    it('should calculate low score for poor habits', () => {
      const score = MetabolicCalculations.calculateDietReadinessScore({
        drinks_enough_water: false,
        limits_sugary_drinks: false,
        eats_regular_meals: false,
        avoids_late_night_eating: false,
        controls_portion_sizes: false,
        reads_nutrition_labels: false,
        eats_processed_foods: true,
        eats_5_servings_fruits_veggies: false,
        limits_refined_sugar: false,
        includes_healthy_fats: false,
        drinks_alcohol: true,
        smokes_tobacco: true
      } as any);
      
      // Should be low (0-40 range)
      expect(score).toBeLessThan(40);
    });
  });

  describe('calculateWaterIntake', () => {
    it('should calculate water intake (35ml per kg)', () => {
      expect(MetabolicCalculations.calculateWaterIntake(80)).toBe(2800);  // 80 × 35 = 2800ml
      expect(MetabolicCalculations.calculateWaterIntake(60)).toBe(2100);  // 60 × 35 = 2100ml
    });
  });

  describe('calculateFiber', () => {
    it('should calculate fiber (14g per 1000 cal)', () => {
      expect(MetabolicCalculations.calculateFiber(2000)).toBe(28);  // 2000/1000 × 14 = 28g
      expect(MetabolicCalculations.calculateFiber(1500)).toBe(21);  // 1500/1000 × 14 = 21g
    });
  });

  describe('applyAgeModifier', () => {
    it('should apply age-based TDEE reductions', () => {
      const baseTDEE = 2000;
      
      expect(MetabolicCalculations.applyAgeModifier(baseTDEE, 25, 'male')).toBe(2000);  // No reduction under 30
      expect(MetabolicCalculations.applyAgeModifier(baseTDEE, 35, 'male')).toBe(1960);  // -2% at 30s
      expect(MetabolicCalculations.applyAgeModifier(baseTDEE, 45, 'male')).toBe(1900);  // -5% at 40s
      expect(MetabolicCalculations.applyAgeModifier(baseTDEE, 55, 'male')).toBe(1800);  // -10% at 50s
      expect(MetabolicCalculations.applyAgeModifier(baseTDEE, 65, 'male')).toBe(1700);  // -15% at 60s+
    });
    
    it('should apply additional menopause adjustment for females 45-55', () => {
      const baseTDEE = 2000;
      const result = MetabolicCalculations.applyAgeModifier(baseTDEE, 50, 'female');
      // -10% for 50s + -5% for menopause = 0.90 × 0.95 = 0.855
      expect(result).toBe(1710);  // 2000 × 0.855
    });
  });

  describe('applySleepPenalty', () => {
    it('should add 20% timeline per hour under 7', () => {
      expect(MetabolicCalculations.applySleepPenalty(10, 7)).toBe(10);  // No penalty
      expect(MetabolicCalculations.applySleepPenalty(10, 6)).toBe(12);  // +20%
      expect(MetabolicCalculations.applySleepPenalty(10, 5)).toBe(14);  // +40%
      expect(MetabolicCalculations.applySleepPenalty(10, 4)).toBe(16);  // +60%
    });
  });

  describe('calculatePregnancyCalories', () => {
    it('should add correct calories for each trimester', () => {
      const baseTDEE = 2000;
      
      expect(MetabolicCalculations.calculatePregnancyCalories(baseTDEE, true, 1, false)).toBe(2000);  // T1: +0
      expect(MetabolicCalculations.calculatePregnancyCalories(baseTDEE, true, 2, false)).toBe(2340);  // T2: +340
      expect(MetabolicCalculations.calculatePregnancyCalories(baseTDEE, true, 3, false)).toBe(2450);  // T3: +450
    });
    
    it('should add 500 for breastfeeding', () => {
      const baseTDEE = 2000;
      expect(MetabolicCalculations.calculatePregnancyCalories(baseTDEE, false, undefined, true)).toBe(2500);
    });
  });

  describe('validateActivityForOccupation', () => {
    it('should validate occupation matches activity level', () => {
      // Desk job - any level allowed
      expect(MetabolicCalculations.validateActivityForOccupation('desk_job', 'sedentary').isValid).toBe(true);
      expect(MetabolicCalculations.validateActivityForOccupation('desk_job', 'extreme').isValid).toBe(true);
      
      // Heavy labor - must be at least "active"
      expect(MetabolicCalculations.validateActivityForOccupation('heavy_labor', 'sedentary').isValid).toBe(false);
      expect(MetabolicCalculations.validateActivityForOccupation('heavy_labor', 'moderate').isValid).toBe(false);
      expect(MetabolicCalculations.validateActivityForOccupation('heavy_labor', 'active').isValid).toBe(true);
      expect(MetabolicCalculations.validateActivityForOccupation('heavy_labor', 'extreme').isValid).toBe(true);
    });
  });

  describe('calculateRecommendedIntensity', () => {
    it('should recommend advanced for 3+ years experience', () => {
      const result = MetabolicCalculations.calculateRecommendedIntensity(5, 30, 20, 30, 'male');
      expect(result.recommendedIntensity).toBe('advanced');
    });
    
    it('should recommend beginner for < 1 year experience', () => {
      const result = MetabolicCalculations.calculateRecommendedIntensity(0, 5, 5, 25, 'male');
      expect(result.recommendedIntensity).toBe('beginner');
    });
    
    it('should use fitness tests for 1-3 years experience', () => {
      // Male, age 30, can do 30 pushups, run 20 min → advanced
      const result1 = MetabolicCalculations.calculateRecommendedIntensity(2, 30, 20, 30, 'male');
      expect(result1.recommendedIntensity).toBe('advanced');
      
      // Male, age 30, can do 10 pushups, run 5 min → beginner
      const result2 = MetabolicCalculations.calculateRecommendedIntensity(2, 10, 5, 30, 'male');
      expect(result2.recommendedIntensity).toBe('beginner');
    });
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('ValidationEngine - Edge Cases', () => {
  
  it('should handle zero weight difference (maintenance)', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo(),
      createBasicDietPreferences(),
      createBasicBodyAnalysis({ 
        current_weight_kg: 75,
        target_weight_kg: 75  // Same weight
      }),
      createBasicWorkoutPreferences()
    );
    
    expect(result.calculatedMetrics.weeklyRate).toBe(0);
    expect(result.calculatedMetrics.targetCalories).toBeCloseTo(result.calculatedMetrics.tdee, 50);
  });

  it('should handle very short person (edge of height range)', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo({ gender: 'female' }),
      createBasicDietPreferences(),
      createBasicBodyAnalysis({ 
        height_cm: 145,  // Very short
        current_weight_kg: 50,
        target_weight_kg: 45
      }),
      createBasicWorkoutPreferences()
    );
    
    expect(result.calculatedMetrics.bmr).toBeGreaterThan(0);
    expect(result.calculatedMetrics.tdee).toBeGreaterThan(0);
  });

  it('should handle very tall person', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo({ gender: 'male' }),
      createBasicDietPreferences(),
      createBasicBodyAnalysis({ 
        height_cm: 200,  // Very tall
        current_weight_kg: 100,
        target_weight_kg: 90
      }),
      createBasicWorkoutPreferences()
    );
    
    expect(result.calculatedMetrics.bmr).toBeGreaterThan(1800);
  });

  it('should handle vegan with protein allergies', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo(),
      createBasicDietPreferences({ 
        diet_type: 'vegan',
        allergies: ['soy', 'nuts', 'peanuts']
      }),
      createBasicBodyAnalysis(),
      createBasicWorkoutPreferences()
    );
    
    expect(result.warnings.some(w => w.code === 'LIMITED_VEGAN_PROTEIN')).toBe(true);
  });
});

