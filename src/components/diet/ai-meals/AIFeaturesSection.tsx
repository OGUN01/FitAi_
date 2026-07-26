import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";

const FEATURES = [
  { icon: "ribbon-outline" as const, text: "Goal-optimized nutrition" },
  { icon: "restaurant-outline" as const, text: "Dietary preferences" },
  { icon: "bar-chart-outline" as const, text: "Macro calculations" },
  { icon: "swap-horizontal-outline" as const, text: "Variety & rotation" },
];

export const AIFeaturesSection: React.FC = () => {
  return (
    <View style={styles.featuresGrid}>
      {FEATURES.map((feature) => (
        <View key={feature.text} style={styles.featureItem}>
          <Ionicons name={feature.icon} size={rf(16)} color={colors.primary} style={styles.featureIcon} />
          <Text style={styles.featureText}>{feature.text}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  featureItem: {
    flex: 1,
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },

  featureIcon: {
    marginRight: spacing.sm,
  },

  featureText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
});
