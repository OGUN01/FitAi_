import { recognizedFoodLogger } from "../../services/recognizedFoodLogger";
import { RecognizedFood } from "../../services/foodRecognitionService";

jest.mock("../../services/nutritionData", () => ({
  nutritionDataService: {
    logMeal: jest.fn(),
  },
}));

jest.mock("../../services/nutritionRefreshService", () => ({
  nutritionRefreshService: {
    refreshAfterMealLogged: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("../../services/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

const { nutritionDataService } = jest.requireMock("../../services/nutritionData");

describe("recognizedFoodLogger", () => {
  const baseFood: RecognizedFood = {
    id: "food-1",
    name: "Paneer Bhurji",
    category: "main",
    cuisine: "indian",
    estimatedGrams: 180,
    servingDescription: "1 bowl",
    nutrition: {
      calories: 320,
      protein: 18,
      carbs: 12,
      fat: 22,
      fiber: 4,
      sugar: 6,
      sodium: 480,
    },
    nutritionPer100g: {
      calories: 178,
      protein: 10,
      carbs: 6.7,
      fat: 12.2,
      fiber: 2.2,
      sugar: 3.3,
      sodium: 266,
    },
    confidence: 84,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    nutritionDataService.logMeal.mockResolvedValue({
      success: true,
      data: { id: "meal-log-1", created_at: "2026-03-19T10:00:00.000Z" },
    });
  });

  it("omits micronutrients for estimated meal-photo logs", async () => {
    await recognizedFoodLogger.logRecognizedFoods(
      "user-1",
      [baseFood],
      "lunch",
      undefined,
      {
        provenance: {
          mode: "meal_photo",
          truthLevel: "estimated",
          confidence: 84,
          countryContext: "IN",
          requiresReview: true,
          source: "food-recognition",
        },
      },
    );

    expect(nutritionDataService.logMeal).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        foods: [
          expect.objectContaining({
            calories: 320,
            protein: 18,
            carbs: 12,
            fat: 22,
            fiber: undefined,
            sugar: undefined,
            sodium: undefined,
          }),
        ],
      }),
    );
  });

  it("preserves packaged-food details for authoritative barcode logs", async () => {
    await recognizedFoodLogger.logRecognizedFoods(
      "user-1",
      [baseFood],
      "lunch",
      undefined,
      {
        provenance: {
          mode: "barcode",
          truthLevel: "authoritative",
          confidence: 98,
          countryContext: "IN",
          requiresReview: false,
          source: "open-food-facts",
        },
      },
    );

    expect(nutritionDataService.logMeal).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        foods: [
          expect.objectContaining({
            fiber: 4,
            sugar: 6,
            sodium: 480,
          }),
        ],
      }),
    );
  });

  it("persists reusable foods only when the opt-in flag is enabled", async () => {
    const createOrFindFoodsSpy = jest
      .spyOn(recognizedFoodLogger as any, "createOrFindFoods")
      .mockResolvedValue([
        {
          recognizedFood: baseFood,
          databaseFoodId: "catalog-food-1",
          isNewFood: true,
        },
      ]);

    await recognizedFoodLogger.logRecognizedFoods(
      "user-1",
      [baseFood],
      "lunch",
      undefined,
      {
        provenance: {
          mode: "meal_photo",
          truthLevel: "estimated",
          confidence: 84,
          countryContext: "IN",
          requiresReview: true,
          source: "food-recognition",
        },
        persistCatalogFoods: true,
      },
    );

    expect(createOrFindFoodsSpy).toHaveBeenCalledWith([baseFood]);
    expect(nutritionDataService.logMeal).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        foods: [
          expect.objectContaining({
            food_id: "catalog-food-1",
          }),
        ],
      }),
    );
  });
});
