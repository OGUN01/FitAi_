import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rh } from "../../utils/responsive";
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
    <View
      style={styles.outerWrapper}
      accessibilityRole="progressbar"
      accessibilityLabel={`Workout progress: ${Math.round(progress * 100)}%`}
    >
      <Text style={styles.progressPercentage}>
        {safeString(Math.round(progress * 100))}%
      </Text>
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    flexDirection: "column",
  },
  progressBarContainer: {
    height: rh(6),
    backgroundColor: ResponsiveTheme.colors.border,
    marginHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: rbr(3),
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(3),
  },

  progressPercentage: {
    textAlign: "right",
    marginRight: ResponsiveTheme.spacing.lg,
    marginBottom: rp(4),
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
