import {
  deriveMealLogFiber,
  normalizeMealLogFoodItems,
  normalizeMealLogFiberValue,
} from "@/utils/mealLogNutrition";

describe("mealLogNutrition", () => {
  it("normalizes meal-log food items from JSON strings", () => {
    expect(
      normalizeMealLogFoodItems(
        JSON.stringify([{ name: "Apple", fiber: 3.4 }]),
      ),
    ).toEqual([{ name: "Apple", fiber: 3.4 }]);
  });

  it("prefers nested macros fiber and falls back to flat fiber", () => {
    expect(
      deriveMealLogFiber([
        {
          name: "Salad",
          macros: { fiber: 5.2 },
          fiber: 99,
        },
        {
          name: "Apple",
          fiber: "3.3",
        },
      ]),
    ).toBe(8.5);
  });

  it("returns 0 for invalid or missing meal-log items", () => {
    expect(deriveMealLogFiber("not-json")).toBe(0);
    expect(deriveMealLogFiber([{ name: "Water" }])).toBe(0);
  });

  it("normalizes invalid fiber inputs to null and rounds valid inputs", () => {
    expect(normalizeMealLogFiberValue("3.44")).toBe(3.4);
    expect(normalizeMealLogFiberValue(-2)).toBeNull();
    expect(normalizeMealLogFiberValue("")).toBeNull();
  });
});
