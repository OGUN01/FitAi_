/**
 * FitnessLevelSection — "Assess me" collapsible group (Editorial Dark reskin)
 *
 * Collapsed by default via the fresh `CollapsibleSection` (content is removed
 * from layout when closed — fixes the empty-box bug). Fields:
 * workout_experience_years, can_do_pushups, can_run_minutes (RangeSliders),
 * flexibility_level (single-select OptionRows). Collapsed fields still save
 * via `onUpdate` — collapse is pure UI state held in the parent tab.
 *
 * Data wiring unchanged: `updateField` from useWorkoutPreferences.
 */

import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { tokens, OptionRow, SectionLabel, CollapsibleSection } from "../fresh";
import { RangeSlider } from "../aurora";
import { WorkoutPreferencesData } from "../../../types/onboarding";

interface FitnessLevelSectionProps {
  formData: WorkoutPreferencesData;
  updateField: <K extends keyof WorkoutPreferencesData>(
    field: K,
    value: WorkoutPreferencesData[K],
  ) => void;
  /** Collapse state owned by the parent tab (local UI state). */
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const FLEXIBILITY_OPTIONS: {
  id: NonNullable<WorkoutPreferencesData["flexibility_level"]>;
  label: string;
}[] = [
  { id: "poor", label: "Poor" },
  { id: "fair", label: "Fair" },
  { id: "good", label: "Good" },
  { id: "excellent", label: "Excellent" },
];

export const FitnessLevelSection: React.FC<FitnessLevelSectionProps> = ({
  formData,
  updateField,
  collapsed,
  onToggleCollapse,
}) => {
  // Live collapsed summary: the header reflects the baseline you've entered.
  const parts: string[] = [];
  if (formData.workout_experience_years > 0)
    parts.push(`${formData.workout_experience_years} yrs`);
  if (formData.can_do_pushups > 0) parts.push(`${formData.can_do_pushups} pushups`);
  if (formData.can_run_minutes > 0)
    parts.push(`${formData.can_run_minutes} min run`);
  if (formData.flexibility_level)
    parts.push(
      `flexibility ${
        FLEXIBILITY_OPTIONS.find((o) => o.id === formData.flexibility_level)
          ?.label.toLowerCase() ?? ""
      }`.trim(),
    );
  const subtitle =
    parts.length > 0
      ? parts.join(" · ")
      : "Your current baseline — optional, helps calibrate intensity";

  return (
    <CollapsibleSection
      title="Assess me"
      subtitle={subtitle}
      expanded={!collapsed}
      onToggle={onToggleCollapse}
      testID="assess-me-section"
    >
      {/* Experience */}
      <View style={styles.headerRow}>
        <SectionLabel>Experience</SectionLabel>
        <Text style={styles.valueText}>
          {formData.workout_experience_years === 0
            ? "New"
            : `${formData.workout_experience_years} yrs`}
        </Text>
      </View>
      <RangeSlider
        value={formData.workout_experience_years}
        min={0}
        max={50}
        step={1}
        onChange={(v) => updateField("workout_experience_years", v)}
        unit="yrs"
        accentColor={tokens.accent}
        showValue={false}
        accessibilityLabel={`Experience, ${formData.workout_experience_years} years`}
        style={styles.slider}
        testID="experience-stepper"
      />

      {/* Max pushups */}
      <View style={[styles.headerRow, styles.fieldGap]}>
        <SectionLabel>Max pushups</SectionLabel>
        <Text style={styles.valueText}>{formData.can_do_pushups}</Text>
      </View>
      <RangeSlider
        value={formData.can_do_pushups}
        min={0}
        max={200}
        step={5}
        onChange={(v) => updateField("can_do_pushups", v)}
        unit="reps"
        accentColor={tokens.accent}
        showValue={false}
        accessibilityLabel={`Max pushups, ${formData.can_do_pushups} reps`}
        style={styles.slider}
        testID="pushups-stepper"
      />

      {/* Continuous running */}
      <View style={[styles.headerRow, styles.fieldGap]}>
        <SectionLabel>Continuous running</SectionLabel>
        <Text style={styles.valueText}>{formData.can_run_minutes} min</Text>
      </View>
      <RangeSlider
        value={formData.can_run_minutes}
        min={0}
        max={300}
        step={5}
        onChange={(v) => updateField("can_run_minutes", v)}
        unit="min"
        accentColor={tokens.accent}
        showValue={false}
        accessibilityLabel={`Continuous running, ${formData.can_run_minutes} minutes`}
        style={styles.slider}
        testID="run-minutes-stepper"
      />

      {/* Flexibility — single select */}
      <View style={[styles.headerRow, styles.fieldGap]}>
        <SectionLabel>Flexibility</SectionLabel>
      </View>
      <View style={styles.rows} testID="flexibility-chip-picker">
        {FLEXIBILITY_OPTIONS.map((option) => (
          <OptionRow
            key={option.id}
            label={option.label}
            icon="body-outline"
            selected={formData.flexibility_level === option.id}
            onPress={() => updateField("flexibility_level", option.id)}
            testID={`flexibility-row-${option.id}`}
          />
        ))}
      </View>
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldGap: {
    marginTop: 24,
  },
  rows: {
    marginTop: 8,
  },
  valueText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
    color: tokens.ink,
  },
  slider: {
    marginTop: 8,
  },
});
