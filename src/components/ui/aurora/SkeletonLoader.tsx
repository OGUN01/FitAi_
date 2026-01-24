/**
 * Skeleton Loader Component
 * Placeholder component with shimmer animation for loading states
 * Uses glassmorphism to match Aurora design language
 */

import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { animations } from "../../../theme/animations";
import { colors } from "../../../theme/aurora-tokens";

// ============================================================================
// TYPES
// ============================================================================

export type SkeletonVariant =
  | "text"
  | "title"
  | "avatar"
  | "thumbnail"
  | "card"
  | "button";

export interface SkeletonLoaderProps {
  /**
   * Variant determines the default dimensions
   * @default 'text'
   */
  variant?: SkeletonVariant;

  /**
   * Custom width (overrides variant default)
   */
  width?: number | string;

  /**
   * Custom height (overrides variant default)
   */
  height?: number | string;

  /**
   * Border radius
   * @default variant-specific
   */
  borderRadius?: number;

  /**
   * Custom style
   */
  style?: ViewStyle;

  /**
   * Show shimmer animation
   * @default true
   */
  animated?: boolean;
}

// ============================================================================
// VARIANT DEFAULTS
// ============================================================================

const VARIANT_DIMENSIONS: Record<
  SkeletonVariant,
  { width: number | string; height: number; borderRadius: number }
> = {
  text: { width: "100%", height: 16, borderRadius: 4 },
  title: { width: "80%", height: 24, borderRadius: 6 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  thumbnail: { width: 100, height: 100, borderRadius: 8 },
  card: { width: "100%", height: 120, borderRadius: 12 },
  button: { width: "100%", height: 44, borderRadius: 22 },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = "text",
  width,
  height,
  borderRadius,
  style,
  animated = true,
}) => {
  const shimmerPosition = useSharedValue(0);

  // Get default dimensions from variant
  const variantDefaults = VARIANT_DIMENSIONS[variant];
  const finalWidth = width ?? variantDefaults.width;
  const finalHeight = height ?? variantDefaults.height;
  const finalBorderRadius = borderRadius ?? variantDefaults.borderRadius;

  // Start shimmer animation on mount
  useEffect(() => {
    if (animated) {
      shimmerPosition.value = withRepeat(
        withTiming(1, {
          duration: animations.sequences.shimmer.duration,
          easing: Easing.linear,
        }),
        -1, // Infinite loop
        false, // Don't reverse
      );
    }
  }, [animated]);

  // Animated shimmer style
  const animatedShimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerPosition.value,
      [0, 1],
      [-300, 300], // Shimmer sweep distance
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      style={[
        styles.container,
        {
          width: finalWidth,
          height: finalHeight,
          borderRadius: finalBorderRadius,
        } as any,
        style,
      ]}
      accessibilityLabel="Loading content"
      accessible={true}
    >
      {/* Base skeleton background */}
      <View style={[styles.base, { borderRadius: finalBorderRadius }]} />

      {/* Shimmer gradient overlay */}
      {animated && (
        <Animated.View
          style={[
            styles.shimmerContainer,
            { borderRadius: finalBorderRadius },
            animatedShimmerStyle,
          ]}
        >
          <LinearGradient
            colors={[
              "rgba(255, 255, 255, 0)",
              "rgba(255, 255, 255, 0.1)",
              "rgba(255, 255, 255, 0.2)",
              "rgba(255, 255, 255, 0.1)",
              "rgba(255, 255, 255, 0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmer}
          />
        </Animated.View>
      )}
    </View>
  );
};

// ============================================================================
// PRESET SKELETON LAYOUTS
// ============================================================================

/**
 * Text line skeleton with optional title
 */
export const SkeletonText: React.FC<{
  lines?: number;
  showTitle?: boolean;
  spacing?: number;
}> = ({ lines = 3, showTitle = false, spacing = 8 }) => {
  return (
    <View style={{ gap: spacing }}>
      {showTitle && <SkeletonLoader variant="title" />}
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader
          key={index}
          variant="text"
          width={index === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </View>
  );
};

/**
 * Card skeleton with thumbnail and text
 */
export const SkeletonCard: React.FC<{
  showThumbnail?: boolean;
}> = ({ showThumbnail = true }) => {
  return (
    <View style={styles.cardContainer}>
      {showThumbnail && (
        <SkeletonLoader variant="thumbnail" style={styles.cardThumbnail} />
      )}
      <View style={styles.cardContent}>
        <SkeletonLoader variant="title" width="80%" />
        <SkeletonLoader variant="text" width="100%" style={styles.cardText} />
        <SkeletonLoader variant="text" width="60%" />
      </View>
    </View>
  );
};

/**
 * List item skeleton
 */
export const SkeletonListItem: React.FC<{
  showAvatar?: boolean;
}> = ({ showAvatar = true }) => {
  return (
    <View style={styles.listItem}>
      {showAvatar && <SkeletonLoader variant="avatar" />}
      <View style={styles.listItemContent}>
        <SkeletonLoader variant="text" width="70%" />
        <SkeletonLoader
          variant="text"
          width="40%"
          style={styles.listItemSubtext}
        />
      </View>
    </View>
  );
};

/**
 * Profile skeleton
 */
export const SkeletonProfile: React.FC = () => {
  return (
    <View style={styles.profileContainer}>
      <SkeletonLoader
        variant="avatar"
        width={80}
        height={80}
        borderRadius={40}
      />
      <SkeletonLoader variant="title" width="60%" style={styles.profileName} />
      <SkeletonLoader
        variant="text"
        width="40%"
        style={styles.profileSubtext}
      />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: colors.glass.surface,
    position: "relative",
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glass.surface,
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  shimmer: {
    flex: 1,
    width: 300,
  },

  // Card layout
  cardContainer: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  cardThumbnail: {
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 8,
  },
  cardText: {
    marginTop: 4,
  },

  // List item layout
  listItem: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
    alignItems: "center",
  },
  listItemContent: {
    flex: 1,
    gap: 6,
  },
  listItemSubtext: {
    marginTop: 4,
  },

  // Profile layout
  profileContainer: {
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  profileName: {
    marginTop: 12,
  },
  profileSubtext: {
    marginTop: 4,
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default SkeletonLoader;
