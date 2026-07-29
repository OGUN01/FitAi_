/**
 * MedicalSection — Body tab collapsed "Medical & safety" group (Editorial Dark).
 *
 * medical_conditions + physical_limitations keep the existing
 * MultiSelectWithCustom (searchable + custom-add — data wiring unchanged).
 * medications becomes an UnderlineInput. pregnancy_status /
 * breastfeeding_status and pregnancy_trimester / stress_level become
 * OptionRows (single-select rows with the accent check; tapping the active
 * row clears optional fields). Renders flat inside the parent
 * CollapsibleSection (the section header lives there).
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  RowGroup,
  OptionRow,
  SectionLabel,
} from "../../onboarding/fresh";
import {
  tokens,
  type as freshType,
  spacing as freshSpacing,
} from "../../onboarding/fresh/tokens";
import { MultiSelectWithCustom } from "../../../components/advanced/MultiSelectWithCustom";
import { UnderlineInput } from "../../onboarding/aurora/UnderlineInput";
import {
  MEDICAL_CONDITIONS_OPTIONS,
  PHYSICAL_LIMITATIONS_OPTIONS,
  STRESS_LEVELS,
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

const TRIMESTER_OPTIONS = [
  { id: "1", label: "First (1–13 w)" },
  { id: "2", label: "Second (14–26 w)" },
  { id: "3", label: "Third (27–40 w)" },
];

export const MedicalSection: React.FC<MedicalSectionProps> = ({
  formData,
  updateField,
  personalInfoData,
}) => {
  const isFemale = personalInfoData?.gender === "female";

  const handleStressSelect = (id: string) => {
    // Single-select behavior: tapping the active row clears it (optional field).
    const next =
      formData.stress_level === id
        ? undefined
        : (id as BodyAnalysisData["stress_level"]);
    updateField("stress_level", next);
  };

  const handleTrimesterSelect = (id: string) => {
    const n = parseInt(id, 10) as 1 | 2 | 3;
    const next = formData.pregnancy_trimester === n ? undefined : n;
    updateField("pregnancy_trimester", next);
  };

  return (
    <View style={styles.container}>
      {/* Trust-first framing: calm, no jargon, explicit that this is optional
          and private. Presentation only — no data wiring changes. */}
      <View style={styles.trustBlock}>
        <Ionicons
          name="lock-closed-outline"
          size={14}
          color={tokens.ink3}
          style={styles.trustIcon}
        />
        <Text style={styles.trustText} numberOfLines={3}>
          All optional. We use this only to keep your plan safe — never shown
          to anyone else, never used for anything besides your coaching.
        </Text>
      </View>

      {/* Medical conditions — searchable multi-select (data wiring unchanged) */}
      <View style={styles.field}>
        <MultiSelectWithCustom
          options={MEDICAL_CONDITIONS_OPTIONS}
          selectedValues={formData.medical_conditions}
          onSelectionChange={(values) =>
            updateField("medical_conditions", values)
          }
          label="Medical conditions (optional)"
          placeholder="Select any medical conditions"
          searchable={true}
          allowCustom={true}
          customLabel="Add custom condition"
          customPlaceholder="Enter your specific condition"
        />
      </View>

      {/* Medications — freeform text on a hairline underline */}
      <View style={styles.field}>
        <UnderlineInput
          label="Current medications (optional)"
          placeholder="e.g., Metformin, Lisinopril (comma-separated)"
          accentColor={tokens.accent}
          value={formData.medications.join(", ")}
          onChangeText={(text) =>
            updateField(
              "medications",
              text
                .split(",")
                .map((m) => m.trim())
                .filter(Boolean),
            )
          }
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Physical limitations — searchable multi-select (data wiring unchanged) */}
      <View style={styles.field}>
        <MultiSelectWithCustom
          options={PHYSICAL_LIMITATIONS_OPTIONS}
          selectedValues={formData.physical_limitations}
          onSelectionChange={(values) =>
            updateField("physical_limitations", values)
          }
          label="Physical limitations (optional)"
          placeholder="Select any physical limitations"
          searchable={true}
          allowCustom={true}
          customLabel="Add custom limitation"
          customPlaceholder="Enter your specific limitation"
        />
      </View>

      {/* Women-specific health status */}
      {isFemale && (
        <View style={styles.field}>
          <SectionLabel>Pregnancy &amp; breastfeeding</SectionLabel>
          <Text style={styles.fieldHint} numberOfLines={2}>
            Critical for safe calorie recommendations
          </Text>

          <View style={styles.rows}>
            <OptionRow
              label="Currently pregnant"
              selected={!!formData.pregnancy_status}
              onPress={() => {
                const next = !formData.pregnancy_status;
                updateField("pregnancy_status", next);
                if (!next) updateField("pregnancy_trimester", undefined);
              }}
              testID="pregnancy-toggle"
            />
            <OptionRow
              label="Currently breastfeeding"
              selected={!!formData.breastfeeding_status}
              onPress={() =>
                updateField(
                  "breastfeeding_status",
                  !formData.breastfeeding_status,
                )
              }
              testID="breastfeeding-toggle"
            />
          </View>

          {formData.pregnancy_status && (
            <View style={styles.trimesterBlock}>
              <SectionLabel>Trimester</SectionLabel>
              <View style={styles.rows}>
                {TRIMESTER_OPTIONS.map((opt) => (
                  <OptionRow
                    key={opt.id}
                    label={opt.label}
                    selected={formData.pregnancy_trimester === parseInt(opt.id, 10)}
                    onPress={() => handleTrimesterSelect(opt.id)}
                    testID={`trimester-${opt.id}`}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Stress level — single-select rows (tapping the active row clears) */}
      <RowGroup label="Current stress level (optional)">
        <View style={styles.stressStack}>
          <View style={styles.rows}>
            {STRESS_LEVELS.map((opt) => (
              <OptionRow
                key={opt.level}
                label={opt.title}
                sublabel={opt.description}
                icon={opt.iconName as keyof typeof Ionicons.glyphMap}
                selected={formData.stress_level === opt.level}
                onPress={() => handleStressSelect(opt.level)}
                testID={`stress-${opt.level}`}
              />
            ))}
          </View>
          <Text style={styles.fieldHint} numberOfLines={3}>
            Stress affects recovery and calorie management. You can also
            measure this in the main app by connecting a fitness band or
            smartwatch.
          </Text>
          {formData.stress_level === "high" && (
            <View style={styles.notice}>
              <Ionicons name="alert-circle" size={16} color={tokens.danger} />
              <Text style={styles.noticeText} numberOfLines={3}>
                High stress detected — we&apos;ll use conservative calorie
                targets to protect your health.
              </Text>
            </View>
          )}
        </View>
      </RowGroup>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: freshSpacing.screenPad,
  },
  trustBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: freshSpacing.s,
    paddingBottom: freshSpacing.s,
    borderBottomWidth: 1,
    borderBottomColor: tokens.hairline,
  },
  trustIcon: {
    marginTop: 2,
  },
  trustText: {
    ...freshType.caption,
    color: tokens.ink2,
    flex: 1,
    lineHeight: 18,
  },
  field: {
    gap: freshSpacing.s,
  },
  rows: {
    // OptionRows bring their own hairlines; stack flush.
  },
  fieldHint: {
    ...freshType.caption,
  },
  trimesterBlock: {
    marginTop: freshSpacing.m,
    gap: freshSpacing.s,
  },
  stressStack: {
    gap: freshSpacing.s,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: freshSpacing.s,
    marginTop: freshSpacing.xs,
  },
  noticeText: {
    ...freshType.caption,
    color: tokens.ink2,
    flex: 1,
  },
});
