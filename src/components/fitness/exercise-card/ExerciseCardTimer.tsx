import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";

interface ExerciseCardTimerProps {
  showTimer: boolean;
  remainingTime: number;
  formatTime: (seconds: number) => string;
}

export const ExerciseCardTimer: React.FC<ExerciseCardTimerProps> = ({
  showTimer,
  remainingTime,
  formatTime,
}) => {
  if (!showTimer || remainingTime <= 0) return null;

  return (
    <View style={styles.timerSection}>
      <View style={styles.timerDisplay} accessibilityRole="text">
        <Text style={styles.timerText}>Rest: {formatTime(remainingTime)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timerSection: {
    alignItems: "center" as const,
    marginBottom: spacing.md,
  },

  // Solid amber bg + dark text — white-on-amber only computes to ~2.15:1
  // (fails both the 3:1 UI-component and 4.5:1 text minimums); a near-black
  // foreground computes to ~7:1 against #FF9800, comfortably passing AA.
  timerDisplay: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },

  timerText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
});
