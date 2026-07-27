/**
 * CompactDietCard
 *
 * Compact main diet card for the Diet tab. Renders a calorie ring at the top
 * (reusing `CalorieArc`), four macro pills in a single row below
 * (Protein / Carbs / Fats / Fiber), and a "View Today" CTA that invokes
 * `onViewToday` so a downstream agent can wire up the meals-list view.
 *
 * Design goal: match the compact card from design 1.png (left panel) — short
 * vertical footprint, not the tall stacked layout of NutritionSummaryCard.
 *
 * Data: all macro values come from the parent (sourced from
 * nutritionStore.getTodaysConsumedNutrition() / getConsumedNutrition()). This
 * component is a pure presentational consumer — no store reads here, keeping
 * it testable and single-purpose.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { CalorieArc } from "./CalorieArc";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from "../../theme/aurora-tokens";
import { rf, rw, rp, rh, rbr } from "../../utils/responsive";
import { hexToRgba, TINT_ALPHA_LOW } from "../../utils/colors";

/** A single macro target + current value pair. */
export interface MacroStat {
  current: number;
  target: number;
}

export interface CompactDietCardProps {
  /** Calorie ring data. */
  calories: MacroStat;
  /** Macro pills (Protein / Carbs / Fats / Fiber) — rendered in that order. */
  protein: MacroStat;
  carbs: MacroStat;
  fat: MacroStat;
  fiber: MacroStat;
  /**
   * Invoked when the user taps the "View Today" button. The parent decides
   * what to show (meals list, navigation, etc.).
   */
  onViewToday: () => void;
  /** Optional accessibility/test id for the View Today button. */
  testID?: string;
}

/** Per-macro visual config: dot color + tinted pill background + label. */
interface MacroVisual {
  label: string;
  dotColor: string;
}

const MACRO_VISUALS: Record<"protein" | "carbs" | "fat" | "fiber", MacroVisual> = {
  protein: { label: "Protein", dotColor: colors.blue },
  carbs: { label: "Carbs", dotColor: colors.amberBright },
  fat: { label: "Fats", dotColor: colors.successBright },
  fiber: { label: "Fiber", dotColor: colors.purple },
};

const OVERFLOW_COLOR = colors.error;

/**
 * Renders a single compact macro pill: colored dot + label on top, current/target
 * value below. Overflow (current > target) turns the value red. Pill background
 * is a 12% tint of the macro's accent color for a soft, cohesive look.
 */
const MacroPill: React.FC<{
  stat: MacroStat;
  visual: MacroVisual;
}> = React.memo(({ stat, visual }) => {
  const overflow = stat.target > 0 && stat.current > stat.target;
  return (
    <View
      style={[
        styles.macroPill,
        { backgroundColor: hexToRgba(visual.dotColor, TINT_ALPHA_LOW) },
      ]}
    >
      <View style={styles.macroPillHeader}>
        <View
          style={[styles.macroDot, { backgroundColor: visual.dotColor }]}
        />
        <Text style={styles.macroLabel} numberOfLines={1}>
          {visual.label}
        </Text>
      </View>
      <Text style={styles.macroValueRow} numberOfLines={1}>
        <Text
          style={[styles.macroValue, overflow && { color: OVERFLOW_COLOR }]}
        >
          {Math.round(stat.current)}
        </Text>
        <Text style={styles.macroTarget}>/{stat.target}g</Text>
      </Text>
    </View>
  );
});

