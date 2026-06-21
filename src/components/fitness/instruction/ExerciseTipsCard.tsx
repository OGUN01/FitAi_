/**
 * FitAI — Exercise Tips Card (Aurora)
 *
 * Shared 4-tip block extracted from the duplicate implementations in
 * ExerciseInstructionModal and ExerciseDetails (both had the identical
 * hardcoded tip list). One source of truth for the standard exercise tips,
 * styled with aurora tokens.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../theme/aurora-tokens";
import { rf, rp } from "../../../utils/responsive";

const STANDARD_TIPS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "fitness-outline", text: "Focus on proper form over speed or weight" },
  { icon: "resize-outline", text: "Control the movement throughout the full range of motion" },
  { icon: "leaf-outline", text: "Breathe properly — exhale on exertion, inhale on release" },
  { icon: "warning-outline", text: "Stop if you feel pain or discomfort" },
];

export const ExerciseTipsCard: React.FC = () => {
  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>Tips</Text>
      <View style={styles.tipContainer}>
        {STANDARD_TIPS.map((tip, index) => (
          <View key={`tip-${index}`} style={styles.tipRow}>
            <Ionicons name={tip.icon} size={rf(14)} color={colors.secondary.DEFAULT} />
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  detailSection: {
    marginBottom: rp(spacing.xl),
  },
  detailSectionTitle: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    marginBottom: rp(spacing.md),
  },
  tipContainer: {
    backgroundColor: colors.glass.backgroundDark,
    padding: rp(spacing.lg),
    borderRadius: borderRadius.lg,
    gap: rp(spacing.sm),
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rp(spacing.sm),
  },
  tipText: {
    flex: 1,
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    lineHeight: rf(20),
  },
});
