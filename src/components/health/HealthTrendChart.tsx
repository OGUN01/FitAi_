/**
 * HealthTrendChart
 *
 * Single-metric historical line chart reading from
 * healthDataStore.metricsHistory[metricType]. Each entry is
 * { date: string; value: number } (see HealthDataState.metricsHistory —
 * Wave 3 deliberately drops the per-row `source` from the store shape
 * since attribution isn't needed on a trend view).
 *
 * Uses `react-native-chart-kit` LineChart (already a dependency — ProgressChart
 * uses the same primitive). No new dependency. Charts are dependency-free
 * for the caller: pass metricType + label + unit (+ optional color).
 *
 * Empty-state: if there is no history array for this metric (or it has
 * zero rows) the card renders a "No history yet — sync to see trends"
 * message instead of an empty chart (per CLAUDE.md #8 — no fake data).
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { GlassCard } from "../ui/aurora/GlassCard";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rp, rw } from "../../utils/responsive";
import { useHealthDataStore } from "../../stores/healthDataStore";

interface HealthTrendChartProps {
  /** metric_type key into metricsHistory — e.g. "steps", "heart_rate". */
  metricType: string;
  /** Human-readable label shown in the card header. */
  label: string;
  /** Unit suffix for axis ticks, e.g. "steps", "bpm", "kcal". */
  unit: string;
  /** Optional hex color override for the line; defaults to primary. */
  color?: string;
}

interface HistoryPoint {
  date: string;
  value: number;
}

export const HealthTrendChart: React.FC<HealthTrendChartProps> = ({
  metricType,
  label,
  unit,
  color,
}) => {
  const history = useHealthDataStore(
    (s) => s.metricsHistory?.[metricType],
  ) as HistoryPoint[] | undefined;

  const lineColor = color ?? colors.primary;

  // chart-kit expects parallel arrays. Filter out non-finite values so a
  // single bad row can't crash the chart (defensive — service should have
  // already validated, but the store is the trust boundary).
  const { labels, values, count } = useMemo(() => {
    const rows = Array.isArray(history) ? history : [];
    const out: { labels: string[]; values: number[] } = {
      labels: [],
      values: [],
    };
    for (const row of rows) {
      if (
        row &&
        typeof row.value === "number" &&
        Number.isFinite(row.value) &&
        typeof row.date === "string"
      ) {
        // Use the MM/DD short form for axis density — keep label short.
        const parts = row.date.split("-");
        const short =
          parts.length >= 3 ? `${parts[1]}/${parts[2]}` : row.date;
        out.labels.push(short);
        out.values.push(row.value);
      }
    }
    return { ...out, count: out.values.length };
  }, [history]);

  const chartConfig = useMemo(
    () => ({
      backgroundColor: "transparent",
      backgroundGradientFrom: "transparent",
      backgroundGradientTo: "transparent",
      decimalCount: 0,
      color: () => lineColor,
      labelColor: () => colors.textTertiary,
      propsForDots: {
        r: rp(3),
        strokeWidth: 0,
        stroke: lineColor,
      },
      propsForBackgroundLines: {
        stroke: colors.glassHighlight,
      },
    }),
    [lineColor],
  );

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values.length > 0 ? values : [0],
          color: () => lineColor,
          strokeWidth: 2,
        },
      ],
      legend: [unit],
    }),
    [labels, values, lineColor, unit],
  );

  return (
    <GlassCard elevation={1} style={styles.card}>
      <Text style={styles.title}>{label}</Text>
      {count > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={chartData}
            width={Math.max(rw(300), count * rp(22))}
            height={rp(180)}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            withDots={true}
            withShadow={false}
          />
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <IoniconsVital name="trending-up-outline" />
          <Text style={styles.emptyText}>No history yet</Text>
          <Text style={styles.emptySubtext}>
            Sync your wearable or log a manual entry to see trends
          </Text>
        </View>
      )}
    </GlassCard>
  );
};

// Tiny inline icon wrapper so the empty state matches the aurora visual
// language (Ionicons is already imported at the top of this file).
const IoniconsVital: React.FC<{ name: keyof typeof Ionicons.glyphMap }> = ({
  name,
}) => (
  <Ionicons
    name={name}
    size={rf(28)}
    color={colors.textTertiary}
  />
);

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  title: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chart: {
    marginTop: spacing.xs,
    borderRadius: rp(8),
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: rf(12),
    color: colors.textTertiary,
    marginTop: rp(2),
    textAlign: "center",
  },
});

export default HealthTrendChart;
