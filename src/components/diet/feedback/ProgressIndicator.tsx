import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  flatColors as colors,
  spacing,
  flatFontSize as fontSize,
} from "../../../theme/aurora-tokens";
import { rh, rbr } from "../../../utils/responsive";

interface ProgressIndicatorProps {
  currentIndex: number;
  totalCount: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentIndex,
  totalCount,
}) => {
  const progressPercentage = ((currentIndex + 1) / totalCount) * 100;

  return (
    <View style={styles.progressIndicator}>
      <Text style={styles.progressText}>
        Food {currentIndex + 1} of {totalCount}
      </Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercentage}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  progressIndicator: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },

  progressBar: {
    height: rh(4),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: rbr(2),
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: rbr(2),
  },
});
