import {
  MuscleGainCalculatorService,
  FatLossValidatorService,
} from "./goalCalculators";
import type { UserProfile } from "./types";
import type { GoalInput, GoalValidationResult } from "./facadeTypes";

export class GoalValidator {
  static validateGoal(
    user: UserProfile,
    goal: GoalInput,
  ): GoalValidationResult {
    console.log("[FACADE] Validating goal:", goal.type);

    if (goal.type === "fat_loss") {
      if (!goal.targetWeight || !goal.timelineWeeks) {
        return {
          valid: false,
          severity: "error",
          message: "Fat loss goal requires target weight and timeline",
        };
      }

      const bmi = user.weight / Math.pow(user.height / 100, 2);
      const validation = FatLossValidatorService.validate(
        user.weight,
        goal.targetWeight,
        goal.timelineWeeks,
        bmi,
      );

      return {
        valid: validation.valid,
        severity: validation.severity as "error" | "success" | "warning",
        message: validation.message,
        suggestions: [],
        adjustedTimeline: validation.adjustedTimeline,
        weeklyRate: validation.weeklyRate,
      };
    }

    if (goal.type === "muscle_gain") {
      if (!goal.targetGain || !goal.timelineMonths) {
        return {
          valid: false,
          severity: "error",
          message: "Muscle gain goal requires target gain and timeline",
        };
      }

      const validation = MuscleGainCalculatorService.validateGoal(
        goal.targetGain,
        goal.timelineMonths,
        user,
      );

      return {
        valid: validation.valid,
        severity: validation.severity as "error" | "success" | "warning",
        message: validation.message,
        suggestions: validation.suggestion ? [validation.suggestion] : [],
      };
    }

    return {
      valid: true,
      severity: "success",
      message: "Valid goal!",
    };
  }
}
