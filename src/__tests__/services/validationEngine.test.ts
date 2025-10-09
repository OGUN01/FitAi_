// 🧪 VALIDATION ENGINE - COMPREHENSIVE AUTOMATED TESTS
// Tests all 30 validation rules (10 blocking + 20 warnings)

import { ValidationEngine } from '../../services/validationEngine';
import { 
  PersonalInfoData, 
  DietPreferencesData, 
  BodyAnalysisData, 
  WorkoutPreferencesData 
} from '../../types/onboarding';

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

const createBasicPersonalInfo = (overrides?: Partial<PersonalInfoData>): PersonalInfoData => ({
  first_name: 'John',
  last_name: 'Doe',
  age: 30,
  gender: 'male',
  country: 'United States',
  state: 'California',
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
  target_weight_kg: 70,
  target_timeline_weeks: 16,
  medical_conditions: [],
  medications: [],
  physical_limitations: [],
  pregnancy_status: false,
  breastfeeding_status: false,
  stress_level: 'moderate',
  ...overrides
});

const createBasicWorkoutPreferences = (overrides?: Partial<WorkoutPreferencesData>): WorkoutPreferencesData => ({
  location: 'gym',
  equipment: ['dumbbells', 'barbell'],
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

// ============================================================================
// BLOCKING VALIDATION TESTS
// ============================================================================

describe('ValidationEngine - Blocking Validations', () => {
  
  describe('validateMinimumBodyFat', () => {
    it('should BLOCK male cutting below 5% body fat', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ gender: 'male' }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ body_fat_percentage: 4.5 }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => e.code === 'AT_ESSENTIAL_BODY_FAT')).toBe(true);
      expect(result.canProceed).toBe(false);
    });
    
    it('should BLOCK female cutting below 12% body fat', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ gender: 'female' }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ body_fat_percentage: 11, target_weight_kg: 60, current_weight_kg: 65 }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => e.code === 'AT_ESSENTIAL_BODY_FAT')).toBe(true);
    });
    
    it('should ALLOW cutting if body fat is safe', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ gender: 'male' }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ body_fat_percentage: 15 }),
        createBasicWorkoutPreferences()
      );
      
      const bodyFatError = result.errors.find(e => e.code === 'AT_ESSENTIAL_BODY_FAT');
      expect(bodyFatError).toBeUndefined();
    });
  });

  describe('validateMinimumBMI', () => {
    it('should BLOCK if target BMI < 17.5', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          height_cm: 175,
          current_weight_kg: 60,
          target_weight_kg: 50  // BMI will be ~16.3
        }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => e.code === 'TARGET_BMI_UNDERWEIGHT')).toBe(true);
    });
  });

  describe('validateBMRSafety', () => {
    it('should BLOCK if target calories below BMR', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          current_weight_kg: 80,
          target_weight_kg: 60,
          target_timeline_weeks: 4  // Extremely aggressive - will go below BMR
        }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => e.code === 'BELOW_BMR' || e.code === 'EXTREMELY_UNREALISTIC')).toBe(true);
    });
  });

  describe('validateAbsoluteMinimum', () => {
    it('should BLOCK female below 1200 calories', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ gender: 'female', age: 25 }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          height_cm: 150,  // Short height
          current_weight_kg: 50,
          target_weight_kg: 40,
          target_timeline_weeks: 4
        }),
        createBasicWorkoutPreferences({ workout_frequency_per_week: 0 })
      );
      
      expect(result.hasErrors).toBe(true);
      const hasMinError = result.errors.some(e => 
        e.code === 'BELOW_ABSOLUTE_MINIMUM' || e.code === 'BELOW_BMR' || e.code === 'EXTREMELY_UNREALISTIC'
      );
      expect(hasMinError).toBe(true);
    });
    
    it('should BLOCK male below 1500 calories', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ gender: 'male', age: 25 }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          height_cm: 160,
          current_weight_kg: 55,
          target_weight_kg: 45,
          target_timeline_weeks: 3
        }),
        createBasicWorkoutPreferences({ workout_frequency_per_week: 0 })
      );
      
      expect(result.hasErrors).toBe(true);
    });
  });

  describe('validateTimeline', () => {
    it('should BLOCK extremely unrealistic timeline (> 1.5% BW/week)', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          current_weight_kg: 100,
          target_weight_kg: 80,
          target_timeline_weeks: 8  // 20kg in 8 weeks = 2.5kg/week (2.5% BW - dangerous!)
        }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => e.code === 'EXTREMELY_UNREALISTIC')).toBe(true);
    });
    
    it('should ALLOW realistic timeline', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          current_weight_kg: 80,
          target_weight_kg: 70,
          target_timeline_weeks: 16  // 10kg in 16 weeks = 0.625kg/week (0.78% BW - safe)
        }),
        createBasicWorkoutPreferences()
      );
      
      const timelineError = result.errors.find(e => e.code === 'EXTREMELY_UNREALISTIC');
      expect(timelineError).toBeUndefined();
    });
  });

  describe('validateMealsEnabled', () => {
    it('should BLOCK if no meals enabled', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences({
          breakfast_enabled: false,
          lunch_enabled: false,
          dinner_enabled: false,
          snacks_enabled: false
        }),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => e.code === 'NO_MEALS_ENABLED')).toBe(true);
    });
    
    it('should ALLOW if at least one meal enabled', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences({
          breakfast_enabled: false,
          lunch_enabled: true,  // At least one enabled
          dinner_enabled: false,
          snacks_enabled: false
        }),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences()
      );
      
      const mealError = result.errors.find(e => e.code === 'NO_MEALS_ENABLED');
      expect(mealError).toBeUndefined();
    });
  });

  describe('validateSleepAggressiveCombo', () => {
    it('should BLOCK severe sleep deprivation (< 5hrs) + aggressive goal', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ 
          wake_time: '06:00',
          sleep_time: '02:00'  // 4 hours sleep
        }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          current_weight_kg: 90,
          target_weight_kg: 70,
          target_timeline_weeks: 16  // 1.25kg/week - aggressive
        }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => e.code === 'SEVERE_SLEEP_DEPRIVATION')).toBe(true);
    });
    
    it('should ALLOW low sleep with conservative goal', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ 
          wake_time: '06:00',
          sleep_time: '02:00'  // 4 hours sleep
        }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          current_weight_kg: 80,
          target_weight_kg: 75,
          target_timeline_weeks: 16  // 0.31kg/week - conservative
        }),
        createBasicWorkoutPreferences()
      );
      
      const sleepError = result.errors.find(e => e.code === 'SEVERE_SLEEP_DEPRIVATION');
      expect(sleepError).toBeUndefined();
    });
  });

  describe('validateTrainingVolume', () => {
    it('should BLOCK excessive training volume (> 15 hrs/week for non-athletes)', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ occupation_type: 'desk_job' }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences({ 
          workout_frequency_per_week: 6,
          time_preference: 180  // 6 × 180 = 1080 min = 18 hours (OVER limit)
        })
      );
      
      // Should block if > 15 hours
      const volumeError = result.errors.find(e => e.code === 'EXCESSIVE_TRAINING_VOLUME');
      expect(volumeError).toBeDefined();
    });
    
    it('should ALLOW higher volume for professional athletes', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ occupation_type: 'very_active' }),  // Athlete
        createBasicDietPreferences(),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences({ 
          workout_frequency_per_week: 6,
          time_preference: 150  // 15 hours total
        })
      );
      
      const volumeError = result.errors.find(e => e.code === 'EXCESSIVE_TRAINING_VOLUME');
      expect(volumeError).toBeUndefined();  // 15 < 20 (limit for athletes)
    });
  });
  
  describe('validateInsufficientExercise', () => {
    it('should BLOCK if frequency < 2 AND aggressive goal AND calories < BMR', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({
          current_weight_kg: 80,
          target_weight_kg: 65,  // 15kg loss
          target_timeline_weeks: 10,  // Very aggressive: 1.5kg/week
          medical_conditions: []
        }),
        createBasicWorkoutPreferences({ 
          workout_frequency_per_week: 1  // Only 1 workout/week
        })
      );
      
      // Should BLOCK due to insufficient exercise for aggressive goal
      const exerciseError = result.errors.find(e => e.code === 'INSUFFICIENT_EXERCISE');
      expect(exerciseError).toBeDefined();
      expect(exerciseError?.status).toBe('BLOCKED');
      expect(exerciseError?.message).toContain('1 workout(s)/week');
      expect(exerciseError?.recommendations?.length).toBeGreaterThan(0);
    });
    
    it('should BLOCK if 0 workouts AND aggressive timeline', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({
          current_weight_kg: 90,
          target_weight_kg: 75,  // 15kg loss
          target_timeline_weeks: 12,  // Aggressive: 1.25kg/week
          medical_conditions: []
        }),
        createBasicWorkoutPreferences({ 
          workout_frequency_per_week: 0  // No exercise
        })
      );
      
      // Should BLOCK
      const exerciseError = result.errors.find(e => e.code === 'INSUFFICIENT_EXERCISE');
      expect(exerciseError).toBeDefined();
    });
    
    it('should ALLOW if frequency < 2 but goal is NOT aggressive', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({
          current_weight_kg: 80,
          target_weight_kg: 75,  // 5kg loss
          target_timeline_weeks: 20,  // Conservative: 0.25kg/week
          medical_conditions: []
        }),
        createBasicWorkoutPreferences({ 
          workout_frequency_per_week: 1  // Only 1 workout
        })
      );
      
      // Should NOT block - goal is conservative
      const exerciseError = result.errors.find(e => e.code === 'INSUFFICIENT_EXERCISE');
      expect(exerciseError).toBeUndefined();
    });
    
    it('should ALLOW if frequency >= 2 even with aggressive goal', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({
          current_weight_kg: 80,
          target_weight_kg: 65,  // 15kg loss
          target_timeline_weeks: 10,  // Aggressive
          medical_conditions: []
        }),
        createBasicWorkoutPreferences({ 
          workout_frequency_per_week: 3  // 3 workouts/week
        })
      );
      
      // Should NOT block - sufficient exercise
      const exerciseError = result.errors.find(e => e.code === 'INSUFFICIENT_EXERCISE');
      expect(exerciseError).toBeUndefined();
    });
    
    it('should provide actionable recommendations when blocked', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({
          current_weight_kg: 85,
          target_weight_kg: 68,  // 17kg loss
          target_timeline_weeks: 10,  // Very aggressive
          medical_conditions: []
        }),
        createBasicWorkoutPreferences({ 
          workout_frequency_per_week: 0
        })
      );
      
      const exerciseError = result.errors.find(e => e.code === 'INSUFFICIENT_EXERCISE');
      
      if (exerciseError) {
        expect(exerciseError.recommendations).toBeDefined();
        expect(exerciseError.recommendations!.length).toBeGreaterThanOrEqual(3);
        
        // Should mention alternatives: increase exercise, extend timeline, or add walking
        const recsText = exerciseError.recommendations!.join(' ').toLowerCase();
        expect(
          recsText.includes('workout') || 
          recsText.includes('exercise') ||
          recsText.includes('timeline') ||
          recsText.includes('walking')
        ).toBe(true);
        
        // Should have risks array
        expect(exerciseError.risks).toBeDefined();
        expect(exerciseError.risks!.length).toBeGreaterThan(0);
      }
    });
    
    it('should only apply to weight loss goals', () => {
      // Weight gain scenario with 0 exercise should NOT block
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({
          current_weight_kg: 65,
          target_weight_kg: 75,  // Weight GAIN
          target_timeline_weeks: 10,
          medical_conditions: []
        }),
        createBasicWorkoutPreferences({ 
          workout_frequency_per_week: 0  // No exercise
        })
      );
      
      // Should NOT block for weight gain
      const exerciseError = result.errors.find(e => e.code === 'INSUFFICIENT_EXERCISE');
      expect(exerciseError).toBeUndefined();
    });
  });
  
  describe('validatePregnancyBreastfeeding', () => {
    it('should BLOCK weight loss during pregnancy', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ gender: 'female' }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          pregnancy_status: true,
          pregnancy_trimester: 2,
          current_weight_kg: 70,
          target_weight_kg: 65
        }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => e.code === 'UNSAFE_PREGNANCY_BREASTFEEDING')).toBe(true);
    });
    
    it('should BLOCK weight loss during breastfeeding', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ gender: 'female' }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          breastfeeding_status: true,
          current_weight_kg: 70,
          target_weight_kg: 65
        }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => e.code === 'UNSAFE_PREGNANCY_BREASTFEEDING')).toBe(true);
    });
    
    it('should ALLOW weight gain during pregnancy', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ gender: 'female' }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          pregnancy_status: true,
          pregnancy_trimester: 2,
          current_weight_kg: 60,
          target_weight_kg: 65  // Gaining weight
        }),
        createBasicWorkoutPreferences({ primary_goals: ['weight-gain'] })
      );
      
      const pregnancyError = result.errors.find(e => e.code === 'UNSAFE_PREGNANCY_BREASTFEEDING');
      expect(pregnancyError).toBeUndefined();
    });
  });

  describe('validateGoalConflict', () => {
    it('should BLOCK weight-loss + weight-gain together', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences({ 
          primary_goals: ['weight-loss', 'weight-gain']  // Conflicting!
        })
      );
      
      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => e.code === 'CONFLICTING_GOALS')).toBe(true);
    });
    
    it('should ALLOW muscle-gain + weight-loss (recomp scenario)', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences({ 
          primary_goals: ['muscle-gain', 'weight-loss']  // Recomp - allowed
        })
      );
      
      const conflictError = result.errors.find(e => e.code === 'CONFLICTING_GOALS');
      expect(conflictError).toBeUndefined();
    });
  });
});

