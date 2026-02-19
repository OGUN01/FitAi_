import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";

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
    marginBottom: THEME.spacing.md,
  },

  timerDisplay: {
    backgroundColor: THEME.colors.warning,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },

  timerText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
  },
});
