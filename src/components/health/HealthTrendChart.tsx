/**
 * HealthTrendChart
 *
 * Single-metric historical line chart reading from
 * healthDataStore.metricsHistory[metricType]. Each entry is
 * { date: string; value: number } (see HealthDataState.metricsHistory —
 * Wave 3 deliberately drops the per-row `source` from the store shape
 * since attribution isn't needed on a trend view).
 *
 * Custom react-native-svg line chart (react-native-chart-kit was retired in
 * the 2026 chart-stack modernization — the app standard is the custom
 * SVG/Skia language used by the analytics charts). Charts are
 * dependency-free for the caller: pass metricType + label + unit
 * (+ optional color).
 *
 * Empty-state: if there is no history array for this metric (or it has
 * zero rows) the card renders a "No history yet — sync to see trends"
 * message instead of an empty chart (per CLAUDE.md #8 — no fake data).
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import {
  flatColors as colors,
  surface,
  border as borderTokens,
  spacing,
  typography,
} from "../../theme/aurora-tokens";
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

const CHART_HEIGHT = rp(180);
const PAD_LEFT = rp(44);
const PAD_RIGHT = rp(12);
const PAD_TOP = rp(16);
const PAD_BOTTOM = rp(24);

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

  // Filter out non-finite values so a single bad row can't crash the chart
  // (defensive — service should have already validated, but the store is the
  // trust boundary).
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

  const chartWidth = Math.max(rw(300), count * rp(22));

  const geometry = useMemo(() => {
    if (count === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Pad flat series so the line doesn't sit on the chart edge.
    const span = max - min || Math.max(Math.abs(max) * 0.1, 1);
    const yMin = min - span * 0.15;
    const yMax = max + span * 0.15;
    const innerW = chartWidth - PAD_LEFT - PAD_RIGHT;
    const innerH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const getX = (i: number) =>
      PAD_LEFT + (count > 1 ? (i / (count - 1)) * innerW : innerW / 2);
    const getY = (v: number) =>
      PAD_TOP + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

    const path = values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(v)}`)
      .join(" ");

    // Three horizontal grid lines with rounded tick labels.
    const ticks = [yMax - span * 0.15, (yMin + yMax) / 2, yMin + span * 0.15];
    const gridLines = ticks.map((v) => ({
      y: getY(v),
      label: String(Math.round(v)),
    }));

    // Sparse x labels — first, middle, last.
    const xLabelIdx =
      count > 2
        ? [0, Math.floor((count - 1) / 2), count - 1]
        : Array.from({ length: count }, (_, i) => i);

    return { getX, getY, path, gridLines, xLabelIdx };
  }, [count, values, chartWidth]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{label}</Text>
      {count > 0 && geometry ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={chartWidth} height={CHART_HEIGHT} style={styles.chart}>
            {geometry.gridLines.map((g, i) => (
              <React.Fragment key={i}>
                <Line
                  x1={PAD_LEFT}
                  y1={g.y}
                  x2={chartWidth - PAD_RIGHT}
                  y2={g.y}
                  stroke={borderTokens.subtle}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={PAD_LEFT - rp(6)}
                  y={g.y}
                  fontSize={rf(10)}
                  fill={colors.textTertiary}
                  textAnchor="end"
                  alignmentBaseline="middle"
                >
                  {g.label}
                </SvgText>
              </React.Fragment>
            ))}

            <Path
              d={geometry.path}
              stroke={lineColor}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {values.map((v, i) => (
              <Circle
                key={i}
                cx={geometry.getX(i)}
                cy={geometry.getY(v)}
                r={rp(3)}
                fill={lineColor}
              />
            ))}

            {geometry.xLabelIdx.map((i) => (
              <SvgText
                key={`x-${i}`}
                x={geometry.getX(i)}
                y={CHART_HEIGHT - rp(6)}
                fontSize={rf(10)}
                fill={colors.textTertiary}
                textAnchor="middle"
              >
                {labels[i]}
              </SvgText>
            ))}
          </Svg>
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
    </View>
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
  // Flat surface + hairline border — replaces the GlassCard glass wrapper.
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: surface[1],
    borderRadius: rp(12),
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  title: {
    fontSize: rf(16),
    fontWeight: typography.fontWeight.semibold,
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
    fontWeight: typography.fontWeight.semibold,
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
