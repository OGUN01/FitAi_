/**
 * WeightManagementSection — S5 review group ("Editorial Dark", no cards)
 *
 * The locked goal from S2 as a typographic hero (current → target, target in
 * accent), then editorial metric rows: healthy min/max, weekly rate, timeline.
 * The safety-cap notice is a hairline-separated danger callout (not a box).
 * All rows tappable → onNavigateToTab(sourceScreen).
 *
 * Values come from calculatedData + bodyAnalysis — no recalculation here.
 * The goal is locked (read-only): the user set target_weight_kg on S2;
 * here they confirm it.
 */

import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { SectionLabel, tokens } from "../../../components/onboarding/fresh";
import {
  BodyAnalysisData,
  AdvancedReviewData,
} from "../../../types/onboarding";
import { isValidMetric } from "../../../utils/validationUtils";
import { toDisplayWeight, type WeightUnit } from "../../../utils/units";

interface WeightManagementSectionProps {
  calculatedData: AdvancedReviewData | null;
  bodyAnalysis: BodyAnalysisData | null;
  onNavigateToTab?: (tabNumber: number) => void;
  /** S1 unit preference — display-only conversion; stored values stay kg. */
  units?: "metric" | "imperial" | null;
  /** Global reveal sequencing: ms offset added to every internal stagger. */
  enterDelay?: number;
}

/** Hermes-safe month names (no Intl dependency). */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

interface MetricRowProps {
  label: string;
  value: string | number;
  unit?: string;
  onPress: () => void;
  delay: number;
  testID: string;
}

