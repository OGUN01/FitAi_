import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  TabValidationResult,
} from "../../types/onboarding";
import { PersonalInfoService } from "./personalInfoService";
import { DietPreferencesService } from "./dietPreferencesService";
import { BodyAnalysisService } from "./bodyAnalysisService";
import { WorkoutPreferencesService } from "./workoutPreferencesService";
import { AdvancedReviewService } from "../onboardingService";

export class OnboardingUtils {
  static calculateSleepDuration(wakeTime: string, sleepTime: string): number {
    return PersonalInfoService.calculateSleepDuration(wakeTime, sleepTime);
  }

  static formatSleepDuration(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  }

  static isHealthySleepDuration(hours: number): boolean {
    return hours >= 7 && hours <= 9;
  }

  static validatePersonalInfo(
    data: PersonalInfoData | null,
  ): TabValidationResult {
    return PersonalInfoService.validate(data);
  }

  static validateDietPreferences(
    data: DietPreferencesData | null,
  ): TabValidationResult {
    return DietPreferencesService.validate(data);
  }

  static validateBodyAnalysis(
    data: BodyAnalysisData | null,
  ): TabValidationResult {
    return BodyAnalysisService.validate(data);
  }

  static validateWorkoutPreferences(
    data: WorkoutPreferencesData | null,
  ): TabValidationResult {
    return WorkoutPreferencesService.validate(data);
  }

  static validateAdvancedReview(
    data: AdvancedReviewData | null,
  ): TabValidationResult {
    return AdvancedReviewService.validate(data);
  }
}
