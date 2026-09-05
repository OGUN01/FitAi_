/**
 * Food unit → grams conversion — the single source of truth for household
 * measures (katori, bowl, piece, scoop, cube, tbsp/tsp, cup) used by the
 * Meal Builder's inline quantity editor (`FoodRow`).
 *
 * SSOT rule (CLAUDE.md §3 "Search Before Building"): this consolidates
 * three previously-duplicated, gram-only, substring-matching sources rather
 * than adding a fourth:
 *   - `src/data/traditionalServingSizes.ts` — regional serving-size tables
 *   - `src/hooks/usePortionAdjustment.ts:165-215` — getCommonPortionSizes
 *   - `src/components/diet/PortionAdjustment.tsx:182-185` — verbatim copy of the above
 *
 * None of those three define a `unit → grams` function — they only return a
 * gram number for a *label* ("Medium bowl", "2 pieces"). This file is
 * genuinely new: it gives every unit an explicit, food-aware gram weight so
 * a quantity + unit pair (e.g. "2 katori") can be converted to grams and
 * back, in either direction, without re-parsing a display string.
 *
 * `roti: 40g` is kept exactly as `traditionalServingSizes.ts` already has it
 * — do not introduce a conflicting value (an earlier spec draft proposed 35g).
 */

export type FoodUnit =
  | "g"
  | "ml"
  | "piece"
  | "katori"
  | "bowl"
  | "cup"
  | "tbsp"
  | "tsp"
  | "scoop"
  | "cube"
  | "plate"
  | "serving";

export const ALL_FOOD_UNITS: FoodUnit[] = [
  "g",
  "ml",
  "piece",
  "katori",
  "bowl",
  "cup",
  "tbsp",
  "tsp",
  "scoop",
  "cube",
  "plate",
  "serving",
];

export const UNIT_LABELS: Record<FoodUnit, { singular: string; plural: string }> = {
  g: { singular: "gram", plural: "grams" },
  ml: { singular: "ml", plural: "ml" },
  piece: { singular: "piece", plural: "pieces" },
  katori: { singular: "katori", plural: "katori" },
  bowl: { singular: "bowl", plural: "bowls" },
  cup: { singular: "cup", plural: "cups" },
  tbsp: { singular: "tbsp", plural: "tbsp" },
  tsp: { singular: "tsp", plural: "tsp" },
  scoop: { singular: "scoop", plural: "scoops" },
  cube: { singular: "cube", plural: "cubes" },
  plate: { singular: "plate", plural: "plates" },
  serving: { singular: "serving", plural: "servings" },
};

/**
 * Generic (food-agnostic) grams-per-1-unit fallback. Used when a food has no
 * entry in FOOD_UNIT_OVERRIDES for the requested unit. `ml` assumes water-like
 * density (1ml ≈ 1g) — a reasonable approximation for beverages, not for oil.
 */
const GENERIC_UNIT_GRAMS: Record<Exclude<FoodUnit, "g">, number> = {
  ml: 1,
  piece: 30,
  katori: 150,
  bowl: 250,
  cup: 240,
  tbsp: 15,
  tsp: 5,
  scoop: 30,
  cube: 15,
  plate: 300,
  serving: 100,
};

/**
 * Food-specific overrides — grams per 1 unit, keyed by a lowercase substring
 * match against the food name (first match wins, longest/most-specific keys
 * checked first). Sourced from `traditionalServingSizes.ts`'s general table
 * and `usePortionAdjustment.getCommonPortionSizes`'s household-measure
 * branches, reconciled where they disagreed (dal katori: kept 100g, the
 * `traditionalServingSizes.general.dal` value, over the hook's 120g "medium
 * serving" — katori is a smaller, more specific unit than "serving").
 */
interface FoodUnitOverride {
  match: string;
  units: Partial<Record<FoodUnit, number>>;
  /** Units this food is naturally measured in, in display-preference order.
   * Always implicitly includes "g". */
  preferredUnits?: FoodUnit[];
}

