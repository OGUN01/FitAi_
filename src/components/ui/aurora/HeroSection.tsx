/**
 * HeroSection Component
 * Large imagery with gradient overlay for visual impact
 * Supports parallax scrolling and flexible content positioning
 */

import React from "react";
import {
  StyleSheet,
  View,
  ImageBackground,
  ViewStyle,
  ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import {
  GradientConfig,
  toLinearGradientProps,
  gradients,
} from "../../../theme/gradients";
import { rw, rh } from "../../../utils/responsive";

const AnimatedImageBackground =
  Animated.createAnimatedComponent(ImageBackground);

type ContentPosition = "top" | "center" | "bottom";

export interface HeroSectionProps {
  /**
   * Image source (local or remote URI)
   */
  image: ImageSourcePropType;

  /**
   * Gradient overlay configuration
   * Uses dark overlay by default for better text contrast
   * @default gradients.overlay.dark
   */
  overlayGradient?: GradientConfig;

  /**
   * Content positioning within the hero
   * @default 'center'
   */
  contentPosition?: ContentPosition;

  /**
   * Enable parallax scrolling effect
   * Requires passing scrollY animated value when enabled
   * @default false
   */
  parallaxEnabled?: boolean;

  /**
   * Animated scroll Y value for parallax effect
   * Required when parallaxEnabled is true
   */
  scrollY?: Animated.SharedValue<number>;

  /**
   * Parallax intensity (higher = more movement)
   * @default 0.5
   */
  parallaxIntensity?: number;

  /**
   * Height of the hero section
   * @default 300
   */
  height?: number;

  /**
   * Minimum height of the hero section
   */
  minHeight?: number;

  /**
   * Maximum height of the hero section
   */
  maxHeight?: number;

  /**
   * Children components (typically text content)
   */
  children?: React.ReactNode;

  /**
   * Additional styles for the container
   */
  style?: ViewStyle;

  /**
   * Additional styles for content area
   */
  contentStyle?: ViewStyle;

  /**
   * Image resize mode
   * @default 'cover'
   */
  resizeMode?: "cover" | "contain" | "stretch" | "center";
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  image,
  overlayGradient = gradients.overlay.dark,
  contentPosition = "center",
  parallaxEnabled = false,
  scrollY,
  parallaxIntensity = 0.5,
  height = 300,
  minHeight,
  maxHeight,
  children,
  style,
  contentStyle,
  resizeMode = "cover",
}) => {
  // Get gradient props for the overlay
  const gradientProps = toLinearGradientProps(overlayGradient);

  // Parallax animation style
  const parallaxStyle = useAnimatedStyle(() => {
    if (!parallaxEnabled || !scrollY) {
      return {};
    }

    // Parallax effect: image moves slower than scroll
    const translateY = interpolate(
      scrollY.value,
      [0, height],
      [0, height * parallaxIntensity],
      Extrapolate.CLAMP,
    );

    return {
      transform: [{ translateY }],
    };
  }, [parallaxEnabled, scrollY, height, parallaxIntensity]);

  // Content position styles
  const getContentPositionStyle = (): ViewStyle => {
    switch (contentPosition) {
      case "top":
        return { justifyContent: "flex-start" as const, paddingTop: 40 };
      case "bottom":
        return { justifyContent: "flex-end" as const, paddingBottom: 40 };
      case "center":
      default:
        return { justifyContent: "center" as const };
    }
  };

  return (
    <View style={[styles.container, { height }, style]}>
      {/* Background Image with Parallax */}
      <AnimatedImageBackground
        source={image}
        style={[styles.image, parallaxStyle]}
        resizeMode={resizeMode}
      >
        {/* Gradient Overlay for Better Text Contrast */}
        <LinearGradient {...(gradientProps as any)} style={styles.overlay}>
          {/* Content Area */}
          <View
            style={[styles.content, getContentPositionStyle(), contentStyle]}
          >
            {children}
          </View>
        </LinearGradient>
      </AnimatedImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    paddingHorizontal: rw(20),
    alignItems: "center" as const,
  },
});

// Export default
export default HeroSection;
