/**
 * MealBuilderScreen — Screen 2, the main Meal Builder.
 *
 * AuroraBackground theme="space"
 *   GlassHeader eyebrow="MEAL BUILDER"
 *   ScrollView
 *     H1 "Weekly meals" + subtitle
 *     Day strip (7 pills — adherence-colored dot)
 *     MacroValidationBanner
 *     DayMealBlock x 7 (only one expanded at a time)
 *     NutritionInsightsPanel
 *     footer spacer
 *   BuilderSummaryFooter (sticky)
 *   Sheets: FoodPickerSheet, discard-confirm dialog
 *
 * On mount: restore an autosaved draft if one exists, else hydrate from the
 * active custom plan (a direct re-open of the builder, not arriving from the
 * method-landing screen — that screen already seeds the draft before
 * navigating here).
 *
 * Validation: recomputed whenever the draft or the selected day changes,
 * via mealBuilderValidation.validateMealBuilderDay (wrapping the
 * already-built customDietProjection engine). The richer DietValidationWarning
 * shape is kept in local state for MacroValidationBanner; a mapped
 * ValidationResult[] is also pushed to dietBuilderStore.setValidationWarnings
 * to keep that field's "held here" contract intact (see MacroValidationBanner's
 * doc comment for why the mapping is needed).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AuroraBackground, AuroraSpinner } from "../../components/ui/aurora";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { GlassHeader } from "../../components/ui/aurora/GlassHeader";
import { CustomDialog } from "../../components/ui/CustomDialog";
import { DayMealBlock } from "../../components/diet/builder/DayMealBlock";
import { MacroValidationBanner } from "../../components/diet/builder/MacroValidationBanner";
import { NutritionInsightsPanel } from "../../components/diet/builder/NutritionInsightsPanel";
import { BuilderSummaryFooter } from "../../components/diet/builder/BuilderSummaryFooter";
import { SaveAndActivateSheet } from "../../components/shared/SaveAndActivateSheet";
import { useNutritionStore } from "../../stores/nutritionStore";
import { FoodPickerSheet } from "../../components/diet/FoodPickerSheet";
import {
  useDietBuilderStore,
  WEEKDAYS,
  getDayAdherence,
  type MealSlotType,
  type DayAdherence,
} from "../../stores/dietBuilderStore";
import { useProfileStore } from "../../stores/profileStore";
import { useSavedMealsStore } from "../../stores/savedMealsStore";
import { useCalculatedMetrics } from "../../hooks/useCalculatedMetrics";
import { calculateMealSchedule } from "../../utils/mealSchedule";
import {
  validateMealBuilderDay,
  type DietValidationWarning,
} from "../../services/mealBuilderValidation";
import type { CustomDietProjectionInput } from "../../services/validation/customDietProjection";
import type { ValidationResult } from "../../services/validation/types";
import { convertToGrams } from "../../services/foodUnitConversions";
import { haptics } from "../../utils/haptics";
import { hexToRgba } from "../../utils/colors";
import {
  flatColors as colors,
  spacing,
  borderRadius,
} from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf, rw, rp } from "../../utils/responsive";
import type { MealItem } from "../../types/ai";

interface MealBuilderScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

const DAY_INITIALS: Record<string, string> = {
  sunday: "S", monday: "M", tuesday: "T", wednesday: "W", thursday: "T", friday: "F", saturday: "S",
};
const DAY_SHORT: Record<string, string> = {
  sunday: "SUN", monday: "MON", tuesday: "TUE", wednesday: "WED", thursday: "THU", friday: "FRI", saturday: "SAT",
};

const ADHERENCE_DOT_COLOR: Record<DayAdherence, string> = {
  on: colors.success,
  under: colors.warningAlt,
  over: colors.error,
  empty: colors.textTertiary,
};

function toValidationResult(w: DietValidationWarning): ValidationResult {
  return {
    status: w.severity === "error" ? "BLOCKED" : w.severity === "warning" ? "WARNING" : "OK",
    code: w.code,
    message: w.message,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export default function MealBuilderScreen({ navigation }: MealBuilderScreenProps) {
  const draft = useDietBuilderStore((s) => s.draft);
  const draftDirty = useDietBuilderStore((s) => s.draftDirty);
  const selectedDayIndex = useDietBuilderStore((s) => s.selectedDayIndex);
  const expandedDayIndex = useDietBuilderStore((s) => s.expandedDayIndex);
  const expandedSlotType = useDietBuilderStore((s) => s.expandedSlotType);
  const projection = useDietBuilderStore((s) => s.projection);
  const isComputingProjection = useDietBuilderStore((s) => s.isComputingProjection);
  const isRestoringDraft = useDietBuilderStore((s) => s.isRestoringDraft);

  const hydrateFromCustomPlan = useDietBuilderStore((s) => s.hydrateFromCustomPlan);
  const restoreDraftIfExists = useDietBuilderStore((s) => s.restoreDraftIfExists);
  const setSelectedDay = useDietBuilderStore((s) => s.setSelectedDay);
  const setExpandedDay = useDietBuilderStore((s) => s.setExpandedDay);
  const setExpandedSlot = useDietBuilderStore((s) => s.setExpandedSlot);
  const openPicker = useDietBuilderStore((s) => s.openPicker);
  const setValidationWarnings = useDietBuilderStore((s) => s.setValidationWarnings);
  const setProjection = useDietBuilderStore((s) => s.setProjection);
  const setIsComputingProjection = useDietBuilderStore((s) => s.setIsComputingProjection);
  const updateFoodItem = useDietBuilderStore((s) => s.updateFoodItem);
  const duplicateFoodItem = useDietBuilderStore((s) => s.duplicateFoodItem);
  const removeFoodItem = useDietBuilderStore((s) => s.removeFoodItem);
  const reorderFoodItem = useDietBuilderStore((s) => s.reorderFoodItem);
  const copyDayToWeekdays = useDietBuilderStore((s) => s.copyDayToWeekdays);
  const clearDay = useDietBuilderStore((s) => s.clearDay);
  const save = useDietBuilderStore((s) => s.save);
  const saveAndActivate = useDietBuilderStore((s) => s.saveAndActivate);
  const discard = useDietBuilderStore((s) => s.discard);

  // ── Save & Activate sheet state (Phase B) ──
  // The shared targets_mode toggle lives on nutritionStore (one shared field
  // for BOTH diet and workout, persisted via profiles.goal_targets_mode).
  const goalTargetsMode = useNutritionStore((s) => s.goalTargetsMode);
  const setGoalTargetsMode = useNutritionStore((s) => s.setGoalTargetsMode);
  const [activateSheetVisible, setActivateSheetVisible] = useState(false);
  const [pendingTargetsMode, setPendingTargetsMode] = useState<"goal" | "plan">(
    goalTargetsMode,
  );
  const [activating, setActivating] = useState(false);
  // BUG FIX (found via live testing): footerSpacer below used a fixed height
  // (rp(200)) to keep the last scrollable row from being hidden behind the
  // sticky BuilderSummaryFooter — but the footer's real height is variable
  // (Planned-kcal progress bar, stat row, insets.bottom safe-area padding),
  // so a fixed spacer under/over-compensates depending on viewport and
  // content. A hit-test (document.elementsFromPoint) at the last day row's
  // screen position showed the footer's own DOM node sitting on top of it —
  // the same class of bug already fixed the same way in
  // WeeklyBuilderScreen.tsx. Measure the footer's ACTUAL rendered height
  // instead of guessing a constant. Starts at the previous hardcoded value
  // so there's no visible gap-then-overlap flash before the first onLayout.
  const [footerHeight, setFooterHeight] = useState(rp(200));

  const personalInfo = useProfileStore((s) => s.personalInfo);
  const dietPreferences = useProfileStore((s) => s.dietPreferences);
  const saveMeal = useSavedMealsStore((s) => s.saveMeal);

  const { metrics } = useCalculatedMetrics();

  // ── Mount: restore autosaved draft, else hydrate from the active custom
  //    plan (a direct re-open, not arriving from method-landing which
  //    already seeds the draft). ──
  const [bootstrapping, setBootstrapping] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (useDietBuilderStore.getState().draft) {
        setBootstrapping(false);
        return;
      }
      try {
        const restored = await restoreDraftIfExists();
        if (!restored) hydrateFromCustomPlan();
      } catch (error) {
        console.error("[MealBuilderScreen] bootstrap hydrate failed:", error);
        hydrateFromCustomPlan();
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schedule = useMemo(
    () => calculateMealSchedule(personalInfo?.wake_time, personalInfo?.sleep_time),
    [personalInfo?.wake_time, personalInfo?.sleep_time],
  );

  const enabledSlots: MealSlotType[] = useMemo(() => {
    if (!dietPreferences) return ["breakfast", "lunch", "dinner", "snack"];
    const slots: MealSlotType[] = [];
    if (dietPreferences.breakfast_enabled) slots.push("breakfast");
    if (dietPreferences.lunch_enabled) slots.push("lunch");
    if (dietPreferences.dinner_enabled) slots.push("dinner");
    if (dietPreferences.snacks_enabled) slots.push("snack");
    return slots.length > 0 ? slots : ["breakfast", "lunch", "dinner", "snack"];
  }, [dietPreferences]);

  const targetCalories = metrics?.dailyCalories ?? null;

  // ── Per-day totals (for the day strip adherence dot + validation) ──
  const dayTotals = useMemo(() => {
    const totals = new Map<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number }>();
    for (const day of WEEKDAYS) totals.set(day, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    if (draft) {
      for (const meal of draft.meals) {
        const entry = totals.get(meal.dayOfWeek);
        if (!entry) continue;
        entry.calories += meal.totalCalories || 0;
        entry.protein += meal.totalMacros?.protein || 0;
        entry.carbs += meal.totalMacros?.carbohydrates || 0;
        entry.fat += meal.totalMacros?.fat || 0;
        entry.fiber += meal.totalMacros?.fiber || 0;
      }
    }
    return totals;
  }, [draft]);

  const selectedDayOfWeek = WEEKDAYS[selectedDayIndex];
  const selectedDayTotals = dayTotals.get(selectedDayOfWeek) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const selectedDayMealCount = draft
    ? draft.meals.filter((m) => m.dayOfWeek === selectedDayOfWeek && m.items.length > 0).length
    : 0;
  const hasAnyContent = draft ? draft.meals.some((m) => m.items.length > 0) : false;

  // ── Validation + projection — recomputed on draft/selected-day/profile change ──
  const [localWarnings, setLocalWarnings] = useState<DietValidationWarning[]>([]);
  const [hasValidationRun, setHasValidationRun] = useState(false);

  const validationKey = useMemo(() => {
    const entry = dayTotals.get(selectedDayOfWeek);
    return entry ? JSON.stringify(entry) : null;
  }, [dayTotals, selectedDayOfWeek]);

  useEffect(() => {
    if (!draft || !metrics) {
      setLocalWarnings([]);
      setHasValidationRun(false);
      return;
    }
    const { currentWeightKg, heightCm, age, gender, activityLevel, targetWeightKg, primaryGoals } = metrics;
    if (currentWeightKg == null || heightCm == null || age == null || !gender || !activityLevel || targetWeightKg == null) {
      setLocalWarnings([]);
      setHasValidationRun(false);
      return;
    }
    const totals = selectedDayTotals;
    const input: CustomDietProjectionInput = {
      currentWeightKg,
      heightCm,
      age,
      gender,
      activityLevel,
      targetWeightKg,
      primaryGoals: primaryGoals ?? [],
      customDailyCalories: totals.calories,
      customDailyMacros: { protein: totals.protein, carbs: totals.carbs, fat: totals.fat, fiber: totals.fiber },
    };
    setIsComputingProjection(true);
    try {
      const result = validateMealBuilderDay(input);
      setLocalWarnings(result.warnings);
      setHasValidationRun(true);
      setValidationWarnings(result.warnings.map(toValidationResult));
      setProjection(result.projection);
    } catch (error) {
      console.error("[MealBuilderScreen] validation failed:", error);
      setLocalWarnings([]);
      setHasValidationRun(false);
    } finally {
      setIsComputingProjection(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, validationKey, metrics]);

  // ── Discard / back handling ──
  const [discardDialogVisible, setDiscardDialogVisible] = useState(false);

  const handleBack = useCallback(() => {
    if (draftDirty) {
      setDiscardDialogVisible(true);
      return;
    }
    discard();
    navigation.goBack();
  }, [draftDirty, discard, navigation]);

  const handleConfirmDiscard = useCallback(() => {
    setDiscardDialogVisible(false);
    discard();
    navigation.goBack();
  }, [discard, navigation]);

  // ── Day strip ──
  const handleDaySelect = useCallback(
    (idx: number) => {
      setSelectedDay(idx);
      setExpandedDay(idx);
      haptics.tabSwitch();
    },
    [setSelectedDay, setExpandedDay],
  );

  const toggleExpandDay = useCallback(
    (idx: number) => {
      setExpandedDay(expandedDayIndex === idx ? null : idx);
    },
    [expandedDayIndex, setExpandedDay],
  );

  // ── Meal-slot / food-item callbacks (shared across all 7 DayMealBlocks) ──
  const handleAddFood = useCallback(
    (dayOfWeek: string, mealType: MealSlotType, mealId: string | undefined) => {
      openPicker({ dayOfWeek, mealType, mealId, mode: "add" });
    },
    [openPicker],
  );

  const handleUpdateItem = useCallback(
    (mealId: string, itemIndex: number, item: MealItem) => {
      updateFoodItem(mealId, itemIndex, item);
    },
    [updateFoodItem],
  );

  const handleDuplicateItem = useCallback(
    (mealId: string, itemIndex: number) => duplicateFoodItem(mealId, itemIndex),
    [duplicateFoodItem],
  );

  const handleRemoveItem = useCallback(
    (mealId: string, itemIndex: number) => removeFoodItem(mealId, itemIndex),
    [removeFoodItem],
  );

  const handleReplaceItem = useCallback(
    (mealId: string, itemIndex: number) => {
      const meal = draft?.meals.find((m) => m.id === mealId);
      if (!meal) return;
      openPicker({
        dayOfWeek: meal.dayOfWeek,
        mealType: meal.type as MealSlotType,
        mealId,
        mode: "replace",
        replaceItemIndex: itemIndex,
      });
    },
    [draft, openPicker],
  );

  const handleReorderItem = useCallback(
    (mealId: string, from: number, to: number) => reorderFoodItem(mealId, from, to),
    [reorderFoodItem],
  );

  const handleSaveMealAsTemplate = useCallback(
    (mealId: string) => {
      const meal = draft?.meals.find((m) => m.id === mealId);
      if (!meal) return;
      try {
        saveMeal({
          name: meal.name || "Custom meal",
          mealType: meal.type,
          ingredients: meal.items.map((item) => {
            const name = item.name || item.food?.name || "Food";
            const quantity = typeof item.quantity === "number" ? item.quantity : parseFloat(String(item.quantity)) || 0;
            const unit = (item.unit as any) || "g";
            const grams = Math.round(convertToGrams(quantity, unit, name));
            return {
              name,
              grams: String(grams),
              protein: String(round1(item.macros.protein)),
              carbs: String(round1(item.macros.carbohydrates)),
              fat: String(round1(item.macros.fat)),
              fiber: String(round1(item.macros.fiber ?? 0)),
            };
          }),
        });
        haptics.success();
      } catch (error) {
        console.error("[MealBuilderScreen] save meal as template failed:", error);
        haptics.error();
      }
    },
    [draft, saveMeal],
  );

  const handleFixAction = useCallback(
    (warning: DietValidationWarning) => {
      openPicker({
        dayOfWeek: selectedDayOfWeek,
        mealType: expandedSlotType ?? "snack",
        mode: "add",
      });
    },
    [openPicker, selectedDayOfWeek, expandedSlotType],
  );

  const handleSave = useCallback(async () => {
    await save();
  }, [save]);

  // ── Save & Activate (Phase B) ──
  // The footer's "Save & Activate" now opens the shared sheet (targets_mode
  // toggle + food-floor gate) BEFORE activation completes. On confirm we save,
  // flip the active diet source to custom, and persist the chosen
  // goal_targets_mode (one shared toggle for BOTH diet and workout).
  const handleSaveAndActivate = useCallback(async () => {
    setPendingTargetsMode(goalTargetsMode);
    setActivateSheetVisible(true);
  }, [goalTargetsMode]);

  const handleConfirmActivate = useCallback(async () => {
    setActivating(true);
    try {
      setGoalTargetsMode(pendingTargetsMode);
      await saveAndActivate();
      setActivateSheetVisible(false);
    } catch (error) {
      console.error("[MealBuilderScreen] save & activate failed:", error);
    } finally {
      setActivating(false);
    }
  }, [pendingTargetsMode, setGoalTargetsMode, saveAndActivate]);

  const handleCancelActivate = useCallback(() => {
    setActivateSheetVisible(false);
  }, []);

  const targets = {
    calories: targetCalories ?? 0,
    protein: metrics?.dailyProteinG ?? 0,
    carbs: metrics?.dailyCarbsG ?? 0,
    fat: metrics?.dailyFatG ?? 0,
    fiber: metrics?.dailyFiberG ?? 0,
  };

  // ── Food-floor gate data (Phase B Save & Activate sheet) ──
  // The projection already computes the clinical floor (validateAbsoluteMinimum
  // + validateBMRSafety → blockers). Below-floor plans save as drafts but
  // cannot be activated until the shortfall is closed (add food / add burn).
  const foodFloorBlocked = (projection?.blockers.length ?? 0) > 0;
  const foodFloorShortfall = projection?.foodFloorShortfall ?? 0;
  const foodFloorKcal = projection?.foodFloorKcal ?? null;

  if (bootstrapping || isRestoringDraft || !draft) {
    return (
      <AuroraBackground theme="space" animated intensity={0.3}>
        <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
          <GlassHeader eyebrow="MEAL BUILDER" onBack={handleBack} backAccessibilityLabel="Go back" />
          <View style={styles.centered}>
            <AuroraSpinner size="lg" />
            <Text style={styles.loadingText}>Loading your meal plan…</Text>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space" animated intensity={0.3}>
      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
        <GlassHeader eyebrow="MEAL BUILDER" onBack={handleBack} backAccessibilityLabel="Go back (discard or keep changes)" />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.delay(60).duration(450)}>
            <Text style={styles.title}>Weekly meals</Text>
            <Text style={styles.subtitle}>Tap a day to edit. Long-press a food to reorder.</Text>
          </Animated.View>

          <View style={styles.dayStrip}>
            {WEEKDAYS.map((day, idx) => {
              const selected = selectedDayIndex === idx;
              const entry = dayTotals.get(day);
              const adherence = getDayAdherence(entry?.calories ?? 0, targetCalories);
              const dotColor = ADHERENCE_DOT_COLOR[adherence];
              return (
                <AnimatedPressable
                  key={day}
                  onPress={() => handleDaySelect(idx)}
                  scaleValue={0.95}
                  springConfig="smooth"
                  hapticType="light"
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${day}`}
                  accessibilityState={{ selected }}
                  style={styles.dayStripItem}
                >
                  <View style={[styles.dayDisc, selected ? styles.dayDiscSelected : styles.dayDiscDefault]}>
                    <Text style={[styles.dayDiscText, selected ? styles.dayDiscTextSelected : styles.dayDiscTextDefault]}>
                      {DAY_INITIALS[day]}
                    </Text>
                  </View>
                  <Text style={[styles.dayShort, selected && styles.dayShortSelected]}>{DAY_SHORT[day]}</Text>
                  <View style={[styles.dayDot, { backgroundColor: dotColor }]} />
                </AnimatedPressable>
              );
            })}
          </View>

          <MacroValidationBanner
            warnings={localWarnings}
            hasValidationRun={hasValidationRun}
            onFixAction={handleFixAction}
          />

          {WEEKDAYS.map((day, idx) => (
            <DayMealBlock
              key={day}
              dayIndex={idx}
              dayOfWeek={day}
              meals={draft.meals.filter((m) => m.dayOfWeek === day)}
              enabledSlots={enabledSlots}
              targetCalories={targetCalories}
              schedule={schedule}
              isExpanded={expandedDayIndex === idx}
              onToggleExpand={toggleExpandDay}
              expandedSlotType={expandedDayIndex === idx ? expandedSlotType : null}
              onToggleSlot={(slot) => setExpandedSlot(expandedSlotType === slot ? null : slot)}
              onAddFood={handleAddFood}
              onUpdateItem={handleUpdateItem}
              onDuplicateItem={handleDuplicateItem}
              onRemoveItem={handleRemoveItem}
              onReplaceItem={handleReplaceItem}
              onReorderItem={handleReorderItem}
              onSaveMealAsTemplate={handleSaveMealAsTemplate}
              onCopyDayToWeekdays={copyDayToWeekdays}
              onClearDay={clearDay}
              testID={`day-meal-block-${idx}`}
            />
          ))}

          <NutritionInsightsPanel
            projection={projection}
            isComputingProjection={isComputingProjection}
            selectedDayTotals={selectedDayTotals}
            targets={targets}
          />

          {/* Spacer so the last day isn't hidden behind the footer — sized
              to the footer's real measured height, see footerHeight. */}
          <View style={{ height: footerHeight }} />
        </ScrollView>

        <View onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}>
          <BuilderSummaryFooter
            plannedCalories={selectedDayTotals.calories}
            targetCalories={targets.calories}
            mealCount={selectedDayMealCount}
            onSave={handleSave}
            onSaveAndActivate={handleSaveAndActivate}
            hasContent={hasAnyContent}
            testID="diet-builder-footer"
          />
        </View>
      </SafeAreaView>

      <CustomDialog
        visible={discardDialogVisible}
        title="Discard changes?"
        message="You have unsaved edits to your meal plan. Discarding will lose them."
        type="warning"
        actions={[
          { text: "Keep Editing", onPress: () => setDiscardDialogVisible(false), style: "cancel", variant: "secondary" },
          { text: "Discard", onPress: handleConfirmDiscard, style: "destructive", variant: "primary" },
        ]}
        onDismiss={() => setDiscardDialogVisible(false)}
      />

      {/* Save & Activate sheet (Phase B) — targets_mode toggle + food-floor
          gate. ONE shared toggle for diet and workout. Below-floor plans
          save as drafts; Activate is disabled until the shortfall closes. */}
      <SaveAndActivateSheet
        visible={activateSheetVisible}
        onClose={handleCancelActivate}
        targetsMode={pendingTargetsMode}
        onTargetsMode={setPendingTargetsMode}
        foodFloorBlocked={foodFloorBlocked}
        foodFloorShortfall={foodFloorShortfall}
        foodFloorKcal={foodFloorKcal}
        onActivate={handleConfirmActivate}
        activating={activating}
        planKind="diet"
        testID="diet-save-activate-sheet"
      />

      <View style={styles.pickerLayer}>
        <FoodPickerSheet />
      </View>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: rp(spacing.md) },
  loadingText: { color: colors.textSecondary, fontSize: rf(14), marginTop: rp(spacing.sm) },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: rp(spacing.lg), paddingTop: rp(spacing.sm) },
  title: {
    fontSize: rf(28),
    fontFamily: FONT_FAMILY.extrabold,
    fontWeight: "800",
    color: colors.text,
    lineHeight: rf(34),
    letterSpacing: -0.3,
    marginBottom: rp(spacing.sm),
  },
  subtitle: { fontSize: rf(14), color: colors.textSecondary, lineHeight: rf(20), marginBottom: rp(spacing.lg) },
  dayStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: rp(spacing.sm),
    marginBottom: rp(spacing.sm),
    borderTopWidth: 1,
    borderTopColor: hexToRgba(colors.white, 0.06),
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(colors.white, 0.06),
  },
  dayStripItem: { alignItems: "center", justifyContent: "center", flex: 1, paddingVertical: rp(spacing.xs), minHeight: 44 },
  dayDisc: { width: rw(40), height: rw(40), borderRadius: borderRadius.full, alignItems: "center", justifyContent: "center" },
  dayDiscSelected: { backgroundColor: colors.primary },
  dayDiscDefault: { backgroundColor: hexToRgba(colors.white, 0.06) },
  dayDiscText: { fontSize: rf(15), fontFamily: FONT_FAMILY.bold, fontWeight: "700" },
  dayDiscTextSelected: { color: colors.white },
  dayDiscTextDefault: { color: colors.textTertiary },
  dayShort: { fontSize: rf(11), fontFamily: FONT_FAMILY.bold, fontWeight: "700", color: colors.textTertiary, marginTop: rp(spacing.xs), letterSpacing: 0.6 },
  dayShortSelected: { color: colors.primary },
  dayDot: { width: rw(6), height: rw(6), borderRadius: borderRadius.full, marginTop: rp(spacing.xs) },
  pickerLayer: { zIndex: 1200, elevation: 1200 },
});
