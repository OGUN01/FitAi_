/**
 * FoodRow — the food-specific rethink of the workout builder's ExerciseRow.
 *
 * Same shell proportions (76px min-height, flat surface, drag handle,
 * thumbnail, name+meta, trailing cell) and the same swipe-left gesture
 * (hand-rolled Gesture.Pan at activeOffsetX([-12,12]), reveal, half-width
 * commit threshold) with food-appropriate actions: Duplicate (info blue) /
 * Replace (opens FoodPickerSheet pre-filtered) / Delete (error red).
 * Long-press drags to reorder within the slot (useDragToReorder +
 * useDragReflow, unchanged).
 *
 * The trailing cell is genuinely different from ExerciseRow's static
 * "sets × reps" readout: an inline expandable quantity editor, because a
 * portion needs a unit, not just a number.
 *  - Collapsed: "{qty} {unit}" — tap to expand in place.
 *  - Expanded: a unit chip that cycles on tap through the food's available
 *    units (SetRow's cycling-chip interaction), a numeric TextInput using
 *    SetRow's local-string-mirror + commit-on-onEndEditing pattern, and a
 *    2×2 "common portions" quick-select grid (multiples of the food's
 *    default unit, sourced from the canonical foodUnitConversions.ts table —
 *    not a second, name-substring-matching duplicate of
 *    PortionAdjustment.getCommonPortionSizes). A live macro-delta preview
 *    updates as the pending value changes, before commit.
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Layout,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import { useDragToReorder } from "../../../gestures/handlers";
import { animations } from "../../../theme/animations";
import { haptics } from "../../../utils/haptics";
import { hexToRgba } from "../../../utils/colors";
import {
  colors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";
import {
  ALL_FOOD_UNITS,
  getAvailableUnitsForFood,
  getDefaultUnit,
  gramsPerUnit,
  convertToGrams,
  convertFromGrams,
  formatQuantityLabel,
  type FoodUnit,
} from "../../../services/foodUnitConversions";
import type { MealItem } from "../../../types/diet";

export const FOOD_ROW_HEIGHT = 76;

export interface FoodRowProps {
  item: MealItem;
  itemIndex: number;
  totalCount: number;
  onUpdate: (itemIndex: number, item: MealItem) => void;
  onDuplicate: (itemIndex: number) => void;
  onRemove: (itemIndex: number) => void;
  onReplace: (itemIndex: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  reflowOffsets: SharedValue<number[]>;
  onDragMove?: (fromIndex: number, targetIndex: number) => void;
  testID?: string;
}

function parseQuantity(quantity: MealItem["quantity"]): number {
  if (typeof quantity === "number") return Number.isFinite(quantity) ? quantity : 0;
  const parsed = parseFloat(String(quantity).replace(",", "."));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function foodName(item: MealItem): string {
  return item.name || item.food?.name || "Food";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Scale an item's calories/macros by a grams ratio (same recipe as
 * PortionAdjustment's adjustmentRatio scaling — one consistent approach to
 * "resize a logged portion" across the app). */
function scaleItem(item: MealItem, newQuantity: number, newUnit: FoodUnit): MealItem {
  const name = foodName(item);
  const currentQuantity = parseQuantity(item.quantity);
  const currentUnit = (item.unit as FoodUnit) || getDefaultUnit(name);
  const currentGrams = convertToGrams(currentQuantity, currentUnit, name);
  const newGrams = convertToGrams(newQuantity, newUnit, name);
  const ratio = currentGrams > 0 ? newGrams / currentGrams : 1;
  const macros = item.macros;
  return {
    ...item,
    quantity: newQuantity,
    unit: newUnit,
    calories: Math.max(0, Math.round(item.calories * ratio)),
    macros: {
      protein: Math.max(0, round1(macros.protein * ratio)),
      carbohydrates: Math.max(0, round1(macros.carbohydrates * ratio)),
      fat: Math.max(0, round1(macros.fat * ratio)),
      fiber: Math.max(0, round1((macros.fiber ?? 0) * ratio)),
      sugar: macros.sugar != null ? Math.max(0, round1(macros.sugar * ratio)) : undefined,
      sodium: macros.sodium != null ? Math.max(0, Math.round(macros.sodium * ratio)) : undefined,
    },
  };
}

