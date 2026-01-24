/**
 * GuestPromptCard - Sign Up Prompt for Guest Users
 *
 * Features:
 * - Compact, elegant design
 * - Lock icon with pulse animation
 * - Properly aligned CTA button
 */

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated as RNAnimated } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

interface GuestPromptCardProps {
  onSignUpPress: () => void;
  animationDelay?: number;
}

export const GuestPromptCard: React.FC<GuestPromptCardProps> = ({
  onSignUpPress,
  animationDelay = 0,
}) => {
  // Pulse animation for the icon
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

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(400)}
      style={styles.container}
    >
      <GlassCard
        elevation={2}
        padding="md"
        blurIntensity="light"
        borderRadius="lg"
        style={styles.card}
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
              colors={["#667eea", "#764ba2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="lock-open-outline" size={rf(22)} color="#fff" />
            </LinearGradient>
          </RNAnimated.View>

          {/* Text */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Unlock Your Full Potential</Text>
            <Text style={styles.subtitle}>
              Create a free account to save progress and sync across devices.
            </Text>
          </View>

          {/* Button */}
          <AnimatedPressable
            onPress={() => {
              haptics.medium();
              onSignUpPress();
            }}
            scaleValue={0.97}
            hapticFeedback={false}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={["#FF6B6B", "#FF8E53"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Ionicons name="person-add-outline" size={rf(16)} color="#fff" />
              <Text style={styles.buttonText}>Sign Up Free</Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  card: {
    backgroundColor: "rgba(102, 126, 234, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.2)",
    overflow: "hidden",
  },
  content: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  iconContainer: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  iconGradient: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
  },
  title: {
    fontSize: rf(16),
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(18),
  },
  buttonWrapper: {
    width: "100%",
    overflow: "hidden",
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.xs,
    paddingVertical: ResponsiveTheme.spacing.sm + 2,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: "hidden",
  },
  buttonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#fff",
  },
});

export default GuestPromptCard;
