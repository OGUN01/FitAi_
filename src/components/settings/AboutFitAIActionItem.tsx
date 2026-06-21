import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rw, rp, rbr } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface AboutFitAIActionItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
  animationDelay: number;
}

export const AboutFitAIActionItem: React.FC<AboutFitAIActionItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  onPress,
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
          style={styles.actionCard}
        >
          <View style={styles.actionContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${iconColor}15` },
              ]}
            >
              <Ionicons name={icon} size={rf(18)} color={iconColor} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>{title}</Text>
              <Text style={styles.actionDescription}>{description}</Text>
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
  actionCard: {
    marginBottom: spacing.sm,
    backgroundColor: colors.glassSurface,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  actionTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  actionTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.text,
    marginBottom: rp(2),
  },
  actionDescription: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
});
