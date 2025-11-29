import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { rf, rp } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';

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
  gradient = ['#4CAF50', '#45A049'],
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
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
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
            colors={[...gradient, 'transparent']}
            style={styles.glowGradient}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      )}

      {/* Button */}
      <Animated.View style={[styles.button, animatedButtonStyle]}>
        <LinearGradient
          colors={disabled ? ['#BDBDBD', '#9E9E9E'] : gradient}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
            {loading ? 'Loading...' : title}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  glow: {
    position: 'absolute',
    width: '110%',
    height: '110%',
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: 'hidden',
  },

  glowGradient: {
    flex: 1,
  },

  button: {
    width: '100%',
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  buttonGradient: {
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },

  buttonTextDisabled: {
    color: ResponsiveTheme.colors.textMuted,
  },
});
