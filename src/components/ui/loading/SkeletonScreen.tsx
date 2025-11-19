/**
 * Skeleton Screen Component
 * Provides loading placeholders with shimmer animation
 * Preserves layout dimensions and provides smooth fade-in transition
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  Easing,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ============================================================================
// TYPES
// ============================================================================

export interface SkeletonProps {
  /**
   * Width of the skeleton element
   */
  width?: number | string;

  /**
   * Height of the skeleton element
   */
  height?: number | string;

  /**
   * Border radius
   */
  borderRadius?: number;

  /**
   * Variant of skeleton
   */
  variant?: 'rect' | 'circle' | 'text' | 'card';

  /**
   * Animation speed in milliseconds
   */
  animationDuration?: number;

  /**
   * Base color of the skeleton
   */
  baseColor?: string;

  /**
   * Highlight color for shimmer effect
   */
  highlightColor?: string;

  /**
   * Custom style
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Whether animation is enabled
   */
  animated?: boolean;
}

export interface SkeletonGroupProps {
  /**
   * Whether the content is loading
   */
  loading: boolean;

  /**
   * Children to render when not loading
   */
  children: React.ReactNode;

  /**
   * Skeleton components to show when loading
   */
  skeleton: React.ReactNode;

  /**
   * Fade transition duration in ms
   */
  fadeDuration?: number;
}

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  variant = 'rect',
  animationDuration = 1500,
  baseColor = 'rgba(255, 255, 255, 0.08)',
  highlightColor = 'rgba(255, 255, 255, 0.15)',
  style,
  animated = true,
}) => {
  const shimmerPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerPosition, {
        toValue: 1,
        duration: animationDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    shimmerAnimation.start();

    return () => {
      shimmerAnimation.stop();
    };
  }, [shimmerPosition, animationDuration, animated]);

  // Calculate dimensions based on variant
  const getDimensions = (): ViewStyle => {
    switch (variant) {
      case 'circle':
        const size = typeof width === 'number' ? width : 40;
        return {
          width: size,
          height: size,
          borderRadius: size / 2,
        };
      case 'text':
        return {
          width,
          height: 16,
          borderRadius: 4,
        };
      case 'card':
        return {
          width,
          height: height || 200,
          borderRadius: 12,
        };
      case 'rect':
      default:
        return {
          width,
          height,
          borderRadius,
        };
    }
  };

  const translateX = shimmerPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View style={[styles.container, getDimensions(), style]}>
      <View style={[styles.base, { backgroundColor: baseColor }]} />
      {animated && (
        <Animated.View
          style={[
            styles.shimmerContainer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              'transparent',
              highlightColor,
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      )}
    </View>
  );
};

// ============================================================================
// SKELETON GROUP COMPONENT
// ============================================================================

/**
 * Wrapper component that handles loading state and fade transitions
 */
export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  loading,
  children,
  skeleton,
  fadeDuration = 300,
}) => {
  const fadeAnim = useRef(new Animated.Value(loading ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: loading ? 0 : 1,
      duration: fadeDuration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [loading, fadeAnim, fadeDuration]);

  if (loading) {
    return <View style={styles.groupContainer}>{skeleton}</View>;
  }

  return (
    <Animated.View style={[styles.groupContainer, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
};

// ============================================================================
// PRESET SKELETONS
// ============================================================================

/**
 * Card skeleton with typical card layout
 */
export const SkeletonCard: React.FC<{ style?: StyleProp<ViewStyle> }> = ({
  style,
}) => (
  <View style={[styles.card, style]}>
    <Skeleton variant="rect" width="100%" height={120} borderRadius={8} />
    <View style={styles.cardContent}>
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="60%" style={{ marginTop: 8 }} />
      <Skeleton variant="text" width="40%" style={{ marginTop: 8 }} />
    </View>
  </View>
);

/**
 * List item skeleton
 */
export const SkeletonListItem: React.FC<{ style?: StyleProp<ViewStyle> }> = ({
  style,
}) => (
  <View style={[styles.listItem, style]}>
    <Skeleton variant="circle" width={48} />
    <View style={styles.listItemContent}>
      <Skeleton variant="text" width="70%" />
      <Skeleton variant="text" width="50%" style={{ marginTop: 8 }} />
    </View>
  </View>
);

/**
 * Profile skeleton
 */
export const SkeletonProfile: React.FC<{ style?: StyleProp<ViewStyle> }> = ({
  style,
}) => (
  <View style={[styles.profile, style]}>
    <Skeleton variant="circle" width={80} />
    <Skeleton variant="text" width="60%" style={{ marginTop: 16 }} />
    <Skeleton variant="text" width="40%" style={{ marginTop: 8 }} />
  </View>
);

/**
 * Text block skeleton (paragraph)
 */
export const SkeletonText: React.FC<{
  lines?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ lines = 3, style }) => (
  <View style={[styles.textBlock, style]}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        width={index === lines - 1 ? '60%' : '100%'}
        style={index > 0 ? { marginTop: 8 } : undefined}
      />
    ))}
  </View>
);

/**
 * Grid skeleton (for card grids)
 */
export const SkeletonGrid: React.FC<{
  columns?: number;
  rows?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ columns = 2, rows = 2, gap = 16, style }) => (
  <View style={[styles.grid, { gap }, style]}>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <View key={rowIndex} style={[styles.gridRow, { gap }]}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <View
            key={colIndex}
            style={[styles.gridItem, { flex: 1 / columns }]}
          >
            <Skeleton variant="card" width="100%" height={150} />
          </View>
        ))}
      </View>
    ))}
  </View>
);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  base: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    width: 300,
    height: '100%',
  },
  groupContainer: {
    width: '100%',
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    marginTop: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  profile: {
    alignItems: 'center',
  },
  textBlock: {
    width: '100%',
  },
  grid: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridItem: {
    flex: 1,
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default Skeleton;

export {
  SkeletonCard,
  SkeletonListItem,
  SkeletonProfile,
  SkeletonText,
  SkeletonGrid,
};
