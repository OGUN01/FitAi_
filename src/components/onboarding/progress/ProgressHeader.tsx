import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";interface ProgressHeaderProps {
  currentTab: number;
  totalTabs: number;
  overallCompletion: number;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  currentTab,
  totalTabs,
  overallCompletion,
}) => {
  return (
    <View style={styles.headerSection}>
      <Text style={styles.headerTitle}>Onboarding Progress</Text>
      <Text style={styles.headerSubtitle}>
        Step {currentTab} of {totalTabs} • {overallCompletion}% Complete
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
