import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";

export const AIFeaturesSection: React.FC = () => {
  return (
    <View style={styles.featuresGrid}>
      <View style={styles.featureItem}>
        <Text style={styles.featureEmoji}>🎯</Text>
        <Text style={styles.featureText}>Goal-optimized nutrition</Text>
      </View>
      <View style={styles.featureItem}>
        <Text style={styles.featureEmoji}>🥗</Text>
        <Text style={styles.featureText}>Dietary preferences</Text>
      </View>
      <View style={styles.featureItem}>
        <Text style={styles.featureEmoji}>📊</Text>
        <Text style={styles.featureText}>Macro calculations</Text>
      </View>
      <View style={styles.featureItem}>
        <Text style={styles.featureEmoji}>🔄</Text>
        <Text style={styles.featureText}>Variety & rotation</Text>
      </View>
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

  featureEmoji: {
    fontSize: rf(16),
    marginRight: spacing.sm,
  },

  featureText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
});
