import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { THEME } from "../ui";

interface WorkoutProgressBarProps {
  progress: number;
  fadeAnim: Animated.Value;
}

const safeString = (value: any, fallback: string = ""): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number" && Number.isNaN(value)) return fallback;
  if (typeof value === "string") return value;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};

export const WorkoutProgressBar: React.FC<WorkoutProgressBarProps> = ({
  progress,
  fadeAnim,
}) => {
  return (
    <View style={styles.progressBarContainer}>
      <Animated.View
        style={[
          styles.progressBar,
          {
            width: `${Math.min(100, progress * 100)}%`,
            opacity: fadeAnim,
          },
        ]}
      />
      <Text style={styles.progressPercentage}>
        {safeString(Math.round(progress * 100))}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  progressBarContainer: {
    height: 6,
    backgroundColor: THEME.colors.border,
    marginHorizontal: THEME.spacing.lg,
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
  },

  progressBar: {
    height: "100%",
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },

  progressPercentage: {
    position: "absolute",
    right: THEME.spacing.sm,
    top: -20,
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
});
