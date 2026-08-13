/**
 * MetricSummaryGrid Component
 * 2x2 clean stat layout — one surface.1 panel with hairline dividers,
 * big Manrope_700Bold numbers, no cards-in-cards (Aurora 2026).
 */

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { DialogShell } from "../../../components/ui/CustomDialog";
import {
  surface,
  border as borderTokens,
  chart,
  colors,
  typography,
  spacing,
  borderRadius,
  flatColors,
} from "../../../theme/aurora-tokens";
import { rf, rw, rh, rp } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";
import { type WeightUnit, toDisplayWeight } from "../../../utils/units";
import { SectionHeader } from "./SectionHeader";
import { getMetricDescription, METRIC_DESCRIPTIONS } from "../../../constants/metricDescriptions";

type MetricDescriptionKey = keyof typeof METRIC_DESCRIPTIONS;

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
  weightUnit?: WeightUnit;
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
  infoKey?: MetricDescriptionKey;
  onInfoPress?: (key: MetricDescriptionKey) => void;
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
  infoKey,
  onInfoPress,
}) => {
  const isInteractive = Boolean(onPress || (metricId && onMetricPress));

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
        onPress={
          isInteractive
            ? () => {
                if (metricId && onMetricPress) {
                  onMetricPress(metricId);
                } else {
                  onPress?.();
                }
              }
            : undefined
        }
        scaleValue={isInteractive ? 0.97 : 1}
        hapticFeedback={isInteractive}
        hapticType="light"
        style={styles.cellPressable}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${value}${trendValue ? `, ${trendValue}` : subtitle ? `, ${subtitle}` : ""}`}
      >
        <View style={styles.cellContent}>
          <View style={styles.cellHeader}>
            <View
              style={[styles.iconWrap, { backgroundColor: hexToRgba(color, 0.14) }]}
            >
              <Ionicons name={icon} size={rf(16)} color={color} />
            </View>
            <Text style={styles.cellLabel} numberOfLines={1}>{title}</Text>
            {infoKey && onInfoPress ? (
              <TouchableOpacity
                onPress={() => onInfoPress(infoKey)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.infoButton}
                accessibilityRole="button"
                accessibilityLabel={`What is ${title}?`}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={rf(14)}
                  color={colors.text.muted}
                />
              </TouchableOpacity>
            ) : null}
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
  weightUnit = "kg",
}) => {
  // Tap-to-info: BMI/BMR/TDEE/Water Goal cells open a sheet explaining the
  // metric, sourced from the shared metricDescriptions constant.
  const [infoMetric, setInfoMetric] = useState<MetricDescriptionKey | null>(null);
  const handleInfoPress = useCallback((key: MetricDescriptionKey) => {
    setInfoMetric(key);
  }, []);
  const closeInfo = useCallback(() => setInfoMetric(null), []);
  const activeInfo = infoMetric ? getMetricDescription(infoMetric) : null;

  // Stored values are metric (kg) — convert to the user's display unit.
  const formatWeight = (weight?: number) => {
    if (weight === undefined || weight === null) return "--";
    if (weight === 0) return "--"; // 0 kg is invalid weight, treat as no data
    const display = toDisplayWeight(weight, weightUnit);
    return display != null ? display.toFixed(1) : "--";
  };

  const formatWeightChange = (change: number) => {
    const display = toDisplayWeight(Math.abs(change), weightUnit);
    if (display == null) return undefined;
    return `${change > 0 ? "+" : "-"}${display.toFixed(1)} ${weightUnit}`;
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
                ? formatWeightChange(data.weight.change)
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
                      ? "Below typical range"
                      : data.bmi < 25
                        ? "Typical range"
                        : data.bmi < 30
                          ? "Above typical range"
                          : "Well above typical range"
                    : undefined
                }
                icon="body-outline"
                color={chart[4]}
                delay={320}
                metricId="bmi"
                onMetricPress={onMetricPress}
                infoKey="BMI"
                onInfoPress={handleInfoPress}
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
                infoKey="BMR"
                onInfoPress={handleInfoPress}
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
                infoKey="TDEE"
                onInfoPress={handleInfoPress}
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
                infoKey="WATER"
                onInfoPress={handleInfoPress}
              />
            </View>
          </View>
        </>
      )}

      {/* Metric info sheet — explains what BMI/BMR/TDEE/Water Goal mean. */}
      <DialogShell visible={!!activeInfo} animationType="fade" onRequestClose={closeInfo} bare>
        <View style={styles.infoOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeInfo}
            accessibilityRole="button"
            accessibilityLabel="Dismiss metric information"
          />
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoTitle}>{activeInfo?.title}</Text>
              <TouchableOpacity
                onPress={closeInfo}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={rf(22)} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoDescription}>{activeInfo?.description}</Text>
          </View>
        </View>
      </DialogShell>
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
    borderRadius: borderRadius.card,
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
  infoButton: {
    justifyContent: "center",
    alignItems: "center",
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
  infoOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: flatColors.overlay,
  },
  infoCard: {
    width: "100%",
    maxWidth: rw(420),
    backgroundColor: surface[2],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: borderTokens.DEFAULT,
    padding: spacing.lg,
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  infoTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
    flex: 1,
  },
  infoDescription: {
    ...typography.variants.body,
    color: colors.text.secondary,
    lineHeight: rf(20),
  },
});

export default MetricSummaryGrid;
