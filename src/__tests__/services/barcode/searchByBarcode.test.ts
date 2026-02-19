import {
  FreeNutritionAPIs,
  BarcodeSearchResult,
  estimateNutritionWithAI,
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
  global.fetch = jest.fn();
  jest.useRealTimers();
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
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

  it("skips UPCitemdb for Indian barcodes (890 prefix) and returns null after OFF fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeOFFNotFound(),
    });

    const result = await api.searchByBarcode("8901234567890");

    expect(result).toBeNull();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCallUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCallUrl).toContain("openfoodfacts.org");
    expect(fetchCallUrl).not.toContain("upcitemdb");
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

  it("skips UPCitemdb for South Korean barcodes (880 prefix)", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => makeOFFNotFound(),
    });

    const result = await api.searchByBarcode("8801234567890");

    expect(result).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
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
