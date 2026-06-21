import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { rh } from "../../../utils/responsive";interface ProgressBarProps {
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
    marginBottom: spacing.xl,
  },
  overallProgressBar: {
    width: "100%",
    height: rh(8),
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.full,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  overallProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  overallProgressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
