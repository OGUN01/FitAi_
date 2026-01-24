/**
 * FeatureGrid Component
 * Cult.fit-style icon grid layout for showcasing features
 * Auto-responsive columns with individual item animations
 */

import React, { useEffect } from "react";
import { StyleSheet, View, Text, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { GlassCard } from "./GlassCard";
import { AnimatedPressable } from "./AnimatedPressable";
import { colors, typography, spacing } from "../../../theme/aurora-tokens";
import { springConfig } from "../../../theme/animations";

export interface Feature {
  /**
   * Icon component or emoji
   */
  icon: React.ReactNode;

  /**
   * Feature title
   */
  title: string;

  /**
   * Feature description (optional)
   */
  description?: string;

  /**
   * Optional press handler
   */
  onPress?: () => void;

  /**
   * Custom background color
   */
  backgroundColor?: string;
}

type AnimationType = "scale" | "fade" | "slideUp" | "stagger" | "none";

export interface FeatureGridProps {
  /**
   * Array of features to display
   */
  features: Feature[];

  /**
   * Number of columns (2, 3, or 4)
   * @default 2
   */
  columns?: 2 | 3 | 4;

  /**
   * Animation type for items
   * @default 'stagger'
   */
  itemAnimation?: AnimationType;

  /**
   * Gap between items
   * @default spacing.md
   */
  gap?: number;

  /**
   * Enable glass effect on items
   * @default true
   */
  glassEffect?: boolean;

  /**
   * Show description text
   * @default true
   */
  showDescription?: boolean;

  /**
   * Additional styles for the container
   */
  style?: ViewStyle;

  /**
   * Item elevation level
   * @default 1
   */
  elevation?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

// Individual Feature Item Component
interface FeatureItemProps {
  feature: Feature;
  index: number;
  animationType: AnimationType;
  glassEffect: boolean;
  showDescription: boolean;
  elevation: number;
}

const FeatureItem: React.FC<FeatureItemProps> = ({
  feature,
  index,
  animationType,
  glassEffect,
  showDescription,
  elevation,
}) => {
  // Animation values
  const scale = useSharedValue(animationType === "scale" ? 0 : 1);
  const opacity = useSharedValue(animationType === "fade" ? 0 : 1);
  const translateY = useSharedValue(animationType === "slideUp" ? 20 : 0);

  useEffect(() => {
    const delay = animationType === "stagger" ? index * 100 : 0;

    if (animationType === "scale") {
      scale.value = withDelay(delay, withSpring(1, springConfig.bounce));
    }

    if (animationType === "fade" || animationType === "stagger") {
      opacity.value = withDelay(
        delay,
        withTiming(1, {
          duration: 400,
          easing: Easing.out(Easing.ease),
        }),
      );
    }

    if (animationType === "slideUp" || animationType === "stagger") {
      translateY.value = withDelay(delay, withSpring(0, springConfig.smooth));
    }
  }, [animationType, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const content = (
    <View style={styles.itemContent}>
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          feature.backgroundColor && {
            backgroundColor: feature.backgroundColor,
          },
        ]}
      >
        {feature.icon}
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {feature.title}
      </Text>

      {/* Description (optional) */}
      {showDescription && feature.description && (
        <Text style={styles.description} numberOfLines={2}>
          {feature.description}
        </Text>
      )}
    </View>
  );

  if (glassEffect) {
    return (
      <Animated.View style={[styles.item, animatedStyle]}>
        {feature.onPress ? (
          <AnimatedPressable
            onPress={feature.onPress}
            scaleValue={0.95}
            hapticFeedback={true}
            hapticType="light"
          >
            <GlassCard
              elevation={elevation as any}
              padding="md"
              borderRadius="lg"
              blurIntensity="light"
            >
              {content}
            </GlassCard>
          </AnimatedPressable>
        ) : (
          <GlassCard
            elevation={elevation as any}
            padding="md"
            borderRadius="lg"
            blurIntensity="light"
          >
            {content}
          </GlassCard>
        )}
      </Animated.View>
    );
  }

  // Non-glass version (simple card)
  return (
    <Animated.View style={[styles.item, animatedStyle]}>
      {feature.onPress ? (
        <AnimatedPressable
          onPress={feature.onPress}
          scaleValue={0.95}
          hapticFeedback={true}
          hapticType="light"
          style={styles.simpleCard}
        >
          {content}
        </AnimatedPressable>
      ) : (
        <View style={styles.simpleCard}>{content}</View>
      )}
    </Animated.View>
  );
};

export const FeatureGrid: React.FC<FeatureGridProps> = ({
  features,
  columns = 2,
  itemAnimation = "stagger",
  gap = spacing.md,
  glassEffect = true,
  showDescription = true,
  style,
  elevation = 1,
}) => {
  return (
    <View style={[styles.container, { gap }, style]}>
      {features.map((feature, index) => (
        <View
          key={`feature-${index}`}
          style={[
            styles.columnWrapper,
            {
              width: `${100 / columns}%`,
              paddingHorizontal: gap / 2,
              marginBottom: gap,
            },
          ]}
        >
          <FeatureItem
            feature={feature}
            index={index}
            animationType={itemAnimation}
            glassEffect={glassEffect}
            showDescription={showDescription}
            elevation={elevation}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.md / 2,
  },
  columnWrapper: {
    marginBottom: spacing.md,
  },
  item: {
    width: "100%",
  },
  itemContent: {
    alignItems: "center",
    gap: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.glass.background,
  },
  title: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.text.primary,
    textAlign: "center",
  },
  description: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.regular as any,
    color: colors.text.secondary,
    textAlign: "center",
  },
  simpleCard: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.glass.background,
  },
});

// Export default
export default FeatureGrid;
