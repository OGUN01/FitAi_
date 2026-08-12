/**
 * GuestPromptCard - Aurora 2026: sign-up prompt for guest users.
 * Single surface.1 tinted panel, gradient CTA, pulse icon. No shadows.
 */

import React, { useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Animated as RNAnimated } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import {
  colors,
  surface,
  spacing,
  typography,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

const { variants } = typography;

interface GuestPromptCardProps {
  onSignUpPress: () => void;
  animationDelay?: number;
}

export const GuestPromptCard: React.FC<GuestPromptCardProps> = ({
  onSignUpPress,
  animationDelay = 0,
}) => {
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handlePress = useCallback(() => {
    haptics.medium();
    onSignUpPress();
  }, [onSignUpPress]);

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(350)}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Icon with pulse */}
        <RNAnimated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <LinearGradient
            colors={[colors.primary.DEFAULT, colors.secondary.DEFAULT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Ionicons
              name="lock-open-outline"
              size={rf(22)}
              color={colors.text.primary}
            />
          </LinearGradient>
        </RNAnimated.View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            Unlock Your Full Potential
          </Text>
          <Text style={styles.subtitle} numberOfLines={3}>
            Create a free account to save progress and sync across devices.
          </Text>
        </View>

        {/* CTA */}
        <AnimatedPressable
          onPress={handlePress}
          scaleValue={0.97}
          hapticFeedback={false}
          style={styles.buttonWrapper}
          accessibilityRole="button"
          accessibilityLabel="Sign up free"
        >
          <LinearGradient
            colors={[colors.primary.DEFAULT, colors.primary.light]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Ionicons
              name="person-add-outline"
              size={rf(16)}
              color={colors.text.primary}
            />
            <Text style={styles.buttonText}>Sign Up Free</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: `${colors.primary.DEFAULT}0F`,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: `${colors.primary.DEFAULT}2E`,
    overflow: "hidden",
  },
  content: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
  iconGradient: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    ...variants.cardHeadline,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...variants.caption,
    color: colors.text.secondary,
    textAlign: "center",
  },
  buttonWrapper: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    borderRadius: 12,
  },
  buttonText: {
    ...variants.cardHeadline,
    fontSize: rf(14),
    color: colors.text.primary,
  },
});

export default GuestPromptCard;