const MetricRow: React.FC<MetricRowProps> = ({
  label,
  value,
  unit,
  onPress,
  delay,
  testID,
}) => (
  <Animated.View entering={FadeInDown.duration(250).delay(delay)}>
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ""}`}
      accessibilityHint="Tap to edit"
      testID={testID}
    >
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
        {unit ? <Text style={styles.rowUnit}>{`  ${unit}`}</Text> : null}
      </Text>
    </Pressable>
  </Animated.View>
);

export const WeightManagementSection: React.FC<
  WeightManagementSectionProps
> = ({
  calculatedData,
  bodyAnalysis,
  onNavigateToTab,
  units,
  enterDelay = 0,
}) => {
  if (!calculatedData) return null;

  const goToBody = () => onNavigateToTab?.(3);

  // Display-only unit conversion — stored values stay kg (SSOT).
  const weightUnit: WeightUnit = units === "imperial" ? "lbs" : "kg";
  const unitLabel = weightUnit === "lbs" ? "lbs" : "kg";
  const rateUnitLabel = weightUnit === "lbs" ? "lbs/wk" : "kg/wk";
  const disp = (kg: number): number => toDisplayWeight(kg, weightUnit) ?? kg;
  /** Whole-number rendering matching the pre-conversion hero/row style. */
  const fmtRaw = (kg: number): string =>
    weightUnit === "kg" ? `${kg}` : `${parseFloat(disp(kg).toFixed(1))}`;
  const fmt1 = (kg: number): string => disp(kg).toFixed(1);

  const hasWeights =
    isValidMetric(bodyAnalysis?.current_weight_kg) &&
    isValidMetric(bodyAnalysis?.target_weight_kg);

  const currentWeight = bodyAnalysis?.current_weight_kg ?? 0;
  const targetWeight = bodyAnalysis?.target_weight_kg ?? 0;

  // Anticipation line: how far, and around when — both derived from values
  // already on screen (weights + estimated_timeline_weeks). No new math.
  let anticipation: { delta: string; eta: string } | null = null;
  if (hasWeights && isValidMetric(calculatedData.estimated_timeline_weeks)) {
    const direction =
      targetWeight < currentWeight
        ? "lose"
        : targetWeight > currentWeight
          ? "gain"
          : null;
    if (direction) {
      const deltaKg = Math.abs(targetWeight - currentWeight);
      const eta = new Date(
        Date.now() + calculatedData.estimated_timeline_weeks! * 7 * 24 * 60 * 60 * 1000,
      );
      anticipation = {
        delta: `${fmt1(deltaKg)} ${unitLabel} to ${direction}`,
        eta: `${MONTHS[eta.getMonth()]} ${eta.getFullYear()}`,
      };
    }
  }

  return (
    <View style={styles.section}>
      <SectionLabel>Weight management</SectionLabel>
      <Text style={styles.caption}>
        Your goal, locked in — tap a row to adjust it on the Body screen.
      </Text>

      {/* NOTE: was_rate_capped can currently read true while the displayed
          weekly rate equals the original rate (2dp rounding) — the engine
          compares unrounded floats at src/services/validation/core.ts:735-748
          (wasBMRFlooredInBypass). Engine-side fix is owned by the engine
          agent; this callout simply reflects the flag as delivered. */}
      {calculatedData.was_rate_capped && (
        <View style={styles.capCallout}>
          <Ionicons name="warning-outline" size={16} color={tokens.danger} />
          <Text style={styles.capCalloutText}>
            Your pace was reduced for safety. See warnings below.
          </Text>
        </View>
      )}

      {/* Locked goal hero — typographic current → target + anticipation line */}
      {hasWeights ? (
        <Animated.View entering={FadeInDown.duration(300).delay(enterDelay)}>
          <Pressable
            onPress={goToBody}
            style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Target weight ${fmtRaw(targetWeight)} ${weightUnit === "lbs" ? "pounds" : "kilograms"}`}
            accessibilityHint="Tap to adjust on the Body screen"
            testID="goal-arc"
          >
            <Text style={styles.heroLine}>
              <Text style={styles.heroCurrent}>
                {fmtRaw(currentWeight)} {unitLabel}
              </Text>
              <Text style={styles.heroArrow}>  →  </Text>
              <Text style={styles.heroTarget}>
                {fmtRaw(targetWeight)} {unitLabel}
              </Text>
            </Text>
            {anticipation ? (
              <Text style={styles.heroAnticipation}>
                {anticipation.delta}
                <Text style={styles.heroAnticipationDot}>{"   ·   "}</Text>
                there around{" "}
                <Text style={styles.heroAnticipationEta}>{anticipation.eta}</Text>
              </Text>
            ) : (
              <Text style={styles.heroCaption}>Current → target</Text>
            )}
          </Pressable>
        </Animated.View>
      ) : (
        <Text style={styles.placeholder}>
          Set a target weight in Body Analysis to see your goal.
        </Text>
      )}

      {/* Weight-management metric rows */}
      <View style={styles.rows}>
        <MetricRow
          label="Healthy Min"
          value={isValidMetric(calculatedData.healthy_weight_min) ? Math.round(disp(calculatedData.healthy_weight_min!)) : "—"}
          unit={unitLabel}
          onPress={goToBody}
          delay={enterDelay + 80}
          testID="tile-healthy-min"
        />
        <MetricRow
          label="Healthy Max"
          value={isValidMetric(calculatedData.healthy_weight_max) ? Math.round(disp(calculatedData.healthy_weight_max!)) : "—"}
          unit={unitLabel}
          onPress={goToBody}
          delay={enterDelay + 120}
          testID="tile-healthy-max"
        />
        <MetricRow
          label="Weekly Rate"
          value={isValidMetric(calculatedData.weekly_weight_loss_rate) ? disp(calculatedData.weekly_weight_loss_rate!).toFixed(2) : "—"}
          unit={rateUnitLabel}
          onPress={() => onNavigateToTab?.(4)}
          delay={enterDelay + 160}
          testID="tile-weekly-rate"
        />
        <MetricRow
          label="Timeline"
          value={isValidMetric(calculatedData.estimated_timeline_weeks) ? Math.round(calculatedData.estimated_timeline_weeks!) : "—"}
          unit="wks"
          onPress={goToBody}
          delay={enterDelay + 200}
          testID="tile-timeline"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 36,
  },
  caption: {
    marginTop: 8,
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: tokens.ink2,
  },
  capCallout: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.hairline,
  },
  capCalloutText: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: tokens.danger,
  },
  hero: {
    marginTop: 16,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: tokens.hairline,
  },
  heroLine: {
    fontFamily: "Manrope_600SemiBold",
  },
  heroCurrent: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 22,
    color: tokens.ink2,
    fontVariant: ["tabular-nums"],
  },
  heroArrow: {
    fontFamily: "Manrope_400Regular",
    fontSize: 22,
    color: tokens.ink3,
  },
  heroTarget: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 34,
    color: tokens.accent,
    fontVariant: ["tabular-nums"],
  },
  heroCaption: {
    marginTop: 4,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: tokens.ink3,
  },
  heroAnticipation: {
    marginTop: 6,
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: tokens.ink2,
  },
  heroAnticipationDot: {
    color: tokens.ink3,
  },
  heroAnticipationEta: {
    fontFamily: "Manrope_600SemiBold",
    color: tokens.ink,
  },
  placeholder: {
    marginTop: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: tokens.hairline,
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: tokens.ink2,
  },
  rows: {
    // Rows carry their own hairlines; they follow the hero/placeholder rule.
  },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.hairline,
  },
  pressed: {
    opacity: 0.6,
  },
  rowLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: tokens.ink3,
  },
  rowValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 22,
    color: tokens.ink,
    fontVariant: ["tabular-nums"],
  },
  rowUnit: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: tokens.ink3,
  },
});
