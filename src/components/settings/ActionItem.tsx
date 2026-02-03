import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface ActionItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
  isDanger?: boolean;
  animationDelay: number;
}

export const ActionItem: React.FC<ActionItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  onPress,
  isDanger = false,
  animationDelay,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
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
          style={
            (isDanger
              ? [styles.actionCard, styles.dangerCard]
              : styles.actionCard) as any
          }
        >
          <View style={styles.actionContent}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isDanger
                    ? "rgba(244, 67, 54, 0.15)"
                    : `${iconColor}15`,
                },
              ]}
            >
              <Ionicons
                name={icon}
                size={rf(18)}
                color={isDanger ? "#F44336" : iconColor}
              />
            </View>
            <View style={styles.textContainer}>
              <Text
                style={[styles.actionTitle, isDanger && styles.dangerTitle]}
              >
                {title}
              </Text>
              <Text style={styles.actionDescription}>{description}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={rf(18)}
              color={ResponsiveTheme.colors.textMuted}
            />
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  actionCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  dangerCard: {
    backgroundColor: "rgba(244, 67, 54, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.2)",
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  iconContainer: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: ResponsiveTheme.spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  actionTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  dangerTitle: {
    color: "#F44336",
  },
  actionDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
});
