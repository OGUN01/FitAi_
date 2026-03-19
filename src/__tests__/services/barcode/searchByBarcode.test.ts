jest.mock("@/services/fitaiWorkersClient", () => ({
  __esModule: true,
  default: {
    estimateNutrition: jest.fn(),
  },
}));

import {
  FreeNutritionAPIs,
  estimateNutritionWithAI,
  clearBarcodeCache,
} from "@/services/freeNutritionAPIs";
import fitaiWorkersClient from "@/services/fitaiWorkersClient";

let api: FreeNutritionAPIs;
const originalFetch = global.fetch;
const mockedWorkersClient = fitaiWorkersClient as unknown as {
  estimateNutrition: jest.Mock;
};

function makeOFFResponse(overrides: Record<string, unknown> = {}) {
  return {
    status: 1,
    product: {
      product_name: "Test Product",
      product_name_en: "Test Product EN",
      brands: "TestBrand",
      nutriments: {
        "energy-kcal_100g": 250,
        "energy-kcal": 250,
        proteins_100g: 10,
        carbohydrates_100g: 30,
        fat_100g: 12,
        fiber_100g: 3,
        sugars_100g: 8,
        salt_100g: 1.25,
      },
      ingredients_text: "wheat, sugar, salt",
      allergens_tags: ["en:gluten", "en:milk"],
      nutrition_grades: "c",
      nova_group: 3,
      image_front_url: "https://images.off.org/product.jpg",
      countries_tags: ["en:france"],
      labels_tags: ["en:organic", "en:fair-trade"],
      ...overrides,
    },
  };
}

function makeOFFNotFound() {
  return { status: 0, product: null };
}

