/**
 * Profile Validation Utilities
 *
 * This module provides strict validation for user profile data with NO fallbacks.
 * All validations throw errors or return detailed validation results.
 *
 * Design Principles:
 * - No default/fallback values - missing data must be handled explicitly
 * - Clear error messages indicating what's missing and why
 * - Type-safe validation functions
 * - Composable validators for complex validation scenarios
 */

// ==================== TYPES ====================

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
}

export interface FieldValidationRule<T = any> {
  field: string;
  validator: (value: T) => boolean;
  errorMessage: string;
}

// ==================== CORE HELPERS ====================

/**
 * Gets a required field value or throws an error if missing
 * @throws Error if value is null, undefined, or empty string
 */
export function getRequiredField<T>(
  value: T | null | undefined,
  fieldName: string,
  context?: string,
): T {
  if (value === null || value === undefined || value === "") {
    const contextMsg = context ? ` (${context})` : "";
    throw new Error(`Required field missing: ${fieldName}${contextMsg}`);
  }
  return value;
}

/**
 * Gets a required numeric field with range validation
 * @throws Error if value is missing or out of range
 */
export function getRequiredNumericField(
  value: number | null | undefined,
  fieldName: string,
  min: number,
  max: number,
  context?: string,
): number {
  const contextMsg = context ? ` (${context})` : "";

  if (value === null || value === undefined) {
    throw new Error(
      `Required numeric field missing: ${fieldName}${contextMsg}`,
    );
  }

  if (typeof value !== "number" || isNaN(value)) {
    throw new Error(
      `Invalid numeric value for ${fieldName}: expected number, got ${typeof value}${contextMsg}`,
    );
  }

  if (value < min || value > max) {
    throw new Error(
      `${fieldName} must be between ${min} and ${max}, got ${value}${contextMsg}`,
    );
  }

  return value;
}

/**
 * Gets a required array field
 * @throws Error if value is missing or not an array
 */
export function getRequiredArrayField<T>(
  value: T[] | null | undefined,
  fieldName: string,
  minLength: number = 0,
  context?: string,
): T[] {
  const contextMsg = context ? ` (${context})` : "";

  if (value === null || value === undefined) {
    throw new Error(`Required array field missing: ${fieldName}${contextMsg}`);
  }

  if (!Array.isArray(value)) {
    throw new Error(
      `Invalid array value for ${fieldName}: expected array, got ${typeof value}${contextMsg}`,
    );
  }

  if (value.length < minLength) {
    throw new Error(
      `${fieldName} must have at least ${minLength} items, got ${value.length}${contextMsg}`,
    );
  }

  return value;
}

/**
 * Validates multiple rules and aggregates results
 */
export function validateRules<T>(
  data: T,
  rules: FieldValidationRule[],
  context?: string,
): ValidationResult {
  const missing: string[] = [];
  const errors: string[] = [];

  for (const rule of rules) {
    const value = (data as any)[rule.field];

    if (!rule.validator(value)) {
      missing.push(rule.field);
      const contextMsg = context ? ` (${context})` : "";
      errors.push(`${rule.errorMessage}${contextMsg}`);
    }
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
    errors,
  };
}

// ==================== PERSONAL INFO VALIDATION ====================

export function validatePersonalInfo(personalInfo: any): ValidationResult {
  if (!personalInfo) {
    return {
      isValid: false,
      missingFields: ["personalInfo"],
      errors: ["Personal information is completely missing"],
    };
  }

  const rules: FieldValidationRule[] = [
    {
      field: "first_name",
      validator: (v) => typeof v === "string" && v.trim().length > 0,
      errorMessage: "First name is required",
    },
    {
      field: "last_name",
      validator: (v) => typeof v === "string" && v.trim().length > 0,
      errorMessage: "Last name is required",
    },
    {
      field: "age",
      validator: (v) => typeof v === "number" && v >= 13 && v <= 120,
      errorMessage: "Age must be between 13 and 120",
    },
    {
      field: "gender",
      validator: (v) =>
        typeof v === "string" &&
        ["male", "female", "other"].includes(v.toLowerCase()),
      errorMessage: "Gender must be one of: male, female, other",
    },
  ];

  return validateRules(personalInfo, rules, "Personal Info");
}

// ==================== BODY METRICS VALIDATION ====================

