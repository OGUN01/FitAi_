/**
 * Aurora Spinner Component
 * Rotating gradient ring spinner matching Aurora design language
 * Provides size variants and theme-aware colors
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ============================================================================
// TYPES
// ============================================================================

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AuroraSpinnerProps {
  /**
   * Size variant of the spinner
   */
  size?: SpinnerSize;

  /**
   * Custom size in pixels (overrides size variant)
   */
  customSize?: number;

  /**
   * Animation duration in milliseconds
   */
  duration?: number;

  /**
   * Gradient colors for the spinner
   */
  colors?: string[];

  /**
   * Thickness of the ring
   */
  thickness?: number;

  /**
   * Custom style
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Whether to show the spinner
   */
  visible?: boolean;
}

// ============================================================================
// SIZE CONFIGURATIONS
// ============================================================================

const SIZE_CONFIG: Record<SpinnerSize, { size: number; thickness: number }> = {
  sm: { size: 24, thickness: 2 },
  md: { size: 40, thickness: 3 },
  lg: { size: 60, thickness: 4 },
  xl: { size: 80, thickness: 5 },
};

// ============================================================================
// DEFAULT AURORA GRADIENT COLORS
// ============================================================================

const DEFAULT_AURORA_COLORS = [
  '#4ECDC4', // Teal
  '#FF6B6B', // Coral
  '#FFC107', // Amber
  '#4ECDC4', // Teal (loop)
];

// ============================================================================
// AURORA SPINNER COMPONENT
// ============================================================================

export const AuroraSpinner: React.FC<AuroraSpinnerProps> = ({
  size = 'md',
  customSize,
  duration = 1200,
  colors = DEFAULT_AURORA_COLORS,
  thickness,
  style,
  visible = true,
}) => {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(visible ? 1 : 0)).current;

  // Get size configuration
  const config = SIZE_CONFIG[size];
  const spinnerSize = customSize || config.size;
  const ringThickness = thickness || config.thickness;

  useEffect(() => {
    // Rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    rotateAnimation.start();

    return () => {
      rotateAnimation.stop();
    };
  }, [rotateValue, duration]);

  useEffect(() => {
    // Fade in/out animation
    Animated.timing(fadeValue, {
      toValue: visible ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [visible, fadeValue]);

  const rotation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible && fadeValue.__getValue() === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: spinnerSize,
          height: spinnerSize,
          opacity: fadeValue,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.spinner,
          {
            width: spinnerSize,
            height: spinnerSize,
            transform: [{ rotate: rotation }],
          },
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            {
              width: spinnerSize,
              height: spinnerSize,
              borderRadius: spinnerSize / 2,
            },
          ]}
        >
          {/* Inner circle to create ring effect */}
          <View
            style={[
              styles.innerCircle,
              {
                width: spinnerSize - ringThickness * 2,
                height: spinnerSize - ringThickness * 2,
                borderRadius: (spinnerSize - ringThickness * 2) / 2,
              },
            ]}
          />
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
};

// ============================================================================
// PRESET SPINNER VARIANTS
// ============================================================================

/**
 * Small Aurora Spinner
 */
export const AuroraSpinnerSmall: React.FC<
  Omit<AuroraSpinnerProps, 'size'>
> = (props) => <AuroraSpinner {...props} size="sm" />;

/**
 * Medium Aurora Spinner (default)
 */
export const AuroraSpinnerMedium: React.FC<
  Omit<AuroraSpinnerProps, 'size'>
> = (props) => <AuroraSpinner {...props} size="md" />;

/**
 * Large Aurora Spinner
 */
export const AuroraSpinnerLarge: React.FC<
  Omit<AuroraSpinnerProps, 'size'>
> = (props) => <AuroraSpinner {...props} size="lg" />;

/**
 * Extra Large Aurora Spinner
 */
export const AuroraSpinnerXLarge: React.FC<
  Omit<AuroraSpinnerProps, 'size'>
> = (props) => <AuroraSpinner {...props} size="xl" />;

// ============================================================================
// LOADING OVERLAY
// ============================================================================

export interface LoadingOverlayProps {
  /**
   * Whether the overlay is visible
   */
  visible: boolean;

  /**
   * Loading message
   */
  message?: string;

  /**
   * Spinner size
   */
  spinnerSize?: SpinnerSize;

  /**
   * Background color of overlay
   */
  backgroundColor?: string;

  /**
   * Custom style for overlay
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Full-screen loading overlay with Aurora Spinner
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  spinnerSize = 'lg',
  backgroundColor = 'rgba(0, 0, 0, 0.7)',
  style,
}) => {
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeValue, {
      toValue: visible ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [visible, fadeValue]);

  if (!visible && fadeValue.__getValue() === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          backgroundColor,
          opacity: fadeValue,
        },
        style,
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.overlayContent}>
        <AuroraSpinner size={spinnerSize} />
        {message && (
          <Animated.Text
            style={[
              styles.overlayMessage,
              {
                opacity: fadeValue,
              },
            ]}
          >
            {message}
          </Animated.Text>
        )}
      </View>
    </Animated.View>
  );
};

// ============================================================================
// INLINE LOADING
// ============================================================================

export interface InlineLoadingProps {
  /**
   * Whether loading is active
   */
  loading: boolean;

  /**
   * Content to show when not loading
   */
  children: React.ReactNode;

  /**
   * Spinner size
   */
  spinnerSize?: SpinnerSize;

  /**
   * Loading message
   */
  message?: string;

  /**
   * Custom style
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Inline loading component that replaces content
 */
export const InlineLoading: React.FC<InlineLoadingProps> = ({
  loading,
  children,
  spinnerSize = 'md',
  message,
  style,
}) => {
  if (loading) {
    return (
      <View style={[styles.inlineContainer, style]}>
        <AuroraSpinner size={spinnerSize} />
        {message && <View style={styles.messageContainer}>
          <Animated.Text style={styles.inlineMessage}>{message}</Animated.Text>
        </View>}
      </View>
    );
  }

  return <>{children}</>;
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    backgroundColor: '#0A0A0A', // Match dark background
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayMessage: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  inlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  messageContainer: {
    marginTop: 12,
  },
  inlineMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default AuroraSpinner;

export {
  AuroraSpinnerSmall,
  AuroraSpinnerMedium,
  AuroraSpinnerLarge,
  AuroraSpinnerXLarge,
  LoadingOverlay,
  InlineLoading,
};
