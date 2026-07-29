/**
 * S3 "Fuel" — HealthHabitsSection (blueprint §3 S3, §5 S3, §6 input map)
 *
 * Fresh "Editorial Dark" — PEAK pass. All 14 health-habit booleans stay in
 * icon Pill grids grouped by the existing HEALTH_HABITS categories
 * (hydration ×2, eating patterns ×4, food choices ×4, substances ×4), inside
 * a CollapsibleSection that defaults to collapsed and removes its content
 * from layout when closed.
 *
 * Scannability upgrades (presentation-only):
 *  - Every category header is now a label row with a live "N on" count on
 *    its right edge (full ink number — data, not decoration).
 *  - Pills follow the tab's selected-state system: identity icon (ink2) off,
 *    accent checkmark + accentDim on.
 *  - The collapsed subtitle names the first picks, not just the count.
 *
 * Presentation-only redesign — props contract (formData, toggleHealthHabit,
 * showInfoTooltip) unchanged; fields still save via toggleHealthHabit.
 */

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HEALTH_HABITS } from "../../../screens/onboarding/tabs/DietPreferencesConstants";
import { DietPreferencesData } from "../../../types/onboarding";
import {
  CollapsibleSection,
  Pill,
  SectionLabel,
  tokens,
  type as typeScale,
} from "../fresh";
import { previewNames } from "./selectionPreview";

type IoniconName = keyof typeof Ionicons.glyphMap;

const formatCategoryTitle = (category: string) =>
  category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const ALL_HABITS = Object.values(HEALTH_HABITS).flat();
const ALL_HABIT_KEYS: (keyof DietPreferencesData)[] = ALL_HABITS.map(
  (h) => h.key as keyof DietPreferencesData,
);

interface HealthHabitsSectionProps {
  formData: DietPreferencesData;
  toggleHealthHabit: (habitKey: keyof DietPreferencesData) => void;
  showInfoTooltip: (title: string, description: string) => void;
}

export const HealthHabitsSection: React.FC<HealthHabitsSectionProps> = ({
  formData,
  toggleHealthHabit,
}) => {
  const [open, setOpen] = useState(false);
  const onHabits = ALL_HABITS.filter(
    (h) => formData[h.key as keyof DietPreferencesData] as boolean,
  );
  const onCount = onHabits.length;

  return (
    <CollapsibleSection
      title="Lifestyle Habits"
      subtitle={
        onCount > 0
          ? // Habit titles are long — name only the first, then "+N".
            `${onCount} of ${ALL_HABIT_KEYS.length} on · ${previewNames(
              onHabits.map((h) => h.title),
              1,
            )}`
          : "Tap to toggle your current habits (optional)"
      }
      expanded={open}
      onToggle={() => setOpen((v) => !v)}
      testID="lifestyle-habits-section"
    >
      {Object.entries(HEALTH_HABITS).map(([category, habits], index) => {
        const categoryOn = habits.filter(
          (h) => formData[h.key as keyof DietPreferencesData] as boolean,
        ).length;
        return (
          <View
            key={category}
            style={[styles.group, index > 0 && styles.groupGap]}
          >
            {/* Category label row — small-caps left, live "N on" right. */}
            <View style={styles.groupHeader}>
              <SectionLabel>{formatCategoryTitle(category)}</SectionLabel>
              {categoryOn > 0 && (
                <Text style={styles.groupCount}>
                  <Text style={styles.groupCountValue}>{categoryOn}</Text> of{" "}
                  {habits.length} on
                </Text>
              )}
            </View>
            <View style={styles.pillGrid}>
              {habits.map((habit) => {
                const isOn = formData[
                  habit.key as keyof DietPreferencesData
                ] as boolean;
                return (
                  <Pill
                    key={habit.key}
                    label={habit.title}
                    icon={isOn ? "checkmark" : (habit.iconName as IoniconName)}
                    selected={isOn}
                    onPress={() =>
                      toggleHealthHabit(habit.key as keyof DietPreferencesData)
                    }
                    testID={`habit-${habit.key}`}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  group: {},
  groupGap: {
    marginTop: 20,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  groupCount: {
    ...typeScale.caption,
  },
  groupCountValue: {
    color: tokens.ink,
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

export default HealthHabitsSection;
