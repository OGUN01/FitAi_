/**
 * DayMealBlock — one level deeper than the workout builder's DayBlock.
 *
 * A day here isn't a flat list — it's up to 4 meal slots (Breakfast / Lunch /
 * Dinner / Snacks, driven by the user's diet-preferences toggles). Same
 * collapse shell as DayBlock (flat surface[1] card, header always visible,
 * Layout.springify() on expand), but:
 *  - Collapsed header meta replaces the intensity chip with an adherence
 *    chip (On track / Under / Over), computed the same way as the day-strip
 *    dot, next to "{n} meals · {kcal} kcal".
 *  - Expanded content is MealSlotBlock x (enabled meal count) — the one
 *    structurally new piece versus the workout builder.
 *  - Kebab menu: Copy to weekday(s) / Clear Day.
 */
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, Layout, SlideInRight } from "react-native-reanimated";
import { DetentBottomSheet } from "../../ui/aurora/DetentBottomSheet";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { MealSlotBlock } from "./MealSlotBlock";
import { haptics } from "../../../utils/haptics";
import { hexToRgba } from "../../../utils/colors";
import { getDayAdherence, WEEKDAYS, type MealSlotType, type DayAdherence } from "../../../stores/dietBuilderStore";
import type { MealSchedule } from "../../../utils/mealSchedule";
import {
  colors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
  errorText,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";
import type { DayMeal, MealItem } from "../../../types/ai";

const DAY_FULL_LABELS: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

const DAY_SHORT_LABELS: Record<string, string> = {
  sunday: "SUN",
  monday: "MON",
  tuesday: "TUE",
  wednesday: "WED",
  thursday: "THU",
  friday: "FRI",
  saturday: "SAT",
};

const ADHERENCE_META: Record<DayAdherence, { label: string; color: string }> = {
  on: { label: "On track", color: colors.success.DEFAULT },
  under: { label: "Under", color: colors.warning.DEFAULT },
  over: { label: "Over", color: colors.error.DEFAULT },
  empty: { label: "Empty", color: colors.text.tertiary },
};

export interface DayMealBlockProps {
  dayIndex: number;
  dayOfWeek: string;
  meals: DayMeal[];
  enabledSlots: MealSlotType[];
  targetCalories: number | null;
  schedule: MealSchedule;
  isExpanded: boolean;
  onToggleExpand: (dayIndex: number) => void;
  expandedSlotType: MealSlotType | null;
  onToggleSlot: (slot: MealSlotType) => void;
  onAddFood: (dayOfWeek: string, mealType: MealSlotType, mealId: string | undefined) => void;
  onUpdateItem: (mealId: string, itemIndex: number, item: MealItem) => void;
  onDuplicateItem: (mealId: string, itemIndex: number) => void;
  onRemoveItem: (mealId: string, itemIndex: number) => void;
  onReplaceItem: (mealId: string, itemIndex: number) => void;
  onReorderItem: (mealId: string, from: number, to: number) => void;
  onSaveMealAsTemplate: (mealId: string) => void;
  onCopyDayToWeekdays: (fromDay: string, toDays: string[]) => void;
  onClearDay: (dayOfWeek: string) => void;
  testID?: string;
}

export const DayMealBlock: React.FC<DayMealBlockProps> = React.memo(
  ({
    dayIndex,
    dayOfWeek,
    meals,
    enabledSlots,
    targetCalories,
    schedule,
    isExpanded,
    onToggleExpand,
    expandedSlotType,
    onToggleSlot,
    onAddFood,
    onUpdateItem,
    onDuplicateItem,
    onRemoveItem,
    onReplaceItem,
    onReorderItem,
    onSaveMealAsTemplate,
    onCopyDayToWeekdays,
    onClearDay,
    testID,
  }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [copyPickerOpen, setCopyPickerOpen] = useState(false);
    const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set());
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

    const dayLabel = DAY_FULL_LABELS[dayOfWeek] ?? dayOfWeek;
    const dayShort = DAY_SHORT_LABELS[dayOfWeek] ?? dayOfWeek.slice(0, 3).toUpperCase();

    const mealsByType = useMemo(() => {
      const map = new Map<MealSlotType, DayMeal>();
      for (const meal of meals) {
        if (!map.has(meal.type as MealSlotType)) map.set(meal.type as MealSlotType, meal);
      }
      return map;
    }, [meals]);

    const totalCalories = useMemo(
      () => meals.reduce((sum, m) => sum + (m.totalCalories || 0), 0),
      [meals],
    );
    const mealCount = meals.reduce((sum, m) => sum + (m.items?.length ? 1 : 0), 0);
    const adherence = getDayAdherence(totalCalories, targetCalories);
    const adherenceMeta = ADHERENCE_META[adherence];

    const handleHeaderPress = useCallback(() => {
      haptics.selection();
      onToggleExpand(dayIndex);
    }, [onToggleExpand, dayIndex]);

    const otherDays = WEEKDAYS.filter((d) => d !== dayOfWeek);

    const toggleCopyTarget = useCallback((day: string) => {
      setCopyTargets((prev) => {
        const next = new Set(prev);
        if (next.has(day)) next.delete(day);
        else next.add(day);
        return next;
      });
    }, []);

    const handleConfirmCopy = useCallback(() => {
      if (copyTargets.size === 0) {
        setCopyPickerOpen(false);
        return;
      }
      onCopyDayToWeekdays(dayOfWeek, Array.from(copyTargets));
      setCopyPickerOpen(false);
      setCopyTargets(new Set());
      haptics.success();
    }, [copyTargets, dayOfWeek, onCopyDayToWeekdays]);

    return (
      <Animated.View
        entering={FadeInUp.springify().delay(dayIndex * 40)}
        layout={Layout.springify()}
        style={styles.blockWrap}
        testID={testID}
      >
        <View style={styles.card}>
          <Pressable
            onPress={handleHeaderPress}
            accessibilityRole="button"
            accessibilityLabel={`${dayLabel}. ${mealCount} meals, ${totalCalories} kcal. ${adherenceMeta.label}.`}
            accessibilityState={{ expanded: isExpanded }}
            style={styles.header}
          >
            <View style={styles.dayBadge}>
              <Text style={styles.dayShort}>{dayShort}</Text>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.dayTitle} numberOfLines={1}>
                {dayLabel}
              </Text>
              <View style={styles.headerMeta}>
                <View
                  style={[
                    styles.adherenceChip,
                    { backgroundColor: hexToRgba(adherenceMeta.color, 0.14) },
                  ]}
                >
                  <View style={[styles.adherenceDot, { backgroundColor: adherenceMeta.color }]} />
                  {/* Text uses error.light, not adherenceMeta.color directly — the
                      "over" chip's error.DEFAULT text on its own tint background
                      measures ~4.28:1, under the 4.5:1 AA floor (Round 6 follow-up
                      c). Dot/tint stay on error.DEFAULT since those only need 3:1. */}
                  <Text
                    style={[
                      styles.adherenceChipText,
                      { color: adherence === "over" ? errorText : adherenceMeta.color },
                    ]}
                  >
                    {adherenceMeta.label}
                  </Text>
                </View>
                <Text style={styles.metaText}>
                  {mealCount} meal{mealCount !== 1 ? "s" : ""} · {totalCalories} kcal
                </Text>
              </View>
            </View>

            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={rf(20)}
              color={colors.text.secondary}
            />
          </Pressable>

          {isExpanded && (
            <Animated.View entering={SlideInRight.springify()} layout={Layout.springify()} style={styles.expanded}>
              {enabledSlots.length === 0 ? (
                <Text style={styles.emptyHint}>
                  No meal slots enabled — turn on Breakfast/Lunch/Dinner/Snacks in Diet Preferences.
                </Text>
              ) : (
                enabledSlots.map((slot) => {
                  const meal = mealsByType.get(slot);
                  return (
                    <MealSlotBlock
                      key={slot}
                      mealType={slot}
                      meal={meal}
                      schedule={schedule}
                      isExpanded={expandedSlotType === slot}
                      onToggleExpand={() => onToggleSlot(slot)}
                      onAddFood={() => onAddFood(dayOfWeek, slot, meal?.id)}
                      onUpdateItem={(itemIndex, item) =>
                        meal && onUpdateItem(meal.id, itemIndex, item)
                      }
                      onDuplicateItem={(itemIndex) => meal && onDuplicateItem(meal.id, itemIndex)}
                      onRemoveItem={(itemIndex) => meal && onRemoveItem(meal.id, itemIndex)}
                      onReplaceItem={(itemIndex) => meal && onReplaceItem(meal.id, itemIndex)}
                      onReorderItem={(from, to) => meal && onReorderItem(meal.id, from, to)}
                      onSaveAsTemplate={() => meal && onSaveMealAsTemplate(meal.id)}
                      testID={`${testID}-slot-${slot}`}
                    />
                  );
                })
              )}

              <View style={styles.dayActions}>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    haptics.selection();
                    setMenuOpen((v) => !v);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Day actions"
                  style={styles.kebabBtn}
                >
                  <Ionicons name="ellipsis-horizontal" size={rf(18)} color={colors.text.secondary} />
                </Pressable>
              </View>

              {menuOpen && (
                <View style={styles.dayMenu} pointerEvents="box-none">
                  <Pressable style={styles.menuDismiss} onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu" />
                  <View style={styles.dayMenuList}>
                    <Pressable
                      style={styles.dayMenuItem}
                      onPress={() => {
                        setMenuOpen(false);
                        setCopyPickerOpen(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Copy ${dayLabel} to other days`}
                    >
                      <Ionicons name="copy-outline" size={rf(14)} color={colors.text.secondary} style={styles.dayMenuIcon} />
                      <Text style={styles.dayMenuLabel}>Copy to weekday(s)</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.dayMenuItem, styles.dayMenuItemDivider]}
                      onPress={() => {
                        setMenuOpen(false);
                        haptics.warning();
                        setClearConfirmOpen(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Clear ${dayLabel}`}
                    >
                      <Ionicons name="trash-outline" size={rf(14)} color={colors.error.DEFAULT} style={styles.dayMenuIcon} />
                      {/* error.DEFAULT text on this menu's surface[2] background measures
                          ~4.17:1, under the 4.5:1 AA floor (Round 6 follow-up c) — error.light
                          clears it (~5.3:1) without touching the icon above. */}
                      <Text style={[styles.dayMenuLabel, { color: errorText }]}>Clear Day</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </Animated.View>
          )}
        </View>

        {/* Copy-to-weekday(s) picker */}
        <DetentBottomSheet
          visible={copyPickerOpen}
          onClose={() => setCopyPickerOpen(false)}
          snapPoints={[0.5, 0.75]}
          initialSnapIndex={0}
          testID={`${testID}-copy-picker`}
        >
          <View style={styles.sheetBody}>
            <Text style={styles.sheetTitle}>Copy {dayLabel} to:</Text>
            {otherDays.map((day) => {
              const selected = copyTargets.has(day);
              return (
                <Pressable
                  key={day}
                  style={styles.copyRow}
                  onPress={() => toggleCopyTarget(day)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={DAY_FULL_LABELS[day] ?? day}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected ? <Ionicons name="checkmark" size={rf(14)} color={colors.text.primary} /> : null}
                  </View>
                  <Text style={styles.copyRowText}>{DAY_FULL_LABELS[day] ?? day}</Text>
                </Pressable>
              );
            })}
            <GlassButton
              label={`Copy to ${copyTargets.size || ""} day${copyTargets.size === 1 ? "" : "s"}`.trim()}
              onPress={handleConfirmCopy}
              disabled={copyTargets.size === 0}
              variant="primary"
              style={styles.sheetActionBtn}
              testID={`${testID}-copy-confirm`}
            />
          </View>
        </DetentBottomSheet>

        {/* Clear-day confirmation */}
        <DetentBottomSheet
          visible={clearConfirmOpen}
          onClose={() => setClearConfirmOpen(false)}
          snapPoints={[0.4, 0.6]}
          initialSnapIndex={1}
          testID={`${testID}-clear-sheet`}
        >
          <View style={styles.sheetBody}>
            <View style={[styles.sheetIcon, { backgroundColor: hexToRgba(colors.error.DEFAULT, 0.12) }]}>
              <Ionicons name="trash-outline" size={rf(28)} color={colors.error.DEFAULT} />
            </View>
            <Text style={styles.sheetTitle}>Clear {dayLabel}?</Text>
            <Text style={styles.sheetMessage}>
              This removes all {mealCount} meal{mealCount !== 1 ? "s" : ""} from this day. This can't be undone.
            </Text>
            <View style={styles.sheetActionsRow}>
              <GlassButton
                label="Cancel"
                onPress={() => setClearConfirmOpen(false)}
                variant="secondary"
                style={styles.sheetActionBtnFlex}
                testID={`${testID}-clear-cancel`}
              />
              <GlassButton
                label="Clear Day"
                onPress={() => {
                  setClearConfirmOpen(false);
                  onClearDay(dayOfWeek);
                }}
                variant="error"
                style={styles.sheetActionBtnFlex}
                testID={`${testID}-clear-confirm`}
              />
            </View>
          </View>
        </DetentBottomSheet>
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  blockWrap: {
    position: "relative",
    marginBottom: rp(spacing.sm),
  },
  card: {
    overflow: "hidden",
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    gap: rp(spacing.sm),
    minHeight: 68,
  },
  dayBadge: {
    width: rw(44),
    height: rw(44),
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  dayShort: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  dayTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.xxs),
  },
  adherenceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
    borderRadius: borderRadius.sm,
    paddingHorizontal: rp(spacing.xs),
    paddingVertical: rp(2),
  },
  adherenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  adherenceChipText: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  metaText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  expanded: {
    paddingHorizontal: rp(spacing.md),
    paddingBottom: rp(spacing.md),
    paddingTop: rp(spacing.xs),
  } as ViewStyle,
  emptyHint: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: "center",
    paddingVertical: rp(spacing.md),
  },
  dayActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  kebabBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // BUG FIX: mirrors the identical fix in fitness/builder/DayBlock.tsx —
  // `dayMenu` previously only set top/right (no left/bottom), so on web it
  // shrink-wrapped to its content instead of filling the screen, meaning
  // menuDismiss's backdrop only covered that small box rather than acting
  // as a real full-screen dismiss target. Fixed to mirror ExerciseRow.tsx's
  // working kebab-menu pattern: the outer container fills the screen, and
  // the visible dropdown is positioned via dayMenuList's own
  // `position: absolute` instead.
  dayMenu: {
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
  dayMenuList: {
    position: "absolute",
    top: rp(spacing.xs),
    right: rp(spacing.md),
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    paddingVertical: rp(spacing.xs),
    minWidth: 200,
    zIndex: 41,
  },
  dayMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    gap: rp(spacing.sm),
    minHeight: 44,
  },
  dayMenuItemDivider: {
    borderTopWidth: 1,
    borderTopColor: border.subtle,
  },
  dayMenuIcon: {
    width: 16,
  },
  dayMenuLabel: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
  },
  sheetBody: {
    alignItems: "center",
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.xl),
    gap: rp(spacing.sm),
  },
  sheetIcon: {
    width: rf(56),
    height: rf(56),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as any,
    textAlign: "center",
    marginBottom: rp(spacing.sm),
  },
  sheetMessage: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.body),
    textAlign: "center",
    lineHeight: rf(22),
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    width: "100%",
    paddingVertical: rp(spacing.sm),
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  copyRowText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
  },
  sheetActionBtn: {
    width: "100%",
    marginTop: rp(spacing.sm),
  },
  sheetActionsRow: {
    flexDirection: "row",
    gap: rp(spacing.sm),
    width: "100%",
    marginTop: rp(spacing.sm),
  },
  sheetActionBtnFlex: {
    flex: 1,
  },
});

export default DayMealBlock;
