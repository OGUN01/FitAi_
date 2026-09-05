import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, surface, border } from "../../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../../theme/fonts";
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
            <Ionicons name="calendar-outline" size={rf(14)} color={colors.background.DEFAULT} />
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
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: rp(4),
    borderRadius: borderRadius.full,
  },
  scheduledText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: rf(12),
    // Near-black on the solid accent fill, not off-white — matches the
    // GlassButton primary-variant label contrast convention.
    color: colors.background.DEFAULT,
  },
  descriptionText: {
    fontSize: rf(13),
    color: colors.text.secondary,
    flex: 1,
    minWidth: 0,
  },
});
