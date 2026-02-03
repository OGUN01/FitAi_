import React from "react";
import { View, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rh } from "../../../../utils/responsive";

interface GoalProgressBarProps {
  progress: number;
  color: string;
}

export const GoalProgressBar: React.FC<GoalProgressBarProps> = ({
  progress,
  color,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBg}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  progressBarContainer: {
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  progressBarBg: {
    height: rh(6),
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: rh(3),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: rh(3),
  },
});
