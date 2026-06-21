import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp } from "../../utils/responsive";
import { useHealthDataStore } from "../../stores/healthDataStore";
import { VitalsCard } from "../health/VitalsCard";
import { HealthTrendChart } from "../health/HealthTrendChart";

interface HealthMetrics {
  steps: number;
  totalCalories?: number;
  activeCalories?: number;
  heartRate?: number;
  sleepHours?: number;
}

interface HealthSummaryCardProps {
  metrics: HealthMetrics;
}

export const HealthSummaryCard: React.FC<HealthSummaryCardProps> = ({
  metrics,
}) => {
  // metricsHistory is the runtime SSOT for historical charts (Wave 3). The
  // store is populated by loadHealthMetricsHistory() called from useHomeLogic
  // on mount. Reading it here lets us conditionally render the steps trend
  // without prop-drilling history through every consumer.
  const stepsHistory = useHealthDataStore(
    (s) => s.metricsHistory?.["steps"],
  );
  const hasStepsHistory =
    Array.isArray(stepsHistory) && stepsHistory.length > 0;

  return (
    <>
      <GlassCard elevation={1} style={styles.card}>
        <Text style={styles.title}>Today's Health Data</Text>
        <View style={styles.grid}>
          <View style={styles.item}>
            <Ionicons name="walk" size={rf(24)} color={ResponsiveTheme.colors.success} />
            <Text style={styles.value}>{metrics.steps.toLocaleString()}</Text>
            <Text style={styles.label}>Steps</Text>
          </View>
          <View style={styles.item}>
            <Ionicons name="flame" size={rf(24)} color={ResponsiveTheme.colors.warning} />
            <Text style={styles.value}>
              {metrics.totalCalories || metrics.activeCalories || 0}
            </Text>
            <Text style={styles.label}>Calories</Text>
          </View>
          <View style={styles.item}>
            <Ionicons name="heart" size={rf(24)} color={ResponsiveTheme.colors.error} />
            <Text style={styles.value}>{metrics.heartRate || "--"}</Text>
            <Text style={styles.label}>BPM</Text>
          </View>
          <View style={styles.item}>
            <Ionicons name="bed" size={rf(24)} color={ResponsiveTheme.colors.primary} />
            <Text style={styles.value}>
              {metrics.sleepHours ? `${metrics.sleepHours.toFixed(1)}h` : "--"}
            </Text>
            <Text style={styles.label}>Sleep</Text>
          </View>
        </View>
      </GlassCard>

      {/*
        Wave 5A: surface the advanced vitals (HRV / SpO2 / Body Fat /
        Resting HR) persisted by Wave 3/4. VitalsCard renders null itself
        when none of the four vitals have a value, so this stays cheap for
        users who haven't synced yet.
      */}
      <VitalsCard />

      {/*
        Steps trend — the most universally useful historical view. Only
        render when there's actual history so the card doesn't show an
        empty-state block under a fresh install.
      */}
      {hasStepsHistory && (
        <HealthTrendChart
          metricType="steps"
          label="Steps Trend"
          unit="steps"
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.lg,
  },
  title: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  item: {
    alignItems: "center",
    flex: 1,
  },
  value: {
    fontSize: rf(20),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  label: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
});