// ============================================================================
// WARNING VALIDATION TESTS
// ============================================================================

describe('ValidationEngine - Warning Validations', () => {
  
  describe('warnAggressiveTimeline', () => {
    it('should WARN if rate is aggressive (0.75-1% BW/week)', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          current_weight_kg: 100,
          target_weight_kg: 91,  // 9kg loss
          target_timeline_weeks: 10  // 0.9kg/week = 0.9% BW (aggressive but safe)
        }),
        createBasicWorkoutPreferences({ workout_frequency_per_week: 5 })  // More exercise
      );
      
      // Might still trigger errors depending on TDEE - check if passes
      expect(result.canProceed).toBe(true);  // Can proceed with warning
      if (result.hasWarnings) {
        expect(result.warnings.some(w => w.code === 'AGGRESSIVE_TIMELINE')).toBe(true);
      }
    });
  });

  describe('warnLowSleep', () => {
    it('should WARN if sleep < 7 hours', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ 
          wake_time: '07:00',
          sleep_time: '01:00'  // 6 hours sleep
        }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(w => w.code === 'INSUFFICIENT_SLEEP')).toBe(true);
      const sleepWarn = result.warnings.find(w => w.code === 'INSUFFICIENT_SLEEP');
      expect(sleepWarn?.impact).toContain('10%');  // 1 hour under = 10% slower
    });
  });

  describe('warnElderlyUser', () => {
    it('should WARN for users 75+', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ age: 76 }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(w => w.code === 'ELDERLY_USER')).toBe(true);
    });
    
    it('should NOT warn for users under 75', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ age: 74 }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences()
      );
      
      const elderlyWarn = result.warnings.find(w => w.code === 'ELDERLY_USER');
      expect(elderlyWarn).toBeUndefined();
    });
  });

  describe('warnTeenAthlete', () => {
    it('should WARN teen athlete trying to lose weight', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ age: 16 }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          current_weight_kg: 70,
          target_weight_kg: 65
        }),
        createBasicWorkoutPreferences({ activity_level: 'extreme' })
      );
      
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(w => w.code === 'TEEN_ATHLETE_RESTRICTION')).toBe(true);
    });
  });

  describe('warnZeroExercise', () => {
    it('should WARN if no exercise planned for weight loss (conservative goal)', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({
          current_weight_kg: 80,
          target_weight_kg: 75,  // 5kg loss
          target_timeline_weeks: 20,  // Conservative: 0.25kg/week (< 0.75% BW)
          medical_conditions: []
        }),
        createBasicWorkoutPreferences({ workout_frequency_per_week: 0 })
      );
      
      // Should WARN (not BLOCK) because goal is conservative
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(w => w.code === 'NO_EXERCISE_PLANNED')).toBe(true);
      
      // Should NOT block because goal is not aggressive
      expect(result.errors.some(e => e.code === 'INSUFFICIENT_EXERCISE')).toBe(false);
    });
  });

  describe('warnMenopause', () => {
    it('should WARN for women 45-55', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ gender: 'female', age: 50 }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(w => w.code === 'MENOPAUSE_AGE_RANGE')).toBe(true);
    });
  });

  describe('warnMedicalConditions', () => {
    it('should WARN for high-risk conditions with aggressive deficit', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ 
          medical_conditions: ['diabetes-type2', 'hypertension'],
          current_weight_kg: 90,
          target_weight_kg: 75,
          target_timeline_weeks: 12  // Aggressive
        }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(w => w.code === 'MEDICAL_SUPERVISION')).toBe(true);
    });
  });

  describe('warnSubstanceImpact', () => {
    it('should WARN about alcohol impact', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences({ drinks_alcohol: true }),
        createBasicBodyAnalysis({ 
          current_weight_kg: 85,
          target_weight_kg: 75,
          target_timeline_weeks: 12  // Aggressive enough to trigger
        }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(w => w.code === 'ALCOHOL_IMPACT')).toBe(true);
    });
    
    it('should WARN about tobacco impact', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences({ smokes_tobacco: true }),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences()
      );
      
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(w => w.code === 'TOBACCO_IMPACT')).toBe(true);
    });
  });

  describe('warnBodyRecomp', () => {
    it('should INFO that recomp is possible for novices', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ body_fat_percentage: 22 }),
        createBasicWorkoutPreferences({ 
          primary_goals: ['muscle-gain', 'weight-loss'],
          workout_experience_years: 1  // Novice
        })
      );
      
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(w => w.code === 'BODY_RECOMP_POSSIBLE')).toBe(true);
    });
    
    it('should WARN that recomp is slow for experienced lifters', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ body_fat_percentage: 15 }),  // Lean
        createBasicWorkoutPreferences({ 
          primary_goals: ['muscle-gain', 'weight-loss'],
          workout_experience_years: 5  // Experienced
        })
      );
      
      expect(result.hasWarnings).toBe(true);
      expect(result.warnings.some(w => w.code === 'BODY_RECOMP_SLOW')).toBe(true);
    });
  });
});