const FoodRowComponent: React.FC<FoodRowProps> = ({
  item,
  itemIndex,
  totalCount,
  onUpdate,
  onDuplicate,
  onRemove,
  onReplace,
  onReorder,
  reflowOffsets,
  onDragMove,
  testID,
}) => {
  const name = foodName(item);
  const quantity = parseQuantity(item.quantity);
  const unit: FoodUnit = ALL_FOOD_UNITS.includes(item.unit as FoodUnit)
    ? (item.unit as FoodUnit)
    : getDefaultUnit(name);

  const [expanded, setExpanded] = useState(false);
  const [qtyText, setQtyText] = useState<string>(() => String(quantity));

  // Resync local text when the item changes externally (e.g. drag reorder
  // doesn't touch quantity, but a replace/undo could) — mirrors SetRow's
  // "don't clobber in-flight typing" guard.
  useEffect(() => {
    const canonical = String(quantity);
    if (canonical !== qtyText && quantity !== (parseFloat(qtyText) || 0)) {
      setQtyText(canonical);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity]);

  const pendingQuantity = (() => {
    const parsed = parseFloat(qtyText.replace(",", "."));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : quantity;
  })();

  const preview = expanded ? scaleItem(item, pendingQuantity, unit) : item;

  const commitQuantity = useCallback(() => {
    const parsed = parseFloat(qtyText.replace(",", "."));
    const clamped = Number.isFinite(parsed) && parsed >= 0 ? parsed : quantity;
    setQtyText(String(clamped));
    if (clamped !== quantity) {
      onUpdate(itemIndex, scaleItem(item, clamped, unit));
    }
  }, [qtyText, quantity, item, unit, itemIndex, onUpdate]);

  const cycleUnit = useCallback(() => {
    const available = getAvailableUnitsForFood(name);
    const currentIdx = available.indexOf(unit);
    const nextUnit = available[(currentIdx + 1) % available.length] ?? "g";
    haptics.selection();
    const currentGrams = convertToGrams(quantity, unit, name);
    const nextQuantity = Math.round(convertFromGrams(currentGrams, nextUnit, name) * 10) / 10;
    setQtyText(String(nextQuantity));
    onUpdate(itemIndex, scaleItem(item, nextQuantity, nextUnit));
  }, [name, unit, quantity, item, itemIndex, onUpdate]);

  // Derived from the CURRENTLY SELECTED unit (not the food's static default)
  // so switching units via cycleUnit regenerates these chips to match —
  // otherwise chips keep showing e.g. "1 cube/2 cubes" after switching to "g".
  const quickPortions = (() => {
    return [1, 2, 3, 4].map((multiplier) => ({
      qty: multiplier,
      unit,
      label: formatQuantityLabel(multiplier, unit),
      grams: gramsPerUnit(name, unit) * multiplier,
    }));
  })();

  const applyQuickPortion = useCallback(
    (qty: number, portionUnit: FoodUnit) => {
      haptics.selection();
      setQtyText(String(qty));
      onUpdate(itemIndex, scaleItem(item, qty, portionUnit));
    },
    [item, itemIndex, onUpdate],
  );

  // ── Drag-to-reorder ──
  const handleDragEnd = useCallback(
    (from: number, to: number) => {
      const clamped = Math.max(0, Math.min(totalCount - 1, to));
      if (from !== clamped) onReorder(from, clamped);
    },
    [totalCount, onReorder],
  );

  const { gesture: dragGesture, translateY, isDragging } = useDragToReorder(itemIndex, {
    itemHeight: FOOD_ROW_HEIGHT,
    onDragEnd: handleDragEnd,
    onDragMove,
    activationDelay: 400,
  });

  const dragAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + (reflowOffsets.value[itemIndex] ?? 0) }],
    opacity: isDragging.value ? 0.9 : 1,
    zIndex: isDragging.value ? 100 : 0,
    elevation: isDragging.value ? 6 : 0,
  }));

  // ── Swipe-to-reveal actions ──
  const swipeX = useSharedValue(0);
  const SWIPE_ACTION_WIDTH = rw(150);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      if (event.translationX < 0) {
        swipeX.value = Math.max(-SWIPE_ACTION_WIDTH, event.translationX);
      } else if (swipeX.value < 0) {
        swipeX.value = Math.min(0, event.translationX + swipeX.value);
      }
    })
    .onEnd(() => {
      if (swipeX.value < -SWIPE_ACTION_WIDTH / 2) {
        swipeX.value = withSpring(-SWIPE_ACTION_WIDTH, animations.spring.snappy);
        haptics.selection();
      } else {
        swipeX.value = withSpring(0, animations.spring.default);
      }
    });

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  const actionOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(swipeX.value, [-SWIPE_ACTION_WIDTH, 0], [1, 0]),
  }));

  const closeSwipe = useCallback(() => {
    swipeX.value = withSpring(0, animations.spring.default);
  }, [swipeX]);

  return (
    <View style={styles.container} testID={testID}>
      {/* Swipe-revealed actions */}
      <Animated.View style={[styles.actionsLayer, actionOpacity]} pointerEvents="box-none">
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.info.DEFAULT }]}
          onPress={() => {
            closeSwipe();
            haptics.selection();
            onDuplicate(itemIndex);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Duplicate ${name}`}
        >
          <Ionicons name="copy-outline" size={rf(18)} color={colors.text.primary} />
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.warning.DEFAULT }]}
          onPress={() => {
            closeSwipe();
            haptics.selection();
            onReplace(itemIndex);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Replace ${name}`}
        >
          <Ionicons name="swap-horizontal-outline" size={rf(18)} color={colors.text.primary} />
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.error.DEFAULT }]}
          onPress={() => {
            closeSwipe();
            haptics.delete();
            onRemove(itemIndex);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${name}`}
        >
          <Ionicons name="trash-outline" size={rf(18)} color={colors.text.primary} />
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={Gesture.Simultaneous(dragGesture, swipeGesture)}>
        <Animated.View
          layout={Layout.springify()}
          style={[styles.row, dragAnimatedStyle, swipeAnimatedStyle]}
        >
          <View style={styles.rowInner}>
            <View style={styles.dragHandle} pointerEvents="none">
              <Ionicons name="menu-outline" size={rf(16)} color={colors.text.tertiary} />
            </View>

            <View style={styles.thumbnail}>
              <Ionicons name="restaurant-outline" size={rf(18)} color={colors.text.secondary} />
            </View>

            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {Math.round(preview.calories)} kcal · {Math.round(preview.macros.protein)}P{" "}
                {Math.round(preview.macros.carbohydrates)}C {Math.round(preview.macros.fat)}F
              </Text>
            </View>

            {/* Trailing cell: collapsed qty/unit — tap to expand */}
            <Pressable
              onPress={() => {
                haptics.selection();
                setExpanded((v) => !v);
              }}
              style={styles.qtyCell}
              accessibilityRole="button"
              accessibilityLabel={`Quantity ${formatQuantityLabel(quantity, unit)}. Tap to edit.`}
              accessibilityState={{ expanded }}
            >
              <Text style={styles.qtyValue} numberOfLines={1}>
                {formatQuantityLabel(quantity, unit)}
              </Text>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={rf(12)}
                color={colors.text.tertiary}
              />
            </Pressable>
          </View>

          {/* Expanded inline quantity editor */}
          {expanded && (
            <Animated.View
              entering={SlideInRight.springify()}
              exiting={SlideOutLeft.springify()}
              layout={Layout.springify()}
              style={styles.editor}
            >
              <View style={styles.editorRow}>
                <Pressable
                  onPress={cycleUnit}
                  style={styles.unitChip}
                  accessibilityRole="button"
                  accessibilityLabel={`Unit: ${unit}. Tap to cycle.`}
                >
                  <Text style={styles.unitChipText}>{unit}</Text>
                </Pressable>
                <TextInput
                  value={qtyText}
                  onChangeText={setQtyText}
                  onEndEditing={commitQuantity}
                  keyboardType="numeric"
                  style={styles.qtyInput}
                  selectTextOnFocus
                  returnKeyType="done"
                  accessibilityLabel={`Quantity in ${unit} for ${name}`}
                />
              </View>

              <View style={styles.quickGrid}>
                {quickPortions.map((portion) => {
                  const active = quantity === portion.qty && unit === portion.unit;
                  return (
                    <Pressable
                      key={`${portion.unit}-${portion.qty}`}
                      onPress={() => applyQuickPortion(portion.qty, portion.unit)}
                      style={[styles.quickPortionBtn, active && styles.quickPortionBtnActive]}
                      accessibilityRole="button"
                      accessibilityLabel={`${portion.label}`}
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[
                          styles.quickPortionText,
                          active && styles.quickPortionTextActive,
                        ]}
                      >
                        {portion.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export const FoodRow = React.memo(FoodRowComponent);

const styles = StyleSheet.create({
  container: {
    position: "relative",
    marginBottom: rp(spacing.xs),
  },
  row: {
    borderRadius: borderRadius.lg,
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    overflow: "hidden",
  } as ViewStyle,
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.sm),
    gap: rp(spacing.xs),
    minHeight: rp(FOOD_ROW_HEIGHT),
  },
  dragHandle: {
    width: rw(18),
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: rw(40),
    height: rw(40),
    borderRadius: borderRadius.full,
    backgroundColor: surface[2],
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  name: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  meta: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    marginTop: rp(2),
    fontVariant: ["tabular-nums"],
  },
  qtyCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(2),
    minHeight: 44,
    paddingHorizontal: rp(spacing.xs),
    justifyContent: "center",
  },
  qtyValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as any,
    fontVariant: ["tabular-nums"],
  },
  editor: {
    paddingHorizontal: rp(spacing.sm),
    paddingBottom: rp(spacing.sm),
    gap: rp(spacing.sm),
  },
  editorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
  },
  unitChip: {
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.12),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary.DEFAULT, 0.35),
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  unitChipText: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: "uppercase",
  },
  qtyInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
    backgroundColor: surface[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: border.subtle,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.xs),
  },
  quickPortionBtn: {
    flexBasis: "47%",
    flexGrow: 1,
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: border.subtle,
    backgroundColor: surface[2],
    alignItems: "center",
    minHeight: 40,
    justifyContent: "center",
  },
  quickPortionBtnActive: {
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.16),
    borderColor: colors.primary.DEFAULT,
  },
  quickPortionText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  quickPortionTextActive: {
    color: colors.primary.DEFAULT,
  },
  actionsLayer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: rp(spacing.sm),
    gap: rp(spacing.xs),
  },
  actionBtn: {
    width: rw(44),
    height: rw(44),
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default FoodRow;
