/**
 * RateComparisonCard — pace picker ("Editorial Dark", no cards)
 *
 * Freshened to match WarningCard: transparent background, hairline
 * separators, ink type scale, accent ONLY on the selected option (inside
 * AlternativeOption). No GlassCard, no tinted boxes, no fontWeight hacks.
 * Selection / modal / collapse logic — UNCHANGED.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SmartAlternative,
  SmartAlternativesResult,
} from "../../services/validationEngine";
import { AlternativeOption } from "./AlternativeOption";
import { BMRInfoModal } from "./BMRInfoModal";
import { SectionLabel, tokens, font, type as typeScale } from "./fresh";

// ============================================================================
// TYPES
// ============================================================================

interface RateComparisonCardProps {
  alternativesResult: SmartAlternativesResult;
  selectedAlternativeId: string | null;
  onSelectAlternative: (alternative: SmartAlternative) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const RateComparisonCard: React.FC<RateComparisonCardProps> = ({
  alternativesResult,
  selectedAlternativeId,
  onSelectAlternative,
}) => {
  const [showBMRModal, setShowBMRModal] = useState(false);
  const [showExerciseOptions, setShowExerciseOptions] = useState(false);

  const {
    alternatives,
    userBMR,
    originalRequestedRate,
    weightToLose,
    targetWeight,
    rateAtBMR,
  } = alternativesResult;

  // Separate diet-only and exercise options
  const dietOptions = alternatives.filter((alt) => !alt.requiresExercise);
  const exerciseOptions = alternatives.filter((alt) => alt.requiresExercise);

  // Find the user's original option to show the warning
  const userOriginal = alternatives.find((alt) => alt.isUserOriginal);
  const belowBMR = userOriginal && userOriginal.bmrDifference < 0;

  return (
    <View style={styles.container}>
      {/* Section label */}
      <SectionLabel>Your weight loss plan</SectionLabel>

      {/* Goal Summary — hairline-bounded quiet text, no box */}
      <View style={styles.goalSummary}>
        <Text style={styles.goalText}>
          Requested pace{"  "}
          <Text style={styles.goalValue}>
            {typeof originalRequestedRate === 'number' ? originalRequestedRate.toFixed(2) : originalRequestedRate} kg/week
          </Text>
          {"   ·   "}Target{"  "}
          <Text style={styles.goalValue}>{targetWeight} kg</Text>
        </Text>
        <Text style={styles.goalCaption}>
          {weightToLose != null ? weightToLose.toFixed(1) : "--"} kg to lose
        </Text>
      </View>

      {/* BMR Warning — hairline callout, tappable → info modal */}
      {belowBMR && (
        <Pressable
          style={({ pressed }) => [styles.callout, pressed && styles.pressed]}
          onPress={() => setShowBMRModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Open BMR warning details"
        >
          <Ionicons name="warning" size={16} color={tokens.danger} />
          <Text style={styles.calloutText}>
            This pace requires eating below your BMR ({userBMR} cal)
          </Text>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={tokens.ink3}
          />
        </Pressable>
      )}

      {/* Section: Choose Your Approach */}
      <SectionLabel style={styles.approachLabel}>Choose your approach</SectionLabel>

      {/* Diet-Only Options */}
      <View>
        {dietOptions.map((alternative) => (
          <AlternativeOption
            key={alternative.id}
            alternative={alternative}
            isSelected={selectedAlternativeId === alternative.id}
            onSelect={onSelectAlternative}
          />
        ))}
      </View>

      {/* Exercise Options Section */}
      {exerciseOptions.length > 0 && (
        <View>
          <Pressable
            style={({ pressed }) => [styles.exerciseDivider, pressed && styles.pressed]}
            onPress={() => setShowExerciseOptions(!showExerciseOptions)}
            accessibilityRole="button"
            accessibilityLabel={
              showExerciseOptions ? "Hide exercise options" : "Show exercise options"
            }
          >
            <View style={styles.dividerLine} />
            <View style={styles.dividerContent}>
              <Ionicons
                name="fitness-outline"
                size={13}
                color={tokens.ink3}
              />
              <Text style={styles.dividerText}>
                {showExerciseOptions ? "HIDE" : "OR ADD"} EXERCISE
              </Text>
              <Ionicons
                name={showExerciseOptions ? "chevron-up" : "chevron-down"}
                size={13}
                color={tokens.ink3}
              />
            </View>
            <View style={styles.dividerLine} />
          </Pressable>

          {showExerciseOptions && (
            <View>
              {exerciseOptions.map((alternative) => (
                <AlternativeOption
                  key={alternative.id}
                  alternative={alternative}
                  isSelected={selectedAlternativeId === alternative.id}
                  onSelect={onSelectAlternative}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Safe rate note — quiet caption, no box */}
      <View style={styles.safeRateRow}>
        <Ionicons name="shield-checkmark" size={13} color={tokens.ink3} />
        <Text style={styles.safeRateText}>
          Diet only:{" "}
          <Text style={styles.safeRateValue}>{rateAtBMR} kg/week</Text>
          {' — eating less would drop below what your body needs to function'}
        </Text>
      </View>

      {/* BMR Info Modal */}
      <BMRInfoModal
        visible={showBMRModal}
        onClose={() => setShowBMRModal(false)}
        userBMR={userBMR}
      />
    </View>
  );
};

// ============================================================================
// STYLES — transparent bg, hairlines only, ink type scale, zero fontWeight
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: 36,
  },
  pressed: {
    opacity: 0.6,
  },
  goalSummary: {
    marginTop: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.hairline,
  },
  goalText: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.ink2,
  },
  goalValue: {
    fontFamily: font.semibold,
    color: tokens.ink,
  },
  goalCaption: {
    marginTop: 4,
    ...typeScale.caption,
  },
  callout: {
    marginTop: 12,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.hairline,
  },
  calloutText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.danger,
  },
  approachLabel: {
    marginTop: 24,
  },
  exerciseDivider: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    marginVertical: 8,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.hairline,
  },
  dividerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  dividerText: {
    fontFamily: font.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: tokens.ink3,
  },
  safeRateRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 12,
  },
  safeRateText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: tokens.ink3,
  },
  safeRateValue: {
    fontFamily: font.semibold,
    color: tokens.ink,
  },
});

export default RateComparisonCard;
