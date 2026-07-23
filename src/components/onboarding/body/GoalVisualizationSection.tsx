import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../../../components/ui/aurora";
import { AnimatedChart } from "../../../components/ui";
import { BodyAnalysisData } from "../../../types/onboarding";
import { dimensions } from "../../../utils/responsive";

interface GoalVisualizationSectionProps {
  formData: BodyAnalysisData;
}

export const GoalVisualizationSection: React.FC<
  GoalVisualizationSectionProps
> = ({ formData }) => {
  const hasWeightGoal =
    formData.current_weight_kg != null &&
    formData.current_weight_kg > 0 &&
    formData.target_weight_kg != null &&
    formData.target_weight_kg > 0;

  if (!hasWeightGoal) return null;

  return (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Your Transformation Goal
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Visualize your weight journey from current to target
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <AnimatedChart
          currentValue={formData.current_weight_kg!}
          targetValue={formData.target_weight_kg!}
          currentLabel="Current"
          targetLabel="Target"
          unit="kg"
          showProgress={true}
          progressWeeks={formData.target_timeline_weeks || 12}
          width={
            // Clamped screen width (capped to 480 on web/tablet) so the chart
            // sizes against the mobile design width, not a 1920px window.
            dimensions.screenWidth - spacing.lg * 4
          }
          height={280}
          style={styles.goalChart}
        />
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  sectionEdgeToEdge: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    marginHorizontal: -spacing.lg,
  },
  sectionTitlePadded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
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
  goalChart: {
    alignSelf: "center",
    marginVertical: spacing.md,
  },
  sectionBottomPad: {
    height: spacing.lg,
  },
});
