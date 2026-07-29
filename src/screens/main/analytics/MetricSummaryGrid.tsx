/**
 * MetricSummaryGrid Component
 * 2x2 clean stat layout — one surface.1 panel with hairline dividers,
 * big Manrope_700Bold numbers, no cards-in-cards (Aurora 2026).
 */

import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import {
  surface,
  border as borderTokens,
  chart,
  colors,
  typography,
  spacing,
} from "../../../theme/aurora-tokens";
import { rf, rw, rh, rp } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";
import { SectionHeader } from "../home/SectionHeader";

export interface MetricData {
  weight?: {
    current: number;
    change?: number;
    trend?: "up" | "down" | "stable";
    target?: number;
    hasTrendData?: boolean;
  };
  calories?: {
    consumed: number;
    target?: number;
    change?: number;
    trend?: "up" | "down" | "stable";
    period?: string;
    hasData?: boolean;
  };
  workouts?: {
    count: number;
    change?: number;
    trend?: "up" | "down" | "stable";
  };
  streak?: {
    days: number;
    isActive: boolean;
  };
  // Health metrics from onboarding calculations
  bmi?: number | null;
  bmr?: number | null;
  tdee?: number | null;
  dailyWater?: number | null;
}

import { Period } from "./PeriodSelector";

interface MetricSummaryGridProps {
  data: MetricData;
  period: Period;
  onMetricPress?: (metric: string) => void;
}

