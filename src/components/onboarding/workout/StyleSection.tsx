/**
 * StyleSection — "What you enjoy" collapsible group (Editorial Dark reskin)
 *
 * Collapsed by default via the fresh `CollapsibleSection` (content removed
 * from layout when closed). Six enjoyment booleans presented as OptionRows —
 * tap toggles, accent check shows the on state. Collapsed fields still save
 * via `onUpdate` — collapse is pure UI state held in the parent tab.
 *
 * Data wiring unchanged: `updateField` from useWorkoutPreferences.
 */

import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { OptionRow, CollapsibleSection } from "../fresh";
import { WorkoutPreferencesData } from "../../../types/onboarding";

interface StyleSectionProps {
  formData: WorkoutPreferencesData;
  updateField: <K extends keyof WorkoutPreferencesData>(
    field: K,
    value: WorkoutPreferencesData[K],
  ) => void;
  showInfoTooltip: (title: string, description: string) => void;
  /** Collapse state owned by the parent tab (local UI state). */
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const PREFERENCES: {
  key: keyof WorkoutPreferencesData;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}[] = [
  { key: "enjoys_cardio", label: "Enjoys cardio", icon: "heart-outline", description: "Running, cycling, aerobic exercise" },
  { key: "enjoys_strength_training", label: "Enjoys strength", icon: "barbell-outline", description: "Weight lifting, resistance training" },
  { key: "enjoys_group_classes", label: "Group classes", icon: "people-outline", description: "Fitness classes, group workouts" },
  { key: "prefers_outdoor_activities", label: "Prefers outdoor", icon: "leaf-outline", description: "Hiking, outdoor sports, fresh air" },
  { key: "needs_motivation", label: "Needs motivation", icon: "megaphone-outline", description: "Coaching, accountability, encouragement" },
  { key: "prefers_variety", label: "Prefers variety", icon: "shuffle-outline", description: "Different exercises, avoiding routine" },
];

export const StyleSection: React.FC<StyleSectionProps> = ({
  formData,
  updateField,
  showInfoTooltip: _showInfoTooltip,
  collapsed,
  onToggleCollapse,
}) => {
  // Live collapsed tally — the header reflects how many tastes are switched on.
  const onLabels = PREFERENCES.filter((p) => formData[p.key] as boolean).map(
    (p) => p.label.toLowerCase(),
  );
  const subtitle =
    onLabels.length > 0
      ? `${onLabels.length} of ${PREFERENCES.length} — ${onLabels
          .slice(0, 3)
          .join(", ")}${onLabels.length > 3 ? ` +${onLabels.length - 3}` : ""}`
      : "Tastes that shape your plan's flavour";

  return (
    <CollapsibleSection
      title="What you enjoy"
      subtitle={subtitle}
      expanded={!collapsed}
      onToggle={onToggleCollapse}
      testID="enjoyment-section"
    >
      <View>
        {PREFERENCES.map((pref) => {
          const value = formData[pref.key] as boolean;
          return (
            <OptionRow
              key={pref.key}
              label={pref.label}
              sublabel={pref.description}
              icon={pref.icon}
              selected={value}
              onPress={() =>
                updateField(
                  pref.key,
                  !value as WorkoutPreferencesData[keyof WorkoutPreferencesData],
                )
              }
              testID={`enjoy-${pref.key}`}
            />
          );
        })}
      </View>
    </CollapsibleSection>
  );
};
