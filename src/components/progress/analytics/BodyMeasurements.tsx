import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from '../../../utils/constants';


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
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  measurementsContainer: {
    gap: ResponsiveTheme.spacing.sm,
  },
  measurementItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  measurementHeader: {
    flex: 1,
  },
  measurementName: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  measurementValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
  measurementChange: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
