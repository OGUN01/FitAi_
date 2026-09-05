import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  surface,
  border,
  chart,
  chartText,
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";
import { CalculatedMetrics } from "../../../hooks/useCalculatedMetrics";
import { getWeightGoalProgress } from "../../../components/progress/goalProgressUtils";
import { type WeightUnit, toDisplayWeight } from "../../../utils/units";
import type { PersonalInfoData, BodyAnalysisData } from "../../../types/onboarding";
import type { ProjectGoalResult } from "../../../services/energy/projection";

// Hermes-safe month names (no Intl dependency) — matches projection.ts.
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function formatProjectionRange(earliest: Date, latest: Date): string {
  return `${MONTHS[earliest.getMonth()]} ${earliest.getFullYear()} – ${MONTHS[latest.getMonth()]} ${latest.getFullYear()}`;
}

function formatConfidenceLabel(p: ProjectGoalResult): string {
  const bandWord =
    p.band === "safe"
      ? "Safe rate"
      : p.band === "aggressive"
        ? "Aggressive rate"
        : "Unpredictable rate";
  const confWord =
    p.confidence === "observed"
      ? `${p.weighInsUsed} weigh-ins (observed trend)`
      : p.confidence === "blended"
        ? `${p.weighInsUsed} weigh-ins (blended)`
        : `Plan estimate (need 3+ weigh-ins)`;
  return `${bandWord} · ${confWord}`;
}

