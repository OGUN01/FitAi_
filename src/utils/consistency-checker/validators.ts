import type { ValidationResult } from "../../types/profileData";
import type { DataType, SchemaField } from "./types";
import { DATABASE_SCHEMAS } from "./schemas";

export function validateFieldType(
  value: any,
  expectedType: SchemaField["type"],
): boolean {
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !isNaN(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return (
        typeof value === "object" && !Array.isArray(value) && value !== null
      );
    case "uuid":
      return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value,
        )
      );
    case "timestamp":
      return typeof value === "string" || value instanceof Date;
    default:
      return true;
  }
}

export function validateLocalDataType(
  data: any,
  dataType: DataType,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (dataType) {
    case "personalInfo":
      if (!data.first_name) errors.push("Missing required field 'first_name'");
      if (!data.last_name) errors.push("Missing required field 'last_name'");
      if (typeof data.age !== "number") errors.push("'age' must be a number");
      if (!data.gender) errors.push("Missing required field 'gender'");
      break;

    case "dietPreferences":
      if (!data.diet_type) errors.push("Missing required field 'diet_type'");
      if (!Array.isArray(data.allergies))
        errors.push("'allergies' must be an array");
      if (!Array.isArray(data.restrictions))
        errors.push("'restrictions' must be an array");
      break;

    case "workoutPreferences":
      if (!data.location) errors.push("Missing required field 'location'");
      if (!Array.isArray(data.equipment))
        errors.push("'equipment' must be an array");
      if (!data.intensity) errors.push("Missing required field 'intensity'");
      if (!Array.isArray(data.primary_goals))
        errors.push("'primary_goals' must be an array");
      break;

    case "bodyMetrics":
      if (typeof data.height_cm !== "number")
        errors.push("'height_cm' must be a number");
      if (typeof data.current_weight_kg !== "number")
        errors.push("'current_weight_kg' must be a number");
      if (!Array.isArray(data.medical_conditions))
        warnings.push("'medical_conditions' should be an array");
      break;

    case "fitnessGoals":
      if (!Array.isArray(data.primary_goals))
        errors.push("'primary_goals' must be an array");
      if (!data.time_commitment)
        errors.push("Missing required field 'time_commitment'");
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateDataIntegrity(
  data: any,
  dataType: DataType,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const schema = DATABASE_SCHEMAS[dataType];

  if (!schema) {
    return validateLocalDataType(data, dataType);
  }

  for (const field of schema.fields) {
    const value = data[field.name];

    if (field.required && (value === undefined || value === null)) {
      errors.push(`Required field '${field.name}' is missing`);
      continue;
    }

    if (value === undefined || value === null) {
      if (!field.nullable && !field.required) {
        warnings.push(`Optional field '${field.name}' is null/undefined`);
      }
      continue;
    }

    const typeValid = validateFieldType(value, field.type);
    if (!typeValid) {
      errors.push(
        `Field '${field.name}' has invalid type. Expected ${field.type}, got ${typeof value}`,
      );
    }

    if (field.validValues && !field.validValues.includes(value)) {
      errors.push(
        `Field '${field.name}' has invalid value '${value}'. Valid values: ${field.validValues.join(", ")}`,
      );
    }

    if (field.type === "number" && typeof value === "number") {
      if (field.minValue !== undefined && value < field.minValue) {
        errors.push(
          `Field '${field.name}' value ${value} is below minimum ${field.minValue}`,
        );
      }
      if (field.maxValue !== undefined && value > field.maxValue) {
        errors.push(
          `Field '${field.name}' value ${value} is above maximum ${field.maxValue}`,
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
