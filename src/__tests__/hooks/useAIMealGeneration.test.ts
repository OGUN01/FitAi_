import { act, renderHook } from "@testing-library/react-native";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

const mockSetWeeklyMealPlan = jest.fn();
const mockLoadDailyNutrition = jest.fn(() => Promise.resolve());
const mockRefreshAll = jest.fn(() => Promise.resolve());
const mockLogRecognizedFoods = jest.fn(() =>
  Promise.resolve({ success: true, mealId: "meal-log-1" }),
);
const mockLookupProduct = jest.fn();
const mockScanNutritionLabel = jest.fn();
const mockImageAssetToDataUrl = jest.fn();
const mockImageUriToDataUrl = jest.fn();
const mockLaunchCameraAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();

jest.mock("../../utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

jest.mock("../../stores", () => ({
  useNutritionStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      weeklyMealPlan: null,
      setWeeklyMealPlan: mockSetWeeklyMealPlan,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../stores/profileStore", () => ({
  useProfileStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      personalInfo: null,
      workoutPreferences: null,
      dietPreferences: null,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    isGuestMode: false,
  }),
}));

jest.mock("../../hooks/useNutritionData", () => ({
  useNutritionData: () => ({
    loadDailyNutrition: mockLoadDailyNutrition,
    refreshAll: mockRefreshAll,
  }),
}));

jest.mock("../../hooks/useCalculatedMetrics", () => ({
  useCalculatedMetrics: () => ({
    getCalorieTarget: jest.fn(() => 2000),
  }),
}));

jest.mock("../../stores/subscriptionStore", () => ({
  useSubscriptionStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      canUseFeature: jest.fn(() => true),
      incrementUsage: jest.fn(),
      triggerPaywall: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../services/recognizedFoodLogger", () => ({
  recognizedFoodLogger: {
    logRecognizedFoods: (...args: unknown[]) => mockLogRecognizedFoods(...args),
  },
}));

jest.mock("../../services/foodRecognitionService", () => ({
  foodRecognitionService: null,
}));

jest.mock("../../services/foodRecognitionFeedbackService", () => ({
  foodRecognitionFeedbackService: {},
}));

jest.mock("../../services/barcodeService", () => ({
  barcodeService: {
    lookupProduct: (...args: unknown[]) => mockLookupProduct(...args),
  },
}));

jest.mock("../../services/fitaiWorkersClient", () => ({
  fitaiWorkersClient: {
    scanNutritionLabel: (...args: unknown[]) => mockScanNutritionLabel(...args),
  },
}));

jest.mock("../../ai", () => ({
  aiService: {},
}));

jest.mock("../../utils/packagedFoodNutrition", () => ({
  clampPackagedFoodGrams: (grams: number) => grams,
  getDefaultPackagedFoodGrams: () => 100,
  scaleScannedProductNutrition: (product: any, grams: number) => ({
    calories: Math.round((product.nutrition.calories / 100) * grams),
    protein: Number(((product.nutrition.protein / 100) * grams).toFixed(1)),
    carbs: Number(((product.nutrition.carbs / 100) * grams).toFixed(1)),
    fat: Number(((product.nutrition.fat / 100) * grams).toFixed(1)),
    fiber: Number(((product.nutrition.fiber / 100) * grams).toFixed(1)),
    sugar: Number(((product.nutrition.sugar / 100) * grams).toFixed(1)),
    sodium: Number(((product.nutrition.sodium / 100) * grams).toFixed(1)),
  }),
}));

jest.mock("../../utils/imageDataUrl", () => ({
  imageAssetToDataUrl: (...args: unknown[]) => mockImageAssetToDataUrl(...args),
  imageUriToDataUrl: (...args: unknown[]) => mockImageUriToDataUrl(...args),
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: {
    Images: "Images",
  },
  launchCameraAsync: (...args: unknown[]) => mockLaunchCameraAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
}));

import { useAIMealGeneration } from "../../hooks/useAIMealGeneration";

const product = {
  barcode: "8900000000012",
  name: "Sabudana Khichdi",
  brand: "FitAI",
  source: "openfoodfacts",
  confidence: 96,
  gs1Country: "IN",
  nutrition: {
    calories: 152,
    protein: 4.5,
    carbs: 28,
    fat: 2.1,
    fiber: 1.9,
    sugar: 3.4,
    sodium: 0.21,
  },
} as any;

