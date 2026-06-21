/**
 * FitAI — Next Exercise Preview (Aurora)
 *
 * Banner shown during inter-exercise rest, naming the next exercise. Previously
 * a flat primary-tinted block with a left border accent.
 *
 * Aurora modernization: GlassCard with gradientBorder for a premium glass edge,
 * tokenized colors, Ionicons "arrow-forward" accent.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora";
import { colors, spacing, typography } from "../../theme/aurora-tokens";
import { rf, rp } from "../../utils/responsive";

interface NextExercisePreviewProps {
  exerciseName: string;
}

export const NextExercisePreview: React.FC<NextExercisePreviewProps> = ({
  exerciseName,
}) => (
  <GlassCard
    elevation={2}
    gradientBorder
    padding="md"
    borderRadius="lg"
    style={styles.container}
    contentStyle={styles.content}
  >
    <View style={styles.titleRow}>
      <Ionicons
        name="arrow-forward-circle"
        size={rf(16)}
        color={colors.primary.DEFAULT}
      />
      <Text style={styles.nextExerciseTitle}>Next Up</Text>
    </View>
    <Text style={styles.nextExerciseName} numberOfLines={1}>
      {exerciseName}
    </Text>
  </GlassCard>
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: rp(spacing.lg),
    marginTop: rp(spacing.md),
  },
  content: {
    width: "100%",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xxs),
  },
  nextExerciseTitle: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.primary.DEFAULT,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  nextExerciseName: {
    fontSize: rf(typography.fontSize.body),
    color: colors.text.primary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
});