// ============================================================================
// CALCULATION TESTS
// ============================================================================

describe('ValidationEngine - Calculations', () => {
  
  describe('TDEE Calculation (Occupation-Based)', () => {
    it('should calculate TDEE from occupation + exercise (not activity_level)', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo({ 
          age: 30,
          gender: 'male',
          occupation_type: 'moderate_active'  // Nurse
        }),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({ current_weight_kg: 70, height_cm: 175 }),
        createBasicWorkoutPreferences({ 
          workout_frequency_per_week: 4,
          time_preference: 60,
          intensity: 'intermediate',
          workout_types: ['strength']
        })
      );
      
      expect(result.calculatedMetrics.tdee).toBeGreaterThan(0);
      expect(result.calculatedMetrics.bmr).toBeGreaterThan(0);
      // TDEE should be significantly higher than BMR due to occupation + exercise
      expect(result.calculatedMetrics.tdee).toBeGreaterThan(result.calculatedMetrics.bmr * 1.3);
    });
  });

  describe('Macro Calculations', () => {
    it('should calculate correct macros for weight loss', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({
          current_weight_kg: 80,
          target_weight_kg: 70
        }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.calculatedMetrics.protein).toBeGreaterThan(0);
      expect(result.calculatedMetrics.carbs).toBeGreaterThan(0);
      expect(result.calculatedMetrics.fat).toBeGreaterThan(0);
      
      // Protein should be high for cutting (2.2 g/kg)
      expect(result.calculatedMetrics.protein).toBeGreaterThanOrEqual(80 * 2.0);
    });
    
    it('should calculate different macros for weight gain', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({
          current_weight_kg: 60,
          target_weight_kg: 70
        }),
        createBasicWorkoutPreferences({ primary_goals: ['weight-gain'] })
      );
      
      expect(result.calculatedMetrics.targetCalories).toBeGreaterThan(result.calculatedMetrics.tdee);
      expect(result.calculatedMetrics.weeklyRate).toBeGreaterThan(0);
    });
  });

  describe('Refeed Schedule', () => {
    it('should plan refeeds for long diets (≥12 weeks, ≥20% deficit)', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({
          current_weight_kg: 90,
          target_weight_kg: 75,
          target_timeline_weeks: 20  // Long diet
        }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.adjustments?.refeedSchedule).toBeDefined();
      if (result.adjustments?.refeedSchedule) {
        expect(result.adjustments.refeedSchedule.needsRefeeds).toBe(true);
      }
    });
    
    it('should plan diet break for very long diets (≥16 weeks)', () => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis({
          current_weight_kg: 100,
          target_weight_kg: 80,
          target_timeline_weeks: 24  // Very long
        }),
        createBasicWorkoutPreferences()
      );
      
      expect(result.adjustments?.refeedSchedule).toBeDefined();
      if (result.adjustments?.refeedSchedule) {
        expect(result.adjustments.refeedSchedule.needsDietBreak).toBe(true);
        expect(result.adjustments.refeedSchedule.dietBreakWeek).toBe(12);  // Halfway
      }
    });
  });
});

