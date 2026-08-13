import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rw, rp } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { hexToRgba } from "../../utils/colors";
import { useReducedMotion } from "../../utils/accessibility/hooks";

interface ResourceItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
  animationDelay: number;
}

export const ResourceItem: React.FC<ResourceItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  onPress,
  animationDelay,
}) => {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.delay(animationDelay).duration(400)}
    >
      <AnimatedPressable
        onPress={() => {
          haptics.light();
          onPress();
        }}
        scaleValue={0.98}
        hapticFeedback={false}
      >
        <GlassCard
          elevation={1}
          padding="md"
          blurIntensity="light"
          borderRadius="lg"
          style={styles.resourceCard}
        >
          <View style={styles.resourceContent}>
            <View
              style={[
                styles.iconContainer,
                // hexToRgba(iconColor, 0.08) matches the FAQList.tsx migration
                // (0x15/255 ≈ 0.08 alpha) — replaces the fragile hex-append
                // pattern that silently breaks for 3-digit hex/named colors.
                { backgroundColor: hexToRgba(iconColor, 0.08) },
              ]}
            >
              <Ionicons name={icon} size={rf(18)} color={iconColor} />
            </View>
            <View style={styles.resourceTextContainer}>
              <Text style={styles.resourceTitle}>{title}</Text>
              <Text style={styles.resourceDescription}>{description}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={rf(18)}
              color={colors.textMuted}
            />
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  resourceCard: {
    marginBottom: spacing.sm,
    backgroundColor: colors.glassSurface,
  },
  resourceContent: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  iconContainer: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: spacing.md,
  },
  resourceTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  resourceTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.white,
    marginBottom: rp(2),
  },
  resourceDescription: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
});
