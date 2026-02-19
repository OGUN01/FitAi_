import type { Discrepancy, DiscrepancySeverity } from "./types";

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;

  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return a === b;
}

export function determineSeverity(
  dataType: string,
  field: string,
): DiscrepancySeverity {
  const errorFields = [
    "id",
    "user_id",
    "email",
    "height_cm",
    "current_weight_kg",
    "target_weight_kg",
    "pregnancy_status",
    "breastfeeding_status",
    "medical_conditions",
    "diet_type",
    "primary_goals",
  ];

  const warningFields = [
    "age",
    "gender",
    "location",
    "intensity",
    "activity_level",
    "body_fat_percentage",
    "allergies",
    "restrictions",
    "equipment",
  ];

  if (errorFields.includes(field)) {
    return "error";
  }

  if (warningFields.includes(field)) {
    return "warning";
  }

  return "info";
}

export function compareObjects(
  dataType: string,
  oldObj: any,
  newObj: any,
  prefix: string = "",
  discrepancies: Discrepancy[],
): void {
  const allKeys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {}),
  ]);

  for (const key of allKeys) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const oldValue = oldObj?.[key];
    const newValue = newObj?.[key];

    if (!deepEqual(oldValue, newValue)) {
      if (
        typeof oldValue === "object" &&
        typeof newValue === "object" &&
        !Array.isArray(oldValue) &&
        !Array.isArray(newValue) &&
        oldValue !== null &&
        newValue !== null
      ) {
        compareObjects(dataType, oldValue, newValue, fieldPath, discrepancies);
      } else {
        const severity = determineSeverity(dataType, fieldPath);
        discrepancies.push({
          dataType,
          field: fieldPath,
          oldValue,
          newValue,
          severity,
        });
      }
    }
  }
}

export function compareLocalData(
  oldData: any,
  newData: any,
): { isMatch: boolean; discrepancies: Discrepancy[] } {
  const discrepancies: Discrepancy[] = [];

  if (!oldData && !newData) {
    return { isMatch: true, discrepancies };
  }

  if (!oldData || !newData) {
    discrepancies.push({
      dataType: "root",
      field: "data_presence",
      oldValue: !!oldData,
      newValue: !!newData,
      severity: "warning",
    });
    return { isMatch: false, discrepancies };
  }

  let isMatch = true;

  const dataTypes = [
    "personalInfo",
    "dietPreferences",
    "workoutPreferences",
    "bodyMetrics",
    "fitnessGoals",
  ];

  for (const dataType of dataTypes) {
    const oldSection = oldData[dataType];
    const newSection = newData[dataType];

    if (!deepEqual(oldSection, newSection)) {
      isMatch = false;
      compareObjects(
        dataType,
        oldSection || {},
        newSection || {},
        "",
        discrepancies,
      );
    }
  }

  return { isMatch, discrepancies };
}
