import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";

interface MetricPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}

export const MetricPill: React.FC<MetricPillProps> = ({
  icon,
  label,
  value,
  color,
}) => (
  <View style={[styles.metricPill, { borderColor: `${color}40` }]}>
    <Ionicons
      name={icon}
      size={rf(12)}
      color={color}
      style={styles.metricIcon}
    />
    <View style={styles.metricTextContainer}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 4,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    borderWidth: 1,
  },
  metricIcon: {
    marginRight: 4,
  },
  metricTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    fontSize: rf(9),
    color: ResponsiveTheme.colors.textMuted,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: rf(11),
    fontWeight: "600",
  },
});
