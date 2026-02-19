import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
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
    gap: ResponsiveTheme.spacing.md,
  },

  featureItem: {
    flex: 1,
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  featureEmoji: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  featureText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    flex: 1,
  },
});
