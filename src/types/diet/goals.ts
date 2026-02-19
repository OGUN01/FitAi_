export interface NutritionGoalTarget {
  id: string;
  userId: string;
  type: NutritionGoalType;
  target: number;
  unit: string;
  timeframe: GoalTimeframe;
  startDate: string;
  endDate: string;
  currentProgress: number;
  isAchieved: boolean;
  achievedDate?: string;
  notes?: string;
}

export type NutritionGoalType =
  | "daily_calories"
  | "daily_protein"
  | "daily_carbs"
  | "daily_fat"
  | "daily_fiber"
  | "daily_water"
  | "weekly_meal_prep"
  | "monthly_weight_change"
  | "reduce_sugar"
  | "increase_vegetables"
  | "consistent_logging";

export type GoalTimeframe =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";
