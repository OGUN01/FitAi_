import React, { useEffect } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { rp } from "../../utils/responsive";
import { flatColors as colors, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";

interface ChartTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  value: string | number;
  label?: string;
  formatValue?: (value: number | string) => string;
  style?: StyleProp<ViewStyle>;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  visible,
  x,
  y,
  value,
  label,
  formatValue,
  style,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(-10);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.8, { duration: 150 });
      translateY.value = withTiming(-10, { duration: 150 });
    }
  }, [visible, x, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x },
      { translateY: y + translateY.value },
      { scale: scale.value },
    ],
  }));

  const displayValue = formatValue
    ? formatValue(value)
    : typeof value === "number"
      ? value.toFixed(1)
      : value;

  if (!visible) return null;

  const a11yLabel = label ? `${label}: ${displayValue}` : String(displayValue);

  return (
    <Animated.View
      style={[styles.container, animatedStyle, style]}
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.bubble}>
        {label && <Text style={styles.label} numberOfLines={1}>{label}</Text>}
        <Text style={styles.value} numberOfLines={1}>{displayValue}</Text>
      </View>
      {/* Arrow rendered as a small triangle (rotated square) — CSS triangle
          borders render with hairline gaps on Android, so we use a rotated
          View instead. */}
      <View style={styles.arrowWrap}>
        <View style={styles.arrow} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    zIndex: 1000,
    elevation: 1000,
  },

  bubble: {
    backgroundColor: colors.surface,
    paddingHorizontal: rp(12),
    paddingVertical: rp(8),
    borderRadius: borderRadius.md,
    elevation: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },

  label: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: rp(2),
    textAlign: "center",
  },

  value: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textAlign: "center",
  },

  arrowWrap: {
    // Wrapper that clips the rotated square so only the bottom half shows,
    // forming a downward-pointing triangle without CSS border tricks (which
    // render with hairline gaps on Android).
    width: rp(12),
    height: rp(6),
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -1,
  },

  arrow: {
    width: rp(10),
    height: rp(10),
    backgroundColor: colors.surface,
    transform: [{ rotate: "45deg" }],
    marginTop: -rp(5),
    borderWidth: 1,
    borderColor: colors.border,
  },
});
