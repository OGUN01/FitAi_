import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rs, rbr, rp } from "../../../utils/responsive";import { GlassCard, AnimatedPressable } from "../../../components/ui/aurora";
import { Input, Slider } from "../../../components/ui";
import { MultiSelectWithCustom } from "../../../components/advanced/MultiSelectWithCustom";
import {
  MEDICAL_CONDITIONS_OPTIONS,
  PHYSICAL_LIMITATIONS_OPTIONS,
} from "../../../screens/onboarding/tabs/BodyAnalysisConstants";
import { BodyAnalysisData, PersonalInfoData } from "../../../types/onboarding";

interface MedicalSectionProps {
  formData: BodyAnalysisData;
  updateField: <K extends keyof BodyAnalysisData>(
    field: K,
    value: BodyAnalysisData[K],
  ) => void;
  personalInfoData?: PersonalInfoData | null;
}

export const MedicalSection: React.FC<MedicalSectionProps> = ({
  formData,
  updateField,
  personalInfoData,
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
        <Text style={styles.sectionTitle}>Medical Information</Text>
        <Text style={styles.sectionSubtitle}>
          Help us create safe and effective recommendations
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        {/* Medical Conditions */}
        <View style={styles.medicalField}>
          <MultiSelectWithCustom
            options={MEDICAL_CONDITIONS_OPTIONS}
            selectedValues={formData.medical_conditions}
            onSelectionChange={(values) =>
              updateField("medical_conditions", values)
            }
            label="Medical Conditions (Optional)"
            placeholder="Select any medical conditions"
            searchable={true}
            allowCustom={true}
            customLabel="Add Custom Condition"
            customPlaceholder="Enter your specific condition"
          />
        </View>

        {/* Medications */}
        <View style={styles.medicalField}>
          <Input
            label="Current Medications (Optional)"
            placeholder="e.g., Metformin, Lisinopril (separate with commas)"
            value={formData.medications.join(", ")}
            onChangeText={(text) =>
              updateField(
                "medications",
                text
                  .split(",")
                  .map((med) => med.trim())
                  .filter(Boolean),
              )
            }
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Physical Limitations */}
        <View style={styles.medicalField}>
          <MultiSelectWithCustom
            options={PHYSICAL_LIMITATIONS_OPTIONS}
            selectedValues={formData.physical_limitations}
            onSelectionChange={(values) =>
              updateField("physical_limitations", values)
            }
            label="Physical Limitations (Optional)"
            placeholder="Select any physical limitations"
            searchable={true}
            allowCustom={true}
            customLabel="Add Custom Limitation"
            customPlaceholder="Enter your specific limitation"
          />
        </View>

        {/* Women-specific health status */}
        {personalInfoData?.gender === "female" && (
          <View style={styles.medicalField}>
            <Text style={styles.fieldLabel}>
              Pregnancy & Breastfeeding Status
            </Text>
            <Text style={styles.fieldHint}>
              Critical for safe calorie recommendations
            </Text>

            <View style={styles.checkboxContainer}>
              <AnimatedPressable
                style={styles.checkbox}
                onPress={() => {
                  const newStatus = !formData.pregnancy_status;
                  updateField("pregnancy_status", newStatus);
                  if (!newStatus) updateField("pregnancy_trimester", undefined);
                }}
                scaleValue={0.95}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    ...(formData.pregnancy_status
                      ? [styles.checkboxBoxChecked]
                      : []),
                  ]}
                >
                  {formData.pregnancy_status && (
                    <Ionicons name="checkmark" size={rf(16)} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Currently Pregnant</Text>
              </AnimatedPressable>
            </View>

            {formData.pregnancy_status && (
              <View style={styles.trimesterSelector}>
                <Text style={styles.inputLabel}>
                  Trimester{" "}
                  <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.trimesterButtons}>
                  {[1, 2, 3].map((trimester) => (
                    <AnimatedPressable
                      key={`trimester-${trimester}`}
                      style={[
                        styles.trimesterButton,
                        ...(formData.pregnancy_trimester === trimester
                          ? [styles.trimesterButtonSelected]
                          : []),
                      ]}
                      onPress={() =>
                        updateField(
                          "pregnancy_trimester",
                          trimester as 1 | 2 | 3,
                        )
                      }
                      scaleValue={0.95}
                    >
                      <Text
                        style={[
                          styles.trimesterButtonText,
                          ...(formData.pregnancy_trimester === trimester
                            ? [styles.trimesterButtonTextSelected]
                            : []),
                        ]}
                      >
                        {trimester === 1
                          ? "First (1-13 weeks)"
                          : trimester === 2
                            ? "Second (14-26 weeks)"
                            : "Third (27-40 weeks)"}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.checkboxContainer}>
              <AnimatedPressable
                style={styles.checkbox}
                onPress={() =>
                  updateField(
                    "breastfeeding_status",
                    !formData.breastfeeding_status,
                  )
                }
                scaleValue={0.95}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    ...(formData.breastfeeding_status
                      ? [styles.checkboxBoxChecked]
                      : []),
                  ]}
                >
                  {formData.breastfeeding_status && (
                    <Ionicons name="checkmark" size={rf(16)} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>
                  Currently Breastfeeding
                </Text>
              </AnimatedPressable>
            </View>
          </View>
        )}

        {/* Stress Level */}
        <View style={styles.medicalField}>
          <Text style={styles.fieldHint}>
            Your stress level affects recovery and calorie management. You can
            also measure this in the main app by connecting your fitness band or
            smartwatch.
          </Text>

          <Slider
            value={
              formData.stress_level === "low"
                ? 1
                : formData.stress_level === "moderate"
                  ? 2
                  : formData.stress_level === "high"
                    ? 3
                    : 2
            }
            onValueChange={(value) => {
              const stressLevel =
                value === 1 ? "low" : value === 2 ? "moderate" : "high";
              updateField(
                "stress_level",
                stressLevel as "low" | "moderate" | "high",
              );
            }}
            minimumValue={1}
            maximumValue={3}
            step={1}
            label="Current Stress Level (Optional)"
            showTooltip={true}
            formatValue={(val) => {
              if (val === 1) return "Low Stress";
              if (val === 2) return "Moderate Stress";
              return "High Stress";
            }}
            style={styles.stressSlider}
          />

          {!formData.stress_level && (
            <GlassCard
              elevation={2}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.infoCard}
            >
              <View style={styles.infoContent}>
                <Ionicons
                  name="bulb-outline"
                  size={rf(18)}
                  color={colors.primary}
                />
                <Text style={styles.infoText}>
                  Skip for now? You can connect a fitness band or smartwatch in
                  the main app to automatically track your stress levels.
                </Text>
              </View>
            </GlassCard>
          )}

          {formData.stress_level === "high" && (
            <GlassCard
              elevation={2}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.warningCard}
            >
              <View style={styles.warningRow}>
                <Ionicons
                  name="alert-circle"
                  size={rf(18)}
                  color={colors.warning}
                />
                <Text style={styles.warningText}>
                  High stress detected - we'll use conservative calorie targets
                  to protect your health and hormones
                </Text>
              </View>
            </GlassCard>
          )}
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
  medicalField: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  fieldHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: rf(18),
  },
  checkboxContainer: {
    marginBottom: spacing.md,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkboxBox: {
    width: rs(24),
    height: rs(24),
    borderRadius: rbr(6),
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  trimesterSelector: {
    marginLeft: rp(32),
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  requiredAsterisk: {
    color: colors.error,
  },
  trimesterButtons: {
    gap: spacing.xs,
  },
  trimesterButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: "transparent",
  },
  trimesterButtonSelected: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  trimesterButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  trimesterButtonTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  stressSlider: {
    width: "100%",
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: `${colors.primary}05`,
    borderColor: colors.border,
    borderWidth: 1,
  },
  infoContent: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: rf(16),
  },
  warningCard: {
    backgroundColor: `${colors.warning}10`,
    borderColor: `${colors.warning}30`,
    borderWidth: 1,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: typography.fontWeight.medium,
  },
  sectionBottomPad: {
    height: spacing.lg,
  },
});
