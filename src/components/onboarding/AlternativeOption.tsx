/**
 * AlternativeOption — one pace option ("Editorial Dark", no cards)
 *
 * An OptionRow-style selectable row: 2px accent left bar + accent check when
 * selected, hairline below, transparent background always. The row shows the
 * label, kg/week + cal + exercise detail, weeks-to-goal, and every safety
 * annotation (below-BMR warning, BMR minimum, workout-inclusive, motivational
 * note) as quiet caption lines. The recommended option gets a quiet orange
 * "Smart pick" caption. Blocked options render as a dimmed locked row.
 *
 * Props and selection logic — UNCHANGED from the previous card version.
 */

import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { SmartAlternative } from "../../services/validationEngine";
import { tokens, font } from "./fresh";

// ============================================================================
// TYPES
// ============================================================================

interface AlternativeOptionProps {
  alternative: SmartAlternative;
  isSelected: boolean;
  onSelect: (alternative: SmartAlternative) => void;
}

const PRESS_DURATION = 120;
const PRESS_OPACITY = 0.6;

const formatCalories = (cal: number | null | undefined): string =>
  cal != null && !isNaN(cal) ? Number(cal).toLocaleString("en-US") : "—";

// ============================================================================
// COMPONENT
// ============================================================================

export const AlternativeOption: React.FC<AlternativeOptionProps> = ({
  alternative,
  isSelected,
  onSelect,
}) => {
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const onPressIn = () => {
    opacity.value = withTiming(PRESS_OPACITY, { duration: PRESS_DURATION });
  };
  const onPressOut = () => {
    opacity.value = withTiming(1, { duration: PRESS_DURATION });
  };

  // ── Blocked: dimmed locked row, not tappable ──
  if (alternative.isBlocked) {
    return (
      <View accessibilityState={{ disabled: true }}>
        <View style={styles.row}>
          <View style={styles.bar} />
          <Ionicons
            name="lock-closed"
            size={15}
            color={tokens.ink3}
            style={styles.lockIcon}
          />
          <View style={styles.content}>
            <Text
              style={[styles.label, styles.labelBlocked]}
              numberOfLines={1}
            >
              {alternative.label}
            </Text>
            <Text style={styles.blockedReason} numberOfLines={2}>
              {alternative.blockReason}
            </Text>
          </View>
          <Text style={[styles.badge, styles.badgeBlocked]}>LOCKED</Text>
        </View>
        <View style={styles.hairline} />
      </View>
    );
  }

  const badgeColor =
    alternative.riskLevel === "dangerous" ? tokens.danger : tokens.ink3;

  return (
    <Pressable
      onPress={() => onSelect(alternative)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={alternative.label}
    >
      <Animated.View style={animatedStyle}>
        <View style={styles.row}>
          {/* 2px left-edge slot: accent bar when selected, transparent spacer
              otherwise so rows never shift on toggle. */}
          <View style={[styles.bar, isSelected && styles.barSelected]} />

          <View style={styles.content}>
            {/* Label + optional "Smart pick" caption */}
            <View style={styles.labelRow}>
              <Text
                style={[styles.label, !isSelected && styles.labelUnselected]}
                numberOfLines={1}
              >
                {alternative.label}
              </Text>
              {alternative.isRecommended && (
                <Text style={styles.smartPick}>Smart pick</Text>
              )}
            </View>

            {/* Rate · calories · exercise */}
            <View style={styles.detailsRow}>
              {alternative.isBelowBMR && (
                <Ionicons
                  name="warning"
                  size={11}
                  color={tokens.danger}
                  style={styles.detailsWarningIcon}
                />
              )}
              <Text style={styles.details} numberOfLines={1}>
                {alternative.weeklyRate} kg/week
                {"  ·  "}
                <Text style={alternative.isBelowBMR && styles.detailsDanger}>
                  {formatCalories(alternative.dailyCalories)} cal
                </Text>
                {alternative.requiresExercise &&
                alternative.exerciseDescription
                  ? `  ·  ${alternative.exerciseDescription}`
                  : ""}
              </Text>
            </View>

            {/* Safety / context annotations (preserved from card version) */}
            {alternative.isBelowBMR && (
              <Text style={styles.warnLine}>
                Requires eating below your BMR — not sustainable long-term
              </Text>
            )}
            {alternative.requiresExercise &&
              !alternative.isFrequencyUpgrade && (
                <Text style={styles.noteLine}>
                  Eating at your safe minimum (BMR)
                </Text>
              )}
            {alternative.workoutPlanInclusive &&
              !alternative.requiresExercise && (
                <Text style={styles.noteLine}>
                  Includes your workout plan
                </Text>
              )}
            {alternative.motivationalNote && (
              <Text style={styles.noteLine}>{alternative.motivationalNote}</Text>
            )}

            {/* Weeks to goal */}
            <Text style={styles.timeline}>
              {alternative.timelineWeeks > 0
                ? `${alternative.timelineWeeks} weeks to goal`
                : "Ongoing"}
            </Text>
          </View>

          {/* Right: quiet risk label + selection check */}
          <Text style={[styles.badge, { color: badgeColor }]}>
            {alternative.badge}
          </Text>
          {isSelected && (
            <Ionicons
              name="checkmark"
              size={18}
              color={tokens.accent}
              style={styles.check}
            />
          )}
        </View>
        <View style={styles.hairline} />
      </Animated.View>
    </Pressable>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  bar: {
    width: 2,
    alignSelf: "stretch",
    backgroundColor: "transparent",
    marginRight: 14,
  },
  barSelected: {
    backgroundColor: tokens.accent,
  },
  lockIcon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    marginRight: 12,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 17,
    color: tokens.ink,
    flexShrink: 1,
  },
  labelUnselected: {
    color: tokens.ink2,
  },
  labelBlocked: {
    color: tokens.ink3,
  },
  smartPick: {
    fontFamily: font.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: tokens.accent,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  detailsWarningIcon: {
    marginRight: 4,
  },
  details: {
    fontFamily: font.regular,
    fontSize: 13,
    color: tokens.ink2,
    flexShrink: 1,
  },
  detailsDanger: {
    color: tokens.danger,
    fontFamily: font.semibold,
  },
  warnLine: {
    marginTop: 4,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: tokens.danger,
  },
  noteLine: {
    marginTop: 4,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },
  timeline: {
    marginTop: 4,
    fontFamily: font.regular,
    fontSize: 12,
    color: tokens.ink3,
  },
  blockedReason: {
    marginTop: 3,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: tokens.ink3,
  },
  badge: {
    fontFamily: font.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  badgeBlocked: {
    color: tokens.ink3,
  },
  check: {
    marginLeft: 10,
  },
  hairline: {
    height: 1,
    backgroundColor: tokens.hairline,
    alignSelf: "stretch",
  },
});

export default AlternativeOption;
