import { flatColors as colors, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp } from "../../../utils/responsive";import { GlassCard } from "../../ui/aurora/GlassCard";
import { WeightProjectionChart } from "../../ui";
import { DataPlaceholder } from "../../ui/DataPlaceholder";
import {
  BodyAnalysisData,
  AdvancedReviewData,
} from "../../../types/onboarding";
import { isValidMetric } from "../../../utils/validationUtils";

interface WeightManagementSectionProps {
  calculatedData: AdvancedReviewData | null;
  bodyAnalysis: BodyAnalysisData | null;
  onNavigateToTab?: (tabNumber: number) => void;
}

export const WeightManagementSection: React.FC<
  WeightManagementSectionProps
> = ({
  calculatedData,
  bodyAnalysis,
  onNavigateToTab,
}) => {
  if (!calculatedData) return null;

  return (
    <GlassCard
      style={styles.sectionEdgeToEdge}
      elevation={2}
      blurIntensity="default"
      padding="none"
      borderRadius="none"
    >
      <View style={styles.sectionTitlePadded}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons
            name="scale-outline"
            size={rf(18)}
            color={colors.primary}
            style={styles.sectionTitleIcon}
          />
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Weight Management
          </Text>
        </View>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <GlassCard
          elevation={2}
          blurIntensity="light"
          padding="lg"
          borderRadius="lg"
          style={styles.weightCardInline}
        >
          {calculatedData.was_rate_capped && (
            <View style={styles.capBanner}>
              <Ionicons name="shield-checkmark-outline" size={rf(14)} color={colors.warning ?? '#f59e0b'} />
              <Text style={styles.capBannerText}>
                Your pace was reduced for safety. See warnings below.
              </Text>
            </View>
          )}

          {isValidMetric(bodyAnalysis?.target_weight_kg) && (
          <View style={styles.weightHeader}>
            <Text style={styles.weightTitle}>Goal Timeline</Text>
            <Text style={styles.timelineWeeks}>
              {calculatedData.estimated_timeline_weeks} weeks
            </Text>
          </View>
          )}

          <View style={styles.chartContainer}>
            {isValidMetric(bodyAnalysis?.current_weight_kg) &&
            isValidMetric(bodyAnalysis?.target_weight_kg) ? (
              <WeightProjectionChart
                currentWeight={bodyAnalysis!.current_weight_kg}
                targetWeight={bodyAnalysis!.target_weight_kg}
                weeks={calculatedData.estimated_timeline_weeks || 12}
                milestones={[
                  Math.round(
                    (calculatedData.estimated_timeline_weeks || 12) * 0.25,
                  ),
                  Math.round(
                    (calculatedData.estimated_timeline_weeks || 12) * 0.5,
                  ),
                  Math.round(
                    (calculatedData.estimated_timeline_weeks || 12) * 0.75,
                  ),
                ]}
                height={180}
              />
            ) : (
              <DataPlaceholder
                icon="scale-outline"
                title="Set a Target Weight"
                message="Enter a target weight in Body Analysis to see your personalized weight projection and plan"
                actionText="Go to Body Analysis"
                onAction={() => onNavigateToTab?.(3)}
              />
            )}
          </View>

        </GlassCard>
      </View>
      <View style={styles.sectionBottomPad} />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  sectionEdgeToEdge: {
    marginBottom: rp(16),
    marginHorizontal: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 0,
  },
  sectionTitlePadded: {
    paddingHorizontal: rp(20),
    paddingTop: rp(16),
    paddingBottom: rp(12),
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleIcon: {
    marginRight: rp(8),
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: rp(20),
  },
  weightCardInline: {
    marginBottom: rp(4),
  },
  capBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 8,
    padding: rp(8),
    marginBottom: rp(10),
    gap: rp(6),
  },
  capBannerText: {
    fontSize: fontSize.sm,
    color: '#f59e0b',
    flex: 1,
  },
  weightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(16),
  },
  weightTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  timelineWeeks: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  chartContainer: {
    marginBottom: rp(16),
  },
  sectionBottomPad: {
    height: rp(20),
  },
});
