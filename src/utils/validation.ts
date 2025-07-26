// Data Validation Service for Track B Infrastructure
// Comprehensive validation schemas and sanitization functions

import { 
  OnboardingData,
  WorkoutSession,
  MealLog
} from '../types/localData';

import {
  PersonalInfo,
  FitnessGoals
} from '../types/user';

// Define missing types locally
interface LocalStorageSchema {
  version: string;
  entities: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity?: 'error' | 'warning';
}

interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

interface BodyMeasurement {
  weight?: number;
  height?: number;
  bodyFat?: number;
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

const VALIDATION_RULES = {
  // Personal Info
  NAME: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/,
  },
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  AGE: {
    min: 13,
    max: 120,
  },
  HEIGHT: {
    min: 100, // cm
    max: 250, // cm
  },
  WEIGHT: {
    min: 30, // kg
    max: 300, // kg
  },
  
  // Fitness Data
  WORKOUT_DURATION: {
    min: 5, // minutes
    max: 300, // minutes
  },
  CALORIES: {
    min: 0,
    max: 10000,
  },
  SETS: {
    min: 1,
    max: 20,
  },
  REPS: {
    min: 1,
    max: 100,
  },
  WEIGHT_LIFTED: {
    min: 0,
    max: 1000, // kg
  },
  
  // Nutrition Data
  FOOD_QUANTITY: {
    min: 0,
    max: 10000, // grams
  },
  MACROS: {
    protein: { min: 0, max: 1000 },
    carbohydrates: { min: 0, max: 1000 },
    fat: { min: 0, max: 1000 },
    fiber: { min: 0, max: 200 },
  },
  
  // Progress Data
  BODY_FAT: {
    min: 3, // percentage
    max: 50, // percentage
  },
  MUSCLE_MASS: {
    min: 10, // kg
    max: 100, // kg
  },
} as const;

// ============================================================================
// VALIDATION SERVICE
// ============================================================================