describe("useAIMealGeneration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLookupProduct.mockReset();
    mockScanNutritionLabel.mockReset();
    mockImageAssetToDataUrl.mockReset();
    mockImageUriToDataUrl.mockReset();
    mockLaunchCameraAsync.mockReset();
    mockLaunchImageLibraryAsync.mockReset();
    mockRequestMediaLibraryPermissionsAsync.mockReset();
    (crossPlatformAlert as jest.Mock).mockClear();
  });

  it("opens the product modal for an authoritative manual lookup result", async () => {
    const { result } = renderHook(() => useAIMealGeneration());

    await act(async () => {
      result.current.handleManualLookupResolved({
        outcome: "authoritative_hit",
        product,
        meta: {
          rawBarcode: product.barcode,
          normalizedBarcode: product.barcode,
          retryable: false,
          lookupPath: ["supabase"],
        },
      });
    });

    expect(result.current.showProductModal).toBe(true);
    expect(result.current.scannedProduct?.name).toBe("Sabudana Khichdi");
  });

  it("shows the weak-data prompt for a weak manual lookup result", async () => {
    const { result } = renderHook(() => useAIMealGeneration());

    await act(async () => {
      result.current.handleManualLookupResolved({
        outcome: "weak_data",
        product: {
          ...product,
          confidence: 40,
          isAIEstimated: true,
          source: "openfoodfacts+gemini-estimation",
        },
        meta: {
          rawBarcode: product.barcode,
          normalizedBarcode: product.barcode,
          retryable: false,
          lookupPath: ["supabase", "off_world", "ai_estimate"],
        },
      });
    });

    expect(crossPlatformAlert).toHaveBeenCalled();
  });

  it("opens product details when weak-data prompt is accepted", async () => {
    const { result } = renderHook(() => useAIMealGeneration());
    const weakProduct = {
      ...product,
      confidence: 40,
      isAIEstimated: true,
      source: "openfoodfacts+gemini-estimation",
    };

    await act(async () => {
      result.current.handleManualLookupResolved({
        outcome: "weak_data",
        product: weakProduct,
        meta: {
          rawBarcode: product.barcode,
          normalizedBarcode: product.barcode,
          retryable: false,
          lookupPath: ["supabase", "off_world", "ai_estimate"],
        },
      });
    });

    const buttons = (crossPlatformAlert as jest.Mock).mock.calls.at(-1)?.[2];
    const viewAnyway = buttons?.find(
      (button: { text?: string; onPress?: () => void }) =>
        button.text === "View Anyway",
    );

    expect(viewAnyway).toBeDefined();

    await act(async () => {
      viewAnyway?.onPress?.();
    });

    expect(result.current.showProductModal).toBe(true);
    expect(result.current.scannedProduct?.name).toBe("Sabudana Khichdi");
    expect(result.current.scannedProduct?.isAIEstimated).toBe(true);
  });

  it("keeps the camera open and shows inline fallback actions on not_found", async () => {
    mockLookupProduct.mockResolvedValue({
      outcome: "not_found",
      error: "Product not found in trusted packaged-food sources.",
      meta: {
        rawBarcode: "012345678905",
        normalizedBarcode: "0012345678905",
        rawSymbology: "upc_a",
        retryable: false,
        lookupPath: ["supabase", "off_world", "off_india"],
      },
    });

    const { result } = renderHook(() => useAIMealGeneration());

    await act(async () => {
      result.current.handleScanProduct();
    });

    await act(async () => {
      await result.current.handleBarcodeScanned(
        "0012345678905",
        "upc_a",
        "012345678905",
      );
    });

    expect(result.current.showCamera).toBe(true);
    expect(result.current.barcodeCameraState).toBe("resolved");
    expect(result.current.barcodeInlineActions.map((action: any) => action.id)).toEqual(
      ["retry", "manual", "label", "contribute", "cancel"],
    );
  });

  it("does not mirror packaged-food logs into weeklyMealPlan", async () => {
    const { result } = renderHook(() => useAIMealGeneration());

    await act(async () => {
      await result.current.handleAddProductToMeal(product, jest.fn(), 250);
    });

    expect(mockLogRecognizedFoods).toHaveBeenCalledWith(
      "user-1",
      expect.any(Array),
      "lunch",
      undefined,
      expect.any(Object),
    );
    expect(mockSetWeeklyMealPlan).not.toHaveBeenCalled();
    expect(mockLoadDailyNutrition).toHaveBeenCalled();
    expect(mockRefreshAll).toHaveBeenCalled();
  });

  it("opens the in-app camera for label scans without launching the image-picker camera", async () => {
    const { result } = renderHook(() => useAIMealGeneration());

    await act(async () => {
      const started = await result.current.handleLabelScanned();
      expect(started).toBe(true);
    });

    expect(result.current.showCamera).toBe(true);
    expect(result.current.cameraMode).toBe("label");
    expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
  });

  it("processes a captured label image into the shared product review flow without barcode lookup", async () => {
    mockImageUriToDataUrl.mockResolvedValue("data:image/jpeg;base64,label");
    mockScanNutritionLabel.mockResolvedValue({
      success: true,
      data: {
        productName: "Labelled Oats",
        brand: "FitAI",
        servingSize: 40,
        servingUnit: "g",
        perServing: {
          calories: 120,
          protein: 3,
          carbs: 22,
          fat: 2,
          fiber: 4,
          sugar: 1,
          sodium: 0.1,
        },
        per100g: {
          calories: 300,
          protein: 7.5,
          carbs: 55,
          fat: 5,
          fiber: 10,
          sugar: 2.5,
          sodium: 0.25,
        },
        confidence: 94,
        source: "vision-label",
      },
    });

    const onScanResult = jest.fn();
    const { result } = renderHook(() => useAIMealGeneration());

    act(() => {
      result.current.setLogMealScanCallback(onScanResult);
    });

    await act(async () => {
      const started = await result.current.handleLabelScanned(
        undefined,
        42,
        "Oats",
        "log_meal_label",
      );
      expect(started).toBe(true);
    });

    await act(async () => {
      await result.current.handleLabelCameraCapture("file:///label.jpg");
    });

    expect(mockImageUriToDataUrl).toHaveBeenCalledWith("file:///label.jpg");
    expect(mockScanNutritionLabel).toHaveBeenCalledWith(
      "data:image/jpeg;base64,label",
      "Oats",
    );
    expect(mockLookupProduct).not.toHaveBeenCalled();
    expect(onScanResult).not.toHaveBeenCalled();
    expect(result.current.showProductModal).toBe(true);
    expect(result.current.scannedProduct).toMatchObject({
      name: "Labelled Oats",
      brand: "FitAI",
      source: "vision-label",
      nutrition: expect.objectContaining({
        calories: 300,
        protein: 7.5,
        carbs: 55,
        fat: 5,
        fiber: 10,
        servingSize: 42,
        servingUnit: "g",
      }),
      perServing: expect.objectContaining({
        calories: 120,
        protein: 3,
        carbs: 22,
        fat: 2,
        fiber: 4,
      }),
    });
    expect(result.current.productHealthAssessment).toEqual(
      expect.objectContaining({
        overallScore: expect.any(Number),
      }),
    );
    expect(result.current.showCamera).toBe(false);
    expect(result.current.cameraMode).toBe("food");
  });

  it("logs label-scanned products with label provenance instead of barcode metadata", async () => {
    const { result } = renderHook(() => useAIMealGeneration());
    const labelProduct = {
      ...product,
      barcode: "label_123",
      source: "vision-label",
      nutrition: {
        ...product.nutrition,
        servingSize: 40,
        servingUnit: "g",
      },
      perServing: {
        calories: 61,
        protein: 1.8,
        carbs: 11.2,
        fat: 0.8,
        fiber: 0.8,
        sugar: 1.4,
        sodium: 0.08,
      },
    } as any;

    await act(async () => {
      await result.current.handleAddProductToMeal(labelProduct, jest.fn(), 60);
    });

    const [userId, foods, mealType, , options] = mockLogRecognizedFoods.mock.calls.at(
      -1,
    )!;

    expect(userId).toBe("user-1");
    expect(mealType).toBe("lunch");
    expect(foods[0]).toMatchObject({
      id: expect.stringMatching(/^packaged_label_/),
      enhancementSource: "label",
      userGrams: 60,
      estimatedGrams: 60,
    });
    expect(foods[0].barcode).toBeUndefined();
    expect(options.provenance).toMatchObject({
      mode: "label",
      source: "vision-label",
      conflict: {
        labelSource: "vision-label",
        chosenTruthSource: "label",
      },
      productIdentity: {
        barcode: null,
        productName: "Sabudana Khichdi",
        brand: "FitAI",
      },
    });
  });
});
