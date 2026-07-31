import React from "react";
import { View, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { spacing, border } from "../../../../theme/aurora-tokens";
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
    marginBottom: spacing.xs,
  },
  // Hairline track on a surface fill — the Editorial-Dark inline meter (no
  // cast shadow, no rgba literal). Uses border.subtle for the unfilled track.
  progressBarBg: {
    height: rh(6),
    backgroundColor: border.subtle,
    borderRadius: rh(3),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: rh(3),
  },
});
