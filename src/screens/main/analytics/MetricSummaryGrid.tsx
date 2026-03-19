/**
 * MetricSummaryGrid Component
 * 2x2 grid of animated metric summary cards
 */

import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh, rp } from "../../../utils/responsive";
import { SectionHeader } from "../home/SectionHeader";

export interface MetricData {
  weight?: {
    current: number;
    change?: number;
    trend?: "up" | "down" | "stable";
    target?: number;
  };
  calories?: {
    consumed: number;
    target?: number;
    change?: number;
    trend?: "up" | "down" | "stable";
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

// Single Metric Card
const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  delay?: number;
  onPress?: () => void;
}> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  trendValue,
  delay = 0,
  onPress,
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
        ? ResponsiveTheme.colors.success
        : trend === "up"
          ? ResponsiveTheme.colors.error
          : ResponsiveTheme.colors.neutral;
    }
    return trend === "up"
      ? ResponsiveTheme.colors.success
      : trend === "down"
        ? ResponsiveTheme.colors.error
        : ResponsiveTheme.colors.neutral;
  };

  return (
    <Animated.View
      entering={
        Platform.OS !== "web" ? FadeInUp.delay(delay).duration(400) : undefined
      }
      style={styles.cardWrapper}
    >
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.97}
        hapticFeedback={true}
        hapticType="light"
        style={styles.cardPressable}
      >
        <GlassCard
          elevation={2}
          blurIntensity="light"
          padding="sm"
          borderRadius="lg"
          style={styles.cardGlass}
        >
          <View style={styles.cardContent}>
            {/* Icon */}
            <View
              style={[styles.iconCircle, { backgroundColor: `${color}20` }]}
            >
              <Ionicons name={icon} size={rf(16)} color={color} />
            </View>

            {/* Value */}
            <Text
              style={[
                styles.metricValue,
                {
                  color:
                    value === "--"
                      ? ResponsiveTheme.colors.textMuted
                      : ResponsiveTheme.colors.text,
                },
              ]}
            >
              {value}
            </Text>

            {/* Label */}
            <Text style={styles.metricLabel}>{title}</Text>

            {/* Subtitle or Trend */}
            {trend && trendValue ? (
              <View style={styles.trendRow}>
                <Ionicons
                  name={getTrendIcon()}
                  size={rf(12)}
                  color={getTrendColor()}
                />
                <Text style={[styles.trendText, { color: getTrendColor() }]}>
                  {trendValue}
                </Text>
              </View>
            ) : subtitle ? (
              <Text style={styles.subtitleText}>{subtitle}</Text>
            ) : null}
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

export const MetricSummaryGrid: React.FC<MetricSummaryGridProps> = ({
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
  const hasWeightHistory =
    data.weight?.current !== undefined && data.weight.current > 0;
  const hasCaloriesData = data.calories?.consumed !== undefined;
  const hasWorkoutsData =
    data.workouts?.count !== undefined && data.workouts.count > 0;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <SectionHeader
        title="This Period"
        icon="stats-chart"
        iconColor={ResponsiveTheme.colors.primary}
      />

      {/* Row 1: Weight + Calories */}
      <View style={styles.row}>
        <MetricCard
          title="Weight"
          value={formatWeight(data.weight?.current)}
          icon="scale-outline"
          color={ResponsiveTheme.colors.primary}
          trend={hasWeightHistory ? data.weight?.trend : undefined}
          trendValue={
            hasWeightHistory &&
            data.weight?.change !== undefined &&
            data.weight.change !== 0
              ? `${data.weight.change > 0 ? "+" : ""}${data.weight.change.toFixed(1)} kg`
              : undefined
          }
          delay={0}
          onPress={() => onMetricPress?.("weight")}
        />

        <MetricCard
          title="Calories"
          value={formatCalories(data.calories?.consumed)}
          subtitle={!hasCaloriesData ? "Log meals to track" : "today"}
          icon="flame-outline"
          color={ResponsiveTheme.colors.warning}
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
          delay={100}
          onPress={() => onMetricPress?.("calories")}
        />
      </View>

      {/* Row 2: Workouts + Streak */}
      <View style={styles.row}>
        <MetricCard
          title="Workouts"
          value={data.workouts?.count?.toString() || "0"}
          subtitle={`This ${period.charAt(0).toUpperCase() + period.slice(1)}`}
          icon="barbell-outline"
          color={ResponsiveTheme.colors.info}
          trend={hasWorkoutsData ? data.workouts?.trend : undefined}
          trendValue={
            hasWorkoutsData && data.workouts?.change
              ? `${data.workouts.change > 0 ? "+" : ""}${data.workouts.change}`
              : undefined
          }
          delay={200}
          onPress={() => onMetricPress?.("workouts")}
        />

        <MetricCard
          title="Day Streak"
          value={data.streak?.days?.toString() ?? "--"}
          subtitle={getStreakMessage()}
          icon="flame"
          color={ResponsiveTheme.colors.errorLight}
          delay={300}
          onPress={() => onMetricPress?.("streak")}
        />
      </View>

      {/* Health Metrics Section - from onboarding calculations */}
      {(data.bmi || data.bmr || data.tdee || data.dailyWater) && (
        <>
          <SectionHeader
            title="Health Metrics"
            icon="fitness-outline"
            iconColor={ResponsiveTheme.colors.successAlt}
          />

          {/* Row 3: BMI + BMR */}
          <View style={styles.row}>
            <MetricCard
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
              color={ResponsiveTheme.colors.accent}
              delay={400}
              onPress={() => onMetricPress?.("bmi")}
            />

            <MetricCard
              title="BMR"
              value={data.bmr ? `${Math.round(data.bmr)}` : "--"}
              subtitle="cal/day"
              icon="pulse-outline"
              color={ResponsiveTheme.colors.pink}
              delay={500}
              onPress={() => onMetricPress?.("bmr")}
            />
          </View>

          {/* Row 4: TDEE + Water */}
          <View style={styles.row}>
            <MetricCard
              title="TDEE"
              value={data.tdee ? `${Math.round(data.tdee)}` : "--"}
              subtitle="cal/day"
              icon="flash-outline"
              color={ResponsiveTheme.colors.warningAlt}
              delay={600}
              onPress={() => onMetricPress?.("tdee")}
            />

            <MetricCard
              title="Water Goal"
              value={
                data.dailyWater
                  ? `${(data.dailyWater / 1000).toFixed(1)}L`
                  : "--"
              }
              subtitle="daily target"
              icon="water-outline"
              color={ResponsiveTheme.colors.cyan}
              delay={700}
              onPress={() => onMetricPress?.("water")}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
    gap: ResponsiveTheme.spacing.md,
    zIndex: 3,
  },
  row: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
  },
  cardWrapper: {
    flex: 1,
    minWidth: 0, // Allow flex shrink
  },
  cardPressable: {
    flex: 1,
  },
  cardGlass: {
    minHeight: rh(105),
  },
  cardContent: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flex: 1,
  },
  iconCircle: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  metricValue: {
    fontSize: rf(22),
    fontWeight: "800",
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(2),
  },
  metricLabel: {
    fontSize: rf(11),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  subtitleText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: rp(3),
  },
  trendText: {
    fontSize: rf(10),
    fontWeight: "600",
  },
});

export default MetricSummaryGrid;
