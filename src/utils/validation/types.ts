// Validation Types for FitAI
// All interfaces and types used in validation

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity?: "error" | "warning";
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface BodyMeasurement {
  weight?: number;
  height?: number;
  bodyFat?: number;
}
