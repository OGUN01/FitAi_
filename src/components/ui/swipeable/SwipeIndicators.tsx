import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { hexToRgba } from "../../../utils/colors";

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
        <View style={styles.indicatorContent}>
          <Ionicons name="thumbs-down" size={fontSize.md} color={colors.white} />
          <Text style={styles.swipeIndicatorText}>SKIP</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.swipeIndicator, styles.swipeRight, rightIndicatorStyle]}
      >
        <View style={styles.indicatorContent}>
          <Ionicons name="thumbs-up" size={fontSize.md} color={colors.white} />
          <Text style={styles.swipeIndicatorText}>LIKE</Text>
        </View>
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
    borderColor: colors.error,
    backgroundColor: hexToRgba(colors.error, 0.2),
  },

  swipeRight: {
    right: spacing.sm,
    borderColor: colors.success,
    backgroundColor: hexToRgba(colors.success, 0.2),
  },

  indicatorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  swipeIndicatorText: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
});
