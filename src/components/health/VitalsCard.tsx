/**
 * VitalsCard
 *
 * Surfaces the four "advanced vitals" persisted to healthDataStore.metrics
 * by Wave 3/4 (Health Connect + manual-entry persistence):
 *   - Resting Heart Rate (bpm)
 *   - Heart Rate Variability (ms, RMSSD)
 *   - Oxygen Saturation (%, SpO2)
 *   - Body Fat (%)
 *
 * Reads directly from the Zustand health store (the runtime SSOT per
 * CLAUDE.md #6) — no prop drilling, no service calls. Renders only the
 * tiles whose underlying value is present; renders "--" for null/undefined
 * individual fields so the tile grid stays stable. If NONE of the four
 * vitals have a value, renders null (the parent HealthSummaryCard decides
 * whether to show the section at all).
 *
 * Styling mirrors HealthSummaryCard's tile layout exactly: same GlassCard
 * wrapper, same row/grid flex, same icon/value/label typography. No new
 * design tokens introduced.
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rw } from "../../utils/responsive";
import { useHealthDataStore } from "../../stores/healthDataStore";
import type { HealthMetrics } from "../../stores/healthDataStore";

interface VitalTileDef {
  /** Field on HealthMetrics read from the store. */
  field: keyof Pick<
    HealthMetrics,
    | "restingHeartRate"
    | "heartRateVariability"
    | "oxygenSaturation"
    | "bodyFat"
  >;
  label: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** ResponsiveTheme color key for the icon tint. */
  colorKey: "primary" | "secondary" | "success" | "warning" | "error";
  /** Pretty-printer for the numeric value. */
  format: (n: number) => string;
}

const VITAL_TILES: VitalTileDef[] = [
  {
    field: "restingHeartRate",
    label: "Resting HR",
    unit: "bpm",
    icon: "pulse-outline",
    colorKey: "error",
    format: (n) => (Number.isFinite(n) ? Math.round(n).toString() : "--"),
  },
  {
    field: "heartRateVariability",
    label: "HRV",
    unit: "ms",
    icon: "analytics-outline",
    colorKey: "secondary",
    format: (n) =>
      Number.isFinite(n) ? Math.round(n).toString() : "--",
  },
  {
    field: "oxygenSaturation",
    label: "SpO₂",
    unit: "%",
    icon: "water-outline",
    colorKey: "primary",
    format: (n) =>
      Number.isFinite(n) ? Math.round(n).toString() : "--",
  },
  {
    field: "bodyFat",
    label: "Body Fat",
    unit: "%",
    icon: "fitness-outline",
    colorKey: "warning",
    format: (n) =>
      Number.isFinite(n) ? n.toFixed(1) : "--",
  },
];

export const VitalsCard: React.FC = () => {
  const metrics = useHealthDataStore((s) => s.metrics);

  // Pre-resolve each tile's value once per render.
  const tiles = useMemo(
    () =>
      VITAL_TILES.map((def) => {
        const raw = metrics[def.field];
        const hasValue = typeof raw === "number" && Number.isFinite(raw);
        return {
          def,
          hasValue,
          display: hasValue ? def.format(raw as number) : "--",
        };
      }),
    [metrics],
  );

  const anyValue = tiles.some((t) => t.hasValue);
  if (!anyValue) return null;

  return (
    <GlassCard elevation={1} style={styles.card}>
      <Text style={styles.title}>Vitals</Text>
      <View style={styles.grid}>
        {tiles.map(({ def, display }) => (
          <View key={def.field} style={styles.item}>
            <Ionicons
              name={def.icon}
              size={rf(22)}
              color={ResponsiveTheme.colors[def.colorKey]}
            />
            <Text style={styles.value}>{display}</Text>
            <Text style={styles.label}>{def.label}</Text>
            <Text style={styles.unit}>{def.unit}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
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
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  label: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  unit: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textTertiary,
    marginTop: rp(1),
  },
});

export default VitalsCard;
