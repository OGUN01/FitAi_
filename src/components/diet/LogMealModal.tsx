/**
 * LogMealModal - Custom meal logging with ingredient-level entry
 *
 * Features:
 * - Enter meal name and select meal type
 * - Add individual ingredients (name + grams + protein/carbs/fat)
 * - Macros auto-sum from all ingredients
 * - Or use "Simple" mode: directly enter totals
 * - Saves to nutritionStore (weeklyMealPlan + marks complete → shows in daily macros)
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors } from "../../theme/aurora-tokens";
import { rf, rh, rw, rp, rbr } from "../../utils/responsive";
import { useNutritionStore } from "../../stores/nutritionStore";
import {
  useSavedMealsStore,
  type SavedMeal,
} from "../../stores/savedMealsStore";
import { haptics } from "../../utils/haptics";
import { parseLocalFloat } from "../../utils/units";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { completionTrackingService } from "../../services/completionTracking";
import { useAuth } from "../../hooks/useAuth";
import { MealLogProvenance } from "../../types/nutritionLogging";

export interface LogMealScanResult {
  type: "food" | "label" | "barcode";
  mealName: string;
  suggestedMealType?: MealType;
  packagedFood?: {
    referenceId: string;
    source: string;
    serving: {
      size?: number | null;
      unit?: string | null;
    };
    per100g: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      sugar?: number;
      sodium?: number;
    };
    perServing?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
  };
  ingredients?: Array<{
    name: string;
    grams: string;
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
  }>;
  directEntry?: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
  };
  portionAssumptionGrams?: number;
  confidence?: number;
  provenance?: MealLogProvenance;
  reviewNote?: string;
}

interface LogMealModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestFoodScan?: () => void;
  onRequestLabelScan?: (
    mealType: "breakfast" | "lunch" | "dinner" | "snack",
  ) => void;
  onRequestBarcodeScan?: () => void;
  pendingScanResult?: LogMealScanResult | null;
  onScanResultConsumed?: () => void;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snack: "cafe-outline",
};

interface Ingredient {
  id: string;
  name: string;
  grams: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  // FEATURE 1: per-100g nutrient density (grams of macro per 100g of food).
  // Captured when the ingredient is auto-filled from a saved meal or when the
  // user edits a macro+grams pair. Drives proportional rescaling when the user
  // adjusts the grams field up/down. null = no density known (manual entry with
  // no grams yet) → grams edits leave macros untouched (legacy behavior).
  per100gProtein?: number | null;
  per100gCarbs?: number | null;
  per100gFat?: number | null;
  per100gFiber?: number | null;
}

const makeIngredient = (): Ingredient => ({
  id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  name: "",
  grams: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
  per100gProtein: null,
  per100gCarbs: null,
  per100gFat: null,
  per100gFiber: null,
});

const parseNum = (v: string) => parseLocalFloat(v) || 0;

export const LogMealModal: React.FC<LogMealModalProps> = ({
  visible,
  onClose,
  onRequestFoodScan,
  onRequestLabelScan,
  onRequestBarcodeScan,
  pendingScanResult,
  onScanResultConsumed,
}) => {
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [mode, setMode] = useState<"ingredients" | "simple">("ingredients");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    makeIngredient(),
  ]);

  // Simple mode fields
  const [simpleCalories, setSimpleCalories] = useState("");
  const [simpleProtein, setSimpleProtein] = useState("");
  const [simpleCarbs, setSimpleCarbs] = useState("");
  const [simpleFat, setSimpleFat] = useState("");
  const [simpleFiber, setSimpleFiber] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanProvenance, setScanProvenance] =
    useState<MealLogProvenance | null>(null);
  const [scanReviewNote, setScanReviewNote] = useState<string | null>(null);
  const [scanType, setScanType] = useState<LogMealScanResult["type"] | null>(
    null,
  );
  const [portionAssumptionGrams, setPortionAssumptionGrams] = useState<
    number | null
  >(null);
  const [baseDirectEntry, setBaseDirectEntry] = useState<
    LogMealScanResult["directEntry"] | null
  >(null);
  const [activeMultiplier, setActiveMultiplier] = useState<number>(1);

  // FEATURE 1: saved-meals autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { weeklyMealPlan, setWeeklyMealPlan, addDailyMeal } =
    useNutritionStore();
  const { user } = useAuth();
  const savedMealsStore = useSavedMealsStore();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // Derived totals from ingredient mode
  const totalProtein = ingredients.reduce((s, i) => s + parseNum(i.protein), 0);
  const totalCarbs = ingredients.reduce((s, i) => s + parseNum(i.carbs), 0);
  const totalFat = ingredients.reduce((s, i) => s + parseNum(i.fat), 0);
  const totalFiber = ingredients.reduce((s, i) => s + parseNum(i.fiber), 0);
  // Approx calories: 4 cal/g protein+carbs, 9 cal/g fat
  const totalCalories = Math.round(
    totalProtein * 4 + totalCarbs * 4 + totalFat * 9,
  );

  useEffect(() => {
    if (!pendingScanResult) return;

    if (pendingScanResult.mealName) setMealName(pendingScanResult.mealName);
    if (pendingScanResult.suggestedMealType)
      setMealType(pendingScanResult.suggestedMealType);
    setScanProvenance(pendingScanResult.provenance || null);
    setScanReviewNote(pendingScanResult.reviewNote || null);
    setScanType(pendingScanResult.type);
    setPortionAssumptionGrams(pendingScanResult.portionAssumptionGrams ?? null);
    setActiveMultiplier(1);

    if (pendingScanResult.ingredients?.length) {
      setMode("ingredients");
      setIngredients(
        pendingScanResult.ingredients.map((ing) => ({
          ...makeIngredient(),
          name: ing.name,
          grams: ing.grams,
          protein: ing.protein,
          carbs: ing.carbs,
          fat: ing.fat,
          fiber: ing.fiber,
        })),
      );
      setBaseDirectEntry(null);
    } else if (pendingScanResult.directEntry) {
      setMode("simple");
      setBaseDirectEntry(pendingScanResult.directEntry);
      setSimpleCalories(pendingScanResult.directEntry.calories);
      setSimpleProtein(pendingScanResult.directEntry.protein);
      setSimpleCarbs(pendingScanResult.directEntry.carbs);
      setSimpleFat(pendingScanResult.directEntry.fat);
      setSimpleFiber(pendingScanResult.directEntry.fiber);
    }

    onScanResultConsumed?.();
  }, [pendingScanResult]);

  const applyMultiplier = (m: number) => {
    if (!baseDirectEntry) return;
    setActiveMultiplier(m);
    setSimpleCalories(
      Math.round(parseNum(baseDirectEntry.calories) * m).toString(),
    );
    setSimpleProtein((parseNum(baseDirectEntry.protein) * m).toFixed(1));
    setSimpleCarbs((parseNum(baseDirectEntry.carbs) * m).toFixed(1));
    setSimpleFat((parseNum(baseDirectEntry.fat) * m).toFixed(1));
    setSimpleFiber((parseNum(baseDirectEntry.fiber) * m).toFixed(1));
    haptics.light();
  };

  // FEATURE 1: saved-meal suggestions filtered by typed name + selected meal type.
  // ≥2 chars triggers the dropdown; matches are case-insensitive substrings.
  const mealNameSuggestions = useMemo<SavedMeal[]>(() => {
    const q = mealName.trim();
    if (q.length < 2) return [];
    return savedMealsStore
      .getMealsByName(q, mealType)
      .slice(0, 6);
  }, [mealName, mealType, savedMealsStore]);

  // Auto-fill the form from a saved meal: name, type, ingredients, totals.
  // Rebuilds ingredient rows with fresh ids so editing is independent of the
  // saved copy. The nutrition summary (totalCalories etc.) is already derived
  // reactively from `ingredients`, so it updates automatically.
  //
  // FEATURE 1: we also capture each ingredient's per-100g density from the
  // saved portion (grams + macros both known), so the user can then nudge the
  // grams field up/down and all macros rescale proportionally.
  const handleSelectSavedMeal = useCallback(
    (meal: SavedMeal) => {
      setMealName(meal.name);
      if (meal.ingredients.length > 0) {
        setMode("ingredients");
        setIngredients(
          meal.ingredients.map((ing) => {
            const base = makeIngredient();
            base.name = ing.name;
            base.grams = ing.grams;
            base.protein = ing.protein;
            base.carbs = ing.carbs;
            base.fat = ing.fat;
            base.fiber = ing.fiber;
            // Capture per-100g density from this known portion so later grams
            // edits rescale the macros. density = macroValue * (100 / grams).
            const g = parseNum(ing.grams);
            if (g > 0) {
              base.per100gProtein = parseNum(ing.protein) * (100 / g);
              base.per100gCarbs = parseNum(ing.carbs) * (100 / g);
              base.per100gFat = parseNum(ing.fat) * (100 / g);
              base.per100gFiber = parseNum(ing.fiber) * (100 / g);
            }
            return base;
          }),
        );
        setBaseDirectEntry(null);
        setActiveMultiplier(1);
      }
      setShowSuggestions(false);
      haptics.light();
    },
    [],
  );

  // FEATURE 1: "Save Meal" — persist the current ingredients + totals for
  // future reuse. Requires a name and at least one ingredient with a name.
  const handleSaveMeal = useCallback(() => {
    const trimmedName = mealName.trim();
    if (!trimmedName) {
      crossPlatformAlert(
        "Missing Name",
        "Enter a meal name first to save it for reuse.",
      );
      return;
    }
    if (mode !== "ingredients") {
      crossPlatformAlert(
        "Save Meal",
        "Saving meals is available in the By Ingredients mode.",
      );
      return;
    }
    const hasAnyIngredient = ingredients.some((i) => i.name.trim());
    if (!hasAnyIngredient) {
      crossPlatformAlert(
        "No Ingredients",
        "Add at least one ingredient before saving the meal.",
      );
      return;
    }
    try {
      savedMealsStore.saveMeal({
        name: trimmedName,
        mealType,
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            grams: i.grams,
            protein: i.protein,
            carbs: i.carbs,
            fat: i.fat,
            fiber: i.fiber,
          })),
      });
      haptics.success();
      crossPlatformAlert(
        "Meal Saved",
        `"${trimmedName}" is now available to reuse when you start typing its name in Log Meal.`,
      );
    } catch (err) {
      console.error("Failed to save meal:", err);
      crossPlatformAlert("Error", "Failed to save meal. Please try again.");
    }
  }, [mealName, mode, ingredients, mealType, savedMealsStore]);

  const resetForm = () => {
    setMealName("");
    setMealType("lunch");
    setMode("ingredients");
    setIngredients([makeIngredient()]);
    setSimpleCalories("");
    setSimpleProtein("");
    setSimpleCarbs("");
    setSimpleFat("");
    setSimpleFiber("");
    setScanProvenance(null);
    setScanReviewNote(null);
    setScanType(null);
    setPortionAssumptionGrams(null);
    setBaseDirectEntry(null);
    setActiveMultiplier(1);
    setShowSuggestions(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addIngredient = () => {
    if (ingredients.length >= 10) {
      crossPlatformAlert("Limit Reached", "Maximum 10 ingredients per meal.");
      return;
    }
    setIngredients((prev) => [...prev, makeIngredient()]);
    haptics.light();
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length === 1) return; // keep at least one
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    haptics.light();
  };

  const updateIngredient = useCallback(
    (id: string, field: keyof Omit<Ingredient, "id">, value: string) => {
      setIngredients((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          const next = { ...i, [field]: value };

          // FEATURE 1: proportional macro rescaling.
          // When grams change and we know the per-100g density (captured from a
          // saved meal or from a prior macro+grams pairing), rescale all macro
          // fields to match the new portion. When a macro field changes while
          // grams are present, re-capture the density so future grams edits
          // track the user's intent. This keeps the nutrition summary live as
          // the user nudges grams up/down. Reuses the shared nutritionRecalc
          // math (scaleMacrosByGrams would require a per-100g shape — we inline
          // the ratio here since density fields are optional/sparse).
          const gramsNum = parseNum(next.grams);

          if (field === "grams") {
            // Rescale macros from density if we have it.
            if (gramsNum > 0) {
              const ratio = gramsNum / 100;
              if (next.per100gProtein != null) {
                next.protein = (next.per100gProtein * ratio).toFixed(1);
              }
              if (next.per100gCarbs != null) {
                next.carbs = (next.per100gCarbs * ratio).toFixed(1);
              }
              if (next.per100gFat != null) {
                next.fat = (next.per100gFat * ratio).toFixed(1);
              }
              if (next.per100gFiber != null) {
                next.fiber = (next.per100gFiber * ratio).toFixed(1);
              }
            }
          } else if (
            field === "protein" ||
            field === "carbs" ||
            field === "fat" ||
            field === "fiber"
          ) {
            // Re-capture density from (grams, macro) so later grams edits
            // rescale proportionally. Only when grams present & > 0.
            if (gramsNum > 0) {
              const density = parseNum(value) * (100 / gramsNum);
              if (field === "protein") next.per100gProtein = density;
              if (field === "carbs") next.per100gCarbs = density;
              if (field === "fat") next.per100gFat = density;
              if (field === "fiber") next.per100gFiber = density;
            }
          }

          return next;
        }),
      );
    },
    [],
  );

  const handleSave = async () => {
    if (isSubmitting) return;

    const trimmedName = mealName.trim();
    if (!trimmedName) {
      crossPlatformAlert("Missing Info", "Please enter a meal name.");
      return;
    }

    let finalProtein = 0;
    let finalCarbs = 0;
    let finalFat = 0;
    let finalCalories = 0;
    let finalFiber = 0;

    if (mode === "ingredients") {
      const hasAnyIngredient = ingredients.some((i) => i.name.trim());
      if (!hasAnyIngredient) {
        crossPlatformAlert(
          "No Ingredients",
          "Please add at least one ingredient name.",
        );
        return;
      }
      finalProtein = totalProtein;
      finalCarbs = totalCarbs;
      finalFat = totalFat;
      finalCalories = totalCalories;
      finalFiber = totalFiber;
    } else {
      finalCalories = parseNum(simpleCalories);
      if (finalCalories <= 0) {
        crossPlatformAlert(
          "Missing Info",
          "Please enter a valid calorie amount.",
        );
        return;
      }
      finalProtein = parseNum(simpleProtein);
      finalCarbs = parseNum(simpleCarbs);
      finalFat = parseNum(simpleFat);
      finalFiber = parseNum(simpleFiber);
    }

    setIsSubmitting(true);
    haptics.light();

    const today = new Date();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayName = dayNames[today.getDay()];
    const mealId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Build items list from ingredients (ingredient mode) for display
    const items =
      mode === "ingredients"
        ? ingredients
            .filter((i) => i.name.trim())
            .map((i, idx) => ({
              id: `item_${mealId}_${idx}`,
              name: i.name.trim(),
              quantity: parseNum(i.grams) || 1,
              unit: parseNum(i.grams) > 0 ? "g" : "serving",
              calories: Math.round(
                parseNum(i.protein) * 4 +
                  parseNum(i.carbs) * 4 +
                  parseNum(i.fat) * 9,
              ),
              macros: {
                protein: parseNum(i.protein),
                carbohydrates: parseNum(i.carbs),
                fat: parseNum(i.fat),
                fiber: parseNum(i.fiber),
              },
            }))
        : [
            {
              id: `item_${mealId}_0`,
              name: trimmedName,
              quantity: 1,
              unit: "serving",
              calories: finalCalories,
              macros: {
                protein: finalProtein,
                carbohydrates: finalCarbs,
                fat: finalFat,
                fiber: finalFiber,
              },
            },
          ];

    const derivedMacros = items.reduce(
      (acc, item) => ({
        protein: acc.protein + (item.macros?.protein ?? 0),
        carbohydrates: acc.carbohydrates + (item.macros?.carbohydrates ?? 0),
        fat: acc.fat + (item.macros?.fat ?? 0),
        fiber: acc.fiber + (item.macros?.fiber ?? 0),
      }),
      {
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fiber: 0,
      },
    );

    const newMeal = {
      id: mealId,
      type: mealType,
      name: trimmedName,
      description:
        mode === "ingredients"
          ? `Custom meal with ${items.length} ingredient${items.length !== 1 ? "s" : ""}`
          : `Manually logged ${mealType}`,
      items,
      totalCalories: finalCalories,
      totalMacros: {
        protein: derivedMacros.protein,
        carbohydrates: derivedMacros.carbohydrates,
        fat: derivedMacros.fat,
        fiber: derivedMacros.fiber,
      },
      preparationTime: 0,
      difficulty: "easy" as const,
      tags: ["manual"],
      dayOfWeek: todayName,
      isPersonalized: false,
      aiGenerated: false,
      createdAt: today.toISOString(),
      isCompleted: true,
      completedAt: today.toISOString(),
      // P0-2 fix: loggedAt is the SSOT marker for consumed meals
      // (getConsumedMealsFromState filters by typeof meal.loggedAt === "string").
      // Without it the just-logged meal is invisible to calorie/macro rings until
      // the realtime meal_logs round-trip completes.
      loggedAt: today.toISOString(),
      sourceMetadata: scanProvenance,
    };

    try {
      // P0-1 fix: manual meal logs must NEVER be persisted into weeklyMealPlan
      // (the AI planning array). Previously this appended newMeal into
      // weeklyMealPlan.meals and called saveWeeklyMealPlan, which wrote the
      // manual meal into the weekly_meal_plans Supabase row — corrupting the AI
      // plan and conflating "what to eat" (plan) with "what was eaten" (meal_logs).
      //
      // The consumption SSOT is meal_logs. completionTrackingService.completeMeal
      // performs that insert (plus analytics + refresh) but looks the meal up from
      // weeklyMealPlan.meals, so we temporarily stage newMeal in the in-memory plan
      // (setWeeklyMealPlan only — NO saveWeeklyMealPlan DB persist) so the service
      // can find it. addDailyMeal is called so getTodaysConsumedNutrition reflects
      // the meal immediately (Principle 6: store is the runtime source).
      const currentPlan = weeklyMealPlan || {
        id: `plan_${Date.now()}`,
        weekNumber: 1,
        meals: [],
        planTitle: "Manual Meals",
      };

      const stagedPlan = {
        ...currentPlan,
        meals: [
          ...currentPlan.meals,
          newMeal as unknown as typeof currentPlan.meals[number],
        ],
      };
      // In-memory stage only — do NOT persist the manual meal into the AI plan.
      setWeeklyMealPlan(stagedPlan);
      // Reflect in consumed totals immediately (loggedAt set above).
      addDailyMeal(newMeal as unknown as import("../../types/ai").Meal);
      // completionTrackingService handles: mealProgress update + Supabase
      // meal_logs insert (the consumption SSOT) + analytics + refresh.
      await completionTrackingService.completeMeal(
        mealId,
        {
          provenance: scanProvenance,
          reviewNote: scanReviewNote,
        },
        user?.id || undefined,
      );

      haptics.success();
      resetForm();
      onClose();
    } catch (error) {
      console.error("Failed to log meal:", error);
      crossPlatformAlert("Error", "Failed to log meal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : Platform.OS === "android"
              ? "height"
              : undefined
        }
      >
        <View style={[styles.container, { maxHeight: windowHeight - insets.top - insets.bottom - rh(24) }]}>
          <GlassCard style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Log Meal</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close log meal"
              >
                <Ionicons
                  name="close"
                  size={rf(24)}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {/* Meal Name */}
              {scanReviewNote && (
                <View style={styles.scanNotice}>
                  <Ionicons
                    name="information-circle-outline"
                    size={rf(16)}
                    color={colors.primary}
                  />
                  <Text style={styles.scanNoticeText}>{scanReviewNote}</Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.label}>Meal Name</Text>
                <TextInput
                  style={styles.input}
                  value={mealName}
                  onChangeText={(v) => {
                    setMealName(v);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                  placeholder="e.g. Dal Rice, Chicken Salad"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                />

                {/* FEATURE 1: Saved-meals autocomplete dropdown */}
                {showSuggestions && mealNameSuggestions.length > 0 && (
                  <View style={styles.suggestionsList}>
                    <ScrollView
                      style={styles.suggestionsScroll}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                    >
                      {mealNameSuggestions.map((m) => {
                        const mealIcon =
                          (MEAL_ICONS as Record<string, string>)[
                            m.mealType
                          ] || "restaurant-outline";
                        return (
                        <TouchableOpacity
                          key={m.id}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSavedMeal(m)}
                          accessibilityRole="button"
                          accessibilityLabel={`Reuse saved meal ${m.name}`}
                        >
                          <Ionicons
                            name={mealIcon as keyof typeof Ionicons.glyphMap}
                            size={rf(15)}
                            color={colors.primary}
                          />
                          <View style={styles.suggestionTextWrap}>
                            <Text style={styles.suggestionName} numberOfLines={1}>
                              {m.name}
                            </Text>
                            <Text style={styles.suggestionMeta} numberOfLines={1}>
                              {m.ingredients.length} ingredient{m.ingredients.length !== 1 ? "s" : ""} · {m.totalCalories} cal · {m.totalProtein.toFixed(1)}g protein
                            </Text>
                          </View>
                          <Ionicons
                            name="arrow-undo-circle-outline"
                            size={rf(16)}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Meal Type */}
              <View style={styles.section}>
                <Text style={styles.label}>Meal Type</Text>
                <View style={styles.typeSelector}>
                  {MEAL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        mealType === type && styles.typeChipActive,
                      ]}
                      onPress={() => {
                        setMealType(type);
                        haptics.light();
                      }}
                    >
                      <Ionicons
                        name={
                          MEAL_ICONS[type] as keyof typeof Ionicons.glyphMap
                        }
                        size={rf(14)}
                        color={
                          mealType === type
                            ? colors.white
                            : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          mealType === type && styles.typeChipTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Mode Toggle */}
              <View style={styles.modeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.modeToggleBtn,
                    mode === "ingredients" && styles.modeToggleBtnActive,
                  ]}
                  onPress={() => setMode("ingredients")}
                >
                  <Ionicons
                    name="list-outline"
                    size={rf(14)}
                    color={
                      mode === "ingredients"
                        ? colors.white
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.modeToggleText,
                      mode === "ingredients" && styles.modeToggleTextActive,
                    ]}
                  >
                    By Ingredients
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeToggleBtn,
                    mode === "simple" && styles.modeToggleBtnActive,
                  ]}
                  onPress={() => setMode("simple")}
                >
                  <Ionicons
                    name="calculator-outline"
                    size={rf(14)}
                    color={
                      mode === "simple"
                        ? colors.white
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.modeToggleText,
                      mode === "simple" && styles.modeToggleTextActive,
                    ]}
                  >
                    Direct Entry
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Scan auto-fill row */}
              {(onRequestFoodScan ||
                onRequestLabelScan ||
                onRequestBarcodeScan) && (
                <View style={styles.scanRow}>
                  <Text style={styles.scanRowLabel}>Auto-fill via:</Text>
                  {onRequestFoodScan && (
                    <TouchableOpacity
                      style={styles.scanChip}
                      onPress={onRequestFoodScan}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={rf(14)}
                        color={colors.primary}
                      />
                      <Text style={styles.scanChipText}>Scan Dish</Text>
                    </TouchableOpacity>
                  )}
                  {onRequestLabelScan && (
                    <TouchableOpacity
                      style={styles.scanChip}
                      onPress={() => onRequestLabelScan(mealType)}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={rf(14)}
                        color={colors.primary}
                      />
                      <Text style={styles.scanChipText}>Label</Text>
                    </TouchableOpacity>
                  )}
                  {onRequestBarcodeScan && (
                    <TouchableOpacity
                      style={styles.scanChip}
                      onPress={onRequestBarcodeScan}
                    >
                      <Ionicons
                        name="barcode-outline"
                        size={rf(14)}
                        color={colors.primary}
                      />
                      <Text style={styles.scanChipText}>Barcode</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* INGREDIENT MODE */}
              {mode === "ingredients" && (
                <View style={styles.section}>
                  <View style={styles.ingredientsHeader}>
                    <Text style={styles.label}>Ingredients</Text>
                    <TouchableOpacity
                      onPress={addIngredient}
                      style={styles.addIngredientBtn}
                    >
                      <Ionicons
                        name="add-circle"
                        size={rf(20)}
                        color={colors.primary}
                      />
                      <Text style={styles.addIngredientText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Horizontally scrollable ingredient table */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingRight: rw(16) }}
                    nestedScrollEnabled
                  >
                    <View>
                      {/* Column headers */}
                      <View style={styles.ingredientColumnHeaders}>
                        <Text style={[styles.colHeader, { width: rw(80) }]}>
                          Ingredient
                        </Text>
                        <Text style={[styles.colHeader, styles.colFixed]}>
                          g
                        </Text>
                        <Text style={[styles.colHeader, styles.colFixed]}>
                          Pro
                        </Text>
                        <Text style={[styles.colHeader, styles.colFixed]}>
                          Carb
                        </Text>
                        <Text style={[styles.colHeader, styles.colFixed]}>
                          Fat
                        </Text>
                        <Text style={[styles.colHeader, styles.colFixed]}>
                          Fiber
                        </Text>
                        <View style={{ width: rw(22) }} />
                      </View>

                      {ingredients.map((ing, idx) => (
                        <View key={ing.id} style={styles.ingredientRow}>
                          <TextInput
                            style={[
                              styles.ingredientInput,
                              {
                                width: rw(80),
                                textAlign: "left" as const,
                                paddingHorizontal: rp(8),
                              },
                            ]}
                            value={ing.name}
                            onChangeText={(v) =>
                              updateIngredient(ing.id, "name", v)
                            }
                            placeholder={`Item ${idx + 1}`}
                            placeholderTextColor={
                              colors.textSecondary
                            }
                          />
                          <TextInput
                            style={[styles.ingredientInput, styles.colFixed]}
                            value={ing.grams}
                            onChangeText={(v) =>
                              updateIngredient(ing.id, "grams", v)
                            }
                            placeholder="0"
                            placeholderTextColor={
                              colors.textSecondary
                            }
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={[styles.ingredientInput, styles.colFixed]}
                            value={ing.protein}
                            onChangeText={(v) =>
                              updateIngredient(ing.id, "protein", v)
                            }
                            placeholder="0"
                            placeholderTextColor={
                              colors.textSecondary
                            }
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={[styles.ingredientInput, styles.colFixed]}
                            value={ing.carbs}
                            onChangeText={(v) =>
                              updateIngredient(ing.id, "carbs", v)
                            }
                            placeholder="0"
                            placeholderTextColor={
                              colors.textSecondary
                            }
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={[styles.ingredientInput, styles.colFixed]}
                            value={ing.fat}
                            onChangeText={(v) =>
                              updateIngredient(ing.id, "fat", v)
                            }
                            placeholder="0"
                            placeholderTextColor={
                              colors.textSecondary
                            }
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={[styles.ingredientInput, styles.colFixed]}
                            value={ing.fiber}
                            onChangeText={(v) =>
                              updateIngredient(ing.id, "fiber", v)
                            }
                            placeholder="0"
                            placeholderTextColor={
                              colors.textSecondary
                            }
                            keyboardType="numeric"
                          />
                          <TouchableOpacity
                            onPress={() => removeIngredient(ing.id)}
                            style={styles.removeBtn}
                            disabled={ingredients.length === 1}
                          >
                            <Ionicons
                              name="remove-circle-outline"
                              size={rf(18)}
                              color={
                                ingredients.length === 1
                                  ? colors.textSecondary
                                  : colors.error
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Totals summary */}
                  <View style={styles.totalsSummary}>
                    <View style={styles.totalItem}>
                      <Text style={styles.totalValue}>{totalCalories}</Text>
                      <Text style={styles.totalLabel}>cal</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Text
                        style={[
                          styles.totalValue,
                          { color: colors.errorLight },
                        ]}
                      >
                        {totalProtein.toFixed(1)}g
                      </Text>
                      <Text style={styles.totalLabel}>protein</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Text
                        style={[
                          styles.totalValue,
                          { color: colors.teal },
                        ]}
                      >
                        {totalCarbs.toFixed(1)}g
                      </Text>
                      <Text style={styles.totalLabel}>carbs</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Text
                        style={[
                          styles.totalValue,
                          { color: colors.amber },
                        ]}
                      >
                        {totalFat.toFixed(1)}g
                      </Text>
                      <Text style={styles.totalLabel}>fat</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Text
                        style={[
                          styles.totalValue,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {totalFiber.toFixed(1)}g
                      </Text>
                      <Text style={styles.totalLabel}>fiber</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* SIMPLE MODE */}
              {mode === "simple" && (
                <View style={styles.section}>
                  {scanType === "food" && portionAssumptionGrams != null && (
                    <View style={styles.portionBadgeRow}>
                      <Ionicons
                        name="scale-outline"
                        size={rf(13)}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.portionBadgeText}>
                        Assuming {portionAssumptionGrams}g serving
                      </Text>
                    </View>
                  )}
                  {scanType === "food" && baseDirectEntry != null && (
                    <View style={styles.multiplierRow}>
                      {([0.5, 1, 1.5, 2] as const).map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.multiplierBtn,
                            activeMultiplier === m &&
                              styles.multiplierBtnActive,
                          ]}
                          onPress={() => applyMultiplier(m)}
                        >
                          <Text
                            style={[
                              styles.multiplierBtnText,
                              activeMultiplier === m &&
                                styles.multiplierBtnTextActive,
                            ]}
                          >
                            {m}×
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <Text style={styles.label}>
                    Calories <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={simpleCalories}
                    onChangeText={setSimpleCalories}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.label, { marginTop: rh(12) }]}>
                    Macros (optional)
                  </Text>
                  <View style={styles.macroRow}>
                    <View style={styles.macroField}>
                      <Text style={styles.macroLabel}>Protein (g)</Text>
                      <TextInput
                        style={styles.macroInput}
                        value={simpleProtein}
                        onChangeText={setSimpleProtein}
                        placeholder="0"
                        placeholderTextColor={
                          colors.textSecondary
                        }
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.macroField}>
                      <Text style={styles.macroLabel}>Carbs (g)</Text>
                      <TextInput
                        style={styles.macroInput}
                        value={simpleCarbs}
                        onChangeText={setSimpleCarbs}
                        placeholder="0"
                        placeholderTextColor={
                          colors.textSecondary
                        }
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.macroField}>
                      <Text style={styles.macroLabel}>Fat (g)</Text>
                      <TextInput
                        style={styles.macroInput}
                        value={simpleFat}
                        onChangeText={setSimpleFat}
                        placeholder="0"
                        placeholderTextColor={
                          colors.textSecondary
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={[styles.macroRow, { marginTop: rh(10) }]}>
                    <View style={styles.macroField}>
                      <Text style={styles.macroLabel}>Fiber (g)</Text>
                      <TextInput
                        style={styles.macroInput}
                        value={simpleFiber}
                        onChangeText={setSimpleFiber}
                        placeholder="0"
                        placeholderTextColor={
                          colors.textSecondary
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons — pinned below the ScrollView so they are always
                visible regardless of content/keyboard height (BUG 2 fix). */}
            <View style={styles.footer}>
              <AnimatedPressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </AnimatedPressable>
              {/* FEATURE 1: Save Meal for future reuse (ingredients mode only) */}
              <AnimatedPressable
                style={[styles.button, styles.saveMealButton]}
                onPress={handleSaveMeal}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={rf(16)}
                  color={colors.primary}
                />
                <Text style={styles.saveMealButtonText}>Save Meal</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="checkmark"
                  size={rf(18)}
                  color={colors.white}
                />
                <Text style={styles.saveButtonText}>
                  {isSubmitting ? "Logging..." : "Log Meal"}
                </Text>
              </AnimatedPressable>
            </View>
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  container: {
    width: "93%",
    maxHeight: rh(767),
  },
  // BUG 2 fix: content is a flex column so the ScrollView can flex-grow/shrink
  // within the available height while the footer stays pinned at the bottom,
  // always visible even with the keyboard open. Previously content had no
  // flex direction and the ScrollView used a fixed maxHeight: rh(500) which
  // did not shrink when the keyboard reduced the window height, pushing the
  // footer below the viewport.
  content: {
    borderRadius: rbr(20),
    padding: rp(20),
    backgroundColor: colors.backgroundSecondary,
    flexDirection: "column" as const,
    maxHeight: "100%" as const,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: rh(16),
  },
  title: {
    fontSize: rf(22),
    fontWeight: "bold",
    color: colors.text,
  },
  closeButton: {
    padding: rp(8),
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  // BUG 2 fix: flex:1 lets the scroll area take whatever vertical space is
  // left after the header + footer, shrinking when the keyboard is open so the
  // Log Meal button can never be pushed off-screen.
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: rh(8),
  },
  section: {
    marginBottom: rh(16),
  },
  label: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.text,
    marginBottom: rh(6),
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: rbr(12),
    paddingHorizontal: rp(12),
    paddingVertical: rh(11),
    fontSize: rf(15),
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeSelector: {
    flexDirection: "row",
    gap: rw(6),
  },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: rw(3),
    paddingVertical: rh(8),
    paddingHorizontal: rw(4),
    borderRadius: rbr(10),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: colors.white,
  },
  modeToggleRow: {
    flexDirection: "row",
    gap: rw(8),
    marginBottom: rh(14),
    backgroundColor: colors.surface,
    borderRadius: rbr(12),
    padding: rp(4),
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: rw(5),
    paddingVertical: rh(8),
    borderRadius: rbr(10),
  },
  modeToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  modeToggleText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: colors.textSecondary,
  },
  modeToggleTextActive: {
    color: colors.white,
  },
  ingredientsHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: rh(6),
  },
  addIngredientBtn: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: rw(4),
  },
  addIngredientText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.primary,
  },
  colFixed: {
    width: rw(41),
  },
  ingredientColumnHeaders: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: rh(4),
    gap: rw(3),
  },
  colHeader: {
    fontSize: rf(10),
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center" as const,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: rw(3),
    marginBottom: rh(6),
  },
  ingredientInput: {
    backgroundColor: colors.surface,
    borderRadius: rbr(8),
    paddingHorizontal: rp(6),
    paddingVertical: rh(8),
    fontSize: rf(12),
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: "center" as const,
  },
  removeBtn: {
    width: rw(22),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  totalsSummary: {
    flexDirection: "row",
    backgroundColor: `${colors.primary}15`,
    borderRadius: rbr(12),
    paddingVertical: rh(10),
    paddingHorizontal: rp(8),
    marginTop: rh(8),
    justifyContent: "space-around" as const,
  },
  totalItem: {
    alignItems: "center" as const,
  },
  totalValue: {
    fontSize: rf(15),
    fontWeight: "700",
    color: colors.primary,
  },
  totalLabel: {
    fontSize: rf(10),
    color: colors.textSecondary,
    marginTop: rh(2),
  },
  macroRow: {
    flexDirection: "row",
    gap: rw(10),
  },
  macroField: {
    flex: 1,
  },
  macroLabel: {
    fontSize: rf(11),
    color: colors.textSecondary,
    marginBottom: rh(4),
  },
  macroInput: {
    backgroundColor: colors.surface,
    borderRadius: rbr(10),
    paddingHorizontal: rp(8),
    paddingVertical: rh(10),
    fontSize: rf(15),
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: "center" as const,
  },
  scanNotice: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: rw(8),
    backgroundColor: `${colors.primary}10`,
    borderRadius: rbr(12),
    paddingHorizontal: rp(12),
    paddingVertical: rh(10),
    marginBottom: rh(12),
  },
  scanNoticeText: {
    flex: 1,
    fontSize: rf(12),
    lineHeight: rf(17),
    color: colors.text,
  },
  scanRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: rw(8),
    marginBottom: rh(12),
    flexWrap: "wrap" as const,
  },
  scanRowLabel: {
    fontSize: rf(11),
    color: colors.textSecondary,
  },
  scanChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: rw(4),
    paddingVertical: rh(6),
    paddingHorizontal: rw(10),
    borderRadius: rbr(20),
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  scanChipText: {
    fontSize: rf(11),
    fontWeight: "600" as const,
    color: colors.primary,
  },
  portionBadgeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: rw(5),
    marginBottom: rh(8),
  },
  portionBadgeText: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
  multiplierRow: {
    flexDirection: "row" as const,
    gap: rw(8),
    marginBottom: rh(14),
  },
  multiplierBtn: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: rh(8),
    borderRadius: rbr(10),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiplierBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  multiplierBtnText: {
    fontSize: rf(13),
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  multiplierBtnTextActive: {
    color: colors.white,
  },
  footer: {
    flexDirection: "row",
    gap: rw(8),
    marginTop: rh(14),
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: rw(5),
    paddingVertical: rh(13),
    borderRadius: rbr(12),
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.text,
  },
  // FEATURE 1: tertiary "Save Meal" button — outline style so it reads as a
  // secondary action distinct from the primary "Log Meal".
  saveMealButton: {
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  saveMealButtonText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.white,
  },
  // FEATURE 1: autocomplete dropdown styles
  suggestionsList: {
    marginTop: rh(6),
    backgroundColor: colors.surface,
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: rh(220),
    overflow: "hidden",
  },
  suggestionsScroll: {
    flexGrow: 0,
  },
  suggestionItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: rw(8),
    paddingHorizontal: rp(12),
    paddingVertical: rh(11),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionName: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.text,
  },
  suggestionMeta: {
    fontSize: rf(11),
    color: colors.textSecondary,
    marginTop: rh(1),
  },
});

export default LogMealModal;
