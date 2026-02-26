import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { WeightProjectionChart } from "../../ui";
import { DataPlaceholder } from "../../ui/DataPlaceholder";
import {
  BodyAnalysisData,
  AdvancedReviewData,
} from "../../../types/onboarding";
import { RateComparisonCard } from "../../onboarding/RateComparisonCard";
import {
  SmartAlternative,
  SmartAlternativesResult,
} from "../../../services/validationEngine";
import { isValidMetric } from "../../../utils/validationUtils";

interface WeightManagementSectionProps {
  calculatedData: AdvancedReviewData | null;
  bodyAnalysis: BodyAnalysisData | null;
  smartAlternatives: SmartAlternativesResult | null;
  selectedAlternativeId: string | null;
  handleRateSelection: (alternative: SmartAlternative) => Promise<void>;
  onNavigateToTab?: (tabNumber: number) => void;
}

export const WeightManagementSection: React.FC<
  WeightManagementSectionProps
> = ({
  calculatedData,
  bodyAnalysis,
  smartAlternatives,
  selectedAlternativeId,
  handleRateSelection,
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
            color={ResponsiveTheme.colors.primary}
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

          {/* Smart Rate Alternatives Card */}
          {smartAlternatives?.showRateComparison && (
            <RateComparisonCard
              alternativesResult={smartAlternatives}
              selectedAlternativeId={selectedAlternativeId}
              onSelectAlternative={handleRateSelection}
            />
          )}
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
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  edgeToEdgeContentPadded: {
    paddingHorizontal: rp(20),
  },
  weightCardInline: {
    marginBottom: rp(4),
  },
  weightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(16),
  },
  weightTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  timelineWeeks: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },
  chartContainer: {
    marginBottom: rp(16),
  },
  sectionBottomPad: {
    height: rp(20),
  },
});
