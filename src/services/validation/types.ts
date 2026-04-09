export interface ValidationResult {
  status: "OK" | "WARNING" | "BLOCKED";
  code?: string;
  message?: string;
  recommendations?: string[];
  alternatives?: any[];
  impact?: string;
  risks?: string[];
  canProceed?: boolean;
}

export type RiskLevel =
  | "blocked"
  | "dangerous"
  | "caution"
  | "moderate"
  | "safe"
  | "easy";

export interface SmartAlternative {
  id: string;
  label: string;
  weeklyRate: number;
  dailyCalories: number;       // TRUE required calories (may be below BMR — see isBelowBMR)
  bmrDifference: number;
  timelineWeeks: number;
  riskLevel: RiskLevel;
  icon: string;
  badge: string;
  description: string;
  isUserOriginal: boolean;
  isRecommended: boolean;
  isBlocked: boolean;
  blockReason?: string;
  requiresExercise: boolean;
  exerciseType?: "light" | "moderate" | "intense"
             | "boost_light" | "boost_cardio" | "boost_hard"
             | "freq_4" | "freq_5" | "freq_6" | "freq_7";
  exerciseMinutes?: number;
  exerciseSessions?: number;       // sessions/week the card was calculated with
  exerciseCaloriesBurned?: number;
  exerciseDescription?: string;
  /** True when the diet-only route requires eating below the user's own BMR.
   *  The UI should show this as DANGEROUS and suggest exercise alternatives. */
  isBelowBMR?: boolean;
  /** True when this rate already includes the user's existing workout plan in TDEE */
  workoutPlanInclusive?: boolean;
  /** True when this is a workout frequency upgrade option (weight-gain mode) */
  isFrequencyUpgrade?: boolean;
  /** Motivational note shown on the card (e.g. "More training = better muscle quality") */
  motivationalNote?: string;
}


export interface SmartAlternativesResult {
  alternatives: SmartAlternative[];
  userBMR: number;
  userTDEE: number;
  currentWeight: number;
  targetWeight: number;
  weightToLose: number;
  originalRequestedRate: number;
  showRateComparison: boolean;
  minimumCalorieFloor: number;
  rateAtBMR: number;
  /** ID of the highest-weeklyRate cardio boost option (weight-loss mode only) */
  bestBoostOptionId?: string | null;
  /** Drives WarningCard layout: "loss" | "gain" | "maintenance" */
  goalMode?: "loss" | "gain" | "maintenance";
}

export interface ValidationResults {
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  canProceed: boolean;
  calculatedMetrics: {
    bmr: number;
    tdee: number;
    targetCalories: number;
    weeklyRate: number;
    originalWeeklyRate: number;
    wasRateCapped: boolean;
    protein: number;
    carbs: number;
    fat: number;
    timeline: number;
  };
  adjustments?: {
    refeedSchedule?: any;
    medicalNotes?: string[];
  };
}
