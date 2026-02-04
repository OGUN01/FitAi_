import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";

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
    color: "#4CAF50",
  },
  {
    key: "heartRate",
    title: "Heart Rate",
    description: "Heart rate and resting HR",
    icon: "heart-outline",
    color: "#F44336",
  },
  {
    key: "workouts",
    title: "Workouts",
    description: "Exercise sessions from watch",
    icon: "fitness-outline",
    color: "#FF9800",
  },
  {
    key: "sleep",
    title: "Sleep Data",
    description: "Sleep duration and quality",
    icon: "bed-outline",
    color: "#9C27B0",
  },
  {
    key: "weight",
    title: "Body Weight",
    description: "Weight measurements",
    icon: "body-outline",
    color: "#2196F3",
  },
  {
    key: "nutrition",
    title: "Nutrition",
    description: "Calorie tracking from apps",
    icon: "nutrition-outline",
    color: "#00BCD4",
  },
  {
    key: "hrv",
    title: "Heart Rate Variability",
    description: "HRV for recovery analysis",
    icon: "pulse-outline",
    color: "#673AB7",
  },
  {
    key: "spo2",
    title: "Blood Oxygen (SpO2)",
    description: "Oxygen saturation levels",
    icon: "water-outline",
    color: "#009688",
  },
  {
    key: "bodyFat",
    title: "Body Fat",
    description: "Body composition from scales",
    icon: "analytics-outline",
    color: "#E91E63",
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
            trackColor={{ false: "#444", true: dataType.color }}
            thumbColor="#fff"
          />
        </View>
      ))}
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
    color: "#fff",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  icon: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },
  info: {
    flex: 1,
  },
  dataTitle: {
    fontSize: rf(15),
    fontWeight: "500",
    color: "#fff",
  },
  desc: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
});
