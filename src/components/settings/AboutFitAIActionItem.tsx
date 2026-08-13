import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, surface, border, borderRadius } from "../../theme/aurora-tokens";
import { rf, rw, rp, rbr } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { useReducedMotion } from "../../utils/accessibility/hooks";

interface AboutFitAIActionItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
  animationDelay: number;
  accessibilityLabel?: string;
  testID?: string;
}

export const AboutFitAIActionItem: React.FC<AboutFitAIActionItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  onPress,
  animationDelay,
  accessibilityLabel,
  testID,
}) => {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={
        reducedMotion ? undefined : FadeInDown.delay(animationDelay).duration(400)
      }
    >
      <AnimatedPressable
        onPress={() => {
          haptics.light();
          onPress();
        }}
        scaleValue={0.98}
        hapticFeedback={false}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={description}
        testID={testID}
      >
        <View style={styles.actionCard}>
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
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  actionCard: {
    marginBottom: spacing.sm,
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.card,
    padding: spacing.md,
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