export function validateBodyMetrics(bodyMetrics: any): ValidationResult {
  if (!bodyMetrics) {
    return {
      isValid: false,
      missingFields: ["bodyMetrics"],
      errors: ["Body metrics are completely missing"],
    };
  }

  const rules: FieldValidationRule[] = [
    {
      field: "height_cm",
      validator: (v) => typeof v === "number" && v >= 100 && v <= 250,
      errorMessage: "Height must be between 100 and 250 cm",
    },
    {
      field: "current_weight_kg",
      validator: (v) => typeof v === "number" && v >= 30 && v <= 300,
      errorMessage: "Weight must be between 30 and 300 kg",
    },
  ];

  const result = validateRules(bodyMetrics, rules, "Body Metrics");

  // Optional but recommended fields - warn but don't fail
  const warnings: string[] = [];
  if (!bodyMetrics.target_weight_kg) {
    warnings.push("Target weight not set - weight goals may be limited");
  }
  if (!bodyMetrics.activity_level) {
    warnings.push(
      "Activity level not set - calorie calculations may be less accurate",
    );
  }

  // Add warnings to errors if you want to surface them
  if (warnings.length > 0 && result.isValid) {
    // Valid but with warnings - you can log these or handle differently
    console.warn("Body Metrics Warnings:", warnings);
  }

  return result;
}

// ==================== DIET PREFERENCES VALIDATION ====================

export function validateDietPreferences(dietPrefs: any): ValidationResult {
  if (!dietPrefs) {
    return {
      isValid: false,
      missingFields: ["dietPreferences"],
      errors: ["Diet preferences are completely missing"],
    };
  }

  const rules: FieldValidationRule[] = [
    {
      field: "diet_type",
      validator: (v) => typeof v === "string" && v.trim().length > 0,
      errorMessage: "Diet type is required",
    },
  ];

  const result = validateRules(dietPrefs, rules, "Diet Preferences");

  // Validate arrays if present
  const arrayValidations: ValidationResult[] = [];

  if (dietPrefs.allergies && !Array.isArray(dietPrefs.allergies)) {
    arrayValidations.push({
      isValid: false,
      missingFields: ["allergies"],
      errors: ["Allergies must be an array"],
    });
  }

  if (
    dietPrefs.dietary_restrictions &&
    !Array.isArray(dietPrefs.dietary_restrictions)
  ) {
    arrayValidations.push({
      isValid: false,
      missingFields: ["dietary_restrictions"],
      errors: ["Dietary restrictions must be an array"],
    });
  }

  if (dietPrefs.disliked_foods && !Array.isArray(dietPrefs.disliked_foods)) {
    arrayValidations.push({
      isValid: false,
      missingFields: ["disliked_foods"],
      errors: ["Disliked foods must be an array"],
    });
  }

  // Merge array validation results
  if (arrayValidations.length > 0) {
    const allArrayErrors = arrayValidations.flatMap((v) => v.errors);
    const allArrayMissing = arrayValidations.flatMap((v) => v.missingFields);

    return {
      isValid: false,
      missingFields: [...result.missingFields, ...allArrayMissing],
      errors: [...result.errors, ...allArrayErrors],
    };
  }

  return result;
}

// ==================== WORKOUT PREFERENCES VALIDATION ====================

export function validateWorkoutPreferences(
  workoutPrefs: any,
): ValidationResult {
  if (!workoutPrefs) {
    return {
      isValid: false,
      missingFields: ["workoutPreferences"],
      errors: ["Workout preferences are completely missing"],
    };
  }

  const rules: FieldValidationRule[] = [
    {
      field: "fitness_level",
      validator: (v) =>
        typeof v === "string" &&
        ["beginner", "intermediate", "advanced"].includes(v.toLowerCase()),
      errorMessage:
        "Fitness level must be one of: beginner, intermediate, advanced",
    },
    {
      field: "workout_days_per_week",
      validator: (v) => typeof v === "number" && v >= 1 && v <= 7,
      errorMessage: "Workout days per week must be between 1 and 7",
    },
  ];

  const result = validateRules(workoutPrefs, rules, "Workout Preferences");

  // Validate arrays if present
  if (
    workoutPrefs.preferred_workout_types &&
    !Array.isArray(workoutPrefs.preferred_workout_types)
  ) {
    return {
      isValid: false,
      missingFields: [...result.missingFields, "preferred_workout_types"],
      errors: [...result.errors, "Preferred workout types must be an array"],
    };
  }

  if (
    workoutPrefs.available_equipment &&
    !Array.isArray(workoutPrefs.available_equipment)
  ) {
    return {
      isValid: false,
      missingFields: [...result.missingFields, "available_equipment"],
      errors: [...result.errors, "Available equipment must be an array"],
    };
  }

  return result;
}

