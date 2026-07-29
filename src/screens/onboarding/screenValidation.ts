/**
 * screenValidation — per-screen validation for the 7-screen onboarding flow.
 *
 * WHY THIS EXISTS: the old model validated a whole store slice per tab
 * (useOnboardingState.validateTab(1) required wake_time — but wake_time now
 * lives on screen 6 "Rhythm", not screen 1 "You"). Splitting the flow into 7
 * motivation-first screens means validation must follow the SCREEN, not the
 * store slice. This module is that per-screen gate.
 *
 * Two layers:
 *   1. validateScreen(id, state) — blocks a screen's Next if THAT screen's
 *      requiredFields aren't met. Mirrors the field rules in
 *      onboardingService.ts (OnboardingUtils.validate*).
 *   2. validateAllForCompletion(state) — the GENERATE gate on the Plan screen.
 *      Runs the full per-slice validators (all required fields across the
 *      whole flow) so the data reaching AI generation is complete/valid.
 *      Reuses OnboardingUtils verbatim — single source of truth for the rules.
 *
 * Body (screen 3) is intentionally optional/skippable, matching
 * OnboardingUtils.validateBodyAnalysis which returns is_valid:true when empty.
 */

import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  TabValidationResult,
} from "../../types/onboarding";
import { OnboardingUtils } from "../../services/onboardingService";
import { ONBOARDING_SCREENS, getScreen } from "./onboardingScreens";

interface OnboardingScreenState {
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  advancedReview: AdvancedReviewData | null;
}

const empty = (errors: string[], warnings: string[] = [], completion = 0): TabValidationResult => ({
  is_valid: errors.length === 0,
  errors,
  warnings,
  completion_percentage: completion,
});

// ---------------------------------------------------------------------------
// Per-screen gate. Checks only the fields THIS screen owns.
// ---------------------------------------------------------------------------
export function validateScreen(
  screenId: number,
  state: OnboardingScreenState,
): TabValidationResult {
  const screen = getScreen(screenId);
  if (!screen) return empty(["Unknown screen"], [], 0);

  const { store, requiredFields } = screen;

  // Plan screen: completion is gated by validateAllForCompletion at Generate.
  // The screen itself is always "valid" (it's a reveal, not an input screen).
  if (screenId === 7) return empty([], [], 100);

  // Body screen: optional/skippable — always valid, mirrors OnboardingUtils.
  if (screenId === 3) {
    return OnboardingUtils.validateBodyAnalysis(state.bodyAnalysis);
  }

  const data = state[store];
  const errors: string[] = [];

  // personalInfo fields live across two screens (You: name/age/gender;
  // Rhythm: wake/sleep/country/state). Validate only this screen's subset.
  if (store === "personalInfo") {
    const pi = data as PersonalInfoData | null;
    if (requiredFields.includes("first_name") && !pi?.first_name?.trim())
      errors.push("First name is required");
    if (requiredFields.includes("last_name") && !pi?.last_name?.trim())
      errors.push("Last name is required");
    if (requiredFields.includes("age") && (!pi?.age || pi.age < 13 || pi.age > 120))
      errors.push("Valid age (13-120) is required");
    if (requiredFields.includes("gender") && !pi?.gender)
      errors.push("Gender selection is required");
    if (requiredFields.includes("country") && !pi?.country?.trim())
      errors.push("Country is required");
    if (requiredFields.includes("state") && !pi?.state?.trim())
      errors.push("State is required");
    if (requiredFields.includes("wake_time") && !pi?.wake_time)
      errors.push("Wake time is required");
    if (requiredFields.includes("sleep_time") && !pi?.sleep_time)
      errors.push("Sleep time is required");
    return empty(errors, [], 0);
  }

  // dietPreferences — Fuel screen
  if (store === "dietPreferences") {
    const dp = data as DietPreferencesData | null;
    if (requiredFields.includes("diet_type") && !dp?.diet_type)
      errors.push("Diet type selection is required");
    if (requiredFields.includes("meals")) {
      const enabledMeals = [
        dp?.breakfast_enabled,
        dp?.lunch_enabled,
        dp?.dinner_enabled,
        dp?.snacks_enabled,
      ].filter(Boolean).length;
      if (enabledMeals === 0) errors.push("At least one meal type must be enabled");
    }
    return empty(errors, [], 0);
  }

  // workoutPreferences — Goal screen (primary_goals) + Training screen
  // (activity_level/location/intensity). Both write the same slice; validate
  // only this screen's subset.
  if (store === "workoutPreferences") {
    const wp = data as WorkoutPreferencesData | null;
    if (requiredFields.includes("primary_goals") &&
        (!wp?.primary_goals || wp.primary_goals.length === 0))
      errors.push("Pick at least one goal");
    if (requiredFields.includes("activity_level") && !wp?.activity_level)
      errors.push("Activity level is required");
    if (requiredFields.includes("location") && !wp?.location)
      errors.push("Workout location is required");
    if (requiredFields.includes("intensity") && !wp?.intensity)
      errors.push("Intensity level is required");
    return empty(errors, [], 0);
  }

  return empty(errors, [], 0);
}

// ---------------------------------------------------------------------------
// Completion gate — runs the FULL per-slice validators so the data that
// reaches AI generation is complete. Reuses OnboardingUtils (single source of
// truth for the rules). Called by the Plan screen's Generate CTA.
// Returns per-screen-id validation for the UI + an overall flag.
// ---------------------------------------------------------------------------
export function validateAllForCompletion(
  state: OnboardingScreenState,
): { perScreen: Record<number, TabValidationResult>; canComplete: boolean } {
  // The authoritative per-slice validators (unchanged rules):
  const perSlice = {
    personalInfo: OnboardingUtils.validatePersonalInfo(state.personalInfo),
    dietPreferences: OnboardingUtils.validateDietPreferences(state.dietPreferences),
    bodyAnalysis: OnboardingUtils.validateBodyAnalysis(state.bodyAnalysis),
    workoutPreferences: OnboardingUtils.validateWorkoutPreferences(state.workoutPreferences),
    advancedReview: OnboardingUtils.validateAdvancedReview(state.advancedReview),
  };

  // Map back to screens for UI highlighting (each screen's store slice).
  const perScreen: Record<number, TabValidationResult> = {};
  for (const screen of ONBOARDING_SCREENS) {
    perScreen[screen.id] = perSlice[screen.store];
  }

  const canComplete =
    perSlice.personalInfo.is_valid &&
    perSlice.dietPreferences.is_valid &&
    perSlice.workoutPreferences.is_valid;
  // bodyAnalysis is optional (is_valid:true even when empty); advancedReview is
  // computed on the Plan screen, so not a hard pre-gate here.

  return { perScreen, canComplete };
}