interface GoalProgressCardProps {
  calculatedMetrics: CalculatedMetrics | null;
  profilePersonalInfo?: PersonalInfoData | null;
  bodyAnalysis?: BodyAnalysisData | null;
  weightHistory?: Array<{ date: string; weight: number }>;
  unit?: WeightUnit;
  /** Phase D: honest projection (eta range, band, confidence) from
   *  useGoalProjection. Omitted on screens that don't wire it. */
  projection?: ProjectGoalResult | null;
  /** Phase D: "what would close the gap" hint from useGoalProjection. */
  gapHint?: string;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = React.memo(({
  calculatedMetrics,
  profilePersonalInfo: _profilePersonalInfo,
  bodyAnalysis,
  weightHistory = [],
  unit = "kg",
  projection = null,
  gapHint = "",
}) => {
  const { weightProgressPercent, hasStartWeight } = useMemo(() => {
    const { weightProgress } = getWeightGoalProgress({
      currentWeightKg: calculatedMetrics?.currentWeightKg ?? null,
      targetWeightKg: calculatedMetrics?.targetWeightKg ?? null,
      weightHistory,
      // Real onboarding start weight only — falling back to currentWeightKg
      // pins start === current and the bar at a permanent 0%.
      fallbackStartWeightKg: bodyAnalysis?.current_weight_kg ?? null,
      weeklyRateKg: calculatedMetrics?.weeklyWeightLossRate ?? null,
      targetTimelineWeeks: calculatedMetrics?.targetTimelineWeeks ?? null,
    });
    const percent = weightProgress != null ? Math.round(weightProgress * 100) : 0;
    const startKnown =
      weightHistory.some((entry) => Number.isFinite(entry.weight)) ||
      bodyAnalysis?.current_weight_kg != null;
    return { weightProgressPercent: percent, hasStartWeight: startKnown };
  }, [
    calculatedMetrics?.currentWeightKg,
    calculatedMetrics?.targetWeightKg,
    calculatedMetrics?.weeklyWeightLossRate,
    calculatedMetrics?.targetTimelineWeeks,
    bodyAnalysis?.current_weight_kg,
    weightHistory,
  ]);

  const hasWeightGoal =
    calculatedMetrics?.targetWeightKg != null &&
    calculatedMetrics?.currentWeightKg != null;
  const hasCalorieTarget =
    calculatedMetrics?.dailyCalories != null && calculatedMetrics.dailyCalories > 0;
  const isEmpty = !hasWeightGoal && !hasCalorieTarget;

  return (
    <Animated.View
      entering={FadeInDown.delay(400).duration(400)}
      style={styles.panel}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${chart[1]}18` }]}>
          <Ionicons name="flag-outline" size={rf(18)} color={chart[1]} />
        </View>
        {/* Distinct title from components/progress/GoalProgressSection
            (shown on ProgressScreen) — that section tracks Weight +
            Workouts This Week, this card tracks Weight + Daily Calorie
            Target. Disambiguates the two "Goal Progress" widgets without
            changing either's data contract or visual language. */}
        <Text style={styles.title} numberOfLines={1}>
          Nutrition & Weight Goals
        </Text>
      </View>

      {hasWeightGoal && (
        <View style={styles.goalItem}>
          <View style={styles.goalLabelRow}>
            <Text style={styles.goalLabel} numberOfLines={1}>
              Weight Goal
            </Text>
            {hasStartWeight && (
              <Text style={styles.goalPercent} numberOfLines={1}>
                {Math.min(100, weightProgressPercent)}%
              </Text>
            )}
          </View>
          {hasStartWeight && (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, weightProgressPercent)}%`,
                    backgroundColor: chart[1],
                  },
                ]}
              />
            </View>
          )}
          <Text style={styles.goalText} numberOfLines={1} adjustsFontSizeToFit>
            {(() => {
              const displayCurrent = toDisplayWeight(
                calculatedMetrics!.currentWeightKg!,
                unit,
              );
              const displayTarget = toDisplayWeight(
                calculatedMetrics!.targetWeightKg!,
                unit,
              );
              return displayCurrent != null &&
                displayTarget != null &&
                calculatedMetrics!.currentWeightKg! > 0
                ? `${displayCurrent.toFixed(1)} ${unit} → ${displayTarget.toFixed(1)} ${unit}`
                : `-- ${unit} → -- ${unit}`;
            })()}
          </Text>
          {!hasStartWeight && (
            <Text style={styles.goalSubtext} numberOfLines={1}>
              Log a weigh-in to start tracking progress
            </Text>
          )}
        </View>
      )}

      {hasCalorieTarget && (
        <View style={styles.goalItem}>
          <Text style={styles.goalLabel} numberOfLines={1}>
            Daily Calorie Target
          </Text>
          <Text style={[styles.goalValue, { color: chart[5] }]} numberOfLines={1} adjustsFontSizeToFit>
            {calculatedMetrics!.dailyCalories!.toLocaleString()} kcal/day
          </Text>
        </View>
      )}

      {projection && (
        <View style={styles.goalItem}>
          <Text style={styles.goalLabel} numberOfLines={1}>
            Goal Projection
          </Text>
          {projection.etaEarliest && projection.etaLatest ? (
            <Text style={styles.goalValue} numberOfLines={2}>
              {formatProjectionRange(
                projection.etaEarliest,
                projection.etaLatest,
              )}
            </Text>
          ) : (
            <Text style={styles.goalSubtext} numberOfLines={3}>
              {projection.label}
            </Text>
          )}
          <Text style={styles.bandLabel} numberOfLines={1}>
            {formatConfidenceLabel(projection)}
          </Text>
          {!!gapHint && (
            <Text style={styles.gapHint} numberOfLines={3}>
              {gapHint}
            </Text>
          )}
        </View>
      )}

      {isEmpty && (
        <View style={styles.emptyState}>
          <Ionicons
            name="compass-outline"
            size={rf(28)}
            color={colors.text.muted}
          />
          <Text style={styles.emptyStateValue} numberOfLines={1}>
            --
          </Text>
          <Text style={styles.emptyStateText} numberOfLines={2}>
            Set goals in Profile to track progress
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  panel: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  iconWrap: {
    width: rf(36),
    height: rf(36),
    borderRadius: rf(10),
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
  },
  goalItem: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  goalLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalLabel: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
  goalPercent: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(14),
    color: chart[1],
  },
  progressTrack: {
    height: 8,
    backgroundColor: surface[2],
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  goalText: {
    ...typography.variants.body,
    color: colors.text.primary,
  },
  goalSubtext: {
    ...typography.variants.caption2,
    color: colors.text.muted,
  },
  goalValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(18),
    letterSpacing: -0.3,
  },
  bandLabel: {
    ...typography.variants.caption2,
    color: colors.text.muted,
    marginTop: 2,
  },
  gapHint: {
    ...typography.variants.caption2,
    // chart[3] fails WCAG AA (3.4:1) at this text size on surface[1] —
    // chartText[3] is the same hue lightened to clear 4.5:1.
    color: chartText[3],
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyStateValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(28),
    color: colors.text.muted,
  },
  emptyStateText: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    textAlign: "center",
  },
});
