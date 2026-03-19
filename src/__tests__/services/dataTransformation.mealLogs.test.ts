import { DataTransformationService } from "@/services/dataTransformation";
import { MealLog, SyncStatus } from "@/types/localData";

describe("DataTransformationService meal log provenance", () => {
  const service = DataTransformationService.getInstance();

  it("maps meal provenance into Supabase meal_logs fields", () => {
    const mealLog: MealLog = {
      id: "meal_1",
      userId: "user_1",
      mealType: "lunch",
      foods: [
        {
          id: "food_1",
          foodId: "food_db_1",
          name: "Paneer Bowl",
          quantity: 220,
          unit: "grams",
          calories: 450,
          macros: {
            protein: 28,
            carbohydrates: 18,
            fat: 24,
            fiber: 6,
          },
        },
      ],
      totalCalories: 450,
      totalMacros: {
        protein: 28,
        carbohydrates: 18,
        fat: 24,
        fiber: 6,
      },
      loggedAt: "2026-03-18T10:00:00.000Z",
      notes: "Paneer Bowl",
      provenance: {
        mode: "label",
        truthLevel: "authoritative",
        confidence: 94,
        countryContext: "IN",
        requiresReview: false,
        source: "vision-label",
        productIdentity: {
          barcode: "8901234567890",
          productName: "Paneer Bowl",
          brand: "FitAI",
        },
        conflict: {
          labelSource: "vision-label",
          chosenTruthSource: "label",
        },
      },
      syncStatus: SyncStatus.PENDING,
      syncMetadata: {
        lastModifiedAt: "2026-03-18T10:00:00.000Z",
        syncVersion: 1,
        deviceId: "test-device",
      },
    };

    const transformed = service.transformMealLogToSupabase(
      mealLog,
      "user_1",
    );

    expect(transformed.meal_name).toBe("Paneer Bowl");
    expect(transformed.logging_mode).toBe("label");
    expect(transformed.truth_level).toBe("authoritative");
    expect(transformed.requires_review).toBe(false);
    expect(transformed.source_metadata).toEqual({
      source: "vision-label",
      productIdentity: {
        barcode: "8901234567890",
        productName: "Paneer Bowl",
        brand: "FitAI",
      },
      conflict: {
        labelSource: "vision-label",
        chosenTruthSource: "label",
      },
    });
  });

  it("hydrates provenance from Supabase meal_logs rows", () => {
    const hydrated = service.transformSupabaseToMealLog({
      id: "meal_2",
      meal_type: "snack",
      food_items: [],
      total_calories: 180,
      total_protein: 12,
      total_carbohydrates: 14,
      total_fat: 8,
      notes: "Protein Bar",
      logged_at: "2026-03-18T15:00:00.000Z",
      logging_mode: "barcode",
      truth_level: "curated",
      confidence: 88,
      country_context: "IN",
      requires_review: true,
      source_metadata: {
        source: "openfoodfacts",
        productIdentity: {
          barcode: "8900000000000",
          productName: "Protein Bar",
          brand: "Demo",
        },
        conflict: {
          barcodeSource: "openfoodfacts",
          chosenTruthSource: "barcode",
        },
      },
    });

    expect(hydrated.provenance).toEqual({
      mode: "barcode",
      truthLevel: "curated",
      confidence: 88,
      countryContext: "IN",
      requiresReview: true,
      source: "openfoodfacts",
      productIdentity: {
        barcode: "8900000000000",
        productName: "Protein Bar",
        brand: "Demo",
      },
      conflict: {
        barcodeSource: "openfoodfacts",
        chosenTruthSource: "barcode",
      },
    });
  });
});
