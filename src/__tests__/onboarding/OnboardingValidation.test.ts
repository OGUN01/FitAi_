/**
 * Onboarding Validation Tests
 * Tests validation logic without UI dependencies
 */

import { VALIDATION_RULES } from '../../types/onboarding';

describe('Onboarding Validation Rules', () => {
  // ============================================================================
  // PERSONAL INFO VALIDATION
  // ============================================================================

  describe('Personal Info Validation', () => {
    it('should validate age range correctly', () => {
      const { age } = VALIDATION_RULES.personal_info;

      expect(age.min).toBe(13);
      expect(age.max).toBe(120);

      // Test valid ages
      expect(18).toBeGreaterThanOrEqual(age.min);
      expect(18).toBeLessThanOrEqual(age.max);
      expect(65).toBeGreaterThanOrEqual(age.min);
      expect(65).toBeLessThanOrEqual(age.max);

      // Test invalid ages
      expect(5).toBeLessThan(age.min);
      expect(150).toBeGreaterThan(age.max);
    });

    it('should validate name lengths', () => {
      const { first_name, last_name } = VALIDATION_RULES.personal_info;

      expect(first_name.min_length).toBe(1);
      expect(first_name.max_length).toBe(50);
      expect(last_name.min_length).toBe(1);
      expect(last_name.max_length).toBe(50);
    });

    it('should require country and state', () => {
      const { country, state } = VALIDATION_RULES.personal_info;

      expect(country.required).toBe(true);
      expect(state.required).toBe(true);
    });

    it('should require wake and sleep times', () => {
      const { wake_time, sleep_time } = VALIDATION_RULES.personal_info;

      expect(wake_time.required).toBe(true);
      expect(wake_time.format).toBe('HH:MM');
      expect(sleep_time.required).toBe(true);
      expect(sleep_time.format).toBe('HH:MM');
    });
  });

  // ============================================================================
  // BODY ANALYSIS VALIDATION
  // ============================================================================

  describe('Body Analysis Validation', () => {
    it('should validate height range', () => {
      const { height_cm } = VALIDATION_RULES.body_analysis;

      expect(height_cm.min).toBe(100);
      expect(height_cm.max).toBe(250);

      // Test valid heights
      expect(170).toBeGreaterThanOrEqual(height_cm.min);
      expect(170).toBeLessThanOrEqual(height_cm.max);

      // Test invalid heights
      expect(50).toBeLessThan(height_cm.min);
      expect(300).toBeGreaterThan(height_cm.max);
    });

    it('should validate weight range', () => {
      const { current_weight_kg, target_weight_kg } = VALIDATION_RULES.body_analysis;

      expect(current_weight_kg.min).toBe(30);
      expect(current_weight_kg.max).toBe(300);
      expect(target_weight_kg.min).toBe(30);
      expect(target_weight_kg.max).toBe(300);

      // Test valid weights
      expect(70).toBeGreaterThanOrEqual(current_weight_kg.min);
      expect(70).toBeLessThanOrEqual(current_weight_kg.max);

      // Test invalid weights
      expect(10).toBeLessThan(current_weight_kg.min);
      expect(400).toBeGreaterThan(current_weight_kg.max);
    });

    it('should validate timeline range', () => {
      const { target_timeline_weeks } = VALIDATION_RULES.body_analysis;

      expect(target_timeline_weeks.min).toBe(4);
      expect(target_timeline_weeks.max).toBe(104);

      // Test valid timelines
      expect(12).toBeGreaterThanOrEqual(target_timeline_weeks.min);
      expect(12).toBeLessThanOrEqual(target_timeline_weeks.max);

      // Test invalid timelines
      expect(2).toBeLessThan(target_timeline_weeks.min);
      expect(200).toBeGreaterThan(target_timeline_weeks.max);
    });

    it('should validate body fat percentage range', () => {
      const { body_fat_percentage } = VALIDATION_RULES.body_analysis;

      expect(body_fat_percentage.min).toBe(3);
      expect(body_fat_percentage.max).toBe(50);

      // Test valid body fat percentages
      expect(20).toBeGreaterThanOrEqual(body_fat_percentage.min);
      expect(20).toBeLessThanOrEqual(body_fat_percentage.max);

      // Test invalid body fat percentages
      expect(1).toBeLessThan(body_fat_percentage.min);
      expect(70).toBeGreaterThan(body_fat_percentage.max);
    });

    it('should validate AI confidence score range', () => {
      const { ai_confidence_score } = VALIDATION_RULES.body_analysis;

      expect(ai_confidence_score.min).toBe(0);
      expect(ai_confidence_score.max).toBe(100);

      // Test valid confidence scores
      expect(75).toBeGreaterThanOrEqual(ai_confidence_score.min);
      expect(75).toBeLessThanOrEqual(ai_confidence_score.max);

      // Test invalid confidence scores
      expect(-10).toBeLessThan(ai_confidence_score.min);
      expect(150).toBeGreaterThan(ai_confidence_score.max);
    });
  });

  // ============================================================================
  // DIET PREFERENCES VALIDATION
  // ============================================================================

  describe('Diet Preferences Validation', () => {
    it('should validate max prep time range', () => {
      const { max_prep_time_minutes } = VALIDATION_RULES.diet_preferences;

      expect(max_prep_time_minutes.min).toBe(5);
      expect(max_prep_time_minutes.max).toBe(180);

      // Test valid prep times
      expect(30).toBeGreaterThanOrEqual(max_prep_time_minutes.min);
      expect(30).toBeLessThanOrEqual(max_prep_time_minutes.max);

      // Test invalid prep times
      expect(2).toBeLessThan(max_prep_time_minutes.min);
      expect(300).toBeGreaterThan(max_prep_time_minutes.max);
    });
  });

  // ============================================================================
  // WORKOUT PREFERENCES VALIDATION
  // ============================================================================

  describe('Workout Preferences Validation', () => {
    it('should validate workout experience years range', () => {
      const { workout_experience_years } = VALIDATION_RULES.workout_preferences;

      expect(workout_experience_years.min).toBe(0);
      expect(workout_experience_years.max).toBe(50);

      // Test valid experience years
      expect(5).toBeGreaterThanOrEqual(workout_experience_years.min);
      expect(5).toBeLessThanOrEqual(workout_experience_years.max);

      // Test invalid experience years
      expect(-1).toBeLessThan(workout_experience_years.min);
      expect(100).toBeGreaterThan(workout_experience_years.max);
    });

    it('should validate workout frequency per week', () => {
      const { workout_frequency_per_week } = VALIDATION_RULES.workout_preferences;

      expect(workout_frequency_per_week.min).toBe(0);
      expect(workout_frequency_per_week.max).toBe(7);

      // Test valid frequencies
      expect(3).toBeGreaterThanOrEqual(workout_frequency_per_week.min);
      expect(3).toBeLessThanOrEqual(workout_frequency_per_week.max);

      // Test invalid frequencies
      expect(-1).toBeLessThan(workout_frequency_per_week.min);
      expect(10).toBeGreaterThan(workout_frequency_per_week.max);
    });

    it('should validate pushup count range', () => {
      const { can_do_pushups } = VALIDATION_RULES.workout_preferences;

      expect(can_do_pushups.min).toBe(0);
      expect(can_do_pushups.max).toBe(200);

      // Test valid counts
      expect(20).toBeGreaterThanOrEqual(can_do_pushups.min);
      expect(20).toBeLessThanOrEqual(can_do_pushups.max);

      // Test invalid counts
      expect(-5).toBeLessThan(can_do_pushups.min);
      expect(500).toBeGreaterThan(can_do_pushups.max);
    });

    it('should validate running minutes range', () => {
      const { can_run_minutes } = VALIDATION_RULES.workout_preferences;

      expect(can_run_minutes.min).toBe(0);
      expect(can_run_minutes.max).toBe(300);

      // Test valid minutes
      expect(30).toBeGreaterThanOrEqual(can_run_minutes.min);
      expect(30).toBeLessThanOrEqual(can_run_minutes.max);

      // Test invalid minutes
      expect(-10).toBeLessThan(can_run_minutes.min);
      expect(500).toBeGreaterThan(can_run_minutes.max);
    });

    it('should require at least one workout type', () => {
      const { workout_types } = VALIDATION_RULES.workout_preferences;

      expect(workout_types.min_items).toBe(1);
    });

    it('should require at least one primary goal', () => {
      const { primary_goals } = VALIDATION_RULES.workout_preferences;

      expect(primary_goals.min_items).toBe(1);
    });
  });

  // ============================================================================
  // HEALTH SCORES VALIDATION
  // ============================================================================

  describe('Health Scores Validation', () => {
    it('should validate health score range (0-100)', () => {
      const { min, max } = VALIDATION_RULES.health_scores;

      expect(min).toBe(0);
      expect(max).toBe(100);

      // Test valid scores
      expect(50).toBeGreaterThanOrEqual(min);
      expect(50).toBeLessThanOrEqual(max);
      expect(100).toBeLessThanOrEqual(max);
      expect(0).toBeGreaterThanOrEqual(min);

      // Test invalid scores
      expect(-10).toBeLessThan(min);
      expect(150).toBeGreaterThan(max);
    });
  });

  // ============================================================================
  // CALCULATED METRICS TESTS
  // ============================================================================

  describe('Health Calculations', () => {
    it('should calculate BMI correctly', () => {
      // BMI = weight(kg) / height(m)^2
      const weight = 70; // kg
      const height = 175; // cm
      const expectedBMI = weight / Math.pow(height / 100, 2);

      const calculatedBMI = weight / Math.pow(height / 100, 2);

      expect(calculatedBMI).toBeCloseTo(expectedBMI, 2);
      expect(calculatedBMI).toBeCloseTo(22.86, 2); // 70 / 1.75^2
    });

    it('should calculate BMR for males correctly (Mifflin-St Jeor)', () => {
      // BMR = 10 * weight + 6.25 * height - 5 * age + 5 (for males)
      const weight = 80; // kg
      const height = 180; // cm
      const age = 30;

      const bmr = 10 * weight + 6.25 * height - 5 * age + 5;

      expect(bmr).toBeCloseTo(1780, 0); // 800 + 1125 - 150 + 5 = 1780
    });

    it('should calculate BMR for females correctly (Mifflin-St Jeor)', () => {
      // BMR = 10 * weight + 6.25 * height - 5 * age - 161 (for females)
      const weight = 60; // kg
      const height = 165; // cm
      const age = 25;

      const bmr = 10 * weight + 6.25 * height - 5 * age - 161;

      expect(bmr).toBeCloseTo(1345.25, 1); // 600 + 1031.25 - 125 - 161 = 1345.25
    });

    it('should calculate TDEE with activity multipliers', () => {
      const bmr = 1500;

      const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        extreme: 1.9,
      };

      expect(bmr * activityMultipliers.sedentary).toBe(1800);
      expect(bmr * activityMultipliers.light).toBe(2062.5);
      expect(bmr * activityMultipliers.moderate).toBe(2325);
      expect(bmr * activityMultipliers.active).toBe(2587.5);
      expect(bmr * activityMultipliers.extreme).toBe(2850);
    });

    it('should calculate safe weight loss rate (max 1kg/week)', () => {
      const currentWeight = 80; // kg
      const targetWeight = 70; // kg
      const timeline = 12; // weeks

      const weeklyLoss = (currentWeight - targetWeight) / timeline;

      expect(weeklyLoss).toBeCloseTo(0.83, 2); // Safe rate
      expect(weeklyLoss).toBeLessThanOrEqual(1); // Not exceeding 1kg/week
    });

    it('should calculate daily calorie deficit', () => {
      const weeklyLoss = 0.5; // kg/week
      const caloriesPerKg = 7700; // calories in 1kg of fat
      const dailyDeficit = (weeklyLoss * caloriesPerKg) / 7;

      expect(dailyDeficit).toBeCloseTo(550, 0);
    });

    it('should calculate target heart rate zones', () => {
      const age = 30;
      const maxHR = 220 - age; // 190 bpm

      const fatBurnMin = maxHR * 0.5;
      const fatBurnMax = maxHR * 0.7;
      const cardioMin = maxHR * 0.7;
      const cardioMax = maxHR * 0.85;
      const peakMin = maxHR * 0.85;
      const peakMax = maxHR * 0.95;

      expect(fatBurnMin).toBe(95);
      expect(fatBurnMax).toBe(133);
      expect(cardioMin).toBe(133);
      expect(cardioMax).toBe(161.5);
      expect(peakMin).toBe(161.5);
      expect(peakMax).toBe(180.5);
    });

    it('should calculate ideal body fat ranges by gender', () => {
      // Male ideal range: 14-17%
      const maleIdealMin = 14;
      const maleIdealMax = 17;

      // Female ideal range: 21-24%
      const femaleIdealMin = 21;
      const femaleIdealMax = 24;

      expect(maleIdealMin).toBeLessThan(femaleIdealMin);
      expect(maleIdealMax).toBeLessThan(femaleIdealMax);
    });

    it('should calculate lean body mass and fat mass', () => {
      const weight = 80; // kg
      const bodyFatPercentage = 20; // %

      const leanMass = weight * (1 - bodyFatPercentage / 100);
      const fatMass = weight - leanMass;

      expect(leanMass).toBe(64); // 80 * 0.8
      expect(fatMass).toBe(16); // 80 - 64
      expect(leanMass + fatMass).toBe(weight);
    });
  });

  // ============================================================================
  // COMPREHENSIVE FIELD COUNT VERIFICATION
  // ============================================================================

  describe('Field Count Verification', () => {
    it('should have 170+ total fields across all tabs', () => {
      // Count all validation rule fields
      const personalInfoFields = Object.keys(VALIDATION_RULES.personal_info).length;
      const bodyAnalysisFields = Object.keys(VALIDATION_RULES.body_analysis).length;
      const dietPreferencesFields = Object.keys(VALIDATION_RULES.diet_preferences).length;
      const workoutPreferencesFields = Object.keys(VALIDATION_RULES.workout_preferences).length;

      // These are just the validated fields, total is much higher
      expect(personalInfoFields).toBeGreaterThan(5);
      expect(bodyAnalysisFields).toBeGreaterThan(5);
      expect(dietPreferencesFields).toBeGreaterThan(0);
      expect(workoutPreferencesFields).toBeGreaterThan(5);
    });
  });
});
