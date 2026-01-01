/**
 * GlassView Component
 * Reusable blur container for glassmorphism effects
 * Wraps content with frosted glass appearance
 */

import React from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, glassSurface } from '../../../theme/aurora-tokens';

type BlurType = 'light' | 'dark' | 'default';
type BlurAmount = 'light' | 'default' | 'heavy';

interface GlassViewProps {
  /**
   * Blur type (iOS only)
   * @default 'dark'
   */
  blurType?: BlurType;

  /**
   * Blur intensity
   * @default 'default'
   */
  blurAmount?: BlurAmount;

  /**
   * Overlay background color
   * @default 'rgba(255, 255, 255, 0.1)'
   */
  overlayColor?: string;

  /**
   * Show border
   * @default false
   */
  showBorder?: boolean;

  /**
   * Border color
   * @default 'rgba(255, 255, 255, 0.18)'
   */
  borderColor?: string;

  /**
   * Border width
   * @default 1
   */
  borderWidth?: number;

  /**
   * Border radius
   * @default 12
   */
  borderRadius?: number;

  /**
   * Enable performance optimization for Android
   * @default true
   */
  optimizeForAndroid?: boolean;

  /**
   * Children components
   */
  children: React.ReactNode;

  /**
   * Additional styles
   */
  style?: ViewStyle;
}

const getBlurAmount = (amount: BlurAmount): number => {
  switch (amount) {
    case 'light':
      return glassSurface.blur.light;
    case 'heavy':
      return glassSurface.blur.heavy;
    default:
      return glassSurface.blur.default;
  }
};

export const GlassView: React.FC<GlassViewProps> = ({
  blurType = 'dark',
  blurAmount = 'default',
  overlayColor = colors.glass.background,
  showBorder = false,
  borderColor = colors.glass.border,
  borderWidth = 1,
  borderRadius = 12,
  optimizeForAndroid = true,
  children,
  style,
}) => {
  const blurIntensity = getBlurAmount(blurAmount);

  // On Android or Web, use a semi-transparent background as fallback
  // BlurView performance can be inconsistent on older Android devices
  // and may have issues on web platforms
  const useFallback = (Platform.OS === 'android' && optimizeForAndroid) || Platform.OS === 'web';

  if (useFallback) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: overlayColor,
            borderColor: showBorder ? borderColor : 'transparent',
            borderWidth: showBorder ? borderWidth : 0,
            borderRadius,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      style={[
        styles.container,
        {
          borderColor: showBorder ? borderColor : 'transparent',
          borderWidth: showBorder ? borderWidth : 0,
          borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}
      tint={blurType}
      intensity={blurIntensity}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: overlayColor,
          },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});

// Export default
export default GlassView;
