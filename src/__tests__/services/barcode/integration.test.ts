import barcodeService from "@/services/barcodeService";
import type { ProductLookupResult } from "@/services/barcodeService";

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

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

function makeUPCitemdbResponse(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        title: "UPC Product Name",
        brand: "UPC Brand",
        ...overrides,
      },
    ],
  };
}

function makeGeminiResponse(overrides: Record<string, unknown> = {}) {
  const nutrition = {
    calories_kcal: 450,
    protein_g: 8,
    carbs_g: 65,
    fat_g: 18,
    fiber_g: 2,
    sugar_g: 25,
    sodium_mg: 150,
    confidence_0_to_100: 85,
    ...overrides,
  };
  return {
    candidates: [
      {
        content: {
          parts: [{ text: JSON.stringify(nutrition) }],
        },
      },
    ],
  };
}

beforeEach(() => {
  global.fetch = jest.fn();
  jest.useRealTimers();
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = "test-gemini-key";
  barcodeService.clearCache();
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
  delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  Object.keys(process.env).forEach((key) => {
    if (!(key in originalEnv)) delete process.env[key];
  });
});

describe("lookupProduct integration", () => {
  it("1. Happy path — EAN-13 found on OFF with full nutrition", async () => {
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

  it("2. Happy path — Indian product found on OFF", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
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
  });

  it("3. Fallback — OFF miss, UPCitemdb hit", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeUPCitemdbResponse({
            title: "Granola Bar",
            brand: "Nature Valley",
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makeGeminiResponse(),
      });

    const result = await barcodeService.lookupProduct("4006381333931");

    expect(result.success).toBe(true);
    expect(result.product).toBeDefined();
    const p = result.product!;
    expect(p.name).toBe("Granola Bar");
    expect(p.source).toContain("upcitemdb");
  });

  it("4. Fallback — everything fails → null-like result", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("OFF down"))
      .mockRejectedValueOnce(new Error("UPCitemdb down"));

    const result = await barcodeService.lookupProduct("4006381333932");

    expect(result.success).toBe(false);
    expect(result.product).toBeUndefined();
  });

  it("5. UPC-A normalization — 12 digits padded to 13", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeOFFResponse(),
    });

    await barcodeService.lookupProduct("012345678905");

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("0012345678905");
    expect(calledUrl).toContain("openfoodfacts.org");
  });

  it("6. Invalid barcode → failure without calling fetch", async () => {
    const result = await barcodeService.lookupProduct("ABC123");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.product).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("7. Cache hit — second call returns from cache, fetch called once", async () => {
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

  it("8. Indian barcode skips UPCitemdb when OFF misses", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makeGeminiResponse(),
      });

    const result = await barcodeService.lookupProduct("8901234567891");

    expect(result.success).toBe(true);
    const urls = (global.fetch as jest.Mock).mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(urls.length).toBe(2);
    expect(urls[0]).toContain("openfoodfacts.org");
    expect(urls[1]).toContain("generativelanguage.googleapis.com");
    expect(urls.every((u: string) => !u.includes("upcitemdb"))).toBe(true);
  });

  it("9. OFF timeout → fallback to UPCitemdb", async () => {
    jest.useFakeTimers();

    (global.fetch as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () => resolve({ ok: true, json: async () => makeOFFResponse() }),
              60000,
            );
          }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () =>
            makeUPCitemdbResponse({ title: "Fallback Item", brand: "FB" }),
        }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => makeGeminiResponse(),
        }),
      );

    const promise = barcodeService.lookupProduct("4006381333934");

    jest.advanceTimersByTime(6000);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.product).toBeDefined();
    expect(result.product!.source).toContain("upcitemdb");

    jest.useRealTimers();
  });

  it("10. Gemini estimation wired — OFF has name only, no nutrition", async () => {
    (global.fetch as jest.Mock)
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
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makeGeminiResponse(),
      });

    const result = await barcodeService.lookupProduct("3017620422055");

    expect(result.success).toBe(true);
    expect(result.product).toBeDefined();
    const p = result.product!;
    expect(p.source).toContain("gemini-estimation");
    expect(p.nutrition.calories).toBe(450);
    expect(p.nutrition.protein).toBe(8);
    expect(p.nutrition.carbs).toBe(65);
    expect(p.nutrition.fat).toBe(18);
    expect(p.needsNutritionEstimate).toBe(false);
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
  delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  Object.keys(process.env).forEach((key) => {
    if (!(key in originalEnv)) delete process.env[key];
  });
});

