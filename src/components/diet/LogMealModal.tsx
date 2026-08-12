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

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { DetentBottomSheet } from '../ui/aurora/DetentBottomSheet';
import { flatColors as colors, typography } from '../../theme/aurora-tokens';
import { MACRO_PILL_COLORS } from './macroColors';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_MEDIUM } from '../../utils/colors';
import { rf, rh, rw, rp, rbr } from '../../utils/responsive';
import { useNutritionStore } from '../../stores/nutritionStore';
import { useSavedMealsStore, type SavedMeal } from '../../stores/savedMealsStore';
import { haptics } from '../../utils/haptics';
import { parseLocalFloat } from '../../utils/units';
import { crossPlatformAlert } from '../../utils/crossPlatformAlert';
import { completionTrackingService } from '../../services/completionTracking';
import { useAuth } from '../../hooks/useAuth';
import { MealLogProvenance } from '../../types/nutritionLogging';
import { getLocalDateString } from '../../utils/weekUtils';

export interface LogMealScanResult {
  type: 'food' | 'label' | 'barcode';
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
  onRequestLabelScan?: (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void;
  onRequestBarcodeScan?: () => void;
  pendingScanResult?: LogMealScanResult | null;
  onScanResultConsumed?: () => void;
  // The date the Diet dashboard is currently viewing (via DateStepper), as an
  // ISO "YYYY-MM-DD" string. addDailyMeal / completionTrackingService.completeMeal
  // both default to "now" with no date param, so a meal logged while browsing
  // a past/future day is always attributed to TODAY regardless of this value.
  // Surfaced as an explicit warning below (rather than silently mislabeling
  // history) until completeMeal accepts an explicit date.
  selectedDate?: string;
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
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
  name: '',
  grams: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
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
  selectedDate,
}) => {
  const isLoggingToday = !selectedDate || selectedDate === getLocalDateString();
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [mode, setMode] = useState<'ingredients' | 'simple'>('ingredients');
  const [ingredients, setIngredients] = useState<Ingredient[]>([makeIngredient()]);

  // Simple mode fields
  const [simpleCalories, setSimpleCalories] = useState('');
  const [simpleProtein, setSimpleProtein] = useState('');
  const [simpleCarbs, setSimpleCarbs] = useState('');
  const [simpleFat, setSimpleFat] = useState('');
  const [simpleFiber, setSimpleFiber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanProvenance, setScanProvenance] = useState<MealLogProvenance | null>(null);
  const [scanReviewNote, setScanReviewNote] = useState<string | null>(null);
  const [scanType, setScanType] = useState<LogMealScanResult['type'] | null>(null);
  const [portionAssumptionGrams, setPortionAssumptionGrams] = useState<number | null>(null);
  const [baseDirectEntry, setBaseDirectEntry] = useState<LogMealScanResult['directEntry'] | null>(
    null
  );
  const [activeMultiplier, setActiveMultiplier] = useState<number>(1);

  // FEATURE 1: saved-meals autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Deferred autofocus: the native autoFocus fires before the slide animation
  // finishes, which can flash the keyboard mid-transition. We wait for the
  // animation to settle before focusing so the keyboard rises cleanly.
  const mealNameRef = useRef<TextInput>(null);
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => {
      mealNameRef.current?.focus();
    }, 400);
    return () => clearTimeout(id);
  }, [visible]);

  const { weeklyMealPlan, setWeeklyMealPlan, addDailyMeal } = useNutritionStore();
  const { user } = useAuth();
  const savedMealsStore = useSavedMealsStore();

  // Derived totals from ingredient mode
  const totalProtein = ingredients.reduce((s, i) => s + parseNum(i.protein), 0);
  const totalCarbs = ingredients.reduce((s, i) => s + parseNum(i.carbs), 0);
  const totalFat = ingredients.reduce((s, i) => s + parseNum(i.fat), 0);
  const totalFiber = ingredients.reduce((s, i) => s + parseNum(i.fiber), 0);
  // Approx calories: 4 cal/g protein+carbs, 9 cal/g fat
  const totalCalories = Math.round(totalProtein * 4 + totalCarbs * 4 + totalFat * 9);

  useEffect(() => {
    if (!pendingScanResult) return;

    if (pendingScanResult.mealName) setMealName(pendingScanResult.mealName);
    if (pendingScanResult.suggestedMealType) setMealType(pendingScanResult.suggestedMealType);
    setScanProvenance(pendingScanResult.provenance || null);
    setScanReviewNote(pendingScanResult.reviewNote || null);
    setScanType(pendingScanResult.type);
    setPortionAssumptionGrams(pendingScanResult.portionAssumptionGrams ?? null);
    setActiveMultiplier(1);

    if (pendingScanResult.ingredients?.length) {
      setMode('ingredients');
      setIngredients(
        pendingScanResult.ingredients.map((ing) => ({
          ...makeIngredient(),
          name: ing.name,
          grams: ing.grams,
          protein: ing.protein,
          carbs: ing.carbs,
          fat: ing.fat,
          fiber: ing.fiber,
        }))
      );
      setBaseDirectEntry(null);
    } else if (pendingScanResult.directEntry) {
      setMode('simple');
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
    setSimpleCalories(Math.round(parseNum(baseDirectEntry.calories) * m).toString());
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
    return savedMealsStore.getMealsByName(q, mealType).slice(0, 6);
  }, [mealName, mealType, savedMealsStore]);

  // Auto-fill the form from a saved meal: name, type, ingredients, totals.
  // Rebuilds ingredient rows with fresh ids so editing is independent of the
  // saved copy. The nutrition summary (totalCalories etc.) is already derived
  // reactively from `ingredients`, so it updates automatically.
  //
  // FEATURE 1: we also capture each ingredient's per-100g density from the
  // saved portion (grams + macros both known), so the user can then nudge the
  // grams field up/down and all macros rescale proportionally.
  const handleSelectSavedMeal = useCallback((meal: SavedMeal) => {
    setMealName(meal.name);
    if (meal.ingredients.length > 0) {
      setMode('ingredients');
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
        })
      );
      setBaseDirectEntry(null);
      setActiveMultiplier(1);
    }
    setShowSuggestions(false);
    haptics.light();
  }, []);

  // FEATURE 1: "Save Meal" — persist the current ingredients + totals for
  // future reuse. Requires a name and at least one ingredient with a name.
  const handleSaveMeal = useCallback(() => {
    const trimmedName = mealName.trim();
    if (!trimmedName) {
      crossPlatformAlert('Missing Name', 'Enter a meal name first to save it for reuse.');
      return;
    }
    if (mode !== 'ingredients') {
      crossPlatformAlert('Save Meal', 'Saving meals is available in the By Ingredients mode.');
      return;
    }
    const hasAnyIngredient = ingredients.some((i) => i.name.trim());
    if (!hasAnyIngredient) {
      crossPlatformAlert('No Ingredients', 'Add at least one ingredient before saving the meal.');
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
        'Meal Saved',
        `"${trimmedName}" is now available to reuse when you start typing its name in Log Meal.`
      );
    } catch (err) {
      console.error('Failed to save meal:', err);
      crossPlatformAlert('Error', 'Failed to save meal. Please try again.');
    }
  }, [mealName, mode, ingredients, mealType, savedMealsStore]);

  const resetForm = () => {
    setMealName('');
    setMealType('lunch');
    setMode('ingredients');
    setIngredients([makeIngredient()]);
    setSimpleCalories('');
    setSimpleProtein('');
    setSimpleCarbs('');
    setSimpleFat('');
    setSimpleFiber('');
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
      crossPlatformAlert('Limit Reached', 'Maximum 10 ingredients per meal.');
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
    (id: string, field: keyof Omit<Ingredient, 'id'>, value: string) => {
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

          if (field === 'grams') {
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
            field === 'protein' ||
            field === 'carbs' ||
            field === 'fat' ||
            field === 'fiber'
          ) {
            // Re-capture density from (grams, macro) so later grams edits
            // rescale proportionally. Only when grams present & > 0.
            if (gramsNum > 0) {
              const density = parseNum(value) * (100 / gramsNum);
              if (field === 'protein') next.per100gProtein = density;
              if (field === 'carbs') next.per100gCarbs = density;
              if (field === 'fat') next.per100gFat = density;
              if (field === 'fiber') next.per100gFiber = density;
            }
          }

          return next;
        })
      );
    },
    []
  );

  const handleSave = async () => {
    if (isSubmitting) return;

    const trimmedName = mealName.trim();
    if (!trimmedName) {
      crossPlatformAlert('Missing Info', 'Please enter a meal name.');
      return;
    }

    let finalProtein = 0;
    let finalCarbs = 0;
    let finalFat = 0;
    let finalCalories = 0;
    let finalFiber = 0;

    if (mode === 'ingredients') {
      const hasAnyIngredient = ingredients.some((i) => i.name.trim());
      if (!hasAnyIngredient) {
        crossPlatformAlert('No Ingredients', 'Please add at least one ingredient name.');
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
        crossPlatformAlert('Missing Info', 'Please enter a valid calorie amount.');
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
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];
    const mealId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Build items list from ingredients (ingredient mode) for display
    const items =
      mode === 'ingredients'
        ? ingredients
            .filter((i) => i.name.trim())
            .map((i, idx) => ({
              id: `item_${mealId}_${idx}`,
              name: i.name.trim(),
              quantity: parseNum(i.grams) || 1,
              unit: parseNum(i.grams) > 0 ? 'g' : 'serving',
              calories: Math.round(
                parseNum(i.protein) * 4 + parseNum(i.carbs) * 4 + parseNum(i.fat) * 9
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
              unit: 'serving',
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
      }
    );

    const newMeal = {
      id: mealId,
      type: mealType,
      name: trimmedName,
      description:
        mode === 'ingredients'
          ? `Custom meal with ${items.length} ingredient${items.length !== 1 ? 's' : ''}`
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
      difficulty: 'easy' as const,
      tags: ['manual'],
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
        planTitle: 'Manual Meals',
      };

      const stagedPlan = {
        ...currentPlan,
        meals: [...currentPlan.meals, newMeal as unknown as (typeof currentPlan.meals)[number]],
      };
      // In-memory stage only — do NOT persist the manual meal into the AI plan.
      setWeeklyMealPlan(stagedPlan);
      // Reflect in consumed totals immediately (loggedAt set above).
      addDailyMeal(newMeal as unknown as import('../../types/ai').Meal);
      // completionTrackingService handles: mealProgress update + Supabase
      // meal_logs insert (the consumption SSOT) + analytics + refresh.
      await completionTrackingService.completeMeal(
        mealId,
        {
          provenance: scanProvenance,
          reviewNote: scanReviewNote,
        },
        user?.id || undefined
      );

      haptics.success();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to log meal:', error);
      crossPlatformAlert('Error', 'Failed to log meal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetentBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={[0.95]}
      dismissOnLowestDrag={!isSubmitting}
    >
      <View style={styles.content}>
            {/* Header */}
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
              <Text style={styles.title}>Log Meal</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close log meal"
              >
                <Ionicons name="chevron-down" size={rf(20)} color={colors.text} />
              </TouchableOpacity>
            </Animated.View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {/* Manual meal logs always attribute to TODAY (addDailyMeal /
                  completionTrackingService.completeMeal have no date param).
                  Warn explicitly when the user is browsing a different day so
                  the mismatch is never silent. */}
              {!isLoggingToday && (
                <Animated.View
                  entering={FadeInDown.delay(40).duration(400)}
                  style={styles.dateWarningNotice}
                >
                  <Ionicons name="alert-circle-outline" size={rf(16)} color={colors.warning} />
                  <Text style={styles.dateWarningText}>
                    This meal will be logged for today's date, not the day you're viewing.
                  </Text>
                </Animated.View>
              )}

              {/* Meal Name */}
              {scanReviewNote && (
                <Animated.View
                  entering={FadeInDown.delay(40).duration(400)}
                  style={styles.scanNotice}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={rf(16)}
                    color={colors.primary}
                  />
                  <Text style={styles.scanNoticeText}>{scanReviewNote}</Text>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.section}>
                <Text style={styles.label}>Meal Name</Text>
                <View style={styles.inputRow}>
                  <Ionicons
                    name="restaurant-outline"
                    size={rf(16)}
                    color={colors.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={mealNameRef}
                    style={styles.inputField}
                    value={mealName}
                    onChangeText={(v) => {
                      setMealName(v);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                    placeholder="e.g. Dal Rice, Chicken Salad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

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
                          (MEAL_ICONS as Record<string, string>)[m.mealType] ||
                          'restaurant-outline';
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={styles.suggestionItem}
                            onPress={() => handleSelectSavedMeal(m)}
                            accessibilityRole="button"
                            accessibilityLabel={`Reuse saved meal ${m.name}`}
                          >
                            <View style={styles.suggestionIconDisc}>
                              <Ionicons
                                name={mealIcon as keyof typeof Ionicons.glyphMap}
                                size={rf(14)}
                                color={colors.primary}
                              />
                            </View>
                            <View style={styles.suggestionTextWrap}>
                              <Text style={styles.suggestionName} numberOfLines={1}>
                                {m.name}
                              </Text>
                              <Text style={styles.suggestionMeta} numberOfLines={1}>
                                {m.ingredients.length} ingredient
                                {m.ingredients.length !== 1 ? 's' : ''} · {m.totalCalories} cal ·{' '}
                                {m.totalProtein.toFixed(1)}g protein
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
              </Animated.View>

              {/* Meal Type */}
              <Animated.View entering={FadeInDown.delay(140).duration(400)} style={styles.section}>
                <Text style={styles.label}>Meal Type</Text>
                <View style={styles.typeSelector}>
                  {MEAL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeChip, mealType === type && styles.typeChipActive]}
                      onPress={() => {
                        setMealType(type);
                        haptics.light();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={type.charAt(0).toUpperCase() + type.slice(1)}
                      accessibilityState={{ selected: mealType === type }}
                    >
                      <Ionicons
                        name={MEAL_ICONS[type] as keyof typeof Ionicons.glyphMap}
                        size={rf(14)}
                        color={mealType === type ? colors.white : colors.textSecondary}
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
              </Animated.View>

              {/* Mode Toggle */}
              <Animated.View
                entering={FadeInDown.delay(200).duration(400)}
                style={styles.modeToggleRow}
              >
                <TouchableOpacity
                  style={[
                    styles.modeToggleBtn,
                    mode === 'ingredients' && styles.modeToggleBtnActive,
                  ]}
                  onPress={() => setMode('ingredients')}
                  accessibilityRole="button"
                  accessibilityLabel="Ingredients mode"
                  accessibilityState={{ selected: mode === 'ingredients' }}
                >
                  <Ionicons
                    name="list-outline"
                    size={rf(14)}
                    color={mode === 'ingredients' ? colors.white : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modeToggleText,
                      mode === 'ingredients' && styles.modeToggleTextActive,
                    ]}
                  >
                    By Ingredients
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeToggleBtn, mode === 'simple' && styles.modeToggleBtnActive]}
                  onPress={() => setMode('simple')}
                  accessibilityRole="button"
                  accessibilityLabel="Simple mode"
                  accessibilityState={{ selected: mode === 'simple' }}
                >
                  <Ionicons
                    name="calculator-outline"
                    size={rf(14)}
                    color={mode === 'simple' ? colors.white : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modeToggleText,
                      mode === 'simple' && styles.modeToggleTextActive,
                    ]}
                  >
                    Direct Entry
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Scan auto-fill row */}
              {(onRequestFoodScan || onRequestLabelScan || onRequestBarcodeScan) && (
                <Animated.View
                  entering={FadeInDown.delay(260).duration(400)}
                  style={styles.scanRow}
                >
                  <Text style={styles.scanRowLabel}>Scan</Text>
                  {onRequestFoodScan && (
                    <TouchableOpacity
                      style={[
                        styles.scanChip,
                        {
                          borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
                          backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
                        },
                      ]}
                      onPress={onRequestFoodScan}
                    >
                      <View
                        style={[
                          styles.scanChipIconDisc,
                          {
                            backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
                          },
                        ]}
                      >
                        <Ionicons name="camera-outline" size={rf(13)} color={colors.primary} />
                      </View>
                      <Text style={[styles.scanChipText, { color: colors.primary }]}>
                        Scan Dish
                      </Text>
                    </TouchableOpacity>
                  )}
                  {onRequestLabelScan && (
                    <TouchableOpacity
                      style={[
                        styles.scanChip,
                        {
                          borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
                          backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
                        },
                      ]}
                      onPress={() => onRequestLabelScan(mealType)}
                    >
                      <View
                        style={[
                          styles.scanChipIconDisc,
                          {
                            backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
                          },
                        ]}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={rf(13)}
                          color={colors.primary}
                        />
                      </View>
                      <Text style={[styles.scanChipText, { color: colors.primary }]}>Label</Text>
                    </TouchableOpacity>
                  )}
                  {onRequestBarcodeScan && (
                    <TouchableOpacity
                      style={[
                        styles.scanChip,
                        {
                          borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
                          backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
                        },
                      ]}
                      onPress={onRequestBarcodeScan}
                    >
                      <View
                        style={[
                          styles.scanChipIconDisc,
                          {
                            backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
                          },
                        ]}
                      >
                        <Ionicons name="barcode-outline" size={rf(13)} color={colors.primary} />
                      </View>
                      <Text style={[styles.scanChipText, { color: colors.primary }]}>Barcode</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}

              {/* INGREDIENT MODE */}
              {mode === 'ingredients' && (
                <Animated.View
                  entering={FadeInDown.delay(320).duration(400)}
                  style={styles.section}
                >
                  <View style={styles.ingredientsHeader}>
                    <Text style={styles.label}>Ingredients</Text>
                    <TouchableOpacity
                      onPress={addIngredient}
                      style={styles.addIngredientBtn}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                      accessibilityLabel="Add ingredient"
                    >
                      <Ionicons name="add-circle" size={rf(20)} color={colors.primary} />
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
                        <Text style={[styles.colHeader, { width: rw(72) }]}>Ingredient</Text>
                        <Text style={[styles.colHeader, styles.colFixed]}>g</Text>
                        <Text style={[styles.colHeader, styles.colFixed]}>Pro</Text>
                        <Text style={[styles.colHeader, styles.colFixed]}>Carb</Text>
                        <Text style={[styles.colHeader, styles.colFixed]}>Fat</Text>
                        <Text style={[styles.colHeader, styles.colFixed]}>Fiber</Text>
                        <View style={{ width: rw(22) }} />
                      </View>

                      {ingredients.map((ing, idx) => (
                        <View key={ing.id} style={styles.ingredientRow}>
                          <TextInput
                            style={[
                              styles.ingredientInput,
                              {
                                width: rw(72),
                                textAlign: 'left' as const,
                                paddingHorizontal: rp(8),
                              },
                            ]}
                            value={ing.name}
                            onChangeText={(v) => updateIngredient(ing.id, 'name', v)}
                            placeholder={`Item ${idx + 1}`}
                            placeholderTextColor={colors.textSecondary}
                          />
                          <TextInput
                            style={[styles.ingredientInput, styles.colFixed]}
                            value={ing.grams}
                            onChangeText={(v) => updateIngredient(ing.id, 'grams', v)}
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={[styles.ingredientInput, styles.colFixed]}
                            value={ing.protein}
                            onChangeText={(v) => updateIngredient(ing.id, 'protein', v)}
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={[styles.ingredientInput, styles.colFixed]}
                            value={ing.carbs}
                            onChangeText={(v) => updateIngredient(ing.id, 'carbs', v)}
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={[styles.ingredientInput, styles.colFixed]}
                            value={ing.fat}
                            onChangeText={(v) => updateIngredient(ing.id, 'fat', v)}
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={[styles.ingredientInput, styles.colFixed]}
                            value={ing.fiber}
                            onChangeText={(v) => updateIngredient(ing.id, 'fiber', v)}
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                          />
                          <TouchableOpacity
                            onPress={() => removeIngredient(ing.id)}
                            style={styles.removeBtn}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            disabled={ingredients.length === 1}
                          >
                            <Ionicons
                              name="remove-circle-outline"
                              size={rf(18)}
                              color={ingredients.length === 1 ? colors.textSecondary : colors.error}
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
                      <Text style={[styles.totalValue, { color: MACRO_PILL_COLORS.protein }]}>
                        {totalProtein.toFixed(1)}g
                      </Text>
                      <Text style={styles.totalLabel}>protein</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Text style={[styles.totalValue, { color: MACRO_PILL_COLORS.carbs }]}>
                        {totalCarbs.toFixed(1)}g
                      </Text>
                      <Text style={styles.totalLabel}>carbs</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Text style={[styles.totalValue, { color: MACRO_PILL_COLORS.fat }]}>
                        {totalFat.toFixed(1)}g
                      </Text>
                      <Text style={styles.totalLabel}>fat</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Text style={[styles.totalValue, { color: MACRO_PILL_COLORS.fiber }]}>
                        {totalFiber.toFixed(1)}g
                      </Text>
                      <Text style={styles.totalLabel}>fiber</Text>
                    </View>
                  </View>
                </Animated.View>
              )}

              {/* SIMPLE MODE */}
              {mode === 'simple' && (
                <Animated.View
                  entering={FadeInDown.delay(320).duration(400)}
                  style={styles.section}
                >
                  {scanType === 'food' && portionAssumptionGrams != null && (
                    <View style={styles.portionBadgeRow}>
                      <Ionicons name="scale-outline" size={rf(13)} color={colors.textSecondary} />
                      <Text style={styles.portionBadgeText}>
                        Assuming {portionAssumptionGrams}g serving
                      </Text>
                    </View>
                  )}
                  {scanType === 'food' && baseDirectEntry != null && (
                    <View style={styles.multiplierRow}>
                      {([0.5, 1, 1.5, 2] as const).map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.multiplierBtn,
                            activeMultiplier === m && styles.multiplierBtnActive,
                          ]}
                          onPress={() => applyMultiplier(m)}
                        >
                          <Text
                            style={[
                              styles.multiplierBtnText,
                              activeMultiplier === m && styles.multiplierBtnTextActive,
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
                  <Text style={[styles.label, { marginTop: rh(12) }]}>Macros (optional)</Text>
                  <View style={styles.macroRow}>
                    <View style={styles.macroField}>
                      <Text style={styles.macroLabel}>Protein (g)</Text>
                      <TextInput
                        style={styles.macroInput}
                        value={simpleProtein}
                        onChangeText={setSimpleProtein}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
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
                        placeholderTextColor={colors.textSecondary}
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
                        placeholderTextColor={colors.textSecondary}
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
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </Animated.View>
              )}
            </ScrollView>

            {/* Save-this-meal-for-reuse link — sits above the footer so the
                primary Log Meal CTA can own the full-width top row. */}
            <TouchableOpacity
              style={styles.saveMealLink}
              onPress={handleSaveMeal}
              accessibilityRole="button"
              accessibilityLabel="Save this meal for reuse"
            >
              <Ionicons name="add-circle-outline" size={rf(15)} color={colors.primary} />
              <Text style={styles.saveMealLinkText}>+ Save this meal for reuse</Text>
            </TouchableOpacity>

            {/* Action Buttons — pinned below the ScrollView so they are always
                visible regardless of content/keyboard height (BUG 2 fix).
                Layout: Log Meal (full-width primary) on top, Cancel (auto-width
                secondary outline) below — avoids the 3-flex:1 cram that
                shrank every button to an unreadable sliver. */}
            <Animated.View entering={FadeInDown.delay(380).duration(400)} style={styles.footer}>
              <AnimatedPressable
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                <Ionicons name="checkmark" size={rf(18)} color={colors.white} />
                <Text style={styles.saveButtonText}>
                  {isSubmitting ? 'Logging...' : 'Log Meal'}
                </Text>
              </AnimatedPressable>
              <AnimatedPressable style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </AnimatedPressable>
            </Animated.View>
          </View>
    </DetentBottomSheet>
  );
};

const styles = StyleSheet.create({
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
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'column' as const,
    maxHeight: '100%' as const,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: rh(16),
  },
  title: {
    fontSize: rf(20),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
  },
  closeButton: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
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
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.textSecondary,
    marginBottom: rh(8),
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
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
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: rp(12),
  },
  inputIcon: {
    marginRight: rw(8),
  },
  inputField: {
    flex: 1,
    paddingVertical: rh(11),
    fontSize: rf(15),
    color: colors.text,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: rw(8),
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: rw(3),
    paddingVertical: rh(12),
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
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: colors.white,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: rw(8),
    marginBottom: rh(14),
    backgroundColor: colors.surface,
    borderRadius: rbr(12),
    padding: rp(4),
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: rw(5),
    paddingVertical: rh(8),
    borderRadius: rbr(10),
  },
  modeToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  modeToggleText: {
    fontSize: rf(12),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.textSecondary,
  },
  modeToggleTextActive: {
    color: colors.white,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: rh(6),
  },
  addIngredientBtn: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: rw(4),
  },
  addIngredientText: {
    fontSize: rf(13),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.primary,
  },
  colFixed: {
    width: rw(52),
  },
  ingredientColumnHeaders: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    marginBottom: rh(4),
    gap: rw(6),
  },
  colHeader: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: rw(6),
    marginBottom: rh(6),
  },
  ingredientInput: {
    backgroundColor: colors.surface,
    borderRadius: rbr(8),
    paddingHorizontal: rp(6),
    paddingVertical: rh(8),
    fontSize: rf(13),
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center' as const,
  },
  removeBtn: {
    width: rw(22),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  totalsSummary: {
    flexDirection: 'row',
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
    paddingVertical: rh(10),
    paddingHorizontal: rp(8),
    marginTop: rh(8),
    justifyContent: 'space-around' as const,
  },
  totalItem: {
    alignItems: 'center' as const,
  },
  totalValue: {
    fontSize: rf(15),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    fontSize: rf(11),
    color: colors.textSecondary,
    marginTop: rh(2),
  },
  macroRow: {
    flexDirection: 'row',
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
    textAlign: 'center' as const,
  },
  dateWarningNotice: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: rw(8),
    backgroundColor: hexToRgba(colors.warning, TINT_ALPHA_LOW),
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: hexToRgba(colors.warning, TINT_ALPHA_MEDIUM),
    paddingHorizontal: rp(12),
    paddingVertical: rh(10),
    marginBottom: rh(12),
  },
  dateWarningText: {
    flex: 1,
    fontSize: rf(12),
    lineHeight: rf(17),
    color: colors.text,
  },
  scanNotice: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: rw(8),
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: rw(8),
    marginBottom: rh(12),
    flexWrap: 'wrap' as const,
  },
  scanRowLabel: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  scanChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: rw(6),
    paddingVertical: rh(10),
    paddingRight: rw(12),
    paddingLeft: rw(5),
    borderRadius: rbr(20),
    borderWidth: 1,
  },
  scanChipIconDisc: {
    width: rw(24),
    height: rw(24),
    borderRadius: rw(12),
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  scanChipText: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  portionBadgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: rw(5),
    marginBottom: rh(8),
  },
  portionBadgeText: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
  multiplierRow: {
    flexDirection: 'row' as const,
    gap: rw(8),
    marginBottom: rh(14),
  },
  multiplierBtn: {
    flex: 1,
    alignItems: 'center' as const,
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
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.textSecondary,
  },
  multiplierBtnTextActive: {
    color: colors.white,
  },
  footer: {
    flexDirection: 'column',
    gap: rh(8),
    marginTop: rh(14),
  },
  button: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: rw(5),
    paddingVertical: rh(13),
    borderRadius: rbr(12),
  },
  cancelButton: {
    alignSelf: 'center' as const,
    paddingVertical: rh(10),
    paddingHorizontal: rw(28),
    borderRadius: rbr(12),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cancelButtonText: {
    fontSize: rf(14),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text,
  },
  // Save-for-reuse link — a lightweight text+icon row above the primary CTA,
  // promoted out of the footer so the primary "Log Meal" can breathe full-width.
  saveMealLink: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: rw(6),
    paddingVertical: rh(8),
    marginTop: rh(4),
    minHeight: 44, // 44pt touch-target minimum (icon+text alone were ~32px)
  },
  saveMealLinkText: {
    fontSize: rf(13),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: rf(14),
    fontWeight: String(typography.fontWeight.semibold) as any,
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
    overflow: 'hidden',
  },
  suggestionsScroll: {
    flexGrow: 0,
  },
  suggestionItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: rw(10),
    paddingHorizontal: rp(12),
    paddingVertical: rh(11),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionIconDisc: {
    width: rw(30),
    height: rw(30),
    borderRadius: rw(15),
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionName: {
    fontSize: rf(14),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text,
  },
  suggestionMeta: {
    fontSize: rf(11),
    color: colors.textSecondary,
    marginTop: rh(1),
  },
});

export default LogMealModal;
