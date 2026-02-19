import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { rh } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";

interface ProgressBarProps {
  overallCompletion: number;
  completedTabs: number;
  totalTabs: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  overallCompletion,
  completedTabs,
  totalTabs,
}) => {
  return (
    <View style={styles.overallProgressSection}>
      <View style={styles.overallProgressBar}>
        <View
          style={[
            styles.overallProgressFill,
            { width: `${overallCompletion}%` },
          ]}
        />
      </View>
      <Text style={styles.overallProgressText}>
        {completedTabs} of {totalTabs} steps completed
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overallProgressSection: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  overallProgressBar: {
    width: "100%",
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: "hidden",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  overallProgressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  overallProgressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },
});