// Single stat cell — lives inside the shared surface panel (depth 1).
const StatCell: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  delay?: number;
  onPress?: () => void;
  metricId?: string;
  onMetricPress?: (metric: string) => void;
}> = React.memo(({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  trendValue,
  delay = 0,
  onPress,
  metricId,
  onMetricPress,
}) => {
  const getTrendIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (trend) {
      case "up":
        return "trending-up";
      case "down":
        return "trending-down";
      default:
        return "remove";
    }
  };

  const getTrendColor = () => {
    // For weight, down is good. For others, up is good.
    if (title.toLowerCase().includes("weight")) {
      return trend === "down"
        ? chart[4]
        : trend === "up"
          ? chart[6]
          : chart[3];
    }
    return trend === "up"
      ? chart[4]
      : trend === "down"
        ? chart[6]
        : chart[3];
  };

  return (
    <Animated.View
      entering={
        Platform.OS !== "web" ? FadeInDown.delay(delay).duration(300) : undefined
      }
      style={styles.cellWrapper}
    >
      <AnimatedPressable
        onPress={() => {
          if (metricId && onMetricPress) {
            onMetricPress(metricId);
          } else {
            onPress?.();
          }
        }}
        scaleValue={0.97}
        hapticFeedback={true}
        hapticType="light"
        style={styles.cellPressable}
      >
        <View style={styles.cellContent}>
          <View style={styles.cellHeader}>
            <View
              style={[styles.iconWrap, { backgroundColor: hexToRgba(color, 0.14) }]}
            >
              <Ionicons name={icon} size={rf(16)} color={color} />
            </View>
            <Text style={styles.cellLabel} numberOfLines={1}>{title}</Text>
          </View>

          <Text
            style={[
              styles.cellValue,
              { color: value === "--" ? colors.text.muted : colors.text.primary },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {value}
          </Text>

          {trend && trendValue ? (
            <View style={styles.trendRow}>
              <Ionicons
                name={getTrendIcon()}
                size={rf(12)}
                color={getTrendColor()}
              />
              <Text
                style={[styles.trendText, { color: getTrendColor() }]}
                numberOfLines={1}
              >
                {trendValue}
              </Text>
            </View>
          ) : subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
});

export const MetricSummaryGrid: React.FC<MetricSummaryGridProps> = React.memo(({
  data,
  period,
  onMetricPress,
}) => {
  const formatWeight = (weight?: number) => {
    if (weight === undefined || weight === null) return "--";
    if (weight === 0) return "--"; // 0 kg is invalid weight, treat as no data
    return weight.toFixed(1);
  };

  const formatCalories = (calories?: number) => {
    if (calories === undefined || calories === null) return "--";
    // 0 calories is valid (nothing logged yet today), but show as "0" not "--"
    return calories >= 1000
      ? `${(calories / 1000).toFixed(1)}K`
      : calories.toString();
  };

  // Determine streak message based on actual streak days
  const getStreakMessage = () => {
    const days = data.streak?.days; // NO FALLBACK
    if (days === undefined) return "No data";
    if (days === 0) return "Start today!";
    if (days >= 30) return "On fire!";
    if (days >= 14) return "Amazing!";
    if (days >= 7) return "Keep it up!";
    if (days >= 3) return "Great start!";
    return "Building!";
  };

  // Only show sparklines if we have real data
  const hasWeightTrendData = Boolean(
    data.weight?.hasTrendData && data.weight?.change !== undefined,
  );
  const hasCaloriesData = Boolean(data.calories?.hasData);
  const hasWorkoutsData =
    data.workouts?.count !== undefined && data.workouts.count > 0;

  const hasHealthMetrics = Boolean(
    data.bmi || data.bmr || data.tdee || data.dailyWater,
  );

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <SectionHeader
        title="This Period"
        icon="stats-chart"
        iconColor={chart[1]}
      />

      {/* Single surface panel: 2x2 stats with hairline dividers */}
      <View style={styles.panel}>
        <View style={styles.row}>
          <StatCell
            title="Weight"
            value={formatWeight(data.weight?.current)}
            icon="scale-outline"
            color={chart[1]}
            trend={hasWeightTrendData ? data.weight?.trend : undefined}
            trendValue={
              hasWeightTrendData &&
              data.weight?.change !== undefined &&
              data.weight.change !== 0
                ? `${data.weight.change > 0 ? "+" : ""}${data.weight.change.toFixed(1)} kg`
                : undefined
            }
            subtitle={!hasWeightTrendData ? "Log again to see trend" : undefined}
            delay={0}
            metricId="weight"
            onMetricPress={onMetricPress}
          />
          <View style={styles.vDivider} />
          <StatCell
            title="Calories"
            value={hasCaloriesData ? formatCalories(data.calories?.consumed) : "--"}
            subtitle={!hasCaloriesData ? "Log meals to track" : `This ${(data.calories?.period || period).charAt(0).toUpperCase() + (data.calories?.period || period).slice(1)}`}
            icon="flame-outline"
            color={chart[5]}
            trend={
              hasCaloriesData && data.calories?.change !== undefined
                ? data.calories?.trend
                : undefined
            }
            trendValue={
              hasCaloriesData && data.calories?.change !== undefined
                ? `${data.calories.change > 0 ? "+" : ""}${data.calories.change}%`
                : undefined
            }
            delay={80}
            metricId="calories"
            onMetricPress={onMetricPress}
          />
        </View>

        <View style={styles.hDivider} />

        <View style={styles.row}>
          <StatCell
            title="Workouts"
            value={data.workouts?.count?.toString() || "0"}
            subtitle={`This ${period.charAt(0).toUpperCase() + period.slice(1)}`}
            icon="barbell-outline"
            color={chart[2]}
            trend={hasWorkoutsData ? data.workouts?.trend : undefined}
            trendValue={
              hasWorkoutsData && data.workouts?.change
                ? `${data.workouts.change > 0 ? "+" : ""}${data.workouts.change}`
                : undefined
            }
            delay={160}
            metricId="workouts"
            onMetricPress={onMetricPress}
          />
          <View style={styles.vDivider} />
          <StatCell
            title="Day Streak"
            value={data.streak?.days?.toString() ?? "--"}
            subtitle={getStreakMessage()}
            icon="flame"
            color={chart[6]}
            delay={240}
            metricId="streak"
            onMetricPress={onMetricPress}
          />
        </View>
      </View>

      {/* Health Metrics Section - from onboarding calculations */}
      {hasHealthMetrics && (
        <>
          <SectionHeader
            title="Health Metrics"
            icon="fitness-outline"
            iconColor={chart[4]}
          />

          <View style={styles.panel}>
            <View style={styles.row}>
              <StatCell
                title="BMI"
                value={data.bmi ? data.bmi.toFixed(1) : "--"}
                subtitle={
                  data.bmi
                    ? data.bmi < 18.5
                      ? "Underweight"
                      : data.bmi < 25
                        ? "Normal"
                        : data.bmi < 30
                          ? "Overweight"
                          : "Obese"
                    : undefined
                }
                icon="body-outline"
                color={chart[4]}
                delay={320}
                metricId="bmi"
                onMetricPress={onMetricPress}
              />
              <View style={styles.vDivider} />
              <StatCell
                title="BMR"
                value={data.bmr ? `${Math.round(data.bmr)}` : "--"}
                subtitle="cal/day"
                icon="pulse-outline"
                color={chart[6]}
                delay={400}
                metricId="bmr"
                onMetricPress={onMetricPress}
              />
            </View>

            <View style={styles.hDivider} />

            <View style={styles.row}>
              <StatCell
                title="TDEE"
                value={data.tdee ? `${Math.round(data.tdee)}` : "--"}
                subtitle="cal/day"
                icon="flash-outline"
                color={chart[5]}
                delay={480}
                metricId="tdee"
                onMetricPress={onMetricPress}
              />
              <View style={styles.vDivider} />
              <StatCell
                title="Water Goal"
                value={
                  data.dailyWater
                    ? `${(data.dailyWater / 1000).toFixed(1)}L`
                    : "--"
                }
                subtitle="daily target"
                icon="water-outline"
                color={chart[2]}
                delay={560}
                metricId="water"
                onMetricPress={onMetricPress}
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
    zIndex: 3,
  },
  panel: {
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  vDivider: {
    width: 1,
    backgroundColor: borderTokens.subtle,
  },
  hDivider: {
    height: 1,
    backgroundColor: borderTokens.subtle,
  },
  cellWrapper: {
    flex: 1,
    minWidth: 0,
  },
  cellPressable: {
    flex: 1,
  },
  cellContent: {
    alignItems: "flex-start",
    justifyContent: "center",
    padding: spacing.md,
    minHeight: rh(112),
  },
  cellHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(8),
    justifyContent: "center",
    alignItems: "center",
  },
  cellLabel: {
    fontFamily: typography.variants.caption2.fontFamily,
    fontSize: rf(13),
    color: colors.text.secondary,
    flexShrink: 1,
  },
  cellValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(28),
    letterSpacing: -0.5,
    marginBottom: rp(2),
  },
  subtitleText: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: rf(12),
    color: colors.text.secondary,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(3),
  },
  trendText: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: rf(12),
  },
});

export default MetricSummaryGrid;
