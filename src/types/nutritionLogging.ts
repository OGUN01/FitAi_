export type NutritionScanMode =
  | "barcode"
  | "label"
  | "meal_photo"
  | "manual";

export type NutritionTruthLevel =
  | "authoritative"
  | "curated"
  | "estimated";

export interface PackagedFoodConflictMetadata {
  barcodeSource?: string | null;
  labelSource?: string | null;
  chosenTruthSource?: "barcode" | "label" | "manual" | "estimated" | null;
  mismatchReason?: string | null;
}

export interface ProductIdentityMetadata {
  barcode?: string | null;
  productName?: string | null;
  brand?: string | null;
}

export interface MealLogProvenance {
  mode: NutritionScanMode;
  truthLevel: NutritionTruthLevel;
  confidence?: number | null;
  countryContext?: string | null;
  requiresReview: boolean;
  source?: string | null;
  productIdentity?: ProductIdentityMetadata | null;
  conflict?: PackagedFoodConflictMetadata | null;
}
