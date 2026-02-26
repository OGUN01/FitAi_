import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  gradientColors: [string, string];
  title: string;
  onPress: () => void;
  animationDelay: number;
}

export const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  iconColor,
  gradientColors,
  title,
  onPress,
  animationDelay,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(400)}
      style={styles.quickActionWrapper}
    >
      <AnimatedPressable
        onPress={() => {
          haptics.light();
          onPress();
        }}
        scaleValue={0.95}
        hapticFeedback={false}
      >
        <GlassCard
          elevation={1}
          padding="md"
          blurIntensity="light"
          borderRadius="lg"
          style={styles.quickActionCard}
        >
          <LinearGradient
            colors={gradientColors}
            style={styles.quickActionIcon}
          >
            <Ionicons name={icon} size={rf(22)} color={ResponsiveTheme.colors.white} />
          </LinearGradient>
          <Text style={styles.quickActionTitle}>{title}</Text>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  quickActionWrapper: {
    width: "48.5%",
  },
  quickActionCard: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: ResponsiveTheme.spacing.lg,
    backgroundColor: ResponsiveTheme.colors.glassSurface,
  },
  quickActionIcon: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  quickActionTitle: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
    textAlign: "center",
  },
});
