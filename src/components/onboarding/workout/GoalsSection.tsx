/**
 * GoalsSection — primary_goals (Editorial Dark reskin)
 *
 * "How do you want to train?" starts with goals. Multi-select presented as
 * OptionRows (hairline rows, accent check + 2px left bar when selected) — no
 * cards, no chips. Body-type-aware suggestions are surfaced inline in the
 * sublabel ("Suggested") when S2's `ai_body_type` is present.
 *
 * Data wiring unchanged: `toggleGoal` + `getFieldError`/`hasFieldError` from
 * useWorkoutPreferences. Props kept identical to before.
 */

import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens, OptionRow, SectionLabel, Rule } from "../fresh";
import { FITNESS_GOALS } from "../../../screens/onboarding/tabs/WorkoutPreferencesConstants";
import {
  WorkoutPreferencesData,
  BodyAnalysisData,
} from "../../../types/onboarding";

interface GoalsSectionProps {
  formData: WorkoutPreferencesData;
  bodyAnalysisData?: BodyAnalysisData | null;
  toggleGoal: (goalId: string) => void;
  // Kept for prop-contract parity (activity_level moved out; Phase 2c reroute).
  updateField: <K extends keyof WorkoutPreferencesData>(
    field: K,
    value: WorkoutPreferencesData[K],
  ) => void;
  getFieldError: (field: string) => string | undefined;
  hasFieldError: (field: string) => boolean;
  showInfoTooltip: (title: string, description: string) => void;
}

// Body-type → suggested goal ids (kept in S4 per blueprint; Phase 2c may move).
const BODY_TYPE_GOAL_SUGGESTIONS: Record<string, string[]> = {
  ectomorph: ["muscle-gain", "strength"],
  endomorph: ["weight-loss", "endurance"],
  mesomorph: ["strength", "muscle-gain"],
};

export const GoalsSection: React.FC<GoalsSectionProps> = ({
  formData,
  bodyAnalysisData,
  toggleGoal,
  updateField: _updateField,
  getFieldError,
  hasFieldError,
  showInfoTooltip,
}) => {
  const suggestions = bodyAnalysisData?.ai_body_type
    ? BODY_TYPE_GOAL_SUGGESTIONS[bodyAnalysisData.ai_body_type] ?? []
    : [];
  const selectedCount = formData.primary_goals.length;
  // Selected goal titles, in canonical order — used for the acknowledgment line.
  const selectedTitles = FITNESS_GOALS.filter((g) =>
    formData.primary_goals.includes(g.id),
  ).map((g) => g.title);

  return (
    <View testID="primary-goals-section">
      <View style={styles.headerRow}>
        <SectionLabel>Primary goals</SectionLabel>
        <Pressable
          onPress={() =>
            showInfoTooltip(
              "Fitness goals",
              "Your goals shape your plan's intensity, volume, and exercise selection.",
            )
          }
          hitSlop={8}
          accessibilityLabel="About fitness goals"
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={tokens.ink3}
          />
        </Pressable>
      </View>
      <Text style={styles.caption}>
        {selectedCount > 0
          ? `${selectedCount} selected — tap to add or remove`
          : suggestions.length > 0
            ? "Select all that apply — suggestions marked for your body type"
            : "Select all that apply"}
      </Text>

      <View style={styles.rows} testID="primary-goals-chip-picker">
        {FITNESS_GOALS.map((goal) => {
          const selected = formData.primary_goals.includes(goal.id);
          const suggested = suggestions.includes(goal.id);
          return (
            <OptionRow
              key={goal.id}
              label={goal.title}
              sublabel={
                suggested ? `${goal.description} · Suggested` : goal.description
              }
              icon={goal.iconName as keyof typeof Ionicons.glyphMap}
              selected={selected}
              onPress={() => toggleGoal(goal.id)}
              testID={`goal-row-${goal.id}`}
            />
          );
        })}
      </View>

      {hasFieldError("goals") && (
        <Text style={styles.errorText}>{getFieldError("goals")}</Text>
      )}

      {selectedCount > 0 && (
        <Text style={styles.ack} testID="goals-selection-ack">
          <Text style={styles.ackEmphasis}>
            {selectedTitles.slice(0, 3).join(" · ")}
            {selectedTitles.length > 3 ? ` +${selectedTitles.length - 3}` : ""}
          </Text>
          {"  — "}your plan leads with{" "}
          {selectedCount === 1 ? "this" : "these"}
        </Text>
      )}
      <Rule spacing={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  caption: {
    marginTop: 6,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },
  rows: {
    marginTop: 12,
  },
  errorText: {
    marginTop: 12,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.danger,
  },
  ack: {
    marginTop: 16,
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: tokens.ink3,
  },
  ackEmphasis: {
    fontFamily: "Manrope_500Medium",
    color: tokens.ink2,
  },
});