export class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  // ============================================================================
  // SCHEMA VALIDATION
  // ============================================================================

  validateLocalStorageSchema(schema: LocalStorageSchema): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate version
    if (!schema.version || typeof schema.version !== 'string') {
      errors.push({
        field: 'version',
        message: 'Schema version is required and must be a string',
        code: 'INVALID_VERSION',
        severity: 'error',
      });
    }

    // Validate timestamps
    if (!this.isValidISODate(schema.createdAt)) {
      errors.push({
        field: 'createdAt',
        message: 'Invalid createdAt timestamp',
        code: 'INVALID_TIMESTAMP',
        severity: 'error',
      });
    }

    if (!this.isValidISODate(schema.updatedAt)) {
      errors.push({
        field: 'updatedAt',
        message: 'Invalid updatedAt timestamp',
        code: 'INVALID_TIMESTAMP',
        severity: 'error',
      });
    }

    // Validate user data
    const userValidation = this.validateUserData(schema.user);
    errors.push(...userValidation.errors);
    warnings.push(...userValidation.warnings);

    // Validate fitness data
    const fitnessValidation = this.validateFitnessData(schema.fitness);
    errors.push(...fitnessValidation.errors);
    warnings.push(...fitnessValidation.warnings);

    // Validate nutrition data
    const nutritionValidation = this.validateNutritionData(schema.nutrition);
    errors.push(...nutritionValidation.errors);
    warnings.push(...nutritionValidation.warnings);

    // Validate progress data
    const progressValidation = this.validateProgressData(schema.progress);
    errors.push(...progressValidation.errors);
    warnings.push(...progressValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // USER DATA VALIDATION
  // ============================================================================

  validateUserData(userData: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate onboarding data if present
    if (userData.onboardingData) {
      const onboardingValidation = this.validateOnboardingData(userData.onboardingData);
      errors.push(...onboardingValidation.errors);
      warnings.push(...onboardingValidation.warnings);
    }

    // Validate preferences
    if (!userData.preferences) {
      errors.push({
        field: 'preferences',
        message: 'User preferences are required',
        code: 'MISSING_PREFERENCES',
        severity: 'error',
      });
    } else {
      const preferencesValidation = this.validateUserPreferences(userData.preferences);
      errors.push(...preferencesValidation.errors);
      warnings.push(...preferencesValidation.warnings);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  validateOnboardingData(data: OnboardingData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data.personalInfo) {
      errors.push({
        field: 'personalInfo',
        message: 'Personal information is required',
        code: 'MISSING_PERSONAL_INFO',
        severity: 'error',
      });
    } else {
      const personalInfoValidation = this.validatePersonalInfo(data.personalInfo);
      errors.push(...personalInfoValidation.errors);
      warnings.push(...personalInfoValidation.warnings);
    }

    if (!data.fitnessGoals) {
      errors.push({
        field: 'fitnessGoals',
        message: 'Fitness goals are required',
        code: 'MISSING_FITNESS_GOALS',
        severity: 'error',
      });
    } else {
      const goalsValidation = this.validateFitnessGoals(data.fitnessGoals);
      errors.push(...goalsValidation.errors);
      warnings.push(...goalsValidation.warnings);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  validatePersonalInfo(info: PersonalInfo): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate name
    if (!info.name || !this.isValidString(info.name, VALIDATION_RULES.NAME)) {
      errors.push({
        field: 'name',
        message: 'Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes',
        code: 'INVALID_NAME',
        severity: 'error',
      });
    }

    // Validate email if provided
    if (info.email && !VALIDATION_RULES.EMAIL.pattern.test(info.email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
        severity: 'error',
      });
    }

    // Validate age
    const age = parseInt(info.age);
    if (isNaN(age) || age < VALIDATION_RULES.AGE.min || age > VALIDATION_RULES.AGE.max) {
      errors.push({
        field: 'age',
        message: `Age must be between ${VALIDATION_RULES.AGE.min} and ${VALIDATION_RULES.AGE.max}`,
        code: 'INVALID_AGE',
        severity: 'error',
      });
    }

    // Validate height
    const height = parseFloat(info.height);
    if (isNaN(height) || height < VALIDATION_RULES.HEIGHT.min || height > VALIDATION_RULES.HEIGHT.max) {
      errors.push({
        field: 'height',
        message: `Height must be between ${VALIDATION_RULES.HEIGHT.min} and ${VALIDATION_RULES.HEIGHT.max} cm`,
        code: 'INVALID_HEIGHT',
        severity: 'error',
      });
    }

    // Validate weight
    const weight = parseFloat(info.weight);
    if (isNaN(weight) || weight < VALIDATION_RULES.WEIGHT.min || weight > VALIDATION_RULES.WEIGHT.max) {
      errors.push({
        field: 'weight',
        message: `Weight must be between ${VALIDATION_RULES.WEIGHT.min} and ${VALIDATION_RULES.WEIGHT.max} kg`,
        code: 'INVALID_WEIGHT',
        severity: 'error',
      });
    }

    // Validate gender
    if (!info.gender || !['male', 'female', 'other'].includes(info.gender)) {
      errors.push({
        field: 'gender',
        message: 'Gender must be male, female, or other',
        code: 'INVALID_GENDER',
        severity: 'error',
      });
    }

    // Validate activity level
    const validActivityLevels = ['sedentary', 'light', 'moderate', 'active', 'extreme'];
    if (!info.activityLevel || !validActivityLevels.includes(info.activityLevel)) {
      errors.push({
        field: 'activityLevel',
        message: 'Invalid activity level',
        code: 'INVALID_ACTIVITY_LEVEL',
        severity: 'error',
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  validateFitnessGoals(goals: FitnessGoals): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate primary goals
    if (!goals.primaryGoals || !Array.isArray(goals.primaryGoals) || goals.primaryGoals.length === 0) {
      errors.push({
        field: 'primaryGoals',
        message: 'At least one primary goal is required',
        code: 'MISSING_PRIMARY_GOALS',
        severity: 'error',
      });
    } else {
      const validGoals = ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'general_fitness'];
      const invalidGoals = goals.primaryGoals.filter((goal: any) => !validGoals.includes(goal));
      if (invalidGoals.length > 0) {
        errors.push({
          field: 'primaryGoals',
          message: `Invalid goals: ${invalidGoals.join(', ')}`,
          code: 'INVALID_GOALS',
          severity: 'error',
        });
      }
    }

    // Validate time commitment
    const validTimeCommitments = ['15-30', '30-45', '45-60', '60+'];
    if (!goals.timeCommitment || !validTimeCommitments.includes(goals.timeCommitment)) {
      errors.push({
        field: 'timeCommitment',
        message: 'Invalid time commitment',
        code: 'INVALID_TIME_COMMITMENT',
        severity: 'error',
      });
    }

    // Validate experience
    const validExperience = ['beginner', 'intermediate', 'advanced'];
    if (!goals.experience || !validExperience.includes(goals.experience)) {
      errors.push({
        field: 'experience',
        message: 'Invalid experience level',
        code: 'INVALID_EXPERIENCE',
        severity: 'error',
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  validateUserPreferences(preferences: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate units
    if (!preferences.units || !['metric', 'imperial'].includes(preferences.units)) {
      errors.push({
        field: 'units',
        message: 'Units must be metric or imperial',
        code: 'INVALID_UNITS',
        severity: 'error',
      });
    }

    // Validate boolean fields
    const booleanFields = ['notifications', 'darkMode', 'autoSync'];
    booleanFields.forEach(field => {
      if (typeof preferences[field] !== 'boolean') {
        errors.push({
          field,
          message: `${field} must be a boolean`,
          code: 'INVALID_BOOLEAN',
          severity: 'error',
        });
      }
    });

    // Validate data retention
    if (typeof preferences.dataRetention !== 'number' || preferences.dataRetention < 30 || preferences.dataRetention > 3650) {
      warnings.push({
        field: 'dataRetention',
        message: 'Data retention should be between 30 and 3650 days',
        code: 'INVALID_DATA_RETENTION',
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // ============================================================================
  // FITNESS DATA VALIDATION
  // ============================================================================

  validateFitnessData(fitnessData: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate arrays exist
    const requiredArrays = ['workouts', 'exercises', 'sessions', 'plans', 'customExercises'];
    requiredArrays.forEach(arrayName => {
      if (!Array.isArray(fitnessData[arrayName])) {
        errors.push({
          field: arrayName,
          message: `${arrayName} must be an array`,
          code: 'INVALID_ARRAY',
          severity: 'error',
        });
      }
    });

    // Validate workout sessions
    if (Array.isArray(fitnessData.sessions)) {
      fitnessData.sessions.forEach((session: any, index: number) => {
        const sessionValidation = this.validateWorkoutSession(session);
        sessionValidation.errors.forEach(error => {
          errors.push({
            ...error,
            field: `sessions[${index}].${error.field}`,
          });
        });
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  validateWorkoutSession(session: WorkoutSession): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate required fields
    if (!session.id || typeof session.id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Session ID is required',
        code: 'MISSING_ID',
        severity: 'error',
      });
    }

    if (!session.workoutId || typeof session.workoutId !== 'string') {
      errors.push({
        field: 'workoutId',
        message: 'Workout ID is required',
        code: 'MISSING_WORKOUT_ID',
        severity: 'error',
      });
    }

    // Validate timestamps
    if (!this.isValidISODate(session.startedAt)) {
      errors.push({
        field: 'startedAt',
        message: 'Invalid start timestamp',
        code: 'INVALID_TIMESTAMP',
        severity: 'error',
      });
    }

    if (session.completedAt && !this.isValidISODate(session.completedAt)) {
      errors.push({
        field: 'completedAt',
        message: 'Invalid completion timestamp',
        code: 'INVALID_TIMESTAMP',
        severity: 'error',
      });
    }

    // Validate duration
    if (typeof session.duration !== 'number' || 
        session.duration < VALIDATION_RULES.WORKOUT_DURATION.min || 
        session.duration > VALIDATION_RULES.WORKOUT_DURATION.max) {
      errors.push({
        field: 'duration',
        message: `Duration must be between ${VALIDATION_RULES.WORKOUT_DURATION.min} and ${VALIDATION_RULES.WORKOUT_DURATION.max} minutes`,
        code: 'INVALID_DURATION',
        severity: 'error',
      });
    }

    // Validate calories
    if (typeof session.caloriesBurned !== 'number' || 
        session.caloriesBurned < VALIDATION_RULES.CALORIES.min || 
        session.caloriesBurned > VALIDATION_RULES.CALORIES.max) {
      errors.push({
        field: 'caloriesBurned',
        message: `Calories must be between ${VALIDATION_RULES.CALORIES.min} and ${VALIDATION_RULES.CALORIES.max}`,
        code: 'INVALID_CALORIES',
        severity: 'error',
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // ============================================================================
  // NUTRITION DATA VALIDATION
  // ============================================================================

  validateNutritionData(nutritionData: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate arrays exist
    const requiredArrays = ['meals', 'foods', 'logs', 'plans', 'customFoods', 'waterLogs'];
    requiredArrays.forEach(arrayName => {
      if (!Array.isArray(nutritionData[arrayName])) {
        errors.push({
          field: arrayName,
          message: `${arrayName} must be an array`,
          code: 'INVALID_ARRAY',
          severity: 'error',
        });
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  // ============================================================================
  // PROGRESS DATA VALIDATION
  // ============================================================================

  validateProgressData(progressData: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate arrays exist
    const requiredArrays = ['measurements', 'photos', 'achievements', 'analytics', 'goals'];
    requiredArrays.forEach(arrayName => {
      if (!Array.isArray(progressData[arrayName])) {
        errors.push({
          field: arrayName,
          message: `${arrayName} must be an array`,
          code: 'INVALID_ARRAY',
          severity: 'error',
        });
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private isValidString(value: string, rules: { minLength: number; maxLength: number; pattern: RegExp }): boolean {
    return value.length >= rules.minLength && 
           value.length <= rules.maxLength && 
           rules.pattern.test(value);
  }

  private isValidISODate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString();
  }

  // ============================================================================
  // DATA SANITIZATION
  // ============================================================================

  sanitizePersonalInfo(info: any): PersonalInfo {
    return {
      name: this.sanitizeString(info.name || ''),
      email: info.email ? this.sanitizeEmail(info.email) : undefined,
      age: this.sanitizeNumber(info.age, VALIDATION_RULES.AGE.min, VALIDATION_RULES.AGE.max).toString(),
      gender: this.sanitizeGender(info.gender),
      height: this.sanitizeNumber(info.height, VALIDATION_RULES.HEIGHT.min, VALIDATION_RULES.HEIGHT.max).toString(),
      weight: this.sanitizeNumber(info.weight, VALIDATION_RULES.WEIGHT.min, VALIDATION_RULES.WEIGHT.max).toString(),
      activityLevel: this.sanitizeActivityLevel(info.activityLevel),
    };
  }

  private sanitizeString(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private sanitizeNumber(value: any, min: number, max: number): number {
    const num = parseFloat(value);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  private sanitizeGender(gender: string): string {
    const validGenders = ['male', 'female', 'other'];
    return validGenders.includes(gender) ? gender : 'other';
  }

  private sanitizeActivityLevel(level: string): string {
    const validLevels = ['sedentary', 'light', 'moderate', 'active', 'extreme'];
    return validLevels.includes(level) ? level : 'moderate';
  }
}

// Export singleton instance
export const validationService = ValidationService.getInstance();
export default validationService;
