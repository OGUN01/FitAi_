import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rw } from "../../utils/responsive";

export interface HealthDataType {
  key:
    | "steps"
    | "heartRate"
    | "workouts"
    | "sleep"
    | "weight"
    | "nutrition"
    | "hrv"
    | "spo2"
    | "bodyFat";
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const HEALTH_DATA_TYPES: HealthDataType[] = [
  {
    key: "steps",
    title: "Steps & Activity",
    description: "Daily steps, distance walked",
    icon: "walk-outline",
    color: colors.success,
  },
  {
    key: "heartRate",
    title: "Heart Rate",
    description: "Heart rate and resting HR",
    icon: "heart-outline",
    color: colors.error,
  },
  {
    key: "workouts",
    title: "Workouts",
    description: "Exercise sessions from watch",
    icon: "fitness-outline",
    color: colors.warning,
  },
  {
    key: "sleep",
    title: "Sleep Data",
    description: "Sleep duration and quality",
    icon: "bed-outline",
    color: colors.primary,
  },
  {
    key: "weight",
    title: "Body Weight",
    description: "Weight measurements",
    icon: "body-outline",
    color: colors.info,
  },
  {
    key: "nutrition",
    title: "Nutrition",
    description: "Calorie tracking from apps",
    icon: "nutrition-outline",
    color: colors.cyan,
  },
  {
    key: "hrv",
    title: "Heart Rate Variability",
    description: "HRV for recovery analysis",
    icon: "pulse-outline",
    color: colors.secondary,
  },
  {
    key: "spo2",
    title: "Blood Oxygen (SpO2)",
    description: "Oxygen saturation levels",
    icon: "water-outline",
    color: colors.teal,
  },
  {
    key: "bodyFat",
    title: "Body Fat",
    description: "Body composition from scales",
    icon: "analytics-outline",
    color: colors.primaryDark,
  },
];

interface DataTypesCardProps {
  dataTypesToSync: Record<string, boolean>;
  onDataTypeToggle: (dataType: string, enabled: boolean) => void;
}

export const DataTypesCard: React.FC<DataTypesCardProps> = ({
  dataTypesToSync,
  onDataTypeToggle,
}) => {
  return (
    <GlassCard elevation={1} style={styles.card}>
      <Text style={styles.title}>Data to Sync</Text>
      {HEALTH_DATA_TYPES.map((dataType, index) => (
        <View
          key={dataType.key}
          style={[styles.row, index > 0 && styles.rowBorder]}
        >
          <View
            style={[styles.icon, { backgroundColor: `${dataType.color}20` }]}
          >
            <Ionicons
              name={dataType.icon}
              size={rf(20)}
              color={dataType.color}
            />
          </View>
          <View style={styles.info}>
            <Text style={styles.dataTitle}>{dataType.title}</Text>
            <Text style={styles.desc}>{dataType.description}</Text>
          </View>
          <Switch
            value={dataTypesToSync[dataType.key]}
            onValueChange={(value) => onDataTypeToggle(dataType.key, value)}
            trackColor={{ false: colors.border, true: dataType.color }}
            thumbColor={colors.white}
          />
        </View>
      ))}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  title: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.glassHighlight,
  },
  icon: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  dataTitle: {
    fontSize: rf(15),
    fontWeight: "500",
    color: colors.text,
  },
  desc: {
    fontSize: rf(13),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
});
