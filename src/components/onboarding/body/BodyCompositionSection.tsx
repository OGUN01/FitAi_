/**
 * BodyCompositionSection — Body tab collapsed "Body composition" group
 * (Editorial Dark).
 *
 * body_fat_percentage + waist_cm/hip_cm/chest_cm RangeSliders, each with a
 * big-number readout beside the label and a short anatomical caption right
 * beneath it (narrowest point / widest point / fullest part) so the guide
 * toggle becomes a fallback rather than required reading. Shows the live
 * waist_hip_ratio when both waist & hip are present. Presentation only —
 * sliders call the same updateField the legacy Inputs did. Renders flat
 * inside the parent CollapsibleSection (the section header lives there).
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  tokens,
  type as freshType,
  font,
  spacing as freshSpacing,
} from "../../onboarding/fresh/tokens";
import { RangeSlider } from "../../onboarding/aurora/RangeSlider";
import { BodyAnalysisData, PersonalInfoData } from "../../../types/onboarding";

interface BodyCompositionSectionProps {
  formData: BodyAnalysisData;
  updateField: <K extends keyof BodyAnalysisData>(
    field: K,
    value: BodyAnalysisData[K],
  ) => void;
  showMeasurementGuide: boolean;
  setShowMeasurementGuide: (show: boolean) => void;
  personalInfoData?: PersonalInfoData | null;
}

const FAT_MIN = 3;
const FAT_MAX = 50;
const GIRTH_MIN = 40;
const GIRTH_MAX = 200;

export const BodyCompositionSection: React.FC<
  BodyCompositionSectionProps
> = ({
  formData,
  updateField,
  showMeasurementGuide,
  setShowMeasurementGuide,
  personalInfoData,
}) => {
  const showRatio =
    formData.waist_hip_ratio != null && formData.waist_hip_ratio > 0;
  const ratioThreshold = personalInfoData?.gender === "female" ? 0.85 : 0.9;
  const ratioHealthy = showRatio
    ? (formData.waist_hip_ratio ?? 0) < ratioThreshold
    : false;

  return (
    <View style={styles.container}>
      {/* Measurement guide — plain text toggle, no box. */}
      <Pressable
        style={styles.guideToggle}
        onPress={() => setShowMeasurementGuide(!showMeasurementGuide)}
        accessibilityRole="button"
        accessibilityLabel="How to measure correctly"
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={tokens.ink2}
        />
        <Text style={styles.guideToggleText} numberOfLines={1}>
          How to measure correctly
        </Text>
        <Ionicons
          name={showMeasurementGuide ? "chevron-up" : "chevron-down"}
          size={16}
          color={tokens.ink3}
        />
      </Pressable>

      {showMeasurementGuide && (
        <View style={styles.guide}>
          <Text style={styles.guideText}>
            {"• Waist: narrowest point, just above the belly button.\n"}
            {"• Hip: widest point of your hips.\n"}
            {"• Chest: fullest part of your chest.\n"}
            {"• Body fat: use a body-fat scale or professional measurement."}
          </Text>
        </View>
      )}

      {/* BODY FAT */}
      <BodyField
        label="Body fat"
        value={formData.body_fat_percentage ?? null}
        unit="%"
        hint="A sharper signal than BMI — from a smart scale or trainer"
      >
        <RangeSlider
          value={formData.body_fat_percentage ?? FAT_MIN}
          min={FAT_MIN}
          max={FAT_MAX}
          step={1}
          unit="%"
          accentColor={tokens.accent}
          onChange={(v) => updateField("body_fat_percentage", v)}
          testID="body-fat-slider"
        />
      </BodyField>

      {/* WAIST */}
      <BodyField
        label="Waist"
        value={formData.waist_cm ?? null}
        unit="cm"
        hint="Narrowest point, just above your belly button"
      >
        <RangeSlider
          value={formData.waist_cm ?? GIRTH_MIN}
          min={GIRTH_MIN}
          max={GIRTH_MAX}
          step={1}
          unit="cm"
          accentColor={tokens.accent}
          onChange={(v) => updateField("waist_cm", v)}
          testID="waist-slider"
        />
      </BodyField>

      {/* HIP */}
      <BodyField
        label="Hip"
        value={formData.hip_cm ?? null}
        unit="cm"
        hint="Widest point of your hips"
      >
        <RangeSlider
          value={formData.hip_cm ?? GIRTH_MIN}
          min={GIRTH_MIN}
          max={GIRTH_MAX}
          step={1}
          unit="cm"
          accentColor={tokens.accent}
          onChange={(v) => updateField("hip_cm", v)}
          testID="hip-slider"
        />
      </BodyField>

      {/* CHEST */}
      <BodyField
        label="Chest"
        value={formData.chest_cm ?? null}
        unit="cm"
        hint="Fullest part of your chest, tape level"
      >
        <RangeSlider
          value={formData.chest_cm ?? GIRTH_MIN}
          min={GIRTH_MIN}
          max={GIRTH_MAX}
          step={1}
          unit="cm"
          accentColor={tokens.accent}
          onChange={(v) => updateField("chest_cm", v)}
          testID="chest-slider"
        />
      </BodyField>

      {/* Live waist-hip ratio */}
      {showRatio ? (
        <View style={styles.ratioRow}>
          <Ionicons
            name={ratioHealthy ? "checkmark-circle" : "alert-circle"}
            size={16}
            color={ratioHealthy ? tokens.accent : tokens.danger}
          />
          <Text style={styles.ratioText} numberOfLines={1}>
            Waist-hip ratio {formData.waist_hip_ratio} —{" "}
            {ratioHealthy ? "healthy" : "consider waist reduction"}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

/** Local layout helper — label + small caption over the slider, big number on
 * the right. Pure presentation; children carry the interactivity. */
const BodyField: React.FC<{
  label: string;
  value: number | null;
  unit: string;
  hint: string;
  children: React.ReactNode;
}> = ({ label, value, unit, hint, children }) => (
  <View style={styles.field}>
    <View style={styles.fieldHeader}>
      <View style={styles.fieldLabels}>
        <Text style={styles.fieldLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.fieldHint} numberOfLines={2}>
          {hint}
        </Text>
      </View>
      <Text style={styles.fieldValue} numberOfLines={1}>
        <Text style={styles.fieldNumber}>
          {value != null && value > 0 ? value : "—"}
        </Text>
        <Text style={styles.fieldUnit}> {unit}</Text>
      </Text>
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: freshSpacing.l,
  },
  guideToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: freshSpacing.s,
    paddingVertical: freshSpacing.xs,
  },
  guideToggleText: {
    ...freshType.body,
    flex: 1,
  },
  guide: {
    paddingBottom: freshSpacing.xs,
  },
  guideText: {
    ...freshType.caption,
    color: tokens.ink2,
  },
  field: {
    gap: freshSpacing.xs,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: freshSpacing.s,
  },
  fieldLabels: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    ...freshType.sectionLabel,
  },
  fieldHint: {
    ...freshType.caption,
    color: tokens.ink2,
  },
  fieldValue: {
    flexShrink: 0,
  },
  fieldNumber: {
    fontFamily: font.light,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: tokens.ink,
  },
  fieldUnit: {
    ...freshType.body,
    color: tokens.ink2,
  },
  ratioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: freshSpacing.s,
    marginTop: freshSpacing.xs,
  },
  ratioText: {
    ...freshType.caption,
    color: tokens.ink2,
    flex: 1,
  },
});
