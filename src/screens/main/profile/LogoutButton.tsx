/**
 * LogoutButton - Sign Out Button Component
 *
 * Features:
 * - Destructive styling
 * - Icon + text
 * - Proper haptic feedback
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing } from "../../../theme/aurora-tokens";
import { rf, rw, rh } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

interface LogoutButtonProps {
  onPress: () => void;
  animationDelay?: number;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  onPress,
  animationDelay = 0,
}) => {
  return (
    <Animated.View
      entering={FadeIn.delay(animationDelay).duration(400)}
      style={styles.container}
    >
      <AnimatedPressable
        onPress={() => {
          haptics.medium();
          onPress();
        }}
        scaleValue={0.97}
        hapticFeedback={false}
      >
        <GlassCard
          elevation={1}
          padding="md"
          blurIntensity="light"
          borderRadius="lg"
          style={styles.card}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="log-out-outline"
                size={rf(20)}
                color={colors.error}
              />
            </View>
            <Text style={styles.text}>Sign Out</Text>
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: "rgba(244, 67, 54, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.15)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  text: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.error,
  },
});

export default LogoutButton;
