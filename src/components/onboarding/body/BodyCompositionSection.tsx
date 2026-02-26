import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { GlassCard, AnimatedPressable } from "../../../components/ui/aurora";
import { Input } from "../../../components/ui";
import { BodyAnalysisData, PersonalInfoData } from "../../../types/onboarding";

interface BodyCompositionSectionProps {
  formData: BodyAnalysisData;
  updateField: <K extends keyof BodyAnalysisData>(
    field: K,
    value: BodyAnalysisData[K],
  ) => void;
  handleNumberInput: (field: keyof BodyAnalysisData, text: string) => void;
  showMeasurementGuide: boolean;
  setShowMeasurementGuide: (show: boolean) => void;
  personalInfoData?: PersonalInfoData | null;
}

export const BodyCompositionSection: React.FC<BodyCompositionSectionProps> = ({
  formData,
  handleNumberInput,
  showMeasurementGuide,
  setShowMeasurementGuide,
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
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Body Composition (Optional)
        </Text>
        <Text
          style={styles.sectionSubtitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Additional measurements for more accurate analysis
        </Text>
      </View>

      <View style={styles.edgeToEdgeContentPadded}>
        <AnimatedPressable
          style={styles.measurementGuideButton}
          onPress={() => setShowMeasurementGuide(!showMeasurementGuide)}
          scaleValue={0.95}
        >
          <View style={styles.measurementGuideContent}>
            <Ionicons
              name="information-circle-outline"
              size={rf(18)}
              color={ResponsiveTheme.colors.primary}
            />
            <Text style={styles.measurementGuideText} numberOfLines={1}>
              How to measure correctly
            </Text>
          </View>
        </AnimatedPressable>

        {showMeasurementGuide && (
          <GlassCard
            elevation={2}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.measurementGuideInline}
          >
            <Text style={styles.guideTitle} numberOfLines={1}>
              Measurement Guidelines
            </Text>
            <Text style={styles.guideText}>
              • <Text style={styles.guideBold}>Waist:</Text> Measure at the
              narrowest point, usually just above the belly button{"\n"}•{" "}
              <Text style={styles.guideBold}>Hip:</Text> Measure at the widest
              point of your hips{"\n"}•{" "}
              <Text style={styles.guideBold}>Chest:</Text> Measure around the
              fullest part of your chest{"\n"}•{" "}
              <Text style={styles.guideBold}>Body Fat:</Text> Use a body fat
              scale or professional measurement
            </Text>
          </GlassCard>
        )}

        <View style={styles.compositionGrid}>
          <View style={styles.compositionItem}>
            <Input
              label="Body Fat % (Optional)"
              placeholder="e.g. 20"
              value={
                formData.body_fat_percentage
                  ? formData.body_fat_percentage.toString()
                  : ""
              }
              onChangeText={(text) =>
                handleNumberInput("body_fat_percentage", text)
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.compositionItem}>
            <Input
              label="Waist (cm)"
              placeholder="e.g. 80"
              value={formData.waist_cm ? formData.waist_cm.toString() : ""}
              onChangeText={(text) => handleNumberInput("waist_cm", text)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.compositionItem}>
            <Input
              label="Hip (cm)"
              placeholder="e.g. 95"
              value={formData.hip_cm ? formData.hip_cm.toString() : ""}
              onChangeText={(text) => handleNumberInput("hip_cm", text)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.compositionItem}>
            <Input
              label="Chest (cm)"
              placeholder="e.g. 100"
              value={formData.chest_cm ? formData.chest_cm.toString() : ""}
              onChangeText={(text) => handleNumberInput("chest_cm", text)}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Waist-Hip Ratio Display */}
        {formData.waist_hip_ratio != null && formData.waist_hip_ratio > 0
          ? (() => {
              const threshold =
                personalInfoData?.gender === "female" ? 0.85 : 0.9;
              const isHealthy = formData.waist_hip_ratio! < threshold;
              return (
                <GlassCard
                  elevation={2}
                  blurIntensity="default"
                  padding="md"
                  borderRadius="lg"
                  style={styles.ratioCardInline}
                >
                  <Text style={styles.ratioTitle} numberOfLines={1}>
                    Waist-Hip Ratio: {formData.waist_hip_ratio}
                  </Text>
                  <View style={styles.ratioStatusRow}>
                    <Ionicons
                      name={isHealthy ? "checkmark-circle" : "alert-circle"}
                      size={rf(16)}
                      color={
                        isHealthy
                          ? ResponsiveTheme.colors.secondary
                          : ResponsiveTheme.colors.warning
                      }
                    />
                    <Text
                      style={[
                        styles.ratioDescription,
                        {
                          color: isHealthy
                            ? ResponsiveTheme.colors.secondary
                            : ResponsiveTheme.colors.warning,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {isHealthy ? "Healthy ratio" : "Consider waist reduction"}
                    </Text>
                  </View>
                </GlassCard>
              );
            })()
          : null}
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
  measurementGuideButton: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  measurementGuideContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  measurementGuideText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  measurementGuideInline: {
    marginBottom: ResponsiveTheme.spacing.lg,
    backgroundColor: `${ResponsiveTheme.colors.primary}05`,
  },
  guideTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  guideText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },
  guideBold: {
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },
  compositionGrid: {
    gap: ResponsiveTheme.spacing.md,
  },
  compositionItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  ratioCardInline: {
    marginTop: ResponsiveTheme.spacing.lg,
  },
  ratioTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  ratioStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  ratioDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
  },
  sectionBottomPad: {
    height: ResponsiveTheme.spacing.lg,
  },
});
