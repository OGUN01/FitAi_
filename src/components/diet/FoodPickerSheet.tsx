/**
 * FoodPickerSheet — the Meal Builder's food picker. (This superseded an
 * earlier `FoodSearchSheet` component that was built but never wired into
 * any screen — that orphan was deleted once its `FoodSearchHit` type was
 * relocated to `foodPickerService.ts`.)
 *
 * Promoted from a plain BottomSheet to a DetentBottomSheet at [0.5, 0.95]
 * (matching ExercisePickerSheet's near-fullscreen default), with:
 *  - Recents — chip row, committed on submit only.
 *  - Favorites — a food can be starred; persisted via foodPickerService
 *    (shared AsyncStorage key with FoodSearchHit's "indian:"/"sqlite:" id
 *    scheme).
 *  - Saved Meals — savedMealsStore.getAll(), so a whole saved meal can drop
 *    into a slot in one tap.
 *  - Quick regional picks — foodPickerService.getQuickFoodPicks() (curated,
 *    like exercisePickerService.getPopularExercises).
 *  - Barcode entry — the existing ManualBarcodeEntry flow.
 *
 * Search is debounced + async (250ms), merging three sources — curated
 * Indian dishes, IFCT 2017 generic ingredients (Supabase), and on-device
 * SQLite branded products — plus a manual "Add custom food" fallback.
 *
 * Self-contained overlay: mounted once at the screen level (like
 * ExercisePickerSheet), driven entirely by dietBuilderStore's
 * pickerOpen/pickerContext, and performs its own store mutations on
 * selection — the screen does not need to know what was picked.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DetentBottomSheet } from "../ui/aurora/DetentBottomSheet";
import { AuroraSearchField } from "../ui/aurora/AuroraSearchField";
import { AuroraSpinner } from "../ui/aurora/AuroraSpinner";
import { EmptyState } from "../ui/aurora/EmptyState";
import { ManualBarcodeEntry } from "./ManualBarcodeEntry";
import { useDietBuilderStore } from "../../stores/dietBuilderStore";
import { useSavedMealsStore } from "../../stores/savedMealsStore";
import { sqliteFood, type SQLiteFoodResult } from "../../services/sqliteFood";
import { INDIAN_FOOD_DATABASE, type IndianFoodData } from "../../data/indianFoodDatabase";
import {
  getRecentFoodSearches,
  addRecentFoodSearch,
  getFavoriteFoods,
  toggleFavoriteFood,
  getQuickFoodPicks,
  buildMealItemFromMacros,
  type FoodSearchHit,
} from "../../services/foodPickerService";
import { supabase } from "../../services/supabase";
import { getDefaultUnit, convertToGrams } from "../../services/foodUnitConversions";
import type { ProductLookupResult, ScannedProduct } from "../../services/barcodeService";
import { haptics } from "../../utils/haptics";
import { caloriesFromMacros } from "../../utils/nutritionRecalc";
import { hexToRgba } from "../../utils/colors";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import {
  colors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { rp, rf, rw, rh } from "../../utils/responsive";
import type { MealItem, Food } from "../../types/diet";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

function fromIndian(entry: IndianFoodData, key: string): FoodSearchHit {
  const n = entry.nutritionPer100g;
  return {
    key: `indian:${key}`,
    name: entry.name,
    subtitle: entry.hindiName ? `${entry.hindiName} · ${entry.region}` : entry.region,
    per100g: {
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat,
      fiber: n.fiber,
      sugar: n.sugar,
      sodium: n.sodium,
    },
    source: "indian",
  };
}

function fromSQLite(row: SQLiteFoodResult): FoodSearchHit {
  return {
    key: `sqlite:${row.code}`,
    name: row.product_name ?? "Unknown product",
    subtitle: row.brands ?? undefined,
    barcode: row.code,
    per100g: {
      calories: row.energy_kcal_100g ?? 0,
      protein: row.proteins_100g ?? 0,
      carbs: row.carbohydrates_100g ?? 0,
      fat: row.fat_100g ?? 0,
      fiber: row.fiber_100g ?? 0,
      sugar: row.sugars_100g ?? undefined,
      sodium: row.sodium_100g ?? undefined,
    },
    source: "sqlite",
    nutriScore: row.nutriscore_grade ?? undefined,
    novaGroup: row.nova_group ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Map an IFCT 2017 generic-ingredient row to a FoodSearchHit. IFCT is the
 * third search source (P1 of the Phase 6 plan) — ICMR/NIN nutrition for
 * ~540 generic Indian-diet staples (grains, pulses, seeds, nuts, dairy,
 * fruit, vegetables). Sodium is already stored in mg (matches
 * Macronutrients.sodium's convention — no unit conversion). */
