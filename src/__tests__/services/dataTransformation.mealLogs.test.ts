import { DataTransformationService } from "@/services/dataTransformation";
import { MealLog, SyncStatus } from "@/types/localData";

describe("DataTransformationService meal log provenance", () => {
  const service = DataTransformationService.getInstance();

  it("maps meal provenance into Supabase meal_logs fields", () => {
    const mealLog: MealLog = {
      id: "meal_1",
      userId: "user_1",
      mealPlanId: "plan_1",
      planMealId: "monday_breakfast_1",
      fromPlan: true,
      portionMultiplier: 1,
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

    const transformed = service.transformMealLogToSupabase(mealLog, "user_1");

    expect(transformed.meal_name).toBe("Paneer Bowl");
    expect(transformed.meal_plan_id).toBe("plan_1");
    expect(transformed.plan_meal_id).toBe("monday_breakfast_1");
    expect(transformed.from_plan).toBe(true);
    expect(transformed.portion_multiplier).toBe(1);
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
      meal_plan_id: "plan_2",
      meal_type: "snack",
      from_plan: true,
      plan_meal_id: "tuesday_snack_1",
      portion_multiplier: 0.5,
      food_items: [
        {
          id: "food_2",
          foodId: "food_db_2",
          quantity: 1,
          unit: "serving",
          calories: 180,
          macros: {
            protein: 12,
            carbohydrates: 14,
            fat: 8,
            fiber: 5.5,
          },
        },
        {
          id: "food_3",
          foodId: "food_db_3",
          quantity: 1,
          unit: "serving",
          calories: 60,
          macros: {
            protein: 0,
            carbohydrates: 2,
            fat: 0,
            fiber: 1.5,
          },
        },
      ],
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

    expect(hydrated.mealPlanId).toBe("plan_2");
    expect(hydrated.planMealId).toBe("tuesday_snack_1");
    expect(hydrated.fromPlan).toBe(true);
    expect(hydrated.portionMultiplier).toBe(0.5);
    expect(hydrated.totalMacros.fiber).toBe(7);
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

  it("falls back to flat food-item fiber values when nested macros are absent", () => {
    const hydrated = service.transformSupabaseToMealLog({
      id: "meal_3",
      meal_type: "lunch",
      from_plan: false,
      food_items: [
        {
          id: "food_4",
          name: "Apple",
          fiber: 3.4,
        },
        {
          id: "food_5",
          name: "Oats",
          fiber: "4.1",
        },
      ],
      total_calories: 250,
      total_protein: 6,
      total_carbohydrates: 42,
      total_fat: 3,
      logged_at: "2026-03-18T12:00:00.000Z",
    });

    expect(hydrated.totalMacros.fiber).toBe(7.5);
  });
});
