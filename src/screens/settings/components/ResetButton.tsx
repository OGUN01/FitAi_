import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { colors, spacing, borderRadius, surface, border } from "../../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../../theme/fonts";
import { rf, rw, rp, rbr } from "../../../utils/responsive";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

interface ResetButtonProps {
  onPress: () => void;
}

export const ResetButton: React.FC<ResetButtonProps> = ({ onPress }) => {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.delay(350).duration(400)}
    >
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.98}
        hapticFeedback={true}
        hapticType="light"
        accessibilityRole="button"
        accessibilityLabel="Reset notification settings"
        accessibilityHint="Restores all notification settings to their defaults"
      >
        <View style={styles.actionCard}>
          <View style={styles.actionContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${colors.error.DEFAULT}1F` },
              ]}
            >
              <Ionicons name="refresh-outline" size={rf(20)} color={colors.error.DEFAULT} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Reset to Defaults</Text>
              <Text style={styles.actionDescription}>
                Restore all notification settings
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={rf(18)}
              color={colors.text.tertiary}
            />
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.card,
    padding: spacing.md,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  iconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rbr(12),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: spacing.md,
  },
  actionTextContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  actionTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: rf(15),
    color: colors.text.primary,
    marginBottom: rp(2),
  },
  actionDescription: {
    fontSize: rf(12),
    color: colors.text.secondary,
  },
});