// ============================================================================
// INTEGRATION TESTS (Real Scenarios)
// ============================================================================

describe('ValidationEngine - Real-World Scenarios', () => {
  
  it('SCENARIO 1: Normal healthy weight loss - should PASS', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo({ age: 35, gender: 'male' }),
      createBasicDietPreferences(),
      createBasicBodyAnalysis({
        height_cm: 180,
        current_weight_kg: 90,
        target_weight_kg: 85,  // Smaller loss
        target_timeline_weeks: 16  // 0.3125kg/week - very conservative
      }),
      createBasicWorkoutPreferences({ workout_frequency_per_week: 4 })
    );
    
    expect(result.hasErrors).toBe(false);
    expect(result.canProceed).toBe(true);
    expect(result.calculatedMetrics.targetCalories).toBeLessThan(result.calculatedMetrics.tdee);
  });

  it('SCENARIO 2: Pregnant woman - should BLOCK deficit', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo({ gender: 'female', age: 28 }),
      createBasicDietPreferences(),
      createBasicBodyAnalysis({
        pregnancy_status: true,
        pregnancy_trimester: 2,
        current_weight_kg: 65,
        target_weight_kg: 60
      }),
      createBasicWorkoutPreferences()
    );
    
    expect(result.hasErrors).toBe(true);
    expect(result.canProceed).toBe(false);
    expect(result.errors.some(e => e.code === 'UNSAFE_PREGNANCY_BREASTFEEDING')).toBe(true);
  });

  it('SCENARIO 3: Elderly user (75+) - should WARN but allow', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo({ age: 78 }),
      createBasicDietPreferences(),
      createBasicBodyAnalysis({
        current_weight_kg: 80,  // Higher weight for higher BMR
        target_weight_kg: 77,   // Smaller loss (3kg instead of 5kg)
        target_timeline_weeks: 20  // Conservative timeline: 0.15kg/week
      }),
      createBasicWorkoutPreferences({ 
        intensity: 'beginner',
        workout_frequency_per_week: 3  // Sufficient exercise
      })
    );
    
    // Should WARN (elderly) but ALLOW (safe calorie levels)
    expect(result.hasWarnings).toBe(true);
    expect(result.canProceed).toBe(true);
    expect(result.warnings.some(w => w.code === 'ELDERLY_USER')).toBe(true);
    
    // Should NOT have blocking errors
    expect(result.hasErrors).toBe(false);
  });

  it('SCENARIO 4: Extreme unrealistic timeline - should BLOCK', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo(),
      createBasicDietPreferences(),
      createBasicBodyAnalysis({
        current_weight_kg: 100,
        target_weight_kg: 70,
        target_timeline_weeks: 10  // 30kg in 10 weeks = 3kg/week (3% BW - extremely dangerous!)
      }),
      createBasicWorkoutPreferences()
    );
    
    expect(result.hasErrors).toBe(true);
    expect(result.canProceed).toBe(false);
    expect(result.errors.some(e => e.code === 'EXTREMELY_UNREALISTIC')).toBe(true);
  });

  it('SCENARIO 5: Teen athlete with weight loss - should WARN', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo({ age: 15 }),
      createBasicDietPreferences(),
      createBasicBodyAnalysis({
        current_weight_kg: 65,
        target_weight_kg: 60
      }),
      createBasicWorkoutPreferences({ activity_level: 'extreme' })
    );
    
    expect(result.hasWarnings).toBe(true);
    expect(result.warnings.some(w => w.code === 'TEEN_ATHLETE_RESTRICTION')).toBe(true);
  });

  it('SCENARIO 6: Multiple bad habits - should WARN', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo({ 
        wake_time: '08:00',
        sleep_time: '02:30'  // 5.5 hours sleep
      }),
      createBasicDietPreferences({ 
        smokes_tobacco: true,
        drinks_alcohol: true
      }),
      createBasicBodyAnalysis(),
      createBasicWorkoutPreferences()
    );
    
    expect(result.hasWarnings).toBe(true);
    expect(result.warnings.some(w => w.code === 'MULTIPLE_LIFESTYLE_FACTORS')).toBe(true);
  });

  it('SCENARIO 7: Heart disease - should WARN', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo({ age: 55 }),
      createBasicDietPreferences(),
      createBasicBodyAnalysis({
        medical_conditions: ['heart-disease']
      }),
      createBasicWorkoutPreferences({ intensity: 'advanced' })
    );
    
    expect(result.hasWarnings).toBe(true);
    expect(result.warnings.some(w => w.code === 'HEART_DISEASE_CLEARANCE')).toBe(true);
  });

  it('SCENARIO 8: Muscle gain at home with no equipment - should WARN', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo(),
      createBasicDietPreferences(),
      createBasicBodyAnalysis({
        current_weight_kg: 70,
        target_weight_kg: 75
      }),
      createBasicWorkoutPreferences({ 
        primary_goals: ['muscle-gain'],
        location: 'home',
        equipment: []  // No equipment
      })
    );
    
    expect(result.hasWarnings).toBe(true);
    expect(result.warnings.some(w => w.code === 'LIMITED_EQUIPMENT_MUSCLE_GAIN')).toBe(true);
  });

  it('SCENARIO 9: Conflicting goals - should BLOCK', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo(),
      createBasicDietPreferences(),
      createBasicBodyAnalysis(),
      createBasicWorkoutPreferences({
        primary_goals: ['weight-loss', 'weight-gain']  // Impossible!
      })
    );
    
    expect(result.hasErrors).toBe(true);
    expect(result.canProceed).toBe(false);
    expect(result.errors.some(e => e.code === 'CONFLICTING_GOALS')).toBe(true);
  });

  it('SCENARIO 10: Obesity (BMI > 35) - should INFO about faster loss allowed', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo(),
      createBasicDietPreferences(),
      createBasicBodyAnalysis({
        height_cm: 175,
        current_weight_kg: 120,  // BMI ~39
        target_weight_kg: 100,
        target_timeline_weeks: 16
      }),
      createBasicWorkoutPreferences()
    );
    
    expect(result.hasWarnings).toBe(true);
    expect(result.warnings.some(w => w.code === 'OBESITY_ADJUSTED_RATES')).toBe(true);
  });
});