function fromIFCT(row: {
  food_code: string;
  name: string;
  local_names: string | null;
  energy_kcal_100g: number | null;
  protein_100g: number | null;
  carbohydrate_100g: number | null;
  fat_100g: number | null;
  fiber_100g: number | null;
  sugar_100g: number | null;
  sodium_mg_100g: number | null;
}): FoodSearchHit {
  return {
    key: `ifct:${row.food_code}`,
    name: row.name,
    subtitle: row.local_names ?? undefined,
    per100g: {
      calories: row.energy_kcal_100g ?? 0,
      protein: row.protein_100g ?? 0,
      carbs: row.carbohydrate_100g ?? 0,
      fat: row.fat_100g ?? 0,
      fiber: row.fiber_100g ?? 0,
      sugar: row.sugar_100g ?? undefined,
      sodium: row.sodium_mg_100g ?? undefined,
    },
    source: "ifct",
  };
}

/** Build a MealItem from a per-100g nutrition hit, sized to the food's
 * default unit (100g for gram-measured foods, 1 unit for piece-measured
 * foods like roti/egg — via foodUnitConversions.ts, the canonical table). */
function hitToMealItem(hit: FoodSearchHit): MealItem {
  const unit = getDefaultUnit(hit.name);
  const quantity = unit === "g" ? 100 : 1;
  const grams = convertToGrams(quantity, unit, hit.name) || 100;
  const ratio = grams / 100;
  const now = new Date().toISOString();
  const food: Food = {
    id: hit.key,
    name: hit.name,
    category: "proteins",
    nutrition: {
      calories: hit.per100g.calories,
      macros: {
        protein: hit.per100g.protein,
        carbohydrates: hit.per100g.carbs,
        fat: hit.per100g.fat,
        fiber: hit.per100g.fiber,
        sugar: hit.per100g.sugar,
        sodium: hit.per100g.sodium,
      },
      servingSize: 100,
      servingUnit: "g",
    },
    allergens: [],
    dietaryLabels: [],
    verified: hit.source === "sqlite",
    createdAt: now,
    updatedAt: now,
    imageUrl: hit.imageUrl,
  };
  return {
    foodId: food.id,
    food,
    name: hit.name,
    quantity,
    unit,
    calories: Math.round(hit.per100g.calories * ratio),
    macros: {
      protein: round1(hit.per100g.protein * ratio),
      carbohydrates: round1(hit.per100g.carbs * ratio),
      fat: round1(hit.per100g.fat * ratio),
      fiber: round1((hit.per100g.fiber ?? 0) * ratio),
      sugar: hit.per100g.sugar != null ? round1(hit.per100g.sugar * ratio) : undefined,
      sodium: hit.per100g.sodium != null ? Math.round(hit.per100g.sodium * ratio) : undefined,
    },
  };
}

function scannedProductToHit(product: ScannedProduct): FoodSearchHit {
  return {
    key: `sqlite:${product.barcode}`,
    name: product.name,
    subtitle: product.brand,
    barcode: product.barcode,
    per100g: {
      calories: product.nutrition.calories,
      protein: product.nutrition.protein,
      carbs: product.nutrition.carbs,
      fat: product.nutrition.fat,
      fiber: product.nutrition.fiber,
      sugar: product.nutrition.sugar,
      sodium: product.nutrition.sodium,
    },
    source: "sqlite",
    nutriScore: product.nutriScore,
    novaGroup: product.novaGroup,
  };
}

