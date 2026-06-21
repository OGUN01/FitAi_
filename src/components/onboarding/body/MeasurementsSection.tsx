import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";import { GlassCard, AnimatedPressable } from "../../../components/ui/aurora";
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
                  name={getBMICategory(formData.bmi).iconName as ComponentProps<typeof Ionicons>['name']}
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
                              ? colors.success
                              : colors.warning
                          }
                        />
                        <Text
                          style={[
                            styles.weightLossRate,
                            {
                              color: isHealthyRate
                                ? colors.success
                                : colors.warning,
                            },
                          ]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          Your target pace: {weeklyRate.toFixed(2)} kg/week
                          {!isHealthyRate
                            ? " — aggressive, your safe rate will be confirmed on the Review tab"
                            : " (based on your timeline)"}
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
  measurementsGrid: {
    gap: spacing.md,
  },
  measurementItem: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  timelineSlider: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  timelineOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: "transparent",
  },
  timelineOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}25`,
  },
  timelineText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },
  timelineTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  bmiCard: {
    marginTop: spacing.lg,
    backgroundColor: `${colors.primary}05`,
    borderColor: `${colors.primary}20`,
    borderWidth: 1,
  },
  bmiContent: {
    alignItems: "center",
  },
  bmiTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bmiCategory: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  bmiCategoryText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  idealWeightText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  weightLossInfo: {
    width: "100%",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center",
  },
  weightLossRateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  weightLossRate: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  sectionBottomPad: {
    height: spacing.lg,
  },
});
