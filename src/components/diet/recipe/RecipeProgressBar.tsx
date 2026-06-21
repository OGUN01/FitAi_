import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize } from "../../../theme/aurora-tokens";
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  progressBar: {
    height: rh(4),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: rs(2),
    marginBottom: spacing.xs,
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: rs(2),
  },

  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