export const CompactDietCard: React.FC<CompactDietCardProps> = ({
  calories,
  protein,
  carbs,
  fat,
  fiber,
  onViewToday,
  testID,
}) => {
  const calorieOverflow =
    calories.target > 0 && calories.current > calories.target;
  const remaining = calories.target
    ? Math.max(0, calories.target - calories.current)
    : 0;
  const ringSize = rw(108);

  return (
    <View style={styles.section}>
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="md"
        borderRadius="xl"
      >
        <View style={styles.body}>
          {/* Calorie ring — left column */}
          <View style={styles.ringColumn}>
            <CalorieArc
              consumed={calories.current}
              target={calories.target}
              size={ringSize}
              strokeWidth={rw(10)}
            >
              <View style={styles.ringCenter}>
                <Text
                  style={[
                    styles.ringValue,
                    calorieOverflow && { color: OVERFLOW_COLOR },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {calorieOverflow
                    ? `+${Math.round(calories.current - calories.target)}`
                    : remaining}
                </Text>
                <Text style={styles.ringLabel} numberOfLines={1}>
                  {calorieOverflow ? "Over" : "kcal left"}
                </Text>
                <Text style={styles.ringTarget} numberOfLines={1}>
                  of {calories.target}
                </Text>
              </View>
            </CalorieArc>
          </View>

          {/* Right column: consumed label + macro pills + CTA */}
          <View style={styles.rightColumn}>
            <View style={styles.consumedHeader}>
              <Text style={styles.consumedLabel}>Today</Text>
              <Text style={styles.consumedValue} numberOfLines={1}>
                <Text style={styles.consumedNumber}>
                  {Math.round(calories.current)}
                </Text>
                <Text style={styles.consumedUnit}> / {calories.target} kcal</Text>
              </Text>
            </View>

            <View style={styles.macroRow}>
              <MacroPill stat={protein} visual={MACRO_VISUALS.protein} />
              <MacroPill stat={carbs} visual={MACRO_VISUALS.carbs} />
              <MacroPill stat={fat} visual={MACRO_VISUALS.fat} />
              <MacroPill stat={fiber} visual={MACRO_VISUALS.fiber} />
            </View>

            <AnimatedPressable
              onPress={onViewToday}
              scaleValue={0.97}
              springConfig="smooth"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel="View today's meals"
              accessibilityHint="Opens the list of today's meals"
              testID={testID}
              style={styles.viewTodayButton}
            >
              <Text style={styles.viewTodayText}>View Today</Text>
              <Ionicons
                name="chevron-forward"
                size={rf(14)}
                color={colors.text}
              />
            </AnimatedPressable>
          </View>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  body: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
  },
  ringColumn: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringCenter: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringValue: {
    fontSize: fontSize.xl,
    fontWeight: "800" as const,
    color: colors.primary,
  },
  ringLabel: {
    fontSize: rf(10),
    color: colors.textSecondary,
    marginTop: 2,
  },
  ringTarget: {
    fontSize: rf(10),
    color: colors.textMuted,
  },
  rightColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  consumedHeader: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    justifyContent: "space-between" as const,
  },
  consumedLabel: {
    fontSize: fontSize.sm,
    fontWeight: "700" as const,
    color: colors.text,
  },
  consumedValue: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  consumedNumber: {
    fontSize: fontSize.sm,
    fontWeight: "700" as const,
    color: colors.text,
  },
  consumedUnit: {
    color: colors.textMuted,
  },
  macroRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: rp(6),
  },
  macroPill: {
    flex: 1,
    minWidth: rw(64),
    borderRadius: rbr(borderRadius.md),
    paddingHorizontal: rp(8),
    paddingVertical: rp(6),
    gap: 2,
  },
  macroPillHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  macroDot: {
    width: rw(7),
    height: rh(7),
    borderRadius: rbr(4),
  },
  macroLabel: {
    fontSize: rf(10),
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  macroValueRow: {
    fontSize: rf(11),
  },
  macroValue: {
    fontSize: rf(11),
    fontWeight: "700" as const,
    color: colors.text,
  },
  macroTarget: {
    fontSize: rf(10),
    color: colors.textMuted,
  },
  viewTodayButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.xs,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    borderRadius: rbr(borderRadius.lg),
    paddingVertical: rp(8),
    marginTop: 2,
    minHeight: 44,
  },
  viewTodayText: {
    fontSize: fontSize.sm,
    fontWeight: "700" as const,
    color: colors.text,
  },
});

export default CompactDietCard;
