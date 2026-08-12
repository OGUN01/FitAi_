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
const mockRecognizeFood = jest.fn();
const mockGenerateMeal = jest.fn();
const mockGenerateDailyMealPlan = jest.fn();
const mockCanUseFeature = jest.fn(() => true);
const mockIncrementUsage = jest.fn();
const mockTriggerPaywall = jest.fn();

// Mutable so individual tests can opt into a populated profile (needed for
// the allergen-check flow, which requires mergedPersonalInfo/mergedFitnessGoals
// to be non-null). Defaults match the previous fixed-null mock.
const mockProfileState: {
  personalInfo: any;
  workoutPreferences: any;
  dietPreferences: any;
  bodyAnalysis: any;
} = {
  personalInfo: null,
  workoutPreferences: null,
  dietPreferences: null,
  bodyAnalysis: null,
};

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

jest.mock("../../stores/profileStore", () => {
  const fn = jest.fn((selector?: (state: any) => unknown) =>
    selector ? selector(mockProfileState) : mockProfileState,
  );
  (fn as any).getState = jest.fn(() => mockProfileState);
  return { useProfileStore: fn };
});

// buildLegacyPersonalInfo (unmodified) resolves current weight via this
// service, which itself reads analyticsStore/weightTrackingService. Stub it
// so tests that populate mockProfileState.personalInfo don't need to wire up
// those unrelated stores too.
jest.mock("../../services/currentWeight", () => ({
  resolveCurrentWeightFromStores: () => ({
    value: 65,
    source: "body_analysis",
    asOf: null,
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
      canUseFeature: (...args: unknown[]) => mockCanUseFeature(...args),
      incrementUsage: (...args: unknown[]) => mockIncrementUsage(...args),
      triggerPaywall: (...args: unknown[]) => mockTriggerPaywall(...args),
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
  foodRecognitionService: {
    recognizeFood: (...args: unknown[]) => mockRecognizeFood(...args),
  },
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
  aiService: {
    generateMeal: (...args: unknown[]) => mockGenerateMeal(...args),
    generateDailyMealPlan: (...args: unknown[]) => mockGenerateDailyMealPlan(...args),
  },
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
    mockRecognizeFood.mockReset();
    mockGenerateMeal.mockReset();
    mockGenerateDailyMealPlan.mockReset();
    mockCanUseFeature.mockReset().mockReturnValue(true);
    mockIncrementUsage.mockReset();
    mockTriggerPaywall.mockReset();
    mockProfileState.personalInfo = null;
    mockProfileState.workoutPreferences = null;
    mockProfileState.dietPreferences = null;
    mockProfileState.bodyAnalysis = null;
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
          confidence: 50,
          needsNutritionEstimate: true,
          source: "openfoodfacts",
        },
        meta: {
          rawBarcode: product.barcode,
          normalizedBarcode: product.barcode,
          retryable: false,
          lookupPath: ["supabase", "off_world"],
        },
      });
    });

    expect(crossPlatformAlert).toHaveBeenCalled();
  });

  it("opens product details when weak-data prompt is accepted", async () => {
    const { result } = renderHook(() => useAIMealGeneration());
    const weakProduct = {
      ...product,
      confidence: 50,
      needsNutritionEstimate: true,
      source: "openfoodfacts",
    };

    await act(async () => {
      result.current.handleManualLookupResolved({
        outcome: "weak_data",
        product: weakProduct,
        meta: {
          rawBarcode: product.barcode,
          normalizedBarcode: product.barcode,
          retryable: false,
          lookupPath: ["supabase", "off_world"],
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
    expect(result.current.scannedProduct?.needsNutritionEstimate).toBe(true);
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

  it("charges a barcode_scan usage credit after a successful AI photo recognition", async () => {
    mockRecognizeFood.mockResolvedValue({
      success: true,
      foods: [
        {
          id: "recognized-1",
          name: "Banana",
          nutrition: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
        },
      ],
      overallConfidence: 88,
    });

    const { result } = renderHook(() => useAIMealGeneration());

    await act(async () => {
      await result.current.handleCameraCapture("file:///photo.jpg", jest.fn());
    });

    expect(result.current.showWeightPrompt).toBe(true);

    await act(async () => {
      await result.current.confirmPhotoRecognition();
    });

    expect(mockRecognizeFood).toHaveBeenCalled();
    expect(mockIncrementUsage).toHaveBeenCalledWith("barcode_scan");
    expect(result.current.showScanResult).toBe(true);
  });

  it("shows an offline message instead of the lighting hint when a label scan fails offline", async () => {
    mockImageUriToDataUrl.mockResolvedValue("data:image/jpeg;base64,label");
    mockScanNutritionLabel.mockResolvedValue({
      success: false,
      isOffline: true,
      offlineReason: "Network unavailable",
    });

    const { result } = renderHook(() => useAIMealGeneration());

    await act(async () => {
      await result.current.handleLabelScanned();
    });

    await act(async () => {
      await result.current.handleLabelCameraCapture("file:///label.jpg");
    });

    expect(crossPlatformAlert).toHaveBeenCalledWith(
      "You're Offline",
      "Network unavailable",
    );
    expect(result.current.showProductModal).toBe(false);
    expect(mockIncrementUsage).not.toHaveBeenCalledWith("barcode_scan");
  });

  it("blocks a generated meal behind an allergen warning and only adds it on Add Anyway", async () => {
    mockProfileState.personalInfo = { name: "Ann", country: "US" };
    mockProfileState.workoutPreferences = {
      primary_goals: ["muscle_gain"],
      activity_level: "moderate",
      intensity: "beginner",
      time_preference: 45,
      equipment: [],
    };
    mockProfileState.dietPreferences = {
      allergies: ["peanut"],
      diet_type: "vegetarian",
      restrictions: [],
    };
    mockProfileState.bodyAnalysis = { height_cm: 170, current_weight_kg: 65 };
    mockGenerateMeal.mockResolvedValue({
      success: true,
      data: {
        name: "Peanut Butter Toast",
        ingredients: ["bread", "peanut butter"],
        calories: 300,
      },
    });

    const { result } = renderHook(() => useAIMealGeneration());

    await act(async () => {
      await result.current.generateAIMeal("breakfast", jest.fn());
    });

    expect(crossPlatformAlert).toHaveBeenCalledWith(
      "Possible Allergen Warning",
      expect.stringContaining("peanut"),
      expect.any(Array),
    );
    expect(mockSetWeeklyMealPlan).not.toHaveBeenCalled();

    const warningCall = (crossPlatformAlert as jest.Mock).mock.calls.find(
      (call) => call[0] === "Possible Allergen Warning",
    )!;
    const buttons = warningCall[2] as Array<{
      text?: string;
      onPress?: () => void;
    }>;
    const addAnyway = buttons.find((button) => button.text === "Add Anyway");
    expect(addAnyway).toBeDefined();

    await act(async () => {
      addAnyway?.onPress?.();
    });

    expect(mockSetWeeklyMealPlan).toHaveBeenCalled();
    expect(mockIncrementUsage).toHaveBeenCalledWith("ai_generation");
    expect(crossPlatformAlert).toHaveBeenCalledWith(
      "Meal Added",
      expect.stringContaining("allergen warning"),
    );
  });
});
