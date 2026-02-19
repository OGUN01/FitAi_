import type { LocalStorageSchema } from "../../types/localData";
import { OnboardingData } from "../../types/localData";
import { PersonalInfo, FitnessGoals } from "../../types/user";
import { WorkoutSession } from "../../types/workout";
import { ValidationResult } from "./types";
import { sanitizePersonalInfo } from "./utils";
import { validateLocalStorageSchema } from "./schemaValidation";
import {
  validateUserData,
  validateOnboardingData,
  validatePersonalInfo,
  validateFitnessGoals,
  validateUserPreferences,
} from "./userValidation";
import {
  validateFitnessData,
  validateWorkoutSession,
} from "./fitnessValidation";
import { validateNutritionData } from "./nutritionValidation";
import { validateProgressData } from "./progressValidation";

export class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  validateLocalStorageSchema(schema: LocalStorageSchema): ValidationResult {
    return validateLocalStorageSchema(schema);
  }

  validateUserData(userData: any): ValidationResult {
    return validateUserData(userData);
  }

  validateOnboardingData(data: OnboardingData): ValidationResult {
    return validateOnboardingData(data);
  }

  validatePersonalInfo(info: PersonalInfo): ValidationResult {
    return validatePersonalInfo(info);
  }

  validateFitnessGoals(goals: FitnessGoals): ValidationResult {
    return validateFitnessGoals(goals);
  }

  validateUserPreferences(preferences: any): ValidationResult {
    return validateUserPreferences(preferences);
  }

  validateFitnessData(fitnessData: any): ValidationResult {
    return validateFitnessData(fitnessData);
  }

  validateWorkoutSession(session: WorkoutSession): ValidationResult {
    return validateWorkoutSession(session);
  }

  validateNutritionData(nutritionData: any): ValidationResult {
    return validateNutritionData(nutritionData);
  }

  validateProgressData(progressData: any): ValidationResult {
    return validateProgressData(progressData);
  }

  sanitizePersonalInfo(info: Partial<PersonalInfo>): PersonalInfo {
    return sanitizePersonalInfo(info);
  }
}

export const validationService = ValidationService.getInstance();
export default validationService;
