import { ValidationResult } from "./types";

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