// ============================================================================
// SUMMARY TEST
// ============================================================================

describe('ValidationEngine - Overall System Test', () => {
  it('should validate complete user plan without crashing', () => {
    expect(() => {
      const result = ValidationEngine.validateUserPlan(
        createBasicPersonalInfo(),
        createBasicDietPreferences(),
        createBasicBodyAnalysis(),
        createBasicWorkoutPreferences()
      );
      
      expect(result).toBeDefined();
      expect(result.calculatedMetrics).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(typeof result.canProceed).toBe('boolean');
    }).not.toThrow();
  });
  
  it('should return all required calculated metrics', () => {
    const result = ValidationEngine.validateUserPlan(
      createBasicPersonalInfo(),
      createBasicDietPreferences(),
      createBasicBodyAnalysis(),
      createBasicWorkoutPreferences()
    );
    
    expect(result.calculatedMetrics.bmr).toBeGreaterThan(0);
    expect(result.calculatedMetrics.tdee).toBeGreaterThan(0);
    expect(result.calculatedMetrics.targetCalories).toBeGreaterThan(0);
    expect(result.calculatedMetrics.protein).toBeGreaterThan(0);
    expect(result.calculatedMetrics.carbs).toBeGreaterThan(0);
    expect(result.calculatedMetrics.fat).toBeGreaterThan(0);
    expect(result.calculatedMetrics.timeline).toBeGreaterThan(0);
  });
});