describe("lookupProduct integration", () => {
  it("1. Happy path — EAN-13 found on OFF with full nutrition", async () => {
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

  it("2. Happy path — Indian product found on OFF", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
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
  });

  it("3. Fallback — OFF miss, UPCitemdb hit", async () => {
    // OFF returns not found
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      // UPCitemdb returns product
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeUPCitemdbResponse({
            title: "Granola Bar",
            brand: "Nature Valley",
          }),
      })
      // Gemini estimation (auto-called for UPC products with name)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makeGeminiResponse(),
      });

    const result = await barcodeService.lookupProduct("4006381333931");

    expect(result.success).toBe(true);
    expect(result.product).toBeDefined();
    const p = result.product!;
    expect(p.name).toBe("Granola Bar");
    // UPCitemdb path triggers Gemini so nutrition gets filled
    expect(p.source).toContain("upcitemdb");
  });

  it("4. Fallback — everything fails → null-like result", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("OFF down"))
      .mockRejectedValueOnce(new Error("UPCitemdb down"));

    const result = await barcodeService.lookupProduct("4006381333932");

    expect(result.success).toBe(false);
    expect(result.product).toBeUndefined();
  });

  it("5. UPC-A normalization — 12 digits padded to 13", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeOFFResponse(),
    });

    await barcodeService.lookupProduct("012345678905");

    // Should have been padded to "0012345678905" (13 digits)
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("0012345678905");
    expect(calledUrl).toContain("openfoodfacts.org");
  });

  it("6. Invalid barcode → failure without calling fetch", async () => {
    const result = await barcodeService.lookupProduct("ABC123");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.product).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("7. Cache hit — second call returns from cache, fetch called once", async () => {
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
    // fetch should only be called once — second is from BarcodeService.scanCache
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("8. Indian barcode skips UPCitemdb when OFF misses", async () => {
    // OFF returns not found
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      // Gemini called directly (skipping UPCitemdb)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makeGeminiResponse(),
      });

    const result = await barcodeService.lookupProduct("8901234567891");

    expect(result.success).toBe(true);
    // Verify no UPCitemdb call was made
    const urls = (global.fetch as jest.Mock).mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(urls.length).toBe(2);
    expect(urls[0]).toContain("openfoodfacts.org");
    expect(urls[1]).toContain("generativelanguage.googleapis.com");
    expect(urls.every((u: string) => !u.includes("upcitemdb"))).toBe(true);
  });

  it("9. OFF timeout → fallback to UPCitemdb", async () => {
    jest.useFakeTimers();

    // OFF hangs (never resolves within timeout)
    (global.fetch as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () => resolve({ ok: true, json: async () => makeOFFResponse() }),
              60000,
            );
          }),
      )
      // UPCitemdb responds
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () =>
            makeUPCitemdbResponse({ title: "Fallback Item", brand: "FB" }),
        }),
      )
      // Gemini for nutrition estimation
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => makeGeminiResponse(),
        }),
      );

    const promise = barcodeService.lookupProduct("4006381333934");

    // Advance past the 5000ms OFF timeout
    jest.advanceTimersByTime(6000);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.product).toBeDefined();
    expect(result.product!.source).toContain("upcitemdb");

    jest.useRealTimers();
  });

  it("10. Gemini estimation wired — OFF has name only, no nutrition", async () => {
    // OFF returns product with name but empty nutriments
    (global.fetch as jest.Mock)
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
      // Gemini provides nutrition estimate
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makeGeminiResponse(),
      });

    const result = await barcodeService.lookupProduct("3017620422055");

    expect(result.success).toBe(true);
    expect(result.product).toBeDefined();
    const p = result.product!;
    // The source should indicate Gemini was used
    expect(p.source).toContain("gemini-estimation");
    // Nutrition should be filled from Gemini
    expect(p.nutrition.calories).toBe(450);
    expect(p.nutrition.protein).toBe(8);
    expect(p.nutrition.carbs).toBe(65);
    expect(p.nutrition.fat).toBe(18);
    // The result should indicate no more estimation needed
    expect(p.needsNutritionEstimate).toBe(false);
  });
});
