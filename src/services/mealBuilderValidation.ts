/**
 * Thin validation wrapper for the Meal Builder, mirroring
 * `builderValidationService.validatePlan(plan, {profile})`'s split — a pure
 * function invoked from the SCREEN (which has profileStore access), whose
 * result the store only holds (`dietBuilderStore.setValidationWarnings` /
 * `setProjection`). No new safety math lives here — it wraps the
 * already-built `customDietProjection` engine and adapts its output into the
 * shape `MacroValidationBanner` renders (mirroring
 * `InlineValidationBanner`'s `ValidationWarning` + one-tap `fixAction` shell).
 */

import {
  projectCustomDietPlan,
  type CustomDietProjectionInput,
  type CustomDietProjectionResult,
} from "./validation/customDietProjection";

export type DietValidationSeverity = "info" | "warning" | "error";

export interface DietFixAction {
  label: string;
  /** 'open_picker' opens the FoodPickerSheet for the day's biggest macro gap;
   * there is no auto-apply action here — like the workout builder's
   * `remove_exercise`/`adjust_volume`, these are advisory prompts, never
   * silent auto-edits. */
  type: "open_picker";
}

export interface DietValidationWarning {
  id: string;
  code?: string;
  severity: DietValidationSeverity;
  message: string;
  fixAction?: DietFixAction;
}

export interface MealBuilderValidationResult {
  warnings: DietValidationWarning[];
  projection: CustomDietProjectionResult;
}

const FIXABLE_CODES = new Set(["BELOW_ABSOLUTE_MINIMUM", "BELOW_BMR"]);

/**
 * Validate one day's planned totals against the user's profile/goal. Pure —
 * takes everything it needs as input rather than reaching into stores, so it
 * can run from the screen (which owns the profileStore read) exactly like
 * `builderValidationService.validatePlan`.
 */
export function validateMealBuilderDay(
  input: CustomDietProjectionInput
): MealBuilderValidationResult {
  const projection = projectCustomDietPlan(input);

  const warnings: DietValidationWarning[] = [
    ...projection.blockers.map((b, i) => ({
      id: b.code ?? `blocker_${i}`,
      code: b.code,
      severity: "error" as const,
      message: b.message ?? "This day is below a safe calorie floor.",
      fixAction: b.code && FIXABLE_CODES.has(b.code)
        ? { label: "Add more food", type: "open_picker" as const }
        : undefined,
    })),
    ...projection.warnings.map((w, i) => ({
      id: w.code ?? `warning_${i}`,
      code: w.code,
      severity: "warning" as const,
      message: w.message ?? "Review this day's macros.",
    })),
  ];

  return { warnings, projection };
}

/** True when there's nothing to warn about — used for the clean-state
 * "Plan looks balanced ✓" pill, mirroring InlineValidationBanner's
 * hasValidationRun-gated clean state exactly. */
export function isDietPlanClean(result: MealBuilderValidationResult): boolean {
  return result.warnings.length === 0;
}
