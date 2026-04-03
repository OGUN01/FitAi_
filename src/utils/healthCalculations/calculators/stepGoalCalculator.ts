/**
 * Personalized Step Goal Calculator
 *
 * Calculates a daily step goal based on:
 * - Activity level (sedentary → very_active)
 * - Primary fitness goals (weight_loss, muscle_gain)
 * - Age adjustment (youth boost, senior reduction)
 * - Experience level (beginner → advanced)
 *
 * Result is rounded to nearest 500, clamped to [3000, 15000].
 */

interface StepGoalInput {
  activityLevel?: string;
  primaryGoals?: string[];
  age?: number;
  experienceLevel?: string;
}

const ACTIVITY_BASE: Record<string, number> = {
  sedentary: 5000,
  light: 7000,
  moderate: 8500,
  active: 10000,
  very_active: 12000,
  extreme: 12000, // Alias for very_active (onboarding uses "extreme")
};

const EXPERIENCE_ADJUSTMENT: Record<string, number> = {
  beginner: -1000,
  intermediate: 0,
  advanced: 1000,
};

const MIN_STEP_GOAL = 3000;
const MAX_STEP_GOAL = 15000;

/**
 * Calculate a personalized daily step goal from user profile data.
 *
 * @returns Step goal rounded to nearest 500, between 3000 and 15000.
 */
export function calculatePersonalizedStepGoal(input: StepGoalInput): number {
  // Base from activity level (default to moderate if unknown)
  const base = ACTIVITY_BASE[input.activityLevel ?? ''] ?? ACTIVITY_BASE.moderate;

  // Goal adjustments
  let goalAdjustment = 0;
  if (input.primaryGoals?.length) {
    for (const goal of input.primaryGoals) {
      const normalized = goal.replace(/-/g, '_');
      if (normalized === 'weight_loss') goalAdjustment += 1000;
      if (normalized === 'muscle_gain') goalAdjustment += 500;
    }
  }

  // Age adjustment
  let ageAdjustment = 0;
  if (input.age != null) {
    if (input.age > 60) ageAdjustment = -1000;
    else if (input.age < 25) ageAdjustment = 500;
  }

  // Experience adjustment
  const expAdj = EXPERIENCE_ADJUSTMENT[input.experienceLevel ?? ''] ?? 0;

  const raw = base + goalAdjustment + ageAdjustment + expAdj;

  // Round to nearest 500 and clamp
  const rounded = Math.round(raw / 500) * 500;
  return Math.max(MIN_STEP_GOAL, Math.min(MAX_STEP_GOAL, rounded));
}
