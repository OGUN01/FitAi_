type MealLogFoodLike = Record<string, unknown>;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function isRecord(value: unknown): value is MealLogFoodLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeMealLogFoodItems(
  foodItems: unknown,
): MealLogFoodLike[] {
  if (!foodItems) return [];

  if (typeof foodItems === "string") {
    try {
      return normalizeMealLogFoodItems(JSON.parse(foodItems));
    } catch {
      return [];
    }
  }

  if (Array.isArray(foodItems)) {
    return foodItems.filter(isRecord);
  }

  if (isRecord(foodItems)) {
    return [foodItems];
  }

  return [];
}

export function getMealLogItemFiber(item: unknown): number {
  if (!isRecord(item)) return 0;

  const nestedFiber = isRecord(item.macros)
    ? normalizeMealLogFiberValue(item.macros.fiber)
    : null;
  const flatFiber = normalizeMealLogFiberValue(item.fiber);

  return nestedFiber ?? flatFiber ?? 0;
}

export function normalizeMealLogFiberValue(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed < 0) {
    return null;
  }

  return roundToTenth(parsed);
}

export function deriveMealLogFiber(foodItems: unknown): number {
  const totalFiber = normalizeMealLogFoodItems(foodItems).reduce(
    (sum, item) => sum + getMealLogItemFiber(item),
    0,
  );

  return roundToTenth(totalFiber);
}

export function getMealLogItemSugar(item: unknown): number {
  if (!isRecord(item)) return 0;

  const nestedSugar = isRecord(item.macros)
    ? normalizeMealLogSugarValue(item.macros.sugar)
    : null;
  const flatSugar = normalizeMealLogSugarValue(item.sugar);

  return nestedSugar ?? flatSugar ?? 0;
}

export function normalizeMealLogSugarValue(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed < 0) {
    return null;
  }

  return roundToTenth(parsed);
}

export function deriveMealLogSugar(foodItems: unknown): number {
  const totalSugar = normalizeMealLogFoodItems(foodItems).reduce(
    (sum, item) => sum + getMealLogItemSugar(item),
    0,
  );

  return roundToTenth(totalSugar);
}
