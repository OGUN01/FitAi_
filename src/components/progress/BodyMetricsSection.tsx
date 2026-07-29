/**
 * BodyMetricsSection - Aurora 2026
 *
 * 2x2 stat tiles on surface.1, hairline borders, Manrope type,
 * no drop shadows. Trend icons + goal progress bars.
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, DimensionValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { rf } from "../../utils/responsive";
import {
  colors,
  surface,
  border as borderTokens,
  chart,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

interface BodyMetricsSectionProps {
  stats: any;
  progressEntries: any[];
}

interface StatCardProps {
  label: string;
  value: string | number;
  unit: string;
  change: number | null;
  trend: string;
  index: number;
  goalLabel?: string;
  progressPct?: number;
  accent?: string;
  footnote?: { icon: keyof typeof Ionicons.glyphMap; text: string };
}

const renderChangeText = (change: number | null, unit: string) => {
  if (change === null) return "--";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)} ${unit}`;
};

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  change,
  trend,
  index,
  goalLabel,
  progressPct,
  accent = chart[1],
  footnote,
}) => {
  const hasChange = change !== null && change !== 0;
  const trendIcon =
    trend === "stable" ? null : trend === "decreasing"
      ? "trending-down-outline"
      : "trending-up-outline";
  const trendColor =
    trend === "decreasing" ? colors.success.DEFAULT : colors.error.DEFAULT;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).duration(280)}
      style={styles.statCard}
    >
      <View style={styles.statHeader}>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{value ?? "--"}</Text>
          <Text style={styles.statUnit}>{unit}</Text>
        </View>
        {trendIcon && (
          <Ionicons name={trendIcon} size={rf(16)} color={trendColor} />
        )}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      {hasChange && (
        <Text
          style={[
            styles.statChange,
            (change ?? 0) < 0
              ? styles.statChangePositive
              : styles.statChangeNegative,
          ]}
        >
          {renderChangeText(change, unit)}
        </Text>
      )}
      {footnote && (
        <View style={styles.statFootnote}>
          <Ionicons
            name={footnote.icon}
            size={rf(12)}
            color={colors.text.secondary}
            style={{ marginRight: spacing.xs }}
          />
          <Text style={styles.statFootnoteText}>{footnote.text}</Text>
        </View>
      )}
      {goalLabel != null && progressPct != null && (
        <View style={styles.goalBlock}>
          <Text style={styles.goalText}>{goalLabel}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progressPct)}%`, backgroundColor: accent },
              ]}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
};

export const BodyMetricsSection: React.FC<BodyMetricsSectionProps> = ({
  stats,
  progressEntries,
}) => {
  const weightProgressPct: number | undefined = useMemo(() => {
    const current = Number(stats.weight.current);
    const goal = Number(stats.weight.goal);
    if (current <= 0 || !isFinite(current)) return 0;
    const raw = ((current - goal) / current) * 100 + 50;
    const clamped = Math.max(0, Math.min(100, isFinite(raw) ? raw : 0));
    return clamped;
  }, [stats.weight.current, stats.weight.goal]);

  const manualDate = progressEntries[0]?.entry_date;
  const manualFootnote = (date?: string) =>
    date
      ? {
          icon: "create-outline" as keyof typeof Ionicons.glyphMap,
          text: `Manual • ${formatDate(date)}`,
        }
      : undefined;

  const hasData =
    !!stats.weight.current || !!stats.bodyFat.current || !!stats.muscle.current;

  return (
    <Animated.View
      entering={FadeInDown.delay(120).duration(300)}
      style={styles.section}
    >
      <Text style={styles.sectionTitle}>Body Metrics</Text>

      {!hasData ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="body-outline"
            size={rf(32)}
            color={colors.text.secondary}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>Start tracking to see progress</Text>
          <Text style={styles.emptySubtitle}>
            Log your weight and body metrics
          </Text>
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <StatCard
            index={0}
            label="Weight"
            value={
              stats.weight.current && stats.weight.current > 0
                ? stats.weight.current
                : "--"
            }
            unit={stats.weight.unit}
            change={stats.weight.change}
            trend={stats.weight.trend}
            goalLabel={
              stats.weight.goal ? `Goal: ${stats.weight.goal}${stats.weight.unit}` : undefined
            }
            progressPct={stats.weight.goal ? weightProgressPct : undefined}
            footnote={stats.weight.current ? manualFootnote(manualDate) : undefined}
          />
          <StatCard
            index={1}
            label="Body Fat"
            value={
              stats.bodyFat.current && stats.bodyFat.current > 0
                ? stats.bodyFat.current
                : "--"
            }
            unit={stats.bodyFat.unit}
            change={stats.bodyFat.change}
            trend={stats.bodyFat.trend}
            footnote={stats.bodyFat.current ? manualFootnote(manualDate) : undefined}
          />
          <StatCard
            index={2}
            label="Muscle Mass"
            value={
              stats.muscle.current && stats.muscle.current > 0
                ? stats.muscle.current
                : "--"
            }
            unit={stats.muscle.unit}
            change={stats.muscle.change}
            trend={stats.muscle.trend}
            footnote={stats.muscle.current ? manualFootnote(manualDate) : undefined}
          />
          <StatCard
            index={3}
            label="Body Mass Index"
            value={
              stats.bmi.current && stats.bmi.current > 0
                ? Number(stats.bmi.current).toFixed(1)
                : "--"
            }
            unit="BMI"
            change={null}
            trend="stable"
            footnote={
              stats.bmi.current
                ? { icon: "calculator-outline" as keyof typeof Ionicons.glyphMap, text: "Calculated" }
                : undefined
            }
          />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  emptyCard: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    padding: spacing.lg,
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  emptyIcon: {
    marginBottom: spacing.sm,
    opacity: 0.6,
  },
  emptyTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.variants.body,
    color: colors.text.secondary,
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: spacing.md,
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xxs,
  },
  statValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  statUnit: {
    ...typography.variants.caption2,
    color: colors.text.muted,
    marginBottom: 2,
  },
  statLabel: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  statChange: {
    ...typography.variants.caption,
    fontFamily: "Manrope_500Medium",
    marginBottom: spacing.xs,
  },
  statChangePositive: {
    color: colors.success.DEFAULT,
  },
  statChangeNegative: {
    color: colors.error.DEFAULT,
  },
  statFootnote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  statFootnoteText: {
    ...typography.variants.caption,
    color: colors.text.secondary,
  },
  goalBlock: {
    marginTop: spacing.sm,
  },
  goalText: {
    ...typography.variants.caption,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: surface[2],
    borderRadius: borderRadius.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: borderRadius.sm,
  },
});

export default BodyMetricsSection;
