import {
  filterLegacyScanShadowMeals,
  isLegacyScanShadowMeal,
  pruneLegacyScanShadowState,
} from "../../stores/nutrition/legacyScanShadowCleanup";

describe("legacy scan shadow cleanup", () => {
  it("identifies only the synthetic scanned meal copies", () => {
    expect(
      isLegacyScanShadowMeal({
        id: "scanned_1711111111111_ab123",
        tags: ["scanned"],
      }),
    ).toBe(true);

    expect(
      isLegacyScanShadowMeal({
        id: "manual_1711111111111_ab123",
        tags: ["manual"],
      }),
    ).toBe(false);

    expect(
      isLegacyScanShadowMeal({
        id: "scanned_1711111111111_ab123",
        tags: ["manual"],
      }),
    ).toBe(false);
  });

  it("removes persisted scan shadows while preserving real meals and daily logs", () => {
    const result = pruneLegacyScanShadowState({
      weeklyMealPlan: {
        id: "local-plan",
        meals: [
          {
            id: "scanned_1711111111111_ab123",
            name: "Sabudana Khichdi",
            tags: ["scanned"],
          },
          {
            id: "manual_1711111111111_cd456",
            name: "Manual Dinner",
            tags: ["manual"],
          },
        ],
      },
      mealProgress: {
        scanned_1711111111111_ab123: {
          mealId: "scanned_1711111111111_ab123",
          progress: 100,
        },
        manual_1711111111111_cd456: {
          mealId: "manual_1711111111111_cd456",
          progress: 100,
        },
      },
      currentMealSession: {
        mealId: "scanned_1711111111111_ab123",
      },
    });

    expect(result).toEqual({
      weeklyMealPlan: {
        id: "local-plan",
        meals: [
          {
            id: "manual_1711111111111_cd456",
            name: "Manual Dinner",
            tags: ["manual"],
          },
        ],
      },
      mealProgress: {
        manual_1711111111111_cd456: {
          mealId: "manual_1711111111111_cd456",
          progress: 100,
        },
      },
      currentMealSession: null,
      removedMealIds: ["scanned_1711111111111_ab123"],
    });
  });

  it("filters legacy scan shadows out of selector inputs", () => {
    const filtered = filterLegacyScanShadowMeals([
      {
        id: "scanned_1711111111111_ab123",
        tags: ["scanned"],
      },
      {
        id: "meal-1",
        tags: ["breakfast"],
      },
    ]);

    expect(filtered).toEqual([
      {
        id: "meal-1",
        tags: ["breakfast"],
      },
    ]);
  });
});
