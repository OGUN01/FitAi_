/**
 * MetricCard Component
 * Statistics display card with animated number counting
 * Used for displaying metrics like BMI, calories, steps, etc.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import { GlassCard } from './GlassCard';
import { colors, typography, spacing } from '../../../theme/aurora-tokens';
import { duration, easingFunctions } from '../../../theme/animations';

const AnimatedText = Animated.createAnimatedComponent(Text);

type TrendType = 'up' | 'down' | 'neutral';

export interface MetricCardProps {
  /**
   * Metric label (e.g., "BMI", "Calories", "Steps")
   */
  label: string;

  /**
   * Numeric value to display
   */
  value: number;

  /**
   * Icon component or emoji
   */
  icon?: React.ReactNode;

  /**
   * Trend indicator
   * @default 'neutral'
   */
  trend?: TrendType;

  /**
   * Enable count-up animation
   * @default true
   */
  animateValue?: boolean;

  /**
   * Unit string (e.g., "kcal", "kg", "steps")
   */
  unit?: string;

  /**
   * Animation duration in milliseconds
   * @default 1000
   */
  animationDuration?: number;

  /**
   * Number of decimal places to show
   * @default 0
   */
  decimals?: number;

  /**
   * Use glass background
   * @default true
   */
  glassBackground?: boolean;

  /**
   * Use gradient background instead of glass
   * @default false
   */
  gradientBackground?: boolean;

  /**
   * Card elevation level (1-8)
   * @default 2
   */
  elevation?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

  /**
   * Additional styles for the card
   */
  style?: ViewStyle;

  /**
   * Size variant
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  trend = 'neutral',
  animateValue = true,
  unit,
  animationDuration = 1000,
  decimals = 0,
  glassBackground = true,
  gradientBackground = false,
  elevation = 2,
  style,
  size = 'medium',
}) => {
  // Animated value for count-up effect
  const animatedValue = useSharedValue(animateValue ? 0 : value);

  useEffect(() => {
    if (animateValue) {
      animatedValue.value = withTiming(value, {
        duration: animationDuration,
        easing: easingFunctions.easeOutCubic,
      });
    } else {
      animatedValue.value = value;
    }
  }, [value, animateValue, animationDuration]);

  // Format the animated number
  const formattedValue = useDerivedValue(() => {
    return animatedValue.value.toFixed(decimals);
  });

  // Animated props for the value text
  const animatedTextProps = useAnimatedProps(() => {
    return {
      text: formattedValue.value,
    } as any;
  });

  // Get trend indicator symbol and color
  const getTrendIndicator = () => {
    switch (trend) {
      case 'up':
        return { symbol: '↑', color: colors.success.DEFAULT };
      case 'down':
        return { symbol: '↓', color: colors.error.DEFAULT };
      case 'neutral':
      default:
        return { symbol: '−', color: colors.text.muted };
    }
  };

  const trendIndicator = getTrendIndicator();

  // Get size-specific styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: spacing.sm,
          valueFontSize: typography.fontSize.h3,
          labelFontSize: typography.fontSize.caption,
          iconSize: 24,
        };
      case 'large':
        return {
          padding: spacing.lg,
          valueFontSize: typography.fontSize.display,
          labelFontSize: typography.fontSize.h3,
          iconSize: 48,
        };
      case 'medium':
      default:
        return {
          padding: spacing.md,
          valueFontSize: typography.fontSize.h2,
          labelFontSize: typography.fontSize.body,
          iconSize: 32,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <GlassCard
      elevation={elevation}
      padding="none"
      borderRadius="lg"
      blurIntensity={glassBackground && !gradientBackground ? 'default' : 'light'}
      style={style}
      contentStyle={styles.card}
    >
      <View style={[styles.content, { padding: sizeStyles.padding }]}>
        {/* Icon Section */}
        {icon && (
          <View style={[styles.iconContainer, { width: sizeStyles.iconSize, height: sizeStyles.iconSize }]}>
            {icon}
          </View>
        )}

        {/* Metrics Section */}
        <View style={styles.metricsContainer}>
          {/* Value Row */}
          <View style={styles.valueRow}>
            <AnimatedText
              // @ts-ignore - Reanimated AnimatedProps type issue
              animatedProps={animatedTextProps}
              style={[styles.value, { fontSize: sizeStyles.valueFontSize }]}
            >
              {value.toFixed(decimals)}
            </AnimatedText>
            {unit && (
              <Text style={[styles.unit, { fontSize: sizeStyles.labelFontSize }]}>
                {unit}
              </Text>
            )}
          </View>

          {/* Label Row */}
          <View style={styles.labelRow}>
            <Text style={[styles.label, { fontSize: sizeStyles.labelFontSize }]}>
              {label}
            </Text>
            {trend !== 'neutral' && (
              <Text style={[styles.trend, { color: trendIndicator.color }]}>
                {trendIndicator.symbol}
              </Text>
            )}
          </View>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    minWidth: 120,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
  },
  metricsContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  value: {
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text.primary,
  },
  unit: {
    fontWeight: typography.fontWeight.medium as any,
    color: colors.text.secondary,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontWeight: typography.fontWeight.regular as any,
    color: colors.text.secondary,
  },
  trend: {
    fontWeight: typography.fontWeight.bold as any,
    fontSize: typography.fontSize.h3,
  },
});

// Export default
export default MetricCard;