beforeEach(() => {
  api = new FreeNutritionAPIs();
  clearBarcodeCache();
  global.fetch = jest.fn();
  jest.useRealTimers();
  mockedWorkersClient.estimateNutrition.mockReset();
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("searchByBarcode", () => {
  it("returns full product data from OFF world with source openfoodfacts", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeOFFResponse(),
    });

    const result = await api.searchByBarcode("3017620422003");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("openfoodfacts");
    expect(result!.needsNutritionEstimate).toBe(false);
    expect(result!.nutrition).not.toBeNull();
    expect(result!.nutrition!.calories).toBe(250);
    expect(result!.nutrition!.protein).toBe(10);
    expect(result!.nutrition!.carbs).toBe(30);
    expect(result!.nutrition!.fat).toBe(12);
    expect(result!.nutrition!.fiber).toBe(3);
    expect(result!.nutrition!.sugar).toBe(8);
    expect(result!.nutrition!.sodium).toBeCloseTo(0.5);
    expect(result!.productInfo.name).toBe("Test Product EN");
    expect(result!.productInfo.brand).toBe("TestBrand");
    expect(result!.productInfo.imageUrl).toBe(
      "https://images.off.org/product.jpg",
    );
    expect(result!.productInfo.ingredients).toBe("wheat, sugar, salt");
    expect(result!.productInfo.allergens).toEqual(["gluten", "milk"]);
    expect(result!.productInfo.labels).toEqual(["organic", "fair-trade"]);
    expect(result!.confidence).toBe(90);
  });

  it("falls back to OFF India when OFF world misses", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeOFFResponse({
            product_name: "Parle-G",
            product_name_en: "Parle-G",
            brands: "Parle",
          }),
      });

    const result = await api.searchByBarcode("8901234567890");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("openfoodfacts-india");
    expect(result!.productInfo.gs1Country).toBe("India");
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain(
      "in.openfoodfacts.org",
    );
  });

  it("keeps packaged food unresolved when OFF has no nutrition and AI estimate is unavailable", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeOFFResponse({
          nutriments: {},
          nutrition_grades: undefined,
          nova_group: undefined,
        }),
    });
    mockedWorkersClient.estimateNutrition.mockResolvedValueOnce({
      success: false,
      error: "Worker unavailable",
    });

    const result = await api.searchByBarcode("3017620422004");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("openfoodfacts");
    expect(result!.needsNutritionEstimate).toBe(true);
    expect(result!.nutrition).toBeNull();
    expect(result!.confidence).toBe(50);
    expect(mockedWorkersClient.estimateNutrition).toHaveBeenCalledWith(
      "Test Product EN",
      "TestBrand",
      "France",
    );
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("uses AI estimation only when a trusted product identity exists but nutrition is missing", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeOFFResponse({
          product_name: "Mystery Snack",
          product_name_en: "Mystery Snack",
          brands: "SnackCo",
          nutriments: {},
          nutrition_grades: undefined,
          nova_group: undefined,
        }),
    });
    mockedWorkersClient.estimateNutrition.mockResolvedValueOnce({
      success: true,
      data: {
        calories: 462,
        protein: 6.7,
        carbs: 72.3,
        fat: 16.7,
        fiber: 2.4,
        sugar: 26.9,
        sodium: 340,
        confidence: 88,
        isAIEstimated: true,
      },
    });

    const result = await api.searchByBarcode("3017620422005");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("openfoodfacts+gemini-estimation");
    expect(result!.isAIEstimated).toBe(true);
    expect(result!.needsNutritionEstimate).toBe(false);
    expect(result!.confidence).toBe(40);
    expect(result!.nutrition).toEqual(
      expect.objectContaining({
        calories: 462,
        protein: 6.7,
        carbs: 72.3,
        fat: 16.7,
        fiber: 2.4,
        source: "gemini-estimation",
        confidence: 40,
      }),
    );
  });

  it("returns null when both OFF endpoints miss instead of inventing a product", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      });

    const result = await api.searchByBarcode("0012345678909");

    expect(result).toBeNull();
    expect(mockedWorkersClient.estimateNutrition).not.toHaveBeenCalled();
  });

  it("does not AI-estimate an Indian barcode when no trusted product identity exists", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      });

    const result = await api.searchByBarcode("8901234567891");

    expect(result).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(mockedWorkersClient.estimateNutrition).not.toHaveBeenCalled();
  });

  it("returns cached result on second call without additional fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeOFFResponse(),
    });

    const barcode = "5000159407236";
    const result1 = await api.searchByBarcode(barcode);
    const result2 = await api.searchByBarcode(barcode);

    expect(result1).toEqual(result2);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("evicts oldest entry when cache exceeds 100 entries", async () => {
    for (let i = 0; i < 100; i++) {
      const barcode = `500${String(i).padStart(10, "0")}`;
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFResponse(),
      });
      await api.searchByBarcode(barcode);
    }

    const firstBarcode = "5000000000000";

    const cachedResult = await api.searchByBarcode(firstBarcode);
    expect(cachedResult).not.toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(100);

    const newBarcode = "5009999999999";
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeOFFResponse(),
    });
    await api.searchByBarcode(newBarcode);
    expect(global.fetch).toHaveBeenCalledTimes(101);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeOFFResponse(),
    });
    await api.searchByBarcode(firstBarcode);
    expect(global.fetch).toHaveBeenCalledTimes(102);
  });

  it("sends User-Agent header on OFF requests", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeOFFResponse(),
    });

    await api.searchByBarcode("4006381333931");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("openfoodfacts.org"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.stringContaining("FitAI"),
        }),
      }),
    );
  });

  it("calls OFF v2 API with correct URL and fields", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeOFFResponse(),
    });

    await api.searchByBarcode("4006381333933");

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(callUrl).toContain("/api/v2/product/");
    expect(callUrl).toContain("fields=");
    expect(callUrl).toContain("product_name");
    expect(callUrl).toContain("nutriments");
    expect(callUrl).toContain("nutrition_grades");
    expect(callUrl).toContain("nova_group");
  });
});

describe("estimateNutritionWithAI", () => {
  it("returns worker-backed AI nutrition with capped low-trust confidence", async () => {
    mockedWorkersClient.estimateNutrition.mockResolvedValueOnce({
      success: true,
      data: {
        calories: 462,
        protein: 6.7,
        carbs: 72.3,
        fat: 16.7,
        fiber: 2.4,
        sugar: 26.9,
        sodium: 340,
        confidence: 95,
        isAIEstimated: true,
      },
    });

    const result = await estimateNutritionWithAI("Parle-G", "Parle", "India");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("gemini-estimation");
    expect(result!.isAIEstimated).toBe(true);
    expect(result!.needsNutritionEstimate).toBe(false);
    expect(result!.confidence).toBe(40);
    expect(result!.nutrition).toEqual(
      expect.objectContaining({
        calories: 462,
        protein: 6.7,
        source: "gemini-estimation",
        confidence: 40,
      }),
    );
  });

  it("returns null and warns when the worker rejects the estimate", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    mockedWorkersClient.estimateNutrition.mockResolvedValueOnce({
      success: false,
      error: "rate limited",
    });

    const result = await estimateNutritionWithAI("Bad Product", "Brand", "USA");

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("returns null and warns when the worker throws", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    mockedWorkersClient.estimateNutrition.mockRejectedValueOnce(
      new Error("network error"),
    );

    const result = await estimateNutritionWithAI("Slow Product", "Brand", "USA");

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
