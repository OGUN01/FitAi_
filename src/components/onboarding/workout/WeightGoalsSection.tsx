import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard } from "../../../components/ui/aurora";
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
              color={ResponsiveTheme.colors.warning}
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
              color={ResponsiveTheme.colors.textSecondary}
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
              color={ResponsiveTheme.colors.textSecondary}
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
                  Weekly rate:{" "}
                  {(
                    Math.abs(
                      bodyAnalysisData.current_weight_kg -
                        bodyAnalysisData.target_weight_kg,
                    ) / bodyAnalysisData.target_timeline_weeks
                  ).toFixed(2)}
                  kg/week
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
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
    marginHorizontal: -ResponsiveTheme.spacing.lg,
  },
  sectionTitlePadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${ResponsiveTheme.colors.warning}20`,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  readOnlyText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.warning,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.4,
    flexShrink: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  weightGoalsCardInline: {
    marginTop: ResponsiveTheme.spacing.xs,
  },
  weightGoalsContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  weightGoalItem: {
    alignItems: "center",
  },
  weightGoalLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  weightGoalValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.secondary,
  },
  weeklyRateInfo: {
    alignItems: "center",
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  weeklyRateText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
