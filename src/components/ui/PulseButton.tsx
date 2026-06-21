import React, { useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { rf, rp } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";

interface PulseButtonProps {
  title: string;
  onPress: () => void;
  gradient?: string[];
  disabled?: boolean;
  loading?: boolean;
  pulseEnabled?: boolean;
  style?: ViewStyle;
}

export const PulseButton: React.FC<PulseButtonProps> = ({
  title,
  onPress,
  gradient = [colors.success, colors.success],
  disabled = false,
  loading = false,
  pulseEnabled = true,
  style,
}) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.7);

  useEffect(() => {
    if (pulseEnabled && !disabled && !loading) {
      // Continuous pulse animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );

      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.7, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
    return () => { cancelAnimation(pulseScale); cancelAnimation(pulseOpacity); };
  }, [pulseEnabled, disabled, loading]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.container, style]}
    >
      {/* Outer Glow */}
      {pulseEnabled && !disabled && !loading && (
        <Animated.View style={[styles.glow, animatedGlowStyle]}>
          <LinearGradient
            colors={[...gradient, "transparent"] as unknown as readonly [string, string, ...string[]]}
            style={styles.glowGradient}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      )}

      {/* Button */}
      <Animated.View style={[styles.button, animatedButtonStyle]}>
        <LinearGradient
          colors={(disabled ? [colors.neutral, colors.neutral] : gradient) as unknown as readonly [string, string, ...string[]]}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text
            style={[styles.buttonText, disabled && styles.buttonTextDisabled]}
          >
            {loading ? "Loading..." : title}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  glow: {
    position: "absolute",
    width: "110%",
    height: "110%",
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },

  glowGradient: {
    flex: 1,
  },

  button: {
    width: "100%",
    borderRadius: borderRadius.full,
    overflow: "hidden",
    boxShadow: '0px 4px 8px rgba(0,0,0,0.3)',
    elevation: 8,
    minHeight: 44,
  },

  buttonGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  buttonText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },

  buttonTextDisabled: {
    color: colors.textMuted,
  },
});
