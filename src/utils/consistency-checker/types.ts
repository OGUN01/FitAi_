/**
 * Type definitions for ConsistencyChecker
 */

export type DiscrepancySeverity = "info" | "warning" | "error";

export interface Discrepancy {
  dataType: string;
  field: string;
  oldValue: any;
  newValue: any;
  severity: DiscrepancySeverity;
}

export interface ConsistencyReport {
  timestamp: string;
  userId: string | null;
  checks: {
    localStorageMatch: boolean;
    databaseMatch: boolean;
    schemaValid: boolean;
  };
  discrepancies: Discrepancy[];
  recommendations: string[];
}

export type DataType =
  | "profiles"
  | "diet_preferences"
  | "body_analysis"
  | "workout_preferences"
  | "advanced_review"
  | "personalInfo"
  | "dietPreferences"
  | "workoutPreferences"
  | "bodyMetrics"
  | "fitnessGoals";

export interface SchemaField {
  name: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "array"
    | "object"
    | "uuid"
    | "timestamp";
  required: boolean;
  nullable?: boolean;
  validValues?: any[];
  minValue?: number;
  maxValue?: number;
}

export interface TableSchema {
  tableName: string;
  fields: SchemaField[];
}
