import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../../theme/aurora-tokens';


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

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Body Measurements</Text>
      <View style={styles.measurementsContainer}>
        {Object.entries(measurementChanges).map(([measurement, data]) => (
          <View key={measurement} style={styles.measurementItem}>
            <View style={styles.measurementHeader}>
              <Text style={styles.measurementName}>
                {measurement.charAt(0).toUpperCase() + measurement.slice(1)}
              </Text>
              <Text style={styles.measurementValue}>
                {data.current.toFixed(1)}cm
              </Text>
            </View>
            <Text
              style={[
                styles.measurementChange,
                { color: getProgressColor(data.change) },
              ]}
            >
              {formatChange(data.change, "cm")}
            </Text>
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
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  measurementsContainer: {
    gap: spacing.sm,
  },
  measurementItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  measurementHeader: {
    flex: 1,
  },
  measurementName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },
  measurementValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  measurementChange: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
});