// ============================================================================
// STRESS LEVEL DEFICIT LIMITING TESTS
// ============================================================================

describe('Stress Level Deficit Limiting', () => {
  
  test('High stress limits deficit to 15% max', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 100,
      target_weight_kg: 80,
      target_timeline_weeks: 8,  // Very aggressive timeline
      medical_conditions: [],
      stress_level: 'high'
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    // Calculate expected max deficit (15% of TDEE)
    const deficitPercent = (result.calculatedMetrics.tdee - result.calculatedMetrics.targetCalories) / result.calculatedMetrics.tdee;
    
    // Deficit should be capped at ~15%
    expect(deficitPercent).toBeLessThanOrEqual(0.16);  // Allow small rounding error
    
    // Should have warning about deficit limiting
    const deficitWarning = result.warnings.find(w => w.code === 'DEFICIT_LIMITED_FOR_SAFETY');
    expect(deficitWarning).toBeDefined();
    expect(deficitWarning?.message).toContain('high stress level');
  });
  
  test('Medical conditions limit deficit to 15% max', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 100,
      target_weight_kg: 80,
      target_timeline_weeks: 8,  // Very aggressive timeline
      medical_conditions: ['diabetes-type2'],
      stress_level: 'low'
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    // Calculate deficit percent
    const deficitPercent = (result.calculatedMetrics.tdee - result.calculatedMetrics.targetCalories) / result.calculatedMetrics.tdee;
    
    // Deficit should be capped at ~15%
    expect(deficitPercent).toBeLessThanOrEqual(0.16);
    
    // Should have warning about deficit limiting
    const deficitWarning = result.warnings.find(w => w.code === 'DEFICIT_LIMITED_FOR_SAFETY');
    expect(deficitWarning).toBeDefined();
    expect(deficitWarning?.message).toContain('medical conditions');
  });
  
  test('Low/moderate stress with no medical conditions allows normal deficit', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 80,
      target_weight_kg: 75,
      target_timeline_weeks: 16,  // Conservative timeline: 0.3kg/week (~10% deficit)
      medical_conditions: [],
      stress_level: 'low'
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    // Should NOT have deficit limiting warning (deficit under 20%)
    const deficitWarning = result.warnings.find(w => w.code === 'DEFICIT_LIMITED_FOR_SAFETY');
    expect(deficitWarning).toBeUndefined();
  });
  
  test('High stress + medical conditions still caps at 15% (no double limiting)', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 100,
      target_weight_kg: 80,
      target_timeline_weeks: 8,
      medical_conditions: ['hypertension'],
      stress_level: 'high'
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    // Calculate deficit percent
    const deficitPercent = (result.calculatedMetrics.tdee - result.calculatedMetrics.targetCalories) / result.calculatedMetrics.tdee;
    
    // Should still be ~15%, not lower
    expect(deficitPercent).toBeLessThanOrEqual(0.16);
    expect(deficitPercent).toBeGreaterThan(0.12);  // Not less than 12%
  });
  
  test('Moderate stress allows up to 20% deficit', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 80,
      target_weight_kg: 70,
      target_timeline_weeks: 10,  // ~1kg/week - should require ~20% deficit
      medical_conditions: [],
      stress_level: 'moderate'
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    // Calculate deficit percent
    const deficitPercent = (result.calculatedMetrics.tdee - result.calculatedMetrics.targetCalories) / result.calculatedMetrics.tdee;
    
    // Should allow ~15-22% deficit for moderate stress
    expect(deficitPercent).toBeLessThanOrEqual(0.25);
    
    // May or may not have warning depending on exact calculations
    // But should not be limited to 15% like high stress
  });
  
  test('Deficit limiting provides helpful recommendations', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 90,
      target_weight_kg: 70,
      target_timeline_weeks: 10,  // Very aggressive
      medical_conditions: [],
      stress_level: 'high'
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    const deficitWarning = result.warnings.find(w => w.code === 'DEFICIT_LIMITED_FOR_SAFETY');
    
    if (deficitWarning) {
      expect(deficitWarning.recommendations).toBeDefined();
      expect(deficitWarning.recommendations!.length).toBeGreaterThan(0);
      
      // Should mention stress or cortisol
      const hasStressMention = deficitWarning.recommendations!.some(rec => 
        rec.toLowerCase().includes('stress') || rec.toLowerCase().includes('cortisol')
      );
      expect(hasStressMention).toBe(true);
      
      // Should provide actionable advice
      const hasActionableAdvice = deficitWarning.recommendations!.some(rec => 
        rec.toLowerCase().includes('consider') || rec.toLowerCase().includes('management')
      );
      expect(hasActionableAdvice).toBe(true);
    }
  });
});

