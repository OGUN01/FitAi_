import {
  FreeNutritionAPIs,
  clearBarcodeCache,
} from "@/services/freeNutritionAPIs";

let api: FreeNutritionAPIs;
const originalFetch = global.fetch;

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

  it("keeps needsNutritionEstimate true when OFF has no nutrition and name search also misses (no AI fallback)", async () => {
    (global.fetch as jest.Mock)
      // 1st call: OFF world barcode lookup — product found, no nutrition
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeOFFResponse({
            nutriments: {},
            nutrition_grades: undefined,
            nova_group: undefined,
          }),
      })
      // 2nd call: OFF name search — no results
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

    const result = await api.searchByBarcode("3017620422004");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("openfoodfacts");
    expect(result!.needsNutritionEstimate).toBe(true);
    expect(result!.nutrition).toBeNull();
    expect(result!.confidence).toBe(50);
    expect(result!.isAIEstimated).toBeUndefined();
  });

  it("uses OFF name-search to fill nutrition when product identity exists but barcode lacks nutrition (no AI)", async () => {
    (global.fetch as jest.Mock)
      // 1st call: OFF world barcode lookup — product found, no nutrition
      .mockResolvedValueOnce({
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
      })
      // 2nd call: OFF name search — finds a nutrition match
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [
            {
              product_name: "Mystery Snack",
              nutriments: {
                "energy-kcal_100g": 462,
                proteins_100g: 6.7,
                carbohydrates_100g: 72.3,
                fat_100g: 16.7,
                fiber_100g: 2.4,
                sugars_100g: 26.9,
                salt_100g: 0.85,
              },
            },
          ],
        }),
      });

    const result = await api.searchByBarcode("3017620422005");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("openfoodfacts+name-search");
    expect(result!.needsNutritionEstimate).toBe(false);
    expect(result!.nutrition).not.toBeNull();
    expect(result!.nutrition!.calories).toBe(462);
    expect(result!.nutrition!.protein).toBe(6.7);
    expect(result!.nutrition!.source).toBe("OpenFoodFacts");
    expect(result!.isAIEstimated).toBeUndefined();
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
    // No AI fallback: only the 2 real-DB OFF fetches (world + india) occur.
    expect(global.fetch).toHaveBeenCalledTimes(2);
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
