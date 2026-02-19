import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";

interface ProgressHeaderProps {
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
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  headerTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },
});
