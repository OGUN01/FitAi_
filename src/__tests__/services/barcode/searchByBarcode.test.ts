import {
  FreeNutritionAPIs,
  BarcodeSearchResult,
  estimateNutritionWithAI,
  clearBarcodeCache,
} from "@/services/freeNutritionAPIs";

let api: FreeNutritionAPIs;
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

beforeEach(() => {
  api = new FreeNutritionAPIs();
  clearBarcodeCache();
  global.fetch = jest.fn();
  jest.useRealTimers();
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = "test-gemini-key";
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
  // Restore original env, removing any keys we added
  delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  Object.keys(process.env).forEach((key) => {
    if (!(key in originalEnv)) delete process.env[key];
  });
});

describe("searchByBarcode", () => {
  it("returns full product data from OFF v2 with source openfoodfacts", async () => {
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

  it("returns needsNutritionEstimate true when OFF product has no nutriments", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeOFFResponse({
          nutriments: {},
          nutrition_grades: undefined,
          nova_group: undefined,
        }),
    });

    const result = await api.searchByBarcode("3017620422004");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("openfoodfacts");
    expect(result!.needsNutritionEstimate).toBe(true);
    expect(result!.nutrition).toBeNull();
    expect(result!.confidence).toBe(50);
  });

  it("falls through to UPCitemdb when OFF returns status 0", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeUPCitemdbResponse(),
      });

    const result = await api.searchByBarcode("0012345678905");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("upcitemdb");
    expect(result!.needsNutritionEstimate).toBe(true);
    expect(result!.nutrition).toBeNull();
    expect(result!.productInfo.name).toBe("UPC Product Name");
    expect(result!.productInfo.brand).toBe("UPC Brand");
  });

  it("falls through to UPCitemdb when OFF times out", async () => {
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
          json: async () => makeUPCitemdbResponse(),
        }),
      );

    const promise = api.searchByBarcode("0012345678906");

    jest.advanceTimersByTime(6000);

    const result = await promise;

    expect(result).not.toBeNull();
    expect(result!.source).toBe("upcitemdb");

    jest.useRealTimers();
  });

  it("falls through to UPCitemdb when OFF fetch throws", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeUPCitemdbResponse(),
      });

    const result = await api.searchByBarcode("0012345678907");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("upcitemdb");
  });

  it("UPCitemdb returns product info with needsNutritionEstimate true", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeUPCitemdbResponse({ title: "Fancy Chips", brand: "ChipCo" }),
      });

    const result = await api.searchByBarcode("0012345678908");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("upcitemdb");
    expect(result!.needsNutritionEstimate).toBe(true);
    expect(result!.nutrition).toBeNull();
    expect(result!.productInfo.name).toBe("Fancy Chips");
    expect(result!.productInfo.brand).toBe("ChipCo");
    expect(result!.confidence).toBe(40);
  });

  it("returns null when UPCitemdb responds with 404", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

    const result = await api.searchByBarcode("0012345678909");

    expect(result).toBeNull();
  });

  it("returns null when both OFF and UPCitemdb fail", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("OFF down"))
      .mockRejectedValueOnce(new Error("UPCitemdb down"));

    const result = await api.searchByBarcode("0012345678910");

    expect(result).toBeNull();
  });

  it("skips UPCitemdb for Indian barcodes (890 prefix) and tries Gemini after OFF fails", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    const result = await api.searchByBarcode("8901234567890");

    expect(result).toBeNull();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const offUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(offUrl).toContain("openfoodfacts.org");
    expect(offUrl).not.toContain("upcitemdb");
    const geminiUrl = (global.fetch as jest.Mock).mock.calls[1][0];
    expect(geminiUrl).toContain("generativelanguage.googleapis.com");
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

  it("correctly maps nutriScore and novaGroup from OFF response", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makeOFFResponse({
          nutrition_grades: "a",
          nova_group: 4,
        }),
    });

    const result = await api.searchByBarcode("4006381333932");

    expect(result).not.toBeNull();
    expect(result!.productInfo.nutriScore).toBe("a");
    expect(result!.productInfo.novaGroup).toBe(4);
  });

  it("skips UPCitemdb for South Korean barcodes (880 prefix) and tries Gemini", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    const result = await api.searchByBarcode("8801234567890");

    expect(result).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(2);
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

function makeGeminiResponse(overrides: Record<string, unknown> = {}) {
  const nutrition = {
    calories_kcal: 462,
    protein_g: 6.7,
    carbs_g: 72.3,
    fat_g: 16.7,
    fiber_g: 2.4,
    sugar_g: 26.9,
    sodium_mg: 340,
    confidence_0_to_100: 75,
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

describe("estimateNutritionWithAI", () => {
  it("returns nutrition data with source gemini-estimation and isAIEstimated", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeGeminiResponse(),
    });

    const result = await estimateNutritionWithAI("Parle-G", "Parle", "India");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("gemini-estimation");
    expect(result!.isAIEstimated).toBe(true);
    expect(result!.needsNutritionEstimate).toBe(false);
    expect(result!.confidence).toBeLessThanOrEqual(40);
    expect(result!.nutrition).not.toBeNull();
    expect(result!.nutrition!.calories).toBe(462);
    expect(result!.nutrition!.protein).toBe(6.7);
  });

  it("caps confidence at 40 even if Gemini returns higher", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeGeminiResponse({ confidence_0_to_100: 95 }),
    });

    const result = await estimateNutritionWithAI("Oreo", "Mondelez", "USA");

    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(40);
  });

  it("returns null on malformed JSON from Gemini", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "not valid json {{{" }] } }],
      }),
    });

    const result = await estimateNutritionWithAI("Bad Product", "Brand", "USA");

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("returns null when Gemini API times out", async () => {
    jest.useFakeTimers();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();

    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 200,
                json: async () => makeGeminiResponse(),
              }),
            30000,
          );
        }),
    );

    const promise = estimateNutritionWithAI("Slow Product", "Brand", "USA");
    jest.advanceTimersByTime(11000);
    const result = await promise;

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    jest.useRealTimers();
  });

  it("returns null when all keys return 429", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
    });

    const result = await estimateNutritionWithAI(
      "Rate Limited",
      "Brand",
      "USA",
    );

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

describe("searchByBarcode Gemini integration", () => {
  it("wires Gemini when UPCitemdb returns name-only result", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeOFFNotFound(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          makeUPCitemdbResponse({ title: "Fancy Chips", brand: "ChipCo" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => makeGeminiResponse(),
      });

    const result = await api.searchByBarcode("0012345678950");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("upcitemdb+gemini-estimation");
    expect(result!.isAIEstimated).toBe(true);
    expect(result!.nutrition).not.toBeNull();
    expect(result!.nutrition!.calories).toBe(462);
    expect(result!.needsNutritionEstimate).toBe(false);
  });

  it("calls Gemini directly for Indian 890 barcode when OFF fails", async () => {
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

    const result = await api.searchByBarcode("8901234567891");

    expect(result).not.toBeNull();
    expect(result!.source).toBe("gemini-estimation");
    expect(result!.isAIEstimated).toBe(true);
    expect(result!.nutrition).not.toBeNull();

    const urls = (global.fetch as jest.Mock).mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(urls[0]).toContain("openfoodfacts.org");
    expect(urls[1]).toContain("generativelanguage.googleapis.com");
    expect(urls.every((u: string) => !u.includes("upcitemdb"))).toBe(true);
  });
});
