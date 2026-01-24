/**
 * WeeklyNutritionChart Component
 * Bar chart showing weekly macro trends
 * Fixes Issue #15 - Uses actual data instead of static demo
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";

interface DayData {
  day: string;
  shortDay: string;
  protein: number;
  carbs: number;
  fat: number;
  isToday?: boolean;
}

interface WeeklyNutritionChartProps {
  weeklyData: DayData[];
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  onPress?: () => void;
}

// Macro colors
const COLORS = {
  protein: "#FF6B9D",
  carbs: "#4ECDC4",
  fat: "#FFA726",
};

export const WeeklyNutritionChart: React.FC<WeeklyNutritionChartProps> = ({
  weeklyData,
  proteinTarget,
  carbsTarget,
  fatTarget,
  onPress,
}) => {
  // Calculate max value for scaling - ensure minimum of 1 to prevent division by zero
  const maxValue = useMemo(() => {
    const allValues = weeklyData.flatMap((d) => [d.protein, d.carbs, d.fat]);
    const targets = [proteinTarget, carbsTarget, fatTarget];
    return Math.max(...allValues, ...targets, 1); // Minimum 1 to prevent NaN
  }, [weeklyData, proteinTarget, carbsTarget, fatTarget]);

  // Average percentages
  const averages = useMemo(() => {
    const totals = weeklyData.reduce(
      (acc, day) => ({
        protein: acc.protein + day.protein,
        carbs: acc.carbs + day.carbs,
        fat: acc.fat + day.fat,
      }),
      { protein: 0, carbs: 0, fat: 0 },
    );
    const days = weeklyData.length || 1;
    // Guard against division by zero for targets
    return {
      protein:
        proteinTarget > 0
          ? Math.round((totals.protein / days / proteinTarget) * 100)
          : 0,
      carbs:
        carbsTarget > 0
          ? Math.round((totals.carbs / days / carbsTarget) * 100)
          : 0,
      fat:
        fatTarget > 0 ? Math.round((totals.fat / days / fatTarget) * 100) : 0,
    };
  }, [weeklyData, proteinTarget, carbsTarget, fatTarget]);

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(500)}
      style={styles.container}
    >
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="bar-chart-outline"
            size={rf(18)}
            color={ResponsiveTheme.colors.primary}
          />
          <Text style={styles.sectionTitle}>Weekly Trends</Text>
        </View>
        <AnimatedPressable
          onPress={onPress}
          scaleValue={0.95}
          hapticFeedback={true}
          hapticType="light"
        >
          <Text style={styles.seeAllText}>See Details</Text>
        </AnimatedPressable>
      </View>

      <View style={styles.cardWrapper}>
        <GlassCard
          elevation={2}
          blurIntensity="light"
          padding="md"
          borderRadius="lg"
        >
          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: COLORS.protein }]}
              />
              <Text style={styles.legendText}>Protein</Text>
              <Text style={styles.legendAvg}>{averages.protein}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: COLORS.carbs }]}
              />
              <Text style={styles.legendText}>Carbs</Text>
              <Text style={styles.legendAvg}>{averages.carbs}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: COLORS.fat }]}
              />
              <Text style={styles.legendText}>Fat</Text>
              <Text style={styles.legendAvg}>{averages.fat}%</Text>
            </View>
          </View>

          {/* Chart */}
          <View style={styles.chart}>
            {weeklyData.map((day, index) => (
              <Animated.View
                key={day.day}
                entering={FadeInUp.duration(400).delay(100 + index * 50)}
                style={styles.dayColumn}
              >
                <View style={styles.barsGroup}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max((day.protein / maxValue) * 100, 5)}%`,
                          backgroundColor: COLORS.protein,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max((day.carbs / maxValue) * 100, 5)}%`,
                          backgroundColor: COLORS.carbs,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max((day.fat / maxValue) * 100, 5)}%`,
                          backgroundColor: COLORS.fat,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text
                  style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}
                >
                  {day.shortDay}
                </Text>
                {day.isToday && <View style={styles.todayIndicator} />}
              </Animated.View>
            ))}
          </View>

          {/* Target Line */}
          <View style={styles.targetLine}>
            <View style={styles.targetLineDash} />
            <Text style={styles.targetLineText}>Target Average</Text>
          </View>
        </GlassCard>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  cardWrapper: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  seeAllText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: rw(4),
  },
  legendText: {
    fontSize: rf(11),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
  legendAvg: {
    fontSize: rf(10),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    opacity: 0.7,
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: rh(140),
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barsGroup: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: rh(100),
  },
  barContainer: {
    width: rw(8),
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: rw(4),
    minHeight: rh(4),
  },
  dayLabel: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  dayLabelToday: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: "700",
  },
  todayIndicator: {
    width: rw(4),
    height: rw(4),
    borderRadius: rw(2),
    backgroundColor: ResponsiveTheme.colors.primary,
    marginTop: 4,
  },
  targetLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  targetLineDash: {
    flex: 1,
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginRight: ResponsiveTheme.spacing.sm,
  },
  targetLineText: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    fontStyle: "italic",
  },
});

export default WeeklyNutritionChart;
