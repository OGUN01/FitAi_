/**
 * TrendCharts Component
 * Premium analytics charts with world-class styling
 * Inspired by Apple Health, Fitbit, and modern fintech dashboards
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rh } from "../../../utils/responsive";
import { SectionHeader } from "../home/SectionHeader";
import { Period } from "./PeriodSelector";
import { BarChart, ChartData } from "./components/BarChart";
import { LineChart } from "./components/LineChart";
import { ChartCard } from "./components/ChartCard";

interface TrendChartsProps {
  weightData?: ChartData[];
  calorieData?: ChartData[];
  workoutData?: ChartData[];
  period: Period;
  onChartPress?: (chartType: string) => void;
}

export const TrendCharts: React.FC<TrendChartsProps> = ({
  weightData,
  calorieData,
  workoutData,
  period,
  onChartPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionHeader
          title="Detailed Analytics"
          icon="bar-chart"
          iconColor="#667eea"
        />
      </View>

      <View style={styles.chartsContainer}>
        <ChartCard
          title="Weight Progress"
          icon="trending-down"
          iconColor="#9C27B0"
          legend={
            weightData && weightData.length > 0
              ? [{ color: "#9C27B0", label: "Weight" }]
              : undefined
          }
          delay={0}
          onPress={() => onChartPress?.("weight")}
        >
          <LineChart data={weightData || []} color="#9C27B0" unit="kg" />
        </ChartCard>

        <ChartCard
          title="Calorie Analysis"
          icon="flame"
          iconColor="#FF9800"
          legend={
            calorieData && calorieData.length > 0
              ? [
                  { color: "#4CAF50", label: "Consumed" },
                  { color: "#FF9800", label: "Burned" },
                ]
              : undefined
          }
          delay={100}
          onPress={() => onChartPress?.("calories")}
        >
          {calorieData && calorieData.length > 0 ? (
            <BarChart
              data={calorieData}
              color="#4CAF50"
              gradientColors={["#4CAF50", "#8BC34A"]}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons
                name="flame-outline"
                size={rf(32)}
                color={ResponsiveTheme.colors.textMuted}
              />
              <Text style={styles.emptyChartText}>
                No calorie data recorded
              </Text>
              <Text style={styles.emptyChartSubtext}>
                Start tracking meals to see analysis
              </Text>
            </View>
          )}
        </ChartCard>

        <ChartCard
          title="Workout Consistency"
          icon="barbell"
          iconColor="#2196F3"
          delay={200}
          onPress={() => onChartPress?.("workouts")}
        >
          {workoutData && workoutData.length > 0 ? (
            <BarChart
              data={workoutData}
              color="#2196F3"
              gradientColors={["#2196F3", "#64B5F6"]}
              maxValue={Math.max(...workoutData.map((d) => d.value), 4)}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons
                name="barbell-outline"
                size={rf(32)}
                color={ResponsiveTheme.colors.textMuted}
              />
              <Text style={styles.emptyChartText}>
                No workout data this {period}
              </Text>
              <Text style={styles.emptyChartSubtext}>
                Complete workouts to see consistency
              </Text>
            </View>
          )}
        </ChartCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: ResponsiveTheme.spacing.xl,
    marginBottom: ResponsiveTheme.spacing.lg,
    zIndex: 1,
  },
  headerContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  chartsContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.lg,
  },
  emptyChart: {
    minHeight: rh(180),
    justifyContent: "center",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  emptyChartText: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },
  emptyChartSubtext: {
    fontSize: rf(12),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
  },
});

export default TrendCharts;
