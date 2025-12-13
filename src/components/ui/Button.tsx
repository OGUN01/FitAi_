import React, { useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { THEME } from '../../utils/constants';
import { ResponsiveTheme } from '../../utils/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  pulse?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  pulse = false,
}) => {
  const pulseAnimation = useSharedValue(1);

  // Continuous pulse animation
  useEffect(() => {
    if (pulse && !disabled && !loading) {
      pulseAnimation.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      pulseAnimation.value = withTiming(1, { duration: 200 });
    }
  }, [pulse, disabled, loading]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles[size],
      ...(fullWidth && styles.fullWidth),
    };

    switch (variant) {
      case 'primary':
        return { ...baseStyle, ...styles.primary };
      case 'secondary':
        return { ...baseStyle, ...styles.secondary };
      case 'outline':
        return { ...baseStyle, ...styles.outline };
      case 'ghost':
        return { ...baseStyle, ...styles.ghost };
      default:
        return { ...baseStyle, ...styles.primary };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...styles.baseText,
      ...styles[`${size}Text` as keyof typeof styles],
    };

    switch (variant) {
      case 'primary':
        return { ...baseTextStyle, ...styles.primaryText };
      case 'secondary':
        return { ...baseTextStyle, ...styles.secondaryText };
      case 'outline':
        return { ...baseTextStyle, ...styles.outlineText };
      case 'ghost':
        return { ...baseTextStyle, ...styles.ghostText };
      default:
        return { ...baseTextStyle, ...styles.primaryText };
    }
  };

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  const buttonContent = loading ? (
    <ActivityIndicator
      color={
        variant === 'outline' || variant === 'ghost' ? THEME.colors.primary : THEME.colors.white
      }
      size="small"
    />
  ) : (
    <Text style={[getTextStyle(), disabled && styles.disabledText, textStyle]}>{title}</Text>
  );

  // Use gradient for primary variant
  if (variant === 'primary' && !disabled) {
    return (
      <AnimatedTouchable
        style={[styles.base, styles[size], fullWidth && styles.fullWidth, disabled && styles.disabled, style, animatedStyle]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientContainer, styles[size]]}
        >
          {buttonContent}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      style={[getButtonStyle(), disabled && styles.disabled, style, animatedStyle]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {buttonContent}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: rw(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },

  gradientContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rw(12),
  },

  // Sizes
  sm: {
    paddingHorizontal: rw(16),
    paddingVertical: rh(8),
    minHeight: rh(36),
  },
  md: {
    paddingHorizontal: rw(24),
    paddingVertical: rh(12),
    minHeight: rh(48),
  },
  lg: {
    paddingHorizontal: rw(32),
    paddingVertical: rh(16),
    minHeight: rh(56),
  },

  // Variants
  primary: {
    backgroundColor: ResponsiveTheme.colors.primary,
    ...THEME.shadows.md,
  },
  secondary: {
    backgroundColor: ResponsiveTheme.colors.secondary,
    ...THEME.shadows.md,
  },
  outline: {
    backgroundColor: ResponsiveTheme.colors.transparent,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
  },
  ghost: {
    backgroundColor: ResponsiveTheme.colors.transparent,
  },

  // Text styles
  baseText: {
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    textAlign: 'center',
  },
  smText: {
    fontSize: rf(14),
  },
  mdText: {
    fontSize: rf(16),
  },
  lgText: {
    fontSize: rf(18),
  },

  // Text variants
  primaryText: {
    color: ResponsiveTheme.colors.white,
  },
  secondaryText: {
    color: ResponsiveTheme.colors.white,
  },
  outlineText: {
    color: ResponsiveTheme.colors.primary,
  },
  ghostText: {
    color: ResponsiveTheme.colors.primary,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },

  // Layout
  fullWidth: {
    width: '100%',
  },
});
