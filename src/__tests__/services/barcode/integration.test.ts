jest.mock("@/services/sqliteFood", () => ({
  sqliteFood: {
    isDatabaseReady: jest.fn(() => false),
    lookupBarcode: jest.fn(),
  },
}));

jest.mock("@/services/supabase", () => ({
  supabase: {
    rpc: jest.fn((fnName: string) => {
      if (fnName === "lookup_barcode") {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  },
}));

jest.mock("@/services/fitaiWorkersClient", () => ({
  __esModule: true,
  default: {
    estimateNutrition: jest.fn(),
  },
}));

import barcodeService from "@/services/barcodeService";
import type { ProductLookupResult } from "@/services/barcodeService";
import fitaiWorkersClient from "@/services/fitaiWorkersClient";

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
  global.fetch = jest.fn();
  jest.useRealTimers();
  mockedWorkersClient.estimateNutrition.mockReset();
  barcodeService.clearCache();
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("lookupProduct integration", () => {
  it("returns a packaged product from OFF world with full nutrition", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeOFFResponse({
          product_name: "Nutella",
          product_name_en: "Nutella",
          brands: "Ferrero",
          nutriments: {
            "energy-kcal_100g": 530,
            "energy-kcal": 530,
            proteins_100g: 6.3,
            carbohydrates_100g: 57.5,
            fat_100g: 30.9,
            fiber_100g: 0,
            sugars_100g: 56.3,
            salt_100g: 0.107,
          },
          nutrition_grades: "d",
          nova_group: 4,
          image_front_url: "https://example.com/nutella.jpg",
        }),
    });

    const result: ProductLookupResult =
      await barcodeService.lookupProduct("3017620422003");

    expect(result.success).toBe(true);
    expect(result.product).toBeDefined();
    const p = result.product!;
    expect(p.name).toBe("Nutella");
    expect(p.nutrition.calories).toBe(530);
    expect(p.nutrition.protein).toBe(6.3);
    expect(p.nutrition.carbs).toBe(57.5);
    expect(p.nutrition.fat).toBe(30.9);
    expect(p.nutriScore).toBe("d");
    expect(p.novaGroup).toBe(4);
    expect(p.gs1Country).toBe("France");
    expect(p.source).toBe("openfoodfacts");
  });

  it("falls back to OFF India for an Indian barcode when world misses", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeOFFResponse({
            product_name: "Parle-G Biscuits",
            brands: "Parle",
            nutriments: {
              "energy-kcal_100g": 462,
              "energy-kcal": 462,
              proteins_100g: 6.7,
              carbohydrates_100g: 72.3,
              fat_100g: 16.7,
              fiber_100g: 2.4,
              sugars_100g: 26.9,
              salt_100g: 0.85,
            },
          }),
      });

    const result = await barcodeService.lookupProduct("8901234567890");

    expect(result.success).toBe(true);
    expect(result.product).toBeDefined();
    const p = result.product!;
    expect(p.gs1Country).toBe("India");
    expect(p.needsNutritionEstimate).toBe(false);
    expect(p.nutrition.calories).toBe(462);
    expect(p.source).toBe("openfoodfacts-india");
  });

  it("returns failure when no trusted barcode source finds the product", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      });

    const result = await barcodeService.lookupProduct("4006381333931");

    expect(result.success).toBe(false);
    expect(result.product).toBeUndefined();
    expect(mockedWorkersClient.estimateNutrition).not.toHaveBeenCalled();
  });

  it("normalizes UPC-A barcodes before lookup", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeOFFResponse(),
    });

    await barcodeService.lookupProduct("012345678905");

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("0012345678905");
    expect(calledUrl).toContain("openfoodfacts.org");
  });

  it("fails fast on invalid barcodes without calling fetch", async () => {
    const result = await barcodeService.lookupProduct("ABC123");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.product).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns cached products on repeated lookups", async () => {
    const barcode = "3017620422099";
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeOFFResponse({
          product_name_en: "Cached Product",
        }),
    });

    const result1 = await barcodeService.lookupProduct(barcode);
    const result2 = await barcodeService.lookupProduct(barcode);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.product!.name).toBe("Cached Product");
    expect(result2.product!.name).toBe("Cached Product");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not invent nutrition for Indian barcodes with no trusted identity", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      });

    const result = await barcodeService.lookupProduct("8901234567891");

    expect(result.success).toBe(false);
    expect(mockedWorkersClient.estimateNutrition).not.toHaveBeenCalled();
  });

  it("uses AI estimation only after a trusted product identity is found", async () => {
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
        calories: 450,
        protein: 8,
        carbs: 65,
        fat: 18,
        fiber: 2,
        sugar: 25,
        sodium: 150,
        confidence: 85,
        isAIEstimated: true,
      },
    });

    const result = await barcodeService.lookupProduct("3017620422055");

    expect(result.success).toBe(true);
    expect(result.product).toBeDefined();
    const p = result.product!;
    expect(p.source).toBe("openfoodfacts+gemini-estimation");
    expect(p.isAIEstimated).toBe(true);
    expect(p.confidence).toBe(40);
    expect(p.nutrition.calories).toBe(450);
    expect(p.nutrition.protein).toBe(8);
    expect(p.nutrition.carbs).toBe(65);
    expect(p.nutrition.fat).toBe(18);
    expect(p.needsNutritionEstimate).toBe(false);
  });

  it("continues to OFF India when OFF world fails", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Timeout after 5000ms"))
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () =>
            makeOFFResponse({
              product_name: "Fallback India Product",
              product_name_en: "Fallback India Product",
            }),
        }),
      );

    const result = await barcodeService.lookupProduct("8901234567892");

    expect(result.success).toBe(true);
    expect(result.product).toBeDefined();
    expect(result.product!.source).toBe("openfoodfacts-india");
  });
});
