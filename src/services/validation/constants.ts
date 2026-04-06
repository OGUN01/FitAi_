/**
 * Shared scientific constants for all FitAI calculation services.
 *
 * RULE: Do NOT add hardcoded user-data-dependent values here.
 *       Only add scientifically fixed constants that do not vary per user.
 *
 * SINGLE SOURCE OF TRUTH — import from here, never inline the raw number.
 */

/** Calories in 1 kg of body fat (Oxford/Wishnofsky value, ±7700 kcal/kg) */
export const CALORIE_PER_KG = 7700;

/** Minimum safe daily calorie intake (ACSM / NIM guidelines) */
export const MIN_CALORIES_MALE = 1500;
export const MIN_CALORIES_FEMALE = 1200;

/** Days in a week (used in deficit calculations: weeklyRate × CALORIE_PER_KG / DAYS_PER_WEEK) */
export const DAYS_PER_WEEK = 7;

/** Maximum recommended surplus as a fraction of TDEE for lean bulking (10% cap) */
export const MAX_SURPLUS_FRACTION = 0.10;

/**
 * Default exercise sessions per week used as a fallback for legacy exercise
 * cards (LIGHT/MODERATE/INTENSE activity) that don't specify their own frequency.
 * Note: boost cards (boost_light/boost_cardio/boost_hard) add cardio ON TOP of
 * the user's existing plan and ignore this constant.
 * Value: 5 — appropriate for a cardio-heavy replacement plan; users on boost
 * paths keep their own frequency unchanged.
 */
export const DEFAULT_EXERCISE_SESSIONS_PER_WEEK = 5;
