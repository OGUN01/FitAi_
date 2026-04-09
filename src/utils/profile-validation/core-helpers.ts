import { ValidationResult, FieldValidationRule } from "./types";

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

export function validateRules<T>(
  data: T,
  rules: FieldValidationRule[],
  context?: string,
): ValidationResult {
  const missing: string[] = [];
  const errors: string[] = [];

  for (const rule of rules) {
    const value = (data as Record<string, unknown>)[rule.field];

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