export const FoodPickerSheet: React.FC = () => {
  const pickerOpen = useDietBuilderStore((s) => s.pickerOpen);
  const pickerContext = useDietBuilderStore((s) => s.pickerContext);
  const closePicker = useDietBuilderStore((s) => s.closePicker);
  const addMeal = useDietBuilderStore((s) => s.addMeal);
  const addFoodItem = useDietBuilderStore((s) => s.addFoodItem);
  const updateFoodItem = useDietBuilderStore((s) => s.updateFoodItem);
  const applyMealTemplate = useDietBuilderStore((s) => s.applyMealTemplate);

  const savedMeals = useSavedMealsStore((s) => s.meals);
  const applyToSchedule = useSavedMealsStore((s) => s.applyToSchedule);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FoodSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);
  const [showBarcodeEntry, setShowBarcodeEntry] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGrams, setCustomGrams] = useState("100");
  const [customProtein, setCustomProtein] = useState("0");
  const [customCarbs, setCustomCarbs] = useState("0");
  const [customFat, setCustomFat] = useState("0");
  const [customFiber, setCustomFiber] = useState("0");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    setQuery("");
    setHits([]);
    setShowBarcodeEntry(false);
    setShowCustomForm(false);
    void getRecentFoodSearches().then(setRecents);
    void getFavoriteFoods().then(setFavoriteKeys);
  }, [pickerOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      void runSearch(q);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    const lower = q.toLowerCase();
    const indianMatches: FoodSearchHit[] = [];
    for (const [key, entry] of Object.entries(INDIAN_FOOD_DATABASE)) {
      const name = entry.name.toLowerCase();
      const hindi = entry.hindiName ?? "";
      const regional = entry.regionalName ?? "";
      if (name.includes(lower) || hindi.includes(q) || regional.toLowerCase().includes(lower)) {
        indianMatches.push(fromIndian(entry, key));
      }
    }
    let sqliteMatches: FoodSearchHit[] = [];
    if (sqliteFood.isDatabaseReady()) {
      try {
        const rows = await sqliteFood.searchByName(q, 40);
        sqliteMatches = rows.map(fromSQLite);
      } catch (error) {
        console.error("[FoodPickerSheet] SQLite search failed:", error);
      }
    }

    // 3. IFCT 2017 generic-ingredient DB (Supabase, public-read RLS) — works
    // for guests too. Wrapped in try/catch like the SQLite branch so an
    // offline/failed IFCT query degrades to "just the other two sources,"
    // never a crash.
    //
    // Match strategy: PREFIX (`${q}%`) + WORD-BOUNDARY (`% ${q}%`), NOT a bare
    // substring. A bare `%${q}%` collided: "oat" matched "Goat" because "goat"
    // contains "oat". Prefix catches "Oats", "Almonds", "Milk"; word-boundary
    // (space-prefixed) catches multi-word names like "Raw Oats", "Rolled
    // Oats". "Goat" matches neither (no prefix, no leading space) so it is
    // correctly excluded. The two queries run in parallel and are merged +
    // deduped by food_code; each is bounded by limit(20).
    let ifctMatches: FoodSearchHit[] = [];
    try {
      const selectCols =
        "food_code,name,local_names,energy_kcal_100g,protein_100g,carbohydrate_100g,fat_100g,fiber_100g,sugar_100g,sodium_mg_100g";
      const [prefixRes, wordRes] = await Promise.all([
        supabase.from("ifct_foods").select(selectCols).ilike("name", `${q}%`).limit(20),
        supabase.from("ifct_foods").select(selectCols).ilike("name", `% ${q}%`).limit(20),
      ]);
      if (prefixRes.error || wordRes.error) {
        console.error(
          "[FoodPickerSheet] IFCT search failed:",
          prefixRes.error,
          wordRes.error,
        );
      }
      const seenCodes = new Set<string>();
      const rows: NonNullable<typeof prefixRes.data> = [];
      for (const list of [prefixRes.data ?? [], wordRes.data ?? []]) {
        for (const row of list) {
          if (row && !seenCodes.has(row.food_code)) {
            seenCodes.add(row.food_code);
            rows.push(row);
          }
        }
      }
      ifctMatches = rows.map(fromIFCT);
    } catch (error) {
      console.error("[FoodPickerSheet] IFCT search threw:", error);
    }

    // Merge: Indian dishes first (curated, accurate), then IFCT generic
    // ingredients, then SQLite branded products. Dedupe by lowercased name
    // so the same item doesn't appear twice across sources.
    const seen = new Set<string>();
    const merged: FoodSearchHit[] = [];
    for (const hit of [...indianMatches, ...ifctMatches, ...sqliteMatches]) {
      const k = hit.name.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(hit);
      }
    }
    setHits(merged);
    setLoading(false);
  }, []);

  // ── Resolve the picker context into a store mutation. Shared by both the
  // search-hit path (hitToMealItem) and the manual custom-food form
  // (buildMealItemFromMacros) so a hand-typed food lands through the exact
  // same store writes as a database-sourced one (P0 of the Phase 6 plan).
  const commitMealItem = useCallback(
    (item: MealItem) => {
      if (!pickerContext) return;
      void addRecentFoodSearch(item.name ?? item.food.name);
      const { dayOfWeek, mealType, mealId, mode, replaceItemIndex } = pickerContext;

      if (mode === "replace") {
        if (!mealId || replaceItemIndex == null) {
          console.error("[FoodPickerSheet] replace mode missing mealId/replaceItemIndex");
          closePicker();
          return;
        }
        updateFoodItem(mealId, replaceItemIndex, item);
      } else {
        const targetMealId = mealId ?? addMeal(dayOfWeek, mealType);
        if (!targetMealId) {
          console.error("[FoodPickerSheet] failed to resolve target meal for add");
          closePicker();
          return;
        }
        addFoodItem(targetMealId, item);
      }
      haptics.success();
      closePicker();
    },
    [pickerContext, addMeal, addFoodItem, updateFoodItem, closePicker],
  );

  const applyHit = useCallback(
    (hit: FoodSearchHit) => {
      commitMealItem(hitToMealItem(hit));
    },
    [commitMealItem],
  );

  /** Open the manual custom-food form, pre-filling the name with the current
   * query (the plan's zero-results + persistent-row CTAs both feed in here).
   * P0 escape hatch for any food no database contains (chia seeds, boiled
   * water, a homemade mix). Macros are absolute for the given grams — NOT a
   * per-100g density — so "boiled water" with all macros left at 0 correctly
   * lands at 0 kcal with no special-casing. */
  const openCustomForm = useCallback((prefillName?: string) => {
    haptics.selection();
    setCustomName(prefillName ?? "");
    setCustomGrams("100");
    setCustomProtein("0");
    setCustomCarbs("0");
    setCustomFat("0");
    setCustomFiber("0");
    setShowCustomForm(true);
  }, []);

  const submitCustomFood = useCallback(() => {
    const name = customName.trim();
    if (!name) {
      crossPlatformAlert("Name required", "Enter a food name to add it.");
      return;
    }
    const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
    const item = buildMealItemFromMacros({
      name,
      grams: num(customGrams),
      protein: num(customProtein),
      carbs: num(customCarbs),
      fat: num(customFat),
      fiber: num(customFiber),
    });
    setShowCustomForm(false);
    commitMealItem(item);
  }, [customName, customGrams, customProtein, customCarbs, customFat, customFiber, commitMealItem]);

  const applySavedMeal = useCallback(
    (mealId: string) => {
      if (!pickerContext) return;
      const template = applyToSchedule(mealId);
      if (!template) {
        console.error("[FoodPickerSheet] saved meal not found:", mealId);
        return;
      }
      applyMealTemplate(pickerContext.dayOfWeek, pickerContext.mealType, template);
      haptics.success();
      closePicker();
    },
    [pickerContext, applyToSchedule, applyMealTemplate, closePicker],
  );

  const handleToggleFavorite = useCallback(async (hit: FoodSearchHit) => {
    const nowFav = await toggleFavoriteFood(hit.key);
    haptics.selection();
    setFavoriteKeys((prev) =>
      nowFav ? [...prev, hit.key] : prev.filter((k) => k !== hit.key),
    );
  }, []);

  const handleBarcodeResolved = useCallback(
    (result: ProductLookupResult) => {
      if (result.outcome !== "authoritative_hit" && result.outcome !== "weak_data") {
        crossPlatformAlert("Product not found", "Try searching by name instead.");
        return;
      }
      if (!result.product) return;
      setShowBarcodeEntry(false);
      applyHit(scannedProductToHit(result.product));
    },
    [applyHit],
  );

  const quickPicks = useMemo(() => getQuickFoodPicks(), []);
  const favoriteIndianHits = useMemo(() => {
    return favoriteKeys
      .filter((k) => k.startsWith("indian:"))
      .map((k) => {
        const dbKey = k.slice("indian:".length);
        const entry = INDIAN_FOOD_DATABASE[dbKey];
        return entry ? fromIndian(entry, dbKey) : null;
      })
      .filter((h): h is FoodSearchHit => Boolean(h));
  }, [favoriteKeys]);

  const showBrowseSections = query.trim().length < MIN_QUERY;
  const showNoResults = !showBrowseSections && !loading && hits.length === 0;

  return (
    <DetentBottomSheet
      visible={pickerOpen}
      onClose={closePicker}
      snapPoints={[0.5, 0.95]}
      initialSnapIndex={1}
      testID="food-picker-sheet"
    >
      {showBarcodeEntry ? (
        <ManualBarcodeEntry
          onLookupResolved={handleBarcodeResolved}
          onRequestLabelScan={() => {
            crossPlatformAlert("Not available here", "Label scanning is available from Log Meal.");
          }}
          onContributeProduct={() => {
            crossPlatformAlert("Thanks", "This product will be added to the shared database.");
          }}
          onClose={() => setShowBarcodeEntry(false)}
        />
      ) : showCustomForm ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.customFormContainer}
        >
          <View style={styles.customHeader}>
            <Pressable
              onPress={() => {
                haptics.selection();
                setShowCustomForm(false);
              }}
              style={styles.customBackBtn}
              accessibilityRole="button"
              accessibilityLabel="Back to search"
            >
              <Ionicons name="arrow-back" size={rf(20)} color={colors.text.secondary} />
            </Pressable>
            <Text style={styles.customTitle}>Add custom food</Text>
            <View style={styles.customBackBtn} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.customScroll}>
            <View style={styles.customField}>
              <Text style={styles.customLabel}>Name</Text>
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="e.g. Chia seeds"
                placeholderTextColor={colors.text.tertiary}
                style={styles.customInput}
                autoFocus
              />
            </View>
            <View style={styles.customField}>
              <Text style={styles.customLabel}>Grams</Text>
              <TextInput
                value={customGrams}
                onChangeText={setCustomGrams}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={colors.text.tertiary}
                style={styles.customInput}
              />
            </View>
            <Text style={styles.customHint}>
              Enter the macros for the grams above — these are absolute values
              for that portion, not per-100g. Leave them at 0 for zero-calorie
              items like plain water.
            </Text>
            <View style={styles.macroGrid}>
              <View style={styles.customField}>
                <Text style={styles.customLabel}>Protein (g)</Text>
                <TextInput
                  value={customProtein}
                  onChangeText={setCustomProtein}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.customInput}
                />
              </View>
              <View style={styles.customField}>
                <Text style={styles.customLabel}>Carbs (g)</Text>
                <TextInput
                  value={customCarbs}
                  onChangeText={setCustomCarbs}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.customInput}
                />
              </View>
              <View style={styles.customField}>
                <Text style={styles.customLabel}>Fat (g)</Text>
                <TextInput
                  value={customFat}
                  onChangeText={setCustomFat}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.customInput}
                />
              </View>
              <View style={styles.customField}>
                <Text style={styles.customLabel}>Fiber (g)</Text>
                <TextInput
                  value={customFiber}
                  onChangeText={setCustomFiber}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.customInput}
                />
              </View>
            </View>
            <View style={styles.caloriePreview}>
              <Text style={styles.caloriePreviewText}>
                ≈ {Math.round(
                  caloriesFromMacros({
                    protein: parseFloat(customProtein.replace(",", ".")) || 0,
                    carbs: parseFloat(customCarbs.replace(",", ".")) || 0,
                    fat: parseFloat(customFat.replace(",", ".")) || 0,
                    fiber: parseFloat(customFiber.replace(",", ".")) || 0,
                  }),
                )}{" "}
                kcal
              </Text>
            </View>
          </ScrollView>

          <Pressable
            onPress={submitCustomFood}
            style={styles.customSubmitBtn}
            accessibilityRole="button"
            accessibilityLabel="Add this custom food"
          >
            <Text style={styles.customSubmitText}>Add food</Text>
          </Pressable>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.container}>
          <View style={styles.header}>
            <AuroraSearchField
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery("")}
              placeholder="Search food by name"
              containerStyle={styles.searchField}
            />
            <Pressable
              onPress={() => {
                haptics.selection();
                setShowBarcodeEntry(true);
              }}
              style={styles.barcodeBtn}
              accessibilityRole="button"
              accessibilityLabel="Enter barcode"
            >
              <Ionicons name="barcode-outline" size={rf(20)} color={colors.text.secondary} />
            </Pressable>
          </View>

          {showBrowseSections ? (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.browseScroll}>
              {recents.length > 0 && (
                <Section title="Recent">
                  <View style={styles.chipRow}>
                    {recents.map((r) => (
                      <Pressable
                        key={r}
                        style={styles.chip}
                        onPress={() => setQuery(r)}
                        accessibilityRole="button"
                        accessibilityLabel={`Search ${r}`}
                      >
                        <Text style={styles.chipText} numberOfLines={1}>{r}</Text>
                      </Pressable>
                    ))}
                  </View>
                </Section>
              )}

              {favoriteIndianHits.length > 0 && (
                <Section title="Favorites">
                  {favoriteIndianHits.map((hit) => (
                    <HitRow
                      key={hit.key}
                      hit={hit}
                      isFavorite
                      onPress={() => applyHit(hit)}
                      onToggleFavorite={() => handleToggleFavorite(hit)}
                    />
                  ))}
                </Section>
              )}

              {savedMeals.length > 0 && (
                <Section title="My Saved Meals">
                  {savedMeals.map((meal) => (
                    <Pressable
                      key={meal.id}
                      style={styles.card}
                      onPress={() => applySavedMeal(meal.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Add saved meal ${meal.name}`}
                    >
                      <View style={styles.cardRow}>
                        <View style={[styles.sourceTag, styles.savedTag]}>
                          <Text style={styles.sourceTagText}>Saved</Text>
                        </View>
                        <View style={styles.cardNameWrap}>
                          <Text style={styles.cardName} numberOfLines={1}>{meal.name}</Text>
                          <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {meal.ingredients.length} ingredient{meal.ingredients.length === 1 ? "" : "s"}
                          </Text>
                        </View>
                        <Text style={styles.cardCals}>{Math.round(meal.totalCalories)} kcal</Text>
                      </View>
                    </Pressable>
                  ))}
                </Section>
              )}

              {quickPicks.length > 0 && (
                <Section title="Quick Picks">
                  {quickPicks.map((pick) => {
                    const hit = fromIndian(pick, pick.key);
                    const isFav = favoriteKeys.includes(hit.key);
                    return (
                      <HitRow
                        key={hit.key}
                        hit={hit}
                        isFavorite={isFav}
                        onPress={() => applyHit(hit)}
                        onToggleFavorite={() => handleToggleFavorite(hit)}
                      />
                    );
                  })}
                </Section>
              )}
            </ScrollView>
          ) : (
            <>
              {loading && (
                <View style={styles.statusRow}>
                  <AuroraSpinner customSize={rf(14)} theme="primary" />
                  <Text style={styles.statusText}>Searching…</Text>
                </View>
              )}
              <FlatList
                data={hits}
                keyExtractor={(item) => item.key}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  showNoResults ? (
                    <View>
                      <EmptyState
                        icon="search-outline"
                        iconSize={rf(36)}
                        title="No foods found"
                        subtitle="Try a shorter name, or add it manually."
                        ctaText="Add custom food"
                        onCta={() => openCustomForm(query.trim())}
                        delay={0}
                      />
                      <Pressable
                        onPress={() => setQuery("")}
                        style={styles.clearSearchLink}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                      >
                        <Text style={styles.clearSearchLinkText}>Clear search</Text>
                      </Pressable>
                    </View>
                  ) : null
                }
                ListFooterComponent={
                  // Persistent, always-visible escape hatch once the user has
                  // typed ≥2 chars — present whether results came back or not,
                  // so a hand-typed food is reachable without first exhausting
                  // search. P0 of the Phase 6 plan.
                  query.trim().length >= MIN_QUERY && !loading ? (
                    <Pressable
                      onPress={() => openCustomForm(query.trim())}
                      style={styles.addCustomRow}
                      accessibilityRole="button"
                      accessibilityLabel="Add custom food"
                    >
                      <Ionicons name="add-circle-outline" size={rf(18)} color={colors.primary.DEFAULT} />
                      <Text style={styles.addCustomText}>Can't find it? Add custom food</Text>
                    </Pressable>
                  ) : null
                }
                renderItem={({ item }) => (
                  <HitRow
                    hit={item}
                    isFavorite={favoriteKeys.includes(item.key)}
                    onPress={() => applyHit(item)}
                    onToggleFavorite={() => handleToggleFavorite(item)}
                  />
                )}
              />
            </>
          )}
        </View>
      )}
    </DetentBottomSheet>
  );
};

// ----------------------------------------------------------------------------
// SUBCOMPONENTS
// ----------------------------------------------------------------------------

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const HitRow: React.FC<{
  hit: FoodSearchHit;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}> = ({ hit, isFavorite, onPress, onToggleFavorite }) => (
  <View style={styles.card}>
    <View style={styles.cardRow}>
      {/* The row body and the favorite toggle are SIBLING Pressables (not
          nested) so react-native-web renders two separate <button>s instead
          of an invalid <button> inside a <button>. */}
      <Pressable
        style={styles.cardMain}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Add ${hit.name}`}
      >
        <View
          style={[
            styles.sourceTag,
            hit.source === "sqlite"
              ? styles.sqliteTag
              : hit.source === "ifct"
                ? styles.ifctTag
                : styles.indianTag,
          ]}
        >
          <Text style={styles.sourceTagText}>
            {hit.source === "sqlite" ? "Packaged" : hit.source === "ifct" ? "IFCT" : "Dish"}
          </Text>
        </View>
        <View style={styles.cardNameWrap}>
          <Text style={styles.cardName} numberOfLines={1}>{hit.name}</Text>
          {hit.subtitle ? (
            <Text style={styles.cardSubtitle} numberOfLines={1}>{hit.subtitle}</Text>
          ) : null}
        </View>
        <Text style={styles.cardCals}>{Math.round(hit.per100g.calories)}/100g</Text>
      </Pressable>
      <Pressable
        hitSlop={10}
        onPress={onToggleFavorite}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? `Unfavorite ${hit.name}` : `Favorite ${hit.name}`}
        style={styles.favBtn}
      >
        <Ionicons
          name={isFavorite ? "heart" : "heart-outline"}
          size={rf(16)}
          color={isFavorite ? colors.error.DEFAULT : colors.text.tertiary}
        />
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
  },
  searchField: { flex: 1 },
  barcodeBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: surface[2],
    alignItems: "center",
    justifyContent: "center",
  },
  browseScroll: { flex: 1 },
  section: { marginBottom: rp(spacing.md) },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: rp(spacing.sm),
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.xs),
  },
  chip: {
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.full,
    backgroundColor: surface[2],
    borderWidth: 1,
    borderColor: border.subtle,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  card: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: border.subtle,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    marginBottom: rp(spacing.xs),
    minHeight: rh(56),
    justifyContent: "center",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
  },
  cardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    minWidth: 0,
  },
  sourceTag: {
    paddingHorizontal: rp(8),
    paddingVertical: rp(3),
    borderRadius: borderRadius.full,
  },
  sqliteTag: { backgroundColor: hexToRgba(colors.info.DEFAULT, 0.15) },
  indianTag: { backgroundColor: hexToRgba(colors.warning.DEFAULT, 0.15) },
  ifctTag: { backgroundColor: hexToRgba(colors.success.DEFAULT, 0.15) },
  savedTag: { backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.15) },
  sourceTagText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: "uppercase",
  },
  cardNameWrap: { flex: 1, minWidth: 0 },
  cardName: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  cardSubtitle: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    marginTop: 2,
  },
  cardCals: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontVariant: ["tabular-nums"],
  },
  favBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.xs),
  },
  statusText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
  },
  list: { flex: 1 },
  listContent: { paddingBottom: rp(spacing.md) },
  // ── Persistent "Add custom food" footer row (P0) ──
  addCustomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.md),
    marginTop: rp(spacing.xs),
  },
  addCustomText: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  clearSearchLink: {
    alignSelf: "center",
    paddingVertical: rp(spacing.sm),
    marginTop: rp(spacing.xs),
  },
  clearSearchLinkText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  // ── Custom-food entry form (P0) ──
  customFormContainer: {
    flex: 1,
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.sm),
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: rp(spacing.md),
  },
  customBackBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  customTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  customScroll: { flex: 1 },
  customField: {
    marginBottom: rp(spacing.md),
  },
  customLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: rp(spacing.xs),
  },
  customInput: {
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.md,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    minHeight: 44,
  },
  customHint: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    marginBottom: rp(spacing.md),
    lineHeight: rf(typography.fontSize.micro) * 1.4,
  },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.sm),
  },
  caloriePreview: {
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    marginTop: rp(spacing.xs),
  },
  caloriePreviewText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    fontVariant: ["tabular-nums"],
  },
  customSubmitBtn: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    paddingVertical: rp(spacing.md),
    alignItems: "center",
    marginBottom: rp(spacing.sm),
  },
  customSubmitText: {
    color: "#FFFFFF",
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as any,
  },
});

export default FoodPickerSheet;
