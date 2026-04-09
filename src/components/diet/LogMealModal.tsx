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

import React, { useState, useCallback, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rh, rw, rp, rbr } from "../../utils/responsive";
import { useNutritionStore } from "../../stores/nutritionStore";
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
}

const makeIngredient = (): Ingredient => ({
  id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  name: "",
  grams: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
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

  const { weeklyMealPlan, setWeeklyMealPlan, saveWeeklyMealPlan } =
    useNutritionStore();
  const { user } = useAuth();

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
        prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
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
      sourceMetadata: scanProvenance,
    };

    try {
      const currentPlan = weeklyMealPlan || {
        id: `plan_${Date.now()}`,
        weekNumber: 1,
        meals: [],
        planTitle: "Manual Meals",
      };

      const updatedPlan = {
        ...currentPlan,
        meals: [...currentPlan.meals, newMeal as unknown as typeof currentPlan.meals[number]],
      };
      // Update local store first so completionTrackingService can find the meal
      setWeeklyMealPlan(updatedPlan);
      // Persist plan to DB
      await saveWeeklyMealPlan(updatedPlan);
      // completionTrackingService handles: mealProgress update + Supabase meal_logs insert + analytics + refresh
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
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
                  color={ResponsiveTheme.colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
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
                    color={ResponsiveTheme.colors.primary}
                  />
                  <Text style={styles.scanNoticeText}>{scanReviewNote}</Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.label}>Meal Name</Text>
                <TextInput
                  style={styles.input}
                  value={mealName}
                  onChangeText={setMealName}
                  placeholder="e.g. Dal Rice, Chicken Salad"
                  placeholderTextColor={ResponsiveTheme.colors.textSecondary}
                  autoFocus
                />
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
                            ? ResponsiveTheme.colors.white
                            : ResponsiveTheme.colors.textSecondary
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
                        ? ResponsiveTheme.colors.white
                        : ResponsiveTheme.colors.textSecondary
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
                        ? ResponsiveTheme.colors.white
                        : ResponsiveTheme.colors.textSecondary
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
                        color={ResponsiveTheme.colors.primary}
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
                        color={ResponsiveTheme.colors.primary}
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
                        color={ResponsiveTheme.colors.primary}
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
                        color={ResponsiveTheme.colors.primary}
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
                        <Text style={[styles.colHeader, { width: rw(108) }]}>
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
                        <View style={{ width: rw(26) }} />
                      </View>

                      {ingredients.map((ing, idx) => (
                        <View key={ing.id} style={styles.ingredientRow}>
                          <TextInput
                            style={[
                              styles.ingredientInput,
                              {
                                width: rw(108),
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
                              ResponsiveTheme.colors.textSecondary
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
                              ResponsiveTheme.colors.textSecondary
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
                              ResponsiveTheme.colors.textSecondary
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
                              ResponsiveTheme.colors.textSecondary
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
                              ResponsiveTheme.colors.textSecondary
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
                              ResponsiveTheme.colors.textSecondary
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
                                  ? ResponsiveTheme.colors.textSecondary
                                  : ResponsiveTheme.colors.error
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
                          { color: ResponsiveTheme.colors.errorLight },
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
                          { color: ResponsiveTheme.colors.teal },
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
                          { color: ResponsiveTheme.colors.amber },
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
                          { color: ResponsiveTheme.colors.textSecondary },
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
                        color={ResponsiveTheme.colors.textSecondary}
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
                    placeholderTextColor={ResponsiveTheme.colors.textSecondary}
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
                          ResponsiveTheme.colors.textSecondary
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
                          ResponsiveTheme.colors.textSecondary
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
                          ResponsiveTheme.colors.textSecondary
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
                          ResponsiveTheme.colors.textSecondary
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.footer}>
              <AnimatedPressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="checkmark"
                  size={rf(18)}
                  color={ResponsiveTheme.colors.white}
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
    backgroundColor: ResponsiveTheme.colors.overlayDark,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  container: {
    width: "93%",
    maxHeight: "90%",
  },
  content: {
    borderRadius: rbr(20),
    padding: rp(20),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
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
    color: ResponsiveTheme.colors.text,
  },
  closeButton: {
    padding: rp(8),
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    maxHeight: rh(500),
  },
  section: {
    marginBottom: rh(16),
  },
  label: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(6),
  },
  required: {
    color: ResponsiveTheme.colors.error,
  },
  input: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(12),
    paddingHorizontal: rp(12),
    paddingVertical: rh(11),
    fontSize: rf(15),
    color: ResponsiveTheme.colors.text,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
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
    backgroundColor: ResponsiveTheme.colors.surface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },
  typeChipActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  typeChipText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },
  typeChipTextActive: {
    color: ResponsiveTheme.colors.white,
  },
  modeToggleRow: {
    flexDirection: "row",
    gap: rw(8),
    marginBottom: rh(14),
    backgroundColor: ResponsiveTheme.colors.surface,
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
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  modeToggleText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },
  modeToggleTextActive: {
    color: ResponsiveTheme.colors.white,
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
    color: ResponsiveTheme.colors.primary,
  },
  colFixed: {
    width: rw(50),
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
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center" as const,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: rw(3),
    marginBottom: rh(6),
  },
  ingredientInput: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(8),
    paddingHorizontal: rp(6),
    paddingVertical: rh(8),
    fontSize: rf(12),
    color: ResponsiveTheme.colors.text,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    textAlign: "center" as const,
  },
  removeBtn: {
    width: rw(22),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  totalsSummary: {
    flexDirection: "row",
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
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
    color: ResponsiveTheme.colors.primary,
  },
  totalLabel: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
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
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rh(4),
  },
  macroInput: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(10),
    paddingHorizontal: rp(8),
    paddingVertical: rh(10),
    fontSize: rf(15),
    color: ResponsiveTheme.colors.text,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    textAlign: "center" as const,
  },
  scanNotice: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: rw(8),
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderRadius: rbr(12),
    paddingHorizontal: rp(12),
    paddingVertical: rh(10),
    marginBottom: rh(12),
  },
  scanNoticeText: {
    flex: 1,
    fontSize: rf(12),
    lineHeight: rf(17),
    color: ResponsiveTheme.colors.text,
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
    color: ResponsiveTheme.colors.textSecondary,
  },
  scanChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: rw(4),
    paddingVertical: rh(6),
    paddingHorizontal: rw(10),
    borderRadius: rbr(20),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}12`,
  },
  scanChipText: {
    fontSize: rf(11),
    fontWeight: "600" as const,
    color: ResponsiveTheme.colors.primary,
  },
  portionBadgeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: rw(5),
    marginBottom: rh(8),
  },
  portionBadgeText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
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
    backgroundColor: ResponsiveTheme.colors.surface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },
  multiplierBtnActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  multiplierBtnText: {
    fontSize: rf(13),
    fontWeight: "600" as const,
    color: ResponsiveTheme.colors.textSecondary,
  },
  multiplierBtnTextActive: {
    color: ResponsiveTheme.colors.white,
  },
  footer: {
    flexDirection: "row",
    gap: rw(12),
    marginTop: rh(14),
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: rw(6),
    paddingVertical: rh(13),
    borderRadius: rbr(12),
  },
  cancelButton: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },
  cancelButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  saveButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  saveButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
});

export default LogMealModal;
