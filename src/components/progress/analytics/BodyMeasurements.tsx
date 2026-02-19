import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";

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
    marginBottom: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  measurementsContainer: {
    gap: THEME.spacing.sm,
  },
  measurementItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  measurementHeader: {
    flex: 1,
  },
  measurementName: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
  },
  measurementValue: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  measurementChange: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
  },
});
