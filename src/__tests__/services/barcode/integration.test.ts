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
  it("returns an authoritative hit for a trusted OFF world product", async () => {
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

    expect(result.outcome).toBe("authoritative_hit");
    expect(result.product).toBeDefined();
    expect(result.meta.lookupPath).toEqual(["supabase", "off_world"]);
    const product = result.product!;
    expect(product.name).toBe("Nutella");
    expect(product.nutrition.calories).toBe(530);
    expect(product.nutriScore).toBe("d");
    expect(product.novaGroup).toBe(4);
    expect(product.gs1Country).toBe("France");
    expect(result.meta.finalSource).toBe("openfoodfacts");
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

    expect(result.outcome).toBe("authoritative_hit");
    expect(result.meta.lookupPath).toEqual(["supabase", "off_world", "off_india"]);
    expect(result.product?.gs1Country).toBe("India");
    expect(result.product?.source).toBe("openfoodfacts-india");
  });

  it("returns not_found when trusted sources complete without a hit", async () => {
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

    expect(result.outcome).toBe("not_found");
    expect(result.product).toBeUndefined();
    expect(mockedWorkersClient.estimateNutrition).not.toHaveBeenCalled();
  });

  it("returns invalid_scan for malformed input without calling fetch", async () => {
    const result = await barcodeService.lookupProduct("ABC123");

    expect(result.outcome).toBe("invalid_scan");
    expect(result.error).toBeDefined();
    expect(result.product).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns invalid_scan when raw symbology does not match raw numeric content", async () => {
    const result = await barcodeService.lookupProduct("12345670", {
      rawSymbology: "ean13",
    });

    expect(result.outcome).toBe("invalid_scan");
    expect(result.error).toContain("does not match");
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

    expect(result1.outcome).toBe("authoritative_hit");
    expect(result2.outcome).toBe("authoritative_hit");
    expect(result1.product!.name).toBe("Cached Product");
    expect(result2.product!.name).toBe("Cached Product");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns weak_data when a trusted identity exists but nutrition is AI-estimated", async () => {
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

    expect(result.outcome).toBe("weak_data");
    expect(result.product).toBeDefined();
    expect(result.product!.source).toBe("openfoodfacts+gemini-estimation");
    expect(result.product!.isAIEstimated).toBe(true);
    expect(result.meta.lookupPath).toEqual([
      "supabase",
      "off_world",
      "ai_estimate",
    ]);
  });

  it("returns transient_failure when trusted sources do not complete cleanly", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Timeout after 5000ms"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockRejectedValueOnce(new Error("Timeout after 5000ms"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      });

    const result = await barcodeService.lookupProduct("8901234567892");

    expect(result.outcome).toBe("transient_failure");
    expect(result.meta.retryable).toBe(true);
    expect(result.product).toBeUndefined();
  });
});
