/**
 * BodyMeasurements - Aurora 2026
 *
 * Flat hairline-divided list of measurement deltas, no nested cards,
 * Manrope type, chart-palette accents.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  colors,
  border as borderTokens,
  spacing,
  typography,
} from "../../../theme/aurora-tokens";

interface MeasurementData {
  current: number;
  change: number;
}

interface BodyMeasurementsProps {
  measurementChanges: Record<string, MeasurementData>;
  getProgressColor: (change: number) => string;
  formatChange: (change: number, unit: string) => string;
}

export const BodyMeasurements: React.FC<BodyMeasurementsProps> = ({
  measurementChanges,
  getProgressColor,
  formatChange,
}) => {
  if (Object.keys(measurementChanges).length === 0) {
    return null;
  }

  const entries = Object.entries(measurementChanges);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Body Measurements</Text>
      <View>
        {entries.map(([measurement, data], idx) => (
          <View
            key={measurement}
            style={[
              styles.measurementRow,
              idx < entries.length - 1 && styles.measurementRowDivider,
            ]}
          >
            <Text style={styles.measurementName}>
              {measurement.charAt(0).toUpperCase() + measurement.slice(1)}
            </Text>
            <View style={styles.measurementRight}>
              <Text style={styles.measurementValue}>
                {data.current.toFixed(1)}cm
              </Text>
              <Text
                style={[
                  styles.measurementChange,
                  { color: getProgressColor(data.change) },
                ]}
              >
                {formatChange(data.change, "cm")}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  measurementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  measurementRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: borderTokens.subtle,
  },
  measurementName: {
    ...typography.variants.body,
    color: colors.text.primary,
  },
  measurementRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  measurementValue: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
  measurementChange: {
    ...typography.variants.caption2,
    fontFamily: "Manrope_600SemiBold",
  },
});

export default BodyMeasurements;
