import React from "react";
import { Text, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";

interface SwipeIndicatorsProps {
  leftIndicatorStyle: any;
  rightIndicatorStyle: any;
}

export const SwipeIndicators: React.FC<SwipeIndicatorsProps> = ({
  leftIndicatorStyle,
  rightIndicatorStyle,
}) => {
  return (
    <>
      <Animated.View
        style={[styles.swipeIndicator, styles.swipeLeft, leftIndicatorStyle]}
      >
        <Text style={styles.swipeIndicatorText}>👎 SKIP</Text>
      </Animated.View>

      <Animated.View
        style={[styles.swipeIndicator, styles.swipeRight, rightIndicatorStyle]}
      >
        <Text style={styles.swipeIndicatorText}>👍 LIKE</Text>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  swipeIndicator: {
    position: "absolute",
    top: spacing.sm,
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },

  swipeLeft: {
    left: spacing.sm,
    borderColor: "#FF4444",
    backgroundColor: "rgba(255, 68, 68, 0.2)",
  },

  swipeRight: {
    right: spacing.sm,
    borderColor: "#44FF44",
    backgroundColor: "rgba(68, 255, 68, 0.2)",
  },

  swipeIndicatorText: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
});
