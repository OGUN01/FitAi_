import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";

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
    marginBottom: ResponsiveTheme.spacing.md,
  },

  timerDisplay: {
    backgroundColor: ResponsiveTheme.colors.warning,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  timerText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },
});
