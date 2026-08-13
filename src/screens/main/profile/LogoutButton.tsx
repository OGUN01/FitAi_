/**
 * LogoutButton - Aurora 2026: destructive sign-out row.
 * Soft error tint on surface, no card nesting, no shadows.
 */

import React, { useCallback } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import {
  colors,
  spacing,
  typography,
} from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

const { variants } = typography;

interface LogoutButtonProps {
  onPress: () => void;
  animationDelay?: number;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  onPress,
  animationDelay = 0,
}) => {
  const reducedMotion = useReducedMotion();
  const handlePress = useCallback(() => {
    haptics.medium();
    onPress();
  }, [onPress]);

  return (
    <Animated.View
      entering={
        reducedMotion ? undefined : FadeInDown.delay(animationDelay).duration(350)
      }
      style={styles.container}
    >
      <AnimatedPressable
        onPress={handlePress}
        scaleValue={0.97}
        hapticFeedback={false}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        accessibilityHint="Logs you out of your FitAI account"
        style={styles.button}
      >
        <Ionicons
          name="log-out-outline"
          size={rf(18)}
          color={colors.error.DEFAULT}
          style={styles.icon}
        />
        <Text style={styles.text}>Sign Out</Text>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: `${colors.error.DEFAULT}14`,
    borderWidth: 1,
    borderColor: `${colors.error.DEFAULT}2E`,
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    ...variants.cardHeadline,
    color: colors.error.DEFAULT,
  },
});

export default LogoutButton;
