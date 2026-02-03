import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard } from "../../../components/ui/aurora";
import { AnimatedChart } from "../../../components/ui";
import { BodyAnalysisData } from "../../../types/onboarding";

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
            Dimensions.get("window").width - ResponsiveTheme.spacing.lg * 4
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
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.xl,
    marginHorizontal: -ResponsiveTheme.spacing.lg,
  },
  sectionTitlePadded: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.3,
    flexShrink: 1,
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
  goalChart: {
    alignSelf: "center",
    marginVertical: ResponsiveTheme.spacing.md,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
