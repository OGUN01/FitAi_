import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard, AnimatedPressable } from "../../../components/ui/aurora";
import { Input } from "../../../components/ui";
import { BodyAnalysisData } from "../../../types/onboarding";

interface MeasurementsSectionProps {
  formData: BodyAnalysisData;
  updateField: <K extends keyof BodyAnalysisData>(
    field: K,
    value: BodyAnalysisData[K],
  ) => void;
  handleNumberInput: (field: keyof BodyAnalysisData, text: string) => void;
  getFieldError: (field: string) => string | undefined;
  hasFieldError: (field: string) => boolean;
  getBMICategory: (bmi: number) => {
    category: string;
    color: string;
    iconName: string;
  };
}

export const MeasurementsSection: React.FC<MeasurementsSectionProps> = ({
  formData,
  updateField,
  handleNumberInput,
  getFieldError,
  hasFieldError,
  getBMICategory,
}) => {
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
          Basic Measurements
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Provide at least height and current weight to continue. Other fields
          are optional.
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <View style={styles.measurementsGrid}>
          <View style={styles.measurementItem}>
            <Input
              label="Height (cm) *"
              placeholder="e.g. 170"
              value={formData.height_cm ? formData.height_cm.toString() : ""}
              onChangeText={(text) => handleNumberInput("height_cm", text)}
              keyboardType="numeric"
              error={
                hasFieldError("height") ? getFieldError("height") : undefined
              }
            />
          </View>

          <View style={styles.measurementItem}>
            <Input
              label="Current Weight (kg) *"
              placeholder="e.g. 70"
              value={
                formData.current_weight_kg
                  ? formData.current_weight_kg.toString()
                  : ""
              }
              onChangeText={(text) =>
                handleNumberInput("current_weight_kg", text)
              }
              keyboardType="numeric"
              error={
                hasFieldError("current weight")
                  ? getFieldError("current weight")
                  : undefined
              }
            />
          </View>

          <View style={styles.measurementItem}>
            <Input
              label="Target Weight (kg) - Optional"
              placeholder="e.g. 65"
              value={
                formData.target_weight_kg
                  ? formData.target_weight_kg.toString()
                  : ""
              }
              onChangeText={(text) =>
                handleNumberInput("target_weight_kg", text)
              }
              keyboardType="numeric"
              error={
                hasFieldError("target weight")
                  ? getFieldError("target weight")
                  : undefined
              }
            />
          </View>

          <View style={styles.measurementItem}>
            <Text style={styles.inputLabel} numberOfLines={1}>
              Target Timeline (Optional): {formData.target_timeline_weeks} weeks
            </Text>
            <View style={styles.timelineSlider}>
              {[4, 8, 12, 16, 20, 24, 32, 52].map((weeks) => (
                <AnimatedPressable
                  key={`timeline-${weeks}`}
                  style={[
                    styles.timelineOption,
                    ...(formData.target_timeline_weeks === weeks
                      ? [styles.timelineOptionSelected]
                      : []),
                  ]}
                  onPress={() => updateField("target_timeline_weeks", weeks)}
                  scaleValue={0.95}
                >
                  <Text
                    style={[
                      styles.timelineText,
                      ...(formData.target_timeline_weeks === weeks
                        ? [styles.timelineTextSelected]
                        : []),
                    ]}
                    numberOfLines={1}
                  >
                    {weeks}w
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
            {hasFieldError("timeline") && (
              <Text style={styles.errorText}>{getFieldError("timeline")}</Text>
            )}
          </View>
        </View>

        {/* BMI Display */}
        {formData.bmi !== undefined &&
        formData.bmi !== null &&
        formData.bmi > 0 ? (
          <GlassCard
            elevation={3}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.bmiCard}
          >
            <View style={styles.bmiContent}>
              <Text style={styles.bmiTitle} numberOfLines={1}>
                Current BMI: {formData.bmi}
              </Text>
              <View style={styles.bmiCategory}>
                <Ionicons
                  name={getBMICategory(formData.bmi).iconName as any}
                  size={rf(24)}
                  color={getBMICategory(formData.bmi).color}
                />
                <Text
                  style={[
                    styles.bmiCategoryText,
                    { color: getBMICategory(formData.bmi).color },
                  ]}
                  numberOfLines={1}
                >
                  {getBMICategory(formData.bmi).category}
                </Text>
              </View>

              {formData.ideal_weight_min != null &&
              formData.ideal_weight_max != null &&
              formData.ideal_weight_min > 0 &&
              formData.ideal_weight_max > 0 ? (
                <Text
                  style={styles.idealWeightText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Ideal weight range: {formData.ideal_weight_min}kg -{" "}
                  {formData.ideal_weight_max}kg
                </Text>
              ) : null}

              {/* Weight Loss Rate Warning */}
              {formData.current_weight_kg != null &&
              formData.current_weight_kg > 0 &&
              formData.target_weight_kg != null &&
              formData.target_weight_kg > 0 &&
              formData.target_timeline_weeks != null &&
              formData.target_timeline_weeks > 0 ? (
                <View style={styles.weightLossInfo}>
                  {(() => {
                    const weeklyRate =
                      Math.abs(
                        formData.current_weight_kg - formData.target_weight_kg,
                      ) / formData.target_timeline_weeks;
                    const isHealthyRate = weeklyRate <= 1;

                    return (
                      <View style={styles.weightLossRateRow}>
                        <Ionicons
                          name={
                            isHealthyRate ? "checkmark-circle" : "alert-circle"
                          }
                          size={rf(16)}
                          color={
                            isHealthyRate
                              ? ResponsiveTheme.colors.success
                              : ResponsiveTheme.colors.warning
                          }
                        />
                        <Text
                          style={[
                            styles.weightLossRate,
                            {
                              color: isHealthyRate
                                ? ResponsiveTheme.colors.success
                                : ResponsiveTheme.colors.warning,
                            },
                          ]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          Weekly rate: {weeklyRate.toFixed(2)}kg/week
                          {!isHealthyRate && " (Consider slower pace)"}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              ) : null}
            </View>
          </GlassCard>
        ) : null}
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
  measurementsGrid: {
    gap: ResponsiveTheme.spacing.md,
  },
  measurementItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  inputLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  timelineSlider: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },
  timelineOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: "transparent",
  },
  timelineOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}25`,
  },
  timelineText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  timelineTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  bmiCard: {
    marginTop: ResponsiveTheme.spacing.lg,
    backgroundColor: `${ResponsiveTheme.colors.primary}05`,
    borderColor: `${ResponsiveTheme.colors.primary}20`,
    borderWidth: 1,
  },
  bmiContent: {
    alignItems: "center",
  },
  bmiTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  bmiCategory: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  bmiCategoryText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  idealWeightText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  weightLossInfo: {
    width: "100%",
    paddingTop: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    alignItems: "center",
  },
  weightLossRateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  weightLossRate: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
