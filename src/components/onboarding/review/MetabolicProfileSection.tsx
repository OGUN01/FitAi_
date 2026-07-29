/**
 * MetabolicProfileSection — S5 review group ("Editorial Dark", no cards)
 *
 * Editorial metric rows: BMR, TDEE, Metabolic Age, BMI Category.
 * Micro-label left, big Manrope value right, hairline separators.
 * Tap a row → onNavigateToTab(sourceScreen).
 * Values come from calculatedData (the review data hook) — no recalculation here.
 */

import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SectionLabel, tokens } from "../../../components/onboarding/fresh";
import { AdvancedReviewData } from "../../../types/onboarding";
import { isValidMetric } from "../../../utils/validationUtils";

interface MetabolicProfileSectionProps {
  calculatedData: AdvancedReviewData | null;
  onNavigateToTab?: (tabNumber: number) => void;
  /** User's chronological age (S1) — used only to contextualize metabolic age. */
  personalInfoAge?: number | null;
  /** Global reveal sequencing: ms offset added to every internal stagger. */
  enterDelay?: number;
}

const getBMICategory = (bmi: number | null | undefined): string => {
  if (!isValidMetric(bmi)) return "—";
  if (bmi! < 18.5) return "Underweight";
  if (bmi! < 25) return "Normal";
  if (bmi! < 30) return "Overweight";
  return "Obese";
};

interface MetricRowProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string | null;
  onPress: () => void;
  delay: number;
  testID: string;
  accent?: boolean;
}

const MetricRow: React.FC<MetricRowProps> = ({
  label,
  value,
  unit,
  sub,
  onPress,
  delay,
  testID,
  accent = false,
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
      <View style={styles.rowRight}>
        <Text
          style={[styles.rowValue, accent && styles.rowValueAccent]}
          numberOfLines={1}
        >
          {value}
          {unit ? <Text style={styles.rowUnit}>{`  ${unit}`}</Text> : null}
        </Text>
        {sub ? (
          <Text style={styles.rowSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  </Animated.View>
);

export const MetabolicProfileSection: React.FC<
  MetabolicProfileSectionProps
> = ({ calculatedData, onNavigateToTab, personalInfoAge, enterDelay = 0 }) => {
  if (!calculatedData) return null;

  // Metabolic metrics derive from S1 (age/activity) + S2 (height/weight).
  // Tap navigates to S2 (Body Analysis) — the primary source of body metrics.
  const goToBody = () => onNavigateToTab?.(3);

  // Metabolic age is only meaningful next to your real age — display-only delta.
  const metabolicAgeSub = (() => {
    if (!isValidMetric(calculatedData.metabolic_age) || !isValidMetric(personalInfoAge)) {
      return null;
    }
    const diff =
      Math.round(calculatedData.metabolic_age!) - Math.round(personalInfoAge!);
    if (diff < 0) return `${-diff} yrs younger than your age`;
    if (diff > 0) return `${diff} yrs older than your age`;
    return "matches your age";
  })();

  return (
    <View style={styles.section}>
      <SectionLabel>Metabolic profile</SectionLabel>
      <Text style={styles.caption}>
        The math underneath your plan — BMR is your engine at rest; TDEE adds
        your daily activity.
      </Text>
      <View style={styles.rows}>
        <MetricRow
          label="BMR"
          value={isValidMetric(calculatedData.calculated_bmr) ? Math.round(calculatedData.calculated_bmr!) : "—"}
          unit="cal"
          onPress={goToBody}
          delay={enterDelay}
          testID="tile-bmr"
        />
        <MetricRow
          label="TDEE"
          value={isValidMetric(calculatedData.calculated_tdee) ? Math.round(calculatedData.calculated_tdee!) : "—"}
          unit="cal"
          onPress={goToBody}
          delay={enterDelay + 40}
          testID="tile-tdee"
        />
        <MetricRow
          label="Metabolic Age"
          value={isValidMetric(calculatedData.metabolic_age) ? Math.round(calculatedData.metabolic_age!) : "—"}
          unit="yrs"
          sub={metabolicAgeSub}
          onPress={() => onNavigateToTab?.(1)}
          delay={enterDelay + 80}
          testID="tile-metabolic-age"
        />
        <MetricRow
          label="BMI Category"
          value={getBMICategory(calculatedData.calculated_bmi)}
          onPress={goToBody}
          delay={enterDelay + 120}
          testID="tile-bmi-category"
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
  rows: {
    marginTop: 16,
  },
  row: {
    minHeight: 60,
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
  rowRight: {
    alignItems: "flex-end",
  },
  rowSub: {
    marginTop: 2,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
    textAlign: "right",
  },
  rowValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 22,
    color: tokens.ink,
  },
  rowValueAccent: {
    color: tokens.accent,
  },
  rowUnit: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: tokens.ink3,
  },
});