const FOOD_UNIT_OVERRIDES: FoodUnitOverride[] = [
  { match: "roti", units: { piece: 40 }, preferredUnits: ["piece"] },
  { match: "chapati", units: { piece: 40 }, preferredUnits: ["piece"] },
  { match: "naan", units: { piece: 80 }, preferredUnits: ["piece"] },
  { match: "paratha", units: { piece: 60 }, preferredUnits: ["piece"] },
  { match: "dosa", units: { piece: 80 }, preferredUnits: ["piece"] },
  { match: "idli", units: { piece: 60 }, preferredUnits: ["piece"] },
  { match: "samosa", units: { piece: 50 }, preferredUnits: ["piece"] },
  {
    match: "cooked rice",
    units: { katori: 150, bowl: 200, cup: 200, plate: 300 },
    preferredUnits: ["katori", "cup", "bowl"],
  },
  {
    match: "rice",
    units: { katori: 150, bowl: 200, cup: 200, plate: 300 },
    preferredUnits: ["katori", "cup", "bowl"],
  },
  { match: "biryani", units: { plate: 200, bowl: 200 }, preferredUnits: ["plate"] },
  { match: "pulao", units: { katori: 150, bowl: 200 }, preferredUnits: ["katori"] },
  {
    match: "dal",
    units: { katori: 100, bowl: 250 },
    preferredUnits: ["katori", "bowl"],
  },
  {
    match: "curry",
    units: { katori: 120, bowl: 250 },
    preferredUnits: ["katori", "bowl"],
  },
  {
    match: "sabji",
    units: { katori: 80, bowl: 250 },
    preferredUnits: ["katori", "bowl"],
  },
  // Prepared paneer curry dishes (gravy, not raw paneer cubes) — these full
  // dish-name matches are longer than the generic "paneer" entry below, so
  // `findOverride`'s longest-match-wins rule picks these instead. Values
  // mirror the generic "curry" entry, matching each dish's
  // `traditionalServing: 120` in `indianFoodDatabase.ts`.
  {
    match: "paneer butter masala",
    units: { katori: 120, bowl: 250 },
    preferredUnits: ["katori", "bowl"],
  },
  {
    match: "palak paneer",
    units: { katori: 120, bowl: 250 },
    preferredUnits: ["katori", "bowl"],
  },
  // Generic raw-paneer fallback (measured in cubes) — must stay AFTER the
  // more specific dish-name entries above so it only wins for plain "paneer"
  // (e.g. "Paneer" as a raw ingredient/food item, not a full dish name).
  { match: "paneer", units: { cube: 15 }, preferredUnits: ["cube", "g"] },
  { match: "egg white", units: { piece: 33 }, preferredUnits: ["piece"] },
  { match: "egg", units: { piece: 50 }, preferredUnits: ["piece"] },
  {
    match: "whey",
    units: { scoop: 30 },
    preferredUnits: ["scoop"],
  },
  { match: "protein powder", units: { scoop: 30 }, preferredUnits: ["scoop"] },
  { match: "lassi", units: { cup: 200 }, preferredUnits: ["cup"] },
  { match: "chai", units: { cup: 150 }, preferredUnits: ["cup"] },
  { match: "buttermilk", units: { cup: 180 }, preferredUnits: ["cup"] },
  { match: "milk", units: { cup: 240 }, preferredUnits: ["cup"] },
  { match: "curd", units: { katori: 100, bowl: 150 }, preferredUnits: ["katori"] },
  { match: "raita", units: { katori: 60, bowl: 150 }, preferredUnits: ["katori"] },
  // ── Seeds & dry staples — naturally measured in tbsp/cup, not grams
  // (e.g. the "chia seeds in the morning" scenario: 20g ≈ 1.7 tbsp). Match
  // strings are deliberately unambiguous: "chia"/"flax" appear only in those
  // foods, and "oats" matches "Oats" but NOT "oatmeal" or "goat" (no
  // substring overlap). "almond"/"peanut" were skipped on purpose — they
  // would hijack "almond milk" (a liquid, 240ml/cup) and "peanut butter"
  // (≈250g/cup), giving wrong gram weights for those compounds. ──
  { match: "chia", units: { tbsp: 12 }, preferredUnits: ["tbsp"] },
  { match: "flax", units: { tbsp: 10 }, preferredUnits: ["tbsp"] },
  { match: "oats", units: { cup: 81, tbsp: 5 }, preferredUnits: ["cup", "tbsp"] },
];

function findOverride(foodName: string | undefined): FoodUnitOverride | null {
  if (!foodName) return null;
  const lower = foodName.toLowerCase();
  // Longest match string wins so "cooked rice" beats "rice" when both match.
  const candidates = FOOD_UNIT_OVERRIDES.filter((entry) => lower.includes(entry.match));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, entry) =>
    entry.match.length > best.match.length ? entry : best
  );
}

/**
 * Grams for ONE unit of the given food (e.g. gramsPerUnit('roti', 'piece') === 40).
 * Falls back to the generic table when the food has no specific override for
 * that unit.
 */
