/**
 * Profile Validation Tests
 *
 * Tests for profileValidation.ts - comprehensive validation with NO fallbacks
 */

import {
  getRequiredField,
  getRequiredNumericField,
  getRequiredArrayField,
  validatePersonalInfo,
  validateBodyMetrics,
  validateDietPreferences,
  validateWorkoutPreferences,
  validateProfileComplete,
  validateMinimumProfile,
  validateEmail,
  validatePassword,
  validateDateOfBirth,
  combineValidationResults,
  hasCriticalErrors,
  formatValidationErrors,
} from '../profileValidation';

describe('profileValidation', () => {
  // ==================== REQUIRED FIELD HELPERS ====================

  describe('getRequiredField', () => {
    it('should return value when present', () => {
      expect(getRequiredField('John', 'first_name')).toBe('John');
      expect(getRequiredField(123, 'age')).toBe(123);
      expect(getRequiredField(true, 'flag')).toBe(true);
    });

    it('should throw error when value is null', () => {
      expect(() => getRequiredField(null, 'first_name')).toThrow(
        'Required field missing: first_name'
      );
    });

    it('should throw error when value is undefined', () => {
      expect(() => getRequiredField(undefined, 'first_name')).toThrow(
        'Required field missing: first_name'
      );
    });

    it('should throw error when value is empty string', () => {
      expect(() => getRequiredField('', 'first_name')).toThrow(
        'Required field missing: first_name'
      );
    });

    it('should include context in error message', () => {
      expect(() => getRequiredField(null, 'first_name', 'UserProfile')).toThrow(
        'Required field missing: first_name (UserProfile)'
      );
    });
  });

  describe('getRequiredNumericField', () => {
    it('should return value when valid', () => {
      expect(getRequiredNumericField(25, 'age', 13, 120)).toBe(25);
      expect(getRequiredNumericField(175, 'height_cm', 100, 250)).toBe(175);
    });

    it('should throw error when value is null', () => {
      expect(() => getRequiredNumericField(null, 'age', 13, 120)).toThrow(
        'Required numeric field missing: age'
      );
    });

    it('should throw error when value is undefined', () => {
      expect(() => getRequiredNumericField(undefined, 'age', 13, 120)).toThrow(
        'Required numeric field missing: age'
      );
    });

    it('should throw error when value is not a number', () => {
      expect(() => getRequiredNumericField('25' as any, 'age', 13, 120)).toThrow(
        'Invalid numeric value for age: expected number, got string'
      );
    });

    it('should throw error when value is NaN', () => {
      expect(() => getRequiredNumericField(NaN, 'age', 13, 120)).toThrow(
        'Invalid numeric value for age: expected number, got number'
      );
    });

    it('should throw error when value is below minimum', () => {
      expect(() => getRequiredNumericField(10, 'age', 13, 120)).toThrow(
        'age must be between 13 and 120, got 10'
      );
    });

    it('should throw error when value is above maximum', () => {
      expect(() => getRequiredNumericField(150, 'age', 13, 120)).toThrow(
        'age must be between 13 and 120, got 150'
      );
    });

    it('should include context in error message', () => {
      expect(() => getRequiredNumericField(null, 'age', 13, 120, 'Validation')).toThrow(
        'Required numeric field missing: age (Validation)'
      );
    });
  });

  describe('getRequiredArrayField', () => {
    it('should return value when valid', () => {
      const arr = ['item1', 'item2'];
      expect(getRequiredArrayField(arr, 'items')).toBe(arr);
    });

    it('should throw error when value is null', () => {
      expect(() => getRequiredArrayField(null, 'items')).toThrow(
        'Required array field missing: items'
      );
    });

    it('should throw error when value is undefined', () => {
      expect(() => getRequiredArrayField(undefined, 'items')).toThrow(
        'Required array field missing: items'
      );
    });

    it('should throw error when value is not an array', () => {
      expect(() => getRequiredArrayField({} as any, 'items')).toThrow(
        'Invalid array value for items: expected array, got object'
      );
    });

    it('should throw error when array length is below minimum', () => {
      expect(() => getRequiredArrayField([], 'items', 1)).toThrow(
        'items must have at least 1 items, got 0'
      );
    });

    it('should accept array meeting minimum length', () => {
      const arr = ['item'];
      expect(getRequiredArrayField(arr, 'items', 1)).toBe(arr);
    });
  });

  // ==================== SECTION VALIDATORS ====================

  describe('validatePersonalInfo', () => {
    const validPersonalInfo = {
      first_name: 'John',
      last_name: 'Doe',
      age: 25,
      gender: 'male',
    };

    it('should validate valid personal info', () => {
      const result = validatePersonalInfo(validPersonalInfo);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null personal info', () => {
      const result = validatePersonalInfo(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Personal information is completely missing');
    });

    it('should reject missing first name', () => {
      const result = validatePersonalInfo({
        ...validPersonalInfo,
        first_name: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('first_name');
      expect(result.errors).toContain('First name is required (Personal Info)');
    });

    it('should reject missing last name', () => {
      const result = validatePersonalInfo({
        ...validPersonalInfo,
        last_name: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('last_name');
    });

    it('should reject invalid age (too young)', () => {
      const result = validatePersonalInfo({
        ...validPersonalInfo,
        age: 10,
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('age');
      expect(result.errors).toContain('Age must be between 13 and 120 (Personal Info)');
    });

    it('should reject invalid age (too old)', () => {
      const result = validatePersonalInfo({
        ...validPersonalInfo,
        age: 150,
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('age');
    });

    it('should reject invalid gender', () => {
      const result = validatePersonalInfo({
        ...validPersonalInfo,
        gender: 'invalid',
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('gender');
      expect(result.errors).toContain('Gender must be one of: male, female, other (Personal Info)');
    });

    it('should accept valid gender values', () => {
      expect(validatePersonalInfo({ ...validPersonalInfo, gender: 'male' }).isValid).toBe(true);
      expect(validatePersonalInfo({ ...validPersonalInfo, gender: 'female' }).isValid).toBe(true);
      expect(validatePersonalInfo({ ...validPersonalInfo, gender: 'other' }).isValid).toBe(true);
    });
  });

  describe('validateBodyMetrics', () => {
    const validBodyMetrics = {
      height_cm: 175,
      current_weight_kg: 70,
    };

    it('should validate valid body metrics', () => {
      const result = validateBodyMetrics(validBodyMetrics);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null body metrics', () => {
      const result = validateBodyMetrics(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Body metrics are completely missing');
    });

    it('should reject invalid height (too short)', () => {
      const result = validateBodyMetrics({
        ...validBodyMetrics,
        height_cm: 50,
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('height_cm');
      expect(result.errors).toContain('Height must be between 100 and 250 cm (Body Metrics)');
    });

    it('should reject invalid height (too tall)', () => {
      const result = validateBodyMetrics({
        ...validBodyMetrics,
        height_cm: 300,
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('height_cm');
    });

    it('should reject invalid weight (too light)', () => {
      const result = validateBodyMetrics({
        ...validBodyMetrics,
        current_weight_kg: 20,
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('current_weight_kg');
      expect(result.errors).toContain('Weight must be between 30 and 300 kg (Body Metrics)');
    });

    it('should reject invalid weight (too heavy)', () => {
      const result = validateBodyMetrics({
        ...validBodyMetrics,
        current_weight_kg: 350,
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('current_weight_kg');
    });
  });

  describe('validateDietPreferences', () => {
    const validDietPrefs = {
      diet_type: 'balanced',
      allergies: ['peanuts'],
      dietary_restrictions: ['vegetarian'],
      disliked_foods: ['broccoli'],
    };

    it('should validate valid diet preferences', () => {
      const result = validateDietPreferences(validDietPrefs);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null diet preferences', () => {
      const result = validateDietPreferences(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Diet preferences are completely missing');
    });

    it('should reject missing diet type', () => {
      const result = validateDietPreferences({
        ...validDietPrefs,
        diet_type: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('diet_type');
      expect(result.errors).toContain('Diet type is required (Diet Preferences)');
    });

    it('should reject non-array allergies', () => {
      const result = validateDietPreferences({
        ...validDietPrefs,
        allergies: 'peanuts' as any,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Allergies must be an array');
    });

    it('should reject non-array dietary_restrictions', () => {
      const result = validateDietPreferences({
        ...validDietPrefs,
        dietary_restrictions: 'vegetarian' as any,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dietary restrictions must be an array');
    });

    it('should accept valid diet preferences with empty arrays', () => {
      const result = validateDietPreferences({
        diet_type: 'balanced',
        allergies: [],
        dietary_restrictions: [],
        disliked_foods: [],
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateWorkoutPreferences', () => {
    const validWorkoutPrefs = {
      fitness_level: 'intermediate',
      workout_days_per_week: 4,
      preferred_workout_types: ['strength', 'cardio'],
      available_equipment: ['dumbbells', 'barbell'],
    };

    it('should validate valid workout preferences', () => {
      const result = validateWorkoutPreferences(validWorkoutPrefs);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null workout preferences', () => {
      const result = validateWorkoutPreferences(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Workout preferences are completely missing');
    });

    it('should reject invalid fitness level', () => {
      const result = validateWorkoutPreferences({
        ...validWorkoutPrefs,
        fitness_level: 'expert',
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('fitness_level');
    });

    it('should accept valid fitness levels', () => {
      expect(validateWorkoutPreferences({ ...validWorkoutPrefs, fitness_level: 'beginner' }).isValid).toBe(true);
      expect(validateWorkoutPreferences({ ...validWorkoutPrefs, fitness_level: 'intermediate' }).isValid).toBe(true);
      expect(validateWorkoutPreferences({ ...validWorkoutPrefs, fitness_level: 'advanced' }).isValid).toBe(true);
    });

    it('should reject invalid workout days (too few)', () => {
      const result = validateWorkoutPreferences({
        ...validWorkoutPrefs,
        workout_days_per_week: 0,
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('workout_days_per_week');
    });

    it('should reject invalid workout days (too many)', () => {
      const result = validateWorkoutPreferences({
        ...validWorkoutPrefs,
        workout_days_per_week: 8,
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('workout_days_per_week');
    });

    it('should reject non-array preferred_workout_types', () => {
      const result = validateWorkoutPreferences({
        ...validWorkoutPrefs,
        preferred_workout_types: 'strength' as any,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Preferred workout types must be an array');
    });
  });

  // ==================== COMPOSITE VALIDATORS ====================

  describe('validateProfileComplete', () => {
    const validProfile = {
      personalInfo: {
        first_name: 'John',
        last_name: 'Doe',
        age: 25,
        gender: 'male',
      },
      bodyMetrics: {
        height_cm: 175,
        current_weight_kg: 70,
      },
      dietPreferences: {
        diet_type: 'balanced',
      },
      workoutPreferences: {
        fitness_level: 'intermediate',
        workout_days_per_week: 4,
      },
    };

    it('should validate complete valid profile', () => {
      const result = validateProfileComplete(validProfile);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null profile', () => {
      const result = validateProfileComplete(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Profile data is completely missing');
    });

    it('should aggregate errors from all sections', () => {
      const incompleteProfile = {
        personalInfo: { age: 10 }, // Invalid age, missing other fields
        bodyMetrics: { height_cm: 50 }, // Invalid height, missing weight
        dietPreferences: {}, // Missing diet_type
        workoutPreferences: {}, // Missing all fields
      };

      const result = validateProfileComplete(incompleteProfile);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);
      expect(result.missingFields.length).toBeGreaterThan(5);
    });
  });

  describe('validateMinimumProfile', () => {
    it('should validate minimum required fields', () => {
      const minProfile = {
        personalInfo: {
          first_name: 'John',
          age: 25,
        },
        bodyMetrics: {
          height_cm: 175,
          current_weight_kg: 70,
        },
      };

      const result = validateMinimumProfile(minProfile);
      expect(result.isValid).toBe(true);
    });

    it('should reject profile without first name', () => {
      const result = validateMinimumProfile({
        personalInfo: { age: 25 },
        bodyMetrics: { height_cm: 175, current_weight_kg: 70 },
      });
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('first_name');
    });

    it('should reject profile with age too young', () => {
      const result = validateMinimumProfile({
        personalInfo: { first_name: 'John', age: 10 },
        bodyMetrics: { height_cm: 175, current_weight_kg: 70 },
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid age is required (minimum 13)');
    });
  });

  // ==================== FIELD-SPECIFIC VALIDATORS ====================

  describe('validateEmail', () => {
    it('should validate valid email', () => {
      expect(validateEmail('user@example.com').isValid).toBe(true);
      expect(validateEmail('test.user+tag@domain.co.uk').isValid).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid').isValid).toBe(false);
      expect(validateEmail('missing@').isValid).toBe(false);
      expect(validateEmail('@domain.com').isValid).toBe(false);
      expect(validateEmail('').isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = validatePassword('MyPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = validatePassword('Pass1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('mypass123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('MYPASS123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePassword('MyPassword');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should aggregate multiple password errors', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateDateOfBirth', () => {
    it('should validate valid date of birth', () => {
      const dob = new Date('1990-01-01');
      const result = validateDateOfBirth(dob);
      expect(result.isValid).toBe(true);
    });

    it('should reject date of birth for age < 13', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 10);
      const result = validateDateOfBirth(dob);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Must be at least 13 years old to use this app');
    });

    it('should reject date of birth for age > 120', () => {
      const dob = new Date('1800-01-01');
      const result = validateDateOfBirth(dob);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date of birth');
    });

    it('should accept string date format', () => {
      const result = validateDateOfBirth('1990-01-01');
      expect(result.isValid).toBe(true);
    });
  });

  // ==================== UTILITY FUNCTIONS ====================

  describe('combineValidationResults', () => {
    it('should combine multiple valid results', () => {
      const result1 = { isValid: true, missingFields: [], errors: [] };
      const result2 = { isValid: true, missingFields: [], errors: [] };

      const combined = combineValidationResults(result1, result2);
      expect(combined.isValid).toBe(true);
      expect(combined.missingFields).toHaveLength(0);
      expect(combined.errors).toHaveLength(0);
    });

    it('should combine invalid results', () => {
      const result1 = {
        isValid: false,
        missingFields: ['field1'],
        errors: ['Error 1'],
      };
      const result2 = {
        isValid: false,
        missingFields: ['field2'],
        errors: ['Error 2'],
      };

      const combined = combineValidationResults(result1, result2);
      expect(combined.isValid).toBe(false);
      expect(combined.missingFields).toEqual(['field1', 'field2']);
      expect(combined.errors).toEqual(['Error 1', 'Error 2']);
    });

    it('should mark combined result as invalid if any result is invalid', () => {
      const result1 = { isValid: true, missingFields: [], errors: [] };
      const result2 = {
        isValid: false,
        missingFields: ['field'],
        errors: ['Error'],
      };

      const combined = combineValidationResults(result1, result2);
      expect(combined.isValid).toBe(false);
    });
  });

  describe('hasCriticalErrors', () => {
    it('should return true for invalid result with errors', () => {
      const result = {
        isValid: false,
        missingFields: ['field'],
        errors: ['Error'],
      };
      expect(hasCriticalErrors(result)).toBe(true);
    });

    it('should return false for valid result', () => {
      const result = { isValid: true, missingFields: [], errors: [] };
      expect(hasCriticalErrors(result)).toBe(false);
    });

    it('should return false for invalid result without errors', () => {
      const result = { isValid: false, missingFields: [], errors: [] };
      expect(hasCriticalErrors(result)).toBe(false);
    });
  });

  describe('formatValidationErrors', () => {
    it('should return empty string for valid result', () => {
      const result = { isValid: true, missingFields: [], errors: [] };
      expect(formatValidationErrors(result)).toBe('');
    });

    it('should return single error message', () => {
      const result = {
        isValid: false,
        missingFields: ['field'],
        errors: ['First name is required'],
      };
      expect(formatValidationErrors(result)).toBe('First name is required');
    });

    it('should format multiple errors as list', () => {
      const result = {
        isValid: false,
        missingFields: ['field1', 'field2'],
        errors: ['Error 1', 'Error 2'],
      };
      const formatted = formatValidationErrors(result);
      expect(formatted).toContain('Please fix the following issues:');
      expect(formatted).toContain('- Error 1');
      expect(formatted).toContain('- Error 2');
    });
  });
});