// ==================== COMPOSITE VALIDATION ====================

/**
 * Validates that a complete profile has all required data
 * This is the main validation function to use before allowing profile submission
 */
export function validateProfileComplete(profile: any): ValidationResult {
  if (!profile) {
    return {
      isValid: false,
      missingFields: ["profile"],
      errors: ["Profile data is completely missing"],
    };
  }

  const validations = [
    validatePersonalInfo(profile.personalInfo),
    validateBodyMetrics(profile.bodyMetrics),
    validateDietPreferences(profile.dietPreferences),
    validateWorkoutPreferences(profile.workoutPreferences),
  ];

  const allMissing = validations.flatMap((r) => r.missingFields);
  const allErrors = validations.flatMap((r) => r.errors);

  return {
    isValid: allMissing.length === 0,
    missingFields: allMissing,
    errors: allErrors,
  };
}

/**
 * Validates minimum required fields to proceed with onboarding
 * Less strict than validateProfileComplete - only checks critical fields
 */
export function validateMinimumProfile(profile: any): ValidationResult {
  if (!profile) {
    return {
      isValid: false,
      missingFields: ["profile"],
      errors: ["Profile data is completely missing"],
    };
  }

  const errors: string[] = [];
  const missing: string[] = [];

  // Must have basic personal info
  if (!profile.personalInfo?.first_name) {
    errors.push("First name is required");
    missing.push("first_name");
  }

  if (!profile.personalInfo?.age || profile.personalInfo.age < 13) {
    errors.push("Valid age is required (minimum 13)");
    missing.push("age");
  }

  // Must have basic body metrics
  if (!profile.bodyMetrics?.height_cm || profile.bodyMetrics.height_cm < 100) {
    errors.push("Valid height is required");
    missing.push("height_cm");
  }

  if (
    !profile.bodyMetrics?.current_weight_kg ||
    profile.bodyMetrics.current_weight_kg < 30
  ) {
    errors.push("Valid weight is required");
    missing.push("current_weight_kg");
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
    errors,
  };
}

// ==================== FIELD-SPECIFIC VALIDATORS ====================

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    return {
      isValid: false,
      missingFields: ["email"],
      errors: ["Valid email address is required"],
    };
  }

  return {
    isValid: true,
    missingFields: [],
    errors: [],
  };
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (password && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (password && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (password && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    isValid: errors.length === 0,
    missingFields: errors.length > 0 ? ["password"] : [],
    errors,
  };
}

/**
 * Validates date of birth (alternative to age)
 */
export function validateDateOfBirth(dob: string | Date): ValidationResult {
  try {
    const birthDate = typeof dob === "string" ? new Date(dob) : dob;
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    if (age < 13) {
      return {
        isValid: false,
        missingFields: ["date_of_birth"],
        errors: ["Must be at least 13 years old to use this app"],
      };
    }

    if (age > 120) {
      return {
        isValid: false,
        missingFields: ["date_of_birth"],
        errors: ["Invalid date of birth"],
      };
    }

    return {
      isValid: true,
      missingFields: [],
      errors: [],
    };
  } catch (error) {
    return {
      isValid: false,
      missingFields: ["date_of_birth"],
      errors: ["Invalid date format"],
    };
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Combines multiple validation results
 */
export function combineValidationResults(
  ...results: ValidationResult[]
): ValidationResult {
  const allMissing = results.flatMap((r) => r.missingFields);
  const allErrors = results.flatMap((r) => r.errors);

  return {
    isValid: allMissing.length === 0,
    missingFields: allMissing,
    errors: allErrors,
  };
}

/**
 * Checks if a validation result indicates a critical error
 * (vs. just warnings)
 */
export function hasCriticalErrors(result: ValidationResult): boolean {
  return !result.isValid && result.errors.length > 0;
}

/**
 * Formats validation errors into a user-friendly message
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.isValid) {
    return "";
  }

  if (result.errors.length === 1) {
    return result.errors[0];
  }

  return `Please fix the following issues:\n${result.errors.map((e) => `- ${e}`).join("\n")}`;
}