export function gramsPerUnit(foodName: string | undefined, unit: FoodUnit): number {
  if (unit === "g") return 1;
  const override = findOverride(foodName);
  const overrideGrams = override?.units[unit];
  if (typeof overrideGrams === "number") return overrideGrams;
  return GENERIC_UNIT_GRAMS[unit];
}

/** Convert a quantity in `unit` to grams for the given food. */
export function convertToGrams(
  quantity: number,
  unit: FoodUnit,
  foodName?: string
): number {
  if (!Number.isFinite(quantity) || quantity < 0) return 0;
  if (unit === "g") return quantity;
  return quantity * gramsPerUnit(foodName, unit);
}

/** Inverse of convertToGrams — how many `unit`s does `grams` represent. */
export function convertFromGrams(
  grams: number,
  unit: FoodUnit,
  foodName?: string
): number {
  if (!Number.isFinite(grams) || grams < 0) return 0;
  if (unit === "g") return grams;
  const per = gramsPerUnit(foodName, unit);
  return per > 0 ? grams / per : 0;
}

/**
 * The units a given food is naturally measured in, "g" always last as the
 * universal fallback. Used to populate the FoodRow unit-cycling chip.
 */
export function getAvailableUnitsForFood(foodName: string | undefined): FoodUnit[] {
  const override = findOverride(foodName);
  const preferred = override?.preferredUnits?.filter((u) => u !== "g") ?? [];
  const units = [...new Set([...preferred, "g" as FoodUnit])];
  return units;
}

/** The unit a food should default to when first added to a plan. */
export function getDefaultUnit(foodName: string | undefined): FoodUnit {
  const units = getAvailableUnitsForFood(foodName);
  return units[0] ?? "g";
}

/**
 * Approximate raw→cooked multipliers for foods that expand significantly
 * during cooking (grains, legumes). These are common cooking-reference
 * ratios, not measured per-brand — flag them as approximate in any UI copy.
 * E.g. 50g raw rice → ~150g cooked rice (3x), matching the household
 * intuition "a small handful of raw rice becomes a full katori of cooked rice."
 */
const RAW_TO_COOKED_MULTIPLIERS: Record<string, number> = {
  rice: 3,
  dal: 2.5,
  lentil: 2.5,
  pasta: 2.2,
  oats: 2,
  quinoa: 2.8,
};

function findRawToCookedMultiplier(foodName: string | undefined): number | null {
  if (!foodName) return null;
  const lower = foodName.toLowerCase();
  for (const [key, multiplier] of Object.entries(RAW_TO_COOKED_MULTIPLIERS)) {
    if (lower.includes(key)) return multiplier;
  }
  return null;
}

/** Convert a raw-weight gram amount to its approximate cooked weight. Returns
 * the input unchanged when the food has no known raw↔cooked ratio. */
export function convertRawToCooked(rawGrams: number, foodName: string | undefined): number {
  const multiplier = findRawToCookedMultiplier(foodName);
  if (!multiplier || !Number.isFinite(rawGrams)) return rawGrams;
  return Math.round(rawGrams * multiplier);
}

/** Convert a cooked-weight gram amount back to its approximate raw weight. */
export function convertCookedToRaw(cookedGrams: number, foodName: string | undefined): number {
  const multiplier = findRawToCookedMultiplier(foodName);
  if (!multiplier || !Number.isFinite(cookedGrams)) return cookedGrams;
  return Math.round(cookedGrams / multiplier);
}

/** Whether this food has a known raw↔cooked conversion (used to decide
 * whether to show a raw/cooked toggle in the quantity editor at all). */
export function hasRawCookedRatio(foodName: string | undefined): boolean {
  return findRawToCookedMultiplier(foodName) !== null;
}

/** Human-readable "{qty} {unit}" label, pluralizing the unit word. */
export function formatQuantityLabel(quantity: number, unit: FoodUnit): string {
  const labels = UNIT_LABELS[unit];
  const word = quantity === 1 ? labels.singular : labels.plural;
  // g/ml/tbsp/tsp read naturally as "150 g", not "150 grams" — keep those
  // abbreviated; the rest read better spelled out ("2 pieces", "1 katori").
  if (unit === "g" || unit === "ml" || unit === "tbsp" || unit === "tsp") {
    return `${formatQuantityNumber(quantity)} ${unit}`;
  }
  return `${formatQuantityNumber(quantity)} ${word}`;
}

function formatQuantityNumber(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1);
}
