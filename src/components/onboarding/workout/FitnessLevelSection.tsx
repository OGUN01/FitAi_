import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";import { GlassCard } from "../../../components/ui/aurora";
import { Slider } from "../../../components/ui";
import {
  INTENSITY_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
} from "../../../screens/onboarding/tabs/WorkoutPreferencesConstants";
import { WorkoutPreferencesData } from "../../../types/onboarding";

interface FitnessLevelSectionProps {
  formData: WorkoutPreferencesData;
  updateField: <K extends keyof WorkoutPreferencesData>(
    field: K,
    value: WorkoutPreferencesData[K],
  ) => void;
  intensityRecommendation: {
    level: "beginner" | "intermediate" | "advanced";
    reasoning: string;
  } | null;
  calculateRecommendedWorkoutTypes: () => string[];
}

export const FitnessLevelSection: React.FC<FitnessLevelSectionProps> = ({
  formData,
  updateField,
  intensityRecommendation,
  calculateRecommendedWorkoutTypes,
}) => {
  const levelInfo = INTENSITY_OPTIONS.find(
    (opt) => opt.value === formData.intensity,
  );

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
          Current Fitness Assessment
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Help us understand your starting point
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        {/* Intensity Recommendation with Reasoning */}
        {intensityRecommendation && (
          <GlassCard
            elevation={2}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.calculatedLevelCardInline}
          >
            <View style={styles.calculatedLevelContent}>
              <Ionicons
                name={(levelInfo?.iconName as ComponentProps<typeof Ionicons>['name']) || "leaf-outline"}
                size={rf(24)}
                color={colors.primary}
                style={{ marginRight: spacing.sm }}
              />
              <View style={styles.calculatedLevelText}>
                <Text style={styles.calculatedLevelTitle} numberOfLines={1}>
                  Recommended Intensity:{" "}
                  {intensityRecommendation.level.charAt(0).toUpperCase() +
                    intensityRecommendation.level.slice(1)}
                </Text>
                <Text
                  style={styles.calculatedLevelDescription}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {intensityRecommendation.reasoning}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: spacing.xs,
                  }}
                >
                  <Ionicons
                    name="bulb-outline"
                    size={rf(12)}
                    color={colors.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={styles.calculatedLevelHint}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    You can change this below if you feel differently
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Recommended Workout Types */}
        <GlassCard
          elevation={2}
          blurIntensity="default"
          padding="md"
          borderRadius="lg"
          style={styles.recommendedTypesCard}
        >
          <View style={styles.recommendedTypesHeader}>
            <Ionicons
              name="flag-outline"
              size={rf(20)}
              color={colors.primary}
              style={{ marginRight: spacing.xs }}
            />
            <Text style={styles.recommendedTypesTitle} numberOfLines={1}>
              Recommended Workout Types
            </Text>
          </View>
          <Text
            style={styles.recommendedTypesDescription}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            Based on your goals, fitness level, and available equipment
          </Text>
          <View style={styles.recommendedTypesList}>
            {calculateRecommendedWorkoutTypes().map((typeId) => {
              const workoutType = WORKOUT_TYPE_OPTIONS.find(
                (opt) => opt.value === typeId,
              );
              return workoutType ? (
                <View key={typeId} style={styles.recommendedTypeItem}>
                  <Ionicons
                    name={workoutType.iconName as ComponentProps<typeof Ionicons>['name']}
                    size={rf(16)}
                    color={colors.text}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text style={styles.recommendedTypeLabel} numberOfLines={1}>
                    {workoutType.label}
                  </Text>
                </View>
              ) : null;
            })}
          </View>
        </GlassCard>

        <View style={styles.fitnessGrid}>
          <View style={styles.fitnessItem}>
            <Slider
              value={formData.workout_experience_years || 0}
              onValueChange={(value) =>
                updateField("workout_experience_years", value)
              }
              minimumValue={0}
              maximumValue={20}
              step={1}
              label="Workout Experience"
              showTooltip={true}
              formatValue={(val) =>
                val === 0 ? "New" : `${val} year${val > 1 ? "s" : ""}`
              }
              style={styles.experienceSlider}
            />
          </View>

          <View style={styles.fitnessItem}>
            <Slider
              value={formData.workout_frequency_per_week || 0}
              onValueChange={(value) =>
                updateField("workout_frequency_per_week", value)
              }
              minimumValue={0}
              maximumValue={7}
              step={1}
              label="Current Workout Frequency"
              showTooltip={true}
              formatValue={(val) => (val === 0 ? "None" : `${val}x per week`)}
              style={styles.frequencySlider}
            />
          </View>

          <View style={styles.fitnessItem}>
            <Slider
              value={formData.can_do_pushups || 0}
              onValueChange={(value) => updateField("can_do_pushups", value)}
              minimumValue={0}
              maximumValue={100}
              step={5}
              label="Max Pushups"
              showTooltip={true}
              formatValue={(val) => (val === 0 ? "None" : `${val} pushups`)}
              style={styles.pushupsSlider}
            />
          </View>

          <View style={styles.fitnessItem}>
            <Slider
              value={formData.can_run_minutes || 0}
              onValueChange={(value) => updateField("can_run_minutes", value)}
              minimumValue={0}
              maximumValue={60}
              step={5}
              label="Continuous Running"
              showTooltip={true}
              formatValue={(val) => (val === 0 ? "None" : `${val} minutes`)}
              style={styles.runningSlider}
            />
          </View>

          <View style={styles.fitnessItem}>
            <Slider
              value={
                formData.flexibility_level === "poor"
                  ? 2
                  : formData.flexibility_level === "fair"
                    ? 5
                    : formData.flexibility_level === "good"
                      ? 7
                      : formData.flexibility_level === "excellent"
                        ? 10
                        : 5
              }
              onValueChange={(value) => {
                let level: "poor" | "fair" | "good" | "excellent" = "fair";
                if (value <= 3) level = "poor";
                else if (value <= 6) level = "fair";
                else if (value <= 8) level = "good";
                else level = "excellent";
                updateField("flexibility_level", level);
              }}
              minimumValue={1}
              maximumValue={10}
              step={1}
              label="Flexibility Level"
              showTooltip={true}
              formatValue={(val) => {
                if (val <= 3) return "Poor";
                if (val <= 6) return "Fair";
                if (val <= 8) return "Good";
                return "Excellent";
              }}
              style={styles.flexibilityGrid}
            />
          </View>
        </View>
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
  calculatedLevelCardInline: {
    marginBottom: spacing.md,
  },
  calculatedLevelContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  calculatedLevelText: {
    flex: 1,
  },
  calculatedLevelTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  calculatedLevelDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(18),
  },
  calculatedLevelHint: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  recommendedTypesCard: {
    padding: spacing.md,
    backgroundColor: `${colors.secondary}10`,
    marginBottom: spacing.lg,
  },
  recommendedTypesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  recommendedTypesTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  recommendedTypesDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  recommendedTypesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  recommendedTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  recommendedTypeLabel: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },
  fitnessGrid: {
    gap: spacing.lg,
  },
  fitnessItem: {
    marginBottom: spacing.md,
  },
  experienceSlider: {
    width: "100%",
  },
  frequencySlider: {
    width: "100%",
  },
  pushupsSlider: {
    width: "100%",
  },
  runningSlider: {
    width: "100%",
  },
  flexibilityGrid: {},
  sectionBottomPad: {
    height: spacing.lg,
  },
});
