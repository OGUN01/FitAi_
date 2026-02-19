import {
  Meal,
  Food,
  Macronutrients,
  NutritionPlan,
  DailyMealPlan,
} from "../diet";
import { SyncStatus, SyncMetadata } from "./sync";

export interface LocalFood extends Food {
  localId: string;
  isCustom: boolean;
  isFavorite: boolean;
  lastUsed?: string;
  usageCount: number;
  userNotes?: string;
  verificationStatus: "verified" | "user_created" | "ai_suggested";
}

export interface LoggedFood {
  id: string;
  foodId: string;
  food?: LocalFood;
  quantity: number;
  unit: string;
  calories?: number;
  macros?: Macronutrients;
}

export interface LocalNutritionPlan extends NutritionPlan {
  localId: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
  isActive: boolean;
  progress: {
    startedAt: string;
    currentDay: number;
    adherenceRate: number;
    averageCalories: number;
    averageMacros: Macronutrients;
  };
}

export interface LocalDailyMealPlan extends DailyMealPlan {
  localId: string;
  actualIntake?: {
    calories: number;
    macros: Macronutrients;
    meals: MealLog[];
  };
  adherenceScore: number;
  notes?: string;
}

export interface MealLog {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  foods: LoggedFood[];
  totalCalories: number;
  totalMacros: Macronutrients;
  loggedAt: string;
  userId?: string;
  date?: string;
  notes?: string;
  timestamp?: string;
  photos?: string[];
  location?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  mood?: "satisfied" | "still_hungry" | "too_full";
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
}

export interface WaterLog {
  id: string;
  date: string;
  amount: number;
  loggedAt: string;
  syncStatus: SyncStatus;
  syncMetadata: SyncMetadata;
}

export interface LocalNutritionData {
  meals?: Meal[];
  foods?: Food[];
  logs: MealLog[];
  plans?: NutritionPlan[];
  customFoods?: Food[];
  waterLogs?: WaterLog[];
}

export { Macronutrients } from "../diet";
