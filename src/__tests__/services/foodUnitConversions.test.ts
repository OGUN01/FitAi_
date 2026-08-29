import {
  convertToGrams,
  convertFromGrams,
  gramsPerUnit,
  getAvailableUnitsForFood,
  getDefaultUnit,
  convertRawToCooked,
  convertCookedToRaw,
  hasRawCookedRatio,
  formatQuantityLabel,
} from "../../services/foodUnitConversions";

describe("foodUnitConversions", () => {
  it("keeps roti at 40g/piece — the existing traditionalServingSizes value, not a conflicting 35g", () => {
    expect(gramsPerUnit("Roti", "piece")).toBe(40);
    expect(convertToGrams(2, "piece", "Roti")).toBe(80);
  });

  it("resolves food-specific katori sizes distinctly (rice vs dal)", () => {
    expect(gramsPerUnit("Cooked Rice", "katori")).toBe(150);
    expect(gramsPerUnit("Dal Tadka", "katori")).toBe(100);
  });

  it("falls back to the generic table for foods with no override", () => {
    expect(gramsPerUnit("Random Snack", "bowl")).toBe(250);
    expect(convertToGrams(1, "scoop", "Random Snack")).toBe(30);
  });

  it("g and ml pass through as identity", () => {
    expect(convertToGrams(150, "g")).toBe(150);
    expect(convertToGrams(200, "ml")).toBe(200);
  });

  it("round-trips grams -> unit -> grams", () => {
    const grams = convertToGrams(3, "piece", "Roti");
    const backToPieces = convertFromGrams(grams, "piece", "Roti");
    expect(backToPieces).toBeCloseTo(3, 5);
  });

  it("never returns negative or NaN grams for bad input", () => {
    expect(convertToGrams(-5, "g")).toBe(0);
    expect(convertToGrams(NaN, "piece", "Roti")).toBe(0);
    expect(convertFromGrams(-1, "katori", "Rice")).toBe(0);
  });

  it("prefers the longest matching override (cooked rice over rice)", () => {
    // Both "cooked rice" and "rice" match "Cooked Rice Bowl" — longest wins.
    expect(gramsPerUnit("Cooked Rice Bowl", "katori")).toBe(150);
  });

  it("returns sensible preferred units per food, always including g", () => {
    expect(getAvailableUnitsForFood("Roti")).toEqual(["piece", "g"]);
    expect(getAvailableUnitsForFood("Whey Protein")).toEqual(["scoop", "g"]);
    expect(getAvailableUnitsForFood("Unknown Food")).toEqual(["g"]);
  });

  it("getDefaultUnit prefers the food-specific unit over grams", () => {
    expect(getDefaultUnit("Roti")).toBe("piece");
    expect(getDefaultUnit("Unknown Food")).toBe("g");
  });

  it("applies raw<->cooked ratios only for known expanding foods", () => {
    expect(hasRawCookedRatio("Rice")).toBe(true);
    expect(hasRawCookedRatio("Roti")).toBe(false);
    expect(convertRawToCooked(50, "Rice")).toBe(150); // 3x, matches the spec's example
    expect(convertCookedToRaw(150, "Rice")).toBe(50);
    expect(convertRawToCooked(50, "Roti")).toBe(50); // unchanged, no known ratio
  });

  it("formats quantity labels naturally", () => {
    expect(formatQuantityLabel(150, "g")).toBe("150 g");
    expect(formatQuantityLabel(1, "piece")).toBe("1 piece");
    expect(formatQuantityLabel(2, "piece")).toBe("2 pieces");
    expect(formatQuantityLabel(1, "katori")).toBe("1 katori");
    expect(formatQuantityLabel(1.5, "cup")).toBe("1.5 cups");
  });
});
