import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, borderRadius, surface, border } from "../../../theme/aurora-tokens";
import { rf, rp } from "../../../utils/responsive";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

interface DescriptionCardProps {
  scheduledCount: number;
}

export const DescriptionCard: React.FC<DescriptionCardProps> = ({
  scheduledCount,
}) => {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.delay(50).duration(400)}
    >
      <View style={styles.descriptionCard}>
        <View style={styles.descriptionContent}>
          <View style={styles.scheduledBadge}>
            <Ionicons name="calendar-outline" size={rf(14)} color={colors.text} />
            <Text style={styles.scheduledText}>{scheduledCount}</Text>
          </View>
          <Text style={styles.descriptionText}>
            notifications currently scheduled
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  descriptionCard: {
    marginBottom: spacing.lg,
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.card,
    padding: spacing.md,
  },
  descriptionContent: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: spacing.sm,
  },
  scheduledBadge: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: rp(4),
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: rp(4),
    borderRadius: borderRadius.full,
  },
  scheduledText: {
    fontSize: rf(12),
    fontWeight: "700",
    color: colors.text,
  },
  descriptionText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    flex: 1,
    minWidth: 0,
  },
});