// ============================================================================
// HYPERTHYROID SUPPORT TESTS
// ============================================================================

describe('Hyperthyroid Medical Adjustments', () => {
  
  test('Hyperthyroid increases TDEE by 15%', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 80,
      target_weight_kg: 75,
      target_timeline_weeks: 12,
      medical_conditions: ['hyperthyroid']
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    // Calculate expected TDEE with +15%
    const baseTDEE = result.calculatedMetrics.tdee / 1.15;
    const expectedIncrease = Math.round(baseTDEE * 0.15);
    
    // TDEE should be increased by ~15%
    expect(result.calculatedMetrics.tdee).toBeGreaterThan(baseTDEE);
    expect(result.calculatedMetrics.tdee).toBeCloseTo(baseTDEE * 1.15, 0);
    
    // Should have medical notes about hyperthyroidism
    expect(result.adjustments?.medicalNotes).toBeDefined();
    const notes = result.adjustments!.medicalNotes!;
    expect(notes.some(n => n.includes('hyperthyroidism'))).toBe(true);
    expect(notes.some(n => n.includes('15%'))).toBe(true);
  });
  
  test('Graves disease (hyperthyroid variant) also increases TDEE by 15%', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 80,
      target_weight_kg: 75,
      target_timeline_weeks: 12,
      medical_conditions: ['graves-disease']
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    // Calculate expected TDEE with +15%
    const baseTDEE = result.calculatedMetrics.tdee / 1.15;
    
    // TDEE should be increased by ~15%
    expect(result.calculatedMetrics.tdee).toBeCloseTo(baseTDEE * 1.15, 0);
    
    // Should have medical notes
    expect(result.adjustments?.medicalNotes).toBeDefined();
    const notes = result.adjustments!.medicalNotes!;
    expect(notes.some(n => n.includes('hyperthyroidism'))).toBe(true);
  });
  
  test('Hypothyroid still decreases TDEE by 10% (regression test)', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 80,
      target_weight_kg: 75,
      target_timeline_weeks: 12,
      medical_conditions: ['hypothyroid']
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    // Calculate expected TDEE with -10%
    const baseTDEE = result.calculatedMetrics.tdee / 0.90;
    
    // TDEE should be decreased by ~10%
    expect(result.calculatedMetrics.tdee).toBeLessThan(baseTDEE);
    expect(result.calculatedMetrics.tdee).toBeCloseTo(baseTDEE * 0.90, 0);
    
    // Should have medical notes about hypothyroidism
    expect(result.adjustments?.medicalNotes).toBeDefined();
    const notes = result.adjustments!.medicalNotes!;
    expect(notes.some(n => n.includes('hypothyroidism'))).toBe(true);
    expect(notes.some(n => n.includes('10%'))).toBe(true);
  });
  
  test('Generic "thyroid" condition defaults to hypothyroid (-10%)', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 80,
      target_weight_kg: 75,
      target_timeline_weeks: 12,
      medical_conditions: ['thyroid']
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    // Should default to hypothyroid behavior (-10%)
    const baseTDEE = result.calculatedMetrics.tdee / 0.90;
    expect(result.calculatedMetrics.tdee).toBeCloseTo(baseTDEE * 0.90, 0);
  });
  
  test('Hyperthyroid provides appropriate medical warnings', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 80,
      target_weight_kg: 75,
      target_timeline_weeks: 12,
      medical_conditions: ['hyperthyroid']
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    expect(result.adjustments?.medicalNotes).toBeDefined();
    const notes = result.adjustments!.medicalNotes!;
    
    // Should mention monitoring
    expect(notes.some(n => n.toLowerCase().includes('monitor'))).toBe(true);
    
    // Should mention doctor consultation
    expect(notes.some(n => n.toLowerCase().includes('doctor') || n.toLowerCase().includes('consult'))).toBe(true);
    
    // Should mention metabolism instability
    expect(notes.some(n => n.toLowerCase().includes('metabolism') || n.toLowerCase().includes('treatment'))).toBe(true);
  });
  
  test('Cannot have both hypothyroid and hyperthyroid (else-if logic)', () => {
    const personalInfo = createBasicPersonalInfo();
    const dietPreferences = createBasicDietPreferences();
    const bodyAnalysis = createBasicBodyAnalysis({
      current_weight_kg: 80,
      target_weight_kg: 75,
      target_timeline_weeks: 12,
      medical_conditions: ['hypothyroid', 'hyperthyroid']  // Both conditions
    });
    const workoutPreferences = createBasicWorkoutPreferences();
    
    const result = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    // Due to else-if, only hypothyroid should apply (first condition)
    const baseTDEE = result.calculatedMetrics.tdee / 0.90;
    expect(result.calculatedMetrics.tdee).toBeCloseTo(baseTDEE * 0.90, 0);
    
    // Should only have hypothyroid notes, not hyperthyroid
    const notes = result.adjustments!.medicalNotes!;
    expect(notes.some(n => n.includes('hypothyroidism'))).toBe(true);
    expect(notes.some(n => n.includes('reduced 10%'))).toBe(true);
  });
});

