import { OnboardingData } from "../../types/localData";
import { PersonalInfo, FitnessGoals } from "../../types/user";
import { ValidationResult, ValidationError, ValidationWarning } from "./types";
import { VALIDATION_RULES } from "./constants";
import { isValidString, isValidISODate } from "./utils";

export function validateUserData(userData: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (userData.onboardingData) {
    const onboardingValidation = validateOnboardingData(
      userData.onboardingData,
    );
    errors.push(...onboardingValidation.errors);
    warnings.push(...onboardingValidation.warnings);
  }

  if (!userData.preferences) {
    errors.push({
      field: "preferences",
      message: "User preferences are required",
      code: "MISSING_PREFERENCES",
      severity: "error",
    });
  } else {
    const preferencesValidation = validateUserPreferences(userData.preferences);
    errors.push(...preferencesValidation.errors);
    warnings.push(...preferencesValidation.warnings);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateOnboardingData(data: OnboardingData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!data.personalInfo) {
    errors.push({
      field: "personalInfo",
      message: "Personal information is required",
      code: "MISSING_PERSONAL_INFO",
      severity: "error",
    });
  } else {
    const personalInfoValidation = validatePersonalInfo(data.personalInfo);
    errors.push(...personalInfoValidation.errors);
    warnings.push(...personalInfoValidation.warnings);
  }

  if (!data.fitnessGoals) {
    errors.push({
      field: "fitnessGoals",
      message: "Fitness goals are required",
      code: "MISSING_FITNESS_GOALS",
      severity: "error",
    });
  } else {
    const goalsValidation = validateFitnessGoals(data.fitnessGoals);
    errors.push(...goalsValidation.errors);
    warnings.push(...goalsValidation.warnings);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validatePersonalInfo(info: PersonalInfo): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const fullName = info.name || `${info.first_name} ${info.last_name}`;
  if (!fullName || !isValidString(fullName, VALIDATION_RULES.NAME)) {
    errors.push({
      field: "name",
      message:
        "Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes",
      code: "INVALID_NAME",
      severity: "error",
    });
  }

  if (info.email && !VALIDATION_RULES.EMAIL.pattern.test(info.email)) {
    errors.push({
      field: "email",
      message: "Invalid email format",
      code: "INVALID_EMAIL",
      severity: "error",
    });
  }

  const age = typeof info.age === "string" ? parseInt(info.age) : info.age;
  if (
    isNaN(age) ||
    age < VALIDATION_RULES.AGE.min ||
    age > VALIDATION_RULES.AGE.max
  ) {
    errors.push({
      field: "age",
      message: `Age must be between ${VALIDATION_RULES.AGE.min} and ${VALIDATION_RULES.AGE.max}`,
      code: "INVALID_AGE",
      severity: "error",
    });
  }

  const heightValue = info.height;
  const height =
    typeof heightValue === "string" ? parseFloat(heightValue) : heightValue;
  if (
    height === undefined ||
    isNaN(height) ||
    height < VALIDATION_RULES.HEIGHT.min ||
    height > VALIDATION_RULES.HEIGHT.max
  ) {
    errors.push({
      field: "height",
      message: `Height must be between ${VALIDATION_RULES.HEIGHT.min} and ${VALIDATION_RULES.HEIGHT.max} cm`,
      code: "INVALID_HEIGHT",
      severity: "error",
    });
  }

  const weightValue = info.weight;
  const weight =
    typeof weightValue === "string" ? parseFloat(weightValue) : weightValue;
  if (
    weight === undefined ||
    isNaN(weight) ||
    weight < VALIDATION_RULES.WEIGHT.min ||
    weight > VALIDATION_RULES.WEIGHT.max
  ) {
    errors.push({
      field: "weight",
      message: `Weight must be between ${VALIDATION_RULES.WEIGHT.min} and ${VALIDATION_RULES.WEIGHT.max} kg`,
      code: "INVALID_WEIGHT",
      severity: "error",
    });
  }

  if (
    !info.gender ||
    !["male", "female", "other", "prefer_not_to_say"].includes(info.gender)
  ) {
    errors.push({
      field: "gender",
      message: "Gender must be male, female, other, or prefer_not_to_say",
      code: "INVALID_GENDER",
      severity: "error",
    });
  }

  const validActivityLevels = [
    "sedentary",
    "light",
    "moderate",
    "active",
    "extreme",
  ];
  const activityLevel = info.activityLevel;
  if (activityLevel && !validActivityLevels.includes(activityLevel)) {
    errors.push({
      field: "activityLevel",
      message: "Invalid activity level",
      code: "INVALID_ACTIVITY_LEVEL",
      severity: "error",
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateFitnessGoals(goals: FitnessGoals): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const primaryGoals = goals.primary_goals || goals.primaryGoals;
  if (
    !primaryGoals ||
    !Array.isArray(primaryGoals) ||
    primaryGoals.length === 0
  ) {
    errors.push({
      field: "primaryGoals",
      message: "At least one primary goal is required",
      code: "MISSING_PRIMARY_GOALS",
      severity: "error",
    });
  } else {
    const validGoals = [
      "weight_loss",
      "muscle_gain",
      "strength",
      "endurance",
      "flexibility",
      "general_fitness",
    ];
    const invalidGoals = primaryGoals.filter(
      (goal: string) => !validGoals.includes(goal),
    );
    if (invalidGoals.length > 0) {
      errors.push({
        field: "primaryGoals",
        message: `Invalid goals: ${invalidGoals.join(", ")}`,
        code: "INVALID_GOALS",
        severity: "error",
      });
    }
  }

  const timeCommitment = goals.time_commitment || goals.timeCommitment;
  const validTimeCommitments = ["15-30", "30-45", "45-60", "60+"];
  if (!timeCommitment || !validTimeCommitments.includes(timeCommitment)) {
    errors.push({
      field: "timeCommitment",
      message: "Invalid time commitment",
      code: "INVALID_TIME_COMMITMENT",
      severity: "error",
    });
  }

  const validExperience = ["beginner", "intermediate", "advanced"];
  if (!goals.experience || !validExperience.includes(goals.experience)) {
    errors.push({
      field: "experience",
      message: "Invalid experience level",
      code: "INVALID_EXPERIENCE",
      severity: "error",
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateUserPreferences(preferences: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (
    !preferences.units ||
    !["metric", "imperial"].includes(preferences.units)
  ) {
    errors.push({
      field: "units",
      message: "Units must be metric or imperial",
      code: "INVALID_UNITS",
      severity: "error",
    });
  }

  const booleanFields = ["notifications", "darkMode", "autoSync"];
  booleanFields.forEach((field) => {
    if (typeof preferences[field] !== "boolean") {
      errors.push({
        field,
        message: `${field} must be a boolean`,
        code: "INVALID_BOOLEAN",
        severity: "error",
      });
    }
  });

  if (
    typeof preferences.dataRetention !== "number" ||
    preferences.dataRetention < 30 ||
    preferences.dataRetention > 3650
  ) {
    warnings.push({
      field: "dataRetention",
      message: "Data retention should be between 30 and 3650 days",
      code: "INVALID_DATA_RETENTION",
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}
