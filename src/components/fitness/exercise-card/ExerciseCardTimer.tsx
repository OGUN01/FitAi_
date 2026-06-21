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
      <View style={styles.timerDisplay}>
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

  timerDisplay: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },

  timerText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
});
