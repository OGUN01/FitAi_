/**
 * NutritionInsightsPanel — the WeeklyInsightsPanel replacement for the Meal
 * Builder. Three sections, each mapped from a real existing piece rather
 * than a muscle-balance analogue that doesn't apply:
 *
 *  1. Goal projection, as a sentence, not a card. Sits directly on the
 *     background, TodayHero-style: a coach line built from
 *     customDietProjection's weeklyRateKg / projectedDateLabel. When the
 *     direction guard fires, this becomes a plain warning line instead of a
 *     date — never a confident wrong number.
 *  2. A small ConcentricRings (reused directly) showing the selected day's
 *     totals vs targets — the exact component already on DietScreen.
 *  3. Macro-adherence bars — CoverageBar's staggered-fill pattern, one row
 *     per macro (Protein/Carbs/Fat/Fiber), amber when under a floor, primary
 *     when on-target, error when over.
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ConcentricRings } from "../ConcentricRings";
import { AuroraSpinner } from "../../ui/aurora/AuroraSpinner";
import { MACRO_PILL_COLORS } from "../macroColors";
import type { CustomDietProjectionResult } from "../../../services/validation/customDietProjection";
import {
  colors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf } from "../../../utils/responsive";

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface NutritionInsightsPanelProps {
  projection: CustomDietProjectionResult | null;
  isComputingProjection: boolean;
  selectedDayTotals: NutritionTotals;
  targets: NutritionTotals;
  testID?: string;
}

function projectionSentence(projection: CustomDietProjectionResult | null): {
  text: string;
  isWarning: boolean;
} {
  if (!projection) {
    return { text: "Add foods to see your goal projection.", isWarning: false };
  }
  const directionConflict = projection.warnings.some((w) => w.code === "GOAL_DIRECTION_CONFLICT");
  if (directionConflict) {
    const conflictWarning = projection.warnings.find((w) => w.code === "GOAL_DIRECTION_CONFLICT");
    return {
      text: conflictWarning?.message ?? "This plan doesn't move you toward your goal.",
      isWarning: true,
    };
  }
  if (projection.goalDirection === "maintain") {
    return { text: "This plan is set to maintain your current weight.", isWarning: false };
  }
  // projectionLabel now carries the range ("Month Year – Month Year") when a
  // date is shown, OR projectGoal's honest deferred/no-progress sentence when
  // one isn't (aggressive plans get no date until 3+ weigh-ins). Adopted from
  // the unified engine so the diet builder matches the workout side.
  if (projection.projectionLabel) {
    if (projection.projectedDate) {
      // Date-bearing label — frame it as a pace sentence.
      return {
        text: `At this pace, you'll reach your goal weight by ${projection.projectionLabel}.`,
        isWarning: false,
      };
    }
    // No date — the label itself is the honest message (deferred / neutral).
    return { text: projection.projectionLabel, isWarning: false };
  }
  return {
    text: "Keep building your plan — a projection will appear once your daily calories are set.",
    isWarning: false,
  };
}

function bandColor(current: number, target: number): string {
  if (target <= 0) return colors.text.tertiary;
  const ratio = current / target;
  if (ratio < 0.85) return colors.warning.DEFAULT;
  if (ratio > 1.15) return colors.error.DEFAULT;
  return colors.primary.DEFAULT;
}

interface MacroBarData {
  key: "protein" | "carbs" | "fat" | "fiber";
  label: string;
  current: number;
  target: number;
  color: string;
  swatch: string;
}

const MacroAdherenceBar: React.FC<{ bar: MacroBarData; index: number }> = ({ bar, index }) => {
  const progress = useSharedValue(0);
  const percentage = bar.target > 0 ? Math.min(100, (bar.current / bar.target) * 100) : 0;

  useEffect(() => {
    progress.value = withDelay(
      index * 150,
      withTiming(percentage, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [percentage, index, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View style={styles.coverageRow}>
      <View style={styles.coverageHeader}>
        <View style={styles.coverageLabelRow}>
          <View style={[styles.swatch, { backgroundColor: bar.swatch }]} />
          <Text style={styles.coverageLabel}>{bar.label}</Text>
        </View>
        <Text style={[styles.coverageValue, { color: bar.color }]}>
          {Math.round(bar.current)}/{Math.round(bar.target)}g
        </Text>
      </View>
      <View style={styles.coverageTrack}>
        <Animated.View style={[styles.coverageFill, fillStyle, { backgroundColor: bar.color }]} />
      </View>
    </View>
  );
};

export const NutritionInsightsPanel: React.FC<NutritionInsightsPanelProps> = ({
  projection,
  isComputingProjection,
  selectedDayTotals,
  targets,
  testID,
}) => {
  const { text: sentence, isWarning } = projectionSentence(projection);

  const macroBars: MacroBarData[] = [
    {
      key: "protein",
      label: "Protein",
      current: selectedDayTotals.protein,
      target: targets.protein,
      color: bandColor(selectedDayTotals.protein, targets.protein),
      swatch: MACRO_PILL_COLORS.protein,
    },
    {
      key: "carbs",
      label: "Carbs",
      current: selectedDayTotals.carbs,
      target: targets.carbs,
      color: bandColor(selectedDayTotals.carbs, targets.carbs),
      swatch: MACRO_PILL_COLORS.carbs,
    },
    {
      key: "fat",
      label: "Fat",
      current: selectedDayTotals.fat,
      target: targets.fat,
      color: bandColor(selectedDayTotals.fat, targets.fat),
      swatch: MACRO_PILL_COLORS.fat,
    },
    {
      key: "fiber",
      label: "Fiber",
      current: selectedDayTotals.fiber,
      target: targets.fiber,
      color: bandColor(selectedDayTotals.fiber, targets.fiber),
      swatch: MACRO_PILL_COLORS.fiber,
    },
  ];

  return (
    <View style={styles.container} testID={testID}>
      {/* Goal projection — hero sentence, no card */}
      <Animated.View entering={FadeInDown.springify()} style={styles.heroSection}>
        <View style={styles.heroHeader}>
          <Ionicons
            name={isWarning ? "warning-outline" : "trending-up-outline"}
            size={rf(16)}
            color={isWarning ? colors.warning.DEFAULT : colors.primary.DEFAULT}
          />
          <Text style={styles.heroEyebrow}>GOAL PROJECTION</Text>
          {isComputingProjection && <AuroraSpinner customSize={rf(12)} theme="primary" />}
        </View>
        <Text style={[styles.heroSentence, isWarning && { color: colors.warning.DEFAULT }]}>
          {sentence}
        </Text>
      </Animated.View>

      {/* Concentric rings — reused directly */}
      <Animated.View entering={FadeInDown.springify().delay(80)} style={styles.ringsSection}>
        <ConcentricRings
          calories={{ current: selectedDayTotals.calories, target: targets.calories }}
          protein={{ current: selectedDayTotals.protein, target: targets.protein }}
          carbs={{ current: selectedDayTotals.carbs, target: targets.carbs }}
          fat={{ current: selectedDayTotals.fat, target: targets.fat }}
        />
      </Animated.View>

      {/* Macro adherence bars */}
      <Animated.View entering={FadeInDown.springify().delay(160)} style={styles.card}>
        <Text style={styles.sectionLabel}>Macro Adherence</Text>
        {macroBars.map((bar, index) => (
          <MacroAdherenceBar key={bar.key} bar={bar} index={index} />
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: rp(spacing.sm) },
  heroSection: {
    paddingHorizontal: rp(spacing.sm),
    marginBottom: rp(spacing.md),
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
  },
  heroEyebrow: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.bold) as any,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroSentence: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.semibold) as any,
    lineHeight: rf(typography.fontSize.h3) * 1.35,
  },
  ringsSection: {
    marginBottom: rp(spacing.md),
  },
  card: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: rp(spacing.md),
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: rp(spacing.sm),
  },
  coverageRow: { marginBottom: rp(spacing.sm) },
  coverageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(spacing.xs),
  },
  coverageLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  swatch: { width: 8, height: 8, borderRadius: 4 },
  coverageLabel: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  coverageValue: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as any,
    fontVariant: ["tabular-nums"],
  },
  coverageTrack: {
    width: "100%",
    height: rp(8),
    backgroundColor: surface[2],
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  coverageFill: { height: "100%", borderRadius: borderRadius.full },
});

export default NutritionInsightsPanel;
