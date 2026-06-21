import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";import { GlassCard } from "../../../components/ui/aurora";
import {
  WorkoutPreferencesData,
  BodyAnalysisData,
} from "../../../types/onboarding";

interface WeightGoalsSectionProps {
  bodyAnalysisData?: BodyAnalysisData | null;
  formData: WorkoutPreferencesData;
}

export const WeightGoalsSection: React.FC<WeightGoalsSectionProps> = ({
  bodyAnalysisData,
  formData,
}) => {
  if (!bodyAnalysisData) return null;

  return (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weight Goals Summary</Text>
          <View style={styles.readOnlyBadge}>
            <Ionicons
              name="document-text-outline"
              size={rf(12)}
              color={colors.warning}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.readOnlyText}>READ ONLY</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>
          This information was entered in your Body Analysis
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <GlassCard
          elevation={2}
          blurIntensity="default"
          padding="md"
          borderRadius="lg"
          style={styles.weightGoalsCardInline}
        >
          <View style={styles.weightGoalsContent}>
            <View style={styles.weightGoalItem}>
              <Text style={styles.weightGoalLabel}>Current Weight</Text>
              <Text style={styles.weightGoalValue}>
                {bodyAnalysisData.current_weight_kg}kg
              </Text>
            </View>

            <Ionicons
              name="arrow-forward-outline"
              size={rf(20)}
              color={colors.textSecondary}
            />

            <View style={styles.weightGoalItem}>
              <Text style={styles.weightGoalLabel}>Target Weight</Text>
              <Text style={styles.weightGoalValue}>
                {bodyAnalysisData.target_weight_kg ? `${bodyAnalysisData.target_weight_kg}kg` : 'Not set'}
              </Text>
            </View>

            <Ionicons
              name="time-outline"
              size={rf(20)}
              color={colors.textSecondary}
            />

            <View style={styles.weightGoalItem}>
              <Text style={styles.weightGoalLabel}>Timeline</Text>
              <Text style={styles.weightGoalValue}>
                {bodyAnalysisData.target_timeline_weeks}w
              </Text>
            </View>
          </View>

          {bodyAnalysisData.current_weight_kg &&
            bodyAnalysisData.target_weight_kg &&
            bodyAnalysisData.target_timeline_weeks && (
              <View style={styles.weeklyRateInfo}>
                <Text style={styles.weeklyRateText}>
                  Target pace (from Body tab):{" "}
                  {(
                    Math.abs(
                      bodyAnalysisData.current_weight_kg -
                        bodyAnalysisData.target_weight_kg,
                    ) / bodyAnalysisData.target_timeline_weeks
                  ).toFixed(2)}{" "}
                  kg/week — safe achievable rate confirmed on Review tab
                </Text>
              </View>
            )}
        </GlassCard>
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  sectionEdgeToEdge: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: -spacing.lg,
  },
  sectionTitlePadded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.warning}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  readOnlyText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: typography.fontWeight.semibold,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: fontSize.sm * 1.4,
    flexShrink: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: spacing.lg,
  },
  weightGoalsCardInline: {
    marginTop: spacing.xs,
  },
  weightGoalsContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  weightGoalItem: {
    alignItems: "center",
  },
  weightGoalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  weightGoalValue: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  weeklyRateInfo: {
    alignItems: "center",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  weeklyRateText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
  },
  sectionBottomPad: {
    height: spacing.lg,
  },
});
