import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rw } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard } from "../../../components/ui/aurora";
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
                color={ResponsiveTheme.colors.primary}
                style={{ marginRight: ResponsiveTheme.spacing.sm }}
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
                    marginTop: ResponsiveTheme.spacing.xs,
                  }}
                >
                  <Ionicons
                    name="bulb-outline"
                    size={rf(12)}
                    color={ResponsiveTheme.colors.primary}
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
              color={ResponsiveTheme.colors.primary}
              style={{ marginRight: ResponsiveTheme.spacing.xs }}
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
                    color={ResponsiveTheme.colors.text}
                    style={{ marginRight: ResponsiveTheme.spacing.xs }}
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
    marginTop: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
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
  calculatedLevelCardInline: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  calculatedLevelContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  calculatedLevelText: {
    flex: 1,
  },
  calculatedLevelTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  calculatedLevelDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },
  calculatedLevelHint: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },
  recommendedTypesCard: {
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.secondary}10`,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  recommendedTypesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  recommendedTypesTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  recommendedTypesDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  recommendedTypesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },
  recommendedTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  recommendedTypeLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  fitnessGrid: {
    gap: ResponsiveTheme.spacing.lg,
  },
  fitnessItem: {
    marginBottom: ResponsiveTheme.spacing.md,
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
    height: ResponsiveTheme.spacing.lg,
  },
});
