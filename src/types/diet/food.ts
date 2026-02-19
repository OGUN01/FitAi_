import { NutritionInfo } from "./nutrition";

export interface Food {
  id: string;
  name: string;
  brand?: string;
  category: FoodCategory;
  nutrition: NutritionInfo;
  allergens: Allergen[];
  dietaryLabels: DietaryLabel[];
  barcode?: string;
  imageUrl?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FoodCategory =
  | "fruits"
  | "vegetables"
  | "grains"
  | "proteins"
  | "dairy"
  | "fats_oils"
  | "beverages"
  | "snacks"
  | "condiments"
  | "supplements"
  | "prepared_foods"
  | "other";

export type Allergen =
  | "milk"
  | "eggs"
  | "fish"
  | "shellfish"
  | "tree_nuts"
  | "peanuts"
  | "wheat"
  | "soybeans"
  | "sesame";

export type DietaryLabel =
  | "vegan"
  | "vegetarian"
  | "gluten_free"
  | "dairy_free"
  | "nut_free"
  | "organic"
  | "non_gmo"
  | "keto_friendly"
  | "paleo_friendly"
  | "low_carb"
  | "high_protein"
  | "low_sodium"
  | "sugar_free";
