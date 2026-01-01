/**
 * GlassCard Component
 * Glassmorphic card with blur effect, optional gradient border, and elevation
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { GlassView } from './aurora/GlassView';
import { spacing, shadows, borderRadius as br } from '../../theme/aurora-tokens';

type ElevationLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type PaddingSize = 'none' | 'sm' | 'md' | 'lg' | 'xl';
type BorderRadiusSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface GlassCardProps {
  /**
   * Blur intensity for glass effect
   * @default 'default'
   */
  blurIntensity?: 'light' | 'default' | 'heavy';

  /**
   * Elevation level (1-8)
   * @default 3
   */
  elevation?: ElevationLevel;

  /**
   * Show gradient border
   * @default false
   */
  gradientBorder?: boolean;

  /**
   * Internal padding size
   * @default 'md'
   */
  padding?: PaddingSize;

  /**
   * Border radius size
   * @default 'lg'
   */
  borderRadius?: BorderRadiusSize;

  /**
   * Show standard border
   * @default true
   */
  showBorder?: boolean;

  /**
   * Enable press effect
   * @default false
   */
  pressable?: boolean;

  /**
   * Press handler
   */
  onPress?: () => void;

  /**
   * Children components
   */
  children: React.ReactNode;

  /**
   * Additional styles
   */
  style?: ViewStyle;

  /**
   * Content container styles
   */
  contentStyle?: ViewStyle;
}

const getPaddingValue = (size: PaddingSize): number => {
  switch (size) {
    case 'none':
      return 0;
    case 'sm':
      return spacing.sm;
    case 'md':
      return spacing.md;
    case 'lg':
      return spacing.lg;
    case 'xl':
      return spacing.xl;
    default:
      return spacing.md;
  }
};

const getBorderRadiusValue = (size: BorderRadiusSize): number => {
  switch (size) {
    case 'none':
      return 0;
    case 'sm':
      return br.sm;
    case 'md':
      return br.md;
    case 'lg':
      return br.lg;
    case 'xl':
      return br.xl;
    case 'xxl':
      return br.xxl;
    default:
      return br.lg;
  }
};

const getShadowStyle = (level: ElevationLevel) => {
  const shadowKey = `level${level}` as keyof typeof shadows;
  return shadows[shadowKey];
};

export const GlassCard: React.FC<GlassCardProps> = ({
  blurIntensity = 'default',
  elevation = 3,
  gradientBorder = false,
  padding = 'md',
  borderRadius = 'lg',
  showBorder = true,
  pressable = false,
  onPress,
  children,
  style,
  contentStyle,
}) => {
  const paddingValue = getPaddingValue(padding);
  const borderRadiusValue = getBorderRadiusValue(borderRadius);
  const shadowStyle = getShadowStyle(elevation);

  const containerStyle: ViewStyle = {
    borderRadius: borderRadiusValue,
    ...shadowStyle,
  };

  const content = (
    <View style={[styles.shadowWrapper, containerStyle, style]}>
      <GlassView
        blurAmount={blurIntensity}
        borderRadius={borderRadiusValue}
        showBorder={!gradientBorder && showBorder}
        style={styles.glassContainer}
      >
        <View style={[styles.content, { padding: paddingValue }, contentStyle]}>
          {children}
        </View>
      </GlassView>
    </View>
  );

  // TODO: Add gradient border wrapper when implementing advanced features
  // For now, return basic glass card

  if (pressable && onPress) {
    // TODO: Wrap with AnimatedPressable when implemented
    return content;
  }

  return content;
};

const styles = StyleSheet.create({
  shadowWrapper: {
    // Shadow wrapper - contains shadow properties
    overflow: 'hidden', // Ensure content is clipped within bounds
  },
  glassContainer: {
    overflow: 'hidden',
  },
  content: {
    width: '100%',
    overflow: 'hidden', // Additional clipping for content
  },
});

// Export default
export default GlassCard;
