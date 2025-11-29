import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  interpolateColor,
  Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { rf, rp, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';

interface ToggleCardProps {
  title: string;
  description?: string;
  isActive: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  gradient?: string[];
  disabled?: boolean;
  style?: ViewStyle;
}

export const ToggleCard: React.FC<ToggleCardProps> = ({
  title,
  description,
  isActive,
  onToggle,
  icon,
  gradient = ['#4CAF50', '#45A049'],
  disabled = false,
  style,
}) => {
  const toggleAnimation = useSharedValue(0);
  const cardScale = useSharedValue(1);

  useEffect(() => {
    toggleAnimation.value = withSpring(isActive ? 1 : 0, {
      damping: 20,
      stiffness: 150,
    });
  }, [isActive]);

  // Card background animation
  const animatedCardStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      toggleAnimation.value,
      [0, 1],
      [ResponsiveTheme.colors.backgroundSecondary, `${gradient[0]}15`]
    );

    return {
      backgroundColor,
      transform: [{ scale: cardScale.value }],
      borderColor: isActive ? gradient[0] : ResponsiveTheme.colors.border,
    };
  });

  // Toggle switch background animation
  const animatedSwitchStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      toggleAnimation.value,
      [0, 1],
      [ResponsiveTheme.colors.backgroundTertiary, gradient[0]]
    );

    return {
      backgroundColor,
      borderColor: isActive ? gradient[0] : ResponsiveTheme.colors.border,
    };
  });

  // Toggle thumb animation
  const animatedThumbStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      toggleAnimation.value,
      [0, 1],
      [rp(2), rw(40) - rw(16) - rp(4)],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateX }],
    };
  });

  const handlePress = () => {
    if (!disabled) {
      cardScale.value = withSpring(0.98, {
        damping: 10,
        stiffness: 300,
      });
      setTimeout(() => {
        cardScale.value = withSpring(1, {
          damping: 10,
          stiffness: 300,
        });
      }, 100);
      onToggle();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      disabled={disabled}
      style={style}
    >
      <Animated.View style={[styles.card, animatedCardStyle, disabled && styles.cardDisabled]}>
        <View style={styles.content}>
          {/* Icon */}
          {icon && <View style={styles.iconContainer}>{icon}</View>}

          {/* Text Content */}
          <View style={styles.textContent}>
            <Text style={[styles.title, disabled && styles.titleDisabled]}>
              {title}
            </Text>
            {description && (
              <Text style={[styles.description, disabled && styles.descriptionDisabled]}>
                {description}
              </Text>
            )}
          </View>

          {/* Toggle Switch */}
          <Animated.View style={[styles.toggleSwitch, animatedSwitchStyle]}>
            <Animated.View style={[styles.toggleThumb, animatedThumbStyle]}>
              <LinearGradient
                colors={['#FFFFFF', '#F5F5F5']}
                style={styles.thumbGradient}
              />
            </Animated.View>
          </Animated.View>
        </View>

        {/* Active Indicator Bar */}
        {isActive && (
          <View style={styles.activeIndicator}>
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeIndicatorGradient}
            />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: ResponsiveTheme.borderRadius.xl,
    borderWidth: 2,
    padding: ResponsiveTheme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },

  cardDisabled: {
    opacity: 0.5,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    marginRight: ResponsiveTheme.spacing.md,
    width: rf(40),
    height: rf(40),
    alignItems: 'center',
    justifyContent: 'center',
  },

  textContent: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.md,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  titleDisabled: {
    color: ResponsiveTheme.colors.textMuted,
  },

  description: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },

  descriptionDisabled: {
    color: ResponsiveTheme.colors.textMuted,
  },

  toggleSwitch: {
    width: rw(40),
    height: rp(20),
    borderRadius: rp(10),
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: rp(2),
  },

  toggleThumb: {
    width: rw(16),
    height: rp(16),
    borderRadius: rp(8),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },

  thumbGradient: {
    flex: 1,
  },

  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: rp(4),
    overflow: 'hidden',
  },

  activeIndicatorGradient: {
    flex: 1,
  },
});
