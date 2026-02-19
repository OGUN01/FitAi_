export interface NutritionTip {
  id: string;
  title: string;
  content: string;
  category: NutritionTipCategory;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  sources: string[];
  imageUrl?: string;
  videoUrl?: string;
  isPersonalized: boolean;
  relevanceScore?: number;
}

export type NutritionTipCategory =
  | "macronutrients"
  | "micronutrients"
  | "hydration"
  | "meal_timing"
  | "food_prep"
  | "supplements"
  | "weight_management"
  | "performance"
  | "recovery"
  | "general_health";
