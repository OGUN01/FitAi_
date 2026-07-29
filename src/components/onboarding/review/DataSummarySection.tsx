/**
 * DataSummarySection — S5 review group ("Editorial Dark", no cards)
 *
 * Editorial rows summarizing S1–S4 (Personal, Diet, Body, Workout):
 * micro-label left, value right, hairline separators, chevron affordance.
 * Each row tappable → onNavigateToTab(sourceScreen). Data props unchanged.
 */

import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { RowGroup, tokens } from "../../../components/onboarding/fresh";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../../types/onboarding";
import { DIET_TYPE_OPTIONS } from "../../../screens/onboarding/tabs/DietPreferencesConstants";

interface DataSummarySectionProps {
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  calculatedData: AdvancedReviewData | null;
  onNavigateToTab?: (tabNumber: number) => void;
  /** Global reveal sequencing: ms offset added to every internal stagger. */
  enterDelay?: number;
}

const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

interface SummaryRowProps {
  label: string;
  value: string;
  sub: string;
  onPress: () => void;
  delay: number;
  testID: string;
}

const SummaryRow: React.FC<SummaryRowProps> = ({
  label,
  value,
  sub,
  onPress,
  delay,
  testID,
}) => (
  <Animated.View entering={FadeInDown.duration(250).delay(delay)}>
    <Pressable
      onPress={() => {
        fireSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint="Tap to edit"
      testID={testID}
    >
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={tokens.ink3} />
    </Pressable>
  </Animated.View>
);

export const DataSummarySection: React.FC<DataSummarySectionProps> = ({
  personalInfo,
  dietPreferences,
  bodyAnalysis,
  workoutPreferences,
  calculatedData,
  onNavigateToTab,
  enterDelay = 0,
}) => {
  const dietTitle =
    DIET_TYPE_OPTIONS.find((o) => o.id === dietPreferences?.diet_type)?.title ??
    dietPreferences?.diet_type ??
    "—";

  const bodyValue =
    bodyAnalysis?.current_weight_kg && bodyAnalysis?.target_weight_kg
      ? `${bodyAnalysis.current_weight_kg}kg → ${bodyAnalysis.target_weight_kg}kg`
      : "—";
  const bodySub = calculatedData?.calculated_bmi
    ? `BMI ${calculatedData.calculated_bmi.toFixed(1)}`
    : "BMI —";

  return (
    <RowGroup label="Your details" style={styles.group}>
      <SummaryRow
        label="Personal"
        value={`${personalInfo?.first_name ?? ""} ${personalInfo?.last_name ?? ""}`.trim() || "—"}
        sub={`${personalInfo?.age ?? "—"}y • ${personalInfo?.gender ?? "—"}`}
        onPress={() => onNavigateToTab?.(1)}
        delay={enterDelay}
        testID="summary-personal"
      />
      <SummaryRow
        label="Diet"
        value={dietTitle}
        sub={personalInfo?.country || "—"}
        onPress={() => onNavigateToTab?.(2)}
        delay={enterDelay + 40}
        testID="summary-diet"
      />
      <SummaryRow
        label="Body"
        value={bodyValue}
        sub={bodySub}
        onPress={() => onNavigateToTab?.(3)}
        delay={enterDelay + 80}
        testID="summary-body"
      />
      <SummaryRow
        label="Workout"
        value={workoutPreferences?.intensity ?? "—"}
        sub={workoutPreferences?.location ?? "—"}
        onPress={() => onNavigateToTab?.(4)}
        delay={enterDelay + 120}
        testID="summary-workout"
      />
    </RowGroup>
  );
};

const styles = StyleSheet.create({
  group: {
    marginTop: 8,
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.hairline,
  },
  pressed: {
    opacity: 0.6,
  },
  rowLabel: {
    width: 84,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: tokens.ink3,
  },
  rowRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  rowValue: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 20,
    color: tokens.ink,
    textAlign: "right",
  },
  rowSub: {
    marginTop: 2,
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
    textAlign: "right",
  },
});
