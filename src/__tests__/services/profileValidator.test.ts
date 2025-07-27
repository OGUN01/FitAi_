/**
 * Profile Validator Tests
 * Comprehensive test suite for profile data validation
 */

import { profileValidator } from '../../services/profileValidator';
import { PersonalInfo, FitnessGoals, DietPreferences, WorkoutPreferences } from '../../types/profileData';

describe('ProfileValidator', () => {
  // ============================================================================
  // PERSONAL INFO VALIDATION TESTS
  // ============================================================================

  describe('validatePersonalInfo', () => {
    const validPersonalInfo: Partial<PersonalInfo> = {
      name: 'John Doe',
      age: '25',
      gender: 'male',
      height: '175',
      weight: '70',
      activityLevel: 'moderate',
      email: 'john@example.com',
    };

    it('should validate correct personal info', () => {
      const result = profileValidator.validatePersonalInfo(validPersonalInfo);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require name', () => {
      const result = profileValidator.validatePersonalInfo({ ...validPersonalInfo, name: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should validate name length', () => {
      const shortName = profileValidator.validatePersonalInfo({ ...validPersonalInfo, name: 'A' });
      expect(shortName.isValid).toBe(false);
      expect(shortName.errors).toContain('Name must be at least 2 characters long');

      const longName = profileValidator.validatePersonalInfo({ 
        ...validPersonalInfo, 
        name: 'A'.repeat(51) 
      });
      expect(longName.isValid).toBe(false);
      expect(longName.errors).toContain('Name must be less than 50 characters');
    });

    it('should validate age range', () => {
      const youngAge = profileValidator.validatePersonalInfo({ ...validPersonalInfo, age: '12' });
      expect(youngAge.isValid).toBe(false);
      expect(youngAge.errors).toContain('Age must be between 13 and 120');

      const oldAge = profileValidator.validatePersonalInfo({ ...validPersonalInfo, age: '121' });
      expect(oldAge.isValid).toBe(false);
      expect(oldAge.errors).toContain('Age must be between 13 and 120');

      const invalidAge = profileValidator.validatePersonalInfo({ ...validPersonalInfo, age: 'abc' });
      expect(invalidAge.isValid).toBe(false);
      expect(invalidAge.errors).toContain('Age must be between 13 and 120');
    });

    it('should validate gender', () => {
      const result = profileValidator.validatePersonalInfo({ 
        ...validPersonalInfo, 
        gender: 'invalid' as any 
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Gender must be male, female, or other');
    });

    it('should validate height range', () => {
      const shortHeight = profileValidator.validatePersonalInfo({ ...validPersonalInfo, height: '50' });
      expect(shortHeight.isValid).toBe(false);
      expect(shortHeight.errors).toContain('Height must be between 100cm and 250cm');

      const tallHeight = profileValidator.validatePersonalInfo({ ...validPersonalInfo, height: '300' });
      expect(tallHeight.isValid).toBe(false);
      expect(tallHeight.errors).toContain('Height must be between 100cm and 250cm');
    });

    it('should validate weight range', () => {
      const lightWeight = profileValidator.validatePersonalInfo({ ...validPersonalInfo, weight: '20' });
      expect(lightWeight.isValid).toBe(false);
      expect(lightWeight.errors).toContain('Weight must be between 30kg and 300kg');

      const heavyWeight = profileValidator.validatePersonalInfo({ ...validPersonalInfo, weight: '400' });
      expect(heavyWeight.isValid).toBe(false);
      expect(heavyWeight.errors).toContain('Weight must be between 30kg and 300kg');
    });

    it('should validate email format', () => {
      const result = profileValidator.validatePersonalInfo({ 
        ...validPersonalInfo, 
        email: 'invalid-email' 
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should warn about underage users', () => {
      const result = profileValidator.validatePersonalInfo({ ...validPersonalInfo, age: '16' });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Users under 18 may need parental consent');
    });
  });

  // ============================================================================
  // FITNESS GOALS VALIDATION TESTS
  // ============================================================================

  describe('validateFitnessGoals', () => {
    const validFitnessGoals: Partial<FitnessGoals> = {
      primaryGoals: ['weight_loss', 'muscle_gain'],
      experience: 'intermediate',
      timeCommitment: '30-45 minutes',
      targetWeight: '65',
    };

    it('should validate correct fitness goals', () => {
      const result = profileValidator.validateFitnessGoals(validFitnessGoals);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require at least one primary goal', () => {
      const result = profileValidator.validateFitnessGoals({ ...validFitnessGoals, primaryGoals: [] });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one primary goal is required');
    });

    it('should warn about too many goals', () => {
      const result = profileValidator.validateFitnessGoals({ 
        ...validFitnessGoals, 
        primaryGoals: ['goal1', 'goal2', 'goal3', 'goal4', 'goal5', 'goal6'] 
      });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Having too many goals may reduce focus');
    });

    it('should require experience level', () => {
      const result = profileValidator.validateFitnessGoals({ 
        ...validFitnessGoals, 
        experience: undefined 
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Experience level is required');
    });

    it('should validate target weight range', () => {
      const result = profileValidator.validateFitnessGoals({ 
        ...validFitnessGoals, 
        targetWeight: '400' 
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Target weight must be between 30kg and 300kg');
    });
  });

  // ============================================================================
  // DIET PREFERENCES VALIDATION TESTS
  // ============================================================================

  describe('validateDietPreferences', () => {
    const validDietPreferences: Partial<DietPreferences> = {
      dietType: 'vegetarian',
      allergies: ['nuts'],
      cuisinePreferences: ['italian', 'indian'],
      restrictions: ['gluten-free'],
      cookingSkill: 'intermediate',
      mealPrepTime: 'moderate',
    };

    it('should validate correct diet preferences', () => {
      const result = profileValidator.validateDietPreferences(validDietPreferences);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require diet type', () => {
      const result = profileValidator.validateDietPreferences({ 
        ...validDietPreferences, 
        dietType: undefined 
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Diet type is required');
    });

    it('should validate diet type options', () => {
      const result = profileValidator.validateDietPreferences({ 
        ...validDietPreferences, 
        dietType: 'invalid' as any 
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid diet type');
    });

    it('should require cooking skill', () => {
      const result = profileValidator.validateDietPreferences({ 
        ...validDietPreferences, 
        cookingSkill: undefined 
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cooking skill level is required');
    });

    it('should warn about redundant restrictions', () => {
      const result = profileValidator.validateDietPreferences({ 
        ...validDietPreferences, 
        dietType: 'vegan',
        allergies: ['dairy'] 
      });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Vegan diet already excludes dairy');
    });
  });

  // ============================================================================
  // WORKOUT PREFERENCES VALIDATION TESTS
  // ============================================================================

  describe('validateWorkoutPreferences', () => {
    const validWorkoutPreferences: Partial<WorkoutPreferences> = {
      workoutType: ['strength', 'cardio'],
      equipment: ['dumbbells', 'resistance_bands'],
      location: 'gym',
      intensity: 'moderate',
      duration: '45 minutes',
      frequency: 4,
    };

    it('should validate correct workout preferences', () => {
      const result = profileValidator.validateWorkoutPreferences(validWorkoutPreferences);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require workout type', () => {
      const result = profileValidator.validateWorkoutPreferences({ 
        ...validWorkoutPreferences, 
        workoutType: [] 
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one workout type is required');
    });

    it('should validate frequency range', () => {
      const lowFreq = profileValidator.validateWorkoutPreferences({ 
        ...validWorkoutPreferences, 
        frequency: 0 
      });
      expect(lowFreq.isValid).toBe(false);
      expect(lowFreq.errors).toContain('Workout frequency must be between 1 and 7 days per week');

      const highFreq = profileValidator.validateWorkoutPreferences({ 
        ...validWorkoutPreferences, 
        frequency: 8 
      });
      expect(highFreq.isValid).toBe(false);
      expect(highFreq.errors).toContain('Workout frequency must be between 1 and 7 days per week');
    });

    it('should warn about overtraining', () => {
      const result = profileValidator.validateWorkoutPreferences({ 
        ...validWorkoutPreferences, 
        frequency: 7 
      });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Training 7 days a week may lead to overtraining');
    });

    it('should warn about equipment mismatch', () => {
      const result = profileValidator.validateWorkoutPreferences({ 
        ...validWorkoutPreferences, 
        location: 'home',
        equipment: ['heavy_weights'] 
      });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Heavy weights may not be suitable for home workouts');
    });
  });

  // ============================================================================
  // PROFILE COMPLETENESS TESTS
  // ============================================================================

  describe('calculateProfileCompleteness', () => {
    it('should calculate 100% for complete profile', () => {
      const completeProfile = {
        personalInfo: {
          name: 'John Doe',
          age: '25',
          gender: 'male' as const,
          height: '175',
          weight: '70',
          activityLevel: 'moderate' as const,
        },
        fitnessGoals: {
          primaryGoals: ['weight_loss'],
          experience: 'intermediate' as const,
          timeCommitment: '30 minutes',
        },
        dietPreferences: {
          dietType: 'vegetarian' as const,
          cookingSkill: 'intermediate' as const,
          mealPrepTime: 'moderate' as const,
        },
        workoutPreferences: {
          workoutType: ['strength'],
          equipment: ['dumbbells'],
          location: 'gym' as const,
          intensity: 'moderate' as const,
          duration: '45 minutes',
        },
      };

      const completeness = profileValidator.calculateProfileCompleteness(completeProfile);
      expect(completeness).toBe(100);
    });

    it('should calculate partial completeness', () => {
      const partialProfile = {
        personalInfo: {
          name: 'John Doe',
          age: '25',
          gender: 'male' as const,
          height: '175',
          weight: '70',
          activityLevel: 'moderate' as const,
        },
      };

      const completeness = profileValidator.calculateProfileCompleteness(partialProfile);
      expect(completeness).toBe(40); // Only personal info (40 points)
    });

    it('should calculate 0% for empty profile', () => {
      const completeness = profileValidator.calculateProfileCompleteness({});
      expect(completeness).toBe(0);
    });
  });
});
