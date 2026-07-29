/**
 * WeightGoalsSection — read-only weight goal summary (Editorial Dark reskin)
 *
 * Mirrors the Body tab's weight goal so the user sees the target their training
 * supports. Read-only (entered on the Body tab). Presented as a quiet
 * SectionLabel + hairline metric rows (label left, value right) — no boxed
 * card, no badge, no accent line. Data wiring unchanged — still receives
 * `bodyAnalysisData` + `formData` and renders derived values only.
 */

import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { tokens, SectionLabel, Rule } from "../fresh";
import {
  WorkoutPreferencesData,
  BodyAnalysisData,
} from "../../../types/onboarding";

interface WeightGoalsSectionProps {
  bodyAnalysisData?: BodyAnalysisData | null;
  formData: WorkoutPreferencesData;
}

const MetricRow: React.FC<{
  label: string;
  value: string;
  hint?: string;
  last?: boolean;
}> = ({ label, value, hint, last = false }) => (
  <View style={[styles.metricRow, last && styles.metricRowLast]}>
    <Text style={styles.metricLabel}>{label}</Text>
    <View style={styles.metricValueWrap}>
      <Text style={styles.metricValue}>{value}</Text>
      {hint && <Text style={styles.metricHint}>{hint}</Text>}
    </View>
  </View>
);

const formatSigned = (delta: number): string =>
  `${delta > 0 ? "+" : "−"}${Math.abs(delta)} kg`;

export const WeightGoalsSection: React.FC<WeightGoalsSectionProps> = ({
  bodyAnalysisData,
  formData: _formData,
}) => {
  if (!bodyAnalysisData) return null;

  const current = bodyAnalysisData.current_weight_kg;
  const target = bodyAnalysisData.target_weight_kg;
  const weeks = bodyAnalysisData.target_timeline_weeks;

  const hasAll = !!(current && target && weeks);
  const weeklyRate = hasAll
    ? (Math.abs(current! - target!) / weeks!).toFixed(2)
    : null;
  const delta = current && target ? target - current : null;
  // Descriptive pace read — mirrors the number, keeps the tone motivational.
  const rateNum = weeklyRate ? parseFloat(weeklyRate) : 0;
  const paceNote = weeklyRate
    ? rateNum > 1
      ? "Ambitious"
      : rateNum >= 0.5
        ? "Strong"
        : "Steady"
    : null;

  return (
    <View testID="weight-goals-card">
      <SectionLabel>Weight goal</SectionLabel>
      <Text style={styles.caption}>
        From the Body tab — your training supports this target
      </Text>

      <View style={styles.rows}>
        <MetricRow label="Current" value={current ? `${current} kg` : "—"} />
        <MetricRow
          label="Target"
          value={target ? `${target} kg` : "Not set"}
          hint={delta !== null && delta !== 0 ? formatSigned(delta) : undefined}
        />
        <MetricRow
          label="Timeline"
          value={weeks ? `${weeks} weeks` : "—"}
          last={!weeklyRate}
        />
        {weeklyRate && (
          <MetricRow
            label="Pace"
            value={`${weeklyRate} kg/week`}
            hint={paceNote ?? undefined}
            last
          />
        )}
      </View>
      <Rule spacing={0} />
    </View>
  );
};

const styles = StyleSheet.create({
  caption: {
    marginTop: 6,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },
  rows: {
    marginTop: 8,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.hairline,
  },
  metricRowLast: {
    borderBottomWidth: 0,
  },
  metricLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: tokens.ink2,
  },
  metricValueWrap: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  metricValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
    color: tokens.ink,
  },
  metricHint: {
    marginLeft: 8,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },
});
