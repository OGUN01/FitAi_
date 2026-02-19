import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rh, rs } from "../../../utils/responsive";

interface RecipeProgressBarProps {
  filledFields: number;
  totalFields: number;
}

export const RecipeProgressBar: React.FC<RecipeProgressBarProps> = ({
  filledFields,
  totalFields,
}) => {
  const percentage = (filledFields / totalFields) * 100;

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage}%`,
            },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {filledFields}/{totalFields} fields completed
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  progressSection: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
  },

  progressBar: {
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: rs(2),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  progressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rs(2),
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },
});
