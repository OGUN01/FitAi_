/**
 * MealSlotBlock — new, nests one level inside DayMealBlock.
 *
 * Its own mini collapse shell (smaller than DayMealBlock, same flat-surface
 * language, surface[2] to read as one level deeper per the 3-level elevation
 * model):
 *  - Header: meal-type icon + name + time (from calculateMealSchedule) + kcal
 *    subtotal + a MacroRatioBar + chevron.
 *  - Expanded: FoodRow list -> "Add Food" GlassButton -> a "Save as template"
 *    kebab item wired to savedMealsStore.saveMeal().
 */
import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { Layout, SlideInRight } from "react-native-reanimated";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { FoodRow, FOOD_ROW_HEIGHT } from "./FoodRow";
import { MacroRatioBar } from "./MacroRatioBar";
import { useDragReflow } from "../../../gestures/handlers";
import { haptics } from "../../../utils/haptics";
import { getMealTypeIonicon, getMealTime, type MealSchedule } from "../../../utils/mealSchedule";
import {
  colors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf } from "../../../utils/responsive";
import type { DayMeal, MealItem } from "../../../types/ai";
import type { MealSlotType } from "../../../stores/dietBuilderStore";

export interface MealSlotBlockProps {
  mealType: MealSlotType;
  meal: DayMeal | undefined;
  schedule: MealSchedule;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddFood: () => void;
  onUpdateItem: (itemIndex: number, item: MealItem) => void;
  onDuplicateItem: (itemIndex: number) => void;
  onRemoveItem: (itemIndex: number) => void;
  onReplaceItem: (itemIndex: number) => void;
  onReorderItem: (fromIndex: number, toIndex: number) => void;
  onSaveAsTemplate: () => void;
  testID?: string;
}

const MEAL_TYPE_LABEL: Record<MealSlotType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export const MealSlotBlock: React.FC<MealSlotBlockProps> = ({
  mealType,
  meal,
  schedule,
  isExpanded,
  onToggleExpand,
  onAddFood,
  onUpdateItem,
  onDuplicateItem,
  onRemoveItem,
  onReplaceItem,
  onReorderItem,
  onSaveAsTemplate,
  testID,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = meal?.items ?? [];
  const totals = meal?.totalMacros ?? { protein: 0, carbohydrates: 0, fat: 0, fiber: 0 };
  const kcal = meal?.totalCalories ?? 0;
  const time = getMealTime(mealType, schedule);
  const icon = getMealTypeIonicon(mealType) as keyof typeof Ionicons.glyphMap;

  const {
    offsets: reflowOffsets,
    reportDragMove,
    resetOffsets,
  } = useDragReflow(items.length, FOOD_ROW_HEIGHT);

  const handleReorder = useCallback(
    (from: number, to: number) => {
      resetOffsets();
      onReorderItem(from, to);
    },
    [onReorderItem, resetOffsets],
  );

  const handleHeaderPress = useCallback(() => {
    haptics.selection();
    onToggleExpand();
  }, [onToggleExpand]);

  return (
    <Animated.View layout={Layout.springify()} style={styles.card} testID={testID}>
      <Pressable
        onPress={handleHeaderPress}
        accessibilityRole="button"
        accessibilityLabel={`${MEAL_TYPE_LABEL[mealType]}. ${items.length} foods, ${kcal} kcal.`}
        accessibilityState={{ expanded: isExpanded }}
        style={styles.header}
      >
        <View style={styles.iconDisc}>
          <Ionicons name={icon} size={rf(16)} color={colors.text.secondary} />
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {meal?.name || MEAL_TYPE_LABEL[mealType]}
            </Text>
            <Text style={styles.time} numberOfLines={1}>
              {time}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.kcal} numberOfLines={1}>
              {items.length} food{items.length === 1 ? "" : "s"} · {kcal} kcal
            </Text>
          </View>
          {kcal > 0 && (
            <MacroRatioBar
              proteinG={totals.protein}
              carbsG={totals.carbohydrates}
              fatG={totals.fat}
              height={3}
            />
          )}
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={rf(16)}
          color={colors.text.tertiary}
        />
      </Pressable>

      {isExpanded && (
        <Animated.View entering={SlideInRight.springify()} layout={Layout.springify()} style={styles.expanded}>
          {items.length === 0 ? (
            <Text style={styles.emptyHint}>No foods yet. Tap "Add Food" below.</Text>
          ) : (
            <View style={styles.list}>
              {items.map((item, idx) => (
                <FoodRow
                  key={`${item.foodId}_${idx}`}
                  item={item}
                  itemIndex={idx}
                  totalCount={items.length}
                  onUpdate={onUpdateItem}
                  onDuplicate={onDuplicateItem}
                  onRemove={onRemoveItem}
                  onReplace={onReplaceItem}
                  onReorder={handleReorder}
                  reflowOffsets={reflowOffsets}
                  onDragMove={reportDragMove}
                  testID={`${testID}-food-${idx}`}
                />
              ))}
            </View>
          )}

          <View style={styles.actionsRow}>
            <GlassButton
              label="Add Food"
              icon="add-circle-outline"
              onPress={() => {
                haptics.buttonPress();
                onAddFood();
              }}
              variant="secondary"
              style={styles.addBtn}
            />
            <Pressable
              hitSlop={8}
              onPress={() => {
                haptics.selection();
                setMenuOpen((v) => !v);
              }}
              accessibilityRole="button"
              accessibilityLabel="Meal actions"
              style={styles.kebabBtn}
            >
              <Ionicons name="ellipsis-horizontal" size={rf(16)} color={colors.text.secondary} />
            </Pressable>
          </View>

          {menuOpen && (
            <View style={styles.menu} pointerEvents="box-none">
              <Pressable style={styles.menuDismiss} onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu" />
              <View style={styles.menuList}>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    onSaveAsTemplate();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Save these as a template"
                >
                  <Ionicons name="bookmark-outline" size={rf(14)} color={colors.text.secondary} style={styles.menuIcon} />
                  <Text style={styles.menuLabel}>Save these as a template</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: border.subtle,
    marginBottom: rp(spacing.sm),
    overflow: "hidden",
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.sm),
    gap: rp(spacing.sm),
    minHeight: 56,
  },
  iconDisc: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: surface[1],
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    gap: rp(spacing.xxs),
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    flexShrink: 1,
  },
  time: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    marginLeft: rp(spacing.xs),
  },
  metaRow: {
    flexDirection: "row",
  },
  kcal: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    fontVariant: ["tabular-nums"],
  },
  expanded: {
    paddingHorizontal: rp(spacing.sm),
    paddingBottom: rp(spacing.sm),
  },
  emptyHint: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: "center",
    paddingVertical: rp(spacing.md),
  },
  list: {
    marginBottom: rp(spacing.sm),
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
  },
  addBtn: {
    flex: 1,
  },
  kebabBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  menuDismiss: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  } as ViewStyle,
  menuList: {
    position: "absolute",
    bottom: 44,
    right: rp(spacing.sm),
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    paddingVertical: rp(spacing.xs),
    minWidth: 200,
    zIndex: 41,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    gap: rp(spacing.sm),
    minHeight: 44,
  },
  menuIcon: {
    width: 16,
  },
  menuLabel: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
  },
});

export default MealSlotBlock;
