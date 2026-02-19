/**
 * Type definitions for profile validation
 */

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
