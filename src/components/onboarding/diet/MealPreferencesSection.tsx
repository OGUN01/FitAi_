/**
 * S3 "Fuel" — MealPreferencesSection (blueprint §3 S3, §6 input map)
 *
 * Fresh "Editorial Dark" — PEAK pass. The 4 meal-enable toggles are a compact
 * Pill rail — they ARE multi-select toggles, so they now present as chips
 * (identity icon when off, accent checkmark + accentDim fill when on) instead
 * of lookalike radio rows. This breaks the screen's 16-identical-row rhythm
 * and cuts ~224px of vertical stack to one wrap row.
 *
 * The live count stays on the label row's right edge ("3 of 4") — data, not
 * sentences. The "at least one meal must stay enabled" guard is preserved —
 * the last enabled pill is disabled, and the hook's toggleMealPreference
 * guard is unchanged. Presentation-only redesign — props contract (formData,
 * getEnabledMealsCount, toggleMealPreference) unchanged.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DietPreferencesData } from "../../../types/onboarding";
import { Pill, SectionLabel, tokens, type as typeScale } from "../fresh";

type IoniconName = keyof typeof Ionicons.glyphMap;

const MEALS: {
  key: keyof DietPreferencesData;
  label: string;
  icon: IoniconName;
}[] = [
  { key: "breakfast_enabled", label: "Breakfast", icon: "sunny-outline" },
  { key: "lunch_enabled", label: "Lunch", icon: "partly-sunny-outline" },
  { key: "dinner_enabled", label: "Dinner", icon: "moon-outline" },
  { key: "snacks_enabled", label: "Snacks", icon: "fast-food-outline" },
];

interface MealPreferencesSectionProps {
  formData: DietPreferencesData;
  getEnabledMealsCount: () => number;
  toggleMealPreference: (mealKey: keyof DietPreferencesData) => void;
}

export const MealPreferencesSection: React.FC<MealPreferencesSectionProps> = ({
  formData,
  getEnabledMealsCount,
  toggleMealPreference,
}) => {
  const enabledCount = getEnabledMealsCount();

  return (
    <View>
      {/* Label row — small-caps left, live count right. One edge. */}
      <View style={styles.labelRow}>
        <SectionLabel>Meals We Plan</SectionLabel>
        <Text style={styles.count}>
          <Text style={styles.countValue}>{enabledCount}</Text> of{" "}
          {MEALS.length}
        </Text>
      </View>
      {/* Multi-select semantics → chips, not rows. Off: identity icon in
          ink2. On: accent checkmark in accentDim — the +/✓ 2026 chip system. */}
      <View style={styles.pillRow}>
        {MEALS.map((meal) => {
          const isEnabled = formData[meal.key] as boolean;
          const isLastEnabled = enabledCount === 1 && isEnabled;
          return (
            <Pill
              key={meal.key}
              label={meal.label}
              icon={isEnabled ? "checkmark" : meal.icon}
              selected={isEnabled}
              disabled={isLastEnabled}
              onPress={() => {
                if (!isLastEnabled) {
                  toggleMealPreference(meal.key);
                }
              }}
              testID={`meal-${meal.key}`}
            />
          );
        })}
      </View>
      {enabledCount === 1 && (
        <Text style={styles.hint} numberOfLines={2}>
          At least one meal type must stay enabled.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  count: {
    ...typeScale.caption,
  },
  countValue: {
    color: tokens.ink, // the number is data — it earns full ink
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hint: {
    marginTop: 12,
    ...typeScale.caption,
    color: tokens.danger,
  },
});

export default MealPreferencesSection;
