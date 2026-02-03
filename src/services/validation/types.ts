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
  dailyCalories: number;
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
  exerciseType?: "light" | "moderate" | "intense";
  exerciseMinutes?: number;
  exerciseCaloriesBurned?: number;
  exerciseDescription?: string;
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
